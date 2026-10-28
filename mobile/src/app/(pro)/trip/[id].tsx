import { router, useLocalSearchParams } from 'expo-router';
import {
  Camera,
  ChevronDown,
  CircleCheck,
  Clock3,
  FileBadge,
  Hourglass,
  KeyRound,
  MapPinCheck,
  MessageSquare,
  Navigation,
  Pause,
  Play,
  Plus,
  TimerReset,
  Upload,
  Wrench,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEMO_ROUTE, PLACES, StaticMap } from '@/components/map';
import { Avatar, Button, Card, Chip, Divider, Footer, IconButton, IconTile, Screen, SectionLabel, Sheet, T } from '@/components/ui';
import { Colors, Radii, Shadows, Spacing, usePalette } from '@/constants/theme';
import { CALLOUT_RATES, formatPence, PILOT } from '@/domain/catalog';
import { calloutChargePence } from '@/domain/rules';
import { findOffer, type OfferView } from '@/lib/offers';
import { proArrived, proFinished } from '@/lib/trust';

export default function Trip() {
  const { id, phase } = useLocalSearchParams<{ id: string; phase?: 'en_route' | 'on_job' }>();
  const offer = findOffer(id);
  const [current, setCurrent] = useState(phase ?? 'en_route');
  if (!offer) return null;
  const jobId = `demo-${offer.id}`;
  async function arrived() {
    try {
      await proArrived(jobId);
      setCurrent('on_job');
    } catch (e) {
      Alert.alert('Could not mark you as arrived', e instanceof Error ? e.message : 'Please try again.');
    }
  }
  return current === 'en_route' ? <EnRoute offer={offer} jobId={jobId} onArrived={arrived} /> : <OnJob offer={offer} jobId={jobId} />;
}

function arrivalTime(minutes: number) {
  const d = new Date(Date.now() + minutes * 60000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function EnRoute({ offer, jobId, onArrived }: { offer: OfferView; jobId: string; onArrived: () => void }) {
  const c = usePalette();
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${offer.street}, ${offer.postcode}`)}`;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StaticMap
        height={470}
        center={{ x: 470, y: 450 }}
        scale={1.05}
        route={DEMO_ROUTE}
        pins={[
          { ...PLACES.fulhamBroadway, kind: 'me' },
          { ...PLACES.letticeSt, kind: 'home' },
        ]}
      />
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <IconButton icon={ChevronDown} label="Back to jobs" onPress={() => router.navigate('/dashboard')} />
        <View style={[styles.etaPill, Shadows.card, { backgroundColor: c.surface }]}>
          <View style={[styles.dot, { backgroundColor: c.brand }]} />
          <T variant="subhead" style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {`On your way · arrive ${arrivalTime(offer.minutesAway)}`}
          </T>
        </View>
      </SafeAreaView>
      <Sheet>
        <View style={{ gap: 4 }}>
          <View style={styles.inline}>
            {offer.urgent ? <Chip label="Urgent" tone="urgent" /> : null}
            <Chip label={offer.jobType.label} />
          </View>
          <T variant="title1" accessibilityRole="header">
            {offer.street}
          </T>
          <T variant="callout" color="inkMuted">
            {`Fulham, ${offer.postcode} · ${offer.distanceKm} km · ${offer.minutesAway} min`}
          </T>
        </View>
        <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
          <View style={styles.row}>
            <Avatar name={offer.customer} size={48} tone="neutral" />
            <View style={{ flex: 1 }}>
              <T variant="headline">{offer.customer}</T>
              <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }} numberOfLines={1}>
                {offer.note}
              </T>
            </View>
            <IconButton
              icon={MessageSquare}
              label={`Message ${offer.customer}`}
              tone="brand"
              size={48}
              onPress={() => router.push({ pathname: '/pro-chat/[id]', params: { id: jobId, name: offer.customer } })}
            />
          </View>
          <View style={[styles.access, { backgroundColor: c.surfaceMuted }]}>
            <KeyRound size={16} color={c.inkMuted} strokeWidth={2.25} />
            <T variant="caption" style={{ flex: 1, fontWeight: '500' }}>
              Ring flat B, 1st floor
            </T>
          </View>
        </Card>
        <View style={[styles.deadline, { backgroundColor: c.warningTint }]}>
          <TimerReset size={18} color={c.warning} strokeWidth={2.25} />
          <T variant="footnote" style={{ flex: 1 }}>
            {`Arrive by ${arrivalTime(offer.urgent ? PILOT.urgentEtaMinutes : offer.minutesAway + PILOT.lateGraceMinutes)}. After ${PILOT.lateGraceMinutes} minutes' grace the job goes to the next pro.`}
          </T>
        </View>
        <View style={{ gap: Spacing.two }}>
          <Button label="Open in Google Maps" icon={Navigation} variant="outline" onPress={() => Linking.openURL(maps)} />
          <Button label="I've arrived" icon={MapPinCheck} size="hero" onPress={onArrived} />
        </View>
      </Sheet>
    </View>
  );
}

type LineItem = { title: string; detail: string; pence: number; status: 'approved' | 'waiting' };

function formatElapsed(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function OnJob({ offer, jobId }: { offer: OfferView; jobId: string }) {
  const c = usePalette();
  const night = Colors.dark;
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [certificate, setCertificate] = useState(false);
  const [done, setDone] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const needsCertificate = offer.jobType.trade === 'heating';
  const callout = offer.jobType.pricing.kind === 'callout';

  useEffect(() => {
    if (paused || done) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [paused, done]);

  // Demo: the customer approves extra work a few seconds after it's sent.
  useEffect(() => {
    if (!items.some((i) => i.status === 'waiting')) return;
    const t = setTimeout(() => setItems((all) => all.map((i) => ({ ...i, status: 'approved' }))), 4000);
    return () => clearTimeout(t);
  }, [items]);

  const labour =
    offer.jobType.pricing.kind === 'fixed' ? offer.jobType.pricing.pence : calloutChargePence(Math.floor(elapsed / 60), CALLOUT_RATES.standard);
  const extras = items.filter((i) => i.status === 'approved').reduce((s, i) => s + i.pence, 0);
  const pending = items.filter((i) => i.status === 'waiting').length;
  const blockers = [pending ? `${pending} approval pending` : null, needsCertificate && !certificate ? 'certificate needed' : null].filter(Boolean);

  async function finish() {
    setFinishing(true);
    try {
      await proFinished(jobId, labour + extras);
      setDone(true);
    } catch (e) {
      Alert.alert('Could not complete the job', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setFinishing(false);
    }
  }

  if (done) {
    return (
      <Screen fixed contentStyle={{ justifyContent: 'center', alignItems: 'center', gap: Spacing.four }}>
        <View style={[styles.doneIcon, { backgroundColor: c.successTint }]}>
          <CircleCheck size={36} color={c.success} strokeWidth={2.2} />
        </View>
        <T variant="title1" style={{ textAlign: 'center' }}>
          Waiting for the customer
        </T>
        <T variant="callout" color="inkMuted" style={{ textAlign: 'center' }}>
          {`We've asked ${offer.customer} to confirm the job is done and pay ${formatPence(labour + extras)}. If they don't report a problem, it confirms itself after ${PILOT.autoConfirmHours} hours. Your share then lands in your bank within 48 hours.`}
        </T>
        <Button label="Back to home" onPress={() => router.navigate('/dashboard')} style={{ alignSelf: 'stretch' }} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Footer>
          <Button
            label="Complete job"
            sublabel={blockers.length ? blockers.join(' · ') : 'Customer confirms and pays in the app'}
            icon={CircleCheck}
            size="hero"
            disabled={blockers.length > 0}
            loading={finishing}
            onPress={finish}
          />
        </Footer>
      }>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
            {`${offer.street} · ${offer.customer}`}
          </T>
          <T variant="title2" style={{ fontWeight: '700' }}>
            {offer.jobType.label}
          </T>
        </View>
        <Chip label="On the job" tone="success" />
      </View>

      <View style={[styles.timer, { backgroundColor: night.surface }]}>
        <View style={styles.titleRow}>
          <View style={{ gap: 2 }}>
            <View style={styles.inline}>
              <Clock3 size={15} color={night.inkMuted} strokeWidth={2.5} />
              <T variant="overline" style={{ color: night.inkMuted }}>
                TIME ON JOB
              </T>
            </View>
            <T variant="money" style={{ color: night.ink, fontVariant: ['tabular-nums'] }} accessibilityRole="timer">
              {formatElapsed(elapsed)}
            </T>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume timer' : 'Pause timer'}
            onPress={() => setPaused((p) => !p)}
            style={[styles.pause, { backgroundColor: night.surfaceMuted }]}>
            {paused ? <Play size={24} color={night.ink} strokeWidth={2.5} /> : <Pause size={24} color={night.ink} strokeWidth={2.5} />}
          </Pressable>
        </View>
        <View style={[styles.timerFoot, { borderTopColor: night.border }]}>
          <T variant="callout" style={{ color: night.inkMuted, flex: 1 }}>
            {callout
              ? `First hour ${formatPence(CALLOUT_RATES.standard.firstHourPence)}, then ${formatPence(CALLOUT_RATES.standard.perHourPence / 2)} per half hour`
              : 'Fixed price job'}
          </T>
          <T variant="bodyStrong" style={{ color: night.success, fontVariant: ['tabular-nums'] }}>
            {formatPence(labour)}
          </T>
        </View>
      </View>

      <View style={{ gap: Spacing.three }}>
        <SectionLabel
          right={
            <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
              Customer approves in their app
            </T>
          }>
          Parts and extra work
        </SectionLabel>
        <Card style={{ padding: 0 }}>
          {items.map((item, i) => (
            <View key={i}>
              {i > 0 ? <Divider inset={68} /> : null}
              <View style={[styles.row, { padding: Spacing.three }]}>
                <IconTile icon={item.status === 'approved' ? Wrench : Hourglass} tone="neutral" size={44} />
                <View style={{ flex: 1, gap: 4 }}>
                  <T variant="bodyStrong" numberOfLines={1}>
                    {item.title}
                  </T>
                  {item.status === 'approved' ? (
                    <Chip label="Approved" icon={CircleCheck} tone="success" />
                  ) : (
                    <Chip label="Awaiting approval" icon={Hourglass} tone="warning" />
                  )}
                  <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
                    {item.detail}
                  </T>
                </View>
                <T variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatPence(item.pence)}
                </T>
              </View>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setItems((all) => [...all, { title: 'Pressure relief valve', detail: 'Part · Screwfix, Fulham', pence: 3850, status: 'waiting' }])
            }
            style={[styles.addRow, items.length > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}>
            <Plus size={20} color={c.brand} strokeWidth={2.75} />
            <T variant="headline" color="brand">
              Add part or extra work
            </T>
          </Pressable>
        </Card>
      </View>

      <View style={{ gap: Spacing.three }}>
        <SectionLabel>Photos and certificate</SectionLabel>
        <View style={styles.inline}>
          <Pressable accessibilityRole="button" accessibilityLabel="Add photo" style={[styles.photo, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Camera size={22} color={c.inkMuted} strokeWidth={2.25} />
            <T variant="caption" color="inkMuted" style={{ fontSize: 11 }}>
              Add photo
            </T>
          </Pressable>
          {needsCertificate ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={certificate ? 'Gas safety record uploaded' : 'Upload gas safety record'}
              onPress={() => setCertificate(true)}
              style={[
                styles.certificate,
                certificate
                  ? { borderColor: c.success, backgroundColor: c.successTint, borderStyle: 'solid' }
                  : { borderColor: c.brand, backgroundColor: c.brandTint },
              ]}>
              <FileBadge size={24} color={certificate ? c.success : c.brand} strokeWidth={2.25} />
              <View style={{ flex: 1 }}>
                <T variant="subhead" color={certificate ? 'successStrong' : 'brand'} style={{ fontWeight: '600' }}>
                  Gas safety record
                </T>
                <T variant="caption" color={certificate ? 'successStrong' : 'brand'} style={{ fontSize: 12, fontWeight: '500' }}>
                  {certificate ? 'Uploaded' : 'Required to complete'}
                </T>
              </View>
              {certificate ? <CircleCheck size={18} color={c.success} /> : <Upload size={18} color={c.brand} strokeWidth={2.5} />}
            </Pressable>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: 20, paddingTop: Spacing.two },
  etaPill: { flex: 1, height: 44, borderRadius: Radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  dot: { width: 10, height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  deadline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radii.md, padding: Spacing.three },
  access: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radii.sm, padding: Spacing.two },
  timer: { borderRadius: Radii.lg, padding: Spacing.four, gap: Spacing.three },
  timerFoot: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderTopWidth: 1, paddingTop: Spacing.three },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, height: 56 },
  photo: { width: 72, height: 72, borderRadius: Radii.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  certificate: { flex: 1, height: 72, borderRadius: Radii.md, borderWidth: 1.5, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  pause: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
