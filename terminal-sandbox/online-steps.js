// Online steps for the networking and security labs. A lab machine is offline
// unless the deployment turns online labs on (LAB_INTERNET, see server.js) and
// the machine is a cloud desktop; only then does it reach the sites listed here
// and do these steps join the lab's checks. Offline, the steps never appear, so
// a lab can always be finished.
//
// Every step uses example.com, the name reserved for documentation and
// teaching (RFC 2606): it is stable, safe for any age and needs no account.

/** Sites the online steps use. Machines in "sites" mode reach only these. */
export const ONLINE_SITES = Object.freeze(["example.com"]);

const typed = (id, title, description, hint, pattern) => Object.freeze({ id, title, description, hint, checkType: "history_regex", pattern });

/** Networking labs: a real name lookup and a real web request. */
export const NETWORK_ONLINE_STEPS = Object.freeze([
  typed(
    "online-dns",
    "Look up a real name",
    "This machine can reach example.com, a real website. Type `nslookup example.com` to ask DNS for its address.",
    "DNS turns a name into the numbers computers use to find each other. `dig example.com` shows the same answer with more detail.",
    /^\s*(nslookup|dig|host)\b.*\bexample\.com\b/i,
  ),
  typed(
    "online-web",
    "Ask a real web server",
    "Type `curl -I https://example.com`. The first line is the server's answer: 200 means OK. Then open https://example.com in Firefox to see the page itself.",
    "-I asks for the headers only, not the whole page. A 404 would mean the page was not found; no answer at all points to the network or DNS.",
    /^\s*(curl|wget)\b.*\bexample\.com\b/i,
  ),
]);

/** Security labs: a real certificate and a real anti-spoofing (SPF) record. */
export const SECURITY_ONLINE_STEPS = Object.freeze([
  typed(
    "online-certificate",
    "Check a real certificate",
    "Type `curl -vI https://example.com`. In the lines that start with *, find who issued the site's certificate (issuer) and when it expires (expire date).",
    "A browser checks the same certificate before it shows the padlock. An expired certificate, or one issued for another name, is a warning sign.",
    /^\s*curl\b(?=.*\s-[a-z]*v)(?=.*\bexample\.com\b)/i,
  ),
  typed(
    "online-spf",
    "Read an anti-spoofing record",
    "Type `dig +short TXT example.com`. A line starting with v=spf1 lists the servers allowed to send email for this name; -all means no others may.",
    "Phishing emails often fake the sender's address. Mail servers check SPF records to reject the fakes. `nslookup -type=txt example.com` also works.",
    /^\s*(dig|nslookup|host)\b(?=.*\btxt\b)(?=.*\bexample\.com\b)/i,
  ),
]);

/** A networking or security lab with its online steps attached (other labs are returned unchanged). */
export function withOnlineSteps(lab) {
  if (!lab || lab.online) return lab;
  const steps = /^NET-\d{3}$/.test(lab.id) ? NETWORK_ONLINE_STEPS : /^SEC-\d{3}$/.test(lab.id) ? SECURITY_ONLINE_STEPS : null;
  return steps ? { ...lab, online: { sites: [...ONLINE_SITES], milestones: [...steps] } } : lab;
}
