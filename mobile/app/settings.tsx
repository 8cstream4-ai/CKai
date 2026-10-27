import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRuntime } from '../src/runtime';
import { colorsFor, tokens } from '../src/theme';
import { Choice, IconButton, Logo, PrimaryButton } from '../src/ui';
import type { Preferences } from '../src/storage';

export default function Settings() {
  const runtime = useRuntime(); const colors = colorsFor(runtime.preferences.theme); const insets = useSafeAreaInsets();
  const [name, setName] = useState(runtime.preferences.name); const [apiKey, setApiKey] = useState('');
  const [tavily, setTavily] = useState(''); const [visionModel, setVisionModel] = useState(runtime.preferences.visionModel); const [instructions, setInstructions] = useState(runtime.preferences.instructions);
  const [working, setWorking] = useState(false); const [result, setResult] = useState('');
  const failed = () => Alert.alert('Réglage non enregistré', 'Réessaie et vérifie l’espace de stockage.');
  const inputStyle = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 15, fontSize: 16, color: colors.ink };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
    <View style={{ height: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}><IconButton name="arrow-back-outline" label="Retour au chat" colors={colors} onPress={() => router.back()} /><Text style={{ color: colors.ink, fontSize: 16, marginLeft: 10 }}>Réglages</Text></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}>
      <Logo size={48} /><Text accessibilityRole="header" style={{ color: colors.ink, fontFamily: tokens.font.answer, fontSize: 32, marginTop: 25, marginBottom: 10 }}>Ton espace, tes choix.</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 22, marginBottom: 30 }}>Un profil local et un accès direct à Groq.{ '\n' }Aucun serveur CKai ne conserve tes conversations.</Text>
      <Text style={{ color: colors.ink, fontSize: 13, marginBottom: 12 }}>Prénom ou pseudo</Text>
      <TextInput value={name} onChangeText={setName} maxLength={40} accessibilityLabel="Prénom ou pseudo" style={inputStyle} />
      <View style={{ marginTop: 12 }}><PrimaryButton title="Enregistrer le prénom" colors={colors} disabled={!name.trim()} onPress={() => { void runtime.setPreferences({ name: name.trim() }).then(() => Alert.alert('Profil', 'Prénom enregistré.')).catch(failed); }} /></View>
      <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 2, marginTop: 35, marginBottom: 16 }}>APPARENCE</Text>
      {(['dark', 'light', 'amoled'] as Preferences['theme'][]).map(theme => <Choice key={theme} title={{ dark: 'Sombre', light: 'Crème', amoled: 'AMOLED' }[theme]} selected={runtime.preferences.theme === theme} colors={colors} onPress={() => { void runtime.setPreferences({ theme }).catch(failed); }} />)}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 15 }}><Text style={{ color: colors.ink, flex: 1, fontSize: 14 }}>Retour haptique</Text><Switch accessibilityLabel="Retour haptique" value={runtime.preferences.haptics} onValueChange={haptics => { void runtime.setPreferences({ haptics }).catch(failed); }} trackColor={{ true: colors.accent }} /></View>
      <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 2, marginTop: 25, marginBottom: 16 }}>ANIMATIONS</Text>
      <Choice title="Fluides" subtitle="Lettres dévoilées, flou progressif, orbe et lueurs" selected={runtime.preferences.animations !== 'reduced'} colors={colors} onPress={() => { void runtime.setPreferences({ animations: 'normal' }).catch(failed); }} />
      <Choice title="Réduites" subtitle="Interface stable, sans effets continus" selected={runtime.preferences.animations === 'reduced'} colors={colors} onPress={() => { void runtime.setPreferences({ animations: 'reduced' }).catch(failed); }} />
      <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 2, marginTop: 25, marginBottom: 16 }}>RECHERCHE WEB</Text>
      {(['auto','on','off'] as const).map(web => <Choice key={web} title={{ auto: 'Automatique', on: 'À chaque question', off: 'Désactivée' }[web]} subtitle={web === 'auto' ? 'CKai décide quand chercher.' : undefined} selected={runtime.preferences.web === web} colors={colors} onPress={() => { void runtime.setPreferences({ web }).catch(failed); }} />)}
      <Text style={{ color: colors.muted, lineHeight: 21, fontSize: 12, marginVertical: 15 }}>La recherche utilise le navigateur intégré de Groq, selon les quotas de ton compte. Pour des résultats structurés avec extraits et cartes de sources, tu peux configurer Tavily. Rien ne bascule automatiquement vers un service payant.</Text>
      <TextInput value={tavily} onChangeText={setTavily} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Clé Tavily facultative" placeholderTextColor={colors.muted} accessibilityLabel="Clé Tavily" style={inputStyle} />
      <View style={{ marginTop: 12, marginBottom: 8 }}><PrimaryButton title="Enregistrer Tavily" disabled={!tavily.trim()} colors={colors} onPress={() => { void SecureStore.setItemAsync('ckai.tavily', tavily.trim()).then(() => { setTavily(''); Alert.alert('Recherche', 'Clé enregistrée. La prochaine recherche utilisera Tavily.'); }).catch(failed); }} /></View>
      <PrimaryButton title="Utiliser seulement Groq" colors={colors} onPress={() => { void SecureStore.deleteItemAsync('ckai.tavily').then(() => Alert.alert('Recherche', 'Tavily désactivé.')).catch(failed); }} />
      <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 2, marginTop: 28, marginBottom: 16 }}>VISION ET CONTEXTE</Text>
      <TextInput value={visionModel} onChangeText={setVisionModel} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Modèle Groq pour les images" style={inputStyle} />
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 21, marginVertical: 12 }}>Les images et les images prélevées dans les vidéos sont analysées par ce modèle, puis leur description rejoint le contexte de GPT-OSS. Vérifie sa disponibilité dans ton compte Groq.</Text>
      <TextInput value={instructions} onChangeText={setInstructions} multiline maxLength={6000} placeholder="Tes instructions personnalisées…" placeholderTextColor={colors.muted} accessibilityLabel="Instructions personnalisées" style={[inputStyle, { minHeight: 120, textAlignVertical: 'top' }]} />
      <View style={{ marginTop: 12 }}><PrimaryButton title="Enregistrer les réglages IA" disabled={!visionModel.trim()} colors={colors} onPress={() => { void runtime.setPreferences({ visionModel: visionModel.trim(), instructions }).then(() => Alert.alert('IA', 'Réglages enregistrés.')).catch(failed); }} /></View>
      <View style={{ marginTop: 12 }}><PrimaryButton title="Consulter la mémoire" colors={colors} onPress={() => router.push('/memory')} /></View>
      <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 2, marginTop: 25, marginBottom: 16 }}>CONNEXION À GROQ</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 22, marginBottom: 16 }}>La clé Groq est conservée dans le stockage sécurisé. Si ce build a été préconfiguré, sa clé est chargée au premier démarrage. Laisse le champ vide pour tester la clé actuelle.</Text>
      <TextInput value={apiKey} onChangeText={setApiKey} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" accessibilityLabel="Clé Groq de remplacement" placeholder="Clé actuelle conservée" placeholderTextColor={colors.muted} style={inputStyle} />
      <View style={{ marginTop: 13 }}><PrimaryButton colors={colors} disabled={working || runtime.busy} title={working ? 'Vérification…' : 'Tester la connexion'} onPress={() => {
        setWorking(true); setResult('');
        void (async () => {
          try { setResult(await runtime.testKey(apiKey)); setApiKey(''); }
          catch (error) { setResult(error instanceof Error ? error.message : 'Connexion impossible.'); }
          finally { setWorking(false); }
        })();
      }} /></View>
      {result ? <Text accessibilityLiveRegion="polite" style={{ color: colors.ink, lineHeight: 22, fontSize: 13, marginTop: 18 }}>{result}</Text> : null}
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 21, marginTop: 28 }}>Modèles : GPT-OSS 20B et 120B.{ '\n' }Contexte glissant jusqu’à 32 000 caractères, résumé des échanges anciens et extraits pertinents des documents. L’historique complet et les fichiers restent sur l’appareil.{ '\n\n' }CKai 0.4 · Application de test privée.{ '\n' }Le partage d’une réponse passe par le sélecteur Android et reste à ton initiative.</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}
