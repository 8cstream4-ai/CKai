import { Platform } from 'react-native';
import type { Preferences } from './storage';

export const palette = {
  dark: { bg: '#151515', surface: '#202020', raised: '#292929', ink: '#ECEAE7', muted: '#96938E', line: '#FFFFFF15', accent: '#C6B4F4', user: '#2D2D2D' },
  light: { bg: '#FAF8F4', surface: '#F0EDE8', raised: '#E9E5DF', ink: '#252320', muted: '#817A71', line: '#00000012', accent: '#7960B4', user: '#EAE6DF' },
  amoled: { bg: '#000000', surface: '#131313', raised: '#222222', ink: '#ECEAE7', muted: '#96938E', line: '#FFFFFF18', accent: '#C6B4F4', user: '#242424' },
};
export type Colors = typeof palette.dark;
export const tokens = {
  radius: { bubble: 20, composer: 28, sheet: 28, card: 18, chip: 12 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  font: { ui: undefined, answer: Platform.select({ android: 'serif', ios: 'Georgia' }), mono: Platform.select({ android: 'monospace', ios: 'Menlo' }) },
  motion: { short: 160, normal: 240, long: 500 },
  gradient: ['#C0A5F3', '#8DCCED', '#DCA8C6'] as const,
};
export function colorsFor(theme: Preferences['theme']): Colors { return palette[theme]; }
