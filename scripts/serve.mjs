import http from 'node:http';
import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_FILES } from './build.mjs';
import { assertPublicCurriculumPaths } from './curriculum-policy.mjs';

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const FILES = new Set(PUBLIC_FILES);
const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.json': 'application/json', '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
});
const DOWNLOAD_EXTENSIONS = new Set(['.pdf', '.docx', '.pptx']);
const ROUTES = new Map([
  ['/', 'index.html'], ['/classroom', 'classroom.html'], ['/classroom/', 'classroom.html'],
  ['/school-it', 'school-it.html'], ['/school-it/', 'school-it.html'],
  ['/secure-reports', 'secure-reports.html'], ['/secure-reports/', 'secure-reports.html'],
  ['/student-workbook', 'student-workbook.html'], ['/practice-quizzes', 'practice-quizzes.html'],
  ['/teacher', 'teacher/index.html'], ['/teacher/', 'teacher/index.html']
]);
const BASE_HEADERS = Object.freeze({
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'
});

export function previewContentType(filename) {
  return MIME_TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream';
}

function requestPath(target) {
  // Inspect the original path before a URL parser could normalize dot segments.
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//')) throw new Error('Invalid request path.');
  const decoded = decodeURIComponent(target.split(/[?#]/, 1)[0]);
  if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith('//')) throw new Error('Invalid request path.');
  const parts = decoded.split('/');
  if (parts.some(part => part === '.' || part === '..')) throw new Error('Invalid request path.');
  return decoded;
}

async function publicFileBytes(sourceRoot, filename) {
  const requestedRoot = path.resolve(sourceRoot);
  const rootInfo = await lstat(requestedRoot);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error('Preview root must be a real directory.');
  const root = await realpath(requestedRoot);
  let target = root;
  const parts = filename.split('/');
  let before;
  for (let index = 0; index < parts.length; index++) {
    target = path.join(target, parts[index]);
    const info = await lstat(target);
    if (info.isSymbolicLink()) throw new Error('Linked preview files are not public.');
    if (index < parts.length - 1) {
      if (!info.isDirectory()) throw new Error('Expected a public directory.');
    } else {
      if (!info.isFile()) throw new Error('Expected a regular public file.');
      before = info;
    }
  }
  if (path.relative(root, await realpath(target)) !== parts.join(path.sep)) throw new Error('Public path changed.');
  const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const current = await handle.stat();
    if (!current.isFile() || current.dev !== before.dev || current.ino !== before.ino) throw new Error('Public file changed while opening.');
    return await handle.readFile();
  } finally { await handle.close(); }
}

async function notFound(req, res, sourceRoot) {
  // Match Pages' top-level 404 without reflecting untrusted paths or publishing
  // private files. Keep a plain fallback if the reviewed error page is absent.
  let body;
  let type = 'text/html; charset=utf-8';
  try { body = await publicFileBytes(sourceRoot, '404.html'); }
  catch { body = Buffer.from('Not found'); type = 'text/plain; charset=utf-8'; }
  res.writeHead(404, { ...BASE_HEADERS, 'Content-Type': type, 'Content-Length': body.length });
  res.end(req.method === 'HEAD' ? undefined : body);
}

export function createPreviewServer({ sourceRoot = PROJECT_ROOT } = {}) {
  assertPublicCurriculumPaths(PUBLIC_FILES);
  return http.createServer(async (req, res) => {
    let pathname;
    try { pathname = requestPath(req.url); }
    catch { res.writeHead(403, BASE_HEADERS); res.end('Forbidden'); return; }
    // Local preview intentionally has no student database or identity service.
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      res.writeHead(503, { ...BASE_HEADERS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ enabled: false, error: 'classroom_unconfigured', message: 'Connected classrooms are not configured. Independent labs remain available.' }));
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { ...BASE_HEADERS, Allow: 'GET, HEAD' }); res.end('Method not allowed'); return;
    }
    const filename = ROUTES.get(pathname) || pathname.slice(1);
    // Preview the same reviewed files as production, never the checkout root.
    if (!FILES.has(filename)) { await notFound(req, res, sourceRoot); return; }
    try {
      const body = await publicFileBytes(sourceRoot, filename);
      const headers = { ...BASE_HEADERS, 'Content-Type': previewContentType(filename), 'Content-Length': body.length };
      if (DOWNLOAD_EXTENSIONS.has(path.extname(filename).toLowerCase())) {
        headers['Content-Disposition'] = `attachment; filename="${path.basename(filename).replaceAll(/["\\]/g, '_')}"`;
      }
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { await notFound(req, res, sourceRoot); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 2) {
    console.error('Preview accepts no path or host arguments.'); process.exitCode = 1;
  } else {
    const server = createPreviewServer();
    server.listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
  }
}
