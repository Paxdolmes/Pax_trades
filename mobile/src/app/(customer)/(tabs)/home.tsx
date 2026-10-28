import { router } from 'expo-router';
import { Bell, ChevronRight, CircleCheck, ClipboardPen, Flame, MapPin, ShieldCheck, Wrench, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { Button, Card, IconButton, IconTile, Note, Screen, SectionLabel, T, type LucideIcon } from '@/components/ui';
import { Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import { formatPence, fromPricePence, LAUNCH_OUTWARD_CODES, TRADES, type Trade } from '@/domain/catalog';
import { isInLaunchArea, outwardCode } from '@/domain/rules';
import { useAuth } from '@/lib/auth';
import { DEMO_CUSTOMER } from '@/lib/demo';
import { firstName, isLive, loadCustomerJobs, useLive } from '@/lib/live';

const TRADE_ICONS: Record<Trade, LucideIcon> = { plumbing: Wrench, electrical: Zap, heating: Flame };
const SHORT_LABEL: Record<Trade, string> = { plumbing: 'Plumber', electrical: 'Electrician', heating: 'Heating' };

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

      <T variant="display" accessibilityRole="header" style={{ fontSize: 34, lineHeight: 38 }}>
        What needs fixing?
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
          <View style={[styles.urgent, { backgroundColor: c.urgent }]}>
            <View style={[styles.urgentTag, { backgroundColor: c.onUrgent }]}>
              <Zap size={13} color={c.urgent} strokeWidth={2.8} fill={c.urgent} />
              <T variant="overline" style={{ color: c.urgent }}>
                URGENT
              </T>
            </View>
            <View style={{ gap: 4 }}>
              <T variant="title1" color="onUrgent" accessibilityRole="header">
                Leak, no power or no heat?
              </T>
              <T variant="callout" color="onUrgent" style={{ fontWeight: '500' }}>
                A vetted pro at your door, usually within the hour.
              </T>
            </View>
            <View style={styles.urgentRow}>
              {TRADES.map((t) => (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Get a ${SHORT_LABEL[t.id].toLowerCase()} now`}
                  onPress={() => covered && router.push({ pathname: '/request', params: { trade: t.id, postcode } })}
                  style={({ pressed }) => [styles.urgentButton, { backgroundColor: c.onUrgent, opacity: pressed ? 0.85 : 1 }]}>
                  <T variant="subhead" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    {SHORT_LABEL[t.id]}
                  </T>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: Spacing.three }}>
            <SectionLabel>Book a job</SectionLabel>
            <View style={styles.tiles}>
              {TRADES.map((t) => {
                const Icon = TRADE_ICONS[t.id];
                return (
                  <Pressable
                    key={t.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.label}. ${t.detail}. From ${formatPence(fromPricePence(t.id))}, including VAT and fees`}
                    onPress={() => covered && router.push({ pathname: '/request', params: { trade: t.id, postcode } })}
                    style={({ pressed }) => [styles.tile, Shadows.card, { backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 }]}>
                    <View style={[styles.tileIcon, { backgroundColor: c.ink }]}>
                      <Icon size={22} color={c.accent} strokeWidth={2.2} />
                    </View>
                    <View>
                      <T variant="bodyStrong" numberOfLines={1} style={{ fontSize: 15, fontWeight: '700' }}>
                        {SHORT_LABEL[t.id]}
                      </T>
                      <T variant="footnote" color="inkMuted">
                        {`From ${formatPence(fromPricePence(t.id))}`}
                      </T>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Card
              accessibilityLabel="Something else? Describe any job and get quotes from local pros"
              onPress={() => covered && router.push({ pathname: '/quote', params: { postcode } })}
              style={styles.trade}>
              <IconTile icon={ClipboardPen} tone="neutral" size={44} />
              <View style={{ flex: 1 }}>
                <T variant="headline">Something else?</T>
                <T variant="footnote" color="inkMuted">
                  Describe any job, local pros send you quotes
                </T>
              </View>
              <ChevronRight size={20} color={c.inkSubtle} />
            </Card>
            <T variant="footnote" color="inkMuted" style={{ textAlign: 'center' }}>
              Prices are all-in: VAT and fees included, no hidden extras.
            </T>
          </View>
        </>
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
        <Note icon={ShieldCheck} color="accentStrong">
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
  trade: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  urgent: { borderRadius: Radii.xl, padding: Spacing.five, gap: Spacing.four },
  urgentTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, height: 26, paddingHorizontal: 10, borderRadius: Radii.pill },
  urgentRow: { flexDirection: 'row', gap: Spacing.two },
  urgentButton: { flex: 1, height: 48, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: Spacing.three },
  tile: { flex: 1, borderRadius: Radii.lg, padding: Spacing.three, gap: Spacing.three },
  tileIcon: { width: 44, height: 44, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  email: { height: 48, borderRadius: Radii.md, paddingHorizontal: Spacing.four },
  trust: { borderRadius: Radii.md, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
});
