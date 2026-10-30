import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Bell, ChevronRight, CircleCheck, MapPin, ShieldCheck, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { ProCard, ReviewCard } from '@/components/examples';
import { bookingHref, JobMenu } from '@/components/job-menu';
import { isWeb, linkProps } from '@/components/site/frame';
import { TRADE_ICONS } from '@/components/trade-icons';
import { Button, Card, IconButton, IconTile, Note, Screen, SectionLabel, T } from '@/components/ui';
import { Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import { EXAMPLE_PROS, EXAMPLE_REVIEWS, EXAMPLES_NOTE } from '@/content/examples';
import { COMING_SOON, findJobType, isOffered, LAUNCH_OUTWARD_CODES, type Trade } from '@/domain/catalog';
import { isInLaunchArea, outwardCode } from '@/domain/rules';
import { arrivalLabel } from '@/domain/slots';
import { needsSignIn, useAuth } from '@/lib/auth';
import { sendEnquiry } from '@/lib/contact';
import { DEMO_CUSTOMER } from '@/lib/demo';
import { firstName, isLive, loadCustomerJobs, useLive, type CustomerJob } from '@/lib/live';

function greeting(hour = new Date().getHours()) {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** The emergencies a pro can be sent to within the hour. */
const EMERGENCIES: { label: string; trade: Trade; job: string }[] = [
  { label: 'Leak', trade: 'plumbing', job: 'leak' },
  { label: 'No power', trade: 'electrical', job: 'power-fault' },
  { label: 'No heating', trade: 'heating', job: 'no-heating' },
];

export default function CustomerHome() {
  const c = usePalette();
  const { profile, status } = useAuth();
  const name = isLive ? firstName(profile?.fullName) : DEMO_CUSTOMER.firstName;
  // Live: their jobs, for the one under way and the postcode they last booked at.
  const { data: jobs } = useLive(() => loadCustomerJobs(), []);
  // From the website: a postcode already checked, or "Emergency?".
  const params = useLocalSearchParams<{ postcode?: string; trade?: Trade; job?: string; urgent?: string }>();
  // Live: start from the postcode of their last job until they type one.
  const [typed, setPostcode] = useState<string | null>(params.postcode ? params.postcode.toUpperCase() : null);
  const postcode = typed ?? (isLive ? (jobs[0]?.postcode ?? '') : DEMO_CUSTOMER.postcode);
  const district = outwardCode(postcode);
  const covered = district !== null && isInLaunchArea(postcode, LAUNCH_OUTWARD_CODES);
  const current = jobs.find((j) => j.status !== 'completed' && j.status !== 'cancelled');
  const urgent = Boolean(params.urgent);

  // Older links picked a job here first. Go straight to booking it.
  if (params.trade && isOffered(params.trade)) return <Redirect href={bookingHref({ trade: params.trade, job: params.job, postcode: postcode || undefined })} />;

  return (
    <Screen>
      {isWeb ? null : (
        <View style={styles.header}>
          <View style={{ gap: 2 }}>
            <Wordmark size={26} />
            <T variant="footnote" color="inkMuted" style={{ marginTop: Spacing.two }}>
              {name ? `${greeting()}, ${name}` : greeting()}
            </T>
          </View>
          {needsSignIn(status) ? (
            <Button label="Sign in" variant="outline" size="md" onPress={() => router.push('/sign-in')} style={{ height: 44, paddingHorizontal: Spacing.four }} />
          ) : (
            <IconButton icon={Bell} label="Notifications" onPress={() => router.push('/notifications')} />
          )}
        </View>
      )}

      {current ? <CurrentJob job={current} /> : null}

      <T variant="display" accessibilityRole="header" style={{ fontSize: 34, lineHeight: 38 }}>
        {urgent ? 'What’s the emergency?' : 'What needs fixing?'}
      </T>

      <View style={[styles.postcode, Shadows.card, { backgroundColor: c.surface }]}>
        <MapPin size={20} color={c.ink} strokeWidth={2.2} />
        <View style={{ flex: 1 }}>
          <T variant="caption" color="inkSubtle">
            Your postcode
          </T>
          <TextInput
            value={postcode}
            onChangeText={(v) => setPostcode(v.toUpperCase())}
            placeholder="SW6 1AA"
            placeholderTextColor={c.inkSubtle}
            autoCapitalize="characters"
            autoComplete="postal-code"
            accessibilityLabel="Your postcode"
            style={[Type.headline, styles.input, { color: c.ink }]}
          />
        </View>
        {covered ? (
          <View style={styles.covered}>
            <CircleCheck size={16} color={c.success} strokeWidth={2.4} />
            <T variant="caption" color="success">
              Covered
            </T>
          </View>
        ) : null}
      </View>

      {covered || district === null ? (
        <>
          <Emergencies postcode={postcode || undefined} />
          <JobMenu postcode={postcode || undefined} placeholder="Try “boiler”, “tap” or “socket”" tradeTiles />

          <View style={{ gap: Spacing.two }}>
            <T variant="footnote" color="inkMuted" style={{ textAlign: 'center' }}>
              Prices are all-in: VAT and fees included, no hidden extras.
            </T>
            <T variant="footnote" color="inkSubtle" style={{ textAlign: 'center' }}>
              {`Coming soon: ${COMING_SOON.join(', ').toLowerCase()}.`}
            </T>
          </View>
        </>
      ) : (
        <NotInArea postcode={postcode} district={district} />
      )}

      <View style={{ gap: Spacing.three }}>
        <SectionLabel>Top-rated near you</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prosScroll} contentContainerStyle={styles.pros}>
          {EXAMPLE_PROS.map((p) => (
            <ProCard key={p.name} pro={p} style={styles.pro} />
          ))}
        </ScrollView>
        <ReviewCard review={EXAMPLE_REVIEWS[0]} />
        <T variant="caption" color="inkSubtle" style={{ textAlign: 'center' }}>
          {EXAMPLES_NOTE}
        </T>
      </View>

      <View style={[styles.trust, { backgroundColor: c.surfaceMuted }]}>
        <Note icon={ShieldCheck} color="accentStrong">
          <T variant="footnote" color="inkMuted">
            Gas Safe registered · NICEIC or NAPIT electricians · Insured · 30-day Relay Guarantee
          </T>
        </Note>
      </View>
    </Screen>
  );
}

/** What's happening with a job under way, one tap from following it live. */
function CurrentJob({ job }: { job: CustomerJob }) {
  const c = usePalette();
  const type = findJobType(job.jobTypeId);
  const Icon = type ? TRADE_ICONS[type.trade] : Zap;
  const pro = firstName(job.pro?.name) || 'Your pro';
  const line =
    job.finishedAt && !job.confirmedAt
      ? `${pro} says it’s done. Check and confirm`
      : job.property?.approval === 'pending' && job.status === 'requested'
        ? `Waiting for ${job.property.approverName} to approve`
        : job.status === 'en_route'
          ? `${pro} is on the way`
          : job.status === 'on_site'
            ? `${pro} is working on it`
            : job.scheduledFor
              ? `${job.status === 'accepted' ? `${pro} is booked` : 'Booked'} for ${arrivalLabel(job.scheduledFor)}`
              : job.status === 'accepted'
                ? `${pro} accepted and is on the way soon`
                : 'Finding a pro near you';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${type?.label ?? 'Your job'}. ${line}. Follow it live`}
      onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.jobId } })}
      style={({ pressed }) => [styles.current, Shadows.card, { backgroundColor: c.accentTint, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.currentIcon, { backgroundColor: c.accent }]}>
        <Icon size={20} color={c.onAccent} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="caption" color="accentStrong">
          {(type?.label ?? 'Your job').toUpperCase()}
        </T>
        <T variant="bodyStrong">{line}</T>
      </View>
      <ChevronRight size={20} color={c.ink} strokeWidth={2.4} />
    </Pressable>
  );
}

/** Outside the launch area: join the waitlist for it. */
function NotInArea({ postcode, district }: { postcode: string; district: string }) {
  const c = usePalette();
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  return (
    <Card style={{ gap: Spacing.four, padding: Spacing.five }}>
      <IconTile icon={MapPin} tone="neutral" />
      <View style={{ gap: 6 }}>
        <T variant="title2">{joined ? "You're on the list" : "We're not in your area yet"}</T>
        <T variant="callout" color="inkMuted">
          {joined
            ? `We'll email you the day Relay reaches ${district}.`
            : `Relay is live across Fulham (SW6). Join the waitlist and we'll let you know the day we reach ${district}.`}
        </T>
      </View>
      {joined ? null : (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={c.inkSubtle}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email address"
            style={[Type.callout, styles.email, { backgroundColor: c.surfaceMuted, color: c.ink }]}
          />
          {joinError ? (
            <T variant="footnote" color="danger">
              {joinError}
            </T>
          ) : null}
          <Button
            label="Join the waitlist"
            loading={joining}
            disabled={!email.includes('@')}
            onPress={async () => {
              setJoining(true);
              setJoinError(null);
              try {
                await sendEnquiry({ kind: 'waitlist', email, postcode });
                setJoined(true);
              } catch (e) {
                setJoinError(e instanceof Error ? e.message : 'Please try again.');
              } finally {
                setJoining(false);
              }
            }}
          />
        </>
      )}
    </Card>
  );
}

function Emergencies({ postcode }: { postcode?: string }) {
  const c = usePalette();
  return (
    <View style={[styles.urgent, { backgroundColor: c.urgent }]}>
      <View style={styles.urgentTop}>
        <View style={[styles.urgentIcon, { backgroundColor: c.onUrgent }]}>
          <Zap size={18} color={c.urgent} fill={c.urgent} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="title2" color="onUrgent" accessibilityRole="header">
            Leak, no power or no heat?
          </T>
          <T variant="footnote" color="onUrgent" style={{ fontWeight: '500' }}>
            A vetted pro at your door, usually within the hour.
          </T>
        </View>
      </View>
      <View style={styles.urgentRow}>
        {EMERGENCIES.map((e) => (
          <Pressable
            key={e.job}
            {...linkProps(bookingHref({ trade: e.trade, job: e.job, postcode, urgent: true }))}
            accessibilityLabel={`${e.label}: get someone now`}
            style={({ pressed }) => [styles.urgentButton, { backgroundColor: c.onUrgent, opacity: pressed ? 0.85 : 1 }]}>
            <T variant="subhead" style={{ color: '#FFFFFF', fontWeight: '700' }}>
              {e.label}
            </T>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  postcode: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, height: 64, paddingHorizontal: Spacing.four, borderRadius: Radii.md },
  input: { padding: 0, margin: 0 },
  covered: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  email: { height: 48, borderRadius: Radii.md, paddingHorizontal: Spacing.four },
  prosScroll: { marginHorizontal: -Spacing.five },
  pros: { gap: Spacing.three, paddingHorizontal: Spacing.five },
  pro: { width: 172 },
  current: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radii.lg, padding: Spacing.four },
  currentIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  urgent: { borderRadius: Radii.xl, padding: Spacing.four, gap: Spacing.four },
  urgentTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  urgentIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  urgentRow: { flexDirection: 'row', gap: Spacing.two },
  urgentButton: { flex: 1, height: 48, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two },
  trust: { borderRadius: Radii.md, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
});
