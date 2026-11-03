import { LogOut } from 'lucide-react-native';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/ui';
import { deleteAccount, signOut, useAuth } from '@/lib/auth';
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
  return (
    <>
      <Button label="Sign out" icon={LogOut} variant="outline" onPress={confirm} />
      <DeleteAccountButton />
    </>
  );
}

/** Deleting the account from the app, which Apple requires. Asks first; it can't be undone. */
function DeleteAccountButton() {
  const [deleting, setDeleting] = useState(false);
  const remove = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      Alert.alert('Account deleted', 'Your account and details have been deleted.');
    } catch (e) {
      Alert.alert('Could not delete your account', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };
  const confirm = () => {
    Alert.alert(
      'Delete your account?',
      "This deletes your account and your details, and can't be undone. Records of finished jobs and payments are kept, without your name, as the law requires.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => void remove() },
      ],
    );
  };
  return <Button label="Delete account" variant="ghost" size="md" loading={deleting} onPress={confirm} />;
}
