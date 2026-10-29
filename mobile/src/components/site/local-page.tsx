// A trade's page for local searches ("emergency plumber in Fulham"): what we fix and
// what it costs, why Relay, where we cover, a few answers, and links to the other trades.
import { BadgeCheck, Check, MapPin, PoundSterling, ShieldCheck, Siren } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { TRADE_ICONS } from '@/components/trade-icons';
import { T } from '@/components/ui';
import { SoftShadows, Spacing, usePalette } from '@/constants/theme';
import { GUIDES } from '@/content/guides';
import { AREAS, LOCAL_PAGES, type LocalPage } from '@/content/local';
import { formatPence, jobTypesForTrade, PILOT, TRADES } from '@/domain/catalog';
import { WAITLIST } from '@/lib/launch';
import { priceLine } from '@/lib/pricing';

import { ArrowLink, Grid, H3, PageIntro, Pill, Section, SectionHeading, SiteIcon, SitePage, SoftCard, useBreakpoint } from './frame';
import { CtaBand, FaqList } from './widgets';

export function LocalServicePage({ page }: { page: LocalPage }) {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  const trade = TRADES.find((t) => t.id === page.trade)!;
  const jobs = jobTypesForTrade(page.trade);
  const guides = GUIDES.filter((g) => g.related === page.path);
  const why = [
    { icon: BadgeCheck, title: 'Vetted local pros', text: `${page.checks} before their first job.` },
    { icon: PoundSterling, title: 'The price first', text: 'All-in prices with VAT and fees included. Your card is only charged when the job’s done.' },
    { icon: ShieldCheck, title: `${PILOT.guaranteeDays}-day Relay Guarantee`, text: `If something isn’t right, report it within ${PILOT.guaranteeDays} days of the job and we’ll make it right.` },
  ];

  return (
    <SitePage title={page.name}>
      <PageIntro eyebrow="Fulham, SW6" title={page.title} sub={page.sub}>
        <View style={styles.ctas}>
          {WAITLIST ? (
            <>
              <Pill label="Join the waiting list" variant="teal" size="lg" href={{ pathname: '/waitlist', params: { trade: page.trade } }} />
              <Pill label="See how booking will work" variant="secondary" size="lg" href={{ pathname: '/home', params: page.urgent ? { urgent: '1' } : {} }} />
            </>
          ) : (
            <>
              {page.urgent ? <Pill label="Emergency? Get help now" variant="emberSolid" size="lg" icon={Siren} href={{ pathname: '/home', params: { urgent: '1' } }} /> : null}
              <Pill label={`Book a ${trade.pro}`} variant={page.urgent ? 'secondary' : 'primary'} size="lg" href="/home" />
            </>
          )}
        </View>
      </PageIntro>

      <Section tight style={{ paddingTop: 0 }}>
        <View style={[styles.split, narrow && { flexDirection: 'column' }]}>
          <View style={{ flex: narrow ? undefined : 1, gap: Spacing.four }}>
            <SectionHeading title="What we fix" />
            <View style={{ gap: 6 }}>
              {trade.includes.map((line) => (
                <View key={line} style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <Check size={16} color={c.accentStrong} strokeWidth={2.6} style={{ marginTop: 4 }} />
                  <T variant="body" color="inkMuted" style={{ flex: 1 }}>
                    {line}
                  </T>
                </View>
              ))}
            </View>
          </View>
          <View style={{ flex: narrow ? undefined : 1.3, gap: Spacing.three }}>
            {jobs.map((job) => (
              <View key={job.id} style={[styles.job, SoftShadows.soft, { backgroundColor: c.surface }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="headline">{job.label}</T>
                  <T variant="footnote" color="inkMuted">
                    {priceLine(job, 'booked')}
                  </T>
                </View>
                <Pill label={WAITLIST ? 'Preview' : 'Book'} variant={WAITLIST ? 'secondary' : 'primary'} size="sm" href={{ pathname: '/home', params: { trade: page.trade, job: job.id } }} />
              </View>
            ))}
          </View>
        </View>
      </Section>

      <Section background="surface" tight>
        <SectionHeading title={`Why book your ${trade.pro} with Relay`} />
        <Grid columns={{ narrow: 1, medium: 3, wide: 3 }}>
          {why.map((w) => (
            <SoftCard key={w.title} tint="bg">
              <SiteIcon icon={w.icon} tone="white" />
              <H3>{w.title}</H3>
              <T variant="body" color="inkMuted">
                {w.text}
              </T>
            </SoftCard>
          ))}
        </Grid>
      </Section>

      <Section tight>
        <View style={[styles.split, narrow && { flexDirection: 'column' }]}>
          <View style={{ flex: narrow ? undefined : 1, gap: Spacing.four }}>
            <SectionHeading title="Covering all of Fulham" sub={`Every SW6 postcode, from ${formatPence(9500)} including the first hour.`} />
            <View style={styles.areas}>
              {AREAS.map((a) => (
                <View key={a} style={[styles.area, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <MapPin size={14} color={c.accentStrong} />
                  <T variant="subhead">{a}</T>
                </View>
              ))}
            </View>
          </View>
          <View style={{ flex: narrow ? undefined : 1.3, gap: Spacing.four }}>
            <SectionHeading title="Questions" />
            <FaqList items={page.faqs} />
            {guides.length ? (
              <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
                <T variant="subhead" color="inkMuted">
                  Helpful guides
                </T>
                {guides.map((g) => (
                  <ArrowLink key={g.slug} label={g.title} href={g.path} />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Section>

      <Section tight style={{ paddingTop: 0 }}>
        <View style={styles.others}>
          <T variant="subhead" color="inkMuted">
            Also in Fulham:
          </T>
          {LOCAL_PAGES.filter((p) => p.path !== page.path).map((p) => (
            <View key={p.path} style={styles.other}>
              {(() => {
                const Icon = TRADE_ICONS[p.trade];
                return <Icon size={16} color={c.accentStrong} />;
              })()}
              <ArrowLink label={p.name} href={p.path} />
            </View>
          ))}
        </View>
      </Section>

      <CtaBand />
    </SitePage>
  );
}

const styles = StyleSheet.create({
  ctas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  split: { flexDirection: 'row', gap: Spacing.eight, alignItems: 'flex-start' },
  job: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, borderRadius: 20, paddingHorizontal: Spacing.five, paddingVertical: Spacing.four },
  areas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  area: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  others: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: Spacing.five, rowGap: Spacing.two },
  other: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
