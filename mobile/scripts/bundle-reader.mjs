import { build } from 'esbuild';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = async (entry, globalName) => (await build({ entryPoints: [resolve(root, entry)], absWorkingDir: root, bundle: true, write: false, platform: 'browser', format: 'iife', globalName, minify: true, target: 'chrome110' })).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const worker = await bundle('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', 'pdfjsWorker');
const reader = await bundle('browser/reader.js', 'CKaiReader');
const html = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:; style-src 'unsafe-inline';"></head><body><script>${worker}</script><script>${reader}</script></body></html>`;
await mkdir(resolve(root, '_private'), { recursive: true });
await writeFile(resolve(root, '_private/reader.json'), JSON.stringify({ html }));
console.log('Lecteur PDF, DOCX et tableurs préparé hors ligne.');

const fontBuffers = new Map();
const { readdir } = await import('node:fs/promises');
for (const file of await readdir(resolve(root, 'node_modules/katex/dist/fonts'))) if (file.endsWith('.woff2')) fontBuffers.set('fonts/' + file, await readFile(resolve(root, 'node_modules/katex/dist/fonts', file)));
const css = (await readFile(resolve(root, 'node_modules/katex/dist/katex.min.css'), 'utf8')).replace(/src:([^}]+)/g, (declaration, sources) => {
  const font = /url\((?:["']?)(fonts\/[^)"']+\.woff2)(?:["']?)\)/.exec(sources);
  return font ? `src:url(data:font/woff2;base64,${Buffer.from(fontBuffers.get(font[1])).toString('base64')}) format('woff2')` : declaration;
});
await writeFile(resolve(root, '_private/math.json'), JSON.stringify({ css }));
