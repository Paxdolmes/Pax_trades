import { router } from 'expo-router';
import { ArrowRight, Award, BadgePoundSterling, Check, ChevronLeft, Percent, Timer } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { TRADE_ICONS } from '@/components/trade-icons';
import { Button, Footer, IconButton, Screen, T, type LucideIcon } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { FOUNDING_COMMISSION, OFFERED_TRADES, STANDARD_COMMISSION, type Trade } from '@/domain/catalog';
import { startProApplication, useAccountGate, useAuth } from '@/lib/auth';

const STEPS = ['Details', 'Documents', 'ID check', 'Bank details'];

const TRADE_CHOICES = OFFERED_TRADES.map((t) => ({ key: t.id, label: t.id === 'heating' ? 'Gas Safe engineer' : t.label, icon: TRADE_ICONS[t.id] }));

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
  const { refresh } = useAuth();
  const [selected, setSelected] = useState<Trade[]>(['plumbing', 'heating']);
  const [saving, setSaving] = useState(false);
  const signedIn = useAccountGate();
  const current = 0;

  async function next() {
    if (!signedIn()) return;
    setSaving(true);
    try {
      await startProApplication(selected);
      await refresh();
      router.navigate('/documents');
    } catch (e) {
      Alert.alert('Could not save your trades', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      background="surface"
      footer={
        <Footer>
          <Button label="Continue to documents" trailingIcon={ArrowRight} loading={saving} disabled={!selected.length} onPress={next} />
        </Footer>
      }>
      <View style={styles.header}>
        {router.canGoBack() ? (
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} tone="muted" />
        ) : (
          <View style={{ width: 44 }} />
        )}
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
        {TRADE_CHOICES.map((t) => {
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
