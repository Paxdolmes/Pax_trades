import { router } from 'expo-router';
import { ArrowRight, Award, BadgePoundSterling, Check, ChevronLeft, Flame, Percent, Timer, Wrench, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { Button, Footer, IconButton, Screen, T, type LucideIcon } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { FOUNDING_COMMISSION, STANDARD_COMMISSION, type Trade } from '@/domain/catalog';

const STEPS = ['Details', 'Documents', 'ID check', 'Bank details'];

const TRADES: { key: Trade; label: string; icon: LucideIcon }[] = [
  { key: 'plumbing', label: 'Plumber', icon: Wrench },
  { key: 'heating', label: 'Gas Safe engineer', icon: Flame },
  { key: 'electrical', label: 'Electrician', icon: Zap },
];

const PERKS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: BadgePoundSterling, title: 'No joining or lead fees', body: 'You only pay when you get paid' },
  {
    icon: Percent,
    title: `${FOUNDING_COMMISSION * 100}% commission for 6 months`,
    body: `Founding rate, then ${STANDARD_COMMISSION * 100}%`,
  },
  { icon: Timer, title: 'Paid within 48 hours', body: 'Straight to your bank after each job' },
];

export default function Apply() {
  const c = usePalette();
  const [selected, setSelected] = useState<Trade[]>(['plumbing', 'heating']);
  const current = 0;

  return (
    <Screen
      background="surface"
      footer={
        <Footer>
          <Button label="Continue to documents" trailingIcon={ArrowRight} disabled={!selected.length} onPress={() => router.navigate('/documents')} />
        </Footer>
      }>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} tone="muted" />
        <Wordmark size={22} traders />
        <View style={{ width: 44 }} />
      </View>

      <View style={{ gap: Spacing.three }}>
        <T variant="title1" style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole="header">
          Apply to join Relay Traders
        </T>
        <View accessibilityLabel={`Step ${current + 1} of ${STEPS.length}: ${STEPS[current]}`} style={{ gap: Spacing.two }}>
          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <View key={s} style={[styles.stepBar, { backgroundColor: i < current ? c.success : i === current ? c.brand : c.surfaceMuted }]} />
            ))}
          </View>
          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <T key={s} variant="caption" color={i === current ? 'ink' : 'inkSubtle'} style={{ flex: 1, fontSize: 12 }} numberOfLines={1}>
                {s}
              </T>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.offer, { backgroundColor: c.brand }]}>
        <View style={styles.inline}>
          <Award size={18} color={c.onBrand} strokeWidth={2.5} />
          <T variant="overline" color="onBrand">
            FOUNDING PRO OFFER · SW6
          </T>
        </View>
        {PERKS.map((p) => (
          <View key={p.title} style={[styles.inline, { gap: Spacing.three }]}>
            <View style={[styles.perkIcon, { backgroundColor: c.brandPressed }]}>
              <p.icon size={20} color={c.onBrand} strokeWidth={2.25} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="headline" color="onBrand">
                {p.title}
              </T>
              <T variant="caption" color="onBrand" style={{ opacity: 0.8, fontWeight: '500' }}>
                {p.body}
              </T>
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: Spacing.two }}>
        <T variant="headline">What do you do?</T>
        <T variant="caption" color="inkMuted" style={{ fontWeight: '500', marginBottom: 4 }}>
          {"Choose all that apply. We'll ask for the matching documents next."}
        </T>
        {TRADES.map((t) => {
          const on = selected.includes(t.key);
          return (
            <Pressable
              key={t.key}
              onPress={() => setSelected((s) => (on ? s.filter((k) => k !== t.key) : [...s, t.key]))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={t.label}
              style={[styles.trade, { borderColor: on ? c.brand : c.border, backgroundColor: on ? c.brandTint : c.surface }]}>
              <t.icon size={22} color={on ? c.brand : c.inkMuted} strokeWidth={2.25} />
              <T variant="headline" style={{ flex: 1 }}>
                {t.label}
              </T>
              <View style={[styles.check, { backgroundColor: on ? c.brand : c.surface, borderWidth: on ? 0 : 2, borderColor: c.border }]}>
                {on ? <Check size={16} color={c.onBrand} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  steps: { flexDirection: 'row', gap: 6 },
  stepBar: { flex: 1, height: 6, borderRadius: Radii.pill },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  offer: { borderRadius: Radii.lg, padding: Spacing.four, gap: Spacing.three },
  perkIcon: { width: 40, height: 40, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  trade: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, height: 56, paddingHorizontal: Spacing.four, borderRadius: Radii.md, borderWidth: 2 },
  check: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
