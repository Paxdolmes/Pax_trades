import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { usePalette } from '@/constants/theme';
import { needsSignIn, useAuth } from '@/lib/auth';
import { appVariant } from '@/lib/variant';

// The same bundle ships as two store apps; send each to its own flow, after sign-in.
export default function Index() {
  const c = usePalette();
  const { status, hasApplication, profile } = useAuth();
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.brand} />
      </View>
    );
  }
  if (needsSignIn(status)) return <Redirect href="/sign-in" />;
  if (profile?.role === 'admin' && appVariant === 'pro') return <Redirect href="/admin" />;
  if (appVariant === 'pro') return <Redirect href={hasApplication ? '/dashboard' : '/apply'} />;
  return <Redirect href="/home" />;
}
