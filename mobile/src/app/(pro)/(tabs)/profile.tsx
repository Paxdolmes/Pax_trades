import { router } from 'expo-router';
import { Award, ChevronRight, ClipboardCheck, HelpCircle, Landmark, MapPin, Star } from 'lucide-react-native';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Card, Chip, Divider, IconTile, Screen, T, type LucideIcon } from '@/components/ui';
import { Spacing, usePalette } from '@/constants/theme';
import { TRADES } from '@/domain/catalog';
import { ratingSummary } from '@/domain/rules';
import { DEMO_TRADER, DEMO_TRADER_REVIEWS } from '@/lib/demo';
import { bankSetupLink } from '@/lib/payments';

async function openBankSetup() {
  try {
    const url = await bankSetupLink();
    if (url) await Linking.openURL(url);
    else Alert.alert('Bank details', 'In the live app this opens Stripe, where you add the account your earnings are paid into.');
  } catch (e) {
    Alert.alert('Could not open bank setup', e instanceof Error ? e.message : 'Please try again.');
  }
}

export default function Profile() {
  const c = usePalette();
  const reviews = ratingSummary(DEMO_TRADER_REVIEWS.map((r) => r.rating));
  const rows: { icon: LucideIcon; label: string; detail: string; onPress?: () => void }[] = [
    {
      icon: Star,
      label: 'Reviews',
      detail: reviews.rating ? `${reviews.rating} from ${reviews.count} verified reviews` : 'No reviews yet',
      onPress: () => router.push('/reviews'),
    },
    { icon: MapPin, label: 'Work area', detail: 'Fulham, SW6 · up to 5 km' },
    { icon: Landmark, label: 'Bank details', detail: 'Payouts within 48 hours, through Stripe', onPress: openBankSetup },
    { icon: ClipboardCheck, label: 'Application', detail: 'See the sign-up steps', onPress: () => router.push('/apply') },
    { icon: HelpCircle, label: 'Help', detail: 'Chat with the Relay team' },
  ];
  return (
    <Screen>
      <View style={styles.header}>
        <Avatar name={DEMO_TRADER.name} size={56} />
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="title1" accessibilityRole="header">
            {DEMO_TRADER.name}
          </T>
          <T variant="footnote" color="inkMuted">
            {DEMO_TRADER.trades.map((t) => TRADES.find((x) => x.id === t)?.label).join(', ')}
          </T>
          {DEMO_TRADER.founding ? <Chip label="Founding Pro · 10% commission" icon={Award} tone="brand" /> : null}
        </View>
      </View>
      <Card style={{ padding: 0 }}>
        {rows.map((r, i) => (
          <View key={r.label}>
            {i > 0 ? <Divider inset={72} /> : null}
            <Pressable accessibilityRole="button" onPress={r.onPress} style={styles.row}>
              <IconTile icon={r.icon} tone="neutral" size={40} />
              <View style={{ flex: 1 }}>
                <T variant="subhead" style={{ fontWeight: '600' }}>
                  {r.label}
                </T>
                <T variant="footnote" color="inkMuted">
                  {r.detail}
                </T>
              </View>
              <ChevronRight size={18} color={c.inkSubtle} />
            </Pressable>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, padding: Spacing.four },
});
