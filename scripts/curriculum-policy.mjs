import { spawnSync } from 'node:child_process';
import { lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const PRIVATE_BASENAME = /answer[-_ .]*keys?|worked[-_ .]*reports?|instructor[-_ .]*guides?|speaking[-_ .]*scripts?/i;
const PRIVATE_DIRECTORY = /^(?:private|privatecurriculum|privateteachermaterials|privateassessments?|privateeducatormaterials|teacher(?:rubrics?|materials|bundle|answerkeys?)|instructorbundle)$/;
const GENERATED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'coverage', '.wrangler']);

// A filename gate is an additional safeguard, not a review of document contents.
// Public documents still need a human review for solutions and student information.
export function curriculumPathIssue(filename) {
  if (typeof filename !== 'string' || !filename || /[\u0000-\u001f\u007f]/.test(filename)) return 'invalid repository path';
  const normalized = filename.replaceAll('\\', '/').normalize('NFKC');
  const parts = normalized.split('/');
  if (/^(?:\/|[a-z]:)/i.test(normalized) || parts.some(part => !part || part === '.' || part === '..')) return 'invalid repository path';
  const basename = parts.at(-1);
  if (/\.zip$/i.test(basename)) return 'unreviewed curriculum archive';
  if (parts.some(part => PRIVATE_BASENAME.test(part))) return 'private assessment or instructor material';
  // This single public demo is intentionally shipped; an imported Teacher/ tree is not.
  if (normalized === 'teacher/index.html') return null;
  for (const directory of parts.slice(0, -1)) {
    if (directory.toLowerCase() === 'teacher') return 'imported teacher curriculum directory';
    if (PRIVATE_DIRECTORY.test(directory.toLowerCase().replaceAll(/[-_ .]/g, ''))) return 'private curriculum directory';
  }
  return null;
}

export function assertPublicCurriculumPaths(filenames) {
  const violations = [];
  for (const filename of filenames) {
    const issue = curriculumPathIssue(filename);
    if (issue) violations.push(`${JSON.stringify(filename)} (${issue})`);
  }
  if (violations.length) throw new Error(`Private curriculum cannot enter the public repository or publish manifest:\n${violations.join('\n')}`);
}

async function snapshotFiles(root, relative = '') {
  const filenames = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const filename = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!relative && (GENERATED_DIRECTORIES.has(entry.name) || entry.name.startsWith('.publish-stage-'))) continue;
      filenames.push(...await snapshotFiles(root, filename));
    } else filenames.push(filename);
  }
  return filenames;
}

export async function auditCurriculumRepository({ sourceRoot = PROJECT_ROOT } = {}) {
  const root = path.resolve(sourceRoot);
  let hasGitMetadata = false;
  try { await lstat(path.join(root, '.git')); hasGitMetadata = true; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  let filenames;
  if (hasGitMetadata) {
    // --cached also catches ignored files added with git add --force. Do not use
    // gitignore as the source of truth for what is already tracked.
    const result = spawnSync('git', ['-C', root, 'ls-files', '--cached', '--full-name', '-z'], {
      encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true
    });
    if (result.error || result.status !== 0) throw new Error('Cannot inspect tracked curriculum paths; repository audit refused.');
    filenames = result.stdout.split('\0').filter(Boolean);
  } else {
    // Downloaded source snapshots have no Git index; inspect their source tree.
    // Generated output is covered separately by the strict build manifest.
    filenames = await snapshotFiles(root);
  }
  assertPublicCurriculumPaths(filenames);
  return { files: filenames.length, mode: hasGitMetadata ? 'tracked' : 'snapshot' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 2) throw new Error('The curriculum audit accepts no path arguments.');
    const result = await auditCurriculumRepository();
    console.log(`Curriculum path policy checked ${result.files} ${result.mode} files. Document contents still require review.`);
  } catch (error) {
    console.error(`Curriculum audit refused: ${error.message}`);
    process.exitCode = 1;
  }
}
