import { Tabs } from 'expo-router/js-tabs';
import { ClipboardList, House, UserRound } from 'lucide-react-native';

import { makeTabBar } from '@/components/tab-bar';

const TabBar = makeTabBar([
  { name: 'home', label: 'Home', icon: House },
  { name: 'my-jobs', label: 'My jobs', icon: ClipboardList },
  { name: 'account', label: 'Account', icon: UserRound },
]);

export default function CustomerTabs() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="my-jobs" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
