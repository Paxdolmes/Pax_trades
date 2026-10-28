// Relay design tokens, ported from the v0 design boards.
// One palette for both apps: Relay Blue for actions, Ember for urgent only,
// green for verified, online and money.

import { Platform, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

export const Colors = {
  light: {
    bg: '#F5F5F2', // app canvas, warm grey
    surface: '#FFFFFF', // cards, sheets
    surfaceMuted: '#EDEDE9', // inputs, secondary buttons, tracks
    ink: '#0F1A2E',
    inkMuted: '#5A6375',
    inkSubtle: '#8C93A1',
    border: '#E3E2DD',

    brand: '#1B44C4',
    brandPressed: '#14359D',
    brandTint: '#E8EDFB',
    onBrand: '#FFFFFF',

    urgent: '#E8622A', // urgent actions only
    urgentPressed: '#C94F1C',
    urgentTint: '#FCEDE5',

    success: '#1E8A5A', // verified, online, money in
    successStrong: '#156B45',
    successTint: '#E3F2EA',

    warning: '#8A5A00', // expiring documents, pending approval
    warningTint: '#FDF3D3',

    danger: '#C62828',
    dangerTint: '#FCE4E4',

    scrim: 'rgba(10, 16, 28, 0.48)',
  },
  dark: {
    bg: '#0A0F1A',
    surface: '#131B2A',
    surfaceMuted: '#1C2537',
    ink: '#F1F3F7',
    inkMuted: '#A2AABB',
    inkSubtle: '#6E7789',
    border: '#243049',

    brand: '#4A73EE',
    brandPressed: '#3B63DB',
    brandTint: '#18264A',
    onBrand: '#FFFFFF',

    urgent: '#F47236',
    urgentPressed: '#DC6129',
    urgentTint: '#3A2217',

    success: '#3BBF84',
    successStrong: '#3BBF84',
    successTint: '#12291F',

    warning: '#F2C14E',
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

const font = Platform.select({ ios: 'System', default: undefined });

const t = (fontSize: number, lineHeight: number, fontWeight: TextStyle['fontWeight'], letterSpacing = 0): TextStyle => ({
  fontFamily: font,
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing,
});

export const Type = {
  money: t(44, 50, '800', -1.1),
  display: t(30, 36, '700', -0.8),
  title1: t(24, 30, '700', -0.5),
  title2: t(20, 26, '600', -0.3),
  headline: t(17, 22, '600', -0.2),
  body: t(16, 24, '400', -0.1),
  bodyStrong: t(16, 24, '600', -0.1),
  callout: t(15, 22, '400', -0.1),
  subhead: t(14, 20, '500'),
  footnote: t(14, 20, '400'),
  caption: t(13, 16, '600', 0.1),
  overline: t(12, 16, '700', 0.8),
} as const;

export type TypeVariant = keyof typeof Type;

export const Shadows: Record<'card' | 'float' | 'sheet', ViewStyle> = {
  card: { shadowColor: '#0F1A2E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 3 },
  float: { shadowColor: '#0F1A2E', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 32, elevation: 8 },
  sheet: { shadowColor: '#0F1A2E', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 30, elevation: 12 },
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? Colors.dark : Colors.light;
}
