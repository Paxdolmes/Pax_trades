import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Body, Button, Card, Screen, Title } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { LAUNCH_OUTWARD_CODES, TRADES, type Trade } from '@/domain/catalog';
import { isInLaunchArea, outwardCode } from '@/domain/rules';

export default function CustomerHome() {
  const c = usePalette();
  const [postcode, setPostcode] = useState('');
  const [trade, setTrade] = useState<Trade | null>(null);

  const looksValid = outwardCode(postcode) !== null;
  const covered = looksValid && isInLaunchArea(postcode, LAUNCH_OUTWARD_CODES);

  return (
    <Screen>
      <Title>A vetted tradesperson at your door, fast</Title>
      <Body secondary>Plumbers, electricians and Gas Safe heating engineers in Fulham.</Body>

      <Body>Your postcode</Body>
      <TextInput
        value={postcode}
        onChangeText={setPostcode}
        placeholder="SW6 1AA"
        placeholderTextColor={c.textSecondary}
        autoCapitalize="characters"
        autoComplete="postal-code"
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
      />
      {looksValid && !covered && (
        <Body secondary>
          We&apos;re not in your area yet. We&apos;re starting in Fulham (SW6) and will let you know when we reach you.
        </Body>
      )}

      <Body>What do you need?</Body>
      {TRADES.map((t) => (
        <Card key={t.id} selected={trade === t.id} onPress={() => setTrade(t.id)}>
          <Body style={styles.cardTitle}>{t.label}</Body>
        </Card>
      ))}

      <Button
        label="Continue"
        disabled={!covered || !trade}
        onPress={() => router.push({ pathname: '/request', params: { trade: trade!, postcode } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 17 },
  cardTitle: { fontWeight: '600' },
});
