import { useLocalSearchParams } from 'expo-router';
import { Check, Clock, Moon, Sun, MessagesSquare } from 'lucide-react-native';
import { useRef } from 'react';
import { Pressable, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { Container, H3, headingLevel, isHovered, Lead, PageIntro, Pill, SiteIcon, SitePage, useBreakpoint } from '@/components/site/frame';
import { ComingSoon, CtaBand } from '@/components/site/widgets';
import { TRADE_ICONS } from '@/components/trade-icons';
import { T } from '@/components/ui';
import { SoftShadows, Spacing, usePalette } from '@/constants/theme';
import { CALLOUT_RATES, formatPence, jobTypesForTrade, OFFERED_TRADES, type JobType, type Trade } from '@/domain/catalog';
import { WAITLIST } from '@/lib/launch';

const std = CALLOUT_RATES.standard;
const ooh = CALLOUT_RATES.outOfHours;

function priceOf(job: JobType) {
  if (job.pricing.kind === 'fixed') {
    return {
      price: `${formatPence(job.pricing.pence)} fixed`,
      note: job.pricing.extraUnitPence ? `plus ${formatPence(job.pricing.extraUnitPence)} ${job.pricing.extraUnitLabel}` : 'One price, however long it takes',
    };
  }
  return {
    price: `${formatPence(std.firstHourPence)} first hour`,
    note: `then ${formatPence(std.perHourPence)}/hour · evenings and weekends ${formatPence(ooh.firstHourPence)}, then ${formatPence(ooh.perHourPence)}/hour`,
  };
}

export default function Services() {
  const c = usePalette();
  const { wide, narrow } = useBreakpoint();
  const { trade } = useLocalSearchParams<{ trade?: Trade }>();
  const scroll = useRef<ScrollViewInstance>(null);
  // Where each trade's section starts, so the chips (and ?trade= links) can jump to it.
  const base = useRef(0);
  const tops = useRef<Partial<Record<Trade, number>>>({});
  const jump = (t: Trade) => scroll.current?.scrollTo({ y: Math.max(0, base.current + (tops.current[t] ?? 0) - 24), animated: true });

  return (
    <SitePage title="Services" scrollRef={scroll}>
      <PageIntro
        eyebrow="Services"
        title="Four trades, all in one place"
        sub="Every job has a clear price before you book. Pick yours below, or ask for quotes if it’s something else."
      />

      <View onLayout={(e) => (base.current = e.nativeEvent.layout.y)}>
      <Container style={{ gap: Spacing.ten, paddingBottom: Spacing.ten }}>
        <View style={styles.chips}>
          {OFFERED_TRADES.map((t) => {
            const Icon = TRADE_ICONS[t.id];
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                onPress={() => jump(t.id)}
                style={(state) => [styles.chip, { backgroundColor: isHovered(state) ? c.accentTint : c.surface, borderColor: c.border }]}>
                <Icon size={16} color={c.accentStrong} />
                <T variant="subhead" style={{ fontWeight: '600' }}>
                  {t.service}
                </T>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.rates, { backgroundColor: c.accentTint }, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flexDirection: 'row', gap: Spacing.four, flex: 1, alignItems: 'center' }}>
            <SiteIcon icon={Clock} tone="white" />
            <View style={{ flex: 1 }}>
              <H3>How callout jobs are priced</H3>
              <T variant="callout" color="inkMuted">
                For repairs where nobody knows the fix until they see it.
              </T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.three }}>
            {[
              { icon: Sun, label: '7am–8pm weekdays', r: std },
              { icon: Moon, label: 'Evenings & weekends', r: ooh },
            ].map(({ icon: Icon, label, r }) => (
              <View key={label} style={[styles.rate, { backgroundColor: c.surface }, narrow && { flex: 1 }]}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Icon size={14} color={c.accentStrong} />
                  <T variant="caption" color="accentStrong">
                    {label}
                  </T>
                </View>
                <T variant="title1">{formatPence(r.firstHourPence)}</T>
                <T variant="footnote" color="inkMuted">
                  {`first hour, then ${formatPence(r.perHourPence)}/hour`}
                </T>
              </View>
            ))}
          </View>
        </View>

        {OFFERED_TRADES.map((t) => (
          <View
            key={t.id}
            nativeID={t.id}
            onLayout={(e) => {
              tops.current[t.id] = e.nativeEvent.layout.y;
              if (trade === t.id) setTimeout(() => jump(t.id), 100);
            }}
            style={[styles.trade, !wide && { flexDirection: 'column' }]}>
            <View style={{ width: wide ? 300 : undefined, gap: Spacing.three }}>
              <SiteIcon icon={TRADE_ICONS[t.id]} tone="white" />
              <T variant="display" accessibilityRole="header" {...headingLevel(2)} style={{ fontSize: 30, lineHeight: 36 }}>
                {t.service}
              </T>
              <View style={{ gap: 6 }}>
                {t.includes.map((line) => (
                  <View key={line} style={{ flexDirection: 'row', gap: Spacing.two }}>
                    <Check size={16} color={c.accentStrong} strokeWidth={2.6} style={{ marginTop: 4 }} />
                    <T variant="body" color="inkMuted" style={{ flex: 1 }}>
                      {line}
                    </T>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ flex: 1, gap: Spacing.three }}>
              {jobTypesForTrade(t.id).map((job) => {
                const p = priceOf(job);
                return (
                  <View key={job.id} style={[styles.job, SoftShadows.soft, { backgroundColor: c.surface }, narrow && { flexDirection: 'column', alignItems: 'stretch' }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two }}>
                        <T variant="headline">{job.label}</T>
                        {job.urgentAllowed ? (
                          <View style={[styles.tag, { backgroundColor: c.urgentTint }]}>
                            <T variant="caption" color="urgent" style={{ fontSize: 12 }}>
                              Urgent OK
                            </T>
                          </View>
                        ) : null}
                      </View>
                      <T variant="footnote" color="inkMuted">
                        {p.note}
                      </T>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.four, justifyContent: 'space-between' }}>
                      <T variant="headline">{p.price}</T>
                      <Pill label={WAITLIST ? 'Preview' : 'Book'} variant={WAITLIST ? 'secondary' : 'primary'} size="sm" href={{ pathname: '/home', params: { trade: t.id, job: job.id } }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={[styles.quotes, { backgroundColor: c.urgentTint }, !wide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <SiteIcon icon={MessagesSquare} tone="white" />
          <View style={{ flex: 1, gap: 4 }}>
            <H3>Something else?</H3>
            <Lead style={{ fontSize: 16, lineHeight: 24 }}>Describe the job, add a few photos and get up to 5 quotes from vetted local pros. No obligation.</Lead>
          </View>
          <Pill label="Get quotes" href="/quote" size="lg" />
        </View>
        <ComingSoon />
      </Container>
      </View>

      <CtaBand />
    </SitePage>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  rates: { flexDirection: 'row', alignItems: 'center', gap: Spacing.five, borderRadius: 28, padding: Spacing.six },
  rate: { borderRadius: 20, padding: Spacing.four, gap: 2, minWidth: 150 },
  trade: { flexDirection: 'row', gap: Spacing.eight },
  job: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, borderRadius: 20, paddingHorizontal: Spacing.five, paddingVertical: Spacing.four },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  quotes: { flexDirection: 'row', alignItems: 'center', gap: Spacing.five, borderRadius: 28, padding: Spacing.six },
});
