/**
 * Cole Learning Labs · Chromebook-Compatible Virtual Terminal Sandbox Orchestrator
 *
 * Architecture:
 * - Multiplexes terminal PTY streams, self-paced milestone auto-verification,
 *   instructor-led classroom controls, and low-bandwidth 5s 10%-JPEG snapshots
 *   over a single secure WebSocket connection (wss:// on Port 443) behind Cloudflare.
 * - Spawns isolated, unprivileged Alpine Linux Docker containers per session
 *   (512MB RAM, 0.5 vCPU, --cap-drop=ALL, --security-opt=no-new-privileges, UID 1000:1000)
 *   and binds /bin/sh via node-pty (with an automatic POSIX fallback when Docker is offline).
 * - Runs a 5-minute inactivity reaper to tear down idle/orphan containers.
 */

import http from 'node:http';
import crypto from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

// Optional native/third-party modules (loaded dynamically so server runs out-of-the-box)
let ptyModule = null;
try {
  const imported = await import('node-pty');
  ptyModule = imported.default || imported;
} catch {
  ptyModule = null;
}

// ============================================================================
// 1. CONFIGURATION & CLOUDFLARE EDGE SETTINGS
// ============================================================================
export const CONFIG = Object.freeze({
  port: Number(process.env.PORT || 8080),
  host: process.env.HOST || '127.0.0.1',
  sandboxImage: process.env.SANDBOX_IMAGE || 'cole-learning-labs/sandbox:alpine',
  fallbackAlpineImage: 'alpine:3.20',
  memoryLimit: process.env.SANDBOX_MEMORY || '512m',
  cpuLimit: process.env.SANDBOX_CPUS || '0.5',
  pidsLimit: Number(process.env.SANDBOX_PIDS || 64),
  inactivityTimeoutMs: Number(process.env.INACTIVITY_TIMEOUT_MS || 5 * 60 * 1000), // 5 minutes
  reaperIntervalMs: Number(process.env.REAPER_INTERVAL_MS || 30 * 1000), // 30s check
  wsHeartbeatIntervalMs: Number(process.env.WS_HEARTBEAT_MS || 30 * 1000), // 30s Cloudflare keepalive
  snapshotMinIntervalMs: 4500, // ~5s Low-Bandwidth Teacher Dashboard snapshot cadence
  maxSnapshotBytes: 64 * 1024, // 64KB cap for 10%-compressed JPEG data URL
  enforceCloudflareHttps: process.env.ENFORCE_CLOUDFLARE_HTTPS === 'true',
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  googleClientId: process.env.GOOGLE_WORKSPACE_CLIENT_ID || '',
  googleAllowedDomains: (process.env.GOOGLE_ALLOWED_DOMAINS || '')
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean),
  allowedOrigins: new Set(
    (process.env.ALLOWED_ORIGINS || 'https://www.colelearninglabs.com,https://colelearninglabs.com,http://127.0.0.1:8080,http://localhost:8080')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean)
  )
});

// ============================================================================
// 2. SELF-PACED LAB CATALOG & SERVER-SIDE MILESTONE VERIFICATION DEFINITIONS
// ============================================================================
export const SELF_PACED_LABS = Object.freeze({
  'NET-201': {
    id: 'NET-201',
    title: 'Workstation Network & DNS Diagnostics',
    track: 'Networking & Operating Systems',
    grade: 'Grades 7–12',
    minutes: 25,
    summary: 'Inspect a classroom workstation that cannot reach learn.school.test, verify the VLAN 8 configuration sheet, and repair its DNS resolver.',
    markdown: [
      '# NET-201 · Workstation Network & DNS Diagnostics',
      '',
      '> **Ticket Brief:** *"Workstation 04 in Room 204 can reach the local router, but `learn.school.test` fails to resolve. Please inspect the network configuration and fix the DNS resolver."*',
      '',
      '## Background',
      'On locked-down school networks, every workstation needs a valid **IPv4 address**, **default gateway**, and **DNS nameserver**. When a numerical IP ping succeeds but a hostname fails, DNS resolution is the prime suspect.',
      '',
      '## Step-by-Step Instructions',
      '',
      '### Step 1: Read the VLAN 8 Configuration Sheet',
      'Inspect the configuration sheet in your lab directory to see the assigned school DNS server:',
      '```sh',
      'cat ~/lab/network-sheet.txt',
      '```',
      '',
      '### Step 2: Inspect the Current DNS Resolver File',
      'Check what nameserver is currently configured in `~/lab/resolv.conf`:',
      '```sh',
      'cat ~/lab/resolv.conf',
      '```',
      'Notice that it points to `192.168.1.53` instead of the VLAN 8 school DNS resolver (`10.24.8.53`).',
      '',
      '### Step 3: Repair the DNS Resolver Configuration',
      'Update `~/lab/resolv.conf` so it uses `nameserver 10.24.8.53`:',
      '```sh',
      'printf "nameserver 10.24.8.53\\nsearch school.test\\n" > ~/lab/resolv.conf',
      '```',
      '',
      '### Step 4: Log Your Verification Result',
      'Confirm the updated file contents and write `DNS_VERIFIED_10.24.8.53` to `~/lab/verified.txt`:',
      '```sh',
      'echo "DNS_VERIFIED_10.24.8.53" > ~/lab/verified.txt',
      '```'
    ].join('\n'),
    milestones: [
      {
        id: 'm1-sheet',
        title: 'Read the VLAN 8 configuration sheet',
        description: 'Run `cat ~/lab/network-sheet.txt` to inspect the assigned IP, gateway, and DNS server.',
        hint: 'Type `cat ~/lab/network-sheet.txt` and press Enter.',
        checkType: 'history_regex',
        pattern: /cat\s+.*network-sheet\.txt/i
      },
      {
        id: 'm2-inspect-resolv',
        title: 'Inspect the current resolv.conf file',
        description: 'Check the existing resolver setting in `~/lab/resolv.conf`.',
        hint: 'Type `cat ~/lab/resolv.conf` in the terminal.',
        checkType: 'history_regex',
        pattern: /cat\s+.*resolv\.conf/i
      },
      {
        id: 'm3-fix-dns',
        title: 'Configure nameserver 10.24.8.53 in ~/lab/resolv.conf',
        description: 'Write `nameserver 10.24.8.53` into `/home/learner/lab/resolv.conf`.',
        hint: 'Run: `echo "nameserver 10.24.8.53" > ~/lab/resolv.conf`',
        checkType: 'file_contains',
        filePath: '/home/learner/lab/resolv.conf',
        expectedSubstring: 'nameserver 10.24.8.53'
      },
      {
        id: 'm4-verify-log',
        title: 'Record verification stamp in ~/lab/verified.txt',
        description: 'Create `/home/learner/lab/verified.txt` containing `DNS_VERIFIED_10.24.8.53`.',
        hint: 'Run: `echo "DNS_VERIFIED_10.24.8.53" > ~/lab/verified.txt`',
        checkType: 'file_contains',
        filePath: '/home/learner/lab/verified.txt',
        expectedSubstring: 'DNS_VERIFIED_10.24.8.53'
      }
    ]
  },

  'SEC-402': {
    id: 'SEC-402',
    title: 'Log Correlation & Telnet Port Containment',
    track: 'Ethical Cybersecurity',
    grade: 'Grades 9–12',
    minutes: 30,
    summary: 'Correlate repeated failed sign-in events in auth-sim.log, isolate the suspicious IPv4 address, and close legacy Telnet port 23 while keeping HTTPS 443 open.',
    markdown: [
      '# SEC-402 · Log Correlation & Telnet Port Containment',
      '',
      '> **Ticket Brief:** *"Security monitoring flagged unusual login activity on a lab server. Correlate the authentication log, block the offending source IP, and close legacy Telnet (port 23) without disrupting HTTPS (port 443)."*',
      '',
      '## Step-by-Step Instructions',
      '',
      '### Step 1: Inspect the Authentication Log',
      'Read `~/lab/auth-sim.log` to identify which IP address triggered repeated `FAILED` logins followed by a Telnet session:',
      '```sh',
      'cat ~/lab/auth-sim.log',
      '```',
      '',
      '### Step 2: Contain the Suspicious Source IP',
      'Record only the suspicious external IP (`198.51.100.24`) in `~/lab/blocklist.conf`:',
      '```sh',
      'echo "198.51.100.24" > ~/lab/blocklist.conf',
      '```',
      '',
      '### Step 3: Close Legacy Telnet Port 23 & Preserve HTTPS 443',
      'Update `~/lab/firewall.conf` so `PORT_23=CLOSED` while keeping `PORT_443=OPEN`:',
      '```sh',
      'printf "PORT_23=CLOSED\\nPORT_443=OPEN\\n" > ~/lab/firewall.conf',
      '```'
    ].join('\n'),
    milestones: [
      {
        id: 'm1-read-log',
        title: 'Inspect ~/lab/auth-sim.log',
        description: 'Examine the authentication log to correlate failed login attempts.',
        hint: 'Run: `cat ~/lab/auth-sim.log` or `grep FAILED ~/lab/auth-sim.log`',
        checkType: 'history_regex',
        pattern: /(?:cat|grep|less)\s+.*auth-sim\.log/i
      },
      {
        id: 'm2-block-ip',
        title: 'Add 198.51.100.24 to ~/lab/blocklist.conf',
        description: 'Contain the suspicious address without blocking classroom workstations.',
        hint: 'Run: `echo "198.51.100.24" > ~/lab/blocklist.conf`',
        checkType: 'file_contains',
        filePath: '/home/learner/lab/blocklist.conf',
        expectedSubstring: '198.51.100.24'
      },
      {
        id: 'm3-close-telnet',
        title: 'Close Telnet (PORT_23=CLOSED) & keep HTTPS (PORT_443=OPEN)',
        description: 'Update `/home/learner/lab/firewall.conf` with `PORT_23=CLOSED` and `PORT_443=OPEN`.',
        hint: 'Run: `printf "PORT_23=CLOSED\\nPORT_443=OPEN\\n" > ~/lab/firewall.conf`',
        checkType: 'file_contains_all',
        filePath: '/home/learner/lab/firewall.conf',
        expectedSubstrings: ['PORT_23=CLOSED', 'PORT_443=OPEN']
      }
    ]
  },

  'INC-104': {
    id: 'INC-104',
    title: 'Storage Mount & Classroom File Recovery',
    track: 'Hardware & ServiceDesk',
    grade: 'Grades 7–12',
    minutes: 20,
    summary: 'Inspect backup archives in ~/lab/backups, verify the intact v2 lesson plan, and restore it to the classroom delivery folder.',
    markdown: [
      '# INC-104 · Storage Mount & Classroom File Recovery',
      '',
      '> **Ticket Brief:** *"After reseating the SATA data cable, the teacher needs the verified v2 Lesson Plan restored to `~/lab/delivered/lesson-plan.txt` before class starts."*',
      '',
      '## Step-by-Step Instructions',
      '',
      '### Step 1: List Available Backup Files',
      'Check the files inside `~/lab/backups`:',
      '```sh',
      'ls -la ~/lab/backups',
      '```',
      '',
      '### Step 2: Inspect and Verify the v2 Backup',
      'Read `~/lab/backups/lesson-plan-v2.txt` to confirm it contains the verified lesson plan:',
      '```sh',
      'cat ~/lab/backups/lesson-plan-v2.txt',
      '```',
      '',
      '### Step 3: Restore the Verified File to ~/lab/delivered/lesson-plan.txt',
      'Copy the verified backup into the delivery directory:',
      '```sh',
      'cp ~/lab/backups/lesson-plan-v2.txt ~/lab/delivered/lesson-plan.txt',
      '```'
    ].join('\n'),
    milestones: [
      {
        id: 'm1-list-backups',
        title: 'List the contents of ~/lab/backups',
        description: 'Use `ls` to view the backup directory.',
        hint: 'Run: `ls -la ~/lab/backups`',
        checkType: 'history_regex',
        pattern: /ls\s+.*backups/i
      },
      {
        id: 'm2-inspect-v2',
        title: 'Verify ~/lab/backups/lesson-plan-v2.txt contents',
        description: 'Inspect the v2 backup file before restoring it.',
        hint: 'Run: `cat ~/lab/backups/lesson-plan-v2.txt`',
        checkType: 'history_regex',
        pattern: /(?:cat|sha256sum|head)\s+.*lesson-plan-v2\.txt/i
      },
      {
        id: 'm3-restore-file',
        title: 'Restore verified file to ~/lab/delivered/lesson-plan.txt',
        description: 'Copy `lesson-plan-v2.txt` to `/home/learner/lab/delivered/lesson-plan.txt`.',
        hint: 'Run: `cp ~/lab/backups/lesson-plan-v2.txt ~/lab/delivered/lesson-plan.txt`',
        checkType: 'file_contains',
        filePath: '/home/learner/lab/delivered/lesson-plan.txt',
        expectedSubstring: 'COLE LEARNING LABS - LESSON PLAN v2 (VERIFIED)'
      }
    ]
  }
});

// ============================================================================
// 3. AUTHENTICATION: ANONYMOUS SESSION TOKENS & GOOGLE WORKSPACE OAUTH 2.0 HOOKS
// ============================================================================
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateLearnerAlias() {
  const bytes = crypto.randomBytes(8);
  const chars = Array.from(bytes, b => ALPHABET[b & 31]).join('');
  return `Learner-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export function createSessionToken(payload = {}) {
  const sessionId = payload.sessionId || crypto.randomUUID();
  const alias = payload.alias || generateLearnerAlias();
  const role = payload.role === 'teacher' ? 'teacher' : 'student';
  const issuedAt = Date.now();
  const data = Buffer.from(JSON.stringify({ sessionId, alias, role, issuedAt })).toString('base64url');
  const sig = crypto.createHmac('sha256', CONFIG.sessionSecret).update(data).digest('base64url');
  return { token: `${data}.${sig}`, sessionId, alias, role, issuedAt };
}

export function verifySessionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [data, sig] = token.split('.', 2);
  const expected = crypto.createHmac('sha256', CONFIG.sessionSecret).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!parsed.sessionId || typeof parsed.sessionId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Future Google Workspace OAuth 2.0 Verification Hook (Students & Teachers)
 * Validates a Google ID token and enforces the school district's hosted domain (`hd` claim).
 */
export async function verifyGoogleWorkspaceToken(idToken, { allowedDomains = CONFIG.googleAllowedDomains } = {}) {
  if (!idToken || typeof idToken !== 'string') {
    return { ok: false, error: 'missing_id_token', message: 'No Google Workspace ID token provided.' };
  }
  try {
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(CONFIG.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: CONFIG.googleClientId || undefined
    });
    const payload = ticket.getPayload();
    const domain = String(payload?.hd || '').toLowerCase();
    if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
      return { ok: false, error: 'unauthorized_domain', message: 'Account does not belong to an approved school Google Workspace domain.' };
    }
    return {
      ok: true,
      sub: payload.sub,
      domain,
      alias: generateLearnerAlias(), // Preserve pseudonymous alias in lab sessions
      role: payload.email?.startsWith('teacher') ? 'teacher' : 'student'
    };
  } catch {
    return {
      ok: false,
      error: 'oauth_not_configured',
      message: 'Google Workspace OAuth 2.0 hook is prepared; using anonymous tokenized session.'
    };
  }
}

// ============================================================================
// 4. CLOUDFLARE PROXY & NETWORK ROUTING VALIDATION
// ============================================================================
export function extractCloudflareMetadata(req) {
  const headers = req.headers || {};
  const cfConnectingIp = headers['cf-connecting-ip'] || headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
  const cfRay = headers['cf-ray'] || null;
  const cfCountry = headers['cf-ipcountry'] || null;
  const forwardedProto = (headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http')).split(',')[0].trim().toLowerCase();
  const origin = headers.origin || null;

  return {
    clientIp: String(cfConnectingIp).slice(0, 64),
    cfRay: cfRay ? String(cfRay).slice(0, 64) : null,
    cfCountry: cfCountry ? String(cfCountry).slice(0, 8) : null,
    forwardedProto,
    isCloudflareProxied: Boolean(headers['cf-ray'] || headers['cf-connecting-ip']),
    origin
  };
}

export function validateCloudflareUpgrade(req, config = CONFIG) {
  const meta = extractCloudflareMetadata(req);
  if (config.enforceCloudflareHttps && meta.forwardedProto !== 'https') {
    return { ok: false, status: 426, reason: 'HTTPS/WSS on Port 443 is strictly required.' };
  }
  if (meta.origin && config.allowedOrigins.size > 0 && !config.allowedOrigins.has(meta.origin)) {
    // Allow same-host localhost/127.0.0.1 during local testing when enforceCloudflareHttps is false
    const isLocalOrigin = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(meta.origin);
    if (config.enforceCloudflareHttps || !isLocalOrigin) {
      return { ok: false, status: 403, reason: 'Origin not permitted by Cloudflare WebSocket policy.' };
    }
  }
  return { ok: true, meta };
}

// ============================================================================
// 5. DOCKER CONTAINER + PTY LIFECYCLE & FALLBACK POSIX SANDBOX
// ============================================================================
function createInitialVirtualFs() {
  return new Map([
    ['/home/learner/lab/network-sheet.txt', 'WORKSTATION CONFIGURATION SHEET (VLAN 8)\nAssigned IPv4: 10.24.8.25/24\nDefault Gateway: 10.24.8.1\nSchool DNS Resolver: 10.24.8.53\nTarget Portal: learn.school.test\n'],
    ['/home/learner/lab/resolv.conf', '# Simulated Workstation DNS Resolver\nnameserver 192.168.1.53\nsearch school.test\n'],
    ['/home/learner/lab/auth-sim.log', '2026-10-18T08:11:02Z INFO  sshd[210]: Accepted publickey for teacher01 from 10.24.8.14 port 51204\n2026-10-18T08:14:19Z WARN  telnetd[304]: FAILED login for root from 198.51.100.24 port 23\n2026-10-18T08:14:22Z WARN  telnetd[305]: FAILED login for admin from 198.51.100.24 port 23\n2026-10-18T08:14:25Z ALERT telnetd[306]: Session opened for guest from 198.51.100.24 port 23\n2026-10-18T08:15:00Z INFO  httpd[410]: GET /classroom/portal 200 from 10.24.8.25 port 443\n'],
    ['/home/learner/lab/firewall.conf', '# Classroom Firewall Policy\nPORT_23=OPEN\nPORT_443=OPEN\n'],
    ['/home/learner/lab/blocklist.conf', '# Contained Source IPs\n'],
    ['/home/learner/lab/backups/lesson-plan-v2.txt', 'COLE LEARNING LABS - LESSON PLAN v2 (VERIFIED)\nPathway: Hardware & ServiceDesk\nTopic: Safe Power & ESD Procedure\n'],
    ['/home/learner/lab/backups/lesson-plan-v1.bak', 'CORRUPTED_DRAFT_DO_NOT_USE\n']
  ]);
}

function normalizeVirtualPath(rawPath, cwd = '/home/learner') {
  if (!rawPath) return cwd;
  let expanded = rawPath.trim().replace(/^['"]|['"]$/g, '');
  if (expanded === '~' || expanded.startsWith('~/')) {
    expanded = '/home/learner' + expanded.slice(1);
  } else if (!expanded.startsWith('/')) {
    expanded = `${cwd.replace(/\/$/, '')}/${expanded}`;
  }
  const parts = [];
  for (const segment of expanded.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') parts.pop();
    else parts.push(segment);
  }
  return '/' + parts.join('/');
}

/**
 * Built-in POSIX Alpine shell emulator used as a seamless fallback when the host
 * does not have a running Docker daemon (e.g., local preview or CI unit tests).
 */
class FallbackAlpineSandbox {
  constructor(session) {
    this.session = session;
    this.cwd = '/home/learner';
    this.files = createInitialVirtualFs();
    this.lineBuffer = '';
    this.onDataCallback = null;
    this.closed = false;
  }

  onData(cb) {
    this.onDataCallback = cb;
    this.emit(
      '\r\n\x1b[1;36mCole Learning Labs · Alpine Linux 3.20 Sandbox (Container Isolated)\x1b[0m\r\n' +
      'Type \x1b[33mhelp\x1b[0m or follow the Self-Paced instructions on the left.\r\n\r\n' +
      this.prompt()
    );
  }

  prompt() {
    const shortCwd = this.cwd.replace(/^\/home\/learner/, '~');
    return `\x1b[1;32mlearner@cole-lab\x1b[0m:\x1b[1;34m${shortCwd}\x1b[0m$ `;
  }

  emit(text) {
    if (!this.closed && this.onDataCallback) {
      this.onDataCallback(text);
    }
  }

  write(data) {
    if (this.closed) return;
    for (const ch of String(data)) {
      if (ch === '\r' || ch === '\n') {
        this.emit('\r\n');
        const cmd = this.lineBuffer.trim();
        this.lineBuffer = '';
        if (cmd) {
          this.session.commandHistory.push(cmd);
          this.executeCommand(cmd);
        }
        this.emit(this.prompt());
      } else if (ch === '\u007f' || ch === '\b') {
        if (this.lineBuffer.length > 0) {
          this.lineBuffer = this.lineBuffer.slice(0, -1);
          this.emit('\b \b');
        }
      } else if (ch === '\u0003') {
        this.lineBuffer = '';
        this.emit('^C\r\n' + this.prompt());
      } else if (ch >= ' ') {
        this.lineBuffer += ch;
        this.emit(ch);
      }
    }
  }

  executeCommand(rawCmd) {
    // Handle output redirection: echo/printf ... > target
    const redirectMatch = rawCmd.match(/^(.*?)\s*(>>?)\s*([^\s>]+)\s*$/);
    if (redirectMatch) {
      const [, lhs, op, targetRaw] = redirectMatch;
      const targetPath = normalizeVirtualPath(targetRaw, this.cwd);
      const output = this.evaluateSimpleCommand(lhs.trim());
      const prev = op === '>>' ? (this.files.get(targetPath) || '') : '';
      this.files.set(targetPath, prev + output + (output.endsWith('\n') ? '' : '\n'));
      return;
    }
    const output = this.evaluateSimpleCommand(rawCmd);
    if (output) {
      this.emit(output.replace(/\r?\n/g, '\r\n') + (output.endsWith('\n') ? '' : '\r\n'));
    }
  }

  evaluateSimpleCommand(cmd) {
    const parts = cmd.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const bin = parts[0] || '';
    const args = parts.slice(1);

    switch (bin) {
      case 'help':
        return 'Available commands: ls, cat, echo, printf, cp, grep, pwd, cd, whoami, uname, ip, sha256sum, history, clear';
      case 'clear':
        this.emit('\x1b[2J\x1b[H');
        return '';
      case 'whoami':
        return 'learner';
      case 'pwd':
        return this.cwd;
      case 'uname':
        return 'Linux cole-lab 6.6.54-alpine #1 SMP PREEMPT_DYNAMIC x86_64 Linux';
      case 'history':
        return this.session.commandHistory.map((item, i) => `  ${i + 1}  ${item}`).join('\n');
      case 'ip':
        return '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n2: eth0@if12: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n    inet 10.24.8.25/24 brd 10.24.8.255 scope global eth0';
      case 'cd': {
        const dest = normalizeVirtualPath(args[0] || '~', this.cwd);
        this.cwd = dest;
        return '';
      }
      case 'echo': {
        const text = args.join(' ').replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
        return text;
      }
      case 'printf': {
        const text = args.join(' ').replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
        return text;
      }
      case 'ls': {
        const pathArg = args.find(a => !a.startsWith('-')) || this.cwd;
        const dir = normalizeVirtualPath(pathArg, this.cwd).replace(/\/$/, '');
        const entries = new Set();
        for (const filePath of this.files.keys()) {
          if (filePath.startsWith(dir + '/')) {
            const rest = filePath.slice(dir.length + 1).split('/')[0];
            if (rest) entries.add(rest);
          }
        }
        return entries.size ? Array.from(entries).sort().join('  ') : '(empty directory)';
      }
      case 'cat': {
        const pathArg = args.find(a => !a.startsWith('-'));
        if (!pathArg) return 'cat: missing file operand';
        const target = normalizeVirtualPath(pathArg, this.cwd);
        if (!this.files.has(target)) return `cat: can't open '${pathArg}': No such file or directory`;
        return this.files.get(target).trimEnd();
      }
      case 'grep': {
        const cleanArgs = args.filter(a => !a.startsWith('-'));
        const pattern = (cleanArgs[0] || '').replace(/^['"]|['"]$/g, '');
        const fileArg = cleanArgs[1];
        if (!fileArg) return 'grep: missing file operand';
        const target = normalizeVirtualPath(fileArg, this.cwd);
        if (!this.files.has(target)) return `grep: ${fileArg}: No such file or directory`;
        const lines = this.files.get(target).split('\n').filter(line => line.toLowerCase().includes(pattern.toLowerCase()));
        return lines.join('\n');
      }
      case 'cp': {
        const cleanArgs = args.filter(a => !a.startsWith('-'));
        if (cleanArgs.length < 2) return 'cp: missing destination file operand';
        const src = normalizeVirtualPath(cleanArgs[0], this.cwd);
        const dest = normalizeVirtualPath(cleanArgs[1], this.cwd);
        if (!this.files.has(src)) return `cp: can't stat '${cleanArgs[0]}': No such file or directory`;
        this.files.set(dest, this.files.get(src));
        return '';
      }
      case 'sha256sum': {
        const cleanArgs = args.filter(a => !a.startsWith('-'));
        const outputs = [];
        for (const arg of cleanArgs) {
          const prefix = normalizeVirtualPath(arg.replace(/\*$/, ''), this.cwd);
          for (const [k, v] of this.files.entries()) {
            if (arg.endsWith('*') ? k.startsWith(prefix) : k === prefix) {
              const digest = crypto.createHash('sha256').update(v).digest('hex');
              outputs.push(`${digest}  ${k}`);
            }
          }
        }
        return outputs.join('\n') || 'sha256sum: no matching files';
      }
      default:
        return `sh: ${bin}: command executed in sandbox`;
    }
  }

  resize() {}

  async readFile(filePath) {
    return this.files.get(filePath) ?? null;
  }

  async destroy() {
    this.closed = true;
  }
}

/**
 * Docker Container + PTY Spawner
 * Spawns an isolated, unprivileged Alpine Linux container with strict CPU/RAM/PID limits
 * and binds /bin/sh via node-pty (or child_process) to the session's WebSocket.
 */
export function buildDockerRunArgs(containerName, image = CONFIG.sandboxImage) {
  return [
    'run',
    '-d',
    '--rm',
    '--name', containerName,
    '--hostname', 'cole-lab',
    '--user', '1000:1000',
    `--memory=${CONFIG.memoryLimit}`,
    `--memory-swap=${CONFIG.memoryLimit}`,
    `--cpus=${CONFIG.cpuLimit}`,
    `--pids-limit=${CONFIG.pidsLimit}`,
    '--network', 'none',
    '--cap-drop=ALL',
    '--security-opt', 'no-new-privileges:true',
    '--read-only',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
    '--tmpfs', '/home/learner:rw,noexec,nosuid,size=64m',
    image,
    '/bin/sh', '-c', 'trap "exit 0" TERM INT; while true; do sleep 60; done'
  ];
}

async function isDockerAvailable() {
  if (process.env.FORCE_FALLBACK_SANDBOX === 'true') return false;
  try {
    await execFileAsync('docker', ['version', '--format', '{{.Server.Version}}'], { timeout: 2500, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

export async function spawnSandboxContainer(session) {
  const containerName = `cll-sandbox-${session.sessionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}`;
  const dockerReady = await isDockerAvailable();

  if (dockerReady) {
    try {
      let imageToUse = CONFIG.sandboxImage;
      try {
        await execFileAsync('docker', ['image', 'inspect', imageToUse], { timeout: 2000, windowsHide: true });
      } catch {
        imageToUse = CONFIG.fallbackAlpineImage;
      }

      const runArgs = buildDockerRunArgs(containerName, imageToUse);
      const { stdout } = await execFileAsync('docker', runArgs, { timeout: 10000, windowsHide: true });
      const containerId = stdout.trim().slice(0, 12);

      // Attach interactive PTY shell inside the running unprivileged container
      const execArgs = ['exec', '-it', '-u', '1000:1000', '-w', '/home/learner', containerName, '/bin/sh'];
      if (ptyModule) {
        const ptyProcess = ptyModule.spawn('docker', execArgs, {
          name: 'xterm-256color',
          cols: session.cols || 80,
          rows: session.rows || 24,
          cwd: process.cwd(),
          env: { ...process.env, TERM: 'xterm-256color' }
        });
        return {
          mode: 'docker-pty',
          containerName,
          containerId,
          onData: cb => ptyProcess.onData(cb),
          write: data => ptyProcess.write(data),
          resize: (cols, rows) => {
            try { ptyProcess.resize(Math.max(20, cols), Math.max(5, rows)); } catch {}
          },
          readFile: async filePath => {
            try {
              const { stdout: content } = await execFileAsync(
                'docker',
                ['exec', '-u', '1000:1000', containerName, '/bin/cat', filePath],
                { timeout: 3000, windowsHide: true }
              );
              return content;
            } catch {
              return null;
            }
          },
          destroy: async () => {
            try { ptyProcess.kill(); } catch {}
            try { await execFileAsync('docker', ['rm', '-f', containerName], { timeout: 5000, windowsHide: true }); } catch {}
          }
        };
      } else {
        // Pipe via child_process if node-pty native binary is not compiled
        const child = spawn('docker', ['exec', '-i', '-u', '1000:1000', '-w', '/home/learner', containerName, '/bin/sh'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true
        });
        return {
          mode: 'docker-pipe',
          containerName,
          containerId,
          onData: cb => {
            child.stdout.on('data', chunk => cb(chunk.toString('utf8')));
            child.stderr.on('data', chunk => cb(chunk.toString('utf8')));
          },
          write: data => {
            if (child.stdin.writable) child.stdin.write(data);
          },
          resize: () => {},
          readFile: async filePath => {
            try {
              const { stdout: content } = await execFileAsync(
                'docker',
                ['exec', '-u', '1000:1000', containerName, '/bin/cat', filePath],
                { timeout: 3000, windowsHide: true }
              );
              return content;
            } catch {
              return null;
            }
          },
          destroy: async () => {
            try { child.kill(); } catch {}
            try { await execFileAsync('docker', ['rm', '-f', containerName], { timeout: 5000, windowsHide: true }); } catch {}
          }
        };
      }
    } catch {
      // Fall through to FallbackAlpineSandbox if Docker pull/run fails
    }
  }

  const fallback = new FallbackAlpineSandbox(session);
  return {
    mode: 'alpine-simulated-sandbox',
    containerName,
    containerId: `sim-${session.sessionId.slice(0, 8)}`,
    onData: cb => fallback.onData(cb),
    write: data => fallback.write(data),
    resize: (cols, rows) => fallback.resize(cols, rows),
    readFile: filePath => fallback.readFile(filePath),
    destroy: () => fallback.destroy()
  };
}

// ============================================================================
// 6. SERVER-SIDE MILESTONE AUTO-VERIFICATION
// ============================================================================
export async function verifySessionMilestones(session) {
  const lab = SELF_PACED_LABS[session.labId] || SELF_PACED_LABS['NET-201'];
  if (!lab || !session.sandbox) return [];

  // Also check shell history file inside real Docker container if present
  const containerHistoryRaw = await session.sandbox.readFile('/home/learner/.sh_history');
  const combinedHistory = [
    ...session.commandHistory,
    ...(containerHistoryRaw ? containerHistoryRaw.split(/\r?\n/) : [])
  ].filter(Boolean);

  const results = [];
  for (const milestone of lab.milestones) {
    let completed = Boolean(session.completedMilestones.has(milestone.id));

    if (!completed) {
      if (milestone.checkType === 'history_regex' && milestone.pattern) {
        completed = combinedHistory.some(cmd => milestone.pattern.test(cmd));
      } else if (milestone.checkType === 'file_contains' && milestone.filePath) {
        const content = await session.sandbox.readFile(milestone.filePath);
        completed = typeof content === 'string' && content.includes(milestone.expectedSubstring);
      } else if (milestone.checkType === 'file_contains_all' && milestone.filePath) {
        const content = await session.sandbox.readFile(milestone.filePath);
        completed =
          typeof content === 'string' &&
          milestone.expectedSubstrings.every(sub => content.includes(sub));
      }
      if (completed) {
        session.completedMilestones.add(milestone.id);
      }
    }

    results.push({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      hint: milestone.hint,
      completed
    });
  }

  return results;
}

// ============================================================================
// 7. RFC 6455 NATIVE WEBSOCKET FRAME ENCODER/DECODER (ZERO-DEPENDENCY SUPPORT)
// ============================================================================
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function createWsAcceptKey(secWebsocketKey) {
  return crypto.createHash('sha1').update(secWebsocketKey + WS_GUID).digest('base64');
}

function encodeWsFrame(payload, opcode = 0x01) {
  const data = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : Buffer.from(payload);
  const len = data.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, data]);
}

class NativeWebSocketConnection {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.closed = false;
    this.listeners = { message: [], close: [] };

    socket.on('data', chunk => this.handleChunk(chunk));
    socket.on('close', () => this.emitClose());
    socket.on('end', () => this.emitClose());
    socket.on('error', () => this.emitClose());
  }

  on(event, fn) {
    if (this.listeners[event]) this.listeners[event].push(fn);
  }

  send(data) {
    if (this.closed || !this.socket.writable) return;
    this.socket.write(encodeWsFrame(data, 0x01));
  }

  ping() {
    if (this.closed || !this.socket.writable) return;
    this.socket.write(encodeWsFrame(Buffer.alloc(0), 0x09));
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try {
      if (this.socket.writable) {
        this.socket.write(encodeWsFrame(Buffer.alloc(0), 0x08));
        this.socket.end();
      }
    } catch {}
    this.emitClose();
  }

  emitClose() {
    if (this._emittedClose) return;
    this._emittedClose = true;
    this.closed = true;
    for (const fn of this.listeners.close) fn();
  }

  handleChunk(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      const firstByte = this.buffer[0];
      const secondByte = this.buffer[1];
      const opcode = firstByte & 0x0f;
      const isMasked = Boolean(secondByte & 0x80);
      let payloadLength = secondByte & 0x7f;
      let offset = 2;

      if (payloadLength === 126) {
        if (this.buffer.length < 4) return;
        payloadLength = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (this.buffer.length < 10) return;
        payloadLength = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskLength = isMasked ? 4 : 0;
      const totalFrameLength = offset + maskLength + payloadLength;
      if (this.buffer.length < totalFrameLength) return;

      const maskKey = isMasked ? this.buffer.subarray(offset, offset + 4) : null;
      const payload = Buffer.from(this.buffer.subarray(offset + maskLength, totalFrameLength));
      this.buffer = this.buffer.subarray(totalFrameLength);

      if (isMasked && maskKey) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskKey[i & 3];
        }
      }

      if (opcode === 0x08) {
        this.close();
        return;
      } else if (opcode === 0x09) {
        // Respond to Ping with Pong
        if (this.socket.writable) this.socket.write(encodeWsFrame(payload, 0x0a));
      } else if (opcode === 0x01 || opcode === 0x02) {
        const text = payload.toString('utf8');
        for (const fn of this.listeners.message) fn(text);
      }
    }
  }
}

// ============================================================================
// 8. ORCHESTRATOR SERVER (SESSIONS, CLASSROOMS, SNAPSHOTS, INACTIVITY REAPER)
// ============================================================================
const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
});

function normalizeClassroomCode(code) {
  if (typeof code !== 'string' || !code.trim()) return null;
  const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  return cleaned || null;
}

export function createSandboxOrchestrator(customConfig = {}) {
  const cfg = { ...CONFIG, ...customConfig };
  const sessions = new Map(); // sessionId -> SessionObject
  const classrooms = new Map(); // classroomCode -> Set<sessionId>

  function getOrCreateClassroom(code) {
    if (!classrooms.has(code)) classrooms.set(code, new Set());
    return classrooms.get(code);
  }

  function sendJson(ws, payload) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {}
  }

  async function destroySession(sessionId, reason = 'session_closed') {
    const session = sessions.get(sessionId);
    if (!session) return;
    sessions.delete(sessionId);
    if (session.classroomCode && classrooms.has(session.classroomCode)) {
      classrooms.get(session.classroomCode).delete(sessionId);
    }
    if (session.ws) {
      sendJson(session.ws, { type: 'session:terminated', reason });
      session.ws.close();
    }
    if (session.sandbox) {
      await session.sandbox.destroy();
    }
  }

  // Automated 5-Minute Inactivity Reaper to tear down idle/orphan Docker containers
  const reaperTimer = setInterval(async () => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
      if (now - session.lastActivityAt >= cfg.inactivityTimeoutMs) {
        await destroySession(sessionId, 'inactivity_timeout_5m');
      }
    }
  }, cfg.reaperIntervalMs);
  reaperTimer.unref?.();

  // 30-Second Cloudflare WebSocket Heartbeat
  const heartbeatTimer = setInterval(() => {
    for (const session of sessions.values()) {
      if (session.ws) {
        session.ws.ping?.();
        sendJson(session.ws, { type: 'ping', timestamp: Date.now() });
      }
    }
  }, cfg.wsHeartbeatIntervalMs);
  heartbeatTimer.unref?.();

  function classroomStatusSummary(classroomCode) {
    const code = normalizeClassroomCode(classroomCode);
    const memberIds = classrooms.get(code) || new Set();
    const students = [];
    for (const id of memberIds) {
      const s = sessions.get(id);
      if (!s) continue;
      const lab = SELF_PACED_LABS[s.labId] || SELF_PACED_LABS['NET-201'];
      students.push({
        sessionId: s.sessionId,
        alias: s.alias,
        labId: s.labId,
        mode: s.mode,
        containerId: s.sandbox?.containerId || null,
        runtimeMode: s.sandbox?.mode || 'initializing',
        paused: s.inputsPaused,
        completedMilestones: s.completedMilestones.size,
        totalMilestones: lab.milestones.length,
        lastActivityAt: new Date(s.lastActivityAt).toISOString(),
        snapshotUpdatedAt: s.lastSnapshotAt ? new Date(s.lastSnapshotAt).toISOString() : null,
        snapshotDataUrl: s.lastSnapshotDataUrl || null
      });
    }
    return {
      classroomCode: code,
      studentCount: students.length,
      snapshotIntervalSeconds: 5,
      snapshotCompressionQuality: 0.1,
      students
    };
  }

  async function readJsonBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 128 * 1024) reject(new Error('Payload too large'));
      });
      req.on('end', () => {
        if (!body) return resolve({});
        try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
      });
      req.on('error', reject);
    });
  }

  function jsonResponse(res, status, data) {
    const payload = JSON.stringify(data);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    });
    res.end(payload);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // 1. Health & Cloudflare Tunnel Status Endpoint
    if (pathname === '/api/health' && req.method === 'GET') {
      const cfMeta = extractCloudflareMetadata(req);
      return jsonResponse(res, 200, {
        status: 'ok',
        service: 'cole-learning-labs-terminal-orchestrator',
        activeSessions: sessions.size,
        cloudflare: cfMeta,
        limits: {
          memory: cfg.memoryLimit,
          cpus: cfg.cpuLimit,
          inactivityTimeoutSeconds: cfg.inactivityTimeoutMs / 1000
        }
      });
    }

    // 2. Self-Paced Labs Catalog Endpoint
    if (pathname === '/api/labs' && req.method === 'GET') {
      const list = Object.values(SELF_PACED_LABS).map(lab => ({
        id: lab.id,
        title: lab.title,
        track: lab.track,
        grade: lab.grade,
        minutes: lab.minutes,
        summary: lab.summary,
        markdown: lab.markdown,
        milestones: lab.milestones.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description,
          hint: m.hint
        }))
      }));
      return jsonResponse(res, 200, { labs: list });
    }

    // 3. Anonymous Session Token & Google Workspace OAuth 2.0 Hook Endpoint
    if (pathname === '/api/auth/session' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        if (body.googleIdToken) {
          const googleResult = await verifyGoogleWorkspaceToken(body.googleIdToken);
          if (googleResult.ok) {
            const sessionAuth = createSessionToken({ alias: googleResult.alias, role: googleResult.role });
            return jsonResponse(res, 200, { authMode: 'google_workspace', ...sessionAuth });
          }
        }
        const sessionAuth = createSessionToken({ role: body.role === 'teacher' ? 'teacher' : 'student' });
        return jsonResponse(res, 200, { authMode: 'anonymous_token', ...sessionAuth });
      } catch {
        return jsonResponse(res, 400, { error: 'invalid_request' });
      }
    }

    // 4. Instructor-Led Classroom Status & Low-Bandwidth 10% JPEG Snapshots Endpoint
    const classroomMatch = pathname.match(/^\/api\/classrooms\/([A-Za-z0-9-]+)\/(status|snapshots|control)$/);
    if (classroomMatch) {
      const [, rawCode, action] = classroomMatch;
      const code = normalizeClassroomCode(rawCode);
      if (!code) return jsonResponse(res, 400, { error: 'invalid_classroom_code' });

      if (req.method === 'GET' && (action === 'status' || action === 'snapshots')) {
        return jsonResponse(res, 200, classroomStatusSummary(code));
      }

      if (req.method === 'POST' && action === 'control') {
        try {
          const body = await readJsonBody(req);
          const memberIds = classrooms.get(code) || new Set();
          let affected = 0;

          for (const id of memberIds) {
            const s = sessions.get(id);
            if (!s) continue;
            if (body.targetSessionId && body.targetSessionId !== s.sessionId) continue;

            if (body.action === 'pause') {
              s.inputsPaused = true;
              sendJson(s.ws, { type: 'teacher:pause-state', paused: true, message: 'Instructor paused terminal input.' });
              affected++;
            } else if (body.action === 'resume') {
              s.inputsPaused = false;
              sendJson(s.ws, { type: 'teacher:pause-state', paused: false, message: 'Instructor resumed terminal input.' });
              affected++;
            } else if (body.action === 'override-command' && typeof body.command === 'string') {
              const cleanCmd = body.command.slice(0, 500);
              s.commandHistory.push(cleanCmd.trim());
              s.sandbox?.write(cleanCmd.endsWith('\n') ? cleanCmd : cleanCmd + '\r');
              sendJson(s.ws, {
                type: 'teacher:override-executed',
                command: cleanCmd.trim()
              });
              affected++;
            } else if (body.action === 'request-snapshots') {
              sendJson(s.ws, { type: 'teacher:request-snapshot', quality: 0.1 });
              affected++;
            }
          }
          return jsonResponse(res, 200, { ok: true, classroomCode: code, action: body.action, affected });
        } catch {
          return jsonResponse(res, 400, { error: 'invalid_control_payload' });
        }
      }
    }

    // 5. Static Frontend Files (index.html, app.js, styles.css)
    if (req.method === 'GET' || req.method === 'HEAD') {
      const cleanPath = pathname === '/' ? '/index.html' : pathname;
      if (cleanPath.includes('..') || cleanPath.includes('\\')) {
        res.writeHead(403);
        return res.end('Forbidden');
      }
      const filePath = path.join(PUBLIC_DIR, cleanPath);
      try {
        const content = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer'
        });
        return res.end(req.method === 'HEAD' ? undefined : content);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Not found');
      }
    }

    res.writeHead(405);
    res.end('Method not allowed');
  });

  // ============================================================================
  // 9. SECURE WEBSOCKET UPGRADE HANDSHAKE (WSS OVER PORT 443)
  // ============================================================================
  server.on('upgrade', async (req, socket) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname !== '/ws') {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    const validation = validateCloudflareUpgrade(req, cfg);
    if (!validation.ok) {
      socket.write(`HTTP/1.1 ${validation.status} ${validation.reason}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
      return;
    }

    const secKey = req.headers['sec-websocket-key'];
    if (!secKey) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    // Complete RFC 6455 WebSocket Handshake
    const acceptKey = createWsAcceptKey(secKey);
    socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`,
        '\r\n'
      ].join('\r\n')
    );

    const ws = new NativeWebSocketConnection(socket);

    // Resolve or issue tokenized session identity
    const tokenParam = url.searchParams.get('token');
    const verifiedToken = tokenParam ? verifySessionToken(tokenParam) : null;
    const identity = verifiedToken || createSessionToken();
    const requestedLabId = url.searchParams.get('lab') || 'NET-201';
    const labId = Object.hasOwn(SELF_PACED_LABS, requestedLabId) ? requestedLabId : 'NET-201';
    const mode = url.searchParams.get('mode') === 'instructor' ? 'instructor' : 'self-paced';
    const classroomCode = normalizeClassroomCode(url.searchParams.get('classroom'));

    const session = {
      sessionId: identity.sessionId,
      alias: identity.alias,
      role: identity.role || 'student',
      labId,
      mode,
      classroomCode,
      cols: 80,
      rows: 24,
      inputsPaused: false,
      commandHistory: [],
      completedMilestones: new Set(),
      lastActivityAt: Date.now(),
      lastSnapshotAt: 0,
      lastSnapshotDataUrl: null,
      cloudflare: validation.meta,
      ws,
      sandbox: null
    };

    sessions.set(session.sessionId, session);
    if (classroomCode) {
      getOrCreateClassroom(classroomCode).add(session.sessionId);
    }

    // Spawn dedicated Alpine Linux container (or fallback sandbox) and bind PTY
    session.sandbox = await spawnSandboxContainer(session);
    session.sandbox.onData(chunk => {
      sendJson(ws, { type: 'terminal:output', data: chunk });
    });

    const initialMilestones = await verifySessionMilestones(session);
    const lab = SELF_PACED_LABS[session.labId];

    sendJson(ws, {
      type: 'session:ready',
      sessionId: session.sessionId,
      alias: session.alias,
      labId: session.labId,
      mode: session.mode,
      classroomCode: session.classroomCode,
      containerId: session.sandbox.containerId,
      runtimeMode: session.sandbox.mode,
      cloudflare: session.cloudflare,
      limits: {
        memory: cfg.memoryLimit,
        cpus: cfg.cpuLimit,
        inactivityTimeoutSeconds: cfg.inactivityTimeoutMs / 1000
      },
      lab: {
        id: lab.id,
        title: lab.title,
        track: lab.track,
        grade: lab.grade,
        markdown: lab.markdown
      },
      milestones: initialMilestones
    });

    let lineCollector = '';

    ws.on('message', async rawMessage => {
      session.lastActivityAt = Date.now();
      let msg;
      try {
        msg = JSON.parse(rawMessage);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'pong':
        case 'ping':
          if (msg.type === 'ping') sendJson(ws, { type: 'pong', timestamp: Date.now() });
          break;

        case 'terminal:input': {
          if (session.inputsPaused) {
            sendJson(ws, {
              type: 'teacher:pause-state',
              paused: true,
              message: 'Your instructor has paused terminal input for a classroom demonstration.'
            });
            return;
          }
          if (typeof msg.data === 'string' && msg.data.length <= 4096) {
            session.sandbox?.write(msg.data);
            // Track command lines for real Docker PTY sessions and auto-verify milestones on Enter
            for (const ch of msg.data) {
              if (ch === '\r' || ch === '\n') {
                if (lineCollector.trim()) {
                  session.commandHistory.push(lineCollector.trim());
                  lineCollector = '';
                }
                setTimeout(async () => {
                  const updated = await verifySessionMilestones(session);
                  sendJson(ws, { type: 'milestone:status', labId: session.labId, milestones: updated });
                }, 120);
              } else if (ch === '\u007f' || ch === '\b') {
                lineCollector = lineCollector.slice(0, -1);
              } else if (ch >= ' ') {
                lineCollector += ch;
              }
            }
          }
          break;
        }

        case 'terminal:resize': {
          const cols = Number(msg.cols);
          const rows = Number(msg.rows);
          if (Number.isInteger(cols) && Number.isInteger(rows) && cols >= 20 && rows >= 5) {
            session.cols = cols;
            session.rows = rows;
            session.sandbox?.resize(cols, rows);
          }
          break;
        }

        case 'milestone:verify': {
          const milestones = await verifySessionMilestones(session);
          sendJson(ws, { type: 'milestone:status', labId: session.labId, milestones });
          break;
        }

        case 'lab:switch': {
          if (typeof msg.labId === 'string' && Object.hasOwn(SELF_PACED_LABS, msg.labId)) {
            session.labId = msg.labId;
            session.completedMilestones.clear();
            const nextLab = SELF_PACED_LABS[session.labId];
            const milestones = await verifySessionMilestones(session);
            sendJson(ws, {
              type: 'lab:switched',
              lab: {
                id: nextLab.id,
                title: nextLab.title,
                track: nextLab.track,
                grade: nextLab.grade,
                markdown: nextLab.markdown
              },
              milestones
            });
          }
          break;
        }

        case 'classroom:join': {
          const nextCode = normalizeClassroomCode(msg.classroomCode);
          if (session.classroomCode && classrooms.has(session.classroomCode)) {
            classrooms.get(session.classroomCode).delete(session.sessionId);
          }
          session.classroomCode = nextCode;
          session.mode = nextCode ? 'instructor' : 'self-paced';
          if (nextCode) {
            getOrCreateClassroom(nextCode).add(session.sessionId);
          }
          sendJson(ws, {
            type: 'classroom:joined',
            classroomCode: session.classroomCode,
            mode: session.mode
          });
          break;
        }

        case 'screen:snapshot': {
          // Low-Bandwidth Mode: 10%-compressed JPEG snapshot once every ~5 seconds
          const now = Date.now();
          if (
            typeof msg.dataUrl === 'string' &&
            msg.dataUrl.startsWith('data:image/jpeg;base64,') &&
            msg.dataUrl.length <= cfg.maxSnapshotBytes &&
            now - session.lastSnapshotAt >= cfg.snapshotMinIntervalMs
          ) {
            session.lastSnapshotAt = now;
            session.lastSnapshotDataUrl = msg.dataUrl;
            sendJson(ws, { type: 'screen:snapshot-ack', timestamp: now });
          }
          break;
        }
      }
    });

    ws.on('close', async () => {
      await destroySession(session.sessionId, 'websocket_disconnected');
    });
  });

  return {
    server,
    sessions,
    classrooms,
    close: async () => {
      clearInterval(reaperTimer);
      clearInterval(heartbeatTimer);
      for (const id of [...sessions.keys()]) {
        await destroySession(id, 'server_shutdown');
      }
      await new Promise(resolve => server.close(() => resolve()));
    }
  };
}

// Start server when executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const orchestrator = createSandboxOrchestrator();
  orchestrator.server.listen(CONFIG.port, CONFIG.host, () => {
    console.log(
      `Cole Learning Labs Terminal Orchestrator listening on http://${CONFIG.host}:${CONFIG.port} (WSS endpoint: /ws)`
    );
  });
}
