import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files = [];
async function scan(folder) {
  for (const entry of await readdir(folder, {withFileTypes:true})) {
    const file = `${folder}/${entry.name}`;
    if (entry.isDirectory()) await scan(file);
    else if (/\.m?js$/.test(entry.name)) files.push(file);
  }
}
await scan('src'); await scan('functions'); await scan('scripts');
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {stdio:'inherit'});
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checked ${files.length} application and server modules.`);
