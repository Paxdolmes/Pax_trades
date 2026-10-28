import { Stack } from 'expo-router';

export default function ProLayout() {
  return (
    <Stack>
      <Stack.Screen name="jobs" options={{ title: 'Pax Pro' }} />
      <Stack.Screen name="credentials" options={{ title: 'Your documents' }} />
    </Stack>
  );
}
