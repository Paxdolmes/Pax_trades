import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing, usePalette } from '@/constants/theme';

export function Screen({ children }: { children: ReactNode }) {
  const c = usePalette();
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={styles.screen}>{children}</ScrollView>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const c = usePalette();
  return <Text style={[styles.title, { color: c.text }]}>{children}</Text>;
}

export function Body({ children, secondary, style, ...rest }: TextProps & { secondary?: boolean }) {
  const c = usePalette();
  return (
    <Text {...rest} style={[styles.body, { color: secondary ? c.textSecondary : c.text }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, onPress, selected }: { children: ReactNode; onPress?: () => void; selected?: boolean }) {
  const c = usePalette();
  const box = [
    styles.card,
    { backgroundColor: c.surface, borderColor: selected ? c.accent : c.border },
  ];
  if (!onPress) return <View style={box}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [box, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

export function Button({ label, onPress, disabled, tone = 'accent' }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'accent' | 'urgent';
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tone === 'urgent' ? c.urgent : c.accent, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
      ]}>
      <Text style={[styles.buttonLabel, { color: c.accentText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: Spacing.three, gap: Spacing.three },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  card: { borderWidth: 1.5, borderRadius: 12, padding: Spacing.three, gap: Spacing.one },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonLabel: { fontSize: 17, fontWeight: '600' },
});
