import { router } from 'expo-router';
import { Award, Bell, ChevronRight, Power, Radar } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { PLACES, StaticMap } from '@/components/map';
import { Avatar, Card, Chip, IconButton, Screen, T } from '@/components/ui';
import { Radii, Shadows, Spacing, usePalette } from '@/constants/theme';
import { TRADES } from '@/domain/catalog';
import { DEMO_TRADER } from '@/lib/demo';
import { listOffers } from '@/lib/offers';
import { setOnline, useOnline } from '@/lib/pro-state';

function greeting(hour = new Date().getHours()) {
  return hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
}

function onlineFor(since: number | null, now: number) {
  if (!since) return 'Just now';
  const mins = Math.floor((now - since) / 60000);
  return mins < 1 ? 'Online just now' : mins < 60 ? `Online for ${mins} min` : `Online for ${Math.floor(mins / 60)} h ${mins % 60} min`;
}

export default function ProHome() {
  const c = usePalette();
  const [online, since] = useOnline();
  const [now, setNow] = useState(() => Date.now());
  const offered = useRef(false);
  const offers = listOffers();
  const eligible = offers.filter((o) => o.missing.length === 0);
  const firstUrgent = eligible.find((o) => o.urgent);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Demo: an urgent offer arrives a few seconds after going online.
  useEffect(() => {
    if (!online || offered.current || !firstUrgent) return;
    const t = setTimeout(() => {
      offered.current = true;
      router.push({ pathname: '/offer/[id]', params: { id: firstUrgent.id } });
    }, 4000);
    return () => clearTimeout(t);
  }, [online, firstUrgent]);

  const trades = DEMO_TRADER.trades.map((t) => TRADES.find((x) => x.id === t)?.label.split(' ')[0]).join(' · ');

  return (
    <Screen>
      <Wordmark size={24} traders />
      <View style={styles.header}>
        <Avatar name={DEMO_TRADER.name} size={52} />
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="title2">{`${greeting()}, ${DEMO_TRADER.firstName}`}</T>
          <View style={styles.headerMeta}>
            {DEMO_TRADER.founding ? <Chip label="Founding Pro" icon={Award} tone="brand" /> : null}
            <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
              {trades}
            </T>
          </View>
        </View>
        <IconButton icon={Bell} label="Notifications" />
      </View>

      <Pressable
        onPress={() => setOnline(!online)}
        accessibilityRole="switch"
        accessibilityState={{ checked: online }}
        accessibilityLabel={online ? 'You are online. Tap to go offline' : 'You are offline. Tap to go online'}
        style={[
          styles.toggle,
          online ? [Shadows.float, { backgroundColor: c.success, shadowColor: c.success, shadowOpacity: 0.3 }] : [Shadows.card, { backgroundColor: c.surface }],
        ]}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.headerMeta}>
            <View style={[styles.statusDot, { backgroundColor: online ? c.onBrand : c.inkSubtle }]} />
            <T variant="overline" color={online ? 'onBrand' : 'inkMuted'}>
              {online ? 'RECEIVING JOBS' : 'NOT RECEIVING JOBS'}
            </T>
          </View>
          <T variant="title1" color={online ? 'onBrand' : 'ink'} style={{ fontSize: 28, lineHeight: 34 }}>
            {online ? "You're online" : "You're offline"}
          </T>
          <T variant="callout" color={online ? 'onBrand' : 'inkMuted'} style={{ opacity: online ? 0.9 : 1 }}>
            {online ? onlineFor(since, now) : 'Tap to start getting offers'}
          </T>
        </View>
        <View style={[styles.track, { backgroundColor: online ? 'rgba(255,255,255,0.28)' : c.surfaceMuted, alignItems: online ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.knob, Shadows.card, { backgroundColor: online ? c.surface : c.inkSubtle }]}>
            <Power size={22} color={online ? c.success : c.surface} strokeWidth={2.75} />
          </View>
        </View>
      </Pressable>

      <Card style={styles.stats}>
        <Stat label="Today" value="£412" big />
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <Stat label="Jobs done" value="4" />
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <Stat label="Acceptance" value="94%" />
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <StaticMap
          height={200}
          center={{ x: 466, y: 458 }}
          scale={0.56}
          pins={[
            { ...PLACES.fulhamBroadway, kind: 'me' },
            { ...PLACES.letticeSt, kind: online ? 'urgent' : 'job' },
            { ...PLACES.bovingdonRd, kind: 'job' },
            { ...PLACES.munsterRd, kind: 'job' },
            { ...PLACES.peterboroughRd, kind: 'locked' },
          ]}
        />
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/jobs')} style={styles.nearby}>
          <Radar size={22} color={c.brand} strokeWidth={2.25} />
          <View style={{ flex: 1 }}>
            <T variant="headline">{`${eligible.length} jobs near you in SW6`}</T>
            <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
              Busiest around Parsons Green right now
            </T>
          </View>
          <ChevronRight size={22} color={c.inkSubtle} />
        </Pressable>
      </Card>
    </Screen>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={{ flex: big ? 1.25 : 1, alignItems: 'center', gap: 2 }}>
      <T variant={big ? 'title1' : 'title2'} color={big ? 'success' : 'ink'} style={{ fontVariant: ['tabular-nums'], fontSize: big ? 28 : 22, lineHeight: 34 }}>
        {value}
      </T>
      <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  toggle: { borderRadius: Radii.xl, padding: Spacing.five, paddingRight: Spacing.four, flexDirection: 'row', alignItems: 'center', gap: Spacing.four, minHeight: 132 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  track: { width: 84, height: 52, borderRadius: 26, padding: 4, justifyContent: 'center' },
  knob: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', paddingVertical: Spacing.four, paddingHorizontal: 0 },
  statDivider: { width: 1, marginVertical: 4 },
  nearby: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four, height: 64 },
});
