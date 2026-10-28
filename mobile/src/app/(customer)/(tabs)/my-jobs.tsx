import { router } from 'expo-router';
import { ChevronRight, ClipboardPen, Flame, Wrench, Zap } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { SignInPrompt } from '@/components/sign-in-prompt';
import { TRADE_ICONS } from '@/components/trade-icons';
import { Avatar, Card, Chip, IconTile, Screen, SectionLabel, T, type LucideIcon, type Tone } from '@/components/ui';
import { Spacing, usePalette } from '@/constants/theme';
import { findJobType, formatPence } from '@/domain/catalog';
import { needsSignIn, useAuth } from '@/lib/auth';
import { STATUS_LABELS } from '@/lib/jobs';
import {
  dayAndTime,
  isLive,
  loadCustomerJobs,
  loadCustomerQuoteRequests,
  shortDate,
  useLive,
  type CustomerJob,
  type CustomerQuoteRequest,
} from '@/lib/live';

type JobRow = {
  key?: string;
  title: string;
  meta: string;
  icon: LucideIcon;
  chip: { label: string; tone: Tone };
  pro?: string;
  pence?: number;
  open?: { jobType: string; status: string; extra?: string };
  quotes?: { count: number; description: string };
  /** Live rows open the real job or request. */
  href?: { pathname: '/job/[id]' | '/quotes/[id]'; params: { id: string } };
};


function jobRow(j: CustomerJob): JobRow {
  const type = findJobType(j.jobTypeId);
  const waiting = j.status === 'on_site' && j.finishedAt && !j.confirmedAt;
  const chip: JobRow['chip'] = waiting
    ? { label: 'Needs your OK', tone: 'urgent' }
    : j.status === 'completed'
      ? { label: j.paidAt ? 'Paid' : 'Done', tone: 'success' }
      : j.status === 'cancelled'
        ? { label: 'Cancelled', tone: 'neutral' }
        : { label: STATUS_LABELS[j.status], tone: 'brand' };
  const when = j.confirmedAt ? shortDate(j.confirmedAt) : j.scheduledFor ? dayAndTime(j.scheduledFor) : dayAndTime(j.createdAt);
  return {
    key: j.jobId,
    title: type?.label ?? 'Job',
    meta: j.pro ? `${when} · ${j.pro.name}` : when,
    icon: type ? TRADE_ICONS[type.trade] : Wrench,
    chip,
    pro: j.pro?.name,
    pence: j.finalPricePence !== null ? j.finalPricePence + j.tipPence : undefined,
    href: { pathname: '/job/[id]', params: { id: j.jobId } },
  };
}

function requestRow(r: CustomerQuoteRequest): JobRow {
  return {
    key: r.id,
    title: r.description.length > 48 ? `${r.description.slice(0, 47)}…` : r.description,
    meta: `Asked ${dayAndTime(r.createdAt)}`,
    icon: ClipboardPen,
    chip: { label: r.quotes === 1 ? '1 quote' : `${r.quotes} quotes`, tone: 'brand' },
    href: { pathname: '/quotes/[id]', params: { id: r.id } },
  };
}

function liveSections(jobs: CustomerJob[], requests: CustomerQuoteRequest[]): { title: string; jobs: JobRow[] }[] {
  const done = (j: CustomerJob) => j.status === 'completed' || j.status === 'cancelled';
  return [
    { title: 'Upcoming', jobs: [...requests.filter((r) => r.status === 'open').map(requestRow), ...jobs.filter((j) => !done(j)).map(jobRow)] },
    { title: 'Past', jobs: jobs.filter(done).map(jobRow) },
  ];
}

// Demo history until jobs are read from Supabase.
const SECTIONS: { title: string; jobs: JobRow[] }[] = [
  {
    title: 'Upcoming',
    jobs: [
      {
        title: 'Move a radiator, add a towel rail',
        meta: 'Asked today',
        icon: ClipboardPen,
        chip: { label: '3 quotes', tone: 'brand' },
        quotes: { count: 3, description: 'Move a radiator to the other wall in the bathroom and fit a towel rail in its place.' },
      },
      {
        title: 'No heating or hot water',
        meta: 'Today · James Carter',
        icon: Flame,
        chip: { label: 'Needs your OK', tone: 'urgent' },
        pro: 'James Carter',
        open: { jobType: 'no-heating', status: 'on_site', extra: 'asked' },
      },
      { title: 'Boiler service plus CP12', meta: 'Thu 6 Nov · 8 to 10am', icon: Flame, chip: { label: 'Booked', tone: 'brand' }, pence: 14900 },
    ],
  },
  {
    title: 'Past',
    jobs: [
      {
        title: 'Blocked toilet',
        meta: '24 Oct · Guaranteed to 23 Nov',
        icon: Wrench,
        chip: { label: 'Paid', tone: 'success' },
        pro: 'James Carter',
        pence: 9500,
        open: { jobType: 'blocked-toilet', status: 'completed' },
      },
      { title: 'Leaking kitchen tap', meta: '14 Sep · Tomasz Nowak', icon: Wrench, chip: { label: 'Paid', tone: 'success' }, pro: 'Tomasz Nowak', pence: 9500 },
      { title: 'Lights tripping the fuse box', meta: '2 Aug · Priya Shah', icon: Zap, chip: { label: 'Paid', tone: 'success' }, pro: 'Priya Shah', pence: 13500 },
      { title: 'Landlord gas safety (CP12)', meta: '19 Jun · Cancelled by you', icon: Flame, chip: { label: 'Cancelled', tone: 'neutral' } },
    ],
  },
];

export default function MyJobs() {
  const c = usePalette();
  const { status } = useAuth();
  const { data: jobs } = useLive(() => loadCustomerJobs(), [] as CustomerJob[]);
  const { data: requests } = useLive(loadCustomerQuoteRequests, [] as CustomerQuoteRequest[]);
  const sections = isLive ? liveSections(jobs, requests) : SECTIONS;
  const empty = sections.every((s) => s.jobs.length === 0);
  if (needsSignIn(status)) {
    return (
      <Screen>
        <T variant="display" accessibilityRole="header">
          My jobs
        </T>
        <SignInPrompt
          icon={ClipboardPen}
          title="Your jobs live here"
          body="Sign in to follow your pro on the way, chat with them, confirm the work and see your receipts and certificates."
        />
      </Screen>
    );
  }
  return (
    <Screen>
      <T variant="display" accessibilityRole="header">
        My jobs
      </T>
      {empty ? (
        <T variant="callout" color="inkMuted">
          Your jobs will show here once you book one.
        </T>
      ) : null}
      {sections.map((s) => (s.jobs.length === 0 ? null :
        <View key={s.title} style={{ gap: Spacing.three }}>
          <SectionLabel>{s.title}</SectionLabel>
          {s.jobs.map((j) => (
            <Card
              key={j.key ?? j.title}
              accessibilityLabel={`${j.title}, ${j.chip.label}, ${j.meta}`}
              onPress={
                j.href
                  ? () => router.push(j.href!)
                  : j.open
                  ? () => router.push({ pathname: '/job/[id]', params: { id: 'demo-history', ...j.open } })
                  : j.quotes
                    ? () =>
                        router.push({
                          pathname: '/quotes/[id]',
                          params: { id: 'demo-history', freeze: String(j.quotes!.count), description: j.quotes!.description },
                        })
                    : undefined
              }
              style={styles.row}>
              <View>
                <IconTile icon={j.icon} tone={j.chip.tone === 'neutral' ? 'neutral' : 'brand'} />
                {j.pro ? (
                  <View style={styles.badge}>
                    <Avatar name={j.pro} size={24} ring />
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <T variant="subhead" style={{ fontWeight: '600' }} numberOfLines={1}>
                  {j.title}
                </T>
                <View style={styles.meta}>
                  <Chip label={j.chip.label} tone={j.chip.tone} />
                  <T variant="footnote" color="inkMuted" numberOfLines={1} style={{ flex: 1 }}>
                    {j.meta}
                  </T>
                </View>
              </View>
              {j.pence ? <T variant="subhead">{formatPence(j.pence)}</T> : null}
              <ChevronRight size={18} color={c.inkSubtle} />
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: 14 },
  badge: { position: 'absolute', right: -6, bottom: -6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
