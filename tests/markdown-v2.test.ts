import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeMarkdown, parseRichMarkdown, renderedText, type MarkdownNode } from '../src/ai/rich-markdown.ts';
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/markdown-fr.json',import.meta.url),'utf8')) as { name: string; source: string; expected: string }[];
assert.ok(fixtures.length >= 40);
for (const fixture of fixtures) {
  test(`Markdown FR : ${fixture.name}`, () => {
    const nodes = parseRichMarkdown(fixture.source);
    const text = renderedText(nodes,true);
    assert.doesNotMatch(text, /[*#`]/, fixture.source);
    if (fixture.expected) assert.ok(text.includes(fixture.expected), JSON.stringify({ source: fixture.source, text, nodes }));
    for (const chunkSize of [1,2,3,4,5]) for (let length=1;length<=fixture.source.length;length+=chunkSize) {
      const partial = renderedText(parseRichMarkdown(fixture.source.slice(0,length),true),true);
      assert.doesNotMatch(partial,/[*#`]/, `fragment ${length}, taille ${chunkSize}`);
    }
  });
}
test('Markdown : le contenu du code reste intact', () => {
  const code='```ts\nconst x = "**#*`";\n```';
  assert.equal(parseRichMarkdown(code)[0]?.value, 'const x = "**#*`";');
  assert.equal(normalizeMarkdown(code),code);
});
test('Markdown : listes, tâches, tables et styles forment des nœuds sémantiques', () => {
  const tree=parseRichMarkdown('- **Important**\n  - *Détail*\n\n| A | B |\n|---|---|\n| 1 | 2 |');
  const types:string[]=[];const walk=(nodes:MarkdownNode[])=>nodes.forEach(node=>{types.push(node.type);if(node.children)walk(node.children);});walk(tree);
  for(const type of ['list','strong','emphasis','table'])assert.ok(types.includes(type),type);
});
