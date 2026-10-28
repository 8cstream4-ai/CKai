import React, { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, AppState, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Icon, IconButton, Sheet } from '../ui';
import type { Colors } from '../theme';
import type { Attachment, GalleryImage } from './attachments';
import type { Source } from '../../../src/ai/research.ts';
import type { MediaVideo } from '../../../src/ai/media.ts';

const viewerColors = (colors: Colors): Colors => ({ ...colors, bg: '#08080A', surface: '#16161B', raised: '#24242C', ink: '#FFFFFF', muted: '#D2CEDA', line: '#FFFFFF2B' });
async function openSource(source: string) { try { if (source.startsWith('https://')) await WebBrowser.openBrowserAsync(source); } catch { Alert.alert('Source', 'Cette page ne peut pas être ouverte pour le moment.'); } }
class MediaBoundary extends Component<{ children: ReactNode; colors: Colors }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <View style={{ padding: 20, gap: 12 }}><Text style={{ color: this.props.colors.ink }}>Ce média ne peut pas être affiché.</Text><Pressable accessibilityRole="button" onPress={() => this.setState({ failed: false })} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: this.props.colors.accent }}>Réessayer</Text></Pressable></View> : this.props.children; }
}
export async function shareFile(uri: string, mime?: string) {
  try { if (!await Sharing.isAvailableAsync()) throw new Error(); await Sharing.shareAsync(uri, mime ? { mimeType: mime } : {}); }
  catch { Alert.alert('Fichier', 'Impossible d’ouvrir le partage de ce fichier.'); }
}
export function ImageCard({ uri, title, colors, source, credit, license, compact = false, width, height }: {
  uri: string; title: string; colors: Colors; source?: string; credit?: string; license?: string; compact?: boolean; width?: number; height?: number;
}) {
  const [open, setOpen] = useState(false); const [loaded, setLoaded] = useState(false); const [failed, setFailed] = useState(false); const [attempt, setAttempt] = useState(0);
  const insets = useSafeAreaInsets(); const window = useWindowDimensions(); const overlay = viewerColors(colors);
  const scale = useSharedValue(1); const saved = useSharedValue(1);
  const pinch = Gesture.Pinch().onUpdate(event => { scale.value = Math.min(4, Math.max(1, saved.value * event.scale)); }).onEnd(() => { saved.value = scale.value; });
  const double = Gesture.Tap().numberOfTaps(2).onEnd(() => { const next = scale.value > 1.25 ? 1 : 2.5; scale.value = withSpring(next); saved.value = next; });
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const previewHeight = compact ? 150 : Math.max(180, Math.min(300, (window.width - 64) / (width && height ? width / height : 1.5)));
  const imageSource = uri.startsWith('https://') ? { uri, headers: { 'User-Agent': 'CKai/0.5 (https://github.com/8cstream4-ai/CKai)' } } : { uri };
  const retry = () => { setLoaded(false); setFailed(false); setAttempt(value => value + 1); };
  useEffect(() => {
    if (loaded || failed) return;
    const timer = setTimeout(() => setFailed(true), 20000); return () => clearTimeout(timer);
  }, [uri, loaded, failed, attempt]);
  async function shareImage() {
    try {
      let local = uri;
      if (uri.startsWith('https://')) {
        const ext = /\.(png|jpe?g|webp|gif)(?:\?|$)/i.exec(uri)?.[1]?.toLowerCase() ?? 'jpg';
        local = (await File.downloadFileAsync(uri, new File(Paths.cache, randomUUID() + '.' + ext))).uri;
      }
      await shareFile(local, 'image/*');
    } catch { Alert.alert('Image', 'Le téléchargement de cette image a échoué. Tu peux ouvrir sa source.'); }
  }
  return <MediaBoundary colors={colors}><View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors.raised, marginVertical: 6, borderWidth: 1, borderColor: colors.line }}>
    <Pressable onPress={() => { if (failed) { retry(); return; } setOpen(true); scale.value = 1; saved.value = 1; }} accessibilityRole="button" accessibilityLabel={(failed ? 'Réessayer : ' : 'Agrandir : ') + title} style={{ height: previewHeight, justifyContent: 'center' }}>
      {!loaded && !failed ? <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View> : null}
      {failed ? <View style={{ padding: 16, alignItems: 'center', gap: 8 }}><Icon name="image-outline" color={colors.muted} /><Text style={{ color: colors.ink, textAlign: 'center', fontSize: 12 }}>Image indisponible</Text><Text style={{ color: colors.accent, fontSize: 12 }}>Toucher pour réessayer</Text></View> :
        <Image key={attempt} source={imageSource} style={{ width: '100%', height: previewHeight }} contentFit="contain" transition={200} cachePolicy="memory-disk" onLoad={() => { setLoaded(true); setFailed(false); }} onError={() => setFailed(true)} />}
    </Pressable>
    {source ? <Pressable onPress={() => { void openSource(source); }} style={{ padding: compact ? 10 : 12, minHeight: 64 }} accessibilityRole="link" accessibilityLabel={'Source : ' + title}><Text numberOfLines={2} style={{ color: colors.ink, fontSize: compact ? 11 : 12, lineHeight: 17 }}>{title}</Text><Text numberOfLines={2} style={{ color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4 }}>{credit || 'Source de l’image'}{license ? ' · ' + license : ''}</Text></Pressable> : null}
  </View>
    <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}><GestureHandlerRootView style={{ flex: 1, backgroundColor: '#08080AF5', justifyContent: 'center' }}>
      <GestureDetector gesture={Gesture.Simultaneous(pinch, double)}><Animated.View style={[{ width: '100%', height: '76%' }, style]}><Image source={imageSource} contentFit="contain" style={{ flex: 1 }} /></Animated.View></GestureDetector>
      <View style={{ position: 'absolute', top: Math.max(insets.top, 24) + 8, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}><IconButton name="close-outline" label="Fermer l’image" colors={overlay} onPress={() => setOpen(false)} /><View style={{ flexDirection: 'row' }}>{source ? <IconButton name="globe-outline" label="Ouvrir la source de l’image" colors={overlay} onPress={() => { void openSource(source); }} /> : null}<IconButton name="share-outline" label="Partager l’image" colors={overlay} onPress={() => { void shareImage(); }} /></View></View>
      <Text numberOfLines={2} style={{ position: 'absolute', bottom: insets.bottom + 24, left: 24, right: 24, textAlign: 'center', color: '#FFFFFF', fontSize: 12, lineHeight: 18 }}>{title}</Text>
    </GestureHandlerRootView></Modal>
  </MediaBoundary>;
}
function VideoPlayer({ item, colors, close }: { item: Attachment; colors: Colors; close(): void }) {
  const insets = useSafeAreaInsets(); const overlay = viewerColors(colors); const inPip = useRef(false);
  const player = useVideoPlayer(item.uri, instance => { instance.loop = false; instance.play(); });
  const [error, setError] = useState(false); const [ready, setReady] = useState(false);
  useEffect(() => {
    const app = AppState.addEventListener('change', state => { if (state !== 'active' && !inPip.current) player.pause(); });
    const subscription = player.addListener('statusChange', event => { if (event.status === 'error') setError(true); });
    return () => { app.remove(); subscription.remove(); };
  }, [player]);
  return <View style={{ flex: 1, backgroundColor: overlay.bg, justifyContent: 'center' }}>
    {error ? <View style={{ padding: 32, alignItems: 'center', gap: 16 }}><Icon name="videocam-outline" color={overlay.muted} size={36} /><Text style={{ color: '#FFF', lineHeight: 24, textAlign: 'center' }}>Cette vidéo ne peut pas être lue sur cet appareil.</Text><Pressable accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => { if (item.source) void openSource(item.source); else void shareFile(item.uri, item.mime); }}><Text style={{ color: overlay.accent }}>{item.source ? 'Ouvrir la source dans le navigateur' : 'Partager vers une autre application'}</Text></Pressable></View> :
      <><VideoView player={player} nativeControls contentFit="contain" surfaceType="textureView" fullscreenOptions={{ enable: true }} allowsPictureInPicture
        onFirstFrameRender={() => setReady(true)} onPictureInPictureStart={() => { inPip.current = true; player.play(); }}
        onPictureInPictureStop={() => { inPip.current = false; if (AppState.currentState !== 'active') player.pause(); }} style={{ width: '100%', height: '78%' }} />
        {!ready ? <ActivityIndicator pointerEvents="none" color="#D2B7FF" style={{ position: 'absolute', alignSelf: 'center' }} /> : null}</>}
    <View style={{ position: 'absolute', top: Math.max(insets.top, 24) + 8, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}><IconButton name="close-outline" label="Fermer la vidéo" onPress={close} colors={overlay} />{item.source ? <IconButton name="globe-outline" label="Ouvrir la source de la vidéo" colors={overlay} onPress={() => { void openSource(item.source!); }} /> : null}</View>
  </View>;
}
export function VideoCard({ item, colors, onPlay }: { item: Attachment; colors: Colors; onPlay(item: Attachment): void }) {
  return <View style={{ borderRadius: 16, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.line, marginVertical: 8, overflow: 'hidden' }}>
    <Pressable accessibilityRole="button" accessibilityLabel={'Lire ' + item.name} onPress={() => onPlay(item)}>
      <View style={{ height: 180, alignItems: 'center', justifyContent: 'center' }}>{item.preview ? <Image source={item.preview} style={{ position: 'absolute', inset: 0 }} contentFit="cover" /> : <Icon name="videocam-outline" color={colors.muted} size={40} />}
        <View style={{ backgroundColor: '#08080AD9', width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28 }}><Icon name="play" color="#FFF" /></View>
        {item.duration ? <Text style={{ position: 'absolute', bottom: 10, right: 10, color: '#FFF', backgroundColor: '#08080ACC', padding: 6, borderRadius: 8, fontSize: 11 }}>{Math.floor(item.duration / 60)}:{String(Math.round(item.duration) % 60).padStart(2, '0')}</Text> : null}
      </View>
      <Text numberOfLines={2} style={{ color: colors.ink, padding: 12, fontSize: 12, lineHeight: 18 }}>{item.name}</Text>
    </Pressable>
    {item.source ? <Pressable accessibilityRole="link" accessibilityLabel={'Source : ' + item.name} onPress={() => { void openSource(item.source!); }} style={{ paddingHorizontal: 12, paddingBottom: 12, minHeight: 48, justifyContent: 'center' }}><Text numberOfLines={2} style={{ color: colors.muted, fontSize: 10, lineHeight: 16 }}>{item.credit || 'Source vidéo'}{item.license ? ' · ' + item.license : ''}</Text></Pressable> : null}
  </View>;
}
export function VideoOverlay({ item, colors, close }: { item: Attachment | null; colors: Colors; close(): void }) {
  return <Modal visible={!!item} onRequestClose={close} animationType="fade">{item ? <MediaBoundary colors={viewerColors(colors)}><VideoPlayer key={item.id} item={item} colors={colors} close={close} /></MediaBoundary> : null}</Modal>;
}
export function Attachments({ items, colors, onPlay }: { items: Attachment[]; colors: Colors; onPlay(item: Attachment): void }) {
  return <View style={{ gap: 8, minWidth: 180 }}>{items.map(item => item.kind === 'image' ? <ImageCard key={item.id} uri={item.uri} title={item.name} colors={colors} /> : item.kind === 'video' ? <VideoCard key={item.id} item={item} colors={colors} onPlay={onPlay} /> :
    <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'Ouvrir ou partager ' + item.name} onPress={() => { void shareFile(item.uri, item.mime); }} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: colors.raised, padding: 16, gap: 12, minHeight: 64 }}><Icon name="document-text-outline" color={colors.accent} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.ink, fontSize: 13 }}>{item.name}</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 5 }}>{(item.size / 1024).toFixed(0)} Ko · Ouvrir / partager</Text>{item.note ? <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 5 }}>{item.note}</Text> : null}</View><Icon name="arrow-down-outline" color={colors.muted} size={17} /></Pressable>)}</View>;
}
export function Videos({ items, colors, onPlay }: { items: MediaVideo[]; colors: Colors; onPlay(item: Attachment): void }) {
  if (!items.length) return null;
  return <View style={{ marginBottom: 12 }}><Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>{items.length} vidéo{items.length > 1 ? 's' : ''} trouvée{items.length > 1 ? 's' : ''}</Text>{items.map(item => <VideoCard key={item.url} colors={colors} onPlay={onPlay} item={{ id: item.url, kind: 'video', name: item.title, uri: item.url, mime: item.mime, size: 0, source: item.source, credit: item.credit, license: item.license, ...(item.poster ? { preview: item.poster } : {}), ...(item.duration ? { duration: item.duration } : {}) }} />)}</View>;
}
export function Sources({ sources, colors }: { sources: Source[]; colors: Colors }) {
  const [open, setOpen] = useState(false); if (!sources.length) return null;
  return <><Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 12, marginTop: 16, alignSelf: 'flex-start', borderRadius: 24, borderWidth: 1, borderColor: colors.line }}><Icon name="globe-outline" color={colors.accent} size={16} /><Text style={{ color: colors.ink, fontSize: 12 }}>{sources.length} sources</Text><Icon name="chevron-forward" color={colors.muted} size={12} /></Pressable>
    <Sheet visible={open} title="Les sources" colors={colors} onClose={() => setOpen(false)}>{sources.map(source => <Pressable key={source.id} accessibilityRole="link" onPress={() => { void WebBrowser.openBrowserAsync(source.url).catch(() => {}); }} style={{ borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 19 }}><Text style={{ color: colors.accent, fontSize: 11, marginBottom: 7 }}>[{source.id}] {source.domain}{source.publishedAt ? ` · ${source.publishedAt.slice(0, 10)}` : ''}</Text><Text style={{ color: colors.ink, fontSize: 16, lineHeight: 23 }}>{source.title}</Text><Text numberOfLines={4} style={{ color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 7 }}>{source.snippet}</Text></Pressable>)}</Sheet>
  </>;
}
export function Gallery({ items, colors }: { items: GalleryImage[]; colors: Colors }) {
  const [expanded, setExpanded] = useState(false); const visible = expanded ? items : items.slice(0, 4);
  return <View style={{ marginBottom: 12 }}><Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>{items.length} image{items.length > 1 ? 's' : ''} trouvée{items.length > 1 ? 's' : ''}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12 }}>{visible.map(item => <View key={item.url} style={{ width: visible.length === 1 ? '100%' : '46%', flexGrow: 1 }}><ImageCard uri={item.url} title={item.title} source={item.source} credit={item.credit} license={item.license} colors={colors} compact={visible.length > 1} {...(item.width ? { width: item.width } : {})} {...(item.height ? { height: item.height } : {})} /></View>)}</View>{!expanded && items.length > 4 ? <Pressable accessibilityRole="button" onPress={() => setExpanded(true)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: colors.accent, fontSize: 13 }}>Voir les autres images ({items.length - 4})</Text></Pressable> : null}</View>;
}
export function WeatherCard({ data, colors }: { data: Record<string, unknown>; colors: Colors }) {
  const current = data.current as { temperature_2m?: number; apparent_temperature?: number; wind_speed_10m?: number; precipitation?: number; weather_code?: number } | undefined;
  const daily = data.daily as { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[] } | undefined;
  if (!current) return null;
  return <View style={{ padding: 22, backgroundColor: colors.raised, borderRadius: 22, marginTop: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: colors.ink, fontSize: 18 }}>{String(data.place ?? '')}</Text><Icon name={(current.precipitation ?? 0) > 0 ? 'rainy-outline' : 'partly-sunny-outline'} color={colors.accent} size={30} /></View><Text style={{ color: colors.ink, fontSize: 48, marginVertical: 10 }}>{current.temperature_2m}°</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Ressenti {current.apparent_temperature}° · Vent {current.wind_speed_10m} km/h</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 20, paddingTop: 22 }}>{daily?.time?.map((date, index) => <View key={date}><Text style={{ color: colors.muted, fontSize: 11 }}>{new Date(`${date}T12:00:00`).toLocaleDateString('fr', { weekday: 'short' })}</Text><Text style={{ color: colors.ink, fontSize: 13, marginTop: 8 }}>{daily.temperature_2m_max?.[index]}°</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 5 }}>{daily.temperature_2m_min?.[index]}°</Text></View>)}</ScrollView><Text style={{ color: colors.muted, fontSize: 9, marginTop: 16 }}>Open-Meteo · Prévisions, pas une mesure en direct</Text></View>;
}
