import { Tabs } from 'expo-router/js-tabs';
import { Briefcase, FileCheck, House, PoundSterling, UserRound } from 'lucide-react-native';

import { makeTabBar } from '@/components/tab-bar';
import { DEMO_PRO_CREDENTIALS } from '@/lib/demo';
import { credentialStatus } from '@/domain/rules';

const today = new Date().toISOString().slice(0, 10);
const documentsNeedAttention = DEMO_PRO_CREDENTIALS.some((c) => credentialStatus(c, today) !== 'verified');

const TabBar = makeTabBar([
  { name: 'dashboard', label: 'Home', icon: House },
  { name: 'jobs', label: 'Jobs', icon: Briefcase },
  { name: 'earnings', label: 'Earnings', icon: PoundSterling },
  { name: 'documents', label: 'Documents', icon: FileCheck, badge: documentsNeedAttention },
  { name: 'profile', label: 'Account', icon: UserRound },
]);

export default function ProTabs() {
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
