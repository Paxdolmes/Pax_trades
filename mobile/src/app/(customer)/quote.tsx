import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronLeft, CircleHelp, Flame, Send, ShieldCheck, Wrench, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Footer, IconButton, Note, Radio, Screen, T, type LucideIcon } from '@/components/ui';
import { Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import { QUOTE_TIMING_LABELS, type QuoteTiming, type Trade } from '@/domain/catalog';
import { createQuoteRequest } from '@/lib/quotes';

const MIN_DESCRIPTION = 10;

const TRADE_CHOICES: { id: Trade; label: string; icon: LucideIcon }[] = [
  { id: 'plumbing', label: 'Plumber', icon: Wrench },
  { id: 'electrical', label: 'Electrician', icon: Zap },
  { id: 'heating', label: 'Heating & gas', icon: Flame },
];

const TIMING_DETAIL: Record<QuoteTiming, string> = {
  asap: 'Pros who can come in the next day or two',
  this_week: 'Within the next 7 days',
  flexible: 'Get the best price and pick a date later',
};

export default function QuoteRequest() {
  const c = usePalette();
  const { postcode } = useLocalSearchParams<{ postcode: string }>();
  const [description, setDescription] = useState('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [timing, setTiming] = useState<QuoteTiming>('this_week');
  const [submitting, setSubmitting] = useState(false);
  const ready = description.trim().length >= MIN_DESCRIPTION;

  const toggle = (t: Trade) => setTrades((all) => (all.includes(t) ? all.filter((x) => x !== t) : [...all, t]));

  async function submit() {
    setSubmitting(true);
    try {
      const { id } = await createQuoteRequest({ trades, postcode, description: description.trim(), timing });
      router.replace({ pathname: '/quotes/[id]', params: { id, description: description.trim() } });
    } catch (e) {
      Alert.alert('Could not send your request', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      footer={
        <Footer>
          <Note icon={ShieldCheck}>Only vetted, insured pros can quote. Asking is free and you only pay for the quote you accept.</Note>
          <Button label="Get quotes" icon={Send} disabled={!ready} loading={submitting} onPress={submit} />
        </Footer>
      }>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
        <View>
          <T variant="caption" color="inkSubtle">
            {postcode}
          </T>
          <T variant="headline">Something else</T>
        </View>
      </View>

      <View style={{ gap: Spacing.three }}>
        <T variant="title1" accessibilityRole="header">
          What do you need doing?
        </T>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
          placeholder="e.g. Move a radiator to the other wall in the bathroom and fit a towel rail in its place."
          placeholderTextColor={c.inkSubtle}
          accessibilityLabel="Describe the job"
          style={[Type.callout, styles.notes, Shadows.card, { backgroundColor: c.surface, color: c.ink }]}
        />
        <T variant="footnote" color="inkSubtle">
          The more detail you give, the more accurate the quotes will be.
        </T>
      </View>

      <View style={{ gap: Spacing.three }}>
        <T variant="title2" accessibilityRole="header">
          Who should quote?
        </T>
        <View style={styles.chips}>
          {TRADE_CHOICES.map((t) => {
            const on = trades.includes(t.id);
            return (
              <Pressable
                key={t.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggle(t.id)}
                style={[styles.chip, { borderColor: on ? c.brand : c.border, backgroundColor: on ? c.brandTint : c.surface }]}>
                {on ? <Check size={16} color={c.brand} strokeWidth={3} /> : <t.icon size={16} color={c.inkMuted} strokeWidth={2.25} />}
                <T variant="subhead" color={on ? 'brand' : 'ink'} style={{ fontWeight: '600' }}>
                  {t.label}
                </T>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: trades.length === 0 }}
            onPress={() => setTrades([])}
            style={[
              styles.chip,
              { borderColor: trades.length === 0 ? c.brand : c.border, backgroundColor: trades.length === 0 ? c.brandTint : c.surface },
            ]}>
            <CircleHelp size={16} color={trades.length === 0 ? c.brand : c.inkMuted} strokeWidth={2.25} />
            <T variant="subhead" color={trades.length === 0 ? 'brand' : 'ink'} style={{ fontWeight: '600' }}>
              Not sure
            </T>
          </Pressable>
        </View>
        <T variant="footnote" color="inkMuted">
          {trades.length === 0
            ? 'Your request goes to every vetted plumber, electrician and heating engineer nearby.'
            : 'Your request goes to every vetted pro nearby in the trades you picked.'}
        </T>
      </View>

      <View style={{ gap: Spacing.three }}>
        <T variant="title2" accessibilityRole="header">
          When?
        </T>
        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          {(Object.keys(QUOTE_TIMING_LABELS) as QuoteTiming[]).map((t) => (
            <Card key={t} selected={timing === t} onPress={() => setTiming(t)} style={styles.option}>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="headline">{QUOTE_TIMING_LABELS[t]}</T>
                <T variant="footnote" color="inkMuted">
                  {TIMING_DETAIL[t]}
                </T>
              </View>
              <Radio on={timing === t} />
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  notes: { minHeight: 120, borderRadius: Radii.md, padding: Spacing.four, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: Radii.pill, borderWidth: 1.5 },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
