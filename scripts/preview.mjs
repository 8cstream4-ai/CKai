import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { resolve } from 'node:path';
import { buildPreview } from './build-preview.mjs';

await buildPreview();
const port = Number(process.env.CKAI_PORT || 8080);
const host = process.env.CKAI_HOST || '127.0.0.1';
const server = createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0];
  const origin = `http://${req.headers.host}`;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  if (req.headers.origin && req.headers.origin !== origin) { res.writeHead(403); res.end(); return; }
  if (path === '/api/groq/chat/completions' || path === '/api/groq/models') {
    if (!process.env.GROQ_API_KEY) { res.writeHead(401); res.end(); return; }
    const expected = path.endsWith('models') ? 'GET' : 'POST';
    if (req.method !== expected) { res.writeHead(405); res.end(); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    res.on('close', () => controller.abort());
    try {
      let body = '';
      if (req.method === 'POST') {
        for await (const chunk of req) {
          body += chunk.toString();
          if (body.length > 400_000) { res.writeHead(413); res.end(); return; }
        }
        let data;
        try { data = JSON.parse(body); } catch { res.writeHead(400); res.end(); return; }
        if (!['openai/gpt-oss-20b', 'openai/gpt-oss-120b'].includes(data.model)
          || data.stream !== true || !Array.isArray(data.messages) || data.max_completion_tokens > 4096) {
          res.writeHead(400); res.end(); return;
        }
      }
      const response = await fetch(`https://api.groq.com/openai/v1/${path.endsWith('models') ? 'models' : 'chat/completions'}`, {
        method: req.method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        ...(body ? { body } : {}), redirect: 'error', signal: controller.signal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.headers.has('retry-after')) res.setHeader('Retry-After', response.headers.get('retry-after'));
        res.writeHead(response.status); res.end(); return;
      }
      res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') || 'application/json' });
      res.flushHeaders();
      if (response.body) {
        const stream = Readable.fromWeb(response.body);
        await new Promise((resolve, reject) => {
          stream.on('error', reject); res.on('error', reject); res.on('close', resolve); res.on('finish', resolve); stream.pipe(res);
        });
      } else res.end();
    } catch {
      if (!res.headersSent) res.writeHead(503);
      res.end();
    } finally { clearTimeout(timer); }
    return;
  }
  if (req.method !== 'GET' || !['/', '/index.html', '/icon.png'].includes(path)) {
    res.writeHead(404); res.end(); return;
  }
  const filename = path === '/icon.png' ? 'icon.png' : 'index.html';
  try {
    const bytes = await readFile(resolve('dist', filename));
    res.writeHead(200, { 'Content-Type': filename.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8' });
    res.end(bytes);
  } catch { res.writeHead(500); res.end(); }
});
server.listen(port, host, () => console.log(`CKai : http://${host}:${port}`));
process.on('SIGINT', () => server.close());
process.on('SIGTERM', () => server.close());
