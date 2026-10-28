import { Award, Banknote } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Card, Chip, Divider, Screen, SectionLabel, T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { FOUNDING_COMMISSION, formatPence, STANDARD_COMMISSION } from '@/domain/catalog';
import { splitPayment } from '@/domain/rules';
import { DEMO_COMPLETED, DEMO_TRADER, DEMO_WEEK } from '@/lib/demo';

const CHART_HEIGHT = 132;

export default function Earnings() {
  const c = usePalette();
  const [selected, setSelected] = useState(3);
  const rate = DEMO_TRADER.founding ? FOUNDING_COMMISSION : STANDARD_COMMISSION;
  const max = Math.max(...DEMO_WEEK.map((d) => d.pence));
  const weekTotal = DEMO_WEEK.reduce((s, d) => s + d.pence, 0);
  const weekJobs = DEMO_WEEK.reduce((s, d) => s + d.jobs, 0);
  const day = DEMO_WEEK[selected];

  return (
    <Screen>
      <T variant="title1" style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole="header">
        Earnings
      </T>

      <View style={[styles.payout, { backgroundColor: c.success }]}>
        <View style={styles.inline}>
          <Banknote size={16} color={c.onBrand} strokeWidth={2.5} />
          <T variant="overline" color="onBrand" style={{ opacity: 0.9 }}>
            NEXT PAYOUT
          </T>
        </View>
        <T variant="money" color="onBrand" style={{ fontVariant: ['tabular-nums'] }}>
          {formatPence(weekTotal)}
        </T>
        <T variant="bodyStrong" color="onBrand">
          Paid within 48 hours of each job
        </T>
        <T variant="caption" color="onBrand" style={{ opacity: 0.85, fontWeight: '500' }}>
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
          {DEMO_TRADER.founding ? <Chip label="Founding rate" icon={Award} tone="brand" /> : null}
        </View>
        <View accessibilityLabel="Earnings by day this week" style={styles.chart}>
          {DEMO_WEEK.map((d, i) => {
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
          {DEMO_COMPLETED.map((j, i) => {
            const { platformPence, proPence } = splitPayment(j.grossPence, rate);
            return (
              <View key={j.title}>
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
