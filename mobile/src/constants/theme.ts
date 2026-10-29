// Relay design tokens, from the v0 brand refresh board (Conduit R).
// Navy carries trust, teal marks the hand-off, Ember is for urgent only,
// green for verified, online and money. Relay Traders always uses the dark palette.

import { StyleSheet, useColorScheme, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { appVariant } from '@/lib/variant';

export const Colors = {
  light: {
    bg: '#FAF7F2', // app canvas, warm cream
    surface: '#FFFFFF', // cards, sheets
    surfaceMuted: '#F2EDE5', // inputs, secondary buttons, tracks
    ink: '#0D1B3E', // switchboard navy
    inkMuted: '#525D78',
    inkSubtle: '#858DA0',
    border: '#EBE5DA',

    brand: '#25479E', // main actions: a softer blue than the navy text (Daniel, 2026-10-29)
    brandPressed: '#1E3A8A',
    brandTint: '#E3E7F1',
    onBrand: '#FFFFFF',

    accent: '#1ED6C4', // "Current" teal: the hand-off moment, fills only
    accentStrong: '#008F80', // teal for icons and large text on light backgrounds
    accentTint: '#DDF6F2',
    onAccent: '#0D1B3E',

    urgent: '#E8622A', // Ember: urgent actions only. Navy text on it, not white.
    urgentPressed: '#C2410C',
    urgentTint: '#FFEDE3', // soft peach
    onUrgent: '#0D1B3E',

    success: '#177A4B', // verified, online, money in
    successStrong: '#156B45',
    successTint: '#E1F2E8',
    onSuccess: '#FFFFFF',

    warning: '#8A5A00', // expiring documents, pending approval
    warningTint: '#FDF3D3',

    danger: '#C62828',
    dangerTint: '#FCE4E4',

    scrim: 'rgba(7, 15, 36, 0.5)',
  },
  dark: {
    bg: '#070F24',
    surface: '#0D1B3E',
    surfaceMuted: '#15275A',
    ink: '#F3F4F1',
    inkMuted: '#9AA6C4',
    inkSubtle: '#6F7C9E',
    border: '#223566',

    brand: '#1ED6C4', // main actions: teal, with navy text
    brandPressed: '#17B5A6',
    brandTint: '#0F3344',
    onBrand: '#0D1B3E',

    accent: '#1ED6C4',
    accentStrong: '#1ED6C4',
    accentTint: '#0F3344',
    onAccent: '#0D1B3E',

    urgent: '#FF8A5C',
    urgentPressed: '#E8622A',
    urgentTint: '#3A2217',
    onUrgent: '#0D1B3E',

    success: '#4ADE80',
    successStrong: '#4ADE80',
    successTint: '#11301F',
    onSuccess: '#0D1B3E',

    warning: '#F5B82E',
    warningTint: '#3A2E10',

    danger: '#FF6B6B',
    dangerTint: '#3A1616',

    scrim: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type Palette = { [K in keyof (typeof Colors)['light']]: string };
export type ColorToken = keyof Palette;

export const Radii = { xs: 6, sm: 10, md: 16, lg: 20, xl: 28, pill: 999 } as const;

/** 4pt grid. */
export const Spacing = { one: 4, two: 8, three: 12, four: 16, five: 20, six: 24, eight: 32, ten: 40 } as const;

export const Layout = {
  gutter: 20,
  buttonHeight: 56,
  /** Glove-friendly minimum for the tradesperson app. */
  touchMin: 48,
  touchHero: 64,
} as const;

/** Font files loaded in the root layout. Bricolage Grotesque for headlines and numbers, Figtree for the rest. */
export const FontFiles = {
  display: { '600': 'BricolageGrotesque_600SemiBold', '700': 'BricolageGrotesque_700Bold', '800': 'BricolageGrotesque_800ExtraBold' },
  body: { '400': 'Figtree_400Regular', '500': 'Figtree_500Medium', '600': 'Figtree_600SemiBold', '700': 'Figtree_700Bold' },
} as const;

type FontRole = keyof typeof FontFiles;

/** The loaded font for a role and weight. Custom fonts carry their own weight, so styles drop fontWeight. */
export function fontFamily(role: FontRole, weight: TextStyle['fontWeight'] = '400'): string {
  const files: Record<string, string> = FontFiles[role];
  const w = weight === 'bold' ? 700 : weight === 'normal' ? 400 : Number(weight) || 400;
  const available = Object.keys(files).map(Number);
  const nearest = available.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
  return files[String(nearest)];
}

const t = (role: FontRole, fontSize: number, lineHeight: number, fontWeight: TextStyle['fontWeight'], letterSpacing = 0): TextStyle => ({
  fontFamily: fontFamily(role, fontWeight),
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing,
});

export const Type = {
  money: t('display', 44, 50, '800', -1.3),
  display: t('display', 30, 34, '800', -0.9),
  title1: t('display', 24, 29, '700', -0.5),
  title2: t('display', 20, 25, '700', -0.2),
  headline: t('display', 17, 22, '700', -0.1),
  body: t('body', 16, 24, '400'),
  bodyStrong: t('body', 16, 24, '600'),
  callout: t('body', 15, 22, '400'),
  subhead: t('body', 14, 20, '500'),
  footnote: t('body', 14, 20, '400'),
  caption: t('body', 13, 16, '600', 0.1),
  overline: t('body', 12, 16, '700', 0.9),
} as const;

const roleOf = (family: unknown): FontRole => (typeof family === 'string' && family.startsWith('Bricolage') ? 'display' : 'body');

/** Swaps a style's fontWeight for the matching font file, e.g. a caption overridden to weight 500. */
export function withFont(style: StyleProp<TextStyle>): TextStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, ...rest } = flat;
  return { ...rest, fontFamily: fontFamily(roleOf(flat.fontFamily), fontWeight) };
}

export type TypeVariant = keyof typeof Type;

/** The website's soft shadows (CSS box-shadow, which React Native now supports too). */
export const SoftShadows: Record<'soft' | 'lift', ViewStyle> = {
  soft: { boxShadow: '0 12px 32px -16px rgba(13, 27, 62, 0.18), 0 2px 6px -2px rgba(13, 27, 62, 0.06)' },
  lift: { boxShadow: '0 24px 48px -20px rgba(13, 27, 62, 0.28), 0 4px 12px -4px rgba(13, 27, 62, 0.08)' },
};

export const Shadows: Record<'card' | 'float' | 'sheet', ViewStyle> = {
  card: { shadowColor: '#0F1A2E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 3 },
  float: { shadowColor: '#0F1A2E', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 32, elevation: 8 },
  sheet: { shadowColor: '#0F1A2E', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 30, elevation: 12 },
};

/** Light or dark for this screen. Relay Traders is always dark: easy to read in a van or a dim loft. */
export function useScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  return appVariant === 'pro' || system === 'dark' ? 'dark' : 'light';
}

export function usePalette(): Palette {
  return useScheme() === 'dark' ? Colors.dark : Colors.light;
}
