// The website's front page. Booking comes first: the menu of jobs and prices is
// right at the top. Then what happens next: watch every step, and everything is
// kept for you afterwards. Landlords and tradespeople get a line each at the end.
import { ArrowRight, BadgeCheck, Car, CircleCheck, Download, FileText, House, Lock, MessageCircle, ReceiptPoundSterling, RotateCcw, ShieldCheck, Siren, Star, Wrench } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { JobMenu } from '@/components/job-menu';
import { DEMO_ROUTE, PLACES, StaticMap } from '@/components/map';
import { Timeline, type TimelineStep } from '@/components/timeline';
import { T } from '@/components/ui';
import { SoftShadows, Spacing, usePalette } from '@/constants/theme';
import { PILOT } from '@/domain/catalog';
import { WAITLIST } from '@/lib/launch';

import { ArrowLink, Container, H1, H2, Lead, Pill, Section, SitePage, useBreakpoint } from './frame';

export function HomePage() {
  return (
    <SitePage title="Relay">
      <Hero />
      <WatchEveryStep />
      <KeptForYou />
      <ForLandlords />
      <ForTrades />
    </SitePage>
  );
}

function Hero() {
  const c = usePalette();
  const { wide, narrow } = useBreakpoint();
  return (
    <Container style={{ paddingTop: narrow ? Spacing.eight : 56, paddingBottom: narrow ? 56 : 88 }}>
      <View style={[styles.hero, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={{ flex: wide ? 1.15 : undefined, gap: Spacing.six }}>
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
    <Section style={{ paddingTop: 0 }}>
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
    <Container style={{ paddingBottom: narrow ? Spacing.six : Spacing.eight }}>
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
      <View style={[styles.band, { backgroundColor: c.accent, padding: narrow ? Spacing.six : 56 }, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={{ flex: 1, gap: Spacing.five }}>
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
    </Container>
  );
}

function ForTrades() {
  const { narrow } = useBreakpoint();
  return (
    <Container style={{ paddingBottom: narrow ? 56 : 72 }}>
      <View style={styles.trades}>
        <T variant="callout" color="inkMuted">
          Are you a tradesperson?
        </T>
        <ArrowLink label="Get local jobs with Relay Traders" href="/for-tradespeople" color="ink" />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 48 },
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
  trades: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: Spacing.two, rowGap: 4 },
});
