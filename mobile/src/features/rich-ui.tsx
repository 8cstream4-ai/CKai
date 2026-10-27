import React, { Component, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, AppState, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Icon, IconButton, Sheet } from '../ui';
import type { Colors } from '../theme';
import type { Attachment, GalleryImage } from './attachments';
import type { Source } from '../../../src/ai/research.ts';

class MediaBoundary extends Component<{ children: ReactNode; colors: Colors }, { failed: boolean }> {
  state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Text style={{ color: this.props.colors.muted, padding: 20 }}>Ce média ne peut pas être affiché.</Text> : this.props.children; }
}
export async function shareFile(uri: string, mime?: string) { try { if (!await Sharing.isAvailableAsync()) throw new Error(); await Sharing.shareAsync(uri, { mimeType: mime }); } catch { Alert.alert('Fichier', 'Impossible d’ouvrir le partage de ce fichier.'); } }
export function ImageCard({ uri, title, colors, source, credit, license }: { uri: string; title: string; colors: Colors; source?: string; credit?: string; license?: string }) {
  const [open, setOpen] = useState(false); const [loaded, setLoaded] = useState(false); const [failed, setFailed] = useState(false);
  const scale = useSharedValue(1); const saved = useSharedValue(1);
  const pinch = Gesture.Pinch().onUpdate(event => { scale.value = Math.min(4, Math.max(1, saved.value * event.scale)); }).onEnd(() => { saved.value = scale.value; });
  const double = Gesture.Tap().numberOfTaps(2).onEnd(() => { scale.value = withSpring(scale.value > 1 ? 1 : 2.5); saved.value = scale.value > 1 ? 1 : 2.5; });
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <MediaBoundary colors={colors}><View style={{ borderRadius: 17, overflow: 'hidden', backgroundColor: colors.raised, marginVertical: 8, borderWidth: 1, borderColor: colors.line }}>
    <Pressable onPress={() => { setOpen(true); scale.value = 1; saved.value = 1; }} accessibilityRole="button" accessibilityLabel={`Agrandir : ${title}`}>
      {!loaded && !failed ? <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View> : null}
      <Image source={uri} style={{ width: '100%', height: 210 }} contentFit="cover" transition={250} cachePolicy="memory-disk" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      {failed ? <Text style={{ padding: 18, color: colors.muted }}>Image indisponible</Text> : null}
    </Pressable>
    {source ? <Pressable onPress={() => { void WebBrowser.openBrowserAsync(source).catch(() => {}); }} style={{ padding: 12, minHeight: 48 }} accessibilityRole="link"><Text numberOfLines={1} style={{ color: colors.ink, fontSize: 12 }}>{title}</Text><Text numberOfLines={2} style={{ color: colors.muted, fontSize: 10, marginTop: 5 }}>{credit || 'Source de l’image'}{license ? ` · ${license}` : ''}</Text></Pressable> : null}
  </View>
    <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}><GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000F', justifyContent: 'center' }}>
      <GestureDetector gesture={Gesture.Simultaneous(pinch, double)}><Animated.View style={[{ width: '100%', height: '75%' }, style]}><Image source={uri} contentFit="contain" style={{ flex: 1 }} /></Animated.View></GestureDetector>
      <View style={{ position: 'absolute', top: 45, left: 15, right: 15, flexDirection: 'row', justifyContent: 'space-between' }}><IconButton name="close-outline" label="Fermer l’image" colors={colors} onPress={() => setOpen(false)} /><IconButton name="share-outline" label="Partager l’image" colors={colors} onPress={() => { void (async () => { try { const local = uri.startsWith('https:') ? (await File.downloadFileAsync(uri, Paths.cache)).uri : uri; await shareFile(local, 'image/jpeg'); } catch { Alert.alert('Image', 'Téléchargement impossible.'); } })(); }} /></View>
    </GestureHandlerRootView></Modal>
  </MediaBoundary>;
}
function VideoPlayer({ uri, colors, close }: { uri: string; colors: Colors; close(): void }) {
  const player = useVideoPlayer(uri, instance => { instance.loop = false; instance.play(); });
  const [error, setError] = useState(false);
  useEffect(() => { const app = AppState.addEventListener('change', state => { if (state !== 'active') player.pause(); }); const subscription = player.addListener('statusChange', event => { if (event.status === 'error') setError(true); }); return () => { app.remove(); subscription.remove(); }; }, [player]);
  return <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>{error ? <Text style={{ color: colors.ink, padding: 30 }}>Cette vidéo ne peut pas être lue sur cet appareil.</Text> : <VideoView player={player} nativeControls contentFit="contain" allowsPictureInPicture style={{ width: '100%', height: '78%' }} />}
    <View style={{ position: 'absolute', top: 45, left: 15 }}><IconButton name="close-outline" label="Fermer la vidéo" onPress={close} colors={colors} /></View>
  </View>;
}
export function VideoCard({ item, colors, onPlay }: { item: Attachment; colors: Colors; onPlay(item: Attachment): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Lire ${item.name}`} onPress={() => onPlay(item)} style={{ borderRadius: 17, backgroundColor: colors.raised, marginVertical: 8, overflow: 'hidden' }}>
    {item.preview ? <Image source={item.preview} style={{ width: '100%', height: 185 }} contentFit="cover" /> : null}
    <View style={{ position: 'absolute', top: 65, alignSelf: 'center', backgroundColor: '#0009', padding: 15, borderRadius: 40 }}><Icon name="play" color="#FFF" /></View>
    <Text numberOfLines={1} style={{ color: colors.ink, padding: 12, fontSize: 12 }}>{item.name} · {Math.round(item.duration ?? 0)} s</Text>
  </Pressable>;
}
export function VideoOverlay({ item, colors, close }: { item: Attachment | null; colors: Colors; close(): void }) { return <Modal visible={!!item} onRequestClose={close} animationType="fade">{item ? <MediaBoundary colors={colors}><VideoPlayer key={item.id} uri={item.uri} colors={colors} close={close} /></MediaBoundary> : null}</Modal>; }
export function Attachments({ items, colors, onPlay }: { items: Attachment[]; colors: Colors; onPlay(item: Attachment): void }) {
  return <View style={{ gap: 7 }}>{items.map(item => item.kind === 'image' ? <ImageCard key={item.id} uri={item.uri} title={item.name} colors={colors} /> : item.kind === 'video' ? <VideoCard key={item.id} item={item} colors={colors} onPlay={onPlay} /> : <Pressable key={item.id} accessibilityRole="button" onPress={() => { void shareFile(item.uri, item.mime); }} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: colors.raised, padding: 15, gap: 12, minHeight: 64 }}><Icon name="document-text-outline" color={colors.accent} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.ink, fontSize: 13 }}>{item.name}</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 5 }}>{(item.size / 1024).toFixed(0)} Ko · Ouvrir / partager</Text>{item.note ? <Text style={{ color: colors.muted, fontSize: 10, marginTop: 5 }}>{item.note}</Text> : null}</View><Icon name="arrow-down-outline" color={colors.muted} size={17} /></Pressable>)}</View>;
}
export function Sources({ sources, colors }: { sources: Source[]; colors: Colors }) {
  const [open, setOpen] = useState(false); if (!sources.length) return null;
  return <><Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 12, marginTop: 16, alignSelf: 'flex-start', borderRadius: 24, borderWidth: 1, borderColor: colors.line }}><Icon name="globe-outline" color={colors.accent} size={16} /><Text style={{ color: colors.ink, fontSize: 12 }}>{sources.length} sources</Text><Icon name="chevron-forward" color={colors.muted} size={12} /></Pressable>
    <Sheet visible={open} title="Les sources" colors={colors} onClose={() => setOpen(false)}>{sources.map(source => <Pressable key={source.id} accessibilityRole="link" onPress={() => { void WebBrowser.openBrowserAsync(source.url).catch(() => {}); }} style={{ borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 19 }}><Text style={{ color: colors.accent, fontSize: 11, marginBottom: 7 }}>[{source.id}] {source.domain}{source.publishedAt ? ` · ${source.publishedAt.slice(0, 10)}` : ''}</Text><Text style={{ color: colors.ink, fontSize: 16, lineHeight: 23 }}>{source.title}</Text><Text numberOfLines={4} style={{ color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 7 }}>{source.snippet}</Text></Pressable>)}</Sheet>
  </>;
}
export function Gallery({ items, colors }: { items: GalleryImage[]; colors: Colors }) { return <View>{items.map(item => <ImageCard key={item.url} uri={item.url} title={item.title} source={item.source} credit={item.credit} license={item.license} colors={colors} />)}</View>; }
export function WeatherCard({ data, colors }: { data: Record<string, unknown>; colors: Colors }) {
  const current = data.current as { temperature_2m?: number; apparent_temperature?: number; wind_speed_10m?: number; precipitation?: number; weather_code?: number } | undefined;
  const daily = data.daily as { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[] } | undefined;
  if (!current) return null;
  return <View style={{ padding: 22, backgroundColor: colors.raised, borderRadius: 22, marginTop: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: colors.ink, fontSize: 18 }}>{String(data.place ?? '')}</Text><Icon name={(current.precipitation ?? 0) > 0 ? 'rainy-outline' : 'partly-sunny-outline'} color={colors.accent} size={30} /></View><Text style={{ color: colors.ink, fontSize: 48, marginVertical: 10 }}>{current.temperature_2m}°</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Ressenti {current.apparent_temperature}° · Vent {current.wind_speed_10m} km/h</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 20, paddingTop: 22 }}>{daily?.time?.map((date, index) => <View key={date}><Text style={{ color: colors.muted, fontSize: 11 }}>{new Date(`${date}T12:00:00`).toLocaleDateString('fr', { weekday: 'short' })}</Text><Text style={{ color: colors.ink, fontSize: 13, marginTop: 8 }}>{daily.temperature_2m_max?.[index]}°</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 5 }}>{daily.temperature_2m_min?.[index]}°</Text></View>)}</ScrollView><Text style={{ color: colors.muted, fontSize: 9, marginTop: 16 }}>Open-Meteo · Prévisions, pas une mesure en direct</Text></View>;
}
