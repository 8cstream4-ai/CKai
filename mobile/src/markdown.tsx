import React, { memo, useRef } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MarkdownStreamParser } from '../../src/ai/markdown.ts';
import { RevealSpan } from './features/motion';
import type { Source } from '../../src/ai/research.ts';
import { ImageCard } from './features/rich-ui';
import * as WebBrowser from 'expo-web-browser';
import { tokens, type Colors } from './theme';

function Inline({ text, colors, active = false, sources = [] }: { text: string; colors: Colors; active?: boolean; sources?: Source[] }) {
  const pieces: React.ReactNode[] = []; let start = 0;
  for (const match of text.matchAll(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\[\d+\]|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g)) {
    pieces.push(<RevealSpan key={`text-${start}`} text={text.slice(start, match.index)} active={active} colors={colors} />);
    const value = match[0];
    if (value.startsWith('**')) pieces.push(<Text key={match.index} style={{ fontWeight: '700' }}>{value.slice(2, -2)}</Text>);
    else if (value.startsWith('`')) pieces.push(<Text key={match.index} style={{ fontFamily: tokens.font.mono, backgroundColor: colors.raised, fontSize: 13 }}>{value.slice(1, -1)}</Text>);
    else if (/^\[\d+\]$/.test(value)) {
      const source = sources.find(s => s.id === Number(value.slice(1, -1)));
      pieces.push(source ? <Text key={match.index} accessibilityRole="link" accessibilityLabel={`Source ${source.id} : ${source.title}`} onPress={() => { void WebBrowser.openBrowserAsync(source.url); }} style={{ color: colors.accent, fontFamily: tokens.font.ui, fontSize: 12, backgroundColor: colors.raised }}> {value} </Text> : value);
    }
    else {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(value)!;
      pieces.push(<Text key={match.index} accessibilityRole="link" style={{ color: colors.accent, textDecorationLine: 'underline' }}
        onPress={() => { void Linking.openURL(link[2]!).catch(() => Alert.alert('Lien', 'Impossible d’ouvrir ce lien.')); }}>{link[1]}</Text>);
    }
    start = match.index + value.length;
  }
  pieces.push(<RevealSpan key={`text-${start}`} text={text.slice(start)} active={active} colors={colors} />); return <>{pieces}</>;
}
export const Markdown = memo(function Markdown({ content, colors, active = false, sources = [] }: { content: string; colors: Colors; active?: boolean; sources?: Source[] }) {
  const parser = useRef(new MarkdownStreamParser()); const blocks = parser.current.update(content);
  return <View style={{ gap: 15 }}>{blocks.map((block, index) => {
    const animate = active && index === blocks.length - 1;
    if (block.type === 'image') return <ImageCard key={index} uri={block.url} title={block.alt || 'Image'} colors={colors} />;
    if (block.type === 'paragraph') {
      const image = /^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/.exec(block.text.trim());
      if (image) return <ImageCard key={index} uri={image[2]!} title={image[1] || 'Image'} colors={colors} />;
    }
    if (block.type === 'code') return <View key={index} style={{ borderRadius: 15, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.raised, paddingLeft: 14 }}>
        <Text style={{ flex: 1, color: colors.muted, fontSize: 11 }}>{block.language || 'code'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Copier le code" onPress={() => {
          void Clipboard.setStringAsync(block.text).catch(() => Alert.alert('Copie', 'Impossible de copier le code.'));
        }} style={{ paddingHorizontal: 15, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: colors.ink, fontSize: 12 }}>Copier</Text></Pressable>
      </View><ScrollView horizontal contentContainerStyle={{ padding: 16 }}><Text selectable style={{ color: colors.ink, fontFamily: tokens.font.mono, lineHeight: 22, fontSize: 12 }}>{block.text}</Text></ScrollView>
    </View>;
    if (block.type === 'list') return <View key={index} style={{ gap: 8 }}>{block.items.map((item, number) => <View key={number} style={{ flexDirection: 'row', gap: 10 }}><Text style={{ width: 21, color: colors.accent, lineHeight: 27 }}>{block.ordered ? `${number + 1}.` : '•'}</Text><Text selectable style={{ flex: 1, color: colors.ink, fontFamily: tokens.font.answer, fontSize: 17, lineHeight: 28 }}><Inline text={item} colors={colors} sources={sources} active={animate && number === block.items.length - 1} /></Text></View>)}</View>;
    return <View key={index} style={block.type === 'quote' ? { borderLeftWidth: 2, borderColor: colors.accent, paddingLeft: 14 } : {}}>
      <Text selectable accessibilityRole={block.type === 'heading' ? 'header' : undefined}
        style={{ color: block.type === 'quote' ? colors.muted : colors.ink, fontFamily: tokens.font.answer, fontSize: block.type === 'heading' ? 25 - block.level * 2 : 17, lineHeight: 29, fontWeight: block.type === 'heading' ? '600' : '400' }}>
        <Inline text={block.text} colors={colors} sources={sources} active={animate} />
      </Text>
    </View>;
  })}</View>;
});
