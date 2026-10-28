import { router } from 'expo-router';
import { Award, Bell, ChevronRight, Power, Radar } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { PLACES, StaticMap } from '@/components/map';
import { useTabBarPosition } from '@/components/tab-bar';
import { Avatar, Card, Chip, IconButton, Screen, T } from '@/components/ui';
import { Radii, Shadows, Spacing, usePalette } from '@/constants/theme';
import { formatPence, TRADES } from '@/domain/catalog';
import { isLive } from '@/lib/live';
import { useOffers } from '@/lib/offers';
import { goOnline, usePro, useProJobs } from '@/lib/pro';
import { useOnline } from '@/lib/pro-state';

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
  const seen = useRef<Set<string> | null>(null);
  const pro = usePro();
  const { stats, active } = useProJobs();
  const offers = useOffers();
  const eligible = offers.filter((o) => o.missing.length === 0);
  const firstUrgent = eligible.find((o) => o.urgent);
  const [switching, setSwitching] = useState(false);

  async function toggle() {
    if (!online && isLive && !pro.approved) {
      Alert.alert('Not approved yet', "We're checking your documents. You can go online once you're approved, usually within a day.");
      return;
    }
    setSwitching(true);
    try {
      await goOnline(!online);
    } catch (e) {
      Alert.alert(online ? 'Could not go offline' : 'Could not go online', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSwitching(false);
    }
  }

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Live: open each new offer as it arrives while they're on this screen.
  useEffect(() => {
    if (!isLive) return;
    const ids = new Set(offers.map((o) => o.id));
    const fresh = seen.current ? offers.find((o) => !seen.current!.has(o.id)) : undefined;
    seen.current = ids;
    if (online && fresh) router.push({ pathname: '/offer/[id]', params: { id: fresh.id } });
  }, [offers, online]);

  // Demo: an urgent offer arrives a few seconds after going online.
  useEffect(() => {
    if (isLive || !online || offered.current || !firstUrgent) return;
    const t = setTimeout(() => {
      offered.current = true;
      router.push({ pathname: '/offer/[id]', params: { id: firstUrgent.id } });
    }, 4000);
    return () => clearTimeout(t);
  }, [online, firstUrgent]);

  const topTabs = useTabBarPosition() === 'top';
  const trades = pro.trades.map((t) => TRADES.find((x) => x.id === t)?.label.split(' ')[0]).join(' · ');

  return (
    <Screen>
      {/* The top tabs already show the name on a wide browser. */}
      {topTabs ? null : <Wordmark size={24} traders />}
      <View style={styles.header}>
        <Avatar name={pro.name} size={52} />
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="title2">{`${greeting()}, ${pro.firstName}`}</T>
          <View style={styles.headerMeta}>
            {pro.founding ? <Chip label="Founding Pro" icon={Award} tone="brand" /> : null}
            <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
              {trades}
            </T>
          </View>
        </View>
        <IconButton icon={Bell} label="Notifications" onPress={() => router.push('/notifications')} />
      </View>

      <Pressable
        onPress={toggle}
        disabled={switching}
        accessibilityRole="switch"
        accessibilityState={{ checked: online }}
        accessibilityLabel={online ? 'You are online. Tap to go offline' : 'You are offline. Tap to go online'}
        style={[
          styles.toggle,
          online ? [Shadows.float, { backgroundColor: c.success, shadowColor: c.success, shadowOpacity: 0.3 }] : [Shadows.card, { backgroundColor: c.surface }],
        ]}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.headerMeta}>
            <View style={[styles.statusDot, { backgroundColor: online ? c.onSuccess : c.inkSubtle }]} />
            <T variant="overline" color={online ? 'onSuccess' : 'inkMuted'}>
              {online ? 'RECEIVING JOBS' : 'NOT RECEIVING JOBS'}
            </T>
          </View>
          <T variant="title1" color={online ? 'onSuccess' : 'ink'} style={{ fontSize: 28, lineHeight: 34 }}>
            {online ? "You're online" : "You're offline"}
          </T>
          <T variant="callout" color={online ? 'onSuccess' : 'inkMuted'} style={{ opacity: online ? 0.9 : 1 }}>
            {online ? onlineFor(since, now) : 'Tap to start getting offers'}
          </T>
        </View>
        <View style={[styles.track, { backgroundColor: online ? 'rgba(255,255,255,0.28)' : c.surfaceMuted, alignItems: online ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.knob, Shadows.card, { backgroundColor: online ? c.surface : c.inkSubtle }]}>
            <Power size={22} color={online ? c.success : c.surface} strokeWidth={2.75} />
          </View>
        </View>
      </Pressable>

      {active ? (
        <Card
          accessibilityLabel="Open your current job"
          onPress={() => router.push({ pathname: '/trip/[id]', params: { id: active.jobId, ...(active.status === 'on_site' ? { phase: 'on_job' } : {}) } })}
          style={[styles.nearby, { paddingHorizontal: Spacing.four }]}>
          <Radar size={22} color={c.urgent} strokeWidth={2.25} />
          <View style={{ flex: 1 }}>
            <T variant="headline">{active.status === 'on_site' ? 'You are on a job' : 'You have a job to get to'}</T>
            <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
              {`${active.customerName} · ${active.postcode}`}
            </T>
          </View>
          <ChevronRight size={22} color={c.inkSubtle} />
        </Card>
      ) : null}

      <Card style={styles.stats}>
        <Stat label="Today" value={formatPence(stats.todayPence)} big />
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <Stat label="Jobs done" value={String(stats.todayJobs)} />
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <Stat label="This week" value={formatPence(stats.weekPence)} />
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
            <T variant="headline">{eligible.length === 1 ? '1 job for you now' : `${eligible.length} jobs for you now`}</T>
            <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
              {isLive ? (online ? 'New offers open here as they arrive' : 'Go online to get offers') : 'Busiest around Parsons Green right now'}
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
