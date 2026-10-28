import { Award, Banknote } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Card, Chip, Divider, Screen, SectionLabel, T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { findJobType, FOUNDING_COMMISSION, formatPence, STANDARD_COMMISSION } from '@/domain/catalog';
import { splitPayment } from '@/domain/rules';
import { DEMO_COMPLETED, DEMO_WEEK } from '@/lib/demo';
import { isLive, shortDate, type ProJob } from '@/lib/live';
import { usePro, useProJobs } from '@/lib/pro';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Day = { day: string; pence: number; jobs: number };
type Done = { title: string; customer: string; place: string; grossPence: number; proPence?: number };

/** This week, Monday to Sunday, from the jobs confirmed in it. */
function weekOf(jobs: ProJob[], now = new Date()): Day[] {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)).getTime();
  const week = DAYS.map((day) => ({ day, pence: 0, jobs: 0 }));
  for (const j of jobs) {
    if (!j.confirmedAt || j.payoutPence === null) continue;
    const i = Math.floor((Date.parse(j.confirmedAt) - monday) / 86_400_000);
    if (i < 0 || i > 6) continue;
    week[i].pence += j.payoutPence;
    week[i].jobs += 1;
  }
  return week;
}

function completedOf(jobs: ProJob[]): Done[] {
  return jobs
    .filter((j) => j.confirmedAt && j.finalPricePence !== null)
    .slice(0, 20)
    .map((j) => ({
      title: findJobType(j.jobTypeId)?.label ?? 'Job',
      customer: j.customerName,
      place: `${j.postcode.split(' ')[0]} · ${shortDate(j.confirmedAt!)}${j.paidAt ? '' : ' · paying soon'}`,
      grossPence: j.finalPricePence!,
      proPence: j.payoutPence ?? undefined,
    }));
}

const CHART_HEIGHT = 132;

export default function Earnings() {
  const c = usePalette();
  const pro = usePro();
  const { jobs } = useProJobs();
  const week: Day[] = isLive ? weekOf(jobs) : DEMO_WEEK;
  const completed: Done[] = isLive ? completedOf(jobs) : DEMO_COMPLETED;
  const [selected, setSelected] = useState(isLive ? (new Date().getDay() + 6) % 7 : 3);
  const rate = pro.founding ? FOUNDING_COMMISSION : STANDARD_COMMISSION;
  const max = Math.max(1, ...week.map((d) => d.pence));
  const weekTotal = week.reduce((s, d) => s + d.pence, 0);
  const weekJobs = week.reduce((s, d) => s + d.jobs, 0);
  const day = week[selected];

  return (
    <Screen>
      <T variant="title1" style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole="header">
        Earnings
      </T>

      <View style={[styles.payout, { backgroundColor: c.success }]}>
        <View style={styles.inline}>
          <Banknote size={16} color={c.onSuccess} strokeWidth={2.5} />
          <T variant="overline" color="onSuccess" style={{ opacity: 0.9 }}>
            NEXT PAYOUT
          </T>
        </View>
        <T variant="money" color="onSuccess" style={{ fontVariant: ['tabular-nums'] }}>
          {formatPence(weekTotal)}
        </T>
        <T variant="bodyStrong" color="onSuccess">
          Paid within 48 hours of each job
        </T>
        <T variant="caption" color="onSuccess" style={{ opacity: 0.85, fontWeight: '500' }}>
          {`${weekJobs} jobs this week · after ${Math.round(rate * 100)}% commission`}
        </T>
      </View>

      <Card style={{ gap: Spacing.three }}>
        <View style={styles.chartHead}>
          <View>
            <T variant="caption" color="inkMuted" style={{ fontWeight: '500' }}>
              {`${day.day} · ${day.jobs} ${day.jobs === 1 ? 'job' : 'jobs'}`}
            </T>
            <T variant="title2" style={{ fontVariant: ['tabular-nums'], fontWeight: '700' }}>
              {formatPence(day.pence)}
            </T>
          </View>
          {pro.founding ? <Chip label="Founding rate" icon={Award} tone="brand" /> : null}
        </View>
        <View accessibilityLabel="Earnings by day this week" style={styles.chart}>
          {week.map((d, i) => {
            const on = i === selected;
            return (
              <Pressable
                key={d.day}
                accessibilityRole="button"
                accessibilityLabel={`${d.day}: ${formatPence(d.pence)}`}
                accessibilityState={{ selected: on }}
                onPress={() => setSelected(i)}
                style={styles.barSlot}>
                <View
                  style={{
                    width: '100%',
                    height: Math.max(8, Math.round((d.pence / max) * CHART_HEIGHT)),
                    borderRadius: Radii.xs,
                    backgroundColor: on ? c.success : c.successTint,
                  }}
                />
                <T variant="caption" color={on ? 'ink' : 'inkMuted'} style={{ fontSize: 12, fontWeight: on ? '700' : '500' }}>
                  {d.day}
                </T>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={{ gap: Spacing.three }}>
        <SectionLabel>Completed jobs</SectionLabel>
        <Card style={{ padding: 0 }}>
          {completed.length === 0 ? (
            <T variant="callout" color="inkMuted" style={{ padding: Spacing.four }}>
              Jobs show here once the customer confirms them.
            </T>
          ) : null}
          {completed.map((j, i) => {
            const split = splitPayment(j.grossPence, rate);
            // Live payouts include tips, so the fee is what's left of the price.
            const proPence = j.proPence ?? split.proPence;
            const platformPence = j.proPence === undefined ? split.platformPence : Math.max(0, j.grossPence - j.proPence);
            return (
              <View key={`${j.title}-${i}`}>
                {i > 0 ? <Divider inset={72} /> : null}
                <View style={styles.jobRow}>
                  <Avatar name={j.customer} size={44} tone="neutral" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="bodyStrong" numberOfLines={1}>
                      {j.title}
                    </T>
                    <T variant="caption" color="inkMuted" style={{ fontWeight: '500', fontVariant: ['tabular-nums'] }}>
                      {`${j.place} · ${formatPence(j.grossPence)} − ${formatPence(platformPence)} fee`}
                    </T>
                  </View>
                  <T variant="headline" color="success" style={{ fontVariant: ['tabular-nums'] }}>
                    {formatPence(proPence)}
                  </T>
                </View>
              </View>
            );
          })}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  payout: { borderRadius: Radii.lg, padding: Spacing.four, gap: 4 },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, height: CHART_HEIGHT + 24 },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: CHART_HEIGHT + 24 },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, minHeight: 72 },
});
