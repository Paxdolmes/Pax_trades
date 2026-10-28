import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AuthProvider, needsSignIn, useAuth } from '@/lib/auth';

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
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={signIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!signIn}>
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(pro)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
