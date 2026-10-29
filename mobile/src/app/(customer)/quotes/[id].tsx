import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Building2, CalendarCheck, CircleCheck, ClipboardPen, Clock, Lock, ShieldCheck, Star, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Chip, Footer, IconTile, Note, ProgressBar, ProgressSteps, Screen, T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { formatPence, PILOT, TRADES, type Trade } from '@/domain/catalog';
import { CREDENTIAL_SHORT, DEMO_QUOTES } from '@/lib/demo';
import { ensureSavedCard } from '@/lib/payments';
import { EXAMPLE_COMPANY, EXAMPLE_QUOTE_REQUESTS, isExample } from '@/lib/properties';
import { acceptQuote, cancelQuoteRequest, loadQuoteRequestDetails, type Quote, type QuoteRequestDetails } from '@/lib/quotes';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { loadProCards, type ProCard } from '@/lib/trust';

type QuoteRow = { id: string; pro_id: string; trade: Trade; price_pence: number; note: string; earliest_at: string | null };

function fromRow(r: QuoteRow): Quote {
  return {
    id: r.id,
    proId: r.pro_id,
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
  // The example landlord dashboard's request shows the demo quotes, all in.
  const example = EXAMPLE_QUOTE_REQUESTS.find((r) => r.id === id);
  const demo = id.startsWith('demo-') || isExample(id);
  const [quotes, setQuotes] = useState<Quote[]>(example ? DEMO_QUOTES : freeze ? DEMO_QUOTES.slice(0, Number(freeze)) : []);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [booked, setBooked] = useState<Quote | null>(null);
  // Whose home it's for and who accepts: on a tenant's request, their landlord does.
  const [details, setDetails] = useState<QuoteRequestDetails | null>(
    example
      ? {
          description: example.description,
          status: 'open',
          jobId: null,
          propertyId: example.propertyId,
          propertyName: example.propertyName,
          managerName: EXAMPLE_COMPANY,
          requesterName: example.tenantName,
          yours: false,
          youAccept: true,
        }
      : null,
  );
  const youAccept = details?.youAccept ?? true;
  // A landlord or agent looking at their tenant's request.
  const forTenant = Boolean(details?.propertyId) && details?.yours === false;
  const tenantFirst = details?.requesterName.split(' ')[0] ?? 'your tenant';

  // Demo: quotes trickle in. Live: load what's there, then listen for new ones.
  useEffect(() => {
    if (demo) {
      if (example) return;
      if (freeze) return;
      const timers = DEMO_QUOTES.map((q) => setTimeout(() => setQuotes((all) => [...all, q]), q.afterMs));
      return () => timers.forEach(clearTimeout);
    }
    if (!isSupabaseConfigured) return;
    supabase
      .from('quotes')
      .select('id, pro_id, trade, price_pence, note, earliest_at')
      .eq('request_id', id)
      .order('created_at')
      .then(({ data }) => data && setQuotes((all) => merge(all, (data as QuoteRow[]).map(fromRow))));
    loadQuoteRequestDetails(id).then(setDetails, () => {});
    const channel = supabase
      .channel(`quotes-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quotes', filter: `request_id=eq.${id}` }, (payload) =>
        setQuotes((all) => merge(all, [fromRow(payload.new as QuoteRow)])),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, demo, example, freeze]);

  // Each live quote's pro: real name, rating, jobs done and checked documents.
  const [pros, setPros] = useState<Record<string, ProCard>>({});
  const missing = quotes.map((q) => q.proId).filter((p): p is string => !!p && !pros[p]);
  const missingKey = missing.join(',');
  useEffect(() => {
    if (!missingKey) return;
    loadProCards(missingKey.split(',')).then((more) => setPros((all) => ({ ...all, ...more })), () => {});
  }, [missingKey]);
  const shown = quotes.map((q) => {
    const p = q.proId ? pros[q.proId] : undefined;
    return p ? { ...q, proName: p.name, rating: p.rating ?? 0, jobs: p.completedJobs, reviews: p.reviewCount, checks: p.credentials } : q;
  });

  async function accept(q: Quote) {
    setAccepting(q.id);
    try {
      // The job is charged to a saved card once it's done, as with any other booking.
      // On a tenant's request that's the landlord's card.
      if (!example && !(await ensureSavedCard())) return;
      await acceptQuote(q.id);
      setBooked(q);
    } catch (e) {
      Alert.alert('Could not accept this quote', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setAccepting(null);
    }
  }

  function turnDown() {
    Alert.alert('Not going ahead?', `We'll tell ${tenantFirst}, and the pros who quoted. Nothing is charged.`, [
      { text: 'Keep it open', style: 'cancel' },
      {
        text: 'Not going ahead',
        style: 'destructive',
        onPress: () =>
          void (example ? Promise.resolve() : cancelQuoteRequest(id)).then(
            () => backToProperties(),
            (e: unknown) => Alert.alert('Could not cancel', e instanceof Error ? e.message : 'Please try again.'),
          ),
      },
    ]);
  }

  const backToProperties = () => router.replace(example ? { pathname: '/properties', params: { example: '1' } } : '/properties');

  if (booked) {
    return (
      <Screen
        fixed
        contentStyle={{ justifyContent: 'center', gap: Spacing.four }}
        footer={
          <Footer>
            {forTenant ? <Button label="Back to your properties" onPress={backToProperties} /> : <Button label="See my jobs" onPress={() => router.replace('/my-jobs')} />}
          </Footer>
        }>
        <View style={[styles.doneIcon, { backgroundColor: c.successTint }]}>
          <CircleCheck size={36} color={c.success} strokeWidth={2.2} />
        </View>
        <T variant="title1" style={{ textAlign: 'center' }}>
          {forTenant ? `Booked ${booked.proName.split(' ')[0]} for ${tenantFirst}` : `Booked with ${booked.proName.split(' ')[0]}`}
        </T>
        <T variant="callout" color="inkMuted" style={{ textAlign: 'center' }}>
          {forTenant
            ? `${formatPence(booked.pricePence)} agreed, starting ${booked.earliest}. ${tenantFirst} and the pro arrange the visit in the app, and your card is only charged when the job is done.`
            : `${formatPence(booked.pricePence)} agreed, starting ${booked.earliest}. The other pros have been told, and your card is only charged when the job is done.`}
        </T>
      </Screen>
    );
  }

  function progressLine() {
    const n = quotes.length;
    const max = PILOT.maxQuotesPerRequest;
    if (!youAccept) {
      return n === 0
        ? `Your request has gone to vetted pros in Fulham. When quotes arrive, ${details?.managerName} picks one and pays for it.`
        : `${details?.managerName} is comparing them and will pick one. We'll tell you when they have, and the pro will message you to arrange the day.`;
    }
    if (n === 0) return `${forTenant ? `${tenantFirst}'s` : 'Your'} request has gone to vetted pros in Fulham. Most quotes arrive within a few hours.`;
    return n >= max
      ? `That's your shortlist: requests close at ${max} quotes. Accept the one that suits you.`
      : `Up to ${max - n} more may come in. Compare them and accept the one that suits you.`;
  }

  const cheapest = quotes.length ? Math.min(...quotes.map((q) => q.pricePence)) : null;
  // Posted, quotes coming in, then the shortlist is full.
  const stage = quotes.length === 0 ? 0 : quotes.length >= PILOT.maxQuotesPerRequest ? 2 : 1;

  return (
    <Screen>
      <View style={styles.row}>
        <IconTile icon={ClipboardPen} tone="neutral" size={44} />
        <View style={{ flex: 1 }}>
          <T variant="caption" color="inkSubtle">
            {forTenant
              ? `${(details?.requesterName ?? 'Your tenant').toUpperCase()}’S REQUEST · ${details?.propertyName ?? ''}`
              : details?.propertyName
                ? `YOUR REQUEST · ${details.propertyName}`
                : 'YOUR REQUEST'}
          </T>
          <T variant="subhead" numberOfLines={2}>
            {description ?? details?.description ?? 'Your job'}
          </T>
        </View>
      </View>

      <ProgressSteps steps={QUOTE_STEPS} current={stage} />

      <View style={{ gap: Spacing.two }}>
        <T variant="title1" accessibilityRole="header">
          {quotes.length === 0 ? 'Asking local pros' : `${quotes.length} ${quotes.length === 1 ? 'quote' : 'quotes'} so far`}
        </T>
        <T variant="callout" color="inkMuted">
          {progressLine()}
        </T>
        {quotes.length === 0 ? <ProgressBar value={0.35} /> : null}
      </View>

      {shown.length > 1 ? <CompareTable quotes={shown} cheapest={cheapest} /> : null}

      <View style={{ gap: Spacing.three }}>
        {shown.map((q) => (
          <Card key={q.id} style={{ gap: Spacing.three }}>
            <View style={styles.row}>
              <Avatar name={q.proName} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="headline">{q.proName}</T>
                <View style={styles.inline}>
                  {q.rating > 0 ? <Star size={13} color={c.ink} fill={c.ink} /> : null}
                  <T variant="footnote">{proLine(q)}</T>
                </View>
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
              {(q.checks ?? []).map((ch) => (
                <Chip key={ch} label={CREDENTIAL_SHORT[ch]} icon={BadgeCheck} tone="success" />
              ))}
            </View>
            {q.note ? (
              <View style={[styles.included, { backgroundColor: c.surfaceMuted }]}>
                <T variant="caption" color="inkSubtle">
                  WHAT’S INCLUDED
                </T>
                <T variant="callout">{q.note}</T>
              </View>
            ) : null}
            <View style={styles.actions}>
              <Button label="View profile" size="md" variant="secondary" onPress={() => router.push(`/pro/${q.proId ?? 'demo-pro'}`)} style={{ flex: 1 }} />
              {youAccept ? (
                <Button
                  label={`Accept ${formatPence(q.pricePence)}`}
                  size="md"
                  loading={accepting === q.id}
                  disabled={accepting !== null && accepting !== q.id}
                  onPress={() => accept(q)}
                  style={{ flex: 1.4 }}
                />
              ) : null}
            </View>
          </Card>
        ))}
      </View>

      {forTenant && details?.status === 'open' ? <Button label="Not going ahead" variant="ghost" onPress={turnDown} /> : null}

      <View style={[styles.how, { backgroundColor: c.surfaceMuted }]}>
        {details?.propertyId ? (
          <Note icon={Building2}>
            {forTenant
              ? `The job is booked for ${tenantFirst} at ${details.propertyName}, and the bill comes to you.`
              : details.yours && !youAccept
                ? `${details.managerName} pays for this, so there's nothing for you to pay.`
                : `Booked for ${details.propertyName}, and it shows in its history and spend.`}
          </Note>
        ) : null}
        <Note icon={Users}>Every pro who quotes has had their ID, insurance and trade qualifications checked.</Note>
        <Note icon={Lock}>Quotes include VAT and fees, with no hidden extras. The price you accept is fixed, and any extra work needs your OK in the app first.</Note>
        <Note icon={Clock}>{`Requests close after ${PILOT.maxQuotesPerRequest} quotes or 7 days.`}</Note>
      </View>
    </Screen>
  );
}

const QUOTE_STEPS = ['Posted', 'Quotes in', 'Shortlist full'];

const proLine = (q: Quote) =>
  [q.rating > 0 ? q.rating.toFixed(1) : 'New to Relay', q.reviews ? `${q.reviews} reviews` : null, q.jobs > 0 ? `${q.jobs} jobs` : null]
    .filter(Boolean)
    .join(' · ');

/** Every quote in one table, so price, rating and timing can be compared at a glance. */
function CompareTable({ quotes, cheapest }: { quotes: Quote[]; cheapest: number | null }) {
  const c = usePalette();
  const rows: { label: string; value: (q: Quote) => string; best?: (q: Quote) => boolean }[] = [
    { label: 'Price', value: (q) => formatPence(q.pricePence), best: (q) => q.pricePence === cheapest },
    { label: 'Rating', value: (q) => (q.rating > 0 ? `★ ${q.rating.toFixed(1)}` : 'New') },
    { label: 'Jobs', value: (q) => String(q.jobs) },
    { label: 'Checks', value: (q) => String((q.checks ?? []).length + 1) + ' passed' },
    { label: 'Can start', value: (q) => q.earliest },
  ];
  return (
    <View style={[styles.table, { borderColor: c.border, backgroundColor: c.surface }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flexGrow: 1 }}>
          <View style={[styles.tableRow, { backgroundColor: c.surfaceMuted }]}>
            <View style={styles.labelCell} />
            {quotes.map((q) => (
              <View key={q.id} style={styles.cell}>
                <T variant="subhead" style={{ fontWeight: '700' }} numberOfLines={1}>
                  {q.proName.split(' ')[0]}
                </T>
              </View>
            ))}
          </View>
          {rows.map((r) => (
            <View key={r.label} style={[styles.tableRow, { borderTopColor: c.border, borderTopWidth: 1 }]}>
              <View style={styles.labelCell}>
                <T variant="caption" color="inkSubtle">
                  {r.label}
                </T>
              </View>
              {quotes.map((q) => (
                <View key={q.id} style={styles.cell}>
                  <T variant="footnote" color={r.best?.(q) && quotes.length > 1 ? 'success' : 'ink'} style={{ fontWeight: r.best?.(q) ? '700' : '500' }}>
                    {r.value(q)}
                  </T>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  how: { borderRadius: Radii.md, padding: Spacing.four, gap: Spacing.three },
  included: { borderRadius: Radii.sm, padding: Spacing.three, gap: 2 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  table: { borderWidth: 1, borderRadius: Radii.md, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  labelCell: { width: 72, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  cell: { flex: 1, minWidth: 88, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
