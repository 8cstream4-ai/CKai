import React, { memo, useEffect } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeInDown, interpolateColor, useAnimatedStyle, useDerivedValue, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { BlurMask, Canvas, Circle, Group, LinearGradient as SkiaGradient, vec } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens, type Colors } from '../theme';

const Letter = memo(function Letter({ value, color, delay }: { value: string; color: string; delay: number }) {
  const progress = useSharedValue(0);
  useEffect(() => { progress.value = withDelay(delay, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) })); }, [progress, delay]);
  const style = useAnimatedStyle(() => ({ color: interpolateColor(progress.value, [0, 1], ['transparent', color]), textShadowColor: color, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: (1 - progress.value) * 7 }));
  return <Animated.Text accessible={false} style={style}>{value}</Animated.Text>;
});
export function RevealSpan({ text, active, colors }: { text: string; active: boolean; colors: Colors }) {
  const reduced = useReducedMotion();
  if (!active || reduced) return <>{text}</>;
  // Bounded tail keeps the number of animated native text nodes independent of conversation length.
  const tail = Math.max(0, text.length - 72); const chars = Array.from(text.slice(tail)); let offset = tail;
  return <><Text>{text.slice(0, tail)}</Text>{chars.map((value, i) => { const key = offset; offset += value.length; return <Letter key={key} value={value} color={colors.ink} delay={Math.min(i * 7, 140)} />; })}</>;
}
export function Shimmer({ text, colors, active }: { text: string; colors: Colors; active: boolean }) {
  const reduced = useReducedMotion(); const position = useSharedValue(-1);
  useEffect(() => { if (active && !reduced) position.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1); else cancelAnimation(position); return () => cancelAnimation(position); }, [active, reduced, position]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: position.value * 260 }] }));
  return <View style={{ overflow: 'hidden', flex: 1 }}><Animated.Text key={text} entering={reduced ? undefined : FadeInDown.duration(200)} numberOfLines={1} style={{ fontSize: 12, color: active ? colors.ink : colors.muted }}>{text}</Animated.Text>
    {active && !reduced ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, width: 70, opacity: 0.25 }, style]}><LinearGradient colors={['transparent', colors.ink, 'transparent']} style={{ flex: 1 }} /></Animated.View> : null}
  </View>;
}
export function AuroraOrb({ active = false, disabled = false, size = 100 }: { active?: boolean; disabled?: boolean; size?: number }) {
  const reduced = useReducedMotion(); const phase = useSharedValue(0);
  useEffect(() => { if (!reduced && !disabled) phase.value = withRepeat(withTiming(Math.PI * 2, { duration: active ? 2200 : 6800, easing: Easing.linear }), -1); else cancelAnimation(phase); return () => cancelAnimation(phase); }, [active, disabled, reduced, phase]);
  const c = size / 2; const r = size * 0.27;
  const x = useDerivedValue(() => c + Math.sin(phase.value) * size * 0.12);
  const y = useDerivedValue(() => c + Math.cos(phase.value) * size * 0.1);
  const x2 = useDerivedValue(() => c - Math.sin(phase.value + 1) * size * 0.17);
  const y2 = useDerivedValue(() => c - Math.cos(phase.value + 1) * size * 0.13);
  return <Canvas style={{ width: size, height: size }} accessibilityLabel="Orbe CKai">
    <Group><BlurMask blur={active ? 12 : 8} style="normal" /><Circle cx={x} cy={y} r={r} color="#9D7BFA" opacity={0.8} /><Circle cx={x2} cy={y2} r={r * 0.88} color="#65DDE5" opacity={0.85} /><Circle cx={c} cy={c + size * 0.11} r={r * 0.8} color="#F3A9CD" opacity={0.75} /></Group>
    <Circle cx={c} cy={c} r={size * 0.26} opacity={0.65}><SkiaGradient start={vec(c - r, c - r)} end={vec(c + r, c + r)} colors={['#E6DDFC', '#AFA7F4', '#72D9E6', '#E9B3D9']} /></Circle>
  </Canvas>;
}
export function GlowFrame({ children, active, reduced: preference, colors }: { children: React.ReactNode; active: boolean; reduced: boolean; colors: Colors }) {
  const reduced = useReducedMotion(); const rotation = useSharedValue(0);
  useEffect(() => { if (active && !reduced && !preference) rotation.value = withRepeat(withTiming(360, { duration: 6500, easing: Easing.linear }), -1); else cancelAnimation(rotation); return () => cancelAnimation(rotation); }, [active, reduced, preference, rotation]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  return <View style={{ padding: active ? 1.5 : 1, borderRadius: tokens.radius.composer, overflow: 'hidden', backgroundColor: colors.line }}>
    {active ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 1000, height: 1000, left: '50%', top: '50%', marginLeft: -500, marginTop: -500 }, style]}><LinearGradient colors={tokens.gradient} style={{ flex: 1 }} /></Animated.View> : null}
    {children}
  </View>;
}
export function Entrance({ children, delay = 0, style, reduced = false }: { children: React.ReactNode; delay?: number; style?: import('react-native').StyleProp<import('react-native').ViewStyle>; reduced?: boolean }) {
  const systemReduced = useReducedMotion(); return <Animated.View style={style} entering={reduced || systemReduced ? undefined : FadeInDown.delay(delay).duration(420).springify().damping(18)}>{children}</Animated.View>;
}
