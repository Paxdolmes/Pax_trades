import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors, useScheme } from '@/constants/theme';
import '@/lib/alert-polyfill';
import { AuthProvider, useAuth } from '@/lib/auth';
import { handlePushTaps, registerForPush } from '@/lib/push';

void SplashScreen.preventAutoHideAsync().catch(() => {});

const navThemes = {
  light: { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: Colors.light.brand, background: Colors.light.bg, card: Colors.light.surface, text: Colors.light.ink, border: Colors.light.border } },
  dark: { ...DarkTheme, colors: { ...DarkTheme.colors, primary: Colors.dark.brand, background: Colors.dark.bg, card: Colors.dark.surface, text: Colors.dark.ink, border: Colors.dark.border } },
};

export default function RootLayout() {
  const scheme = useScheme();
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const ready = fontsLoaded || Boolean(fontError);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={navThemes[scheme]}>
        <Routes />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </AuthProvider>
  );
}

// Guests can look around every public screen; actions that need an account open
// sign-in on top (useAccountGate), so they come back to where they were.
function Routes() {
  const { status } = useAuth();
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
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)" options={{ headerShown: false }} />
      <Stack.Screen name="(pro)" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
    </Stack>
  );
}
