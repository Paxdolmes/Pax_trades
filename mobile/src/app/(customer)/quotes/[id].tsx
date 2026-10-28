import { router, useLocalSearchParams } from 'expo-router';
import { CalendarCheck, CircleCheck, ClipboardPen, Clock, Lock, ShieldCheck, Star, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Chip, Footer, IconTile, Note, ProgressBar, Screen, T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { formatPence, PILOT, TRADES, type Trade } from '@/domain/catalog';
import { DEMO_QUOTES } from '@/lib/demo';
import { ensureSavedCard } from '@/lib/payments';
import { acceptQuote, type Quote } from '@/lib/quotes';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type QuoteRow = { id: string; trade: Trade; price_pence: number; note: string; earliest_at: string | null };

function fromRow(r: QuoteRow): Quote {
  return {
    id: r.id,
    proName: `Vetted ${TRADES.find((t) => t.id === r.trade)?.pro ?? 'pro'}`,
    trade: r.trade,
    rating: 0,
    jobs: 0,
    pricePence: r.price_pence,
    earliest: r.earliest_at ? new Date(r.earliest_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric' }) : 'To be agreed',
    note: r.note,
  };
}

/** Adds quotes not already shown: the first load and a realtime insert can both bring the same one. */
const merge = (all: Quote[], more: Quote[]) => [...all, ...more.filter((q) => !all.some((a) => a.id === q.id))];

export default function Quotes() {
  const c = usePalette();
  const { id, description, freeze } = useLocalSearchParams<{ id: string; description?: string; freeze?: string }>();
  const demo = id.startsWith('demo-');
  const [quotes, setQuotes] = useState<Quote[]>(freeze ? DEMO_QUOTES.slice(0, Number(freeze)) : []);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [booked, setBooked] = useState<Quote | null>(null);
  // Opened from My jobs there's no description in the link, so it's read with the quotes.
  const [loadedDescription, setDescription] = useState<string | null>(null);

  // Demo: quotes trickle in. Live: load what's there, then listen for new ones.
  useEffect(() => {
    if (demo) {
      if (freeze) return;
      const timers = DEMO_QUOTES.map((q) => setTimeout(() => setQuotes((all) => [...all, q]), q.afterMs));
      return () => timers.forEach(clearTimeout);
    }
    if (!isSupabaseConfigured) return;
    supabase
      .from('quotes')
      .select('id, trade, price_pence, note, earliest_at')
      .eq('request_id', id)
      .order('created_at')
      .then(({ data }) => data && setQuotes((all) => merge(all, (data as QuoteRow[]).map(fromRow))));
    if (!description) {
      supabase
        .from('quote_requests')
        .select('description')
        .eq('id', id)
        .maybeSingle()
        .then(({ data }) => data && setDescription((data as { description: string }).description));
    }
    const channel = supabase
      .channel(`quotes-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quotes', filter: `request_id=eq.${id}` }, (payload) =>
        setQuotes((all) => merge(all, [fromRow(payload.new as QuoteRow)])),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, demo, freeze, description]);

  async function accept(q: Quote) {
    setAccepting(q.id);
    try {
      // The job is charged to a saved card once it's done, as with any other booking.
      if (!(await ensureSavedCard())) return;
      await acceptQuote(q.id);
      setBooked(q);
    } catch (e) {
      Alert.alert('Could not accept this quote', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setAccepting(null);
    }
  }

  if (booked) {
    return (
      <Screen
        fixed
        contentStyle={{ justifyContent: 'center', gap: Spacing.four }}
        footer={
          <Footer>
            <Button label="See my jobs" onPress={() => router.replace('/my-jobs')} />
          </Footer>
        }>
        <View style={[styles.doneIcon, { backgroundColor: c.successTint }]}>
          <CircleCheck size={36} color={c.success} strokeWidth={2.2} />
        </View>
        <T variant="title1" style={{ textAlign: 'center' }}>
          {`Booked with ${booked.proName.split(' ')[0]}`}
        </T>
        <T variant="callout" color="inkMuted" style={{ textAlign: 'center' }}>
          {`${formatPence(booked.pricePence)} agreed, starting ${booked.earliest}. The other pros have been told, and your card is only charged when the job is done.`}
        </T>
      </Screen>
    );
  }

  const cheapest = quotes.length ? Math.min(...quotes.map((q) => q.pricePence)) : null;

  return (
    <Screen>
      <View style={styles.row}>
        <IconTile icon={ClipboardPen} tone="neutral" size={44} />
        <View style={{ flex: 1 }}>
          <T variant="caption" color="inkSubtle">
            YOUR REQUEST
          </T>
          <T variant="subhead" numberOfLines={2}>
            {description ?? loadedDescription ?? 'Your job'}
          </T>
        </View>
      </View>

      <View style={{ gap: Spacing.two }}>
        <T variant="title1" accessibilityRole="header">
          {quotes.length === 0 ? 'Asking local pros' : `${quotes.length} ${quotes.length === 1 ? 'quote' : 'quotes'} so far`}
        </T>
        <T variant="callout" color="inkMuted">
          {quotes.length === 0
            ? 'Your request has gone to vetted pros in Fulham. Most quotes arrive within a few hours.'
            : quotes.length >= PILOT.maxQuotesPerRequest
              ? `That's your shortlist: requests close at ${PILOT.maxQuotesPerRequest} quotes. Accept the one that suits you.`
              : `Up to ${PILOT.maxQuotesPerRequest - quotes.length} more may come in. Compare them and accept the one that suits you.`}
        </T>
        {quotes.length === 0 ? <ProgressBar value={0.35} /> : null}
      </View>

      <View style={{ gap: Spacing.three }}>
        {quotes.map((q) => (
          <Card key={q.id} style={{ gap: Spacing.three }}>
            <View style={styles.row}>
              <Avatar name={q.proName} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="headline">{q.proName}</T>
                {q.jobs > 0 ? (
                  <View style={styles.inline}>
                    <Star size={13} color={c.ink} fill={c.ink} />
                    <T variant="footnote">{`${q.rating} · ${q.jobs} jobs`}</T>
                  </View>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T variant="title2" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {formatPence(q.pricePence)}
                </T>
                <T variant="caption" color="inkSubtle">
                  All-in
                </T>
                {q.pricePence === cheapest && quotes.length > 1 ? <Chip label="Lowest" tone="success" /> : null}
              </View>
            </View>
            <View style={styles.inline}>
              <Chip label={TRADES.find((t) => t.id === q.trade)?.label ?? q.trade} icon={ShieldCheck} tone="brand" />
              <Chip label={q.earliest} icon={CalendarCheck} />
            </View>
            {q.note ? (
              <T variant="callout" color="inkMuted">
                {`“${q.note}”`}
              </T>
            ) : null}
            <Button
              label={`Accept ${formatPence(q.pricePence)}`}
              size="md"
              loading={accepting === q.id}
              disabled={accepting !== null && accepting !== q.id}
              onPress={() => accept(q)}
            />
          </Card>
        ))}
      </View>

      <View style={[styles.how, { backgroundColor: c.surfaceMuted }]}>
        <Note icon={Users}>Every pro who quotes has had their ID, insurance and trade qualifications checked.</Note>
        <Note icon={Lock}>Quotes include VAT and fees, with no hidden extras. The price you accept is fixed, and any extra work needs your OK in the app first.</Note>
        <Note icon={Clock}>{`Requests close after ${PILOT.maxQuotesPerRequest} quotes or 7 days.`}</Note>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  how: { borderRadius: Radii.md, padding: Spacing.four, gap: Spacing.three },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
