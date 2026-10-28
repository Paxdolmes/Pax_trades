import { router, type Href } from 'expo-router';
import { ChevronRight, CreditCard, FileText, HelpCircle, MapPin, Scale, ShieldCheck } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { SignInPrompt } from '@/components/sign-in-prompt';
import { SignOutButton } from '@/components/sign-out';
import { Avatar, Card, Divider, IconTile, Screen, T, type LucideIcon } from '@/components/ui';
import { Spacing, usePalette } from '@/constants/theme';
import { needsSignIn, useAuth } from '@/lib/auth';
import { DEMO_CUSTOMER } from '@/lib/demo';
import { saveCard } from '@/lib/payments';

async function changeCard() {
  try {
    if (await saveCard()) Alert.alert('Card saved', "We'll use this card for your next job.");
  } catch (e) {
    Alert.alert('Could not open the card form', e instanceof Error ? e.message : 'Please try again.');
  }
}

type Row = { icon: LucideIcon; label: string; detail: string; public?: boolean; href?: Href; onPress?: () => void };

const ROWS: Row[] = [
  { icon: MapPin, label: 'Saved addresses', detail: DEMO_CUSTOMER.postcode },
  { icon: CreditCard, label: 'Payment methods', detail: 'Add or change your card', onPress: changeCard },
  { icon: FileText, label: 'Certificates', detail: 'Gas safety records and EICRs, on each finished job', href: '/my-jobs' },
  { icon: ShieldCheck, label: 'How we vet pros', detail: 'ID, insurance, Gas Safe, NICEIC or NAPIT', public: true, href: '/safety' },
  { icon: HelpCircle, label: 'Help', detail: 'Common questions, or message the Relay team', public: true, href: '/help' },
  { icon: Scale, label: 'Terms and privacy', detail: 'How booking works and what we keep', public: true, href: '/terms' },
];

export default function Account() {
  const c = usePalette();
  const { profile, session, status } = useAuth();
  const guest = needsSignIn(status);
  const name = profile?.fullName ?? DEMO_CUSTOMER.name;
  return (
    <Screen>
      {guest ? (
        <>
          <T variant="display" accessibilityRole="header">
            Account
          </T>
          <SignInPrompt title="Welcome to Relay" body="Sign in to save your address and card, and keep your certificates in one place." />
        </>
      ) : (
      <View style={styles.header}>
        <Avatar name={name} size={56} />
        <View style={{ flex: 1 }}>
          <T variant="title1" accessibilityRole="header">
            {name}
          </T>
          <T variant="footnote" color="inkMuted">
            {session?.user.email ?? 'Fulham, London'}
          </T>
        </View>
      </View>
      )}
      <Card style={{ padding: 0 }}>
        {(guest ? ROWS.filter((r) => r.public) : ROWS).map((r, i) => (
          <View key={r.label}>
            {i > 0 ? <Divider inset={72} /> : null}
            <Pressable
              accessibilityRole={r.href || r.onPress ? 'button' : undefined}
              disabled={!r.href && !r.onPress}
              onPress={() => (r.href ? router.push(r.href) : r.onPress?.())}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surfaceMuted }]}>
              <IconTile icon={r.icon} tone="neutral" size={40} />
              <View style={{ flex: 1 }}>
                <T variant="subhead" style={{ fontWeight: '600' }}>
                  {r.label}
                </T>
                <T variant="footnote" color="inkMuted">
                  {r.detail}
                </T>
              </View>
              {r.href || r.onPress ? <ChevronRight size={18} color={c.inkSubtle} /> : null}
            </Pressable>
          </View>
        ))}
      </Card>
      <SignOutButton />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, padding: Spacing.four },
});
