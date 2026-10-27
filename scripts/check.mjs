import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

let failed = false;
async function check(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${item.name}`;
    if (item.isDirectory()) { await check(path); continue; }
    if (!/\.(ts|mjs)$/.test(path)) continue;
    const source = await readFile(path, 'utf8');
    const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
    if (result.status !== 0) { console.error(result.stderr); failed = true; }
    const unfinished = new RegExp('\\b(?:TO' + 'DO|FIX' + 'ME)\\b');
    if (/\b(?:gsk_|sk-proj-)[a-zA-Z0-9_-]{15,}/.test(source) || unfinished.test(source)) {
      console.error(`${path}: secret ou marqueur inachevé détecté`); failed = true;
    }
    if (path.startsWith('src/') && /\bconsole\./.test(source)) {
      console.error(`${path}: journal interdit dans le moteur IA`); failed = true;
    }
  }
}
for (const dir of ['src', 'tests', 'scripts']) await check(dir);
if (failed) process.exitCode = 1;
else console.log('Syntaxe, absence de secrets dans les sources et règles locales : OK');
