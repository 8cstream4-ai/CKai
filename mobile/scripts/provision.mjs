import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../_private');
await mkdir(dir, { recursive: true });
const destination = resolve(dir, 'bootstrap.json');
if (process.env.GROQ_API_KEY?.trim()) {
  await writeFile(destination, JSON.stringify({ groq: process.env.GROQ_API_KEY.trim() }), { mode: 0o600 });
} else {
  try { await access(destination); } catch {
    await writeFile(destination, JSON.stringify({ groq: '' }), { mode: 0o600 });
  }
}
console.log('Configuration privée préparée, sans affichage de la clé.');
