import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, needsSignIn, useAuth } from '@/lib/auth';
import { handlePushTaps, registerForPush } from '@/lib/push';

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <AuthProvider>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Routes />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

// Signed-out people only reach the sign-in screen. Demo mode has no sign-in.
function Routes() {
  const { status } = useAuth();
  const signIn = needsSignIn(status);
  const ready = status === 'ready';

  // Once signed in, this phone gets the account's notifications, and tapping one opens its screen.
  useEffect(() => {
    if (!ready) return;
    void registerForPush().catch(() => {});
    return handlePushTaps();
  }, [ready]);
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={signIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!signIn}>
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(pro)" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
