import { constants } from 'node:fs';
import { lstat, mkdir, mkdtemp, open, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPublicCurriculumPaths } from './curriculum-policy.mjs';

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));

// A new public file needs an explicit review here. Never publish the checkout root.
export const PUBLIC_FILES = Object.freeze([
  'index.html', '404.html', 'classroom.html', 'school-it.html', 'secure-reports.html', 'teacher/index.html', 'student-workbook.html', 'practice-quizzes.html',
  '_headers', '_routes.json', '_redirects', 'robots.txt', 'sitemap.xml',
  'assets/favicon.svg', 'assets/cole-learning-labs-logo.png', 'assets/cole-learning-labs-logo-dark.png',
  'assets/cole-learning-labs-student-workbook.pdf', 'assets/cole-learning-labs-pop-quizzes.pdf',
  'src/assembly-model.js', 'src/assembly-tools.js', 'src/assembly-cables.js', 'src/assembly-workbench.js', 'src/workbench-guidance.js', 'src/pc-activity.js', 'src/assembly.css',
  'src/foundation-model.js', 'src/foundation-labs.js', 'src/foundation-scene.js', 'src/foundations.css',
  'src/teaching.js', 'src/teaching.css', 'src/experiments.js', 'src/experiments.css', 'src/learning-tools.js', 'src/capstone.js', 'src/capstone.css',
  'src/app.js', 'src/lab-tutorial.js', 'src/coding-sandbox.js', 'src/standards.js', 'src/lab-language.js', 'src/requester-persona.js', 'src/requester-library.js', 'src/requester-chat.js', 'src/requester-topics.js', 'src/requester-config.js', 'src/classroom-client.js', 'src/classroom-portal.js', 'src/hardware.js', 'src/workbench-interactions.js',
  'src/privacy.js', 'src/interview.js', 'src/conversation.js', 'src/records.js', 'src/scenarios.js', 'src/workspaces.js', 'src/workspace-accessibility.js',
  'src/coding-studio.css', 'src/coding-studio.js', 'src/interactive-tools.css', 'src/interactive-tools.js', 'src/network-bench.js', 'src/network-diagrams.js', 'src/network-labs.js', 'src/network-packets.js', 'src/network-studio-model.js', 'src/network-studio.css', 'src/network-studio.js', 'src/network-visuals.css', 'src/network-visuals.js', 'src/practice-workbench.css', 'src/practice-workbench.js',
  'src/learning-activities.js', 'src/learning-activities.css', 'src/ai-activities.js', 'src/ai-activities.css', 'src/security-activities.js', 'src/security-activities.css',
  'src/coding-visuals.js', 'src/coding-visuals.css', 'src/coding-projects.css',
  'src/expanded-labs.js', 'src/expanded-labs.css', 'src/coding-lab.js', 'src/coding-lab.css', 'src/interview.css',
  'src/report-crypto.js', 'src/report-downloads.js', 'src/secure-reports.js', 'src/local-work.js', 'src/work-controls.js',
  'src/secure-reports.css', 'src/accessibility.css',
  'src/classroom-portal.css', 'src/hardware.css', 'src/school.css', 'src/styles.css', 'src/workspaces.css'
]);
const FILES = new Set(PUBLIC_FILES);
const PUBLIC_DIRECTORIES = ['assets', 'src', 'teacher'];

async function directoryOnly(filename) {
  const info = await lstat(filename);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`Expected a real directory: ${filename}`);
}

async function validatePublicTree(root, relative) {
  const directory = path.join(root, relative);
  await directoryOnly(directory);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = `${relative}/${entry.name}`;
    const info = await lstat(path.join(root, filename));
    if (info.isSymbolicLink()) throw new Error(`Symbolic links cannot be published: ${filename}`);
    if (!info.isFile() || !FILES.has(filename)) throw new Error(`Unapproved public file or directory: ${filename}`);
  }
}

async function sourceBytes(root, filename) {
  const target = path.join(root, filename);
  const before = await lstat(target);
  if (before.isSymbolicLink() || !before.isFile()) throw new Error(`Expected a regular public file: ${filename}`);
  const resolved = await realpath(target);
  if (path.relative(root, resolved) !== filename.split('/').join(path.sep)) throw new Error(`Public file resolves outside its approved path: ${filename}`);
  const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const current = await handle.stat();
    if (!current.isFile() || current.dev !== before.dev || current.ino !== before.ino) throw new Error(`Public file changed while being read: ${filename}`);
    return await handle.readFile();
  } finally { await handle.close(); }
}

// Check the exact resolved workspace target and reject junctions/links before removal.
async function safeBuildDirectory(root, directory, prefix) {
  if (path.dirname(directory) !== root || !path.basename(directory).startsWith(prefix)) throw new Error('Build directory escaped the project root.');
  let info;
  try { info = await lstat(directory); } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  if (info.isSymbolicLink() || !info.isDirectory() || await realpath(directory) !== directory) throw new Error('Build output must be a real directory inside the project root.');
  async function inspect(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const filename = path.join(folder, entry.name), item = await lstat(filename);
      if (item.isSymbolicLink()) throw new Error('Build output contains a symbolic link; it was not removed.');
      if (item.isDirectory()) await inspect(filename);
      else if (!item.isFile()) throw new Error('Build output contains a nonregular entry; it was not removed.');
    }
  }
  await inspect(directory);
  return true;
}

export async function buildSite({ sourceRoot = PROJECT_ROOT } = {}) {
  // Even an accidentally approved manifest entry cannot publish a private-named
  // curriculum resource. Content review remains necessary for every new asset.
  assertPublicCurriculumPaths(PUBLIC_FILES);
  const requested = path.resolve(sourceRoot);
  await directoryOnly(requested);
  const root = await realpath(requested);
  const output = path.join(root, 'dist');
  for (const directory of PUBLIC_DIRECTORIES) await validatePublicTree(root, directory);
  const content = new Map();
  for (const filename of PUBLIC_FILES) content.set(filename, await sourceBytes(root, filename));
  const routes = JSON.parse(content.get('_routes.json').toString('utf8'));
  if (JSON.stringify(routes) !== JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] })) throw new Error('Only the reviewed /api/* Functions route may be published.');
  await safeBuildDirectory(root, output, 'dist');

  let staging = await mkdtemp(path.join(root, '.publish-stage-'));
  try {
    for (const [filename, bytes] of content) {
      const target = path.join(staging, filename);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes, { flag: 'wx' });
    }
    // Sources and staging are complete before replacing a previous generated output.
    if (await safeBuildDirectory(root, output, 'dist')) await rm(output, { recursive: true });
    await rename(staging, output);
    staging = null;
    return { directory: output, files: [...PUBLIC_FILES] };
  } finally {
    if (staging && await safeBuildDirectory(root, staging, '.publish-stage-')) await rm(staging, { recursive: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 2) throw new Error('This build accepts no destination arguments.');
    const result = await buildSite();
    console.log(`Prepared ${result.files.length} reviewed public files in dist. Pages Functions remain in root/functions.`);
  } catch (error) {
    console.error(`Build refused: ${error.message}`);
    process.exitCode = 1;
  }
}
