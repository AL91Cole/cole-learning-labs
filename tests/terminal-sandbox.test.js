import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDockerRunArgs,
  createSessionToken,
  verifySessionToken,
  verifyGoogleWorkspaceToken,
  validateCloudflareUpgrade,
  createSandboxOrchestrator,
  SELF_PACED_LABS
} from '../terminal-sandbox/server.js';
import { renderMarkdown } from '../terminal-sandbox/public/app.js';

test('Docker container args enforce 512MB RAM, 0.5 vCPU, unprivileged user 1000:1000, and dropped capabilities', () => {
  const args = buildDockerRunArgs('cll-sandbox-test123', 'cole-learning-labs/sandbox:alpine');
  assert.ok(args.includes('--memory=512m'));
  assert.ok(args.includes('--memory-swap=512m'));
  assert.ok(args.includes('--cpus=0.5'));
  assert.ok(args.includes('--pids-limit=64'));
  assert.ok(args.includes('--cap-drop=ALL'));
  assert.ok(args.includes('no-new-privileges:true'));
  assert.ok(args.includes('--read-only'));
  assert.ok(args.includes('1000:1000'));
});

test('Session tokens sign and verify pseudonymous Learner aliases and Google OAuth hook fails safely when unconfigured', async () => {
  const issued = createSessionToken({ role: 'student' });
  assert.match(issued.alias, /^Learner-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const verified = verifySessionToken(issued.token);
  assert.equal(verified.sessionId, issued.sessionId);
  assert.equal(verified.alias, issued.alias);
  assert.equal(verifySessionToken(issued.token + 'tampered'), null);

  const oauthRes = await verifyGoogleWorkspaceToken('');
  assert.equal(oauthRes.ok, false);
  assert.equal(oauthRes.error, 'missing_id_token');
});

test('Cloudflare upgrade validator enforces HTTPS on port 443 and checks allowed origins', () => {
  const strictCfg = {
    enforceCloudflareHttps: true,
    allowedOrigins: new Set(['https://www.colelearninglabs.com'])
  };

  const insecureReq = {
    headers: {
      'x-forwarded-proto': 'http',
      origin: 'https://www.colelearninglabs.com',
      'cf-connecting-ip': '198.51.100.10',
      'cf-ray': '8d1234567890-IAD'
    }
  };
  assert.equal(validateCloudflareUpgrade(insecureReq, strictCfg).ok, false);
  assert.equal(validateCloudflareUpgrade(insecureReq, strictCfg).status, 426);

  const badOriginReq = {
    headers: {
      'x-forwarded-proto': 'https',
      origin: 'https://untrusted.example.com',
      'cf-connecting-ip': '198.51.100.10'
    }
  };
  assert.equal(validateCloudflareUpgrade(badOriginReq, strictCfg).ok, false);
  assert.equal(validateCloudflareUpgrade(badOriginReq, strictCfg).status, 403);

  const validCfReq = {
    headers: {
      'x-forwarded-proto': 'https',
      origin: 'https://www.colelearninglabs.com',
      'cf-connecting-ip': '198.51.100.10',
      'cf-ray': '8d1234567890-IAD',
      'cf-ipcountry': 'US'
    }
  };
  const validResult = validateCloudflareUpgrade(validCfReq, strictCfg);
  assert.equal(validResult.ok, true);
  assert.equal(validResult.meta.clientIp, '198.51.100.10');
  assert.equal(validResult.meta.isCloudflareProxied, true);
});

test('Markdown sidebar renderer escapes unsafe HTML and creates runnable terminal command blocks', () => {
  const md = SELF_PACED_LABS['NET-201'].markdown + '\n<script>alert(1)</script>';
  const html = renderMarkdown(md);
  assert.ok(html.includes('NET-201 · Workstation Network &amp; DNS Diagnostics'));
  assert.ok(html.includes('data-run-command="cat ~/lab/network-sheet.txt"'));
  assert.equal(html.includes('<script>'), false);
});

test('End-to-end WebSocket session spawns sandbox, streams PTY output, auto-verifies milestones, and supports Instructor-Led 10% JPEG snapshots', async t => {
  process.env.FORCE_FALLBACK_SANDBOX = 'true';
  const orchestrator = createSandboxOrchestrator({
    inactivityTimeoutMs: 60000,
    reaperIntervalMs: 60000,
    snapshotMinIntervalMs: 10
  });

  await new Promise(resolve => orchestrator.server.listen(0, '127.0.0.1', resolve));
  const { port } = orchestrator.server.address();
  t.after(async () => {
    await orchestrator.close();
  });

  // 1. Check /api/health and /api/labs
  const healthRes = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.status, 'ok');

  const labsRes = await fetch(`http://127.0.0.1:${port}/api/labs`);
  const labsData = await labsRes.json();
  assert.equal(labsData.labs.length, 3);

  // 2. Connect WebSocket to /ws in Instructor-Led classroom CLL-CLASS-712
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?lab=NET-201&mode=instructor&classroom=CLL-CLASS-712`);
  const messages = [];

  const waitForMessage = predicate =>
    new Promise((resolve, reject) => {
      const existing = messages.find(predicate);
      if (existing) return resolve(existing);
      const timer = setTimeout(() => reject(new Error('Timed out waiting for WebSocket message')), 4000);
      const handler = event => {
        const parsed = JSON.parse(event.data);
        messages.push(parsed);
        if (predicate(parsed)) {
          clearTimeout(timer);
          ws.removeEventListener('message', handler);
          resolve(parsed);
        }
      };
      ws.addEventListener('message', handler);
    });

  ws.addEventListener('message', event => {
    try { messages.push(JSON.parse(event.data)); } catch {}
  });

  const readyMsg = await waitForMessage(m => m.type === 'session:ready');
  assert.equal(readyMsg.labId, 'NET-201');
  assert.equal(readyMsg.classroomCode, 'CLL-CLASS-712');
  assert.equal(readyMsg.milestones.length, 4);
  assert.equal(readyMsg.milestones.every(m => !m.completed), true);

  // 3. Execute Step 1 & Step 3 commands in the sandbox terminal and verify server-side milestone auto-verification
  ws.send(JSON.stringify({ type: 'terminal:input', data: 'cat ~/lab/network-sheet.txt\r' }));
  const afterStep1 = await waitForMessage(
    m => m.type === 'milestone:status' && m.milestones.find(x => x.id === 'm1-sheet')?.completed === true
  );
  assert.equal(afterStep1.milestones.find(x => x.id === 'm1-sheet').completed, true);

  ws.send(JSON.stringify({ type: 'terminal:input', data: 'echo "nameserver 10.24.8.53" > ~/lab/resolv.conf\r' }));
  const afterStep3 = await waitForMessage(
    m => m.type === 'milestone:status' && m.milestones.find(x => x.id === 'm3-fix-dns')?.completed === true
  );
  assert.equal(afterStep3.milestones.find(x => x.id === 'm3-fix-dns').completed, true);

  // 4. Send 10%-compressed JPEG snapshot and verify Teacher Dashboard API receives it
  const fakeJpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/';
  ws.send(JSON.stringify({ type: 'screen:snapshot', dataUrl: fakeJpegDataUrl, quality: 0.1 }));
  await waitForMessage(m => m.type === 'screen:snapshot-ack');

  const snapRes = await fetch(`http://127.0.0.1:${port}/api/classrooms/CLL-CLASS-712/snapshots`);
  const snapData = await snapRes.json();
  assert.equal(snapData.studentCount, 1);
  assert.equal(snapData.students[0].snapshotDataUrl, fakeJpegDataUrl);
  assert.equal(snapData.students[0].completedMilestones, 2);

  // 5. Test Instructor-Led Pause & Command Override
  const pauseRes = await fetch(`http://127.0.0.1:${port}/api/classrooms/CLL-CLASS-712/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'pause' })
  });
  assert.equal((await pauseRes.json()).affected, 1);
  const pauseMsg = await waitForMessage(m => m.type === 'teacher:pause-state' && m.paused === true);
  assert.equal(pauseMsg.paused, true);

  ws.close();
});
