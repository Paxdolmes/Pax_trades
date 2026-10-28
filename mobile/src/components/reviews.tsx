import { BadgeCheck, Star } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Chip, T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import type { DemoReview } from '@/lib/demo';

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} color={n <= value ? c.ink : c.border} fill={n <= value ? c.ink : c.border} strokeWidth={1.5} />
      ))}
    </View>
  );
}

/** Tap-to-rate row of five stars. */
export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const c = usePalette();
  return (
    <View style={styles.input} accessibilityRole="radiogroup" accessibilityLabel="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          accessibilityRole="radio"
          accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
          accessibilityState={{ checked: value === n }}
          onPress={() => onChange(n)}
          hitSlop={4}>
          <Star size={36} color={n <= value ? c.brand : c.border} fill={n <= value ? c.brand : c.border} strokeWidth={1.5} />
        </Pressable>
      ))}
    </View>
  );
}

/** One verified review, with the pro's reply underneath if they've made one. */
export function ReviewCard({ review, proName, footer }: { review: DemoReview; proName: string; footer?: ReactNode }) {
  const c = usePalette();
  return (
    <Card style={{ gap: Spacing.two }}>
      <View style={styles.top}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Stars value={review.rating} />
          <Chip label="Verified job" icon={BadgeCheck} tone="success" />
        </View>
        <T variant="caption" color="inkSubtle">
          {review.when}
        </T>
      </View>
      {review.body ? <T variant="callout">{review.body}</T> : null}
      <T variant="footnote" color="inkMuted">
        {review.job ? `${review.customer} · ${review.job}` : review.customer}
      </T>
      {review.reply ? (
        <View style={[styles.reply, { backgroundColor: c.surfaceMuted, borderLeftColor: c.brand }]}>
          <T variant="caption" color="inkMuted" style={{ fontWeight: '600' }}>
            {`Reply from ${proName}`}
          </T>
          <T variant="footnote">{review.reply}</T>
        </View>
      ) : null}
      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.two },
  reply: { borderRadius: Radii.sm, borderLeftWidth: 3, padding: Spacing.three, gap: 2, marginTop: Spacing.one },
});
