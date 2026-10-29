import { Check, Moon, Sun } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Container, Grid, H2, H3, Lead, PageIntro, Pill, Section, SectionHeading, SiteIcon, SitePage, useBreakpoint } from '@/components/site/frame';
import { CtaBand } from '@/components/site/widgets';
import { T } from '@/components/ui';
import { SoftShadows, Spacing, usePalette } from '@/constants/theme';
import { FEES_AND_CANCELLING, PAYMENT_STEPS } from '@/content/site';
import { ALL_IN_NOTE, CALLOUT_RATES, formatPence, isOffered, JOB_TYPES, TRADES } from '@/domain/catalog';
import { WAITLIST } from '@/lib/launch';

const CALLOUTS = [
  { icon: Sun, name: 'Standard callout', when: '7am to 8pm, Monday to Friday', rate: CALLOUT_RATES.standard, tint: 'accentTint' as const },
  { icon: Moon, name: 'Out-of-hours callout', when: 'After 8pm on weekdays, and all weekend', rate: CALLOUT_RATES.outOfHours, tint: 'urgentTint' as const },
];

const FIXED = JOB_TYPES.filter((j) => j.pricing.kind === 'fixed' && isOffered(j.trade));

export default function Prices() {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  return (
    <SitePage title="Prices">
      <PageIntro eyebrow="Prices" title="Simple prices. No surprises." sub="All prices include VAT and fees. You always see the price before you book." />
      <Container style={{ paddingBottom: Spacing.ten }}>
        <Grid columns={{ narrow: 1, medium: 2, wide: 2 }}>
          {CALLOUTS.map(({ icon, name, when, rate, tint }) => (
            <View key={name} style={[styles.callout, { backgroundColor: c[tint] }]}>
              <View style={{ flexDirection: 'row', gap: Spacing.four, alignItems: 'center' }}>
                <SiteIcon icon={icon} tone="white" />
                <View style={{ flex: 1 }}>
                  <H3>{name}</H3>
                  <T variant="callout" color="inkMuted">
                    {when}
                  </T>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two }}>
                <T variant="money" style={{ fontSize: 56, lineHeight: 60 }}>
                  {formatPence(rate.firstHourPence)}
                </T>
                <T variant="callout" color="inkMuted" style={{ marginBottom: 8 }}>
                  including the first hour
                </T>
              </View>
              {[`Then ${formatPence(rate.perHourPence)} an hour`, 'For repairs: leaks, blockages, boiler and electrical faults', 'Parts priced and approved by you in the app'].map((line) => (
                <View key={line} style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
                  <Check size={18} color={c.accentStrong} strokeWidth={2.6} style={{ flexShrink: 0 }} />
                  <T variant="body" style={{ flex: 1 }}>{line}</T>
                </View>
              ))}
              <Pill label={WAITLIST ? 'Join the waiting list' : 'Book a callout'} variant={WAITLIST ? 'teal' : 'primary'} href={WAITLIST ? '/waitlist' : '/home'} style={{ alignSelf: 'flex-start', marginTop: Spacing.two }} />
            </View>
          ))}
        </Grid>
      </Container>
      <Section background="surface">
        <View style={{ gap: Spacing.two }}>
          <H2>Fixed-price jobs</H2>
          <Lead>One price, however long it takes.</Lead>
        </View>
        <View style={[styles.table, { borderColor: c.border }]}>
          {FIXED.map((job, i) => (
            <View key={job.id} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }, narrow && { flexDirection: 'column', alignItems: 'flex-start', gap: 2 }]}>
              <View style={{ flex: 2 }}>
                <T variant="bodyStrong">{job.label}</T>
                <T variant="footnote" color="inkMuted">
                  {TRADES.find((t) => t.id === job.trade)?.service}
                </T>
              </View>
              <View style={{ flex: 1, alignItems: narrow ? 'flex-start' : 'flex-end' }}>
                <T variant="headline">{job.pricing.kind === 'fixed' ? formatPence(job.pricing.pence) : ''}</T>
                {job.pricing.kind === 'fixed' && job.pricing.extraUnitPence ? (
                  <T variant="footnote" color="inkMuted">{`plus ${formatPence(job.pricing.extraUnitPence)} ${job.pricing.extraUnitLabel}`}</T>
                ) : null}
              </View>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
          <Check size={18} color={c.accentStrong} strokeWidth={2.6} style={{ flexShrink: 0 }} />
          <T variant="bodyStrong" style={{ flex: 1 }}>{ALL_IN_NOTE}</T>
        </View>
      </Section>
      <Section>
        <SectionHeading eyebrow="Paying" title="How payment works" />
        <Grid columns={{ narrow: 1, medium: 3, wide: 3 }}>
          {PAYMENT_STEPS.map((s) => (
            <View key={s.title} style={[styles.card, SoftShadows.soft, { backgroundColor: c.surface }]}>
              <SiteIcon icon={s.icon} />
              <H3>{s.title}</H3>
              <T variant="body" color="inkMuted">
                {s.text}
              </T>
            </View>
          ))}
        </Grid>
      </Section>
      <Section background="surface">
        <SectionHeading eyebrow="The small print" title="Fees and cancelling" sub="Written plainly, so there are no surprises." />
        <Grid columns={{ narrow: 1, medium: 2, wide: 4 }}>
          {FEES_AND_CANCELLING.map((s) => (
            <View key={s.title} style={[styles.card, { backgroundColor: c.bg }]}>
              <SiteIcon icon={s.icon} tone="peach" />
              <H3>{s.title}</H3>
              <T variant="body" color="inkMuted">
                {s.text}
              </T>
            </View>
          ))}
        </Grid>
      </Section>
      <CtaBand />
    </SitePage>
  );
}

const styles = StyleSheet.create({
  callout: { borderRadius: 28, padding: Spacing.eight, gap: Spacing.four, flex: 1 },
  table: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, paddingHorizontal: Spacing.six, paddingVertical: Spacing.four },
  card: { borderRadius: 24, padding: Spacing.six, gap: Spacing.three, flex: 1 },
});
