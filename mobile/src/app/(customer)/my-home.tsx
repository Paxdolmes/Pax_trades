import { router } from 'expo-router';
import { Building2, ChevronLeft, House, KeyRound, Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { SignInPrompt } from '@/components/sign-in-prompt';
import { Button, Card, IconButton, IconTile, Note, Screen, T } from '@/components/ui';
import { Radii, Spacing, Type, usePalette } from '@/constants/theme';
import { needsSignIn, useAuth } from '@/lib/auth';
import { useLive } from '@/lib/live';
import { joinProperty, leaveProperty, loadMyProperty, type MyProperty } from '@/lib/properties';
import { isSupabaseConfigured } from '@/lib/supabase';

/** Tenants: join the home their landlord or agent added, with the code they were given. */
export default function MyHome() {
  const c = usePalette();
  const { status } = useAuth();
  const guest = needsSignIn(status);
  const { data: loaded, reload } = useLive(loadMyProperty, null);
  const [joined, setJoined] = useState<MyProperty | null | undefined>(undefined);
  const home = joined === undefined ? loaded : joined;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function join() {
    if (!isSupabaseConfigured) {
      Alert.alert('Demo mode', 'Joining a property needs a Relay account.');
      return;
    }
    setBusy(true);
    try {
      setJoined(await joinProperty(code));
      setCode('');
    } catch (e) {
      Alert.alert('Could not join', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function leave() {
    Alert.alert('Leave this property?', 'Repairs you report will no longer go to your landlord. You can join again with the code.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () =>
          void leaveProperty().then(
            () => (setJoined(null), void reload()),
            (e: unknown) => Alert.alert('Could not leave', e instanceof Error ? e.message : 'Please try again.'),
          ),
      },
    ]);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/account'))} />
        <T variant="headline">Your landlord or agent</T>
      </View>

      {guest ? (
        <SignInPrompt icon={House} title="Renting your home?" body="Sign in, then enter the code from your landlord or letting agent. Repairs you report go to them to approve, and they pay the bill." />
      ) : home ? (
        <>
          <Card style={{ gap: Spacing.four }}>
            <View style={styles.row}>
              <IconTile icon={House} size={48} />
              <View style={{ flex: 1 }}>
                <T variant="title2">{home.name}</T>
                <T variant="footnote" color="inkMuted">
                  {`${home.postcode} · Managed by ${home.managerName}`}
                </T>
              </View>
            </View>
            <View style={{ gap: Spacing.two }}>
              <Note icon={Building2}>{`Repairs you report go to ${home.managerName} to approve. They pay the bill, so there's nothing for you to pay.`}</Note>
              <Note icon={Wrench}>
                {home.autoApproveUrgent
                  ? 'Emergencies, like a leak or no heating, go straight to a pro without waiting.'
                  : `Emergencies wait for ${home.managerName}'s OK too, so call them if it can't wait.`}
              </Note>
            </View>
          </Card>
          <Button label="Report a repair" icon={Wrench} onPress={() => router.push('/home')} />
          <Button label="I've moved out" variant="ghost" onPress={leave} />
        </>
      ) : (
        <>
          <View style={{ gap: Spacing.two }}>
            <T variant="title1" accessibilityRole="header">
              Join your home
            </T>
            <T variant="callout" color="inkMuted">
              If your landlord or letting agent uses Relay, they’ll have given you a six-character code. Once you join, repairs you report go to them to approve, and they pay.
            </T>
          </View>
          <Card style={{ gap: Spacing.four }}>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              placeholder="e.g. K7R M4P"
              placeholderTextColor={c.inkSubtle}
              accessibilityLabel="Code from your landlord"
              style={[Type.title2, styles.code, { backgroundColor: c.bg, color: c.ink, borderColor: c.border }]}
            />
            <Button label="Join" icon={KeyRound} loading={busy} disabled={code.replace(/\W/g, '').length < 6} onPress={join} />
          </Card>
          <Note icon={Building2}>No code? Ask your landlord or agent to add your home at relay-trade.co.uk/landlords. It’s free for them to set up.</Note>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  code: { borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.four, height: 56, letterSpacing: 4, textAlign: 'center' },
});
