import { router, type Href } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { SignInPrompt } from '@/components/sign-in-prompt';
import { Card, IconButton, IconTile, Screen, T } from '@/components/ui';
import { Spacing, usePalette } from '@/constants/theme';
import { needsSignIn, useAuth } from '@/lib/auth';
import { dayAndTime, isLive, useLive } from '@/lib/live';
import { loadNotifications, markNotificationsRead, type AppNotification } from '@/lib/notifications';

const DEMO: AppNotification[] = [
  { id: 'demo-n1', title: 'Welcome to Relay', body: 'This is where updates about your jobs appear.', url: null, at: new Date().toISOString(), unread: true },
];

/** Everything we've told the person, newest first. Opening it marks them read. */
export default function Notifications() {
  const c = usePalette();
  const guest = needsSignIn(useAuth().status);
  const { data, error } = useLive(loadNotifications, isLive ? [] : DEMO);
  useEffect(() => {
    if (isLive && !guest) void markNotificationsRead();
  }, [guest]);

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} tone="muted" />
        <T variant="headline">Notifications</T>
        <View style={{ width: 44 }} />
      </View>
      {guest ? (
        <SignInPrompt icon={Bell} title="Updates about your jobs" body="Sign in and we'll tell you here when a pro accepts, is on the way, or sends a quote." />
      ) : null}
      {error && !guest ? (
        <T variant="callout" color="danger">
          {error}
        </T>
      ) : null}
      {data.length === 0 && !guest ? (
        <T variant="callout" color="inkMuted">
          Nothing yet. Updates about your jobs will appear here.
        </T>
      ) : null}
      {data.map((n) => (
        <Card
          key={n.id}
          accessibilityLabel={`${n.title}. ${n.body}`}
          onPress={n.url ? () => router.push(n.url as Href) : undefined}
          style={styles.row}>
          <IconTile icon={Bell} tone={n.unread ? 'brand' : 'neutral'} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="subhead" style={{ fontWeight: '600' }}>
              {n.title}
            </T>
            <T variant="footnote" color="inkMuted">
              {n.body}
            </T>
            <T variant="caption" color="inkSubtle" style={{ fontWeight: '500' }}>
              {dayAndTime(n.at)}
            </T>
          </View>
          {n.unread ? <View style={[styles.dot, { backgroundColor: c.brand }]} /> : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, padding: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
});
