import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { auditCurriculumRepository } from './curriculum-policy.mjs';
const curriculum = await auditCurriculumRepository();
console.log(`Curriculum path policy checked ${curriculum.files} ${curriculum.mode} files. Document contents still require review.`);
const files = [];
async function scan(folder) {
  for (const entry of await readdir(folder, {withFileTypes:true})) {
    const file = `${folder}/${entry.name}`;
    if (entry.isDirectory()) await scan(file);
    else if (/\.m?js$/.test(entry.name)) files.push(file);
  }
}
await scan('src'); await scan('functions'); await scan('scripts');
// The opt-in Docker service is source-only and has its own dependency install.
// Syntax-check its modules without walking generated node_modules or publishing it.
await scan('terminal-sandbox/public');
files.push('terminal-sandbox/server.js');
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {stdio:'inherit'});
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checked ${files.length} application and server modules.`);
