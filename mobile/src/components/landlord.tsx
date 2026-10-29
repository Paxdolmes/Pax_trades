// Building blocks of the landlord and agent dashboard: totals, requests waiting for
// an OK, property cards and the request history.
import { router, type Href } from 'expo-router';
import { Check, ChevronRight, House, Users, X } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBreakpoint } from '@/components/site/frame';
import { TRADE_ICONS } from '@/components/trade-icons';
import { Button, Chip, IconTile, T, type LucideIcon, type Tone } from '@/components/ui';
import { Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import { findJobType, formatPence } from '@/domain/catalog';
import { STATUS_LABELS } from '@/lib/jobs';
import { dayAndTime, shortDate } from '@/lib/live';
import { priceLine } from '@/lib/pricing';
import { formatJoinCode, isAwaiting, type ManagedJob, type ManagedProperty } from '@/lib/properties';

/** A manager screen: wider than the booking screens, since agents mostly use a laptop. */
export function ManagerScreen({ children }: { children: ReactNode }) {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: narrow ? Spacing.four : Spacing.ten, paddingBottom: 64 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.column, { paddingHorizontal: narrow ? Spacing.four : Spacing.eight }]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function StatTile({ icon, label, value, tone = 'brand' }: { icon: LucideIcon; label: string; value: string; tone?: Tone }) {
  const c = usePalette();
  return (
    <View style={[styles.tile, Shadows.card, { backgroundColor: c.surface }]}>
      <IconTile icon={icon} tone={tone} size={40} />
      <View style={{ gap: 2 }}>
        <T variant="title1">{value}</T>
        <T variant="footnote" color="inkMuted">
          {label}
        </T>
      </View>
    </View>
  );
}

export function jobChip(j: ManagedJob): { label: string; tone: Tone } {
  if (isAwaiting(j)) return { label: 'Needs your OK', tone: 'urgent' };
  if (j.approval === 'declined') return { label: 'Declined', tone: 'neutral' };
  if (j.status === 'cancelled') return { label: 'Cancelled', tone: 'neutral' };
  if (j.status === 'completed') return { label: j.paidAt ? 'Paid' : 'Done', tone: 'success' };
  if (j.status === 'on_site' && j.finishedAt) return { label: 'Tenant checking', tone: 'brand' };
  return { label: j.status === 'requested' ? 'Finding a pro' : STATUS_LABELS[j.status], tone: 'brand' };
}

const jobLabel = (j: ManagedJob) => findJobType(j.jobTypeId, j.finalPricePence)?.label ?? 'Repair';

/** A tenant's request waiting for the manager: what, where, when, the price, and the two buttons. */
export function PendingCard({
  job,
  onApprove,
  onDecline,
}: {
  job: ManagedJob;
  onApprove: () => Promise<void>;
  onDecline: (reason: string) => Promise<void>;
}) {
  const c = usePalette();
  const type = findJobType(job.jobTypeId);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);
  const when = job.urgency === 'urgent' ? 'As soon as possible' : job.scheduledFor ? dayAndTime(job.scheduledFor) : 'Flexible';

  async function run(kind: 'approve' | 'decline') {
    setBusy(kind);
    try {
      await (kind === 'approve' ? onApprove() : onDecline(reason));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={[styles.pending, Shadows.card, { backgroundColor: c.surface, borderColor: c.urgent }]}>
      <View style={styles.row}>
        <IconTile icon={type ? TRADE_ICONS[type.trade] : House} tone="urgent" size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="headline">{type?.label ?? 'Repair'}</T>
          <T variant="footnote" color="inkMuted">
            {`${job.propertyName} · ${job.tenantName}`}
          </T>
        </View>
      </View>
      {job.description ? (
        <T variant="callout" style={[styles.quote, { backgroundColor: c.bg }]}>
          {`“${job.description}”`}
        </T>
      ) : null}
      <View style={{ gap: 4 }}>
        <Line label="When" value={when} />
        {type ? <Line label="Price" value={priceLine(type, job.urgency)} /> : null}
        <Line label="Asked" value={dayAndTime(job.createdAt)} />
      </View>
      {declining ? (
        <View style={{ gap: Spacing.three }}>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Tell your tenant why (optional), e.g. our own plumber is coming Friday"
            placeholderTextColor={c.inkSubtle}
            multiline
            maxLength={300}
            accessibilityLabel="Reason for declining"
            style={[Type.callout, styles.reason, { backgroundColor: c.bg, color: c.ink }]}
          />
          <View style={styles.buttons}>
            <Button label="Back" variant="secondary" size="md" onPress={() => setDeclining(false)} style={{ flex: 1 }} />
            <Button label="Decline" variant="ink" size="md" loading={busy === 'decline'} onPress={() => run('decline')} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <View style={styles.buttons}>
          <Button label="Decline" variant="secondary" icon={X} size="md" onPress={() => setDeclining(true)} style={{ flex: 1 }} />
          <Button label="Approve" variant="primary" icon={Check} size="md" loading={busy === 'approve'} onPress={() => run('approve')} style={{ flex: 1.4 }} />
        </View>
      )}
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <T variant="footnote" color="inkSubtle" style={{ width: 56 }}>
        {label}
      </T>
      <T variant="footnote" style={{ flex: 1 }}>
        {value}
      </T>
    </View>
  );
}

export function PropertyCard({ property: p, onPress }: { property: ManagedProperty; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${p.postcode}`}
      onPress={onPress}
      style={({ pressed }) => [styles.property, Shadows.card, { backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.row}>
        <IconTile icon={House} size={40} />
        <View style={{ flex: 1 }}>
          <T variant="headline" numberOfLines={1}>
            {p.name}
          </T>
          <T variant="footnote" color="inkMuted">
            {p.postcode}
          </T>
        </View>
        <ChevronRight size={18} color={c.inkSubtle} />
      </View>
      <View style={styles.row}>
        <Users size={16} color={c.inkMuted} />
        <T variant="footnote" color="inkMuted" style={{ flex: 1 }} numberOfLines={1}>
          {p.tenants.length ? p.tenants.join(', ') : `No tenant yet · code ${formatJoinCode(p.joinCode)}`}
        </T>
      </View>
      <View style={[styles.propertyFoot, { borderTopColor: c.border }]}>
        <View>
          <T variant="headline">{formatPence(p.spendYearPence)}</T>
          <T variant="caption" color="inkSubtle">
            spent this year
          </T>
        </View>
        {p.pending ? <Chip label={p.pending === 1 ? '1 to approve' : `${p.pending} to approve`} tone="urgent" /> : null}
        {!p.pending && p.openJobs ? <Chip label={p.openJobs === 1 ? '1 job open' : `${p.openJobs} jobs open`} tone="brand" /> : null}
      </View>
    </Pressable>
  );
}

/** One line of the request history, with what it cost. */
export function HistoryRow({ job, showProperty }: { job: ManagedJob; showProperty?: boolean }) {
  const c = usePalette();
  const type = findJobType(job.jobTypeId, job.finalPricePence);
  const chip = jobChip(job);
  const who = job.bookedByManager ? 'Booked by you' : job.tenantName;
  const meta = [shortDate(job.createdAt), showProperty ? job.propertyName : null, who, job.proName].filter(Boolean).join(' · ');
  return (
    <View style={[styles.history, { borderBottomColor: c.border }]}>
      <IconTile icon={type ? TRADE_ICONS[type.trade] : House} tone="neutral" size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="subhead" style={{ fontWeight: '600' }} numberOfLines={1}>
          {jobLabel(job)}
        </T>
        <T variant="footnote" color="inkMuted" numberOfLines={2}>
          {meta}
        </T>
        {job.declineReason ? (
          <T variant="footnote" color="inkSubtle" numberOfLines={2}>
            {`You said: ${job.declineReason}`}
          </T>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Chip label={chip.label} tone={chip.tone} />
        {job.finalPricePence !== null && job.status === 'completed' ? <T variant="subhead">{formatPence(job.finalPricePence)}</T> : null}
      </View>
    </View>
  );
}

/** "Back to all properties" and similar links at the top of the manager screens. */
export function BackLink({ label, href }: { label: string; href: Href }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => (router.canGoBack() ? router.back() : router.replace(href))} style={styles.back}>
      <T variant="subhead" color="accentStrong" style={{ fontWeight: '600' }}>
        {`‹ ${label}`}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: 1080, alignSelf: 'center', gap: Spacing.six },
  tile: { borderRadius: Radii.lg, padding: Spacing.four, gap: Spacing.three, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pending: { borderRadius: Radii.lg, padding: Spacing.four, gap: Spacing.three, borderLeftWidth: 4 },
  quote: { borderRadius: Radii.sm, padding: Spacing.three },
  line: { flexDirection: 'row', gap: Spacing.two },
  buttons: { flexDirection: 'row', gap: Spacing.three },
  reason: { minHeight: 72, borderRadius: Radii.md, padding: Spacing.three, textAlignVertical: 'top' },
  property: { borderRadius: Radii.lg, padding: Spacing.four, gap: Spacing.three },
  propertyFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: Spacing.three },
  history: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: 1 },
  back: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
});
