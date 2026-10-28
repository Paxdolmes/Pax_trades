import { LogOut } from 'lucide-react-native';
import { Alert } from 'react-native';

import { Button } from '@/components/ui';
import { signOut, useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

/** Account screens' sign-out. Hidden for guests and in demo mode, where nobody is signed in. */
export function SignOutButton() {
  const { session } = useAuth();
  if (!isSupabaseConfigured || !session) return null;
  const confirm = () => {
    Alert.alert('Sign out?', "You'll need a new code from your email to sign back in.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };
  return <Button label="Sign out" icon={LogOut} variant="outline" onPress={confirm} />;
}
