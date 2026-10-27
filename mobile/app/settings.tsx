import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRuntime } from '../src/runtime';
import { colorsFor, tokens } from '../src/theme';
import { Choice, IconButton, Logo, PrimaryButton } from '../src/ui';
import type { Preferences } from '../src/storage';

export default function Settings() {
  const runtime = useRuntime(); const colors = colorsFor(runtime.preferences.theme); const insets = useSafeAreaInsets();
  const [name, setName] = useState(runtime.preferences.name); const [apiKey, setApiKey] = useState('');
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
      <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 2, marginTop: 25, marginBottom: 16 }}>CONNEXION À GROQ</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 22, marginBottom: 16 }}>La clé intégrée est chargée dans le stockage sécurisé au premier démarrage. Laisse ce champ vide pour la conserver.</Text>
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
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 21, marginTop: 28 }}>Modèles : GPT-OSS 20B et 120B.{ '\n' }Fenêtre de contexte limitée à environ 10 000 caractères dans cette première version. L’historique complet reste sur l’appareil.{ '\n\n' }CKai 0.2 · Application de test privée.{ '\n' }Le partage d’une réponse passe par le sélecteur Android et reste à ton initiative.</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}
