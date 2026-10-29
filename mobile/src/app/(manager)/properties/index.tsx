import { router, useLocalSearchParams } from 'expo-router';
import { BellRing, Building2, Eye, House, PoundSterling, Plus, Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { BackLink, HistoryRow, ManagerScreen, PendingCard, PropertyCard, StatTile } from '@/components/landlord';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Grid, isWeb } from '@/components/site/frame';
import { Button, Card, IconTile, SectionLabel, T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { formatPence } from '@/domain/catalog';
import { needsSignIn, useAuth } from '@/lib/auth';
import { isLive, useLive } from '@/lib/live';
import { ensureSavedCard } from '@/lib/payments';
import {
  approveJob,
  declineJob,
  EXAMPLE_COMPANY,
  EXAMPLE_JOBS,
  EXAMPLE_PROPERTIES,
  isAwaiting,
  loadCompanyName,
  loadManagedJobs,
  loadManagedProperties,
  type ManagedJob,
} from '@/lib/properties';

/** Landlords and agents: every property, what's waiting for an OK, and what it's all cost. */
export default function Properties() {
  const c = usePalette();
  const params = useLocalSearchParams<{ example?: string }>();
  const { status, profile } = useAuth();
  const guest = needsSignIn(status);
  // The example dashboard: for visitors from the For landlords page, and demo mode.
  const example = !isLive || params.example === '1';
  const key = example ? 'example' : 'live';
  const { data: properties, loading, reload: reloadProperties } = useLive(
    () => (example ? Promise.resolve(EXAMPLE_PROPERTIES) : loadManagedProperties()),
    example ? EXAMPLE_PROPERTIES : [],
    key,
  );
  const { data: jobs, reload: reloadJobs } = useLive(() => (example ? Promise.resolve(EXAMPLE_JOBS) : loadManagedJobs()), example ? EXAMPLE_JOBS : [], key);
  const { data: company } = useLive(() => (example ? Promise.resolve(EXAMPLE_COMPANY) : loadCompanyName()), example ? EXAMPLE_COMPANY : '', key);
  // The example's Approve and Decline buttons work on this screen only.
  const [answered, setAnswered] = useState<Record<string, 'approved' | 'declined'>>({});

  const shownJobs = jobs.map((j): ManagedJob =>
    answered[j.jobId] === 'approved'
      ? { ...j, approval: 'approved' }
      : answered[j.jobId] === 'declined'
        ? { ...j, approval: 'declined', status: 'cancelled' }
        : j,
  );
  const waiting = shownJobs.filter(isAwaiting);
  const open = shownJobs.filter((j) => j.approval !== 'pending' && !['completed', 'cancelled'].includes(j.status)).length;
  const spendYear = properties.reduce((s, p) => s + p.spendYearPence, 0);

  async function approve(job: ManagedJob) {
    if (example) {
      setAnswered((a) => ({ ...a, [job.jobId]: 'approved' }));
      return;
    }
    try {
      if (!(await ensureSavedCard())) return;
      await approveJob(job.jobId);
      await Promise.all([reloadJobs(), reloadProperties()]);
    } catch (e) {
      Alert.alert('Could not approve', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  async function decline(job: ManagedJob, reason: string) {
    if (example) {
      setAnswered((a) => ({ ...a, [job.jobId]: 'declined' }));
      return;
    }
    try {
      await declineJob(job.jobId, reason);
      await Promise.all([reloadJobs(), reloadProperties()]);
    } catch (e) {
      Alert.alert('Could not decline', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  if (guest && !example) {
    return (
      <ManagerScreen>
        {isWeb ? null : <BackLink label="Account" href="/account" />}
        <View style={{ gap: Spacing.two, maxWidth: 640 }}>
          <T variant="display" accessibilityRole="header">
            Your properties
          </T>
          <T variant="callout" color="inkMuted">
            For landlords and letting agents: tenants report repairs to you in Relay, you approve them with one tap, and the bill comes to you.
          </T>
        </View>
        <View style={{ maxWidth: 640, gap: Spacing.four }}>
          <SignInPrompt icon={Building2} title="Sign in to manage your properties" body="Use your work email. There's nothing to pay to set up, and you only pay for the jobs you approve." />
          <Button label="See an example dashboard" variant="outline" icon={Eye} onPress={() => router.setParams({ example: '1' })} />
        </View>
      </ManagerScreen>
    );
  }

  const isEmpty = !example && !loading && properties.length === 0;

  return (
    <ManagerScreen>
      {isWeb ? null : <BackLink label="Account" href="/account" />}
      {example ? (
        <View style={[styles.banner, { backgroundColor: c.accentTint }]}>
          <Eye size={18} color={c.accentStrong} />
          <T variant="footnote" style={{ flex: 1 }}>
            An example dashboard with made-up properties. Try Approve and Decline: nothing is sent.
          </T>
          {isLive ? <Button label="Set up yours" size="md" onPress={() => router.replace('/properties')} style={{ paddingHorizontal: Spacing.four }} /> : null}
        </View>
      ) : null}

      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 240, gap: 4 }}>
          <T variant="display" accessibilityRole="header">
            Your properties
          </T>
          <T variant="callout" color="inkMuted">
            {company || profile?.fullName || 'Landlord dashboard'}
          </T>
        </View>
        <Button
          label="Add a property"
          icon={Plus}
          size="md"
          onPress={() => (example ? Alert.alert('Example dashboard', 'Sign in to add your own properties.') : router.push('/properties/new'))}
          style={{ paddingHorizontal: Spacing.five }}
        />
      </View>

      {isEmpty ? (
        <Card style={{ gap: Spacing.four, padding: Spacing.six, maxWidth: 640 }}>
          <IconTile icon={House} />
          <View style={{ gap: 6 }}>
            <T variant="title2">Add your first property</T>
            <T variant="callout" color="inkMuted">
              {"You'll get a code to give your tenant. Their repair requests then come to you to approve, and the bill comes to you."}
            </T>
          </View>
          <Button label="Add a property" icon={Plus} onPress={() => router.push('/properties/new')} />
        </Card>
      ) : (
        <>
          <Grid columns={{ narrow: 2, medium: 4, wide: 4 }} gap={Spacing.three}>
            <StatTile icon={House} label="Properties" value={String(properties.length)} />
            <StatTile icon={BellRing} label="Waiting for your OK" value={String(waiting.length)} tone={waiting.length ? 'urgent' : 'neutral'} />
            <StatTile icon={Wrench} label="Jobs in progress" value={String(open)} tone="neutral" />
            <StatTile icon={PoundSterling} label="Spent this year" value={formatPence(spendYear)} tone="success" />
          </Grid>

          {waiting.length ? (
            <View style={{ gap: Spacing.three }}>
              <SectionLabel>Waiting for your OK</SectionLabel>
              <Grid columns={{ narrow: 1, medium: 2, wide: 2 }} gap={Spacing.four}>
                {waiting.map((j) => (
                  <PendingCard key={j.jobId} job={j} onApprove={() => approve(j)} onDecline={(r) => decline(j, r)} />
                ))}
              </Grid>
            </View>
          ) : null}

          <View style={{ gap: Spacing.three }}>
            <SectionLabel>Properties</SectionLabel>
            <Grid columns={{ narrow: 1, medium: 2, wide: 3 }} gap={Spacing.four}>
              {properties.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={{ ...p, pending: shownJobs.filter((j) => j.propertyId === p.id && isAwaiting(j)).length }}
                  onPress={() => router.push({ pathname: '/properties/[id]', params: { id: p.id } })}
                />
              ))}
            </Grid>
          </View>

          <View style={{ gap: Spacing.one }}>
            <SectionLabel>Recent requests</SectionLabel>
            <Card style={{ paddingVertical: 0 }}>
              {shownJobs.length ? (
                shownJobs.slice(0, 12).map((j) => <HistoryRow key={j.jobId} job={j} showProperty />)
              ) : (
                <T variant="callout" color="inkMuted" style={{ paddingVertical: Spacing.five }}>
                  No requests yet. When a tenant reports a repair, it shows up here.
                </T>
              )}
            </Card>
          </View>
        </>
      )}
    </ManagerScreen>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.three, borderRadius: Radii.md, padding: Spacing.four },
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.four },
});
