import React, { memo, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, type TextStyle } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import katex from 'katex';
import hljs from 'highlight.js/lib/common';
import { RichMarkdownCache, type MarkdownNode } from '../../src/ai/rich-markdown.ts';
import { publicURL, type Source } from '../../src/ai/research.ts';
import { RevealSpan } from './features/motion';
import { ImageCard } from './features/rich-ui';
import { tokens, type Colors } from './theme';
import mathAssets from '../_private/math.json';

function open(url: string) { const safe = publicURL(url); if (safe) void WebBrowser.openBrowserAsync(safe).catch(() => Alert.alert('Lien', 'Impossible d’ouvrir ce lien.')); }
function citations(value: string, sources: Source[], colors: Colors, active: boolean) {
  const result: React.ReactNode[] = []; let start = 0;
  for (const match of value.matchAll(/\[(\d+)\]/g)) {
    if (match.index > start) result.push(<RevealSpan key={`t${start}`} text={value.slice(start, match.index)} active={active} colors={colors} />);
    const source = sources.find(item => item.id === Number(match[1]));
    result.push(source ? <Text key={`s${match.index}`} accessibilityRole="link" accessibilityLabel={`Source ${source.id}, ${source.title}`} onPress={() => open(source.url)} style={{ color: colors.accent, fontFamily: tokens.font.ui, fontSize: 12, backgroundColor: colors.raised }}> {match[0]} </Text> : <Text key={`s${match.index}`}>{match[0]}</Text>);
    start = match.index + match[0].length;
  }
  result.push(<RevealSpan key={`t${start}`} text={value.slice(start)} active={active} colors={colors} />); return result;
}
function Inline({ nodes, colors, sources, active = false }: { nodes: MarkdownNode[]; colors: Colors; sources: Source[]; active?: boolean }) {
  return <>{nodes.map((node, index) => {
    if (node.type === 'text') return <React.Fragment key={index}>{citations(node.value ?? '', sources, colors, active && index === nodes.length - 1)}</React.Fragment>;
    if (node.type === 'break') return '\n';
    if (node.type === 'inlineCode') return <Text key={index} style={{ fontFamily: tokens.font.mono, color: colors.accent, backgroundColor: colors.raised, fontSize: 14 }}>{node.value}</Text>;
    if (node.type === 'inlineMath') return <Text key={index} style={{ fontFamily: tokens.font.mono, color: colors.accent }}>{node.value?.replace(/\\times/g,'×').replace(/\\cdot/g,'·').replace(/\^2\b/g,'²').replace(/\^3\b/g,'³')}</Text>;
    const style: TextStyle = node.type === 'strong' ? { fontWeight: '700' } : node.type === 'emphasis' ? { fontStyle: 'italic' } : node.type === 'delete' ? { textDecorationLine: 'line-through', color: colors.muted } : node.type === 'link' ? { color: colors.accent, textDecorationLine: 'underline' } : {};
    return <Text key={index} style={style} accessibilityRole={node.type === 'link' ? 'link' : undefined} onPress={node.type === 'link' && node.url ? () => open(node.url!) : undefined}><Inline nodes={node.children ?? []} colors={colors} sources={sources} active={active && index === nodes.length - 1} /></Text>;
  })}</>;
}
const Code = memo(function Code({ value, language, colors }: { value: string; language: string; colors: Colors }) {
  const pieces = useMemo(() => {
    if (!hljs.getLanguage(language) || value.length > 30000) return [{ value, tone: '' }];
    const html = hljs.highlight(value, { language, ignoreIllegals: true }).value;
    const pieces: { value: string; tone: string }[] = []; const stack: string[] = [];
    for (const token of html.split(/(<span class="[^"]*">|<\/span>)/g)) {
      if (token.startsWith('<span')) stack.push(/class="([^"]*)"/.exec(token)?.[1] ?? '');
      else if (token === '</span>') stack.pop();
      else if (token) pieces.push({ value: token.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&'), tone: stack.at(-1) ?? '' });
    } return pieces;
  }, [value, language]);
  return <View style={{ borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, borderBottomWidth: 1, borderColor: colors.line }}><Text style={{ flex: 1, color: colors.muted, fontSize: 11, fontFamily: tokens.font.ui }}>{language || 'Texte'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Copier le code" onPress={() => { void Clipboard.setStringAsync(value).catch(() => {}); }} style={{ paddingHorizontal: 18, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: colors.accent, fontSize: 12 }}>Copier</Text></Pressable></View>
    <ScrollView horizontal contentContainerStyle={{ padding: 18 }}><Text selectable style={{ fontFamily: tokens.font.mono, fontSize: 13, lineHeight: 23, color: colors.ink }}>{pieces.map((piece,index) => <Text key={index} style={{ color: /keyword|built_in/.test(piece.tone) ? colors.accent : /string|attr/.test(piece.tone) ? colors.success : /comment/.test(piece.tone) ? colors.muted : colors.ink }}>{piece.value}</Text>)}</Text></ScrollView>
  </View>;
});
function MathBlock({ value, colors }: { value: string; colors: Colors }) {
  const [height, setHeight] = useState(90);
  const html = useMemo(() => `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${mathAssets.css}body{margin:0;padding:14px 0;color:${colors.ink};background:transparent;overflow-x:auto}.katex-display{margin:0}</style></head><body>${katex.renderToString(value,{displayMode:true,throwOnError:false,trust:false})}<script>window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));</script></body></html>`, [value, colors.ink]);
  return <View accessible accessibilityLabel={`Formule : ${value}`} style={{ minHeight: 60 }}><WebView<{}> source={{ html }} originWhitelist={['*']} scrollEnabled={false} style={{ height, backgroundColor: 'transparent' }} onMessage={event => { const h = Number(event.nativeEvent.data); if (Number.isFinite(h)) setHeight(Math.min(400,Math.max(60,h))); }} onShouldStartLoadWithRequest={request => request.url === 'about:blank'} /></View>;
}
function Blocks({ nodes, colors, sources, active, depth = 0 }: { nodes: MarkdownNode[]; colors: Colors; sources: Source[]; active: boolean; depth?: number }) {
  const body: TextStyle = { fontFamily: tokens.font.answer, color: colors.ink, fontSize: 18, lineHeight: 30 };
  return <View style={{ gap: 16 }}>{nodes.map((node,index) => {
    const last = active && index === nodes.length - 1;
    if (node.type === 'code') return <Code key={index} value={node.value ?? ''} language={node.lang ?? ''} colors={colors} />;
    if (node.type === 'math') return <MathBlock key={index} value={node.value ?? ''} colors={colors} />;
    if (node.type === 'thematicBreak') return <View key={index} style={{ height: 1, backgroundColor: colors.line, marginVertical: 5 }} />;
    if (node.type === 'skeleton') return <View key={index} accessibilityLabel="Tableau en préparation" style={{ height: 72, backgroundColor: colors.raised, borderRadius: 14, opacity: 0.65 }} />;
    if (node.type === 'image') return node.url && publicURL(node.url) ? <ImageCard key={index} uri={node.url} title={node.alt || 'Image'} colors={colors} /> : null;
    if (node.type === 'blockquote') return <View key={index} style={{ borderLeftWidth: 3, borderColor: colors.accent, paddingLeft: 16 }}><Blocks nodes={node.children ?? []} colors={colors} sources={sources} active={last} depth={depth} /></View>;
    if (node.type === 'list') return <View key={index} style={{ gap: 10 }}>{(node.children ?? []).map((item,itemIndex) => <View key={itemIndex} style={{ flexDirection: 'row', gap: 10 }}><Text style={{ color: colors.accent, minWidth: node.ordered ? 22 : 16, lineHeight: 30, fontFamily: tokens.font.ui, fontSize: 14 }}>{item.checked !== null && item.checked !== undefined ? item.checked ? '☑' : '☐' : node.ordered ? `${(node.start ?? 1)+itemIndex}.` : '•'}</Text><View style={{ flex: 1 }}><Blocks nodes={item.children ?? []} colors={colors} sources={sources} active={last && itemIndex === (node.children?.length ?? 0)-1} depth={depth+1} /></View></View>)}</View>;
    if (node.type === 'table') return <ScrollView key={index} horizontal showsHorizontalScrollIndicator contentContainerStyle={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, overflow: 'hidden' }}><View>{(node.children ?? []).map((row,rowIndex) => <View key={rowIndex} style={{ flexDirection: 'row', backgroundColor: rowIndex === 0 ? colors.raised : colors.surface }}>{(row.children ?? []).map((cell,cellIndex) => <View key={cellIndex} style={{ width: 170, padding: 13, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.line }}><Text selectable style={{ color: colors.ink, fontFamily: tokens.font.ui, fontWeight: rowIndex === 0 ? '600' : '400', fontSize: 13, lineHeight: 21 }}><Inline nodes={cell.children ?? []} colors={colors} sources={sources} /></Text></View>)}</View>)}</View></ScrollView>;
    if (node.type === 'paragraph' && node.children?.some(child => child.type === 'image')) {
      const groups: MarkdownNode[][] = []; let pending: MarkdownNode[] = [];
      for (const child of node.children) { if (child.type === 'image') { if (pending.length) groups.push(pending); groups.push([child]); pending=[]; } else pending.push(child); } if (pending.length) groups.push(pending);
      return <View key={index} style={{ gap: 12 }}>{groups.map((group,i) => group[0]?.type === 'image' ? <Blocks key={i} nodes={group} colors={colors} sources={sources} active={false} /> : <Text key={i} selectable style={body}><Inline nodes={group} colors={colors} sources={sources} active={last} /></Text>)}</View>;
    }
    if (node.type === 'paragraph' || node.type === 'heading') return <Text key={index} selectable accessibilityRole={node.type === 'heading' ? 'header' : undefined} style={[body,node.type === 'heading' ? { fontFamily: tokens.font.ui, fontWeight: '600', fontSize: node.depth === 1 ? 27 : node.depth === 2 ? 23 : 20, lineHeight: node.depth === 1 ? 35 : 30, marginTop: index ? 7 : 0 } : {}]}><Inline nodes={node.children ?? []} colors={colors} sources={sources} active={last} /></Text>;
    return node.children ? <Blocks key={index} nodes={node.children} colors={colors} sources={sources} active={last} depth={depth} /> : null;
  })}</View>;
}
export const Markdown = memo(function Markdown({ content, colors, active = false, sources = [] }: { content: string; colors: Colors; active?: boolean; sources?: Source[] }) {
  const cache = useRef(new RichMarkdownCache()); const nodes = useMemo(() => cache.current.parse(content,active), [content,active]);
  return <View><Blocks nodes={nodes} colors={colors} sources={sources} active={active} />{active && content ? <View accessibilityElementsHidden style={{ width: 5, height: 16, borderRadius: 3, backgroundColor: colors.accent, marginTop: 4, opacity: 0.7 }} /> : null}</View>;
});
