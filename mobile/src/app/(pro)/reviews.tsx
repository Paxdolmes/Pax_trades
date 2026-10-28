import { router } from 'expo-router';
import { ChevronLeft, Reply, Star } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { ReviewCard } from '@/components/reviews';
import { Button, Card, IconButton, Screen, T } from '@/components/ui';
import { Radii, Spacing, Type, usePalette } from '@/constants/theme';
import { ratingSummary } from '@/domain/rules';
import { DEMO_TRADER_REVIEWS, type DemoReview } from '@/lib/demo';
import { isLive, useLive } from '@/lib/live';
import { usePro } from '@/lib/pro';
import { loadMyReviews, replyToReview } from '@/lib/trust';

/** The pro's verified reviews. They can reply to each one, once. */
export default function Reviews() {
  const c = usePalette();
  const pro = usePro();
  const { data: loaded } = useLive(loadMyReviews, isLive ? [] : DEMO_TRADER_REVIEWS);
  // Replies sent from this screen, shown straight away.
  const [replies, setReplies] = useState<Record<string, string>>({});
  const reviews: DemoReview[] = loaded.map((r) => (replies[r.id] ? { ...r, reply: replies[r.id] } : r));
  const summary = ratingSummary(reviews.map((r) => r.rating));

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
        <T variant="headline">Your reviews</T>
      </View>

      <Card style={styles.summary}>
        <View style={styles.inline}>
          <Star size={28} color={c.ink} fill={c.ink} />
          <T variant="display">{summary.rating ? summary.rating.toFixed(1) : 'New'}</T>
        </View>
        <T variant="callout" color="inkMuted" style={{ flex: 1 }}>
          {`${summary.count} verified reviews. Customers see these on your profile when you're booked or when you quote.`}
        </T>
      </Card>

      <T variant="footnote" color="inkMuted">
        Only customers who paid for a finished job can review you. You can reply once to each review, and your reply is public.
      </T>

      {reviews.map((r) => (
        <ReviewCard
          key={r.id}
          review={r}
          proName={pro.firstName}
          footer={r.reply ? null : <ReplyBox reviewId={r.id} customer={r.customer} onSent={(reply) => setReplies((all) => ({ ...all, [r.id]: reply }))} />}
        />
      ))}
    </Screen>
  );
}

function ReplyBox({ reviewId, customer, onSent }: { reviewId: string; customer: string; onSent: (reply: string) => void }) {
  const c = usePalette();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  if (!open) return <Button label="Reply" icon={Reply} variant="ghost" size="md" onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start' }} />;

  async function send() {
    setSending(true);
    try {
      await replyToReview(reviewId, text.trim());
      onSent(text.trim());
    } catch (e) {
      Alert.alert('Could not post your reply', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={{ gap: Spacing.two, marginTop: Spacing.one }}>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        maxLength={1000}
        autoFocus
        placeholder={`Thank ${customer.split(' ')[0]}, or explain what happened`}
        placeholderTextColor={c.inkSubtle}
        accessibilityLabel={`Reply to ${customer}`}
        style={[Type.callout, styles.input, { backgroundColor: c.bg, color: c.ink }]}
      />
      <Button label="Post reply" size="md" disabled={!text.trim()} loading={sending} onPress={send} />
      <T variant="caption" color="inkSubtle">
        You can only reply once, so check it before posting.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  input: { minHeight: 80, borderRadius: Radii.md, padding: Spacing.three, textAlignVertical: 'top' },
});
