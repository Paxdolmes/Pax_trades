import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, ChevronLeft, Sparkles, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ReviewCard } from '@/components/reviews';
import { Avatar, Card, Chip, IconButton, Screen, SectionLabel, T } from '@/components/ui';
import { Spacing, usePalette } from '@/constants/theme';
import { TRADES } from '@/domain/catalog';
import { CREDENTIAL_LABELS } from '@/lib/demo';
import { loadProProfile, type ProProfile } from '@/lib/trust';

/** What a customer can see about their pro: verified reviews and checked documents. */
export default function ProProfileScreen() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pro, setPro] = useState<ProProfile | null>(null);

  useEffect(() => {
    loadProProfile(id).then(setPro, () => setPro(null));
  }, [id]);

  if (!pro) return <Screen>{null}</Screen>;
  const joined = pro.trades.map((t) => TRADES.find((x) => x.id === t)?.pro ?? t).join(' and ');
  const trades = joined.charAt(0).toUpperCase() + joined.slice(1);

  return (
    <Screen>
      <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />

      <View style={{ alignItems: 'center', gap: Spacing.two }}>
        <Avatar name={pro.name} size={88} />
        <T variant="title1" accessibilityRole="header">
          {pro.name}
        </T>
        <T variant="callout" color="inkMuted">
          {trades}
        </T>
        {pro.founding ? (
          <View style={{ alignSelf: 'center' }}>
            <Chip label="Founding pro" icon={Sparkles} tone="brand" />
          </View>
        ) : null}
        {pro.approvedOn ? (
          <T variant="footnote" color="inkSubtle">
            {`On Relay since ${pro.approvedOn}`}
          </T>
        ) : null}
      </View>

      <Card style={styles.stats}>
        <Stat value={pro.rating ? pro.rating.toFixed(1) : 'New'} label="Rating" star={!!pro.rating} />
        <View style={[styles.rule, { backgroundColor: c.border }]} />
        <Stat value={String(pro.completedJobs)} label="Jobs on Relay" />
        <View style={[styles.rule, { backgroundColor: c.border }]} />
        <Stat value={String(pro.reviewCount)} label="Reviews" />
      </Card>

      <View style={{ gap: Spacing.three }}>
        <SectionLabel>Checked by Relay</SectionLabel>
        <View style={styles.badges}>
          <Chip label="ID checked" icon={BadgeCheck} tone="success" />
          {pro.checks.map((ch) => (
            <Chip key={ch.type} label={`${CREDENTIAL_LABELS[ch.type]} · checked ${ch.checkedOn}`} icon={BadgeCheck} tone="success" />
          ))}
        </View>
        <T variant="footnote" color="inkMuted">
          We check each document against the official register or insurer, and stop sending jobs the day one expires.
        </T>
      </View>

      <View style={{ gap: Spacing.three }}>
        <SectionLabel>Verified reviews</SectionLabel>
        <T variant="footnote" color="inkMuted" style={{ marginTop: -4 }}>
          Only customers who booked and paid through Relay can leave a review.
        </T>
        {pro.reviews.length ? (
          pro.reviews.map((r) => <ReviewCard key={r.id} review={r} proName={pro.name.split(' ')[0]} />)
        ) : (
          <T variant="callout" color="inkMuted">
            No reviews yet.
          </T>
        )}
      </View>
    </Screen>
  );
}

function Stat({ value, label, star }: { value: string; label: string; star?: boolean }) {
  const c = usePalette();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {star ? <Star size={16} color={c.ink} fill={c.ink} /> : null}
        <T variant="title2" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </T>
      </View>
      <T variant="caption" color="inkMuted">
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.four },
  rule: { width: 1, alignSelf: 'stretch' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
