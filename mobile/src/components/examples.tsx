// Small cards for the example pros and reviews in content/examples.ts, shared by
// the website and the Relay home screen.
import { BadgeCheck, Star } from 'lucide-react-native';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import type { ExamplePro, ExampleReview } from '@/content/examples';

/** "★ 4.9 (212)" */
export function Rating({ value, count }: { value: number; count?: number }) {
  const c = usePalette();
  return (
    <View style={styles.rating} accessibilityLabel={`Rated ${value.toFixed(1)} out of 5${count ? ` from ${count} reviews` : ''}`}>
      <Star size={14} color={c.urgent} fill={c.urgent} strokeWidth={1.5} />
      <T variant="footnote" style={{ fontWeight: '700' }}>
        {value.toFixed(1)}
      </T>
      {count ? (
        <T variant="footnote" color="inkMuted">
          {`(${count})`}
        </T>
      ) : null}
    </View>
  );
}

export function ProCard({ pro, style }: { pro: ExamplePro; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  return (
    <View style={[styles.pro, { backgroundColor: c.surface, borderColor: c.border }, style]}>
      <Image source={pro.photo} style={styles.proPhoto} accessibilityIgnoresInvertColors />
      <View style={{ gap: 2, alignItems: 'center' }}>
        <T variant="headline" numberOfLines={1}>
          {pro.name}
        </T>
        <T variant="footnote" color="inkMuted" numberOfLines={1}>
          {`${pro.trade} · ${pro.years} yrs`}
        </T>
      </View>
      <Rating value={pro.rating} count={pro.reviews} />
      <View style={[styles.check, { backgroundColor: c.accentTint }]}>
        <BadgeCheck size={13} color={c.accentStrong} strokeWidth={2.2} />
        <T variant="caption" color="accentStrong">
          {pro.check}
        </T>
      </View>
    </View>
  );
}

export function ReviewCard({ review, style }: { review: ExampleReview; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  return (
    <View style={[styles.review, { backgroundColor: c.surface, borderColor: c.border }, style]}>
      <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel={`${review.rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} size={15} color={n <= review.rating ? c.urgent : c.border} fill={n <= review.rating ? c.urgent : c.border} strokeWidth={1.5} />
        ))}
      </View>
      <T variant="callout" style={{ flexGrow: 1 }}>{`“${review.text}”`}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <Image source={review.photo} style={styles.reviewPhoto} accessibilityIgnoresInvertColors />
        <View>
          <T variant="subhead" style={{ fontWeight: '700' }}>
            {review.name}
          </T>
          <T variant="caption" color="inkMuted">
            {review.area}
          </T>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pro: { borderRadius: Radii.lg, borderWidth: 1, padding: Spacing.four, gap: Spacing.three, alignItems: 'center' },
  proPhoto: { width: 72, height: 72, borderRadius: 36 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  review: { borderRadius: Radii.lg, borderWidth: 1, padding: Spacing.five, gap: Spacing.four },
  reviewPhoto: { width: 40, height: 40, borderRadius: 20 },
});
