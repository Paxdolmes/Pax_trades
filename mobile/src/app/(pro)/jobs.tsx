import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Body, Button, Card, Screen, Title } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { findJobType } from '@/domain/catalog';
import { missingCredentials } from '@/domain/rules';
import { CREDENTIAL_LABELS, DEMO_OFFERS, DEMO_PRO_CREDENTIALS } from '@/lib/demo';

const today = () => new Date().toISOString().slice(0, 10);

export default function ProJobs() {
  const c = usePalette();
  const [online, setOnline] = useState(false);
  const [accepted, setAccepted] = useState<string | null>(null);

  return (
    <Screen>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Title>{online ? 'You are online' : 'You are offline'}</Title>
          <Body secondary>{online ? 'Nearby jobs will appear below.' : 'Go online to receive jobs.'}</Body>
        </View>
        <Switch value={online} onValueChange={setOnline} trackColor={{ true: c.good }} />
      </View>

      <Link href="/credentials">
        <Body style={{ color: c.accent }}>Your documents and qualifications</Body>
      </Link>

      {online &&
        DEMO_OFFERS.map((offer) => {
          const jobType = findJobType(offer.jobTypeId);
          if (!jobType) return null;
          const missing = missingCredentials(jobType, DEMO_PRO_CREDENTIALS, today());
          return (
            <Card key={offer.id} selected={accepted === offer.id}>
              <Body style={styles.bold}>
                {offer.urgent ? 'Urgent · ' : ''}
                {jobType.label}
              </Body>
              <Body secondary>
                {offer.postcode} · {offer.distanceKm} km away
              </Body>
              <Body>{offer.note}</Body>
              {missing.length > 0 ? (
                <Body secondary>Needs: {missing.map((m) => CREDENTIAL_LABELS[m]).join(', ')}</Body>
              ) : accepted === offer.id ? (
                <Body style={{ color: c.good, fontWeight: '600' }}>Accepted. Customer notified.</Body>
              ) : (
                <Button
                  label="Accept job"
                  disabled={accepted !== null}
                  onPress={() => setAccepted(offer.id)}
                />
              )}
            </Card>
          );
        })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bold: { fontWeight: '600' },
});
