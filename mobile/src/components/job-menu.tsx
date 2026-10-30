// The booking menu: search, the popular jobs with their prices, each trade, and
// quotes for anything else. The website's front page and the app's home share it,
// and every choice goes straight to booking that job.
import type { Href } from 'expo-router';
import { ArrowRight, ChevronRight, DoorOpen, Droplet, Flame, MessageSquareQuote, PlugZap, Search, ShieldCheck, WashingMachine, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Grid, isHovered, linkProps } from '@/components/site/frame';
import { TRADE_ICONS } from '@/components/trade-icons';
import { T, type LucideIcon } from '@/components/ui';
import { Radii, SoftShadows, Spacing, Type, usePalette } from '@/constants/theme';
import { CALLOUT_RATES, findJobType, formatPence, fromPricePence, OFFERED_TRADES, POPULAR_JOBS, type JobType, type Trade } from '@/domain/catalog';
import { searchJobs } from '@/domain/search';

const JOB_ICONS: Record<string, LucideIcon> = {
  'boiler-service': Flame,
  'socket-replace': PlugZap,
  cp12: ShieldCheck,
  'appliance-plumb-in': WashingMachine,
  'tap-repair': Droplet,
  'door-repair': DoorOpen,
};

/** "£119" and "fixed price", or "£95" and "for the first hour". */
export function menuPrice(job: JobType): { price: string; note: string } {
  return job.pricing.kind === 'fixed'
    ? { price: formatPence(job.pricing.pence), note: 'fixed price' }
    : { price: formatPence(CALLOUT_RATES.standard.firstHourPence), note: 'for the first hour' };
}

/** Booking a job, or choosing one of a trade's jobs. */
export function bookingHref(p: { trade: Trade; job?: string; postcode?: string; urgent?: boolean; pro?: { id: string; name: string } }): Href {
  return {
    pathname: '/request',
    params: {
      trade: p.trade,
      ...(p.job ? { job: p.job } : {}),
      ...(p.postcode ? { postcode: p.postcode } : {}),
      ...(p.urgent ? { urgent: '1' } : {}),
      ...(p.pro ? { pro: p.pro.id, proName: p.pro.name } : {}),
    },
  };
}

/** `onCard`: the menu sits on a white card (the website), so tiles are cream.
 *  `tradeTiles`: show each trade as a tile with its starting price (the app). */
export function JobMenu({
  postcode,
  onCard,
  tradeTiles,
  placeholder = 'What needs fixing?',
}: {
  postcode?: string;
  onCard?: boolean;
  tradeTiles?: boolean;
  placeholder?: string;
}) {
  const c = usePalette();
  const [query, setQuery] = useState('');
  const results = searchJobs(query).slice(0, 6);
  const quotes: Href = { pathname: '/quote', params: postcode ? { postcode } : {} };

  return (
    <View style={{ gap: Spacing.five }}>
      <View style={[styles.search, { backgroundColor: onCard ? c.bg : c.surface }, !onCard && SoftShadows.soft]}>
        <Search size={20} color={c.inkMuted} strokeWidth={2.2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={c.inkSubtle}
          accessibilityLabel="Search for a job"
          returnKeyType="search"
          autoCorrect={false}
          style={[Type.body, styles.searchInput, { color: c.ink }]}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery('')}>
            <X size={18} color={c.inkMuted} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      {query.trim() ? (
        <View style={{ gap: Spacing.two }}>
          {results.map((job) => (
            <ResultRow key={job.id} job={job} href={bookingHref({ trade: job.trade, job: job.id, postcode })} onCard={onCard} />
          ))}
          {results.length ? null : (
            <T variant="callout" color="inkMuted" style={{ paddingHorizontal: Spacing.one }}>
              {`Nothing called “${query.trim()}” yet. Describe it and local pros will send you prices.`}
            </T>
          )}
        </View>
      ) : (
        <>
          <View style={{ gap: Spacing.three }}>
            <T variant="subhead" color="inkMuted" style={{ fontWeight: '600' }}>
              Popular jobs
            </T>
            <Grid columns={{ narrow: 2, medium: 3, wide: 3 }} gap={Spacing.three}>
              {POPULAR_JOBS.map((p) => {
                const job = findJobType(p.id)!;
                return <JobTile key={p.id} job={job} label={p.label} href={bookingHref({ trade: job.trade, job: job.id, postcode })} onCard={onCard} />;
              })}
            </Grid>
          </View>
          <View style={{ gap: Spacing.three }}>
            <T variant="subhead" color="inkMuted" style={{ fontWeight: '600' }}>
              Every job, by trade
            </T>
            {tradeTiles ? (
              <View style={styles.tradeTiles}>
                {OFFERED_TRADES.map((t) => {
                  const Icon = TRADE_ICONS[t.id];
                  const from = formatPence(fromPricePence(t.id));
                  return (
                    <Pressable
                      key={t.id}
                      {...linkProps(bookingHref({ trade: t.id, postcode }))}
                      accessibilityLabel={`${t.label}. ${t.detail}. From ${from}, including VAT and fees`}
                      style={(state) => [styles.tradeTile, SoftShadows.soft, { backgroundColor: isHovered(state) || state.pressed ? c.surfaceMuted : c.surface }]}>
                      <View style={[styles.tradeTileIcon, { backgroundColor: c.ink }]}>
                        <Icon size={22} color={c.accent} strokeWidth={2.2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <T variant="bodyStrong" numberOfLines={1} style={{ fontSize: 15, fontWeight: '700' }}>
                          {t.short}
                        </T>
                        <T variant="footnote" color="inkMuted">{`From ${from}`}</T>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.trades}>
                {OFFERED_TRADES.map((t) => {
                  const Icon = TRADE_ICONS[t.id];
                  return (
                    <Pressable
                      key={t.id}
                      {...linkProps(bookingHref({ trade: t.id, postcode }))}
                      accessibilityLabel={`${t.service}: ${t.detail}`}
                      style={(state) => [styles.trade, { borderColor: c.border, backgroundColor: isHovered(state) || state.pressed ? c.surfaceMuted : c.surface }]}>
                      <Icon size={16} color={c.accentStrong} strokeWidth={2.2} />
                      <T variant="subhead" style={{ fontWeight: '600' }}>
                        {t.service}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}

      <Pressable
        {...linkProps(quotes)}
        accessibilityLabel="Something else? Describe any job and get quotes from local pros"
        style={(state) => [styles.quotes, { backgroundColor: c.accentTint }, (isHovered(state) || state.pressed) && { opacity: 0.85 }]}>
        <View style={[styles.quotesIcon, { backgroundColor: c.surface }]}>
          <MessageSquareQuote size={18} color={c.accentStrong} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="headline" style={{ fontSize: 16 }}>
            Something else? Get quotes
          </T>
          <T variant="footnote" color="inkMuted">
            Describe it and local pros send you prices
          </T>
        </View>
        <ArrowRight size={18} color={c.ink} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

function JobTile({ job, label, href, onCard }: { job: JobType; label: string; href: Href; onCard?: boolean }) {
  const c = usePalette();
  const Icon = JOB_ICONS[job.id] ?? TRADE_ICONS[job.trade];
  const { price, note } = menuPrice(job);
  return (
    <Pressable
      {...linkProps(href)}
      accessibilityLabel={`${label}, ${price} ${note}`}
      style={(state) => [
        styles.tile,
        { backgroundColor: onCard ? c.bg : c.surface },
        !onCard && SoftShadows.soft,
        (isHovered(state) || state.pressed) && { backgroundColor: onCard ? c.accentTint : c.surfaceMuted },
      ]}>
      <View style={[styles.tileIcon, { backgroundColor: onCard ? c.surface : c.accentTint }]}>
        <Icon size={20} color={c.accentStrong} strokeWidth={2.1} />
      </View>
      <T variant="headline" numberOfLines={3} style={{ fontSize: 16, lineHeight: 21, flexGrow: 1 }}>
        {label}
      </T>
      <View>
        <T variant="bodyStrong" style={{ fontWeight: '700' }}>
          {price}
        </T>
        <T variant="footnote" color="inkMuted">
          {note}
        </T>
      </View>
    </Pressable>
  );
}

function ResultRow({ job, href, onCard }: { job: JobType; href: Href; onCard?: boolean }) {
  const c = usePalette();
  const Icon = JOB_ICONS[job.id] ?? TRADE_ICONS[job.trade];
  const { price, note } = menuPrice(job);
  return (
    <Pressable
      {...linkProps(href)}
      accessibilityLabel={`${job.label}, ${price} ${note}`}
      style={(state) => [styles.result, { backgroundColor: isHovered(state) || state.pressed ? c.accentTint : onCard ? c.bg : c.surface }]}>
      <Icon size={20} color={c.accentStrong} strokeWidth={2.1} />
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong">{job.label}</T>
        <T variant="footnote" color="inkMuted">{`${price} ${note}`}</T>
      </View>
      <ChevronRight size={18} color={c.inkSubtle} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, height: 56, paddingHorizontal: Spacing.four, borderRadius: Radii.md },
  searchInput: { flex: 1, height: 56, padding: 0, outlineStyle: 'none' } as object,
  tile: { flex: 1, minHeight: 168, borderRadius: Radii.lg, padding: Spacing.four, gap: Spacing.three },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trades: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  trade: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: Spacing.four, borderRadius: Radii.pill, borderWidth: 1 },
  tradeTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tradeTile: { flexGrow: 1, flexBasis: '46%', borderRadius: Radii.lg, padding: Spacing.three, gap: Spacing.three, flexDirection: 'row', alignItems: 'center' },
  tradeTileIcon: { width: 44, height: 44, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  quotes: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radii.md, padding: Spacing.four },
  quotesIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  result: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radii.md, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
});
