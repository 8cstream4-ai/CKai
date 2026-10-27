import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { Image } from 'expo-image';
import { useDocumentReader } from '../src/features/documents';
import { importAttachment, type Attachment } from '../src/features/attachments';
import { Attachments, Gallery, Sources, VideoOverlay, WeatherCard } from '../src/features/rich-ui';
import { BlurTargetView } from 'expo-blur';
import { HomeScene, homeColors } from '../src/features/home/scene';
import { HomeAtmosphere, LivingOrb, SendControl } from '../src/features/home/effects';
import { Entrance, GlowFrame, Shimmer, AuroraOrb } from '../src/features/motion';
import { LinearGradient } from 'expo-linear-gradient';
import { useRuntime } from '../src/runtime';
import { colorsFor, tokens, type Colors } from '../src/theme';
import { Choice, Icon, IconButton, Logo, Orb, PrimaryButton, Sheet, type IconName } from '../src/ui';
import { Markdown } from '../src/markdown';
import type { StoredMessage } from '../src/storage';
import type { Effort, Level } from '../../src/ai/types.ts';
import { db } from '../src/storage';

const prompts: { title: string; detail: string; icon: IconName; prompt: string }[] = [
  { title: 'Une nouvelle idée', detail: 'Et si on essayait autrement ?', icon: 'sparkles-outline', prompt: 'Aide-moi à trouver une idée originale de projet personnel. Pose-moi trois questions pour commencer.' },
  { title: 'Comprendre', detail: 'Sans le jargon.', icon: 'book-outline', prompt: 'Explique-moi simplement comment fonctionne une intelligence artificielle, avec une analogie.' },
  { title: 'Les bons mots', detail: 'Écrire avec justesse.', icon: 'pencil-outline', prompt: 'Aide-moi à écrire un message clair et naturel. Demande-moi à qui il s’adresse et ce que je veux dire.' },
  { title: 'Construire', detail: 'Une étape à la fois.', icon: 'code-slash-outline', prompt: 'Aide-moi à construire une petite application utile. Demande-moi mon idée et mon niveau en programmation.' },
];
const levels: { id: Level; title: string; description: string }[] = [
  { id: 'auto', title: 'Auto', description: 'Choix local selon la longueur et les mots de la question.' },
  { id: 'faible', title: 'Rapide', description: 'GPT-OSS 20B · pour les petites questions.' },
  { id: 'moyen', title: 'Équilibré', description: 'GPT-OSS 120B · pour le quotidien.' },
  { id: 'fort', title: 'Fort', description: 'GPT-OSS 120B · le modèle principal disponible.' },
];
function notifyError() { Alert.alert('Action impossible', 'Cette action n’a pas pu être terminée. Réessaie.'); }
async function copy(content: string) {
  try { await Clipboard.setStringAsync(content); } catch { notifyError(); }
}
const MessageRow = memo(function MessageRow({ message, colors, latest, busy, onRetry, onPlay, animate }: {
  message: StoredMessage; colors: Colors; latest: boolean; busy: boolean; onRetry(id: string): void; onPlay(item: Attachment): void; animate: boolean;
}) {
  const [speaking, setSpeaking] = useState(false);
  if (message.role === 'user') return <Entrance reduced={!animate}><View style={{ alignItems: 'flex-end', marginBottom: 27, marginTop: 10 }}>
    <Pressable accessibilityLabel="Ton message. Appui long pour copier." onLongPress={() => { void copy(message.content); }}
      style={{ maxWidth: '85%', backgroundColor: colors.user, paddingHorizontal: 18, paddingVertical: 13, borderRadius: tokens.radius.bubble, borderBottomRightRadius: 6 }}>
      {message.rich?.attachments?.length ? <Attachments items={message.rich.attachments} colors={colors} onPlay={onPlay} /> : null}
      <Text selectable style={{ color: colors.ink, fontSize: 16, lineHeight: 24, marginTop: message.rich?.attachments?.length ? 12 : 0 }}>{message.content}</Text>
    </Pressable>
  </View></Entrance>;
  return <View style={{ marginBottom: 26 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 15 }}><Logo size={25} /><Text style={{ color: colors.ink, fontSize: 12, fontWeight: '600' }}>CKai</Text></View>
    <Markdown content={message.content} colors={colors} sources={message.rich?.sources} active={animate && message.state === 'streaming'} />
    {message.rich?.weather ? <WeatherCard data={message.rich.weather} colors={colors} /> : null}
    {message.rich?.images?.length ? <Gallery items={message.rich.images} colors={colors} /> : null}
    {message.rich?.attachments?.length ? <Attachments items={message.rich.attachments} colors={colors} onPlay={onPlay} /> : null}
    <Sources sources={message.rich?.sources ?? []} colors={colors} />
    {!message.content && message.state === 'streaming' ? <ActivityIndicator color={colors.accent} style={{ alignSelf: 'flex-start', marginVertical: 10 }} /> : null}
    {message.error || message.state === 'interrupted' ? <View style={{ backgroundColor: colors.surface, padding: 14, marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line }}><Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 13, lineHeight: 21 }}>{message.error || 'La génération a été interrompue à la fermeture de l’application. Tu peux réessayer.'}</Text></View> : null}
    {message.state === 'stopped' ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 12 }}>Réponse arrêtée · texte conservé</Text> : null}
    {message.state !== 'streaming' ? <View style={{ flexDirection: 'row', marginLeft: -10, marginTop: 5 }}>
      {message.content ? <><IconButton name="copy-outline" label="Copier la réponse" colors={colors} onPress={() => { void copy(message.content); }} /><IconButton name={speaking ? 'volume-mute-outline' : 'volume-high-outline'} label={speaking ? 'Arrêter la lecture' : 'Lire la réponse'} colors={colors} onPress={() => { void Speech.stop(); if (!speaking) { setSpeaking(true); Speech.speak(message.content, { language: 'fr-FR', onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) }); } else setSpeaking(false); }} /><IconButton name="share-outline" label="Partager la réponse" colors={colors} onPress={() => { void Share.share({ message: message.content }).catch(notifyError); }} /></> : null}
      {latest ? <IconButton name="refresh-outline" label="Régénérer" colors={colors} disabled={busy} onPress={() => onRetry(message.id)} /> : null}
    </View> : null}
  </View>;
});

function Profile({ colors }: { colors: Colors }) {
  const runtime = useRuntime(); const [name, setName] = useState(''); const [saving, setSaving] = useState(false);
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg, padding: 30, justifyContent: 'center' }}>
    <Entrance delay={80}><Logo size={76} /></Entrance><Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 3, marginTop: 35 }}>BIENVENUE CHEZ CKAI</Text>
    <Text accessibilityRole="header" style={{ color: colors.ink, fontFamily: tokens.font.answer, fontSize: 38, lineHeight: 46, marginTop: 14 }}>Un espace pour{ '\n' }tes idées.</Text>
    <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 24, marginTop: 18, marginBottom: 32 }}>Tes conversations restent sur cet appareil. Tes messages sont envoyés à Groq pour obtenir une réponse.</Text>
    <Text style={{ color: colors.ink, fontSize: 13, marginBottom: 10 }}>Comment t’appelles-tu ?</Text>
    <TextInput value={name} onChangeText={setName} placeholder="Ton prénom ou ton pseudo" placeholderTextColor={colors.muted} maxLength={40} autoComplete="given-name" autoCapitalize="words" accessibilityLabel="Prénom ou pseudo"
      style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 17, color: colors.ink, fontSize: 16, marginBottom: 18 }} />
    <PrimaryButton title={saving ? 'Préparation…' : 'Entrer dans CKai'} disabled={!name.trim() || saving} colors={colors} onPress={() => {
      setSaving(true); void runtime.setPreferences({ name: name.trim() }).catch(notifyError).finally(() => setSaving(false));
    }} />
    <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 20 }}>Profil local · aucun compte Google nécessaire</Text>
  </KeyboardAvoidingView>;
}

function ChatScreen({ colors: baseColors }: { colors: Colors }) {
  const runtime = useRuntime(); const insets = useSafeAreaInsets(); const { height } = useWindowDimensions();
  const isHome=runtime.messages.length===0;
  const colors=useMemo(()=>isHome?homeColors(baseColors,runtime.preferences.theme==='light',runtime.preferences.theme==='amoled'):baseColors,[isHome,baseColors,runtime.preferences.theme]);
  const blurTarget=useRef<React.ComponentRef<typeof View>>(null);
  const [focused,setFocused]=useState(false);
  const reader = useDocumentReader();
  const [attachments, setAttachments] = useState<Attachment[]>([]); const [attachOpen, setAttachOpen] = useState(false);
  const [importing, setImporting] = useState(''); const [video, setVideo] = useState<Attachment | null>(null);
  const [draft, setDraft] = useState(''); const [drawer, setDrawer] = useState(false); const [search, setSearch] = useState('');
  const [modelsOpen, setModelsOpen] = useState(false); const [activityOpen, setActivityOpen] = useState(false);
  const [atBottom, setAtBottom] = useState(true); const [submitting, setSubmitting] = useState(false);
  const list = useRef<FlashListRef<StoredMessage>>(null); const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const following = useRef(true); const draftReady = useRef(false); const draftSnapshot = useRef(draft); draftSnapshot.current = draft;
  const draftId = runtime.current?.id ?? 'new';
  useEffect(() => {
    let disposed = false; draftReady.current = false;
    void db().then(async connection => {
      await connection.execAsync('CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL)');
      const row = await connection.getFirstAsync<{ content: string }>('SELECT content FROM drafts WHERE id=?', draftId);
      if (!disposed) {
        let content = row?.content ?? ''; let files: Attachment[] = [];
        try { const value = JSON.parse(content); if (value && value.ckaiDraft === 2) { content = value.text; files = value.attachments ?? []; } } catch {}
        setDraft(content); setAttachments(files); draftReady.current = true;
      }
    }).catch(() => { if (!disposed) { setDraft(''); draftReady.current = true; } });
    following.current = true; setAtBottom(true);
    return () => { disposed = true; };
  }, [draftId]);
  useEffect(() => {
    if (!draftReady.current) return;
    const timer = setTimeout(() => {
      void db().then(connection => connection.runAsync('INSERT OR REPLACE INTO drafts(id,content) VALUES (?,?)', draftId, JSON.stringify({ ckaiDraft: 2, text: draft, attachments }))).catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, draftId, attachments]);
  const busy = runtime.busy || submitting || !!importing;
  const animate = runtime.preferences.animations !== 'reduced';
  async function send() {
    if (runtime.busy) { runtime.stop(); return; }
    if ((!draft.trim() && !attachments.length) || submitting || importing) return;
    setSubmitting(true); Keyboard.dismiss(); following.current = true; setAtBottom(true);
    const captured = draft;
    try {
      if (await runtime.send(captured, attachments)) {
        setDraft(''); setAttachments([]);
        await (await db()).runAsync('DELETE FROM drafts WHERE id IN (?,?)', draftId, runtime.current?.id ?? draftId);
      }
    } catch { notifyError(); } finally { setSubmitting(false); }
  }
  async function pick(kind: 'files' | 'photos' | 'camera' | 'video') {
    if (busy) return; setAttachOpen(false);
    if (attachments.length >= 3) { Alert.alert('Pièces jointes', 'Trois pièces jointes maximum par message.'); return; }
    try {
      let assets: { uri: string; name: string; mime?: string; size?: number; duration?: number }[] = [];
      if (kind === 'files') {
        const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
        if (result.canceled) return; assets = result.assets.map(asset => ({ uri: asset.uri, name: asset.name, mime: asset.mimeType, size: asset.size }));
      } else {
        if (kind === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) { Alert.alert('Caméra', 'Autorise l’accès à la caméra dans les réglages Android pour prendre une photo.'); return; }
        const result = kind === 'camera' ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: kind === 'video' ? ['videos'] : ['images'], allowsMultipleSelection: kind !== 'video', selectionLimit: 3 - attachments.length, quality: 0.85 });
        if (result.canceled) return;
        assets = result.assets.map(asset => ({ uri: asset.uri, name: asset.fileName || `import-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`, mime: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'), size: asset.fileSize, duration: asset.duration ?? undefined }));
      }
      const added: Attachment[] = [];
      for (const asset of assets.slice(0, 3 - attachments.length)) {
        setImporting(asset.name);
        try { added.push(await importAttachment(asset, reader)); } catch (error) { Alert.alert('Import impossible', error instanceof Error ? error.message : asset.name); }
      }
      setAttachments(current => [...current, ...added].slice(0, 3));
    } catch { Alert.alert('Import', 'Le sélecteur n’a pas pu être ouvert. Réessaie.'); }
    finally { setImporting(''); }
  }
  const runtimeLatest = useRef(runtime); runtimeLatest.current = runtime;
  const onRetry = useCallback((id: string) => { void runtimeLatest.current.retry(id); }, []);
  const choosePrompt=useCallback((value:string)=>{setDraft(value);input.current?.focus();},[]);
  const lastMessageId = runtime.messages.at(-1)?.id;
  const currentActivity = runtime.activity.at(-1)?.text;
  const greeting = new Date().getHours() >= 18 || new Date().getHours() < 5 ? 'Bonsoir' : 'Bonjour';
  return <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
    {isHome?<BlurTargetView ref={blurTarget} pointerEvents="none" style={{position:'absolute',inset:0}}><HomeAtmosphere disabled={!animate} light={runtime.preferences.theme==='light'} /></BlurTargetView>:null}
    <StatusBar style={runtime.preferences.theme === 'light' ? 'dark' : 'light'} />
    <View style={{ height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
      <IconButton name="menu-outline" label="Historique" colors={colors} onPress={() => setDrawer(true)} />
      {isHome?<View style={{flex:1,alignItems:'center'}} accessible accessibilityLabel="CKai, accueil"><LivingOrb size={40} miniature disabled={!animate} /></View>:<Text numberOfLines={1} style={{ color: colors.ink, flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '500', paddingHorizontal: 12 }}>{runtime.current?.title || 'CKai'}</Text>}
      <IconButton name="create-outline" label="Nouvelle conversation" disabled={busy} colors={colors} onPress={() => { void runtime.openChat(null); }} />
    </View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1 }}>
        <FlashList ref={list} data={runtime.messages} keyExtractor={message => message.id} getItemType={message => message.role}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 }}
          onScroll={event => { const { contentSize, contentOffset, layoutMeasurement } = event.nativeEvent; following.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 100; setAtBottom(following.current); }} scrollEventThrottle={64}
          onContentSizeChange={() => { if (runtime.messages.length && following.current) list.current?.scrollToEnd({ animated: false }); }}
          renderItem={({ item }) => <MessageRow message={item} colors={colors} latest={item.id === lastMessageId} busy={busy} onRetry={onRetry} onPlay={setVideo} animate={animate} />}
          ListEmptyComponent={<HomeScene name={runtime.preferences.name} greeting={greeting} typing={draft.length} prompts={prompts} colors={colors} disabled={!animate} haptics={runtime.preferences.haptics} light={runtime.preferences.theme==='light'} blurTarget={blurTarget} onPrompt={choosePrompt} />} />
        {!atBottom && runtime.messages.length ? <View style={{ position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.line }}>
          <IconButton name="arrow-down-outline" label="Dernier message" colors={colors} onPress={() => { following.current = true; list.current?.scrollToEnd({ animated: true }); }} />
        </View> : null}
      </View>
      {runtime.activity.length ? <Pressable accessibilityRole="button" accessibilityLabel="Voir les étapes de la requête" onPress={() => setActivityOpen(true)} style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, gap: 9 }}>
        {runtime.busy ? <ActivityIndicator size="small" color={colors.accent} /> : <Icon name="checkmark-circle-outline" color={colors.muted} size={15} />}
        <Shimmer text={runtime.busy ? currentActivity || 'Préparation…' : `Terminé en ${Math.round((runtime.messages.at(-1)?.rich?.durationMs ?? 0) / 1000)} s`} colors={colors} active={runtime.busy && animate} /><Icon name="chevron-forward" color={colors.muted} size={13} />
      </Pressable> : null}
      <View style={{ paddingHorizontal: 12, paddingTop: 7, paddingBottom: Math.max(insets.bottom, 12) }}>
        {attachments.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>{attachments.map(item => <View key={item.id} style={{ width: 108, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.line }}>
          {item.preview ? <Image source={item.preview} contentFit="cover" style={{ height: 64, width: 108 }} /> : <View style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}><Icon name="document-text-outline" color={colors.accent} size={27} /></View>}
          <Text numberOfLines={1} style={{ padding: 8, color: colors.ink, fontSize: 10 }}>{item.name}</Text><View style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#0008', borderRadius: 20 }}><IconButton name="close-outline" label={`Retirer ${item.name}`} colors={colors} disabled={busy} onPress={() => setAttachments(items => items.filter(file => file.id !== item.id))} /></View>
        </View>)}</ScrollView> : null}
        {importing ? <View style={{ flexDirection: 'row', gap: 10, padding: 12, alignItems: 'center' }}><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.muted, flex: 1, fontSize: 12 }}>Lecture de {importing}…</Text></View> : null}
        <GlowFrame active={runtime.busy || focused} reduced={!animate} colors={colors}>
          <View style={{ backgroundColor: colors.surface, borderRadius: tokens.radius.composer - 1, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
            <TextInput ref={input} value={draft} onChangeText={setDraft} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} multiline maxLength={9000} placeholder="Écrire à CKai…" placeholderTextColor={colors.muted} accessibilityLabel="Message à CKai"
              style={{ color: colors.ink, fontSize: 16, lineHeight: 23, minHeight: 48, maxHeight: 160, padding: 8, textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <IconButton name="add-outline" label="Joindre une photo, une vidéo ou un fichier" colors={colors} disabled={busy} onPress={() => setAttachOpen(true)} />
              <Pressable disabled={busy} onPress={() => setModelsOpen(true)} accessibilityRole="button" accessibilityLabel="Choisir le modèle" style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 7 }}>
                <Icon name="sparkles-outline" color={colors.accent} size={15} /><Text style={{ color: colors.muted, fontSize: 11 }}>{levels.find(level => level.id === runtime.preferences.level)?.title}</Text><Icon name="chevron-down" color={colors.muted} size={11} />
              </Pressable>
              <IconButton name={runtime.preferences.web === 'off' ? 'globe-outline' : 'globe'} label={`Recherche web : ${runtime.preferences.web === 'off' ? 'désactivée' : runtime.preferences.web === 'on' ? 'forcée' : 'automatique'}`} colors={colors} disabled={busy} onPress={() => { const web = runtime.preferences.web === 'auto' ? 'on' : runtime.preferences.web === 'on' ? 'off' : 'auto'; void runtime.setPreferences({ web }).catch(notifyError); }} />
              <SendControl busy={runtime.busy} enabled={!!(draft.trim()||attachments.length)&&!submitting&&!importing} onPress={()=>{void send();}} colors={colors} reduced={!animate} />
            </View>
          </View>
        </GlowFrame>
        <Text style={{ color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 9 }}>{`Web ${runtime.preferences.web === 'on' ? 'activé' : runtime.preferences.web === 'off' ? 'désactivé' : 'auto'} · ${attachments.length ? `${attachments.length} pièce(s) jointe(s)` : 'CKai peut se tromper.'}`}</Text>
      </View>
    </KeyboardAvoidingView>
    <VideoOverlay item={video} colors={colors} close={() => setVideo(null)} />
    <Sheet visible={attachOpen} title="Donne du contexte à CKai" colors={colors} onClose={() => setAttachOpen(false)}>
      <Choice title="Photos" subtitle="Analyse visuelle et lecture du texte" colors={colors} onPress={() => { void pick('photos'); }} />
      <Choice title="Prendre une photo" subtitle="Document, objet, idée sur papier…" colors={colors} onPress={() => { void pick('camera'); }} />
      <Choice title="Fichiers" subtitle="PDF texte, DOCX, tableurs, CSV et code · 12 Mo" colors={colors} onPress={() => { void pick('files'); }} />
      <Choice title="Vidéo" subtitle="Lecture native et analyse de 3 images · 80 Mo" colors={colors} onPress={() => { void pick('video'); }} />
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 20, marginVertical: 14 }}>Trois pièces jointes par message. L’analyse visuelle utilise le modèle Vision configuré dans les réglages. Les documents scannés sans texte nécessitent une photo de la page.</Text>
    </Sheet>
    <Sheet visible={modelsOpen} title="À chaque idée, son rythme." colors={colors} onClose={() => setModelsOpen(false)}>
      {levels.map(level => <Choice key={level.id} title={level.title} subtitle={level.description} selected={runtime.preferences.level === level.id} colors={colors} onPress={() => { void runtime.setPreferences({ level: level.id }).catch(notifyError); }} />)}
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 17, marginBottom: 12 }}>RÉFLEXION</Text>
      {(['courte', 'moyenne', 'profonde'] as Exclude<Effort, 'aucune'>[]).map(effort => <Choice key={effort} title={effort[0]!.toUpperCase() + effort.slice(1)} selected={runtime.preferences.effort === effort} colors={colors} onPress={() => { void runtime.setPreferences({ effort }).catch(notifyError); }} />)}
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 19, marginVertical: 16 }}>Les quotas gratuits dépendent du compte Groq. Aucun changement automatique vers un fournisseur payant.</Text>
    </Sheet>
    <Sheet visible={activityOpen} title="La requête, étape par étape." colors={colors} onClose={() => setActivityOpen(false)}>
      {runtime.activity.map((item, index) => <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 17 }}><Icon name={item.completed ? 'checkmark-circle' : 'ellipse-outline'} color={item.completed ? colors.muted : colors.accent} size={18} /><Text style={{ color: colors.ink, fontSize: 14, flex: 1 }}>{item.text}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{item.endedAt ? `${((item.endedAt - item.startedAt) / 1000).toFixed(1)} s` : '…'}</Text></View>)}
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 20, marginVertical: 15 }}>Ces étapes montrent les opérations réelles de l’application, pas les pensées internes du modèle.</Text>
    </Sheet>
    <Modal visible={drawer} transparent animationType="fade" onRequestClose={() => setDrawer(false)}>
      <View style={{ flex: 1, backgroundColor: '#0008', flexDirection: 'row' }}><View accessibilityViewIsModal style={{ width: '87%', maxWidth: 360, backgroundColor: colors.surface, paddingTop: insets.top + 15, paddingBottom: insets.bottom + 15 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 23, marginBottom: 24 }}><Logo size={33} /><Text style={{ color: colors.ink, fontSize: 22, flex: 1 }}>CKai</Text><IconButton name="close-outline" label="Fermer l’historique" colors={colors} onPress={() => setDrawer(false)} /></View>
        <View style={{ paddingHorizontal: 20 }}><PrimaryButton title="Nouvelle conversation" colors={colors} disabled={busy} onPress={() => { setDrawer(false); void runtime.openChat(null); }} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher une conversation" placeholderTextColor={colors.muted} accessibilityLabel="Rechercher une conversation" style={{ color: colors.ink, backgroundColor: colors.raised, padding: 14, borderRadius: 13, marginTop: 16, fontSize: 13 }} />
          <Pressable onPress={() => { setDrawer(false); router.push('/memory'); }} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, marginTop: 8 }}><Icon name="bulb-outline" color={colors.accent} /><Text style={{ color: colors.ink }}>Mémoire</Text></Pressable><Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 2, marginVertical: 20 }}>TES CONVERSATIONS</Text>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 12 }}>
          {runtime.chats.filter(chat => chat.title.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))).map(chat => <Pressable key={chat.id} disabled={busy} accessibilityRole="button"
            onPress={() => { setDrawer(false); void runtime.openChat(chat); }} onLongPress={() => Alert.alert('Supprimer cette conversation ?', chat.title, [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => { void runtime.deleteChat(chat.id).catch(notifyError); } }])}
            style={{ padding: 15, borderRadius: 13, backgroundColor: runtime.current?.id === chat.id ? colors.raised : 'transparent', minHeight: 52 }}><Text numberOfLines={1} style={{ color: colors.ink, fontSize: 13 }}>{chat.title}</Text></Pressable>)}
          {!runtime.chats.length ? <Text style={{ color: colors.muted, lineHeight: 22, fontSize: 13, padding: 12 }}>Les belles conversations commencent par une première question.</Text> : null}
        </ScrollView>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setDrawer(false); router.push('/settings'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderTopWidth: 1, borderColor: colors.line }}><View style={{ backgroundColor: colors.raised, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.accent }}>{runtime.preferences.name.slice(0, 2).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 14 }}>{runtime.preferences.name}</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>Profil et réglages</Text></View><Icon name="settings-outline" color={colors.muted} /></Pressable>
      </View><Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setDrawer(false)} style={{ flex: 1 }} /></View>
    </Modal>
  </View>;
}

export default function Index() {
  const runtime = useRuntime(); const colors = colorsFor(runtime.preferences.theme);
  if (!runtime.ready) return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 32, alignItems: 'center', gap: 24 }}><Logo />
    {runtime.startupError ? <><Text style={{ color: colors.ink, textAlign: 'center', lineHeight: 24 }}>{runtime.startupError}</Text><PrimaryButton title="Réessayer" colors={colors} onPress={runtime.restart} /></> : <ActivityIndicator color={colors.accent} />}
  </View>;
  if (!runtime.preferences.name) return <Profile colors={colors} />;
  return <ChatScreen colors={colors} />;
}
