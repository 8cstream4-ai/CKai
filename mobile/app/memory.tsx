import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import { db } from '../src/storage';
import { useRuntime } from '../src/runtime';
import { colorsFor } from '../src/theme';
import { IconButton, PrimaryButton } from '../src/ui';
export default function Memory() {
  const runtime = useRuntime(); const colors = colorsFor(runtime.preferences.theme); const insets = useSafeAreaInsets();
  const [items, setItems] = useState<{ id: string; fact: string }[]>([]); const [fact, setFact] = useState(''); const [editing, setEditing] = useState<string | null>(null);
  const refresh = async () => setItems(await (await db()).getAllAsync('SELECT id,fact FROM memories ORDER BY createdAt DESC'));
  const failed = () => Alert.alert('Mémoire', 'Impossible de modifier les données locales.');
  useEffect(() => { void refresh().catch(failed); }, []);
  return <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}><View style={{ height: 62, flexDirection: 'row', alignItems: 'center' }}><IconButton name="arrow-back-outline" label="Retour" colors={colors} onPress={() => router.back()} /><Text style={{ color: colors.ink, fontSize: 18 }}>Mémoire</Text></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}>
      <Text style={{ color: colors.muted, lineHeight: 23, marginBottom: 20 }}>Tes préférences restent sur ce téléphone. Lorsqu’elle est activée, la mémoire utile est ajoutée au contexte envoyé à Groq. Tu peux tout consulter, modifier et supprimer ici.</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}><Text style={{ flex: 1, color: colors.ink }}>Utiliser la mémoire</Text><Switch value={runtime.preferences.memory} accessibilityLabel="Utiliser la mémoire" onValueChange={memory => { void runtime.setPreferences({ memory }).catch(failed); }} /></View>
      <TextInput value={fact} onChangeText={setFact} multiline maxLength={1000} placeholder="Une préférence à retenir…" placeholderTextColor={colors.muted} accessibilityLabel="Souvenir à enregistrer" style={{ minHeight: 100, color: colors.ink, backgroundColor: colors.surface, padding: 16, borderRadius: 16, marginBottom: 12 }} />
      <PrimaryButton colors={colors} disabled={!fact.trim()} title={editing ? 'Modifier le souvenir' : 'Ajouter un souvenir'} onPress={() => { void (async () => { if (editing) await (await db()).runAsync('UPDATE memories SET fact=? WHERE id=?', fact.trim(), editing); else await (await db()).runAsync('INSERT INTO memories(id,fact,createdAt) VALUES (?,?,?)', randomUUID(), fact.trim(), Date.now()); setFact(''); setEditing(null); await refresh(); })().catch(failed); }} />
      {items.map(item => <View key={item.id} style={{ backgroundColor: colors.surface, padding: 15, borderRadius: 16, marginTop: 14 }}><Text selectable style={{ color: colors.ink, lineHeight: 24 }}>{item.fact}</Text><View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}><IconButton name="pencil-outline" label="Modifier ce souvenir" colors={colors} onPress={() => { setFact(item.fact); setEditing(item.id); }} /><IconButton name="trash-outline" label="Supprimer ce souvenir" colors={colors} onPress={() => Alert.alert('Supprimer ce souvenir ?', item.fact, [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => { void db().then(connection => connection.runAsync('DELETE FROM memories WHERE id=?', item.id)).then(refresh).catch(failed); } }])} /></View></View>)}
      {!items.length ? <Text style={{ color: colors.muted, lineHeight: 23, marginTop: 25 }}>Aucun souvenir enregistré.</Text> : null}
    </ScrollView></View>;
}
