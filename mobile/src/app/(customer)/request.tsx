import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';

import { Body, Button, Card, Screen, Title } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import {
  CALLOUT_RATES,
  formatPence,
  jobTypesForTrade,
  type JobType,
  type Trade,
} from '@/domain/catalog';
import { isOutOfHours } from '@/domain/rules';
import { createJob, type Urgency } from '@/lib/jobs';

function priceLine(job: JobType, urgency: Urgency): string {
  if (job.pricing.kind === 'fixed') {
    const extra = job.pricing.extraUnitPence
      ? `, plus ${formatPence(job.pricing.extraUnitPence)} ${job.pricing.extraUnitLabel}`
      : '';
    return `${formatPence(job.pricing.pence)} fixed price${extra}`;
  }
  const now = new Date();
  const rate = urgency === 'urgent' && isOutOfHours(now.getDay(), now.getHours())
    ? CALLOUT_RATES.outOfHours
    : CALLOUT_RATES.standard;
  return `${formatPence(rate.firstHourPence)} including the first hour, then ${formatPence(rate.perHourPence)} per hour`;
}

export default function RequestJob() {
  const c = usePalette();
  const { trade, postcode } = useLocalSearchParams<{ trade: Trade; postcode: string }>();
  const jobTypes = jobTypesForTrade(trade);
  const [jobType, setJobType] = useState<JobType | null>(null);
  const [urgency, setUrgency] = useState<Urgency>('urgent');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const effectiveUrgency: Urgency = jobType && !jobType.urgentAllowed ? 'booked' : urgency;

  async function submit() {
    if (!jobType) return;
    setSubmitting(true);
    try {
      const { id } = await createJob({
        trade,
        jobTypeId: jobType.id,
        urgency: effectiveUrgency,
        postcode,
        description,
      });
      router.replace({ pathname: '/job/[id]', params: { id } });
    } catch (e) {
      Alert.alert('Could not send your request', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Title>What&apos;s the problem?</Title>
      {jobTypes.map((j) => (
        <Card key={j.id} selected={jobType?.id === j.id} onPress={() => setJobType(j)}>
          <Body style={styles.bold}>{j.label}</Body>
          <Body secondary>{priceLine(j, effectiveUrgency)}</Body>
        </Card>
      ))}

      {jobType?.urgentAllowed && (
        <>
          <Body>When do you need someone?</Body>
          <Card selected={urgency === 'urgent'} onPress={() => setUrgency('urgent')}>
            <Body style={styles.bold}>As soon as possible</Body>
            <Body secondary>We send the nearest available pro.</Body>
          </Card>
          <Card selected={urgency === 'booked'} onPress={() => setUrgency('booked')}>
            <Body style={styles.bold}>Book a time</Body>
            <Body secondary>Pick a slot that suits you.</Body>
          </Card>
        </>
      )}

      <Body>Anything the pro should know?</Body>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="e.g. Water dripping from the ceiling under the bathroom"
        placeholderTextColor={c.textSecondary}
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
      />

      <Body secondary>
        Your card is held, not charged, until the job is done. Any extra work needs your OK in the app first.
      </Body>
      <Button
        label={effectiveUrgency === 'urgent' ? 'Find a pro now' : 'Request booking'}
        tone={effectiveUrgency === 'urgent' ? 'urgent' : 'accent'}
        disabled={!jobType || submitting}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '600' },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 16, minHeight: 96, textAlignVertical: 'top' },
});
