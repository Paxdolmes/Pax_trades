import { ChevronRight, CreditCard, FileText, HelpCircle, MapPin, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Divider, IconTile, Screen, T, type LucideIcon } from '@/components/ui';
import { Spacing, usePalette } from '@/constants/theme';
import { DEMO_CUSTOMER } from '@/lib/demo';

const ROWS: { icon: LucideIcon; label: string; detail: string }[] = [
  { icon: MapPin, label: 'Saved addresses', detail: DEMO_CUSTOMER.postcode },
  { icon: CreditCard, label: 'Payment methods', detail: 'Add a card' },
  { icon: FileText, label: 'Certificates', detail: 'Gas safety records and EICRs' },
  { icon: ShieldCheck, label: 'How we vet pros', detail: 'Gas Safe, NICEIC or NAPIT, insurance, ID' },
  { icon: HelpCircle, label: 'Help', detail: 'Chat with the Relay team' },
];

export default function Account() {
  const c = usePalette();
  return (
    <Screen>
      <View style={styles.header}>
        <Avatar name={DEMO_CUSTOMER.name} size={56} />
        <View>
          <T variant="title1" accessibilityRole="header">
            {DEMO_CUSTOMER.name}
          </T>
          <T variant="footnote" color="inkMuted">
            Fulham, London
          </T>
        </View>
      </View>
      <Card style={{ padding: 0 }}>
        {ROWS.map((r, i) => (
          <View key={r.label}>
            {i > 0 ? <Divider inset={72} /> : null}
            <View style={styles.row}>
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
            </View>
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
