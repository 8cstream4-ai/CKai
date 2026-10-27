import React, { memo, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import * as Clipboard from 'expo-clipboard';
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
const MessageRow = memo(function MessageRow({ message, colors, latest, busy, onRetry }: {
  message: StoredMessage; colors: Colors; latest: boolean; busy: boolean; onRetry(id: string): void;
}) {
  if (message.role === 'user') return <View style={{ alignItems: 'flex-end', marginBottom: 27, marginTop: 10 }}>
    <Pressable accessibilityLabel="Ton message. Appui long pour copier." onLongPress={() => { void copy(message.content); }}
      style={{ maxWidth: '85%', backgroundColor: colors.user, paddingHorizontal: 18, paddingVertical: 13, borderRadius: tokens.radius.bubble, borderBottomRightRadius: 6 }}>
      <Text selectable style={{ color: colors.ink, fontSize: 16, lineHeight: 24 }}>{message.content}</Text>
    </Pressable>
  </View>;
  return <View style={{ marginBottom: 26 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 15 }}><Logo size={25} /><Text style={{ color: colors.ink, fontSize: 12, fontWeight: '600' }}>CKai</Text></View>
    <Markdown content={message.content} colors={colors} />
    {!message.content && message.state === 'streaming' ? <ActivityIndicator color={colors.accent} style={{ alignSelf: 'flex-start', marginVertical: 10 }} /> : null}
    {message.error || message.state === 'interrupted' ? <View style={{ backgroundColor: colors.surface, padding: 14, marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line }}><Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 13, lineHeight: 21 }}>{message.error || 'La génération a été interrompue à la fermeture de l’application. Tu peux réessayer.'}</Text></View> : null}
    {message.state === 'stopped' ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 12 }}>Réponse arrêtée · texte conservé</Text> : null}
    {message.state !== 'streaming' ? <View style={{ flexDirection: 'row', marginLeft: -10, marginTop: 5 }}>
      {message.content ? <><IconButton name="copy-outline" label="Copier la réponse" colors={colors} onPress={() => { void copy(message.content); }} /><IconButton name="share-outline" label="Partager la réponse" colors={colors} onPress={() => { void Share.share({ message: message.content }).catch(notifyError); }} /></> : null}
      {latest ? <IconButton name="refresh-outline" label="Régénérer" colors={colors} disabled={busy} onPress={() => onRetry(message.id)} /> : null}
    </View> : null}
  </View>;
});

function Profile({ colors }: { colors: Colors }) {
  const runtime = useRuntime(); const [name, setName] = useState(''); const [saving, setSaving] = useState(false);
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg, padding: 30, justifyContent: 'center' }}>
    <Logo size={76} /><Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 3, marginTop: 35 }}>BIENVENUE CHEZ CKAI</Text>
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

function ChatScreen({ colors }: { colors: Colors }) {
  const runtime = useRuntime(); const insets = useSafeAreaInsets(); const { height } = useWindowDimensions();
  const [draft, setDraft] = useState(''); const [drawer, setDrawer] = useState(false); const [search, setSearch] = useState('');
  const [modelsOpen, setModelsOpen] = useState(false); const [activityOpen, setActivityOpen] = useState(false);
  const [atBottom, setAtBottom] = useState(true); const [submitting, setSubmitting] = useState(false);
  const list = useRef<FlashListRef<StoredMessage>>(null); const input = useRef<TextInput>(null);
  const following = useRef(true); const draftReady = useRef(false); const draftSnapshot = useRef(draft); draftSnapshot.current = draft;
  const draftId = runtime.current?.id ?? 'new';
  useEffect(() => {
    let disposed = false; draftReady.current = false;
    void db().then(async connection => {
      await connection.execAsync('CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL)');
      const row = await connection.getFirstAsync<{ content: string }>('SELECT content FROM drafts WHERE id=?', draftId);
      if (!disposed) { setDraft(row?.content ?? ''); draftReady.current = true; }
    }).catch(() => { if (!disposed) { setDraft(''); draftReady.current = true; } });
    following.current = true; setAtBottom(true);
    return () => { disposed = true; };
  }, [draftId]);
  useEffect(() => {
    if (!draftReady.current) return;
    const timer = setTimeout(() => {
      void db().then(connection => connection.runAsync('INSERT OR REPLACE INTO drafts(id,content) VALUES (?,?)', draftId, draft)).catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, draftId]);
  const busy = runtime.busy || submitting;
  async function send() {
    if (runtime.busy) { runtime.stop(); return; }
    if (!draft.trim() || submitting) return;
    setSubmitting(true); Keyboard.dismiss(); following.current = true; setAtBottom(true);
    const captured = draft;
    try {
      if (await runtime.send(captured)) {
        setDraft('');
        await (await db()).runAsync('DELETE FROM drafts WHERE id IN (?,?)', draftId, runtime.current?.id ?? draftId);
      }
    } catch { notifyError(); } finally { setSubmitting(false); }
  }
  const lastMessageId = runtime.messages.at(-1)?.id;
  const currentActivity = runtime.activity.at(-1)?.text;
  const greeting = new Date().getHours() >= 18 || new Date().getHours() < 5 ? 'Bonsoir' : 'Bonjour';
  return <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
    <StatusBar style={runtime.preferences.theme === 'light' ? 'dark' : 'light'} />
    <View style={{ height: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
      <IconButton name="menu-outline" label="Historique" colors={colors} onPress={() => setDrawer(true)} />
      <Text numberOfLines={1} style={{ color: colors.ink, flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '500', paddingHorizontal: 10 }}>{runtime.current?.title || 'CKai'}</Text>
      <IconButton name="create-outline" label="Nouvelle conversation" disabled={busy} colors={colors} onPress={() => { void runtime.openChat(null); }} />
    </View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1 }}>
        <FlashList ref={list} data={runtime.messages} keyExtractor={message => message.id} getItemType={message => message.role}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 }}
          onScroll={event => { const { contentSize, contentOffset, layoutMeasurement } = event.nativeEvent; following.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 100; setAtBottom(following.current); }} scrollEventThrottle={64}
          onContentSizeChange={() => { if (following.current) list.current?.scrollToEnd({ animated: false }); }}
          renderItem={({ item }) => <MessageRow message={item} colors={colors} latest={item.id === lastMessageId} busy={busy} onRetry={id => { void runtime.retry(id); }} />}
          ListEmptyComponent={<View style={{ minHeight: Math.max(340, height - insets.top - insets.bottom - 265), justifyContent: 'center', paddingTop: 25, paddingBottom: 30 }}>
            <View style={{ alignItems: 'center' }}><Orb /><Text style={{ color: colors.muted, fontSize: 9, letterSpacing: 2.5, marginBottom: 15 }}>UN PEU DE CLARTÉ, BEAUCOUP DE POSSIBLES</Text>
              <Text accessibilityRole="header" style={{ fontSize: 33, lineHeight: 42, color: colors.ink, textAlign: 'center', fontFamily: tokens.font.answer }}>{greeting}, {runtime.preferences.name}.{ '\n' }On explore une idée ?</Text>
              <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13, lineHeight: 21, marginTop: 15, marginBottom: 28 }}>Une question, une intuition, un projet.{ '\n' }Fais de la place à ce qui t’inspire.</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{prompts.map(prompt => <Pressable key={prompt.title} accessibilityRole="button" onPress={() => { setDraft(prompt.prompt); input.current?.focus(); }}
              style={({ pressed }) => ({ width: '48%', minHeight: 100, borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 15, backgroundColor: pressed ? colors.surface : 'transparent' })}>
              <Icon name={prompt.icon} color={colors.accent} size={18} /><Text style={{ color: colors.ink, fontSize: 12, fontWeight: '500', marginTop: 10 }}>{prompt.title}</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 5, lineHeight: 15 }}>{prompt.detail}</Text>
            </Pressable>)}</View>
          </View>} />
        {!atBottom && runtime.messages.length ? <View style={{ position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.line }}>
          <IconButton name="arrow-down-outline" label="Dernier message" colors={colors} onPress={() => { following.current = true; list.current?.scrollToEnd({ animated: true }); }} />
        </View> : null}
      </View>
      {runtime.activity.length ? <Pressable accessibilityRole="button" accessibilityLabel="Voir les étapes de la requête" onPress={() => setActivityOpen(true)} style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, gap: 9 }}>
        {runtime.busy ? <ActivityIndicator size="small" color={colors.accent} /> : <Icon name="checkmark-circle-outline" color={colors.muted} size={15} />}
        <Text accessibilityLiveRegion="polite" numberOfLines={1} style={{ flex: 1, color: colors.muted, fontSize: 11 }}>{runtime.busy ? currentActivity : 'Étapes de la requête'}</Text><Icon name="chevron-forward" color={colors.muted} size={13} />
      </Pressable> : null}
      <View style={{ paddingHorizontal: 12, paddingTop: 7, paddingBottom: Math.max(insets.bottom, 12) }}>
        <LinearGradient colors={busy ? tokens.gradient : [colors.line, colors.line]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 1, borderRadius: tokens.radius.composer }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: tokens.radius.composer - 1, paddingHorizontal: 15, paddingTop: 9, paddingBottom: 8 }}>
            <TextInput ref={input} value={draft} onChangeText={setDraft} multiline maxLength={9000} placeholder="Écrire à CKai…" placeholderTextColor={colors.muted} accessibilityLabel="Message à CKai"
              style={{ color: colors.ink, fontSize: 16, lineHeight: 23, minHeight: 49, maxHeight: 160, padding: 7, textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable disabled={busy} onPress={() => setModelsOpen(true)} accessibilityRole="button" accessibilityLabel="Choisir le modèle" style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 7 }}>
                <Icon name="sparkles-outline" color={colors.accent} size={15} /><Text style={{ color: colors.muted, fontSize: 11 }}>{levels.find(level => level.id === runtime.preferences.level)?.title} · GPT-OSS</Text><Icon name="chevron-down" color={colors.muted} size={11} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={runtime.busy ? 'Arrêter la réponse' : 'Envoyer'} disabled={!runtime.busy && (!draft.trim() || submitting)} onPress={() => { void send(); }} style={({ pressed }) => ({ width: 48, height: 48, justifyContent: 'center', alignItems: 'center', opacity: pressed ? 0.6 : !runtime.busy && !draft.trim() ? 0.3 : 1 })}>
                <View style={{ backgroundColor: colors.ink, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}><Icon name={runtime.busy ? 'stop' : 'arrow-up'} color={colors.bg} size={runtime.busy ? 14 : 21} /></View>
              </Pressable>
            </View>
          </View>
        </LinearGradient>
        <Text style={{ color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 9 }}>Groq · CKai peut se tromper. Garde ton esprit critique.</Text>
      </View>
    </KeyboardAvoidingView>
    <Sheet visible={modelsOpen} title="À chaque idée, son rythme." colors={colors} onClose={() => setModelsOpen(false)}>
      {levels.map(level => <Choice key={level.id} title={level.title} subtitle={level.description} selected={runtime.preferences.level === level.id} colors={colors} onPress={() => { void runtime.setPreferences({ level: level.id }).catch(notifyError); }} />)}
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 17, marginBottom: 12 }}>RÉFLEXION</Text>
      {(['courte', 'moyenne', 'profonde'] as Exclude<Effort, 'aucune'>[]).map(effort => <Choice key={effort} title={effort[0]!.toUpperCase() + effort.slice(1)} selected={runtime.preferences.effort === effort} colors={colors} onPress={() => { void runtime.setPreferences({ effort }).catch(notifyError); }} />)}
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 19, marginVertical: 16 }}>Les quotas gratuits dépendent du compte Groq. Aucun changement automatique vers un fournisseur payant.</Text>
    </Sheet>
    <Sheet visible={activityOpen} title="La requête, étape par étape." colors={colors} onClose={() => setActivityOpen(false)}>
      {runtime.activity.map((item, index) => <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 17 }}><Icon name={item.completed ? 'checkmark-circle' : 'ellipse-outline'} color={item.completed ? colors.muted : colors.accent} size={18} /><Text style={{ color: colors.ink, fontSize: 14, flex: 1 }}>{item.text}</Text></View>)}
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 20, marginVertical: 15 }}>Ces étapes montrent les opérations réelles de l’application, pas les pensées internes du modèle.</Text>
    </Sheet>
    <Modal visible={drawer} transparent animationType="fade" onRequestClose={() => setDrawer(false)}>
      <View style={{ flex: 1, backgroundColor: '#0008', flexDirection: 'row' }}><View accessibilityViewIsModal style={{ width: '87%', maxWidth: 360, backgroundColor: colors.surface, paddingTop: insets.top + 15, paddingBottom: insets.bottom + 15 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 23, marginBottom: 24 }}><Logo size={33} /><Text style={{ color: colors.ink, fontSize: 22, flex: 1 }}>CKai</Text><IconButton name="close-outline" label="Fermer l’historique" colors={colors} onPress={() => setDrawer(false)} /></View>
        <View style={{ paddingHorizontal: 20 }}><PrimaryButton title="Nouvelle conversation" colors={colors} disabled={busy} onPress={() => { setDrawer(false); void runtime.openChat(null); }} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher une conversation" placeholderTextColor={colors.muted} accessibilityLabel="Rechercher une conversation" style={{ color: colors.ink, backgroundColor: colors.raised, padding: 14, borderRadius: 13, marginTop: 16, fontSize: 13 }} />
          <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 2, marginVertical: 20 }}>TES CONVERSATIONS</Text>
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
