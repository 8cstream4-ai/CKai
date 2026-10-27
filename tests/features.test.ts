import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationContext } from '../src/ai/context.ts';
import { parseMarkdown } from '../src/ai/markdown.ts';

test('contexte : conserve le dernier échange et laisse l’historique intact', () => {
  const input = [
    { role: 'user' as const, content: 'ancien' },
    { role: 'assistant' as const, content: 'ancienne réponse très longue' },
    { role: 'user' as const, content: 'question' },
  ];
  const original = structuredClone(input);
  assert.deepEqual(conversationContext(input, 12), [{ role: 'user', content: 'question' }]);
  assert.deepEqual(input, original);
});
test('contexte : retire une réponse orpheline au début de la fenêtre', () => {
  assert.deepEqual(conversationContext([
    { role: 'assistant', content: 'réponse' }, { role: 'user', content: 'question' },
  ]), [{ role: 'user', content: 'question' }]);
});
test('contexte : ignore les réponses vides après une erreur réseau', () => {
  assert.deepEqual(conversationContext([
    { role: 'user', content: 'Bonjour' }, { role: 'assistant', content: '' },
  ]), [{ role: 'user', content: 'Bonjour' }]);
});
test('contexte : ne tronque pas silencieusement une question trop longue', () => {
  assert.throws(() => conversationContext([{ role: 'user', content: 'bonjour' }], 2), /too long/);
  assert.throws(() => conversationContext([], 0), /Invalid/);
});
test('Markdown : distingue deux blocs de code et le texte qui les sépare', () => {
  const result = parseMarkdown('Introduction\n\n```js\nconst a = 1;\n```\n\nAprès.\n\n```py\nprint(2)\n```\n\nFin.');
  assert.deepEqual(result, [
    { type: 'paragraph', text: 'Introduction' },
    { type: 'code', text: 'const a = 1;', language: 'js' },
    { type: 'paragraph', text: 'Après.' },
    { type: 'code', text: 'print(2)', language: 'py' },
    { type: 'paragraph', text: 'Fin.' },
  ]);
});
test('Markdown en streaming : un bloc de code ouvert reste du code', () => {
  assert.deepEqual(parseMarkdown('```ts\nlet a ='), [{ type: 'code', text: 'let a =', language: 'ts' }]);
});
test('Markdown : listes, citation et titre sans évaluer du HTML', () => {
  const result = parseMarkdown('# Titre\n- un\n- deux\n\n1. trois\n2. quatre\n\n> citation\n\n<script>alert(1)</script>');
  assert.deepEqual(result, [
    { type: 'heading', text: 'Titre', level: 1 },
    { type: 'list', items: ['un', 'deux'], ordered: false },
    { type: 'list', items: ['trois', 'quatre'], ordered: true },
    { type: 'quote', text: 'citation' },
    { type: 'paragraph', text: '<script>alert(1)</script>' },
  ]);
});
