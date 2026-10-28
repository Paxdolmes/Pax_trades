import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    text: '#0B0D12',
    textSecondary: '#5B616E',
    background: '#FFFFFF',
    surface: '#F2F4F7',
    border: '#D9DDE3',
    accent: '#1F4FD8',
    accentText: '#FFFFFF',
    urgent: '#C2410C',
    good: '#15803D',
  },
  dark: {
    text: '#F4F5F7',
    textSecondary: '#A3A9B5',
    background: '#0B0D12',
    surface: '#1A1D24',
    border: '#2C313B',
    accent: '#6E8EFF',
    accentText: '#0B0D12',
    urgent: '#FB923C',
    good: '#4ADE80',
  },
} as const;

export type Palette = (typeof Colors)['light' | 'dark'];

export const Spacing = {
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
} as const;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? Colors.dark : Colors.light;
}
