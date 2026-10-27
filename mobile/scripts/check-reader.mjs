import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { html } = JSON.parse(await readFile(new URL('../_private/reader.json', import.meta.url), 'utf8'));
const fixtures = JSON.parse(await readFile(new URL('../tests/reader-fixtures.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.abort());
  await page.setContent(html.replace('<head>', '<head><script>window.__results=[];window.ReactNativeWebView={postMessage:x=>window.__results.push(JSON.parse(x))};</script>'));
  await page.waitForFunction(() => window.__results.some(item => item.ready), { timeout: 30000 });
  for (const type of ['pdf','docx','xlsx']) {
    const id = `fixture-${type}`;
    await page.evaluate(payload => window.ckaiRead(payload), { id, type, data: fixtures[type] });
    const result = await page.evaluate(id => window.__results.find(item => item.id === id), id);
    assert.ok(result && !result.error, `${type}: ${result?.error ?? errors.join('; ')}`);
    assert.match(result.text, new RegExp(`CKai ${type.toUpperCase()} test`)); assert.match(result.text, /42/);
    console.log(`Lecture réelle ${type.toUpperCase()} hors ligne : OK`);
  }
  await page.evaluate(() => window.ckaiRead({ id: 'broken', type: 'pdf', data: btoa('not a PDF') }));
  assert.ok(await page.evaluate(() => window.__results.find(item => item.id === 'broken')?.error));
  console.log('Fichier PDF corrompu : erreur gérée.');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
