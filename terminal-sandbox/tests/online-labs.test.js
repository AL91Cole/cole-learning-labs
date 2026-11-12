import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { configuration, labFor, labCatalog, sessionNetwork, sessionMilestones, sessionMarkdown, onlineLabWarnings, verifySessionMilestones, validateLabDefinition } from "../server.js";
import { buildCloudSandboxRequest, buildSeedScript, networkPoliciesFor, validNetwork, desktopNetworkEnv, UNFILTERED_DNS, DEFAULT_FILTER_DNS, validSiteName } from "../cloud-sandboxes.js";
import { withOnlineSteps, ONLINE_SITES, NETWORK_ONLINE_STEPS, SECURITY_ONLINE_STEPS } from "../online-steps.js";

const cloudDesktop = (labInternet, extra = {}) => configuration({ SANDBOX_BACKEND: "cloud", SANDBOX_VIEW: "desktop", LAB_INTERNET: labInternet, ...extra });
const taught = (step) => step.description.match(/`([^`]+)`/)[1];

test("online labs are off unless the deployment turns them on, and only cloud desktops go online", () => {
  assert.equal(configuration({}).labInternet, "off");
  assert.equal(configuration({ LAB_INTERNET: "everything" }).labInternet, "off", "an unknown value is off");
  assert.equal(configuration({ LAB_INTERNET: "sites" }).labInternet, "sites");
  assert.deepEqual(configuration({ LAB_INTERNET: "filtered" }).filterDns, [...DEFAULT_FILTER_DNS]);
  assert.deepEqual(configuration({ LAB_FILTER_DNS: "1.1.1.3, 999.1.1.1, 1.0.0.3;rm -rf /, 1.0.0.3" }).filterDns, ["1.1.1.3", "1.0.0.3"], "only plain IPv4 addresses");
  const net = labFor("NET-202"), sec = labFor("SEC-401"), linux = labFor("LNX-101"), code = labFor("CODE-502");
  assert.deepEqual(sessionNetwork(net, cloudDesktop("off")), { mode: "offline", sites: [] });
  assert.deepEqual(sessionNetwork(net, configuration({ LAB_INTERNET: "sites", SANDBOX_VIEW: "desktop" })), { mode: "offline", sites: [] }, "host-container machines stay offline");
  assert.deepEqual(sessionNetwork(net, configuration({ LAB_INTERNET: "sites", SANDBOX_BACKEND: "cloud", SANDBOX_VIEW: "terminal" })), { mode: "offline", sites: [] }, "terminal-only machines stay offline");
  assert.deepEqual(sessionNetwork(linux, cloudDesktop("filtered")), { mode: "offline", sites: [] }, "Linux basics is an offline course");
  assert.deepEqual(sessionNetwork(code, cloudDesktop("filtered")), { mode: "offline", sites: [] });
  assert.deepEqual(sessionNetwork(net, cloudDesktop("sites")), { mode: "sites", sites: ["example.com"] });
  assert.deepEqual(sessionNetwork(sec, cloudDesktop("filtered")), { mode: "filtered", sites: ["example.com"], dns: [...DEFAULT_FILTER_DNS] });
  assert.deepEqual(sessionNetwork(sec, cloudDesktop("filtered", { LAB_FILTER_DNS: "not-an-ip" })), { mode: "offline", sites: [] }, "no filter, no web");
  assert.deepEqual(onlineLabWarnings(cloudDesktop("off")), []);
  assert.deepEqual(onlineLabWarnings(cloudDesktop("filtered")), []);
  assert.match(onlineLabWarnings(configuration({ LAB_INTERNET: "sites" }))[0], /needs SANDBOX_BACKEND=cloud with the desktop view; every machine stays offline/);
  assert.match(onlineLabWarnings(cloudDesktop("filtered", { LAB_FILTER_DNS: "x" }))[0], /LAB_FILTER_DNS has no valid IPv4 address/);
});

test("every networking and security lab has online steps; other tracks do not", () => {
  for (const lab of labCatalog()) {
    const online = /^(NET|SEC)-/.test(lab.id);
    assert.equal(Boolean(lab.online), online, lab.id);
    if (!online) continue;
    assert.deepEqual([...lab.online.sites], [...ONLINE_SITES], lab.id);
    assert.deepEqual(lab.online.milestones.map((step) => step.id), (lab.id.startsWith("NET-") ? NETWORK_ONLINE_STEPS : SECURITY_ONLINE_STEPS).map((step) => step.id), lab.id);
    const ids = [...lab.milestones, ...lab.online.milestones].map((step) => step.id);
    assert.equal(new Set(ids).size, ids.length, lab.id + " step ids are unique");
    assert.ok(Object.isFrozen(lab.online) && Object.isFrozen(lab.online.sites) && lab.online.milestones.every(Object.isFrozen), lab.id + " is frozen");
  }
  assert.equal(withOnlineSteps({ id: "CODE-777" }).online, undefined);
  const own = { id: "NET-777", online: { sites: ["example.org"], milestones: [] } };
  assert.equal(withOnlineSteps(own), own, "a lab's own online part is kept");
});

test("the online steps accept the commands they teach and nothing unrelated", () => {
  for (const step of [...NETWORK_ONLINE_STEPS, ...SECURITY_ONLINE_STEPS]) {
    assert.ok(step.pattern.test(taught(step)), step.id + " accepts " + taught(step));
    assert.ok(step.description.length <= 400 && step.hint.length <= 400 && step.title.length <= 60, step.id);
    for (const site of step.description.match(/[a-z0-9.-]+\.(com|org|net)\b/g) || []) assert.ok(ONLINE_SITES.includes(site), step.id + " uses only listed sites: " + site);
  }
  const pattern = (id) => [...NETWORK_ONLINE_STEPS, ...SECURITY_ONLINE_STEPS].find((step) => step.id === id).pattern;
  assert.ok(pattern("online-dns").test("dig example.com") && pattern("online-dns").test("host example.com") && !pattern("online-dns").test("nslookup example.org") && !pattern("online-dns").test("echo nslookup example.com"));
  assert.ok(pattern("online-web").test("wget -S --spider https://example.com") && !pattern("online-web").test("curl https://example.org"));
  assert.ok(pattern("online-certificate").test("curl -v https://example.com") && !pattern("online-certificate").test("curl -I https://example.com"), "the certificate shows only with -v");
  assert.ok(pattern("online-spf").test("nslookup -type=txt example.com") && pattern("online-spf").test("host -t TXT example.com") && !pattern("online-spf").test("dig example.com"));
});

test("online steps join the checks only on an online machine", async () => {
  const lab = labFor("NET-202");
  assert.equal(sessionMilestones(lab, { network: { mode: "offline" } }), lab.milestones);
  assert.equal(sessionMilestones(lab, {}), lab.milestones);
  assert.deepEqual(sessionMilestones(lab, { network: { mode: "filtered" } }).map((step) => step.id).slice(-2), ["online-dns", "online-web"]);
  const session = (network) => ({ labId: "NET-202", network, commandHistory: [], sandbox: { history: async () => ["nslookup example.com"], readFile: async () => null } });
  const offline = await verifySessionMilestones(session({ mode: "offline", sites: [] }));
  assert.ok(!offline.some((step) => step.id.startsWith("online-")), "an offline machine never shows steps it cannot do");
  const online = Object.fromEntries((await verifySessionMilestones(session({ mode: "sites", sites: ["example.com"] }))).map((step) => [step.id, step.completed]));
  assert.equal(online["online-dns"], true);
  assert.equal(online["online-web"], false);
});

test("the machine's network policy: none, only the lab's sites, or the web through the filter", () => {
  assert.deepEqual(networkPoliciesFor(undefined), [{ mode: "denyAll", denyNetworks: ["**"] }]);
  assert.deepEqual(networkPoliciesFor({ mode: "offline" }), [{ mode: "denyAll", denyNetworks: ["**"] }]);
  assert.deepEqual(networkPoliciesFor({ mode: "sites", sites: [] }), [{ mode: "denyAll", denyNetworks: ["**"] }], "no sites, no network");
  assert.deepEqual(networkPoliciesFor({ mode: "sites", sites: ["example.com", "*.evil.test", "EXAMPLE.ORG", "a b"] }), [{ mode: "denyAll", denyNetworks: ["**"], allowNetworks: ["example.com"] }], "only plain lowercase host names");
  assert.deepEqual(networkPoliciesFor({ mode: "filtered", sites: ["example.com"], dns: [] }), [{ mode: "denyAll", denyNetworks: ["**"] }], "no filter, no web");
  const filtered = networkPoliciesFor({ mode: "filtered", sites: ["example.com"], dns: ["185.228.168.168"] });
  assert.equal(filtered.length, 1);assert.equal(filtered[0].mode, "allowAll");
  assert.ok(filtered[0].denyNetworks.includes("8.8.8.8/32") && filtered[0].denyNetworks.includes("dns.google") && filtered[0].denyNetworks.includes("mozilla.cloudflare-dns.com"));
  assert.ok(!networkPoliciesFor({ mode: "filtered", dns: ["1.1.1.1"] })[0].denyNetworks.includes("1.1.1.1/32"), "the chosen filter itself is never denied");
  for (const entry of UNFILTERED_DNS) assert.ok(/^\d{1,3}(\.\d{1,3}){3}\/32$/.test(entry) || validSiteName(entry), entry);
  for (const server of DEFAULT_FILTER_DNS) assert.ok(!UNFILTERED_DNS.includes(server + "/32"));
  assert.deepEqual(validNetwork({ mode: "filtered", sites: ["example.com"], dns: ["185.228.168.168", "1.2.3.4;reboot", "10.0.0.1", "8.8.8.8", "9.9.9.9"] }), { mode: "filtered", sites: ["example.com"], dns: ["185.228.168.168", "10.0.0.1", "8.8.8.8", "9.9.9.9"] }, "at most four plain addresses");
});

test("the sandbox request and the desktop's start settings follow the session's network", () => {
  const cloud = configuration({ SANDBOX_BACKEND: "cloud" }).cloud;
  const desktop = { vncPassword: "Abcd1234", userPassword: "Abcdefgh12345678", resolution: "1280x720", timeZone: "" };
  const offline = buildCloudSandboxRequest({ id: "s1", labId: "NET-202" }, cloud, { desktop });
  assert.deepEqual(offline.networkPolicies, [{ mode: "denyAll", denyNetworks: ["**"] }]);
  assert.doesNotMatch(offline.startupExecution.rawImage.start.argv[2], /LAB_NETWORK/, "offline machines start exactly as before");
  const sites = buildCloudSandboxRequest({ id: "s1", labId: "NET-202" }, cloud, { desktop, network: { mode: "sites", sites: ["example.com"] } });
  assert.deepEqual(sites.networkPolicies, [{ mode: "denyAll", denyNetworks: ["**"], allowNetworks: ["example.com"] }]);
  assert.match(sites.startupExecution.rawImage.start.argv[2], / LAB_NETWORK=sites LAB_SITES=example\.com; exec \/startup\.sh$/);
  const filtered = buildCloudSandboxRequest({ id: "s1", labId: "SEC-401" }, cloud, { desktop, network: { mode: "filtered", sites: ["example.com"], dns: ["185.228.168.168", "185.228.169.168"] } });
  assert.match(filtered.startupExecution.rawImage.start.argv[2], / LAB_NETWORK=filtered LAB_SITES=example\.com DNS_SERVERS=185\.228\.168\.168,185\.228\.169\.168; exec \/startup\.sh$/);
  assert.equal(desktopNetworkEnv({ mode: "sites", sites: ["$(reboot)"] }), "", "nothing unvalidated reaches the start command");
  const terminal = buildCloudSandboxRequest({ id: "s1", labId: "NET-202" }, cloud, { network: { mode: "sites", sites: ["example.com"] } });
  assert.deepEqual(terminal.networkPolicies, sites.networkPolicies);
});

test("filtered machines point every lookup at the filter, or do not start at all", () => {
  const seed = { directories: [], files: [{ path: "a.txt", content: "x" }] };
  const plain = buildSeedScript(seed, { desktop: true });
  assert.doesNotMatch(plain, /resolv\.conf/);
  assert.doesNotMatch(buildSeedScript(seed, { desktop: true, network: { mode: "sites", sites: ["example.com"] } }), /resolv\.conf/, "listed sites use the provider's own resolver");
  const script = buildSeedScript(seed, { desktop: true, network: { mode: "filtered", sites: ["example.com"], dns: ["185.228.168.168", "185.228.169.168"] } });
  const lines = script.split("\n");
  assert.deepEqual(lines.slice(0, 3), ["set -e", "printf 'nameserver %s\\n' 185.228.168.168 185.228.169.168 > /etc/resolv.conf", "grep -qx 'nameserver 185.228.168.168' /etc/resolv.conf"], "first, and under set -e: a failure stops the start");
  execFileSync("sh", ["-n"], { input: script });
  // The two lines, run against a scratch file instead of /etc/resolv.conf, write exactly the filter.
  const out = execFileSync("sh", ["-c", lines.slice(1, 3).join("\n").replaceAll("/etc/resolv.conf", "\"$1\"") + "\ncat \"$1\"", "sh", "/tmp/cll-online-test-resolv.conf"], { encoding: "utf8" });
  assert.equal(out, "nameserver 185.228.168.168\nnameserver 185.228.169.168\n");
});

test("lab content can declare its own online part, and malformed ones are refused", () => {
  const base = { ...labFor("LNX-101"), id: "NET-777" };
  const step = { id: "online-x", title: "T", description: "D", hint: "H", checkType: "history_regex", pattern: /x/ };
  assert.equal(validateLabDefinition({ ...base, online: { sites: ["example.org"], milestones: [step] } }), null);
  assert.match(validateLabDefinition({ ...base, online: { sites: [], milestones: [] } }), /online\.sites must be 1-12 lowercase host names/);
  assert.match(validateLabDefinition({ ...base, online: { sites: ["*.example.org"], milestones: [] } }), /online\.sites/);
  assert.match(validateLabDefinition({ ...base, online: { sites: ["example.org"], milestones: [step, step, step, step, step] } }), /at most 4 steps/);
  assert.match(validateLabDefinition({ ...base, online: { sites: ["example.org"], milestones: [{ ...step, id: base.milestones[0].id }] } }), /unique lowercase id/);
  assert.match(validateLabDefinition({ ...base, online: { sites: ["example.org"], milestones: [{ ...step, pattern: "x" }] } }), /pattern must be a RegExp/);
});

test("the controller image ships every module the server imports, and the online labs check", () => {
  const dir = new URL("../", import.meta.url);
  const copied = new Set(readFileSync(new URL("Dockerfile", dir), "utf8").split("\n").filter((line) => line.startsWith("COPY ") && !line.includes("--from")).flatMap((line) => line.slice(5).trim().split(/\s+/).slice(0, -1)));
  const seen = new Set(), pending = ["server.js"];
  while (pending.length) {
    const file = pending.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const match of readFileSync(new URL(file, dir), "utf8").matchAll(/^import[^'"]*from\s*["']\.\/([^"']+)["']/gm)) pending.push(match[1]);
  }
  assert.ok(seen.has("online-steps.js"));
  for (const file of seen) assert.ok(copied.has(file), file + " is copied into the controller image");
  assert.ok(copied.has("scripts/check-online-labs.mjs"));
});

test("the online labs check runs the controller's own request and tests what each mode must allow and block", () => {
  const source = readFileSync(new URL("../scripts/check-online-labs.mjs", import.meta.url), "utf8");
  assert.match(source, /import \{ configuration, labFor, sessionNetwork \} from "\.\.\/server\.js";/);
  assert.match(source, /spawnCloudSandbox\(\{ id: "online-check-" \+ mode, labId: "NET-202", network/, "the same spawn path, so the same policy and DNS setup");
  assert.match(source, /await sandbox\.destroy\(\);/, "the test machine is always deleted");
  const probe = source.match(/const PROBE = String\.raw`([\s\S]*?)`;/)[1];
  execFileSync("python3", ["-c", "import ast,sys; ast.parse(sys.stdin.read())"], { input: probe });
  const keys = [...probe.matchAll(/^\s+"([^"]+)":/gm)].map((match) => match[1]);
  for (const name of source.match(/\["[^"]+", (?:ok|failed), "(?:reachable|blocked)"\]/g).map((entry) => entry.slice(2, entry.indexOf('",')))) assert.ok(keys.includes(name), name + " is measured");
});

test("an online machine's instructions say what it can reach", () => {
  const lab = labFor("NET-202");
  assert.match(lab.markdown, /A real Linux machine with no network\./);
  assert.equal(sessionMarkdown(lab, { mode: "offline", sites: [] }), lab.markdown);
  assert.match(sessionMarkdown(lab, { mode: "sites", sites: ["example.com"] }), /A real Linux machine that can reach example\.com and no other site\./);
  assert.match(sessionMarkdown(lab, { mode: "filtered", sites: ["example.com"], dns: ["185.228.168.168"] }), /can reach example\.com and other websites through a family-safe filter\./);
  assert.doesNotMatch(sessionMarkdown(lab, { mode: "filtered", sites: ["example.com"] }), /with no network/);
  assert.match(sessionMarkdown({ markdown: "# X" }, { mode: "sites", sites: ["example.com"] }), /^# X\n\n## Online\n\nA real Linux machine that can reach example\.com/);
});
