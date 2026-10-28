import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack>
      <Stack.Screen name="home" options={{ title: 'Pax' }} />
      <Stack.Screen name="request" options={{ title: 'Describe the job' }} />
      <Stack.Screen name="job/[id]" options={{ title: 'Your job' }} />
    </Stack>
  );
}
