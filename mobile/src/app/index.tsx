import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { usePalette } from '@/constants/theme';
import { mustFinishSignIn, needsSignIn, useAuth } from '@/lib/auth';
import { appVariant } from '@/lib/variant';

// The same bundle ships as two store apps; send each to its own flow. Guests look
// around first: customers start on home, tradespeople on the application page.
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
  if (mustFinishSignIn(status)) return <Redirect href="/sign-in" />;
  if (needsSignIn(status)) return <Redirect href={appVariant === 'pro' ? '/apply' : '/home'} />;
  if (profile?.role === 'admin' && appVariant === 'pro') return <Redirect href="/admin" />;
  if (appVariant === 'pro') return <Redirect href={hasApplication ? '/dashboard' : '/apply'} />;
  return <Redirect href="/home" />;
}
