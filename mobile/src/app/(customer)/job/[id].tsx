import { router, useLocalSearchParams } from 'expo-router';
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  CircleCheck,
  Clock,
  CreditCard,
  FileText,
  Gift,
  Info,
  Lock,
  MessageCircle,
  ShieldCheck,
  Star,
  TriangleAlert,
  } from 'lucide-react-native';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEMO_ROUTE, PLACES, StaticMap } from '@/components/map';
import { StarInput } from '@/components/reviews';
import { TRADE_ICONS } from '@/components/trade-icons';
import { Avatar, Button, Card, Chip, Divider, Footer, IconTile, Note, ProgressBar, ProgressSteps, Sheet, T } from '@/components/ui';
import { Layout, Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import { ALL_IN_NOTE, findJobType, formatPence, PILOT, TRADES, type Trade } from '@/domain/catalog';
import { arriveBy } from '@/domain/rules';
import { DEMO_CUSTOMER, DEMO_EXTRA_WORK, DEMO_PRO } from '@/lib/demo';
import { firstName, loadCustomerJobs, useLive, type CustomerJob } from '@/lib/live';
import { cancelJob, type JobStatus, type Urgency } from '@/lib/jobs';
import { upfrontPence } from '@/lib/pricing';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { chargeJob } from '@/lib/payments';
import { confirmJob, saveReview } from '@/lib/trust';


type Extra = 'none' | 'asked' | 'approved' | 'declined';

type JobRow = { status: JobStatus; finished_at: string | null; arrive_by: string | null };

/** The database keeps a finished job 'on_site' until the customer confirms; the app shows it as 'finished'. */
const viewStatus = (r: JobRow): JobStatus => (r.status === 'on_site' && r.finished_at ? 'finished' : r.status);

/** The customer's pro, as the job screens show them. */
type JobPro = {
  id: string;
  name: string;
  firstName: string;
  rating: number | null;
  jobs: number;
  reviews: number;
  van: string | null;
  gasSafeNumber: string | null;
  gasSafe: boolean;
  etaMinutes: number;
};

const DEMO_JOB_PRO: JobPro = { ...DEMO_PRO, gasSafe: true };

function proFrom(j: CustomerJob): JobPro {
  const eta = j.arriveBy ? Math.max(1, Math.round((Date.parse(j.arriveBy) - Date.now()) / 60000)) : 15;
  return {
    id: j.pro?.id ?? '',
    name: j.pro?.name ?? 'Your pro',
    firstName: firstName(j.pro?.name) || 'Your pro',
    rating: j.pro?.rating ?? null,
    jobs: j.pro?.jobs ?? 0,
    reviews: j.pro?.reviews ?? 0,
    van: null,
    gasSafeNumber: null,
    gasSafe: j.pro?.credentials.includes('gas_safe') ?? false,
    etaMinutes: eta,
  };
}

const ProContext = createContext<JobPro>(DEMO_JOB_PRO);
const useJobPro = () => useContext(ProContext);

const clockTime = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Demo mode walks through the job on a timer so the flow can be tried without a backend. */
const DEMO_STEPS: Partial<Record<JobStatus, { next: JobStatus; afterMs: number }>> = {
  requested: { next: 'en_route', afterMs: 5000 },
  accepted: { next: 'en_route', afterMs: 1500 },
  en_route: { next: 'on_site', afterMs: 8000 },
};

const startedAt = () => Date.now();

export default function JobScreen() {
  const params = useLocalSearchParams<{
    id: string;
    jobType?: string;
    urgency?: Urgency;
    status?: JobStatus;
    extra?: Extra;
    freeze?: string;
    reassigned?: string;
  }>();
  const demo = params.id.startsWith('demo-');
  const live = isSupabaseConfigured && !demo;
  const { data: rows, reload } = useLive(
    () => (live ? loadCustomerJobs(params.id) : Promise.resolve([] as CustomerJob[])),
    [] as CustomerJob[],
    params.id,
  );
  const row = rows[0] ?? null;
  const jobType = findJobType(row?.jobTypeId ?? params.jobType ?? 'no-heating', row?.finalPricePence) ?? findJobType('no-heating')!;
  const urgency: Urgency = row?.urgency ?? params.urgency ?? 'urgent';
  const pro = row ? proFrom(row) : DEMO_JOB_PRO;
  // Demo steps and realtime updates set this; until then it's what the database says.
  const [shown, setStatus] = useState<JobStatus | null>(params.status ?? null);
  const status: JobStatus = shown ?? (row ? viewStatus({ status: row.status, finished_at: row.finishedAt, arrive_by: row.arriveBy }) : 'requested');
  const [extra, setExtra] = useState<Extra>(params.extra ?? 'none');
  const [reassigned, setReassigned] = useState(params.reassigned === '1');
  // When the pro must arrive. Demo: counted from when the screen opened.
  const [localDue, setDue] = useState(() => arriveBy(urgency === 'urgent', startedAt(), null));
  const due = row?.arriveBy ? Date.parse(row.arriveBy) : localDue;

  // What the database said when the screen loaded, for spotting a reassignment.
  const lastStatus = useRef<JobStatus>('requested');
  useEffect(() => {
    if (row) lastStatus.current = row.status;
  }, [row]);

  // Live: follow the job's status over Supabase realtime.
  useEffect(() => {
    if (!isSupabaseConfigured || demo) return;
    const channel = supabase
      .channel(`job-${params.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${params.id}` },
        (payload) => {
          const next = payload.new as JobRow;
          setStatus((prev) => {
            // Back to 'requested' after a pro had it means they were late and we're finding another.
            const before = prev ?? lastStatus.current;
            if (next.status === 'requested' && before !== 'requested' && before !== 'offered') setReassigned(true);
            return viewStatus(next);
          });
          if (next.arrive_by) setDue(Date.parse(next.arrive_by));
          // A pro was assigned or the price set: fetch their details and the totals.
          void reload();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id, demo, reload]);

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
      const t = setTimeout(() => setStatus('finished'), 4000);
      return () => clearTimeout(t);
    }
  }, [demo, params.freeze, status, extra, jobType.pricing.kind]);

  const held = upfrontPence(jobType, urgency);
  // Live: once the pro has finished, the final price replaces the estimate.
  const finalPence = row?.finalPricePence ?? null;
  const extraPence = extra === 'approved' ? DEMO_EXTRA_WORK.lines.reduce((s, l) => s + l.pence, 0) : 0;

  // A tenant's request to their landlord: the landlord's card pays, so no tip on top.
  const billedTo = row?.property ? row.property.approverName : null;

  if (status === 'finished' || status === 'completed') {
    return (
      <ProContext.Provider value={pro}>
      <JobDone
        jobId={params.id}
        billedTo={billedTo}
        confirmed={status === 'completed'}
        basePence={finalPence ?? held}
        extraPence={finalPence === null ? extraPence : 0}
        jobLabel={jobType.label}
        trade={jobType.trade}
      />
      </ProContext.Provider>
    );
  }
  if (status === 'requested' && row?.property?.approval === 'pending') {
    return (
      <AwaitingApproval
        approver={row.property.approverName}
        propertyName={row.property.name}
        jobLabel={jobType.label}
        trade={jobType.trade}
        urgency={urgency}
        scheduledFor={row.scheduledFor}
        onCancel={() => askToCancel(params.id)}
      />
    );
  }
  if (status === 'requested' || status === 'offered') {
    return (
      <Finding
        billedTo={billedTo}
        postcode={row?.postcode ?? DEMO_CUSTOMER.postcode}
        jobLabel={jobType.label}
        trade={jobType.trade}
        urgency={urgency}
        heldPence={held}
        reassigned={reassigned}
        onCancel={() => askToCancel(params.id)}
      />
    );
  }
  if (status === 'cancelled') {
    const declined = row?.property?.approval === 'declined' ? row.property : null;
    return <Cancelled jobLabel={jobType.label} declinedBy={declined?.approverName} reason={declined?.declineReason ?? null} />;
  }
  return (
    <ProContext.Provider value={pro}>
      <OnTheWay jobId={params.id} arrived={status === 'on_site'} trade={jobType.trade} due={due} />
      {extra === 'asked' ? (
        <ExtraWorkSheet basePence={held} onApprove={() => setExtra('approved')} onDecline={() => setExtra('declined')} />
      ) : null}
    </ProContext.Provider>
  );
}

function askToCancel(jobId: string) {
  Alert.alert('Cancel this request?', "There's no charge, and we'll stop looking for a pro.", [
    { text: 'Keep looking', style: 'cancel' },
    {
      text: 'Cancel request',
      style: 'destructive',
      onPress: () =>
        void cancelJob(jobId).then(
          () => router.replace('/home'),
          (e: unknown) => Alert.alert('Could not cancel', e instanceof Error ? e.message : 'Please try again.'),
        ),
    },
  ]);
}

function Cancelled({ jobLabel, declinedBy, reason }: { jobLabel: string; declinedBy?: string; reason?: string | null }) {
  const c = usePalette();
  return (
    <SafeAreaView style={[styles.cancelled, { backgroundColor: c.bg }]}>
      <T variant="title1" style={{ textAlign: 'center' }}>
        {declinedBy ? 'Not approved' : 'Cancelled'}
      </T>
      <T variant="callout" color="inkMuted" style={{ textAlign: 'center' }}>
        {declinedBy ? `${declinedBy} didn't approve: ${jobLabel.toLowerCase()}.` : `${jobLabel}. You haven't been charged.`}
      </T>
      {reason ? (
        <Card style={{ gap: Spacing.one }}>
          <T variant="overline" color="inkSubtle">
            {`MESSAGE FROM ${declinedBy?.toUpperCase()}`}
          </T>
          <T variant="callout">{reason}</T>
        </Card>
      ) : declinedBy ? (
        <T variant="footnote" color="inkSubtle" style={{ textAlign: 'center' }}>
          {"Contact them if you're not sure why. You can still book and pay for it yourself."}
        </T>
      ) : null}
      <Button label="Back to home" onPress={() => router.replace('/home')} style={{ alignSelf: 'stretch' }} />
    </SafeAreaView>
  );
}

/** A tenant's request waits for their landlord or agent before any pro sees it. */
function AwaitingApproval({
  approver,
  propertyName,
  jobLabel,
  trade,
  urgency,
  scheduledFor,
  onCancel,
}: {
  approver: string;
  propertyName: string;
  jobLabel: string;
  trade: Trade;
  urgency: Urgency;
  scheduledFor: string | null;
  onCancel: () => void;
}) {
  const c = usePalette();
  const when = scheduledFor
    ? new Date(scheduledFor).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'As soon as possible';
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={styles.doneBody}>
        <View style={[styles.doneIcon, { backgroundColor: c.warningTint }]}>
          <Building2 size={24} color={c.warning} strokeWidth={2.2} />
        </View>
        <View style={{ gap: Spacing.two }}>
          <T variant="title1" accessibilityRole="header">
            {`Sent to ${approver}`}
          </T>
          <T variant="callout" color="inkMuted">
            {`As soon as they approve it, we'll send a vetted pro and let you know. The pro will deal with you directly, and ${approver} pays the bill.`}
          </T>
        </View>
        <ProgressSteps steps={['Sent', 'Approved', 'Pro booked', 'Fixed']} current={0} />
        <View style={[styles.summary, { backgroundColor: c.surface }]}>
          <View style={styles.row}>
            <IconTile icon={TRADE_ICONS[trade]} size={44} />
            <View style={{ flex: 1 }}>
              <T variant="headline">{jobLabel}</T>
              <T variant="footnote" color="inkMuted">
                {`${urgency === 'urgent' ? 'ASAP' : when} · ${propertyName}`}
              </T>
            </View>
          </View>
          <Divider />
          <Note icon={Info}>{`Nothing to pay. ${approver} is billed once the job is done.`}</Note>
        </View>
        <Button label="Cancel request" variant="secondary" onPress={onCancel} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Finding({
  billedTo,
  postcode,
  jobLabel,
  trade,
  urgency,
  heldPence,
  reassigned,
  onCancel,
}: {
  billedTo: string | null;
  postcode: string;
  jobLabel: string;
  trade: Trade;
  urgency: Urgency;
  heldPence: number;
  reassigned: boolean;
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
        {reassigned ? (
          <View style={[styles.banner, { backgroundColor: c.warningTint }]}>
            <Gift size={20} color={c.warning} strokeWidth={2.25} />
            <T variant="footnote" style={{ flex: 1 }}>
              {`Your first pro couldn't make it in time, so we're sending the next nearest one. We've added ${formatPence(PILOT.noShowCreditPence)} credit to your account.`}
            </T>
          </View>
        ) : null}
        <View style={[styles.summary, { backgroundColor: c.bg }]}>
          <View style={styles.row}>
            <IconTile icon={TRADE_ICONS[trade]} size={44} />
            <View style={{ flex: 1 }}>
              <T variant="headline">{jobLabel}</T>
              <T variant="footnote" color="inkMuted">
                {`${urgency === 'urgent' ? 'ASAP' : 'Booking'} · ${postcode}`}
              </T>
            </View>
            <T variant="headline">{formatPence(heldPence)}</T>
          </View>
          <Divider />
          <Note icon={Lock}>
            {billedTo ? `Billed to ${billedTo} once the job is done. Nothing for you to pay.` : `${formatPence(heldPence)} held on your card, not charged. ${ALL_IN_NOTE}`}
          </Note>
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

function ProCard({ trade }: { trade: Trade }) {
  const c = usePalette();
  const pro = useJobPro();
  return (
    <View style={{ gap: Spacing.four }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${pro.name}, ${pro.rating ? `rated ${pro.rating} from ${pro.reviews} reviews` : 'new to Relay'}. See profile`}
        onPress={() => router.push({ pathname: '/pro/[id]', params: { id: pro.id } })}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
        <Avatar name={pro.name} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="headline">{pro.name}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Star size={14} color={c.ink} fill={c.ink} />
            <T variant="subhead">{pro.rating ? String(pro.rating) : 'New'}</T>
            <T variant="footnote" color="inkMuted">{`· ${pro.jobs} jobs · ${pro.reviews} reviews`}</T>
          </View>
          {pro.van ? (
            <T variant="footnote" color="inkMuted">
              {pro.van}
            </T>
          ) : null}
        </View>
        <ChevronRight size={20} color={c.inkSubtle} strokeWidth={2.25} />
      </Pressable>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {trade === 'heating' ? (
          <Chip label={pro.gasSafeNumber ? `Gas Safe ${pro.gasSafeNumber}` : 'Gas Safe registered'} tone="success" icon={ShieldCheck} />
        ) : (
          <Chip label="ID and qualifications checked" tone="success" icon={ShieldCheck} />
        )}
        <Chip label="Insured" tone="brand" icon={BadgeCheck} />
      </View>
    </View>
  );
}

function OnTheWay({ jobId, arrived, trade, due }: { jobId: string; arrived: boolean; trade: Trade; due: number }) {
  const c = usePalette();
  const pro = useJobPro();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StaticMap
        height={480}
        center={{ x: 472, y: 440 }}
        scale={1.1}
        route={arrived ? undefined : DEMO_ROUTE}
        pins={[
          { ...PLACES.letticeSt, kind: 'home' },
          ...(arrived ? [] : [{ ...PLACES.fulhamBroadway, kind: 'pro' as const, label: `${pro.etaMinutes} min` }]),
        ]}
      />
      <Sheet>
        <View style={styles.titleRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="footnote" color="inkMuted">
              {arrived ? 'Arrived and working' : `Arriving in about ${pro.etaMinutes} minutes`}
            </T>
            <T variant="title1" accessibilityRole="header">
              {arrived ? `${pro.firstName} is working on it` : `${pro.firstName} is on the way`}
            </T>
          </View>
          {arrived ? null : (
            <View style={{ alignItems: 'flex-end' }}>
              <T variant="display" color="brand">
                {String(pro.etaMinutes)}
              </T>
              <T variant="caption" color="brand">
                min
              </T>
            </View>
          )}
        </View>
        <ProgressSteps steps={STEPS} current={arrived ? 2 : 1} />
        {arrived ? null : (
          <Note icon={Clock}>{`${pro.firstName} must arrive by ${clockTime(due)}. If not, we send the next nearest pro and give you ${formatPence(PILOT.noShowCreditPence)} credit.`}</Note>
        )}
        <Divider />
        <ProCard trade={trade} />
        <Button
          label={`Message ${pro.firstName}`}
          icon={MessageCircle}
          onPress={() => router.push({ pathname: '/chat/[id]', params: { id: jobId, name: pro.name } })}
        />
      </Sheet>
    </View>
  );
}

function ExtraWorkSheet({ basePence, onApprove, onDecline }: { basePence: number; onApprove: () => void; onDecline: () => void }) {
  const c = usePalette();
  const pro = useJobPro();
  const extra = DEMO_EXTRA_WORK.lines.reduce((s, l) => s + l.pence, 0);
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} />
      <Sheet>
        <View style={styles.titleRow}>
          <View style={[styles.row, { flex: 1 }]}>
            <Avatar name={pro.name} size={44} />
            <View style={{ flex: 1 }}>
              <T variant="footnote" color="inkMuted">
                Needs your OK
              </T>
              <T variant="headline">{`${pro.firstName} has added:`}</T>
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
          {`If you decline, ${pro.firstName} finishes the original job only. You won't be charged for this.`}
        </Note>
      </Sheet>
    </View>
  );
}

const TIPS = [0, 300, 500, 1000];

/**
 * The pro says the job is done. The customer confirms and pays, or reports a problem.
 * If they do neither, the job confirms itself after 48 hours. Once paid, they can
 * leave a verified review.
 */
function JobDone({
  jobId,
  billedTo,
  confirmed,
  basePence,
  extraPence,
  jobLabel,
  trade,
}: {
  jobId: string;
  billedTo: string | null;
  confirmed: boolean;
  basePence: number;
  extraPence: number;
  jobLabel: string;
  trade: Trade;
}) {
  const c = usePalette();
  const pro = useJobPro();
  const [tip, setTip] = useState(billedTo ? 0 : 500);
  const [paid, setPaid] = useState(confirmed);
  const [paying, setPaying] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const total = basePence + extraPence + tip;
  const lines = [
    { label: jobLabel, pence: basePence },
    ...(extraPence ? [{ label: DEMO_EXTRA_WORK.title, pence: extraPence }] : []),
  ];

  async function confirmAndPay() {
    setPaying(true);
    try {
      await confirmJob(jobId, tip);
      const status = await chargeJob(jobId);
      if (status !== 'succeeded' && status !== 'processing') {
        Alert.alert(
          billedTo ? 'Payment is with your landlord' : 'Your card was declined',
          billedTo ? `The job is confirmed. We'll sort out payment with ${billedTo}.` : "The job is confirmed. We'll be in touch to sort out payment.",
        );
      }
      setPaid(true);
    } catch (e) {
      Alert.alert('Could not confirm the job', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setPaying(false);
    }
  }

  async function postReview() {
    setSaving(true);
    try {
      await saveReview({ jobId, proId: pro.id, rating, body: review.trim() });
      setReviewed(true);
    } catch (e) {
      Alert.alert('Could not post your review', e instanceof Error ? e.message : 'Please try again in a minute.');
    } finally {
      setSaving(false);
    }
  }

  const report = () => router.push({ pathname: '/report/[id]', params: { id: jobId, job: jobLabel } });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={styles.doneBody} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          <View style={[styles.doneIcon, { backgroundColor: c.successTint }]}>
            <CircleCheck size={26} color={c.success} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="title1" accessibilityRole="header">
              {paid ? (billedTo ? 'All done, thank you' : 'Paid, thank you') : 'Is everything working?'}
            </T>
            <T variant="footnote" color="inkMuted">
              {paid ? `${jobLabel} with ${pro.firstName}` : `${pro.firstName} says the job is done`}
            </T>
          </View>
        </View>

        {paid ? (
          reviewed ? (
            <Card style={styles.row}>
              <IconTile icon={Star} tone="brand" size={44} />
              <View style={{ flex: 1 }}>
                <T variant="subhead">Review posted</T>
                <T variant="footnote" color="inkMuted">
                  {`Thanks for helping neighbours find good pros. ${pro.firstName} can reply once.`}
                </T>
              </View>
            </Card>
          ) : (
            <Card style={{ gap: Spacing.four }}>
              <View style={styles.row}>
                <Avatar name={pro.name} size={40} />
                <T variant="headline">{`How was ${pro.firstName}?`}</T>
              </View>
              <StarInput value={rating} onChange={setRating} />
              <TextInput
                value={review}
                onChangeText={setReview}
                multiline
                maxLength={1000}
                placeholder="What went well? (optional)"
                placeholderTextColor={c.inkSubtle}
                accessibilityLabel="Your review"
                style={[Type.callout, styles.review, { backgroundColor: c.bg, color: c.ink }]}
              />
              <Button label="Post review" size="md" loading={saving} onPress={postReview} />
              <T variant="footnote" color="inkSubtle">
                Your review shows as a verified Relay job, with your first name only.
              </T>
            </Card>
          )
        ) : null}

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
              <T variant="callout" color="inkMuted">{`Tip for ${pro.firstName}`}</T>
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
            {billedTo ? `Billed to ${billedTo}. Nothing for you to pay.` : ALL_IN_NOTE}
          </T>
        </Card>

        {paid || billedTo ? null : (
          <Card style={{ gap: Spacing.three }}>
            <T variant="headline">{`Add a tip for ${pro.firstName}?`}</T>
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
              {`100% of your tip goes to ${pro.firstName}.`}
            </T>
          </Card>
        )}

        <View style={[styles.guarantee, Shadows.card, { backgroundColor: c.surface }]}>
          <IconTile icon={ShieldCheck} tone="success" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="subhead">Covered by the Relay Guarantee</T>
            <T variant="footnote" color="inkMuted">
              {paid
                ? `If something isn't right in the next ${PILOT.guaranteeDays} days, report it and we'll send ${pro.firstName} back or refund you.`
                : `Not right? Report it and ${pro.firstName} isn't paid until it's sorted. If you do nothing, this confirms itself in ${PILOT.autoConfirmHours} hours.`}
            </T>
          </View>
        </View>

        {trade === 'heating' ? (
          <Card style={styles.row}>
            <IconTile icon={FileText} tone="success" size={44} />
            <View style={{ flex: 1 }}>
              <T variant="subhead">Your gas safety record is saved in the app</T>
              <T variant="footnote" color="inkMuted">
                {pro.gasSafeNumber ? `Gas Safe ${pro.gasSafeNumber}` : 'Gas Safe registered engineer'}
              </T>
            </View>
          </Card>
        ) : null}
      </ScrollView>
      <Footer>
        {paid ? (
          <View style={{ flexDirection: 'row', gap: Spacing.three }}>
            <Button label="Report a problem" variant="secondary" icon={TriangleAlert} onPress={report} style={{ flex: 1 }} />
            <Button label="Done" variant="outline" onPress={() => router.replace('/home')} style={{ flex: 1 }} />
          </View>
        ) : (
          <>
            <Button
              label={billedTo ? "Confirm it's fixed" : `Confirm and pay ${formatPence(total)}`}
              variant="ink"
              icon={billedTo ? CircleCheck : CreditCard}
              loading={paying}
              onPress={confirmAndPay}
            />
            <Button label="Something's not right" variant="ghost" icon={TriangleAlert} onPress={report} />
          </>
        )}
      </Footer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cancelled: { flex: 1, justifyContent: 'center', gap: Spacing.four, padding: Layout.gutter },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.three },
  summary: { borderRadius: Radii.lg, padding: Spacing.four, gap: Spacing.three },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.four },
  doneBody: { paddingHorizontal: Layout.gutter, paddingTop: Spacing.two, paddingBottom: Spacing.six, gap: Spacing.four },
  doneIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.two },
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radii.md, padding: Spacing.three },
  review: { minHeight: 80, borderRadius: Radii.md, padding: Spacing.three, textAlignVertical: 'top' },
  guarantee: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radii.lg, padding: Spacing.four },
  tip: { flex: 1, height: 44, borderRadius: Radii.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
