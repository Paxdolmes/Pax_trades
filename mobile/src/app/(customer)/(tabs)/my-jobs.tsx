import { router } from 'expo-router';
import { ChevronRight, Flame, Wrench, Zap } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Chip, IconTile, Screen, SectionLabel, T, type LucideIcon, type Tone } from '@/components/ui';
import { Spacing, usePalette } from '@/constants/theme';
import { formatPence } from '@/domain/catalog';

type JobRow = {
  title: string;
  meta: string;
  icon: LucideIcon;
  chip: { label: string; tone: Tone };
  pro?: string;
  pence?: number;
  open?: { jobType: string; status: string; extra?: string };
};

// Demo history until jobs are read from Supabase.
const SECTIONS: { title: string; jobs: JobRow[] }[] = [
  {
    title: 'Upcoming',
    jobs: [
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
      { title: 'Leaking kitchen tap', meta: '14 Sep · Tomasz Nowak', icon: Wrench, chip: { label: 'Paid', tone: 'success' }, pro: 'Tomasz Nowak', pence: 9500 },
      { title: 'Lights tripping the fuse box', meta: '2 Aug · Priya Shah', icon: Zap, chip: { label: 'Paid', tone: 'success' }, pro: 'Priya Shah', pence: 13500 },
      { title: 'Landlord gas safety (CP12)', meta: '19 Jun · Cancelled by you', icon: Flame, chip: { label: 'Cancelled', tone: 'neutral' } },
    ],
  },
];

export default function MyJobs() {
  const c = usePalette();
  return (
    <Screen>
      <T variant="display" accessibilityRole="header">
        My jobs
      </T>
      {SECTIONS.map((s) => (
        <View key={s.title} style={{ gap: Spacing.three }}>
          <SectionLabel>{s.title}</SectionLabel>
          {s.jobs.map((j) => (
            <Card
              key={j.title}
              accessibilityLabel={`${j.title}, ${j.chip.label}, ${j.meta}`}
              onPress={j.open ? () => router.push({ pathname: '/job/[id]', params: { id: 'demo-history', ...j.open } }) : undefined}
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
