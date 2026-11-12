#!/usr/bin/env node
// Checks online labs on Docker Cloud before LAB_INTERNET is turned on.
//
// For each network mode it starts one small test machine with exactly the
// request and setup the controller uses for a networking lab (the same network
// policy, and in "filtered" mode the same DNS setup), tests from inside what
// the machine can and cannot reach, prints the results, and deletes the
// machine. Run it where the controller runs, with the controller's settings:
//
//   docker exec $(docker ps -qf name=orchestrator) node scripts/check-online-labs.mjs
//   docker exec $(docker ps -qf name=orchestrator) node scripts/check-online-labs.mjs filtered
//
// Each machine lives about a minute. Nothing here prints credentials or
// provider messages: only HTTP status codes, error types and addresses.
import { configuration, labFor, sessionNetwork } from "../server.js";
import { spawnCloudSandbox } from "../cloud-sandboxes.js";

// Runs inside the test machine (Python standard library only).
const PROBE = String.raw`
import json, random, socket, struct, urllib.error, urllib.request
def resolve(name):
    try: return sorted({a[4][0] for a in socket.getaddrinfo(name, 443, proto=socket.IPPROTO_TCP)})
    except Exception as e: return "error: " + type(e).__name__
def https(url):
    try:
        with urllib.request.urlopen(url, timeout=8) as r: return r.status
    except urllib.error.HTTPError as e: return e.code
    except Exception as e: return "error: " + type(e).__name__
def dns_to(server):
    query = struct.pack(">HHHHHH", random.randint(0, 65535), 0x0100, 1, 0, 0, 0) + b"\x07example\x03com\x00" + struct.pack(">HH", 1, 1)
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.settimeout(4)
    try:
        s.sendto(query, (server, 53)); return "answered (%d bytes)" % len(s.recv(512))
    except Exception as e: return "error: " + type(e).__name__
servers = [l.split()[1] for l in open("/etc/resolv.conf") if l.startswith("nameserver")]
print("PROBE_JSON " + json.dumps({
    "nameservers": servers,
    "resolve example.com": resolve("example.com"),
    "https://example.com": https("https://example.com/"),
    "resolve www.wikipedia.org": resolve("www.wikipedia.org"),
    "https://www.wikipedia.org": https("https://www.wikipedia.org/"),
    "resolve exampleadultsite.com": resolve("exampleadultsite.com"),
    "DNS straight to 8.8.8.8": dns_to("8.8.8.8"),
    "DNS straight to 1.1.1.1": dns_to("1.1.1.1"),
    "https://dns.google (DNS over HTTPS)": https("https://dns.google/"),
}))
`;

// Any HTTP answer, even an error page, means the network let the request through.
const ok = (value) => typeof value === "number";
const failed = (value) => typeof value === "string" && value.startsWith("error");
/** What each mode must allow and block. Anything else is printed for a person to read. */
const EXPECT = {
  offline: [["https://example.com", failed, "blocked"], ["https://www.wikipedia.org", failed, "blocked"], ["DNS straight to 8.8.8.8", failed, "blocked"]],
  sites: [["https://example.com", ok, "reachable"], ["https://www.wikipedia.org", failed, "blocked"], ["DNS straight to 8.8.8.8", failed, "blocked"], ["https://dns.google (DNS over HTTPS)", failed, "blocked"]],
  filtered: [["https://example.com", ok, "reachable"], ["https://www.wikipedia.org", ok, "reachable"], ["DNS straight to 8.8.8.8", failed, "blocked"], ["DNS straight to 1.1.1.1", failed, "blocked"], ["https://dns.google (DNS over HTTPS)", failed, "blocked"]],
};

async function probe(mode) {
  const env = { ...process.env, SANDBOX_BACKEND: "cloud" };
  // The network the controller would give a networking lab in this mode...
  const network = mode === "offline" ? { mode: "offline", sites: [] } : sessionNetwork(labFor("NET-202"), configuration({ ...env, SANDBOX_VIEW: "desktop", LAB_INTERNET: mode }));
  if (mode !== "offline" && network.mode !== mode) throw new Error("this configuration gives no " + mode + " network (check LAB_FILTER_DNS)");
  // ...on the light terminal machine, whose shell runs the test as the learner.
  const cfg = configuration({ ...env, SANDBOX_VIEW: "terminal" });
  const sandbox = await spawnCloudSandbox({ id: "online-check-" + mode, labId: "NET-202", network, screen: null, timeZone: "" }, cfg, { labFiles: [{ path: "README.txt", content: "Online labs check\n" }] });
  try {
    let output = "";
    const done = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("the test did not finish in 90 s")), 90000);
      sandbox.onData((chunk) => {
        output += String(chunk);
        const line = output.split("\n").find((text) => text.startsWith("PROBE_JSON "));
        if (!line || !line.trim().endsWith("}")) return;
        try { const parsed = JSON.parse(line.slice(11)); clearTimeout(timer); resolve(parsed); } catch {}
      });
    });
    sandbox.write("printf '%s' '" + Buffer.from(PROBE).toString("base64") + "' | base64 -d > /tmp/probe.py && python3 /tmp/probe.py\n");
    return { network, results: await done };
  } finally {
    await sandbox.destroy();
  }
}

const modes = process.argv.slice(2).length ? process.argv.slice(2) : ["offline", "sites", "filtered"];
let problems = 0;
for (const mode of modes) {
  if (!EXPECT[mode]) { console.error("Unknown mode " + mode + " (use offline, sites or filtered)"); process.exit(2); }
  console.log("\n== " + mode + " ==");
  try {
    const { network, results } = await probe(mode);
    console.log("network: " + JSON.stringify(network));
    for (const [name, value] of Object.entries(results)) console.log("  " + name + ": " + JSON.stringify(value));
    for (const [name, check, want] of EXPECT[mode]) {
      const good = check(results[name]);
      if (!good) problems++;
      console.log((good ? "  PASS " : "  FAIL ") + name + " should be " + want);
    }
    if (mode === "filtered") {
      const good = network.dns.every((server, index) => results.nameservers[index] === server);
      if (!good) problems++;
      console.log((good ? "  PASS " : "  FAIL ") + "the machine looks names up through the filter " + network.dns.join(", "));
      console.log("  CHECK exampleadultsite.com is the filter's test name: it should not resolve to a real site (the filter answers with a block address or nothing).");
    }
  } catch (error) {
    problems++;
    console.log("  FAIL the test machine did not run: " + (error?.code || "") + (error?.reason ? " (" + error.reason + ")" : "") + (error?.code ? "" : " " + String(error?.message || error).slice(0, 120)));
  }
}
console.log(problems ? "\n" + problems + " check(s) failed. Keep LAB_INTERNET=off and share this output." : "\nAll checks passed for: " + modes.join(", ") + ".");
process.exit(problems ? 1 : 0);
