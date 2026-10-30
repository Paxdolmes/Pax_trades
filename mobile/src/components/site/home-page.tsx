// The website's front page. Booking comes first: the menu of jobs and prices is
// right at the top, with the trust points under it. Then watch every step, the four
// trades, how it works, everything kept for you, local pros, emergencies, why Relay,
// landlords, questions and a last call to book.
import { ArrowRight, BadgeCheck, Car, CircleCheck, Download, FileText, House, Lock, MessageCircle, ReceiptPoundSterling, RotateCcw, ShieldCheck, Siren, Star, Wrench } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProCard, ReviewCard } from '@/components/examples';
import { JobMenu } from '@/components/job-menu';
import { DEMO_ROUTE, PLACES, StaticMap } from '@/components/map';
import { Timeline, type TimelineStep } from '@/components/timeline';
import { TRADE_ICONS } from '@/components/trade-icons';
import { T } from '@/components/ui';
import { SoftShadows, Spacing, usePalette } from '@/constants/theme';
import { EXAMPLE_PROS, EXAMPLE_REVIEWS, EXAMPLES_NOTE } from '@/content/examples';
import { BENEFITS, HOME_FAQS, HOME_STEPS } from '@/content/site';
import { CALLOUT_RATES, formatPence, fromPricePence, OFFERED_TRADES, PILOT } from '@/domain/catalog';
import { WAITLIST } from '@/lib/launch';

import { LandlordFlowStrip } from './landlord-diagram';
import { ArrowLink, Container, Eyebrow, Grid, H1, H2, H3, headingLevel, isHovered, linkProps, Lead, Pill, Section, SectionHeading, SiteIcon, SitePage, useBreakpoint } from './frame';
import { ComingSoon, CtaBand, FaqList, PostcodeCheck, TrustStrip } from './widgets';

export function HomePage() {
  return (
    <SitePage title="Relay">
      <Hero />
      <TrustStrip />
      <WatchEveryStep />
      <WhatWeFix />
      <HowItWorks />
      <KeptForYou />
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
    <Container style={{ paddingTop: narrow ? Spacing.eight : 56, paddingBottom: narrow ? Spacing.ten : 72 }}>
      <View style={[styles.hero, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={{ flex: wide ? 1.15 : undefined, gap: Spacing.six }}>
          <View style={[styles.badge, SoftShadows.soft, { backgroundColor: c.surface }]}>
            <View style={[styles.dot, { backgroundColor: c.accentStrong }]} />
            <T variant="subhead" style={{ fontWeight: '600' }}>
              {WAITLIST ? 'Opening soon in Fulham' : 'Often at your door within the hour'}
            </T>
          </View>
          <H1 style={wide ? { fontSize: 62, lineHeight: 66 } : undefined}>
            {'Book a trusted tradesperson as easily as '}
            <Text style={[styles.taxi, { backgroundColor: c.accent, color: c.onAccent }]}>a taxi.</Text>
          </H1>
          <Lead big style={{ maxWidth: 560 }}>
            Heating, electrics, plumbing and carpentry in Fulham. Pick the job, pick a time, done.
          </Lead>
          <View style={[styles.menuCard, SoftShadows.lift, { backgroundColor: c.surface, padding: narrow ? Spacing.four : Spacing.six }]}>
            <JobMenu onCard />
            <View style={[styles.menuFoot, { borderTopColor: c.border }]}>
              <View style={styles.vetted}>
                <BadgeCheck size={16} color={c.accentStrong} strokeWidth={2.2} />
                <T variant="footnote" color="inkMuted" style={{ flexShrink: 1 }}>
                  Vetted, insured pros. Prices include VAT and fees.
                </T>
              </View>
              <Pill
                label={WAITLIST ? 'How emergencies work' : 'Emergency? Get someone now'}
                variant="emberSolid"
                size="sm"
                icon={Siren}
                href={{ pathname: '/home', params: { urgent: '1' } }}
              />
            </View>
          </View>
          <PostcodeCheck />
          <View style={[styles.tradeCta, { borderTopColor: c.border }]}>
            <T variant="subhead" color="inkMuted">
              Are you a tradesperson?
            </T>
            <ArrowLink label="Get local jobs with Relay Traders" href="/for-tradespeople" />
          </View>
        </View>
        {wide ? (
          <View style={[styles.phonePanel, { backgroundColor: c.accent }]}>
            <LivePhone />
          </View>
        ) : null}
      </View>
    </Container>
  );
}

/** The live job screen on a phone: Sam on the map, the timeline and a way to message him. */
function LivePhone() {
  const c = usePalette();
  const steps: TimelineStep[] = [
    { label: 'Booked', at: '10:42am' },
    { label: 'Sam accepted', at: '10:44am' },
    { label: 'On the way', at: 'Now' },
    { label: 'Arrived' },
    { label: 'Done' },
  ];
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Example: Sam is 6 minutes away, arriving at 2pm" style={[styles.phone, SoftShadows.lift, { backgroundColor: c.ink }]}>
      <View style={[styles.phoneScreen, { backgroundColor: c.surface }]}>
        <StaticMap
          height={230}
          center={{ x: 440, y: 455 }}
          scale={0.9}
          route={DEMO_ROUTE}
          pins={[
            { ...PLACES.letticeSt, kind: 'home' },
            { x: 502, y: 420, kind: 'pro', label: '6 min' },
          ]}
        />
        <View style={[styles.phoneSheet, { backgroundColor: c.surface }]}>
          <View style={{ gap: 2 }}>
            <T variant="title1">Sam is 6 min away</T>
            <T variant="footnote" color="inkMuted">
              Arriving at 2pm, as booked
            </T>
          </View>
          <Timeline steps={steps} current={2} />
          <View style={[styles.proRow, { backgroundColor: c.bg }]}>
            <Initials name="SM" />
            <View style={{ flex: 1 }}>
              <T variant="subhead" style={{ fontWeight: '700' }}>
                Sam, Gas Safe engineer
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Star size={12} color={c.accentStrong} fill={c.accentStrong} />
                <T variant="caption">4.9</T>
              </View>
            </View>
            <View style={[styles.message, { backgroundColor: c.ink }]}>
              <MessageCircle size={14} color={c.surface} strokeWidth={2.4} />
              <T variant="caption" color="surface">
                Message
              </T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Lock size={12} color={c.inkSubtle} strokeWidth={2.4} />
            <T variant="caption" color="inkSubtle" style={{ fontWeight: '500' }}>
              Chat in the app. Phone numbers stay private.
            </T>
          </View>
        </View>
      </View>
    </View>
  );
}

function Initials({ name, size = 40 }: { name: string; size?: number }) {
  const c = usePalette();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
      <T variant="headline" style={{ color: c.accent, fontSize: size * 0.38 }}>
        {name}
      </T>
    </View>
  );
}

function WatchEveryStep() {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  const steps: TimelineStep[] = [
    { label: 'Booked', at: '10:42am', icon: CircleCheck },
    { label: 'Accepted', at: '10:44am', icon: BadgeCheck },
    { label: 'On the way', at: 'Now', icon: Car },
    { label: 'Arrives', at: '2pm', icon: House },
    { label: 'Done', icon: CircleCheck },
  ];
  return (
    <Section>
      <View style={{ gap: Spacing.three, maxWidth: 680 }}>
        <H2>Watch every step.</H2>
        <Lead>Pick an exact time, not a four-hour window. Then follow your pro to your door, and message them in the app.</Lead>
      </View>
      <View style={[styles.watchCard, SoftShadows.soft, { backgroundColor: c.surface, padding: narrow ? Spacing.six : 48 }]}>
        <T variant="display" style={{ fontSize: narrow ? 26 : 34, lineHeight: narrow ? 30 : 40 }}>
          Sam is 6 min away.
        </T>
        <Timeline steps={steps} current={2} across={!narrow} />
      </View>
    </Section>
  );
}

function KeptForYou() {
  const c = usePalette();
  const { wide, narrow } = useBreakpoint();
  return (
    <Container style={{ paddingTop: narrow ? 56 : 88 }}>
      <View style={[styles.band, { backgroundColor: c.accentTint, padding: narrow ? Spacing.six : 56 }, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={{ flex: 1, gap: Spacing.four }}>
          <H2>Everything kept for you.</H2>
          <Lead style={{ maxWidth: 460 }}>Receipts, photos and certificates, saved to your home for good. And when you need them again, book the same pro in one tap.</Lead>
        </View>
        <View style={{ flex: wide ? 0.9 : undefined, alignItems: wide ? 'flex-end' : 'stretch' }}>
          <DoneJobCard />
        </View>
      </View>
    </Container>
  );
}

/** A finished job as the app keeps it: receipt, photos, certificate and guarantee. */
function DoneJobCard() {
  const c = usePalette();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Example: a finished boiler service, with its receipt, before and after photos and gas safety record"
      style={[styles.doneCard, SoftShadows.lift, { backgroundColor: c.surface }]}>
      <View style={styles.row}>
        <Initials name="SM" />
        <View style={{ flex: 1 }}>
          <T variant="headline">Boiler service</T>
          <T variant="footnote" color="inkMuted">
            Sun 1 Nov · with Sam
          </T>
        </View>
        <T variant="title2">£119</T>
      </View>
      <View style={[styles.row, styles.inner, { backgroundColor: c.bg }]}>
        <View style={[styles.smallIcon, { backgroundColor: c.surface }]}>
          <ReceiptPoundSterling size={18} color={c.accentStrong} strokeWidth={2.1} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="subhead" style={{ fontWeight: '700' }}>
            Receipt
          </T>
          <T variant="footnote" color="inkMuted">
            £119, includes VAT
          </T>
        </View>
        <Download size={18} color={c.ink} strokeWidth={2.2} />
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.three }}>
        <Photo label="Before" />
        <Photo label="After" after />
      </View>
      <View style={[styles.cert, { backgroundColor: c.accentTint }]}>
        <FileText size={15} color={c.accentStrong} strokeWidth={2.2} />
        <T variant="caption" color="accentStrong">
          Gas safety record (PDF)
        </T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <ShieldCheck size={15} color={c.accentStrong} strokeWidth={2.2} />
        <T variant="footnote" color="inkMuted">{`Relay Guarantee, ${PILOT.guaranteeDays} days`}</T>
      </View>
      <View style={[styles.again, { backgroundColor: c.ink }]}>
        <RotateCcw size={16} color={c.surface} strokeWidth={2.4} />
        <T variant="headline" color="surface" style={{ fontSize: 16 }}>
          Book Sam again
        </T>
      </View>
    </View>
  );
}

/** A stand-in photo: a boiler, before (grey) and after (fixed, in teal). */
function Photo({ label, after }: { label: string; after?: boolean }) {
  const c = usePalette();
  return (
    <View style={[styles.photo, { backgroundColor: after ? c.accentTint : c.surfaceMuted }]}>
      <View style={[styles.boiler, { backgroundColor: c.surface }]}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: after ? c.accent : c.inkSubtle }} />
        <View style={{ width: 22, height: 4, borderRadius: 2, backgroundColor: c.border }} />
      </View>
      <T variant="caption" color="inkMuted" style={{ position: 'absolute', left: 10, bottom: 8 }}>
        {label}
      </T>
    </View>
  );
}

function ForLandlords() {
  const c = usePalette();
  const { wide, narrow } = useBreakpoint();
  return (
    <Container style={{ paddingBottom: narrow ? 56 : 88 }}>
      <View style={[styles.landlords, { backgroundColor: c.accent, padding: narrow ? Spacing.six : 56 }]}>
        <View style={[styles.band, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flex: 1, gap: Spacing.five }}>
            <Eyebrow tone="white">Landlords and letting agents</Eyebrow>
            <H2 style={{ color: c.onAccent, maxWidth: 520 }}>Tenant repairs, sorted with one tap.</H2>
            <Lead style={{ color: c.onAccent, maxWidth: 480 }}>Tenants report repairs in the app. You approve and pay, and see every property’s jobs in one place.</Lead>
            <Pill label="Relay for landlords" variant="primary" size="lg" icon={ArrowRight} trailing href="/landlords" style={{ alignSelf: 'flex-start' }} />
          </View>
          <View style={{ flex: wide ? 0.9 : undefined, alignItems: wide ? 'flex-end' : 'stretch' }}>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel="Example: a leaking tap reported by a tenant at Flat 3, Dawes Road, booked for Tuesday at 10am"
              style={[styles.doneCard, SoftShadows.lift, { backgroundColor: c.surface }]}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <T variant="subhead" style={{ fontWeight: '700' }}>
                  Flat 3, Dawes Road
                </T>
                <View style={[styles.tag, { backgroundColor: c.accentTint }]}>
                  <T variant="caption" color="accentStrong">
                    Booked
                  </T>
                </View>
              </View>
              <View style={[styles.row, styles.inner, { backgroundColor: c.bg }]}>
                <View style={[styles.smallIcon, { backgroundColor: c.surface }]}>
                  <Wrench size={17} color={c.accentStrong} strokeWidth={2.1} />
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="subhead" style={{ fontWeight: '700' }}>
                    Leaking tap
                  </T>
                  <T variant="footnote" color="inkMuted">
                    Reported by your tenant
                  </T>
                </View>
              </View>
              <View style={styles.row}>
                <Initials name="DO" size={32} />
                <T variant="subhead" style={{ fontWeight: '600' }}>
                  Dan arrives Tuesday at 10am
                </T>
              </View>
            </View>
          </View>
        </View>
        <LandlordFlowStrip onAccent />
      </View>
    </Container>
  );
}

function WhatWeFix() {
  return (
    <Section style={{ paddingTop: 0 }}>
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
              <View style={[styles.stepNo, { backgroundColor: c.accent }]}>
                <T variant="headline" color="onAccent">
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
    <Container style={{ paddingBottom: narrow ? 56 : 88 }}>
      <View style={[styles.emergency, { backgroundColor: c.urgentTint, padding: narrow ? Spacing.six : 48 }, !wide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, gap: Spacing.four }}>
          <SiteIcon icon={Siren} tone="white" size={56} />
          <T variant="display" accessibilityRole="header" {...headingLevel(2)} style={{ fontSize: narrow ? 30 : 36, lineHeight: narrow ? 34 : 42 }}>
            Emergency?
          </T>
          <Lead style={{ color: c.ink, maxWidth: 580 }}>
            Leak, no power or no heating? We aim to have someone with you within the hour, day or night.
          </Lead>
        </View>
        <View style={{ gap: Spacing.two, alignItems: wide ? 'flex-end' : 'flex-start' }}>
          <Pill label={WAITLIST ? 'See how urgent help works' : 'Get urgent help'} variant="emberSolid" size="lg" icon={ArrowRight} trailing href={{ pathname: '/home', params: { urgent: '1' } }} />
          <T variant="footnote" color="inkMuted">
            {`From ${formatPence(CALLOUT_RATES.standard.firstHourPence)} including the first hour`}
          </T>
        </View>
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
          <T variant="display" accessibilityRole="header" {...headingLevel(2)} style={{ fontSize: 38, lineHeight: 44 }}>
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
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 48 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tradeCta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: Spacing.two, rowGap: 4, borderTopWidth: 1, paddingTop: Spacing.five },
  taxi: { borderRadius: 14, paddingHorizontal: 10 },
  menuCard: { borderRadius: 28, gap: Spacing.five },
  menuFoot: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three, borderTopWidth: 1, paddingTop: Spacing.four },
  vetted: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  phonePanel: { flex: 1, alignItems: 'center', borderRadius: 32, paddingVertical: 48, paddingHorizontal: Spacing.six },
  phone: { width: 340, borderRadius: 48, padding: 10 },
  phoneScreen: { borderRadius: 40, overflow: 'hidden' },
  phoneSheet: { marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.five, gap: Spacing.four },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: 20, padding: Spacing.three },
  message: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: Spacing.three, height: 34 },
  watchCard: { borderRadius: 28, gap: Spacing.eight },
  band: { flexDirection: 'row', alignItems: 'center', gap: Spacing.eight, borderRadius: 32 },
  doneCard: { width: '100%', maxWidth: 400, borderRadius: 24, padding: Spacing.five, gap: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  inner: { borderRadius: 16, padding: Spacing.three },
  smallIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  photo: { flex: 1, height: 96, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  boiler: { width: 40, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 },
  cert: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  again: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, height: 48, borderRadius: 14 },
  tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  landlords: { borderRadius: 32, gap: Spacing.eight },
  tile: { borderRadius: 28, gap: Spacing.five, flex: 1 },
  tileIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  from: { borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 4 },
  step: { borderRadius: 28, padding: Spacing.six, gap: Spacing.four, flex: 1 },
  stepNo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emergency: { flexDirection: 'row', alignItems: 'center', gap: Spacing.six, borderRadius: 28 },
  benefit: { borderRadius: 24, padding: Spacing.six, gap: Spacing.four, flex: 1 },
  vetBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.three, borderRadius: 999, paddingHorizontal: Spacing.five, paddingVertical: Spacing.four },
});
