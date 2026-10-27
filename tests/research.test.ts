import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedText, normalizeSources, publicURL, research, createResearchTools } from '../src/ai/research.ts';
import { documentExcerpts } from '../src/ai/documents.ts';
import { MarkdownStreamParser, parseMarkdown } from '../src/ai/markdown.ts';

test('sources : déduplique les URL et rejette les adresses privées et les schémas actifs', () => {
  for (const value of ['http://example.org','https://127.0.0.1','https://10.2.2.2','https://[::1]','https://user:pass@example.org','javascript:alert(1)','https://example.local','https://2130706433']) assert.equal(publicURL(value), null, value);
  assert.deepEqual(normalizeSources([{ url: 'https://example.org/a#x', title: 'A' }, { url: 'https://example.org/a', title: 'doublon' }, { url: 'file:///etc/passwd' }, { url: 'https://example.org/b', content: 'Extrait réel' }]).map(s => [s.id,s.url]), [[1,'https://example.org/a'],[2,'https://example.org/b']]);
});
test('recherche Groq : impose un vrai browser_search, sans transformer les liens du modèle en sources vérifiées', async () => {
  let body: Record<string, unknown> = {};
  const result = await research('Actualités', { groqKey: 'test', signal: new AbortController().signal,
    fetch: (async (url, init) => { assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions'); body = JSON.parse(String(init?.body)); return Response.json({ choices: [{ message: { content: 'Consulte https://invented.example/.' } }] }); }) as typeof fetch });
  assert.deepEqual(body.tools, [{ type: 'browser_search' }]); assert.equal(body.tool_choice, 'required'); assert.equal(body.stream, false); assert.deepEqual(result.sources, []);
});
test('recherche Tavily : seules les sources réellement retournées deviennent des citations', async () => {
  const result = await research('Question', { groqKey: '', tavilyKey: 'test', signal: new AbortController().signal,
    fetch: (async (url, init) => { assert.equal(url, 'https://api.tavily.com/search'); assert.equal(JSON.parse(String(init?.body)).include_answer, false); return Response.json({ results: [{ title: 'Une source', url: 'https://example.org/article', content: 'Un extrait' }] }); }) as typeof fetch });
  assert.equal(result.sources[0]?.snippet, 'Un extrait'); assert.match(result.text, /\[1\]/);
});
test('recherche : un quota ne devient pas une fausse réponse générée', async () => {
  await assert.rejects(research('Question', { groqKey: 'test', signal: new AbortController().signal, fetch: (async () => new Response('sensitive body', { status: 429 })) as typeof fetch }), /Quota/);
});
test('lecture web : borne les octets et ferme le flux', async () => {
  let cancelled = false;
  const body = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('trop long')); }, cancel() { cancelled = true; } });
  await assert.rejects(boundedText(new Response(body), 3), /volumineux/); assert.equal(cancelled, true);
});
test('outil de recherche : reprend les identifiants globaux de la conversation', async () => {
  const tools = createResearchTools({ fetch, search: async () => ({ text: 'extrait', provider: 'tavily', sources: normalizeSources([{ url: 'https://example.org' }]) }),
    onImages() {}, onSources: sources => sources.map(source => ({ ...source, id: 4 })) });
  const result = await tools.web_search!.execute({ query: 'question' }, new AbortController().signal) as { sources: { id: number }[] };
  assert.equal(result.sources[0]?.id, 4);
});
test('contexte documentaire : retrouve un passage pertinent loin du début et signale la sélection', () => {
  const text = 'Introduction sans lien. '.repeat(2000) + 'Le contrat prévoit un remboursement intégral sous trente jours.';
  const result = documentExcerpts(text, 'Quel remboursement prévoit le contrat ?', 6000);
  assert.match(result, /remboursement intégral/); assert.match(result, /Extraits sélectionnés/); assert.ok(result.length < 6000);
});
test('Markdown incrémental : même AST que le parseur complet à chaque caractère, y compris les clôtures de code', () => {
  const parser = new MarkdownStreamParser(); const text = '# Titre\n\nUn texte.\n\n```ts\nlet a = 1;\n\nlet b = 2;\n```\n\n- Un\n- Deux\n\nFin.';
  for (let i = 0; i <= text.length; i++) assert.deepEqual(parser.update(text.slice(0, i)), parseMarkdown(text.slice(0, i)), `position ${i}`);
  assert.deepEqual(parser.update('Autre réponse'), parseMarkdown('Autre réponse'));
});

test('Markdown : les images sont intercalées avec le texte et ne sont jamais évaluées en HTML', () => {
  assert.deepEqual(parseMarkdown('Avant ![Montagne](https://example.org/image.jpg) après'), [
    { type: 'paragraph', text: 'Avant ' }, { type: 'image', alt: 'Montagne', url: 'https://example.org/image.jpg' }, { type: 'paragraph', text: ' après' },
  ]);
  assert.equal(parseMarkdown('![unsafe](javascript:alert(1))')[0]?.type, 'paragraph');
});
