import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CircleCheck, ClipboardPen, MapPin, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Chip, Footer, IconButton, IconTile, Screen, T } from '@/components/ui';
import { Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import { FOUNDING_COMMISSION, formatPence, QUOTE_TIMING_LABELS, STANDARD_COMMISSION, TRADES, type Trade } from '@/domain/catalog';
import { splitPayment } from '@/domain/rules';
import { DEMO_TRADER } from '@/lib/demo';
import { findQuoteRequest } from '@/lib/offers';
import { recordQuote, useSentQuote } from '@/lib/pro-state';
import { sendQuote } from '@/lib/quotes';

const STARTS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: 'tomorrow', label: 'Tomorrow', days: 1 },
  { key: 'week', label: 'This week', days: 3 },
  { key: 'later', label: 'Next week', days: 7 },
] as const;

/** Whole pounds typed by the pro, in pence. Null unless it's a sensible price. */
function parsePrice(text: string): number | null {
  const pounds = Number(text.replace(/[£,\s]/g, ''));
  return Number.isFinite(pounds) && pounds >= 1 && pounds <= 50000 ? Math.round(pounds * 100) : null;
}

/** 9am, `days` from today, as an ISO timestamp. */
function startAt(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export default function QuoteReply() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = findQuoteRequest(id);
  const sent = useSentQuote(id);
  const [trade, setTrade] = useState<Trade | undefined>(request?.quotableAs[0]);
  const [price, setPrice] = useState('');
  const [start, setStart] = useState<(typeof STARTS)[number]['key']>('week');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  if (!request || !trade) return null;
  const pence = parsePrice(price);
  const rate = DEMO_TRADER.founding ? FOUNDING_COMMISSION : STANDARD_COMMISSION;

  async function submit() {
    if (!pence || !request || !trade) return;
    setSending(true);
    try {
      const days = STARTS.find((s) => s.key === start)?.days ?? 3;
      await sendQuote({ requestId: request.id, trade, pricePence: pence, note: note.trim(), earliestAt: startAt(days) });
      recordQuote(request.id, pence);
    } catch (e) {
      Alert.alert('Could not send your quote', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Screen
        fixed
        contentStyle={{ justifyContent: 'center', gap: Spacing.four }}
        footer={
          <Footer>
            <Button label="Back to jobs" onPress={() => router.back()} />
          </Footer>
        }>
        <View style={[styles.doneIcon, { backgroundColor: c.successTint }]}>
          <CircleCheck size={36} color={c.success} strokeWidth={2.2} />
        </View>
        <T variant="title1" style={{ textAlign: 'center' }}>
          {`Quote sent: ${formatPence(sent)}`}
        </T>
        <T variant="callout" color="inkMuted" style={{ textAlign: 'center' }}>
          {`We'll tell you as soon as ${request.customer} picks a quote. If it's yours, the job appears on your home screen.`}
        </T>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Footer>
          {pence ? (
            <T variant="footnote" color="inkMuted" style={{ textAlign: 'center' }}>
              {`You keep ${formatPence(splitPayment(pence, rate).proPence)} after ${Math.round(rate * 100)}% commission`}
            </T>
          ) : null}
          <Button label={pence ? `Send quote of ${formatPence(pence)}` : 'Send quote'} icon={Send} disabled={!pence} loading={sending} onPress={submit} />
        </Footer>
      }>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
        <T variant="headline">Quote request</T>
      </View>

      <Card style={{ gap: Spacing.three }}>
        <View style={styles.row}>
          <IconTile icon={ClipboardPen} tone="neutral" size={44} />
          <View style={{ flex: 1 }}>
            <T variant="headline">{request.customer}</T>
            <View style={styles.inline}>
              <MapPin size={14} color={c.inkMuted} strokeWidth={2.25} />
              <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
                {`${request.postcode} · ${request.postedAgo}`}
              </T>
            </View>
          </View>
          <Chip label={QUOTE_TIMING_LABELS[request.timing]} tone="brand" />
        </View>
        <T variant="body">{`“${request.description}”`}</T>
      </Card>

      {request.quotableAs.length > 1 ? (
        <View style={{ gap: Spacing.three }}>
          <T variant="title2">Quote as</T>
          <View style={styles.chips}>
            {request.quotableAs.map((t) => (
              <Choice key={t} label={TRADES.find((x) => x.id === t)?.label ?? t} on={trade === t} onPress={() => setTrade(t)} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ gap: Spacing.three }}>
        <T variant="title2">Your price</T>
        <View style={[styles.priceBox, Shadows.card, { backgroundColor: c.surface }]}>
          <T variant="money" color="inkSubtle" style={{ fontSize: 34, lineHeight: 40 }}>
            £
          </T>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={c.inkSubtle}
            accessibilityLabel="Your price in pounds, including VAT if you charge it"
            style={[Type.money, styles.priceInput, { color: c.ink }]}
          />
        </View>
        <T variant="footnote" color="inkSubtle">
          {"The customer pays exactly this, so include parts and VAT if you charge it. Relay's commission comes out of it."}
        </T>
      </View>

      <View style={{ gap: Spacing.three }}>
        <T variant="title2">Earliest you can start</T>
        <View style={styles.chips}>
          {STARTS.map((s) => (
            <Choice key={s.key} label={s.label} on={start === s.key} onPress={() => setStart(s.key)} />
          ))}
        </View>
      </View>

      <View style={{ gap: Spacing.three }}>
        <T variant="title2">Note to the customer</T>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={1000}
          placeholder="What's included, how long it takes, anything they should know."
          placeholderTextColor={c.inkSubtle}
          accessibilityLabel="Note to the customer"
          style={[Type.callout, styles.notes, Shadows.card, { backgroundColor: c.surface, color: c.ink }]}
        />
      </View>
    </Screen>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[styles.choice, { borderColor: on ? c.brand : c.border, backgroundColor: on ? c.brandTint : c.surface }]}>
      <T variant="subhead" color={on ? 'brand' : 'ink'} style={{ fontWeight: '600' }}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choice: { height: 48, paddingHorizontal: Spacing.four, borderRadius: Radii.pill, borderWidth: 1.5, justifyContent: 'center' },
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radii.md, paddingHorizontal: Spacing.four, height: 72 },
  priceInput: { flex: 1, padding: 0, margin: 0 },
  notes: { minHeight: 96, borderRadius: Radii.md, padding: Spacing.four, textAlignVertical: 'top' },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
