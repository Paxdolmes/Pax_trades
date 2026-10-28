import { Stack } from 'expo-router';
import { View } from 'react-native';

import { isWeb, SiteHeader } from '@/components/site/frame';
import { usePalette } from '@/constants/theme';

// On the web the booking screens sit under the website's menu, in a column the
// width of a phone so the app layout still reads well on a laptop.
export default function CustomerLayout() {
  const c = usePalette();
  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="request" />
      <Stack.Screen name="quote" />
      <Stack.Screen name="quotes/[id]" />
      <Stack.Screen name="job/[id]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="report/[id]" />
      <Stack.Screen name="pro/[id]" />
    </Stack>
  );
  if (!isWeb) return stack;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SiteHeader />
      <View style={{ flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', paddingTop: 12 }}>{stack}</View>
    </View>
  );
}
