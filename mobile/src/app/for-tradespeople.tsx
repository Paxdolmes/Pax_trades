import { ArrowRight, HandCoins } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Container, Eyebrow, Grid, H1, H2, H3, Lead, Pill, Section, SectionHeading, SiteIcon, SitePage, useBreakpoint } from '@/components/site/frame';
import { TRADE_ICONS } from '@/components/trade-icons';
import { T } from '@/components/ui';
import { SoftShadows, Spacing, usePalette } from '@/constants/theme';
import { COMMISSION, JOIN_STEPS, PERKS } from '@/content/site';
import { TRADES, type Trade } from '@/domain/catalog';
import { openTradersApp } from '@/lib/links';

const WANTED: Record<Trade, string> = {
  plumbing: 'Plumbers',
  electrical: 'Electricians',
  heating: 'Gas Safe engineers',
  drains: 'Drain engineers',
  locksmith: 'Locksmiths',
  handyman: 'Handymen',
  carpentry: 'Carpenters',
  appliances: 'Appliance engineers',
};

export default function ForTradespeople() {
  const c = usePalette();
  const { wide, narrow } = useBreakpoint();
  return (
    <SitePage title="For tradespeople">
      <Container style={{ paddingTop: narrow ? Spacing.ten : 64, paddingBottom: narrow ? Spacing.ten : 64 }}>
        <View style={[styles.hero, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flex: wide ? 1.2 : undefined, gap: Spacing.five }}>
            <Eyebrow>Relay Traders</Eyebrow>
            <H1>Good local jobs. Fair pay. No lead fees.</H1>
            <Lead big>Relay sends you Fulham customers who’ve already booked and added a card. You turn up, do great work and get paid.</Lead>
            <Pill label="Apply to join" size="lg" icon={ArrowRight} trailing onPress={openTradersApp} style={{ alignSelf: 'flex-start' }} />
          </View>
          <View style={[styles.rate, { backgroundColor: c.ink, flex: wide ? 1 : undefined }]}>
            <T variant="overline" style={{ color: c.accent }}>
              FOUNDING MEMBER RATE
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two }}>
              <T variant="money" style={{ color: '#FFFFFF', fontSize: 88, lineHeight: 92 }}>
                {COMMISSION.founding}
              </T>
              <T variant="title2" style={{ color: '#C9CFDD', marginBottom: 14 }}>
                commission
              </T>
            </View>
            <T variant="body" style={{ color: '#C9CFDD' }}>
              {`For your first 6 months while we launch in SW6, then ${COMMISSION.standard}.`}
            </T>
            <View style={[styles.noFees, { backgroundColor: '#15275A' }]}>
              <HandCoins size={20} color={c.accent} />
              <T variant="bodyStrong" style={{ color: '#FFFFFF' }}>
                No lead fees. No monthly subscription.
              </T>
            </View>
          </View>
        </View>
      </Container>
      <Section background="surface">
        <Grid columns={{ narrow: 1, medium: 2, wide: 4 }}>
          {PERKS.map((p) => (
            <View key={p.title} style={[styles.card, { backgroundColor: c.bg }]}>
              <SiteIcon icon={p.icon} />
              <H3>{p.title}</H3>
              <T variant="body" color="inkMuted">
                {p.text}
              </T>
            </View>
          ))}
        </Grid>
      </Section>
      <Section>
        <SectionHeading eyebrow="Joining" title="Four steps to your first job" />
        <Grid columns={{ narrow: 1, medium: 2, wide: 4 }}>
          {JOIN_STEPS.map((s, i) => (
            <View key={s.title} style={[styles.card, SoftShadows.soft, { backgroundColor: c.surface }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <SiteIcon icon={s.icon} />
                <T variant="subhead" color="accentStrong" style={{ fontWeight: '700' }}>{`Step ${i + 1}`}</T>
              </View>
              <H3>{s.title}</H3>
              <T variant="body" color="inkMuted">
                {s.text}
              </T>
            </View>
          ))}
        </Grid>
        <View style={{ gap: Spacing.four }}>
          <H3>We’re looking for</H3>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
            {TRADES.map((t) => {
              const Icon = TRADE_ICONS[t.id];
              return (
                <View key={t.id} style={[styles.chip, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Icon size={16} color={c.accentStrong} />
                  <T variant="subhead" style={{ fontWeight: '600' }}>
                    {WANTED[t.id]}
                  </T>
                </View>
              );
            })}
          </View>
        </View>
      </Section>
      <Container style={{ paddingBottom: narrow ? 56 : 88 }}>
        <View style={[styles.cta, { backgroundColor: c.accentTint }]}>
          <H2 style={{ textAlign: 'center' }}>Ready to join Relay Traders?</H2>
          <Lead style={{ textAlign: 'center', maxWidth: 560 }}>Apply in the Relay Traders app. It takes five minutes, and you can upload your documents straight from your phone.</Lead>
          <Pill label="Apply to join" size="lg" icon={ArrowRight} trailing onPress={openTradersApp} />
        </View>
      </Container>
    </SitePage>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 48 },
  rate: { borderRadius: 28, padding: Spacing.eight, gap: Spacing.three },
  noFees: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: 16, padding: Spacing.four, marginTop: Spacing.two },
  card: { borderRadius: 24, padding: Spacing.six, gap: Spacing.three, flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  cta: { alignItems: 'center', gap: Spacing.five, borderRadius: 28, padding: 56 },
});
