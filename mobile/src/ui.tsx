import React, { useEffect } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens, type Colors } from './theme';

export type IconName = keyof typeof Ionicons.glyphMap;
export function Icon({ name, color, size = 21 }: { name: IconName; color: string; size?: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}
export function IconButton({ name, label, onPress, colors, disabled = false }: {
  name: IconName; label: string; onPress(): void; colors: Colors; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: pressed ? colors.raised : 'transparent', opacity: disabled ? 0.4 : 1 })}>
    <Icon name={name} color={colors.ink} />
  </Pressable>;
}
export function Logo({ size = 76 }: { size?: number }) {
  return <Image source={require('../assets/icon.png')} accessibilityLabel="CKai" style={{ width: size, height: size, borderRadius: size * 0.3 }} />;
}
export function Orb({ active = false }: { active?: boolean }) {
  const scale = useSharedValue(1); const reduced = useReducedMotion();
  useEffect(() => {
    if (!reduced) scale.value = withRepeat(withTiming(1.07, { duration: active ? 1100 : 2800 }), -1, true);
    else { cancelAnimation(scale); scale.value = 1; }
    return () => cancelAnimation(scale);
  }, [active, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[{ width: 90, height: 90, justifyContent: 'center', alignItems: 'center', marginBottom: 30 }, style]}>
    <LinearGradient colors={tokens.gradient} style={{ position: 'absolute', inset: 0, borderRadius: 32, opacity: 0.4 }} />
    <Logo size={78} />
  </Animated.View>;
}
export function Sheet({ visible, title, onClose, colors, children }: {
  visible: boolean; title: string; onClose(): void; colors: Colors; children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' }}>
      <Pressable accessibilityLabel="Fermer" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={{ maxHeight: '86%', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 16 }}>
        <View style={{ alignItems: 'center', paddingTop: 10 }}><View style={{ width: 34, height: 4, backgroundColor: colors.muted, borderRadius: 3 }} /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 24, paddingRight: 9, paddingVertical: 9 }}>
          <Text accessibilityRole="header" style={{ flex: 1, color: colors.ink, fontSize: 23, fontFamily: tokens.font.answer }}>{title}</Text>
          <IconButton name="close-outline" label="Fermer" onPress={onClose} colors={colors} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24 }}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}
export function Choice({ title, subtitle, selected, onPress, colors, disabled = false }: {
  title: string; subtitle?: string; selected?: boolean; onPress(): void; colors: Colors; disabled?: boolean;
}) {
  return <Pressable disabled={disabled} accessibilityRole="radio" accessibilityState={{ selected: !!selected, disabled }} onPress={onPress}
    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 64, padding: 15, marginBottom: 9, borderRadius: 17, borderWidth: 1, borderColor: selected ? colors.accent : colors.line, backgroundColor: pressed || selected ? colors.raised : colors.surface, opacity: disabled ? 0.4 : 1 })}>
    <View style={{ flex: 1 }}><Text style={{ fontSize: 14, color: colors.ink, fontWeight: '500' }}>{title}</Text>{subtitle ? <Text style={{ fontSize: 12, color: colors.muted, marginTop: 5, lineHeight: 18 }}>{subtitle}</Text> : null}</View>
    {selected ? <Icon name="checkmark-circle" color={colors.accent} size={22} /> : null}
  </Pressable>;
}
export function PrimaryButton({ title, onPress, colors, disabled = false }: { title: string; onPress(): void; colors: Colors; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 52, borderRadius: 17, justifyContent: 'center', alignItems: 'center', padding: 14, backgroundColor: colors.ink, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
    <Text style={{ color: colors.bg, fontSize: 14, fontWeight: '600' }}>{title}</Text>
  </Pressable>;
}
