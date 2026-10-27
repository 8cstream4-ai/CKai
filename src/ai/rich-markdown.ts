import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remend from 'remend';
export interface MarkdownNode {
  type: string; value?: string; children?: MarkdownNode[]; depth?: number; ordered?: boolean; start?: number | null;
  checked?: boolean | null; url?: string; title?: string | null; alt?: string | null; identifier?: string;
  lang?: string | null; align?: (string | null)[]; position?: { start: { offset?: number }; end: { offset?: number } };
}
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

/** Preserve code verbatim; repair the typography of prose only. */
export function normalizeMarkdown(source: string): string {
  let fenced = false; let fence = '';
  return source.replace(/\r\n?/g, '\n').split('\n').map(line => {
    const match = /^\s*(`{3,}|~{3,})/.exec(line);
    if (match) { if (!fenced) { fenced = true; fence = match[1]![0]!; } else if (match[1]![0] === fence) fenced = false; return line; }
    if (fenced) return line;
    // Inline code is protected from formatting repairs too.
    return line.split(/(`+[^`]*`+)/g).map((part, index) => index % 2 ? part : part
      .replace(/[\u200B\uFEFF\u202A-\u202E\u2066-\u2069]/g, '').replace(/\u00A0/g, ' ')
      .replace(/\\\*\\\*([^\n]+?)\\\*\\\*/g, '**$1**')
      .replace(/\*\*\*([^\n]*?)\*\*\*/g, (_, body: string) => `***${body.trim()}***`)
      .replace(/\*\*([^\n]*?)\*\*/g, (_, body: string) => `**${body.trim()}**`)
      .replace(/(^|[\s(«])(\*{1,3})[ \t]+(?=\S)/g, '$1$2')
      .replace(/(^|\s)\*[ \t]+([^*\n]+?)[ \t]+\*(?=\s|[.,;:!?]|$)/g, '$1*$2*')
      .replace(/^(\s*)[•*]\s+/, '$1- ')).join('');
  }).join('\n');
}
function cleanText(value: string): string {
  // Formatting tokens left unmatched by a streamed or malformed response never become UI text.
  return value.replace(/[`*#]/g, '').replace(/(^|\s)~{1,2}/g, '$1').replace(/~{1,2}(?=\s|$)/g, '');
}
function clean(node: MarkdownNode, active: boolean, definitions: Map<string, MarkdownNode>): MarkdownNode | null {
  if (node.type === 'html' || node.type === 'definition') return null;
  if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'math' || node.type === 'inlineMath') return node;
  if (node.type === 'text') return { ...node, value: cleanText(node.value ?? '') };
  if (['linkReference', 'imageReference'].includes(node.type)) {
    const definition = definitions.get(node.identifier?.toLowerCase() ?? '');
    if (definition?.url) return clean({ ...node, type: node.type === 'linkReference' ? 'link' : 'image', url: definition.url }, active, definitions);
    return { type: 'text', value: node.alt ?? node.children?.map(child => child.value ?? '').join('') ?? '' };
  }
  if (node.type === 'paragraph' && active) {
    const value = (node.children ?? []).map(child => child.value ?? '').join('');
    if (/^\s*\|/.test(value)) return { type: 'skeleton' };
  }
  return { ...node, ...(node.children ? { children: node.children.map(child => clean(child, active, definitions)).filter((child): child is MarkdownNode => !!child) } : {}) };
}
export function parseRichMarkdown(source: string, active = false): MarkdownNode[] {
  const normalized = normalizeMarkdown(source);
  // Repair final malformed Markdown as well: the model can stop before closing a delimiter.
  const repaired = remend(normalized, { linkMode: 'text-only', inlineKatex: true });
  const root = processor.parse(repaired) as unknown as MarkdownNode;
  const definitions = new Map((root.children ?? []).filter(node => node.type === 'definition').map(node => [node.identifier?.toLowerCase() ?? '', node]));
  return (root.children ?? []).map(node => clean(node, active, definitions)).filter((node): node is MarkdownNode => !!node);
}
export function renderedText(nodes: MarkdownNode[], skipCode = false): string {
  return nodes.map(node => skipCode && ['code','inlineCode','math','inlineMath'].includes(node.type) ? '' : node.value ?? (node.children ? renderedText(node.children, skipCode) : node.alt ?? '')).join('');
}

/** Reuse completed AST nodes for native memoization while reparsing the open response. */
export class RichMarkdownCache {
  private previous = new Map<string, MarkdownNode>();
  parse(source: string, active: boolean): MarkdownNode[] {
    const next = new Map<string, MarkdownNode>();
    const nodes = parseRichMarkdown(source, active).map(node => {
      const key = JSON.stringify(node); const cached = this.previous.get(key) ?? node; next.set(key, cached); return cached;
    }); this.previous = next; return nodes;
  }
}
