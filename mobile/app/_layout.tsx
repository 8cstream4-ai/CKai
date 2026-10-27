import React from 'react';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';
import { RuntimeProvider } from '../src/runtime';
import { PrimaryButton } from '../src/ui';
import { palette } from '../src/theme';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <View style={{ flex: 1, backgroundColor: palette.dark.bg, padding: 30, justifyContent: 'center', gap: 25 }}>
    <Text style={{ color: palette.dark.ink, fontSize: 24 }}>CKai a rencontré une erreur.</Text>
    <Text style={{ color: palette.dark.muted, lineHeight: 24 }}>Tes conversations sauvegardées restent sur cet appareil.</Text>
    <PrimaryButton title="Relancer l’écran" colors={palette.dark} onPress={retry} />
  </View>;
}
export default function Layout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><RuntimeProvider>
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  </RuntimeProvider></SafeAreaProvider></GestureHandlerRootView>;
}
