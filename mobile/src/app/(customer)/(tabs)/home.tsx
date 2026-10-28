import { router } from 'expo-router';
import { Bell, ChevronRight, CircleCheck, ClipboardPen, Flame, MapPin, ShieldCheck, Wrench, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { Button, Card, IconButton, IconTile, Note, Screen, T, type LucideIcon } from '@/components/ui';
import { Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import { formatPence, fromPricePence, LAUNCH_OUTWARD_CODES, TRADES, type Trade } from '@/domain/catalog';
import { isInLaunchArea, outwardCode } from '@/domain/rules';
import { useAuth } from '@/lib/auth';
import { DEMO_CUSTOMER } from '@/lib/demo';
import { firstName, isLive, loadCustomerJobs, useLive } from '@/lib/live';

const TRADE_ICONS: Record<Trade, LucideIcon> = { plumbing: Wrench, electrical: Zap, heating: Flame };

function greeting(hour = new Date().getHours()) {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export default function CustomerHome() {
  const c = usePalette();
  const { profile } = useAuth();
  const name = isLive ? firstName(profile?.fullName) : DEMO_CUSTOMER.firstName;
  // Live: start from the postcode of their last job until they type one.
  const { data: jobs } = useLive(() => loadCustomerJobs(), []);
  const [typed, setPostcode] = useState<string | null>(null);
  const postcode = typed ?? (isLive ? (jobs[0]?.postcode ?? '') : DEMO_CUSTOMER.postcode);
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  const district = outwardCode(postcode);
  const covered = district !== null && isInLaunchArea(postcode, LAUNCH_OUTWARD_CODES);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ gap: 2 }}>
          <Wordmark size={26} />
          <T variant="footnote" color="inkMuted" style={{ marginTop: Spacing.two }}>
            {name ? `${greeting()}, ${name}` : greeting()}
          </T>
        </View>
        <IconButton icon={Bell} label="Notifications" onPress={() => router.push('/notifications')} />
      </View>

      <View style={[styles.postcode, Shadows.card, { backgroundColor: c.surface }]}>
        <MapPin size={20} color={c.brand} strokeWidth={2.2} />
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

      <T variant="display" accessibilityRole="header">
        A vetted tradesperson at your door, fast
      </T>

      {covered || district === null ? (
        <View style={{ gap: Spacing.three }}>
          {TRADES.map((t) => (
            <Card
              key={t.id}
              accessibilityLabel={`${t.label}. ${t.detail}. From ${formatPence(fromPricePence(t.id))}, including VAT and fees`}
              onPress={() => covered && router.push({ pathname: '/request', params: { trade: t.id, postcode } })}
              style={styles.trade}>
              <IconTile icon={TRADE_ICONS[t.id]} size={56} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="headline">{t.label}</T>
                <T variant="footnote" color="inkMuted">
                  {t.detail}
                </T>
                <T variant="caption" color="brand" style={{ marginTop: 4 }}>
                  {`From ${formatPence(fromPricePence(t.id))} all-in · No hidden fees`}
                </T>
              </View>
              <ChevronRight size={20} color={c.inkSubtle} />
            </Card>
          ))}
          <Card
            accessibilityLabel="Something else? Describe any job and get quotes from local pros"
            onPress={() => covered && router.push({ pathname: '/quote', params: { postcode } })}
            style={[styles.trade, styles.other, { borderColor: c.border }]}>
            <IconTile icon={ClipboardPen} tone="neutral" size={56} />
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="headline">Something else?</T>
              <T variant="footnote" color="inkMuted">
                Describe any job and local pros send you quotes
              </T>
              <T variant="caption" color="brand" style={{ marginTop: 4 }}>
                Free to ask
              </T>
            </View>
            <ChevronRight size={20} color={c.inkSubtle} />
          </Card>
        </View>
      ) : (
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
              <Button label="Join the waitlist" disabled={!email.includes('@')} onPress={() => setJoined(true)} />
            </>
          )}
        </Card>
      )}

      <View style={[styles.trust, { backgroundColor: c.surfaceMuted }]}>
        <Note icon={ShieldCheck} color="success">
          <T variant="footnote" color="inkMuted">
            Gas Safe registered · NICEIC or NAPIT electricians · Insured · 30-day Relay Guarantee
          </T>
        </Note>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  postcode: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, height: 64, paddingHorizontal: Spacing.four, borderRadius: Radii.md },
  input: { padding: 0, margin: 0 },
  covered: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trade: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  other: { borderStyle: 'dashed', shadowOpacity: 0, elevation: 0, backgroundColor: 'transparent' },
  email: { height: 48, borderRadius: Radii.md, paddingHorizontal: Spacing.four },
  trust: { borderRadius: Radii.md, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
});
