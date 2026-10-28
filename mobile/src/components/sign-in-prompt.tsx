import { router } from 'expo-router';
import { LogIn, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, Card, IconTile, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';

/** Shown to guests on screens that are about their own account, e.g. My jobs. */
export function SignInPrompt({ icon = LogIn, title, body }: { icon?: LucideIcon; title: string; body: string }) {
  return (
    <Card style={{ gap: Spacing.four, padding: Spacing.five }}>
      <IconTile icon={icon} />
      <View style={{ gap: 6 }}>
        <T variant="title2">{title}</T>
        <T variant="callout" color="inkMuted">
          {body}
        </T>
      </View>
      <Button label="Sign in or create an account" onPress={() => router.push('/sign-in')} />
      <T variant="footnote" color="inkMuted" style={{ textAlign: 'center' }}>
        Just your email and a code. No password.
      </T>
    </Card>
  );
}
