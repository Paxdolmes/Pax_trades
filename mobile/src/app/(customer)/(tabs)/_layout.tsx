import { Tabs } from 'expo-router/js-tabs';
import { ClipboardList, House, UserRound } from 'lucide-react-native';

import { isWeb } from '@/components/site/frame';
import { makeTabBar } from '@/components/tab-bar';

const TabBar = makeTabBar([
  { name: 'home', label: 'Home', icon: House },
  { name: 'my-jobs', label: 'My jobs', icon: ClipboardList },
  { name: 'account', label: 'Account', icon: UserRound },
]);

// On the web the website's menu at the top replaces the tab bar.
export default function CustomerTabs() {
  return (
    <Tabs tabBar={(props) => (isWeb ? null : <TabBar {...props} />)} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="my-jobs" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
