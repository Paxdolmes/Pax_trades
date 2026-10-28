import { LogOut } from 'lucide-react-native';
import { Alert, Platform } from 'react-native';

import { Button } from '@/components/ui';
import { signOut } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

/** Account screens' sign-out. Hidden in demo mode, where nobody is signed in. */
export function SignOutButton() {
  if (!isSupabaseConfigured) return null;
  const confirm = () => {
    // Alert buttons don't show on web.
    if (Platform.OS === 'web') return void signOut();
    Alert.alert('Sign out?', "You'll need a new code from your email to sign back in.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };
  return <Button label="Sign out" icon={LogOut} variant="outline" onPress={confirm} />;
}
