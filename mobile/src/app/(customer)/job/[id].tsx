import { router, useLocalSearchParams } from 'expo-router';
import {
  BadgeCheck,
  Check,
  CircleCheck,
  CreditCard,
  FileText,
  Flame,
  Info,
  Lock,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Wrench,
  Zap,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEMO_ROUTE, PLACES, StaticMap } from '@/components/map';
import { Avatar, Button, Card, Chip, Divider, Footer, IconTile, Note, ProgressBar, Sheet, T, type LucideIcon } from '@/components/ui';
import { Layout, Radii, Spacing, usePalette } from '@/constants/theme';
import { findJobType, formatPence, TRADES, type Trade } from '@/domain/catalog';
import { DEMO_CUSTOMER, DEMO_EXTRA_WORK, DEMO_PRO } from '@/lib/demo';
import type { JobStatus, Urgency } from '@/lib/jobs';
import { upfrontPence } from '@/lib/pricing';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const TRADE_ICONS: Record<Trade, LucideIcon> = { plumbing: Wrench, electrical: Zap, heating: Flame };

type Extra = 'none' | 'asked' | 'approved' | 'declined';

/** Demo mode walks through the job on a timer so the flow can be tried without a backend. */
const DEMO_STEPS: Partial<Record<JobStatus, { next: JobStatus; afterMs: number }>> = {
  requested: { next: 'en_route', afterMs: 5000 },
  accepted: { next: 'en_route', afterMs: 1500 },
  en_route: { next: 'on_site', afterMs: 8000 },
};

export default function JobScreen() {
  const params = useLocalSearchParams<{ id: string; jobType?: string; urgency?: Urgency; status?: JobStatus; extra?: Extra; freeze?: string }>();
  const demo = params.id.startsWith('demo-');
  const jobType = findJobType(params.jobType ?? 'no-heating') ?? findJobType('no-heating')!;
  const urgency: Urgency = params.urgency ?? 'urgent';
  const [status, setStatus] = useState<JobStatus>(params.status ?? 'requested');
  const [extra, setExtra] = useState<Extra>(params.extra ?? 'none');

  // Live status over Supabase realtime once a backend is connected.
  useEffect(() => {
    if (!isSupabaseConfigured || demo) return;
    const channel = supabase
      .channel(`job-${params.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${params.id}` },
        (payload) => setStatus((payload.new as { status: JobStatus }).status),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id, demo]);

  useEffect(() => {
    if (!demo || params.freeze) return;
    const step = DEMO_STEPS[status];
    if (step) {
      const t = setTimeout(() => setStatus(step.next), step.afterMs);
      return () => clearTimeout(t);
    }
    if (status === 'on_site' && extra === 'none' && jobType.pricing.kind === 'callout') {
      const t = setTimeout(() => setExtra('asked'), 3000);
      return () => clearTimeout(t);
    }
    if (status === 'on_site' && extra !== 'asked') {
      const t = setTimeout(() => setStatus('completed'), 4000);
      return () => clearTimeout(t);
    }
  }, [demo, params.freeze, status, extra, jobType.pricing.kind]);

  const held = upfrontPence(jobType, urgency);
  const extraPence = extra === 'approved' ? DEMO_EXTRA_WORK.lines.reduce((s, l) => s + l.pence, 0) : 0;

  if (status === 'completed') return <JobDone basePence={held} extraPence={extraPence} jobLabel={jobType.label} trade={jobType.trade} />;
  if (status === 'requested' || status === 'offered') {
    return <Finding jobLabel={jobType.label} trade={jobType.trade} urgency={urgency} heldPence={held} onCancel={() => router.replace('/home')} />;
  }
  return (
    <>
      <OnTheWay arrived={status === 'on_site'} trade={jobType.trade} />
      {extra === 'asked' ? (
        <ExtraWorkSheet basePence={held} onApprove={() => setExtra('approved')} onDecline={() => setExtra('declined')} />
      ) : null}
    </>
  );
}

function Finding({
  jobLabel,
  trade,
  urgency,
  heldPence,
  onCancel,
}: {
  jobLabel: string;
  trade: Trade;
  urgency: Urgency;
  heldPence: number;
  onCancel: () => void;
}) {
  const c = usePalette();
  const pro = TRADES.find((t) => t.id === trade)?.pro ?? 'pro';
  const [progress, setProgress] = useState(0.15);
  useEffect(() => {
    const t = setInterval(() => setProgress((p) => (p >= 0.9 ? 0.15 : p + 0.08)), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StaticMap
        height={520}
        center={{ x: PLACES.letticeSt.x, y: PLACES.letticeSt.y + 40 }}
        scale={1.1}
        pins={[
          { ...PLACES.parsonsGreen, kind: 'dot' },
          { ...PLACES.munsterRd, kind: 'dot' },
          { ...PLACES.peterboroughRd, kind: 'dot' },
          { x: 300, y: 600, kind: 'dot' },
          { x: 430, y: 400, kind: 'dot' },
          { ...PLACES.letticeSt, kind: 'home' },
        ]}>
        {(project) => {
          const home = project(PLACES.letticeSt);
          return [220, 150, 84].map((d, i) => (
            <View
              key={d}
              style={{
                position: 'absolute',
                left: home.x - d / 2,
                top: home.y - d / 2,
                width: d,
                height: d,
                borderRadius: d / 2,
                backgroundColor: c.brand,
                opacity: 0.08 + i * 0.06,
              }}
            />
          ));
        }}
      </StaticMap>
      <Sheet>
        <View style={{ gap: Spacing.two }}>
          <T variant="title1" accessibilityRole="header">
            {`Finding a ${pro} near you`}
          </T>
          <T variant="callout" color="inkMuted">
            {"We're asking the nearest vetted pros within 2 miles. This usually takes under a minute."}
          </T>
        </View>
        <ProgressBar value={progress} />
        <View style={[styles.summary, { backgroundColor: c.bg }]}>
          <View style={styles.row}>
            <IconTile icon={TRADE_ICONS[trade]} size={44} />
            <View style={{ flex: 1 }}>
              <T variant="headline">{jobLabel}</T>
              <T variant="footnote" color="inkMuted">
                {`${urgency === 'urgent' ? 'ASAP' : 'Booking'} · ${DEMO_CUSTOMER.postcode}`}
              </T>
            </View>
            <T variant="headline">{formatPence(heldPence)}</T>
          </View>
          <Divider />
          <Note icon={Lock}>{`${formatPence(heldPence)} held on your card, not charged`}</Note>
        </View>
        <View style={{ gap: Spacing.two, alignItems: 'center' }}>
          <Button label="Cancel request" variant="secondary" onPress={onCancel} style={{ alignSelf: 'stretch' }} />
          <T variant="footnote" color="inkSubtle">
            Free to cancel until a pro accepts
          </T>
        </View>
      </Sheet>
    </View>
  );
}

const STEPS = ['Accepted', 'On the way', 'Arrived', 'Job done'];

function ProgressSteps({ current }: { current: number }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={`Step ${current + 1} of 4: ${STEPS[current]}`}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={{ flex: 1, alignItems: 'center', gap: Spacing.two }}>
            {i > 0 ? (
              <View style={{ position: 'absolute', top: 11, right: '50%', width: '100%', height: 2, backgroundColor: i <= current ? c.brand : c.border }} />
            ) : null}
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? c.brand : c.surface,
                borderWidth: active ? 6 : done ? 0 : 2,
                borderColor: active ? c.brand : c.border,
              }}>
              {done ? <Check size={14} color={c.onBrand} strokeWidth={3} /> : null}
            </View>
            <T variant="caption" color={done || active ? 'ink' : 'inkSubtle'}>
              {label}
            </T>
          </View>
        );
      })}
    </View>
  );
}

function ProCard({ trade }: { trade: Trade }) {
  const c = usePalette();
  return (
    <View style={{ gap: Spacing.four }}>
      <View style={styles.row}>
        <Avatar name={DEMO_PRO.name} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="headline">{DEMO_PRO.name}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Star size={14} color={c.ink} fill={c.ink} />
            <T variant="subhead">{String(DEMO_PRO.rating)}</T>
            <T variant="footnote" color="inkMuted">{`(${DEMO_PRO.jobs} jobs)`}</T>
          </View>
          <T variant="footnote" color="inkMuted">
            {DEMO_PRO.van}
          </T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {trade === 'heating' ? (
          <Chip label={`Gas Safe ${DEMO_PRO.gasSafeNumber}`} tone="success" icon={ShieldCheck} />
        ) : (
          <Chip label="ID and qualifications checked" tone="success" icon={ShieldCheck} />
        )}
        <Chip label="Insured" tone="brand" icon={BadgeCheck} />
      </View>
    </View>
  );
}

function OnTheWay({ arrived, trade }: { arrived: boolean; trade: Trade }) {
  const c = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StaticMap
        height={480}
        center={{ x: 472, y: 440 }}
        scale={1.1}
        route={arrived ? undefined : DEMO_ROUTE}
        pins={[
          { ...PLACES.letticeSt, kind: 'home' },
          ...(arrived ? [] : [{ ...PLACES.fulhamBroadway, kind: 'pro' as const, label: `${DEMO_PRO.etaMinutes} min` }]),
        ]}
      />
      <Sheet>
        <View style={styles.titleRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="footnote" color="inkMuted">
              {arrived ? 'Arrived and working' : `Arriving in about ${DEMO_PRO.etaMinutes} minutes`}
            </T>
            <T variant="title1" accessibilityRole="header">
              {arrived ? `${DEMO_PRO.firstName} is working on it` : `${DEMO_PRO.firstName} is on the way`}
            </T>
          </View>
          {arrived ? null : (
            <View style={{ alignItems: 'flex-end' }}>
              <T variant="display" color="brand">
                {String(DEMO_PRO.etaMinutes)}
              </T>
              <T variant="caption" color="brand">
                min
              </T>
            </View>
          )}
        </View>
        <ProgressSteps current={arrived ? 2 : 1} />
        <Divider />
        <ProCard trade={trade} />
        <View style={{ flexDirection: 'row', gap: Spacing.three }}>
          <Button label="Call" sublabel="Number masked" variant="secondary" icon={Phone} style={{ flex: 1 }} />
          <Button label="Message" icon={MessageCircle} style={{ flex: 1 }} />
        </View>
      </Sheet>
    </View>
  );
}

function ExtraWorkSheet({ basePence, onApprove, onDecline }: { basePence: number; onApprove: () => void; onDecline: () => void }) {
  const c = usePalette();
  const extra = DEMO_EXTRA_WORK.lines.reduce((s, l) => s + l.pence, 0);
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} />
      <Sheet>
        <View style={styles.titleRow}>
          <View style={[styles.row, { flex: 1 }]}>
            <Avatar name={DEMO_PRO.name} size={44} />
            <View style={{ flex: 1 }}>
              <T variant="footnote" color="inkMuted">
                Needs your OK
              </T>
              <T variant="headline">{`${DEMO_PRO.firstName} has added:`}</T>
            </View>
          </View>
          <Chip label="Extra work" tone="urgent" />
        </View>
        <View style={{ gap: Spacing.two }}>
          <T variant="title1" accessibilityRole="header">
            {DEMO_EXTRA_WORK.title}
          </T>
          <T variant="callout" color="inkMuted">
            {DEMO_EXTRA_WORK.reason}
          </T>
        </View>
        <View style={[styles.summary, { backgroundColor: c.bg }]}>
          {DEMO_EXTRA_WORK.lines.map((l) => (
            <View key={l.label} style={styles.line}>
              <View style={{ flex: 1 }}>
                <T variant="subhead">{l.label}</T>
                <T variant="footnote" color="inkMuted">
                  {l.detail}
                </T>
              </View>
              <T variant="bodyStrong">{formatPence(l.pence)}</T>
            </View>
          ))}
          <Divider />
          <View style={[styles.line, { alignItems: 'center' }]}>
            <T variant="headline">Extra cost</T>
            <T variant="title2">{formatPence(extra)}</T>
          </View>
          <T variant="footnote" color="inkMuted">
            {`New job total ${formatPence(basePence + extra)}, including your first hour`}
          </T>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.three }}>
          <Button label="Decline" variant="secondary" onPress={onDecline} style={{ flex: 1 }} />
          <Button label={`Approve ${formatPence(extra)}`} variant="urgent" onPress={onApprove} style={{ flex: 1.6 }} />
        </View>
        <Note icon={Info} color="inkSubtle">
          {`If you decline, ${DEMO_PRO.firstName} finishes the original job only. You won't be charged for this.`}
        </Note>
      </Sheet>
    </View>
  );
}

const TIPS = [0, 300, 500, 1000];

function JobDone({ basePence, extraPence, jobLabel, trade }: { basePence: number; extraPence: number; jobLabel: string; trade: Trade }) {
  const c = usePalette();
  const [rating, setRating] = useState(5);
  const [tip, setTip] = useState(500);
  const [paid, setPaid] = useState(false);
  const total = basePence + extraPence + tip;
  const lines = [
    { label: jobLabel, pence: basePence },
    ...(extraPence ? [{ label: DEMO_EXTRA_WORK.title, pence: extraPence }] : []),
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={styles.doneBody}>
        <View style={styles.row}>
          <View style={[styles.doneIcon, { backgroundColor: c.successTint }]}>
            <CircleCheck size={26} color={c.success} strokeWidth={2.2} />
          </View>
          <View>
            <T variant="title1" accessibilityRole="header">
              {paid ? 'Paid, thank you' : 'Job done'}
            </T>
            <T variant="footnote" color="inkMuted">
              {`${DEMO_PRO.firstName} has finished the job`}
            </T>
          </View>
        </View>

        <Card style={{ gap: Spacing.three }}>
          <T variant="overline" color="inkSubtle">
            RECEIPT
          </T>
          {lines.map((l) => (
            <View key={l.label} style={styles.line}>
              <T variant="callout" style={{ flex: 1 }}>
                {l.label}
              </T>
              <T variant="callout">{formatPence(l.pence)}</T>
            </View>
          ))}
          {tip > 0 ? (
            <View style={styles.line}>
              <T variant="callout" color="inkMuted">{`Tip for ${DEMO_PRO.firstName}`}</T>
              <T variant="callout" color="inkMuted">
                {formatPence(tip)}
              </T>
            </View>
          ) : null}
          <Divider />
          <View style={[styles.line, { alignItems: 'baseline' }]}>
            <T variant="headline">Total</T>
            <T variant="title1">{formatPence(total)}</T>
          </View>
          <T variant="footnote" color="inkSubtle">
            Includes VAT
          </T>
        </Card>

        <Card style={{ gap: Spacing.four }}>
          <View style={styles.row}>
            <Avatar name={DEMO_PRO.name} size={40} />
            <T variant="headline">{`How was ${DEMO_PRO.firstName}?`}</T>
          </View>
          <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="radio"
                accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
                accessibilityState={{ checked: rating === n }}
                onPress={() => setRating(n)}
                hitSlop={4}>
                <Star size={36} color={n <= rating ? c.brand : c.border} fill={n <= rating ? c.brand : c.border} strokeWidth={1.5} />
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.two }} accessibilityRole="radiogroup" accessibilityLabel="Tip">
            {TIPS.map((t) => {
              const on = tip === t;
              return (
                <Pressable
                  key={t}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setTip(t)}
                  style={[styles.tip, { borderColor: on ? c.brand : c.border, backgroundColor: on ? c.brandTint : c.surface }]}>
                  <T variant="subhead" color={on ? 'brand' : 'ink'}>
                    {t === 0 ? 'No tip' : formatPence(t)}
                  </T>
                </Pressable>
              );
            })}
          </View>
          <T variant="footnote" color="inkSubtle">
            {`100% of your tip goes to ${DEMO_PRO.firstName}.`}
          </T>
        </Card>

        {trade === 'heating' ? (
          <Card style={styles.row}>
            <IconTile icon={FileText} tone="success" size={44} />
            <View style={{ flex: 1 }}>
              <T variant="subhead">Your gas safety record is saved in the app</T>
              <T variant="footnote" color="inkMuted">
                {`Gas Safe ${DEMO_PRO.gasSafeNumber}`}
              </T>
            </View>
          </Card>
        ) : null}
      </ScrollView>
      <Footer>
        {paid ? (
          <Button label="Back to home" variant="outline" onPress={() => router.replace('/home')} />
        ) : (
          <Button label={`Pay ${formatPence(total)}`} variant="ink" icon={CreditCard} onPress={() => setPaid(true)} />
        )}
      </Footer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.three },
  summary: { borderRadius: Radii.lg, padding: Spacing.four, gap: Spacing.three },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.four },
  doneBody: { paddingHorizontal: Layout.gutter, paddingTop: Spacing.two, paddingBottom: Spacing.six, gap: Spacing.four },
  doneIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.two },
  tip: { flex: 1, height: 44, borderRadius: Radii.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
