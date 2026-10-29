// The website's front page: what Relay is, the four trades, how it works and
// why to trust it, before anyone is asked to book.
import { ArrowRight, BadgeCheck, Siren } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProCard, ReviewCard } from '@/components/examples';
import { TRADE_ICONS } from '@/components/trade-icons';
import { T } from '@/components/ui';
import { SoftShadows, Spacing, usePalette } from '@/constants/theme';
import { EXAMPLE_PROS, EXAMPLE_REVIEWS, EXAMPLES_NOTE } from '@/content/examples';
import { BENEFITS, HOME_FAQS, HOME_STEPS } from '@/content/site';
import { CALLOUT_RATES, formatPence, fromPricePence, OFFERED_TRADES } from '@/domain/catalog';

import { LandlordFlowStrip } from './landlord-diagram';
import { ArrowLink, Container, Eyebrow, Grid, H1, H2, H3, isHovered, linkProps, Lead, Pill, Section, SectionHeading, SiteIcon, SitePage, useBreakpoint } from './frame';
import { BookingMockup, ComingSoon, CtaBand, FaqList, PostcodeCheck, TrustStrip } from './widgets';

export function HomePage() {
  return (
    <SitePage title="Relay">
      <Hero />
      <TrustStrip />
      <WhatWeFix />
      <HowItWorks />
      <LocalPros />
      <Emergency />
      <WhyRelay />
      <ForLandlords />
      <FaqTeaser />
      <CtaBand />
    </SitePage>
  );
}

function Hero() {
  const c = usePalette();
  const { wide, narrow } = useBreakpoint();
  return (
    <Container style={{ paddingTop: narrow ? Spacing.eight : 64, paddingBottom: narrow ? Spacing.ten : 72 }}>
      <View style={[styles.hero, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={{ flex: wide ? 1.15 : undefined, gap: Spacing.six }}>
          <View style={[styles.badge, SoftShadows.soft, { backgroundColor: c.surface }]}>
            <View style={[styles.dot, { backgroundColor: c.accentStrong }]} />
            <T variant="subhead" style={{ fontWeight: '600' }}>
              Often at your door within the hour
            </T>
          </View>
          <H1 style={wide ? { fontSize: 64, lineHeight: 68 } : undefined}>
            Trusted local trades at your door, <Text style={{ color: c.accentStrong }}>fast.</Text>
          </H1>
          <Lead big style={{ maxWidth: 560 }}>
            Gas engineers, electricians, plumbers and carpenters. Book a vetted local pro in two minutes, see the price first, and pay only when the job’s done.
          </Lead>
          <PostcodeCheck />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.three }}>
            <Pill label="Emergency? Get help now" variant="ember" icon={Siren} href={{ pathname: '/home', params: { urgent: '1' } }} />
            <T variant="subhead" color="inkMuted">
              Now covering Fulham, SW6
            </T>
          </View>
          <View style={[styles.tradeCta, { borderTopColor: c.border }]}>
            <T variant="subhead" color="inkMuted">
              Are you a tradesperson?
            </T>
            <ArrowLink label="Get local jobs with Relay Traders" href="/for-tradespeople" />
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, alignItems: 'center' }}>
          <BookingMockup />
        </View>
      </View>
    </Container>
  );
}

function WhatWeFix() {
  return (
    <Section>
      <SectionHeading
        eyebrow="What we fix"
        title="Four trades. One easy way to book."
        sub="From a boiler that won’t fire to a door that won’t close, one booking gets a checked local pro on the way."
      />
      <Grid columns={{ narrow: 2, medium: 2, wide: 4 }} gap={Spacing.four}>
        {OFFERED_TRADES.map((t, i) => (
          <TradeTile key={t.id} trade={t} tint={i % 2 === 0 ? 'accentTint' : 'urgentTint'} />
        ))}
      </Grid>
      <ComingSoon />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.five }}>
        <ArrowLink label="See every job and price" href="/services" />
        <ArrowLink label="Something else? Get quotes" href="/quote" color="ink" />
      </View>
    </Section>
  );
}

function TradeTile({ trade, tint }: { trade: (typeof OFFERED_TRADES)[number]; tint: 'accentTint' | 'urgentTint' }) {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  const Icon = TRADE_ICONS[trade.id];
  return (
      <Pressable
        {...linkProps({ pathname: '/services', params: { trade: trade.id } })}
        accessibilityLabel={`${trade.service}: ${trade.includes.join(', ')}. From ${formatPence(fromPricePence(trade.id))}`}
        style={(state) => [styles.tile, { backgroundColor: c[tint], padding: narrow ? Spacing.four : Spacing.six }, isHovered(state) && SoftShadows.lift]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.two }}>
          <View style={[styles.tileIcon, SoftShadows.soft, { backgroundColor: c.surface }]}>
            <Icon size={22} color={tint === 'accentTint' ? c.accentStrong : c.urgent} strokeWidth={2} />
          </View>
          {narrow ? null : (
            <View style={[styles.from, { backgroundColor: c.surface }]}>
              <T variant="caption">{`From ${formatPence(fromPricePence(trade.id))}`}</T>
            </View>
          )}
        </View>
        <View style={{ gap: 4 }}>
          <H3 style={narrow ? { fontSize: 17, lineHeight: 22 } : undefined}>{trade.service}</H3>
          <View style={{ gap: 2, marginTop: 2 }}>
            {trade.includes.slice(0, narrow ? 3 : 4).map((line) => (
              <T key={line} variant={narrow ? 'footnote' : 'callout'} color="inkMuted">
                {`· ${line}`}
              </T>
            ))}
          </View>
          {narrow ? (
            <T variant="caption" color="ink" style={{ marginTop: 4 }}>
              {`From ${formatPence(fromPricePence(trade.id))}`}
            </T>
          ) : null}
        </View>
      </Pressable>
  );
}

function HowItWorks() {
  const c = usePalette();
  const { wide } = useBreakpoint();
  return (
    <Section background="surface">
      <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: Spacing.four }, !wide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <SectionHeading eyebrow="How it works" title="Fixed in three simple steps" />
        <ArrowLink label="More about how it works" href="/how-it-works" />
      </View>
      <Grid columns={{ narrow: 1, medium: 3, wide: 3 }}>
        {HOME_STEPS.map((step, i) => (
          <View key={step.title} style={[styles.step, { backgroundColor: c.bg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
              <View style={[styles.stepNo, { backgroundColor: c.ink }]}>
                <T variant="headline" color="onBrand">
                  {String(i + 1)}
                </T>
              </View>
              <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
              <SiteIcon icon={step.icon} />
            </View>
            <H3>{step.title}</H3>
            <T variant="body" color="inkMuted">
              {step.text}
            </T>
          </View>
        ))}
      </Grid>
    </Section>
  );
}

function LocalPros() {
  return (
    <Section>
      <SectionHeading eyebrow="Local pros" title="Rated by your neighbours" sub="Every pro shows their experience, checks and reviews from paid Relay jobs." />
      <Grid columns={{ narrow: 2, medium: 4, wide: 4 }} gap={Spacing.four}>
        {EXAMPLE_PROS.map((p) => (
          <ProCard key={p.name} pro={p} style={{ flex: 1 }} />
        ))}
      </Grid>
      <Grid columns={{ narrow: 1, medium: 3, wide: 3 }} gap={Spacing.four}>
        {EXAMPLE_REVIEWS.map((r) => (
          <ReviewCard key={r.name} review={r} style={{ flex: 1 }} />
        ))}
      </Grid>
      <T variant="caption" color="inkSubtle">
        {EXAMPLES_NOTE}
      </T>
    </Section>
  );
}

function Emergency() {
  const c = usePalette();
  const { wide, narrow } = useBreakpoint();
  return (
    <Container style={{ paddingVertical: narrow ? 56 : 88 }}>
      <View style={[styles.emergency, { backgroundColor: c.urgentTint, padding: narrow ? Spacing.six : 48 }, !wide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, gap: Spacing.four }}>
          <SiteIcon icon={Siren} tone="white" size={56} />
          <T variant="display" accessibilityRole="header" style={{ fontSize: narrow ? 30 : 36, lineHeight: narrow ? 34 : 42 }}>
            Emergency?
          </T>
          <Lead style={{ color: c.ink, maxWidth: 580 }}>
            Leak, no power or no heating? We aim to have someone with you within the hour, day or night.
          </Lead>
        </View>
        <View style={{ gap: Spacing.two, alignItems: wide ? 'flex-end' : 'flex-start' }}>
          <Pill label="Get urgent help" variant="emberSolid" size="lg" icon={ArrowRight} trailing href={{ pathname: '/home', params: { urgent: '1' } }} />
          <T variant="footnote" color="inkMuted">
            {`From ${formatPence(CALLOUT_RATES.standard.firstHourPence)} including the first hour`}
          </T>
        </View>
      </View>
    </Container>
  );
}

/** Landlords and agents: the pitch in a sentence, and the way to the full page. */
function ForLandlords() {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  return (
    <Container style={{ paddingBottom: narrow ? 56 : 88 }}>
      <View style={[styles.landlords, { backgroundColor: c.ink, padding: narrow ? Spacing.six : 48 }]}>
        <Eyebrow tone="white">Landlords and letting agents</Eyebrow>
        <H2 style={{ color: '#FFFFFF', maxWidth: 720 }}>Let tenants send repairs straight to you.</H2>
        <Lead style={{ color: '#C9CFDD', maxWidth: 640 }}>
          No more back and forth between your tenant, you and a tradesperson. Approve with one tap, and see every property’s repairs and spend in one dashboard.
        </Lead>
        <LandlordFlowStrip dark />
        <Pill label="Relay for landlords" variant="secondary" size="lg" icon={ArrowRight} trailing href="/landlords" style={{ alignSelf: 'flex-start' }} />
      </View>
    </Container>
  );
}

function WhyRelay() {
  const c = usePalette();
  return (
    <Section style={{ paddingTop: 0 }}>
      <SectionHeading
        eyebrow="Why Relay"
        title="The calm way to get things fixed"
        sub="We built Relay because finding a good tradesperson in a hurry shouldn’t be stressful."
      />
      <Grid columns={{ narrow: 1, medium: 3, wide: 3 }}>
        {BENEFITS.map((b) => (
          <View key={b.title} style={[styles.benefit, SoftShadows.soft, { backgroundColor: c.surface }]}>
            <SiteIcon icon={b.icon} tone="peach" />
            <H3>{b.title}</H3>
            <T variant="body" color="inkMuted">
              {b.text}
            </T>
          </View>
        ))}
      </Grid>
      <View style={[styles.vetBar, { backgroundColor: c.accentTint }]}>
        <BadgeCheck size={20} color={c.accentStrong} />
        <T variant="bodyStrong" style={{ flex: 1 }}>
          Every pro is checked before their first job.
        </T>
        <ArrowLink label="How we vet" href="/safety" />
      </View>
    </Section>
  );
}

function FaqTeaser() {
  const { wide } = useBreakpoint();
  return (
    <Section background="surface">
      <View style={[{ flexDirection: 'row', gap: Spacing.ten }, !wide && { flexDirection: 'column', gap: Spacing.six }]}>
        <View style={{ width: wide ? 320 : undefined, gap: Spacing.five }}>
          <Eyebrow>Questions</Eyebrow>
          <T variant="display" accessibilityRole="header" style={{ fontSize: 38, lineHeight: 44 }}>
            Good to know
          </T>
          <Pill label="See all questions" variant="secondary" icon={ArrowRight} trailing href="/help" style={{ alignSelf: 'flex-start' }} />
        </View>
        <View style={{ flex: 1 }}>
          <FaqList items={HOME_FAQS} />
        </View>
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 48 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tradeCta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: Spacing.two, rowGap: 4, borderTopWidth: 1, paddingTop: Spacing.five },
  tile: { borderRadius: 28, gap: Spacing.five, flex: 1 },
  tileIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  from: { borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 4 },
  step: { borderRadius: 28, padding: Spacing.six, gap: Spacing.four, flex: 1 },
  stepNo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emergency: { flexDirection: 'row', alignItems: 'center', gap: Spacing.six, borderRadius: 28 },
  landlords: { borderRadius: 28, gap: Spacing.five },
  benefit: { borderRadius: 24, padding: Spacing.six, gap: Spacing.four, flex: 1 },
  vetBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.three, borderRadius: 999, paddingHorizontal: Spacing.five, paddingVertical: Spacing.four },
});
