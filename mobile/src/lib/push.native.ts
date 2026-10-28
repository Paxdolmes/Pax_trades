// Push notifications on phones. The database sends them through Expo's push
// service (see notify() in 20261028160000_live_push_admin.sql); this registers the
// phone and opens the right screen when one is tapped.

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Show notifications that arrive while the app is open, too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let current: string | null = null;

/** Asks permission once, then saves this phone's token against the signed-in account. */
export async function registerForPush(): Promise<void> {
  if (!Device.isDevice) return; // simulators can't receive pushes
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Jobs and messages',
      importance: AndroidImportance.MAX,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  const status = existing.granted ? 'granted' : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc('save_push_token', { p_token: token });
  if (!error) current = token;
}

/** Stops this phone getting the account's notifications. Call before signing out. */
export async function unregisterForPush(): Promise<void> {
  if (!current) return;
  await supabase.rpc('forget_push_token', { p_token: current });
  current = null;
}

/** Opens the screen a notification points at, when it's tapped. Returns an unsubscribe function. */
export function handlePushTaps(): () => void {
  const open = (response: Notifications.NotificationResponse | null) => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
  };
  void Notifications.getLastNotificationResponseAsync().then(open);
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
