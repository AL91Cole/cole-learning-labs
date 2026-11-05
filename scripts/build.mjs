import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, open, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPublicCurriculumPaths } from './curriculum-policy.mjs';
import { bundleTier } from './tier-bundles.mjs';
import {PUBLIC_LAB_ACCESS,labsAreOpen} from './public-release.mjs';
import {bundlePageStyles,styleBundlePath} from './style-bundles.mjs';

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const PUBLIC_METADATA_FILES = Object.freeze(['.well-known/security.txt']);

// A new public file needs an explicit review here. Never publish the checkout root.
export const PUBLIC_SOURCE_FILES = Object.freeze([
  'src/turnstile-client.js', 'src/receipt-schema.js', 'src/lab-telemetry.js', 'src/receipt-verifier.js', 'src/receipt-verifier.css',
  'index.html', '404.html', 'classroom.html', 'school-it.html', 'ai-use-notice.html', 'secure-reports.html', 'compliance.html', 'verify.html', 'teacher/index.html', 'student-workbook.html', 'practice-quizzes.html',
  'manifest.webmanifest', 'sw.js', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png', 'assets/apple-touch-icon.png',
  '_headers', '_routes.json', '_redirects', 'robots.txt', 'sitemap.xml',
  'assets/favicon.svg', 'assets/cole-learning-labs-logo.png', 'assets/cole-learning-labs-logo-dark.png', 'assets/cole-learning-labs-logo.webp', 'assets/cole-learning-labs-logo-dark.webp', 'assets/cole-learning-labs-social.png',
  'assets/cole-learning-labs-student-workbook.pdf', 'assets/cole-learning-labs-pop-quizzes.pdf',
  'src/assembly-model.js', 'src/assembly-tools.js', 'src/assembly-cables.js', 'src/assembly-workbench.js', 'src/assembly-builder.js', 'src/workbench-guidance.js', 'src/pc-activity.js', 'src/assembly.css',
  'src/foundation-model.js', 'src/foundation-labs.js', 'src/foundation-scene.js', 'src/foundations.css',
  'src/elementary-labs.js', 'src/elementary-labs.css',
  'src/inbox-defender.js', 'src/inbox-defender.css',
  'src/code-quest-catalog.js', 'src/code-course-model.js', 'src/code-quests.js', 'src/code-quests.css',
  'src/arcade-catalog.js', 'src/arcade-levels.js', 'src/arcade-model.js', 'src/arcade.js', 'src/arcade.css',
  'src/block-workshop.js', 'src/block-workshop.css', 'src/sign-in.js', 'src/sign-in.css',
  'src/teaching.js', 'src/teaching.css', 'src/lesson-plans.js', 'src/lesson-plans.css', 'src/experiments.js', 'src/experiments.css', 'src/learning-tools.js', 'src/capstone.js', 'src/capstone.css', 'src/requester-general.js',
  'src/reach-schema.js', 'src/reach-metrics.js', 'src/activity-guidance.js', 'src/activity-guidance.css', 'src/app.js', 'src/lab-tutorial.js', 'src/coding-sandbox.js', 'src/standards.js', 'src/lab-language.js', 'src/requester-persona.js', 'src/requester-library.js', 'src/requester-chat.js', 'src/requester-topics.js', 'src/requester-config.js', 'src/classroom-client.js', 'src/classroom-portal.js', 'src/hardware.js', 'src/workbench-interactions.js',
  'src/lab-improvements.js', 'src/improvement-schema.js', 'src/improvement-config.js',
  'src/privacy.js', 'src/interview.js', 'src/conversation.js', 'src/records.js', 'src/scenarios.js', 'src/workspaces.js', 'src/workspace-accessibility.js',
  'src/coding-studio.css', 'src/coding-studio.js', 'src/interactive-tools.css', 'src/interactive-tools.js', 'src/network-bench.js', 'src/network-diagrams.js', 'src/network-labs.js', 'src/network-packets.js', 'src/network-studio-model.js', 'src/network-studio.css', 'src/network-studio.js', 'src/network-visuals.css', 'src/network-visuals.js', 'src/practice-workbench.css', 'src/practice-workbench.js',
  'src/learning-activities.js', 'src/learning-activities.css', 'src/ai-activities.js', 'src/ai-activities.css', 'src/security-activities.js', 'src/security-activities.css',
  'src/coding-visuals.js', 'src/coding-visuals.css', 'src/coding-projects.css',
  'src/expanded-labs.js', 'src/expanded-labs.css', 'src/coding-lab.js', 'src/coding-lab.css', 'src/coding-workbench.js', 'src/coding-workbench.css', 'src/interview.css',
  'src/report-crypto.js', 'src/report-downloads.js', 'src/secure-reports.js', 'src/local-work.js', 'src/work-controls.js',
  'src/secure-reports.css', 'src/accessibility.css',
  'src/classroom-portal.css', 'src/hardware.css', 'src/school.css', 'src/styles.css', 'src/workspaces.css',
  'src/access-policy.js', 'src/lab-catalog.js', 'src/owner-preview.js',
  'src/learning-routes.js', 'src/home-entries.js', 'src/sandbox-starters.js', 'src/coding-studio-model.js', 'src/display-menu.js', 'src/read-aloud.js',
  'src/lazy-investigation.js', 'src/lazy-foundation.js', 'src/lazy-arcade.js', 'src/lazy-quests.js', 'src/lazy-inbox.js', 'src/lazy-studios.js', 'src/lazy-sandbox.js', 'src/lazy-teaching.js', 'src/lazy-guide.js', 'src/lazy-privacy.js',
  ...PUBLIC_METADATA_FILES
]);
// Source review does not grant public delivery. The complete member application
// is packaged separately unless the reviewed open-public release explicitly includes it.
// Public disclosure metadata is not a member learning resource.
const PUBLIC_RECEIPT_TOOLS = new Set(['compliance.html','verify.html','src/receipt-verifier.js','src/receipt-verifier.css']);
// The installable-app shell and offline cache belong to the public root site only.
export const PUBLIC_SHELL_FILES = Object.freeze(['manifest.webmanifest','sw.js','assets/icon-192.png','assets/icon-512.png','assets/icon-maskable-512.png','assets/apple-touch-icon.png']);
export const MEMBER_FILES = Object.freeze(PUBLIC_SOURCE_FILES.filter(filename=>!PUBLIC_METADATA_FILES.includes(filename)&&!PUBLIC_RECEIPT_TOOLS.has(filename)&&!PUBLIC_SHELL_FILES.includes(filename)));
const PREVIEW_FILES = Object.freeze([
  'index.html', '404.html', 'school-it.html', 'ai-use-notice.html', 'secure-reports.html', 'compliance.html', 'verify.html',
  '_headers', '_routes.json', '_redirects', 'robots.txt', 'sitemap.xml',
  ...PUBLIC_METADATA_FILES, ...PUBLIC_SHELL_FILES,
  'assets/favicon.svg', 'assets/cole-learning-labs-logo.webp', 'assets/cole-learning-labs-logo-dark.webp', 'assets/cole-learning-labs-social.png',
  'src/app.js', 'src/secure-reports.js', 'src/receipt-verifier.js',
  ...PUBLIC_SOURCE_FILES.filter(filename=>filename.endsWith('.css'))
]);
const OPEN_RESOURCES=Object.freeze(['student-workbook.html','practice-quizzes.html','assets/cole-learning-labs-student-workbook.pdf','assets/cole-learning-labs-pop-quizzes.pdf']);
export const publicFilesFor=access=>{
  const files=[...PREVIEW_FILES,...(labsAreOpen(access)?OPEN_RESOURCES:[])].filter(filename=>!filename.endsWith('.css'));
  return Object.freeze([...files,...files.filter(filename=>filename.endsWith('.html')).map(styleBundlePath)]);
};
export const PUBLIC_FILES=publicFilesFor(PUBLIC_LAB_ACCESS);
const FILES = new Set(PUBLIC_SOURCE_FILES);
const PUBLIC_DIRECTORIES = ['assets', 'src', 'teacher', '.well-known'];

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

/** Files the offline cache stores at install: the home page, its entry script and
 * styles with their exact release queries, every route chunk, the manifest and icons.
 * Downloads, member pages and anything under /api are deliberately absent. */
export function offlinePrecacheList(content){
  const html=content.get('index.html').toString('utf8'),origin='https://reviewed.invalid/';
  const references=[...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"[^>]*>/gu)]
    .filter(([tag])=>/<script\b/u.test(tag)||/rel="(?:stylesheet|manifest|icon|apple-touch-icon)"/u.test(tag))
    .map(([,reference])=>{const url=new URL(reference,origin);if(url.origin!==new URL(origin).origin)throw new Error('Offline cache only covers same-origin files.');return url.pathname+url.search;});
  const chunks=[...content.keys()].filter(filename=>filename.startsWith('src/chunks/')).map(filename=>'/'+filename);
  const list=[...new Set(['/',...references,...chunks,'/assets/cole-learning-labs-logo.webp','/assets/icon-192.png','/assets/icon-512.png','/assets/icon-maskable-512.png'])];
  for(const entry of list){
    const filename=entry==='/'?'index.html':decodeURIComponent(entry.slice(1).split('?')[0]);
    if(!content.has(filename))throw new Error('Offline cache entry is not a published file: '+entry);
    if(/\.pdf$/u.test(filename)||/^(?:classroom|teacher|student-workbook|practice-quizzes)/u.test(filename))throw new Error('Offline cache must not hold downloads or protected pages: '+entry);
  }
  return Object.freeze(list.sort());
}
export function offlineWorkerSource(template,precache){
  if(!template.includes("'cll-static-__CACHE_VERSION__'")||!template.includes('__PRECACHE_MANIFEST__'))throw new Error('Offline worker template is missing its reviewed placeholders.');
  const version=createHash('sha256').update(JSON.stringify(precache)).update(template).digest('hex').slice(0,16);
  return template.replace("'cll-static-__CACHE_VERSION__'",JSON.stringify('cll-static-'+version)).replace('__PRECACHE_MANIFEST__',JSON.stringify(precache));
}

export async function buildSite({ sourceRoot = PROJECT_ROOT, publicLabAccess = PUBLIC_LAB_ACCESS } = {}) {
  // Even an accidentally approved manifest entry cannot publish a private-named
  // curriculum resource. Content review remains necessary for every new asset.
  const openLabs=labsAreOpen(publicLabAccess),publicFiles=publicFilesFor(publicLabAccess);
  assertPublicCurriculumPaths(publicFiles);
  const requested = path.resolve(sourceRoot);
  await directoryOnly(requested);
  const root = await realpath(requested);
  const output = path.join(root, 'dist');
  for (const directory of PUBLIC_DIRECTORIES) await validatePublicTree(root, directory);
  const sources = new Map();
  for (const filename of PUBLIC_SOURCE_FILES) sources.set(filename, await sourceBytes(root, filename));
  const content = new Map(publicFiles.filter(filename=>sources.has(filename)).map(filename=>[filename,sources.get(filename)]));
  for(const filename of publicFiles.filter(filename=>filename.endsWith('.html'))){
    const bundled=await bundlePageStyles(filename,sources.get(filename).toString('utf8'),sources);
    if(!bundled)throw new Error(`Expected reviewed page styles: ${filename}`);
    content.set(filename,Buffer.from(bundled.html));
    content.set(bundled.filename,Buffer.from(bundled.css));
  }
  // An access-mode change gets a new entry URL even when no source imports changed.
  content.set('index.html',Buffer.from(content.get('index.html').toString('utf8').replace(/(src\/app\.js\?release=[A-Za-z0-9_-]+)/u,'$1-'+publicLabAccess)));
  const routes = JSON.parse(content.get('_routes.json').toString('utf8'));
  if (JSON.stringify(routes) !== JSON.stringify({ version: 1, include: ['/api/requester', '/api/reach', '/api/telemetry', '/api/verify'], exclude: [] })) throw new Error('Only the reviewed requester, gated reach, and optional receipt endpoints may invoke API Functions; classroom collection routes must stay excluded.');
  // The main application is split by learning route: the entry module serves the
  // home page and catalog, and each route group downloads when first opened.
  const tier = await bundleTier({sourceRoot:root,member:openLabs,localOnly:openLabs,publicLabsOpen:openLabs,split:true});
  content.set('src/app.js',Buffer.from(tier.javascript));
  const generated=[];
  for(const chunk of tier.chunks){
    if(!/^src\/chunks\/[a-z0-9-]+-[A-Z0-9]+\.js$/u.test(chunk.filename)||content.has(chunk.filename))throw new Error('Unexpected generated route chunk: '+chunk.filename);
    content.set(chunk.filename,Buffer.from(chunk.javascript));generated.push(chunk.filename);
  }
  if(openLabs){const redirects=content.get('_redirects').toString('utf8').split('\n').filter(line=>!/^\/(?:student-workbook|practice-quizzes)(?:[\s/.])/.test(line)).join('\n');content.set('_redirects',Buffer.from(redirects));}
  else content.set('sitemap.xml',Buffer.from(content.get('sitemap.xml').toString('utf8').replace(/\s*<url><loc>https:\/\/www\.colelearninglabs\.com\/(?:student-workbook|practice-quizzes)<\/loc><\/url>/gu,'')));
  // This public privacy tool has no course content; bundle its own reviewed
  // local graph so raw source modules are never an alternate content endpoint.
  const localTool = await bundleTier({sourceRoot:root,member:false,entry:'secure-reports.js'});
  content.set('src/secure-reports.js',Buffer.from(localTool.javascript));
  const verifier = await bundleTier({sourceRoot:root,member:false,entry:'receipt-verifier.js'});
  content.set('src/receipt-verifier.js',Buffer.from(verifier.javascript));
  content.set('sw.js',Buffer.from(offlineWorkerSource(content.get('sw.js').toString('utf8'),offlinePrecacheList(content))));
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
    return { directory: output, files: [...publicFiles], generated: Object.freeze(generated) };
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
