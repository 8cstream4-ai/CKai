import React, { memo } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { parseMarkdown } from '../../src/ai/markdown.ts';
import { tokens, type Colors } from './theme';

function Inline({ text, colors }: { text: string; colors: Colors }) {
  const pieces: React.ReactNode[] = []; let start = 0;
  for (const match of text.matchAll(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g)) {
    pieces.push(text.slice(start, match.index));
    const value = match[0];
    if (value.startsWith('**')) pieces.push(<Text key={match.index} style={{ fontWeight: '700' }}>{value.slice(2, -2)}</Text>);
    else if (value.startsWith('`')) pieces.push(<Text key={match.index} style={{ fontFamily: tokens.font.mono, backgroundColor: colors.raised, fontSize: 13 }}>{value.slice(1, -1)}</Text>);
    else {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(value)!;
      pieces.push(<Text key={match.index} accessibilityRole="link" style={{ color: colors.accent, textDecorationLine: 'underline' }}
        onPress={() => { void Linking.openURL(link[2]!).catch(() => Alert.alert('Lien', 'Impossible d’ouvrir ce lien.')); }}>{link[1]}</Text>);
    }
    start = match.index + value.length;
  }
  pieces.push(text.slice(start)); return <>{pieces}</>;
}
export const Markdown = memo(function Markdown({ content, colors }: { content: string; colors: Colors }) {
  return <View style={{ gap: 15 }}>{parseMarkdown(content).map((block, index) => {
    if (block.type === 'code') return <View key={index} style={{ borderRadius: 15, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.raised, paddingLeft: 14 }}>
        <Text style={{ flex: 1, color: colors.muted, fontSize: 11 }}>{block.language || 'code'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Copier le code" onPress={() => {
          void Clipboard.setStringAsync(block.text).catch(() => Alert.alert('Copie', 'Impossible de copier le code.'));
        }} style={{ paddingHorizontal: 15, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: colors.ink, fontSize: 12 }}>Copier</Text></Pressable>
      </View><ScrollView horizontal contentContainerStyle={{ padding: 16 }}><Text selectable style={{ color: colors.ink, fontFamily: tokens.font.mono, lineHeight: 22, fontSize: 12 }}>{block.text}</Text></ScrollView>
    </View>;
    if (block.type === 'list') return <View key={index} style={{ gap: 8 }}>{block.items.map((item, number) => <View key={number} style={{ flexDirection: 'row', gap: 10 }}><Text style={{ width: 21, color: colors.accent, lineHeight: 27 }}>{block.ordered ? `${number + 1}.` : '•'}</Text><Text selectable style={{ flex: 1, color: colors.ink, fontFamily: tokens.font.answer, fontSize: 17, lineHeight: 28 }}><Inline text={item} colors={colors} /></Text></View>)}</View>;
    return <View key={index} style={block.type === 'quote' ? { borderLeftWidth: 2, borderColor: colors.accent, paddingLeft: 14 } : {}}>
      <Text selectable accessibilityRole={block.type === 'heading' ? 'header' : undefined}
        style={{ color: block.type === 'quote' ? colors.muted : colors.ink, fontFamily: tokens.font.answer, fontSize: block.type === 'heading' ? 25 - block.level * 2 : 17, lineHeight: 29, fontWeight: block.type === 'heading' ? '600' : '400' }}>
        <Inline text={block.text} colors={colors} />
      </Text>
    </View>;
  })}</View>;
});
