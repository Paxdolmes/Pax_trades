import { Stack } from 'expo-router';
import { View } from 'react-native';

import { isWeb, SiteHeader } from '@/components/site/frame';
import { usePalette } from '@/constants/theme';

// Landlords and letting agents. On the web the dashboard sits under the website's
// menu at full width, since agents mostly use a laptop.
export default function ManagerLayout() {
  const c = usePalette();
  const stack = <Stack screenOptions={{ headerShown: false }} />;
  if (!isWeb) return stack;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SiteHeader />
      <View style={{ flex: 1 }}>{stack}</View>
    </View>
  );
}
