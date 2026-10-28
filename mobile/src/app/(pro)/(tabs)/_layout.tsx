import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Briefcase, FileCheck, House, PoundSterling, UserRound } from 'lucide-react-native';

import { makeTabBar } from '@/components/tab-bar';
import { credentialStatus } from '@/domain/rules';
import { needsSignIn, useAuth } from '@/lib/auth';
import { useOnlineHeartbeat, usePro } from '@/lib/pro';

const tabs = (documentsBadge: boolean) => [
  { name: 'dashboard', label: 'Home', icon: House },
  { name: 'jobs', label: 'Jobs', icon: Briefcase },
  { name: 'earnings', label: 'Earnings', icon: PoundSterling },
  { name: 'documents', label: 'Documents', icon: FileCheck, badge: documentsBadge },
  { name: 'profile', label: 'Account', icon: UserRound },
];

const WithBadge = makeTabBar(tabs(true));
const WithoutBadge = makeTabBar(tabs(false));

export default function ProTabs() {
  const today = new Date().toISOString().slice(0, 10);
  const { credentials } = usePro();
  useOnlineHeartbeat();
  const TabBar = credentials.some((c) => credentialStatus(c, today) !== 'verified') ? WithBadge : WithoutBadge;
  // Guests see what Relay Traders offers on the application page; the work screens need an account.
  if (needsSignIn(useAuth().status)) return <Redirect href="/apply" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="jobs" />
      <Tabs.Screen name="earnings" />
      <Tabs.Screen name="documents" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
