import { router } from 'expo-router';
import { CalendarClock, ChevronRight, CircleCheck, ClipboardPen, Lock, MapPin, Plus, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { TRADE_ICONS } from '@/components/trade-icons';
import { Button, Card, Chip, IconTile, Screen, SectionLabel, T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { formatPence, PILOT, QUOTE_TIMING_LABELS, TRADES, type Trade } from '@/domain/catalog';
import { CREDENTIAL_LABELS } from '@/lib/demo';
import { isLive } from '@/lib/live';
import { offerPay, useOffers, useQuoteRequests, type OfferView, type QuoteRequestView } from '@/lib/offers';
import { goOnline, usePro } from '@/lib/pro';
import { useOnline, useSentQuote } from '@/lib/pro-state';


export default function ProJobs() {
  const c = usePalette();
  const [online] = useOnline();
  const [filter, setFilter] = useState<Trade | 'all'>('all');
  const pro = usePro();
  // All, then just the trades this pro works in.
  const filters: { key: Trade | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    ...TRADES.filter((t) => pro.trades.includes(t.id)).map((t) => ({ key: t.id, label: t.service })),
  ];
  const allOffers = useOffers();
  const offers = allOffers.filter((o) => filter === 'all' || o.jobType.trade === filter);
  const requests = useQuoteRequests(pro.trades).filter((r) => filter === 'all' || r.quotableAs.includes(filter));
  const goLive = () =>
    goOnline(true).catch((e: unknown) => Alert.alert('Could not go online', e instanceof Error ? e.message : 'Please try again.'));

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <T variant="title1" style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole="header">
          Jobs nearby
        </T>
        <T variant="callout" color="inkMuted">
          {online ? (isLive ? 'Online · offers within 8 km of you' : 'Online · within 5 km of Fulham Broadway') : 'Offline · go online to accept jobs'}
        </T>
      </View>

      <View style={styles.filters}>
        {filters.map((f) => {
          const on = filter === f.key;
          const count = f.key === 'all' ? allOffers.length : null;
          return (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(f.key)}
              style={[styles.filter, { backgroundColor: on ? c.ink : c.surface, borderColor: on ? c.ink : c.border }]}>
              <T variant="subhead" color={on ? 'surface' : 'ink'} style={{ fontWeight: '600' }}>
                {count ? `${f.label} ${count}` : f.label}
              </T>
            </Pressable>
          );
        })}
      </View>

      {!online ? <Button label="Go online" variant="success" onPress={goLive} /> : null}

      <View style={{ gap: Spacing.three }}>
        {offers.map((o) => (o.missing.length ? <LockedOffer key={o.id} offer={o} /> : <OfferCard key={o.id} offer={o} canOpen={online} />))}
        {offers.length === 0 ? (
          <T variant="callout" color="inkMuted">
            {isLive ? 'No offers right now. Stay online and new jobs open here.' : 'No jobs of this type nearby right now.'}
          </T>
        ) : null}
      </View>

      {requests.length ? (
        <View style={{ gap: Spacing.three }}>
          <SectionLabel>Quote requests</SectionLabel>
          <T variant="footnote" color="inkMuted" style={{ marginTop: -4 }}>
            Jobs outside our price list. Send your own all-in price; each request takes 5 quotes, and the customer picks one.
          </T>
          {requests.map((r) => (
            <QuoteRequestCard key={r.id} request={r} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function QuoteRequestCard({ request }: { request: QuoteRequestView }) {
  const c = usePalette();
  const sent = useSentQuote(request.id);
  return (
    <Card
      accessibilityLabel={`Quote request: ${request.description}`}
      onPress={() => router.push({ pathname: '/quote-reply/[id]', params: { id: request.id } })}
      style={{ gap: Spacing.three }}>
      <View style={styles.cardTop}>
        <IconTile icon={ClipboardPen} tone="neutral" size={44} />
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="bodyStrong" numberOfLines={2}>
            {request.description}
          </T>
          <View style={styles.inline}>
            <MapPin size={14} color={c.inkMuted} strokeWidth={2.25} />
            <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
              {`${request.postcode} · ${QUOTE_TIMING_LABELS[request.timing]} · ${request.postedAgo}`}
            </T>
          </View>
        </View>
      </View>
      <View style={[styles.cardBottom, { borderTopColor: c.border }]}>
        {sent ? (
          <Chip label={`You quoted ${formatPence(sent)}`} icon={CircleCheck} tone="success" />
        ) : (
          <T variant="subhead" color="inkMuted">
            {request.quotes === 0 ? `No quotes yet · ${PILOT.maxQuotesPerRequest} places` : `${request.quotes} of ${PILOT.maxQuotesPerRequest} quotes in`}
          </T>
        )}
        {sent ? null : (
          <View style={styles.inline}>
            <T variant="subhead" color="brand" style={{ fontWeight: '600' }}>
              Send a quote
            </T>
            <ChevronRight size={18} color={c.brand} strokeWidth={2.5} />
          </View>
        )}
      </View>
    </Card>
  );
}

function OfferCard({ offer, canOpen }: { offer: OfferView; canOpen: boolean }) {
  const c = usePalette();
  const pay = offerPay(offer.jobType);
  return (
    <Card
      selected={offer.urgent}
      selectedTone="urgent"
      accessibilityLabel={`${offer.urgent ? 'Urgent. ' : ''}${offer.jobType.label}, ${offer.postcode}, ${pay.amount} ${pay.note}`}
      onPress={canOpen ? () => router.push({ pathname: '/offer/[id]', params: { id: offer.id } }) : undefined}
      style={{ gap: Spacing.three }}>
      <View style={styles.cardTop}>
        <IconTile icon={offer.urgent ? Zap : TRADE_ICONS[offer.jobType.trade]} tone={offer.urgent ? 'urgent' : 'brand'} solid={offer.urgent} size={44} />
        <View style={{ flex: 1, gap: 4 }}>
          {offer.urgent ? <Chip label="Urgent" tone="urgent" /> : null}
          <T variant="headline" numberOfLines={1}>
            {offer.jobType.label}
          </T>
          <View style={styles.inline}>
            <MapPin size={14} color={c.inkMuted} strokeWidth={2.25} />
            <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
              {`${offer.postcode.split(' ')[0]} · ${offer.distanceKm} km`}
            </T>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T variant="title2" color="success" style={{ fontVariant: ['tabular-nums'], fontWeight: '700' }}>
            {pay.amount}
          </T>
          <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
            {pay.note}
          </T>
        </View>
      </View>
      <View style={[styles.cardBottom, { borderTopColor: c.border }]}>
        <View style={styles.inline}>
          <CalendarClock size={16} color={offer.urgent ? c.urgent : c.inkMuted} strokeWidth={2.25} />
          <T variant="subhead" color={offer.urgent ? 'urgent' : 'ink'} style={{ fontWeight: '600' }}>
            {offer.urgent ? 'Now · 60 seconds to accept' : offer.when}
          </T>
        </View>
        {canOpen ? (
          <View style={styles.inline}>
            <T variant="subhead" color="brand" style={{ fontWeight: '600' }}>
              View
            </T>
            <ChevronRight size={18} color={c.brand} strokeWidth={2.5} />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function LockedOffer({ offer }: { offer: OfferView }) {
  const c = usePalette();
  const pay = offerPay(offer.jobType);
  const needs = offer.missing.map((m) => CREDENTIAL_LABELS[m]).join(' and ');
  return (
    <View
      accessibilityLabel={`Locked job: ${offer.jobType.label}. Needs ${needs}`}
      style={[styles.locked, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.lockTile, { backgroundColor: c.surface }]}>
          <Lock size={20} color={c.inkMuted} strokeWidth={2.25} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="headline" color="inkMuted">
            {offer.jobType.label}
          </T>
          <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
            {`${offer.postcode.split(' ')[0]} · ${offer.distanceKm} km · ${offer.when}`}
          </T>
        </View>
        <T variant="title2" color="inkSubtle" style={{ fontVariant: ['tabular-nums'] }}>
          {pay.amount}
        </T>
      </View>
      <View style={[styles.needs, { backgroundColor: c.surface }]}>
        <T variant="caption" style={{ flex: 1, fontWeight: '500' }}>
          {`Needs ${needs}`}
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add a document to unlock ${offer.jobType.label}`}
          onPress={() => router.navigate('/documents')}
          style={[styles.addDoc, { backgroundColor: c.brandTint }]}>
          <Plus size={18} color={c.brand} strokeWidth={2.75} />
          <T variant="subhead" color="brand" style={{ fontWeight: '600' }}>
            Add document
          </T>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 6 },
  filter: { height: 40, paddingHorizontal: 14, borderRadius: Radii.pill, justifyContent: 'center', borderWidth: 1 },
  cardTop: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: Spacing.three },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locked: { borderRadius: Radii.lg, borderWidth: 1.5, borderStyle: 'dashed', padding: Spacing.four, gap: Spacing.three },
  lockTile: { width: 44, height: 44, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  needs: { borderRadius: Radii.md, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  addDoc: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 48, paddingHorizontal: Spacing.three, borderRadius: Radii.md },
});
