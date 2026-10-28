import { router } from 'expo-router';
import { BadgeCheck, ChevronLeft, ExternalLink, FileText, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Divider, IconButton, IconTile, Screen, T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { formatPence, TRADES } from '@/domain/catalog';
import {
  approvePro,
  checkCredential,
  loadOpenReports,
  loadProsToReview,
  resolveReport,
  type OpenReport,
  type ProblemStatus,
  type ProToReview,
  type ReviewCredential,
} from '@/lib/admin';
import { signOut } from '@/lib/auth';
import { documentLink } from '@/lib/credentials';
import { CREDENTIAL_LABELS } from '@/lib/demo';
import { shortDate, useLive } from '@/lib/live';
import { PROBLEM_KINDS } from '@/lib/trust';

/** Where to check a pro's number on the scheme's public register. */
const REGISTERS: Partial<Record<ReviewCredential['type'], string>> = {
  gas_safe: 'https://www.gassaferegister.co.uk/find-an-engineer-or-check-the-register/',
  competent_person_scheme: 'https://www.competentperson.co.uk/',
};

const fail = (title: string) => (e: unknown) => Alert.alert(title, e instanceof Error ? e.message : 'Please try again.');

/** Admins only: approve new tradespeople and sort out problem reports. */
export default function Admin() {
  const c = usePalette();
  const [tab, setTab] = useState<'pros' | 'reports'>('pros');
  const pros = useLive(loadProsToReview, [] as ProToReview[]);
  const reports = useLive(loadOpenReports, [] as OpenReport[]);
  const current = tab === 'pros' ? pros : reports;

  return (
    <Screen>
      <View style={styles.header}>
        {router.canGoBack() ? <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} tone="muted" /> : <View style={{ width: 44 }} />}
        <T variant="headline">Relay admin</T>
        <Button label="Sign out" variant="ghost" size="md" onPress={() => void signOut()} />
      </View>

      <View style={[styles.segments, { backgroundColor: c.surfaceMuted }]}>
        {(
          [
            ['pros', `Pros to check · ${pros.data.length}`],
            ['reports', `Problems · ${reports.data.length}`],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            onPress={() => setTab(key)}
            style={[styles.segment, tab === key && { backgroundColor: c.surface }]}>
            <T variant="subhead" style={{ fontWeight: '600' }}>
              {label}
            </T>
          </Pressable>
        ))}
      </View>

      {current.error ? (
        <T variant="callout" color="danger">
          {current.error}
        </T>
      ) : null}

      {tab === 'pros' ? (
        pros.data.length ? (
          pros.data.map((p) => <ProCard key={p.id} pro={p} onChange={pros.reload} />)
        ) : (
          <T variant="callout" color="inkMuted">
            {pros.loading ? 'Loading…' : 'Nobody waiting. New applications and documents appear here.'}
          </T>
        )
      ) : reports.data.length ? (
        reports.data.map((r) => <ReportCard key={r.id} report={r} onChange={reports.reload} />)
      ) : (
        <T variant="callout" color="inkMuted">
          {reports.loading ? 'Loading…' : 'No open problem reports.'}
        </T>
      )}
    </Screen>
  );
}

function ProCard({ pro, onChange }: { pro: ProToReview; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const trades = pro.trades.map((t) => TRADES.find((x) => x.id === t)?.label).join(', ') || 'No trades';

  const run = async (step: () => Promise<void>, title: string) => {
    setBusy(true);
    await step().then(onChange, fail(title));
    setBusy(false);
  };

  const approve = () =>
    Alert.alert(`Approve ${pro.name}?`, 'They can go online and get jobs straight away.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Standard, 15%', onPress: () => void run(() => approvePro(pro.id, false), 'Could not approve') },
      { text: 'Founding, 10%', onPress: () => void run(() => approvePro(pro.id, true), 'Could not approve') },
    ]);

  return (
    <Card style={{ gap: Spacing.three }}>
      <View style={{ gap: 2 }}>
        <View style={styles.inline}>
          <T variant="headline" style={{ flex: 1 }}>
            {pro.name}
          </T>
          {pro.approved ? <Chip label="Approved" tone="success" icon={BadgeCheck} /> : <Chip label="New" tone="brand" />}
        </View>
        <T variant="footnote" color="inkMuted">
          {`${trades} · applied ${shortDate(pro.appliedAt)}`}
        </T>
        {pro.email ? (
          <T variant="footnote" color="inkMuted" selectable>
            {pro.email}
          </T>
        ) : null}
      </View>

      {pro.credentials.length === 0 ? (
        <T variant="footnote" color="inkMuted">
          No documents uploaded yet.
        </T>
      ) : null}
      {pro.credentials.map((cred, i) => (
        <View key={cred.id} style={{ gap: Spacing.two }}>
          {i > 0 ? <Divider /> : null}
          <CredentialRow credential={cred} busy={busy} onCheck={(accept) => run(() => checkCredential(cred.id, accept), 'Could not save')} />
        </View>
      ))}

      {pro.approved ? null : <Button label="Approve" icon={ShieldCheck} loading={busy} onPress={approve} />}
    </Card>
  );
}

function CredentialRow({ credential: cred, busy, onCheck }: { credential: ReviewCredential; busy: boolean; onCheck: (accept: boolean) => void }) {
  const register = REGISTERS[cred.type];
  const open = (path: string) => documentLink(path).then(Linking.openURL, fail('Could not open the document'));
  return (
    <View style={{ gap: Spacing.two }}>
      <View style={styles.inline}>
        <IconTile icon={FileText} tone={cred.verified ? 'success' : 'neutral'} size={36} />
        <View style={{ flex: 1 }}>
          <T variant="subhead" style={{ fontWeight: '600' }}>
            {CREDENTIAL_LABELS[cred.type]}
          </T>
          <T variant="footnote" color="inkMuted" selectable>
            {`${cred.reference ?? 'No number'} · ${cred.expiresOn ? `expires ${shortDate(cred.expiresOn)}` : 'no expiry'}`}
          </T>
        </View>
        {cred.verified ? <Chip label="Checked" tone="success" /> : null}
      </View>
      <View style={styles.inline}>
        {cred.documentPath ? (
          <Button label="View" icon={ExternalLink} variant="outline" size="md" onPress={() => void open(cred.documentPath!)} style={{ flex: 1 }} />
        ) : null}
        {register ? (
          <Button label="Register" icon={ExternalLink} variant="outline" size="md" onPress={() => void Linking.openURL(register)} style={{ flex: 1 }} />
        ) : null}
      </View>
      {cred.verified ? null : (
        <View style={styles.inline}>
          <Button label="Reject" variant="secondary" size="md" disabled={busy} onPress={() => onCheck(false)} style={{ flex: 1 }} />
          <Button label="Accept" variant="success" size="md" disabled={busy} onPress={() => onCheck(true)} style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}

/** What each resolution tells the customer. */
const OUTCOMES: { status: Exclude<ProblemStatus, 'open'>; label: string; note: string; creditPence?: number; confirm?: string }[] = [
  { status: 'pro_returning', label: 'Pro going back', note: 'Your pro is coming back to put it right, at no extra cost.' },
  { status: 'credited', label: 'Give £10 credit', note: "Sorry about this. We've added £10 off your next job.", creditPence: 1000 },
  {
    status: 'refunded',
    label: 'Refunded',
    note: "We've refunded you. It can take 5 to 10 days to reach your account.",
    confirm: 'Make the refund in the Stripe dashboard first: Payments, open the payment, Refund.',
  },
  { status: 'closed', label: 'Close', note: 'The Relay team has closed this report. Message us in the app if anything is still wrong.' },
];

function ReportCard({ report: r, onChange }: { report: OpenReport; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const kind = PROBLEM_KINDS.find((k) => k.kind === r.kind)?.label ?? r.kind;

  const resolve = (o: (typeof OUTCOMES)[number]) => {
    const go = async () => {
      setBusy(true);
      await resolveReport(r.id, o.status, o.note, o.creditPence).then(onChange, fail('Could not save'));
      setBusy(false);
    };
    Alert.alert(o.label, o.confirm ? `${o.confirm}\n\nThe customer is told: “${o.note}”` : `The customer is told: “${o.note}”`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: () => void go() },
    ]);
  };

  return (
    <Card style={{ gap: Spacing.three }}>
      <View style={styles.inline}>
        <IconTile icon={TriangleAlert} tone="warning" size={40} />
        <View style={{ flex: 1 }}>
          <T variant="headline">{kind}</T>
          <T variant="footnote" color="inkMuted">
            {`${r.jobLabel} · ${r.postcode} · ${shortDate(r.createdAt)}`}
          </T>
        </View>
        {r.status === 'pro_returning' ? <Chip label="Pro going back" tone="brand" /> : null}
      </View>
      <T variant="callout">{`“${r.description}”`}</T>
      <T variant="footnote" color="inkMuted">
        {`${r.customerName} · pro ${r.proName} · ${r.paidPence === null ? 'not paid yet' : `paid ${formatPence(r.paidPence)}`}`}
      </T>
      <View style={styles.wrap}>
        {OUTCOMES.filter((o) => o.status !== r.status).map((o) => (
          <Button key={o.status} label={o.label} variant="outline" size="md" disabled={busy} onPress={() => resolve(o)} style={styles.half} />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segments: { flexDirection: 'row', borderRadius: Radii.md, padding: 4, gap: 4 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Radii.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  half: { flexBasis: '48%', flexGrow: 1 },
});
