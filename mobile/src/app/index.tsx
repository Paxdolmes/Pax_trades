import { Redirect } from 'expo-router';

import { appVariant } from '@/lib/variant';

// The same bundle ships as two store apps; send each to its own flow.
export default function Index() {
  return <Redirect href={appVariant === 'pro' ? '/dashboard' : '/home'} />;
}
