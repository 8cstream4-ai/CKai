export type MarkdownBlock =
  | { type: 'paragraph' | 'quote'; text: string }
  | { type: 'heading'; text: string; level: number }
  | { type: 'code'; text: string; language: string }
  | { type: 'list'; items: string[]; ordered: boolean };

/** Small safe renderer AST for the native test app. No HTML evaluation. */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let index = 0;
  const special = (line: string) => /^\s*```|^#{1,3}\s|^>\s?|^\s*(?:[-*]|\d+\.)\s/.test(line);
  while (index < lines.length) {
    const line = lines[index]!;
    if (!line.trim()) { index++; continue; }
    const code = /^\s*```(.*)$/.exec(line);
    if (code) {
      const content: string[] = []; index++;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index]!)) content.push(lines[index++]!);
      if (index < lines.length) index++;
      blocks.push({ type: 'code', text: content.join('\n'), language: code[1]?.trim() ?? '' }); continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) { blocks.push({ type: 'heading', text: heading[2]!, level: heading[1]!.length }); index++; continue; }
    if (/^>/.test(line)) {
      const content: string[] = [];
      while (index < lines.length && /^>/.test(lines[index]!)) content.push(lines[index++]!.replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: content.join('\n') }); continue;
    }
    const listItem = /^\s*([-*]|\d+\.)\s+(.+)$/.exec(line);
    if (listItem) {
      const ordered = /^\d/.test(listItem[1]!); const items: string[] = [];
      while (index < lines.length) {
        const item = /^\s*([-*]|\d+\.)\s+(.+)$/.exec(lines[index]!);
        if (!item || /^\d/.test(item[1]!) !== ordered) break;
        items.push(item[2]!); index++;
      }
      blocks.push({ type: 'list', items, ordered }); continue;
    }
    const content = [line]; index++;
    while (index < lines.length && lines[index]!.trim() && !special(lines[index]!)) content.push(lines[index++]!);
    blocks.push({ type: 'paragraph', text: content.join('\n') });
  }
  return blocks;
}

/** Cache completed blocks; only the open tail is reparsed during append-only streaming. */
export class MarkdownStreamParser {
  private source = ''; private stableEnd = 0; private stable: MarkdownBlock[] = [];
  update(source: string): MarkdownBlock[] {
    if (!source.startsWith(this.source)) { this.stableEnd = 0; this.stable = []; }
    this.source = source;
    let fenced = false; let end = this.stableEnd; let offset = this.stableEnd;
    const tail = source.slice(this.stableEnd);
    const lines = tail.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    for (const line of lines) {
      if (/^\s*```/.test(line)) fenced = !fenced;
      offset += line.length;
      if (!fenced && /^\s*\n$/.test(line) && offset < source.length) end = offset;
    }
    if (end > this.stableEnd) { this.stable.push(...parseMarkdown(source.slice(this.stableEnd, end))); this.stableEnd = end; }
    return [...this.stable, ...parseMarkdown(source.slice(this.stableEnd))];
  }
}
