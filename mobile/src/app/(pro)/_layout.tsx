import { Stack } from 'expo-router';

export default function ProLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="offer/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="trip/[id]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="quote-reply/[id]" />
      <Stack.Screen name="apply" />
      <Stack.Screen name="pro-chat/[id]" />
      <Stack.Screen name="reviews" />
      <Stack.Screen name="add-document" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}
