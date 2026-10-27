import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modules = new Map();
async function bundle(path) {
  path = resolve(path);
  if (modules.has(path)) return modules.get(path);
  let source = await readFile(path, 'utf8');
  if (extname(path) === '.ts') source = stripTypeScriptTypes(source);
  const imports = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)];
  for (const match of imports) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) throw new Error('Only local browser modules are supported');
    const url = await bundle(resolve(dirname(path), specifier));
    source = source.replaceAll(`'${specifier}'`, `'${url}'`).replaceAll(`"${specifier}"`, `"${url}"`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  modules.set(path, url); return url;
}

export async function buildPreview({ privateTest = false } = {}) {
  const source = await readFile(resolve(root, 'web/index.html'), 'utf8');
  const app = await bundle(resolve(root, 'web/app.mjs'));
  const dir = resolve(root, privateTest ? '.private-preview' : 'dist');
  await mkdir(dir, { recursive: true });
  let bootstrap = '';
  let html = source;
  if (privateTest) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY is required for the private test artifact');
    const icon = `data:image/png;base64,${(await readFile(resolve(root, 'assets/icon.png'))).toString('base64')}`;
    // User explicitly requested a preconfigured local test. Never publish this artifact.
    bootstrap = `globalThis.__CKAI_KEY__=${JSON.stringify(key).replaceAll('<', '\\u003c')};\n`
      + `document.querySelectorAll('[data-ckai-icon]').forEach(e=>{e[e.tagName==='LINK'?'href':'src']=${JSON.stringify(icon)}});`;
    html = html.replaceAll('"__ICON__"', '"" data-ckai-icon');
  } else {
    html = html.replaceAll('__ICON__', '/icon.png');
    await writeFile(resolve(dir, 'icon.png'), await readFile(resolve(root, 'assets/icon.png')));
  }
  html = html.replace('__BOOTSTRAP__', bootstrap)
    .replace('__APPLICATION__', `import ${JSON.stringify(app)};`);
  const output = resolve(dir, privateTest ? 'CKai-test.html' : 'index.html');
  await writeFile(output, html, { mode: privateTest ? 0o600 : 0o644 });
  return output;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(await buildPreview({ privateTest: process.argv.includes('--private-test') }));
}
