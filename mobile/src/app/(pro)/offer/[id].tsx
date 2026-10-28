import { router, useLocalSearchParams } from 'expo-router';
import { Check, MapPin, MessageSquareText, ShieldCheck, X, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Button, Card, Chip, IconTile, T, useBottomPadding } from '@/components/ui';
import { Layout, Spacing, usePalette } from '@/constants/theme';
import { FOUNDING_COMMISSION, PILOT, STANDARD_COMMISSION } from '@/domain/catalog';
import { arriveBy } from '@/domain/rules';
import { CREDENTIAL_LABELS } from '@/lib/demo';
import { acceptOffer, isLive } from '@/lib/live';
import { offerPay, useOffers } from '@/lib/offers';
import { usePro } from '@/lib/pro';

/** Matches job_offers.expires_at in the database. */
const OFFER_SECONDS = 60;

/** The arrive-by time if the pro accepted right now, as HH:MM. */
function deadlineIfAccepted(): string {
  return new Date(arriveBy(true, Date.now(), null)).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function JobOffer() {
  const c = usePalette();
  const bottom = useBottomPadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const offer = useOffers().find((o) => o.id === id);
  const pro = usePro();
  const expiresAt = offer?.expiresAt;
  const [openedAt] = useState(() => Date.now());
  const [now, setNow] = useState(openedAt);
  const [accepting, setAccepting] = useState(false);
  // Live offers count down to their expiry in the database; demo ones from opening.
  const secondsLeft = Math.max(
    0,
    Math.round(expiresAt ? (Date.parse(expiresAt) - now) / 1000 : OFFER_SECONDS - (now - openedAt) / 1000),
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) router.back();
  }, [secondsLeft]);

  async function accept() {
    if (!offer) return;
    if (!isLive) {
      router.replace({ pathname: '/trip/[id]', params: { id: offer.id } });
      return;
    }
    setAccepting(true);
    try {
      const { jobId } = await acceptOffer(offer.id);
      router.replace({ pathname: '/trip/[id]', params: { id: jobId } });
    } catch (e) {
      Alert.alert('Could not accept', e instanceof Error ? e.message : 'Please try again.');
      router.back();
    } finally {
      setAccepting(false);
    }
  }

  if (!offer) return null;
  const pay = offerPay(offer.jobType);
  const keep = Math.round((1 - (pro.founding ? FOUNDING_COMMISSION : STANDARD_COMMISSION)) * 100);
  const requirement = offer.jobType.requires.find((r) => r !== 'public_liability');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.surface }}>
      <View style={styles.top}>
        <CountdownRing seconds={secondsLeft} />
        <View style={{ alignItems: 'center', gap: Spacing.two, marginTop: Spacing.five }}>
          {offer.urgent ? <Chip label="Urgent" icon={Zap} tone="urgent" solid /> : <Chip label={offer.when} tone="brand" />}
          <T variant="title1" style={{ textAlign: 'center', fontSize: 28, lineHeight: 34 }} accessibilityRole="header">
            {offer.jobType.label}
          </T>
          <View style={styles.row}>
            <MapPin size={18} color={c.inkMuted} strokeWidth={2.25} />
            <T variant="callout" color="inkMuted" style={{ fontVariant: ['tabular-nums'] }}>
              {`${offer.postcode.split(' ')[0]} · ${offer.distanceKm} km · about ${offer.minutesAway} min away`}
            </T>
          </View>
          {requirement ? <Chip label={`${CREDENTIAL_LABELS[requirement]} job`} icon={ShieldCheck} /> : null}
        </View>
      </View>

      <View style={styles.cards}>
        <Card style={[styles.row, { alignItems: 'flex-start' }]}>
          <IconTile icon={MessageSquareText} tone="neutral" size={44} />
          <View style={{ flex: 1, gap: 4 }}>
            <T variant="overline" color="inkMuted">
              CUSTOMER NOTE
            </T>
            <T variant="bodyStrong">{`“${offer.note}”`}</T>
            <T variant="caption" color="inkSubtle" style={{ fontWeight: '500' }}>
              {offer.customer}
            </T>
          </View>
        </Card>
        <Card style={{ gap: Spacing.two }}>
          <T variant="overline" color="inkMuted">
            ESTIMATED PAY
          </T>
          <View style={[styles.row, { alignItems: 'baseline', gap: Spacing.two }]}>
            <T variant="money" color="success" style={{ fontSize: 40, lineHeight: 46 }}>
              {pay.amount}
            </T>
            <T variant="headline">{offer.jobType.pricing.kind === 'fixed' ? 'fixed price' : 'first hour'}</T>
            {offer.jobType.pricing.kind === 'fixed' ? null : (
              <T variant="headline" color="inkMuted" style={{ fontWeight: '500' }}>
                {pay.note}
              </T>
            )}
          </View>
          <Chip label={`You keep ${keep}%`} icon={Check} tone="success" />
        </Card>
      </View>

      <View style={[styles.actions, { paddingBottom: bottom }]}>
        <T variant="footnote" color="inkMuted" style={{ textAlign: 'center' }}>
          {offer.urgent
            ? `Arrive by ${deadlineIfAccepted()} or the job goes to the next pro`
            : `Arrive within ${PILOT.lateGraceMinutes} minutes of the slot starting or the job goes to the next pro`}
        </T>
        <Button
          label="Accept job"
          icon={Check}
          size="hero"
          loading={accepting}
          onPress={accept}
        />
        <Button label="Decline" icon={X} variant="ghost" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

function CountdownRing({ seconds }: { seconds: number }) {
  const c = usePalette();
  const size = 148;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View accessibilityRole="timer" accessibilityLabel={`${seconds} seconds left to accept`} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.urgentTint} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c.urgent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - seconds / OFFER_SECONDS)}
        />
      </Svg>
      <T variant="money" style={{ fontVariant: ['tabular-nums'] }}>
        {String(seconds)}
      </T>
      <T variant="caption" color="inkMuted" style={{ marginTop: -2, fontWeight: '500' }}>
        sec to accept
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', paddingHorizontal: Layout.gutter, paddingTop: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  cards: { paddingHorizontal: Layout.gutter, gap: Spacing.three, marginTop: Spacing.six },
  actions: { position: 'absolute', left: Layout.gutter, right: Layout.gutter, bottom: 0, gap: Spacing.two },
});
