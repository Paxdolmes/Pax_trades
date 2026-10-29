import { router, useLocalSearchParams } from 'expo-router';
import { CalendarCheck, PoundSterling, Share2, Trash2, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { BackLink, HistoryRow, ManagerScreen, StatTile } from '@/components/landlord';
import { Grid, useBreakpoint } from '@/components/site/frame';
import { TRADE_ICONS } from '@/components/trade-icons';
import { Button, Card, Divider, SectionLabel, T } from '@/components/ui';
import { Radii, Spacing, usePalette } from '@/constants/theme';
import { formatPence, TRADES } from '@/domain/catalog';
import { isLive, shortDate, useLive } from '@/lib/live';
import {
  EXAMPLE_COMPANY,
  EXAMPLE_JOBS,
  EXAMPLE_PROPERTIES,
  formatJoinCode,
  isExample,
  loadCompanyName,
  loadManagedJobs,
  loadManagedProperties,
  loadTenants,
  removeTenant,
  shareJoinCode,
  updateProperty,
  type Tenant,
} from '@/lib/properties';

/** One property: the tenant code, who lives there, its settings, history and spend. */
export default function PropertyScreen() {
  const c = usePalette();
  const { wide } = useBreakpoint();
  const { id } = useLocalSearchParams<{ id: string }>();
  const example = !isLive || isExample(id);
  const { data: properties, loading } = useLive(() => (example ? Promise.resolve(EXAMPLE_PROPERTIES) : loadManagedProperties()), example ? EXAMPLE_PROPERTIES : [], id);
  const exampleJobs = EXAMPLE_JOBS.filter((j) => j.propertyId === id);
  const { data: jobs } = useLive(() => (example ? Promise.resolve(exampleJobs) : loadManagedJobs(id)), example ? exampleJobs : [], id);
  const exampleTenants = (EXAMPLE_PROPERTIES.find((p) => p.id === id)?.tenants ?? []).map((name, i): Tenant => ({ id: `${id}-t${i}`, name, joinedAt: '2026-09-01T10:00:00Z' }));
  const { data: tenants, reload: reloadTenants } = useLive(() => (example ? Promise.resolve(exampleTenants) : loadTenants(id)), example ? exampleTenants : [], id);
  const { data: company } = useLive(() => (example ? Promise.resolve(EXAMPLE_COMPANY) : loadCompanyName()), '', id);
  const property = properties.find((p) => p.id === id) ?? null;
  const [autoApprove, setAutoApprove] = useState<boolean | null>(null);
  const urgentOn = autoApprove ?? property?.autoApproveUrgent ?? true;

  if (!property) {
    return (
      <ManagerScreen>
        <BackLink label="All properties" href="/properties" />
        <T variant="title1">{loading ? 'Loading…' : 'Property not found'}</T>
      </ManagerScreen>
    );
  }

  async function share() {
    if (!property) return;
    try {
      const done = await shareJoinCode(property, company);
      if (done && !example) Alert.alert('Ready to send', 'The invitation is copied. Paste it into a text or email to your tenant.');
    } catch {
      Alert.alert('Your tenant code', formatJoinCode(property.joinCode));
    }
  }

  async function toggleUrgent(on: boolean) {
    setAutoApprove(on);
    if (example || !property) return;
    try {
      await updateProperty(property.id, { autoApproveUrgent: on });
    } catch (e) {
      setAutoApprove(!on);
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  function remove(t: Tenant) {
    if (example || !property) return;
    const p = property;
    Alert.alert(`Remove ${t.name}?`, 'Their repair requests will no longer come to you. They can rejoin with the code.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          void removeTenant(p.id, t.id).then(
            () => reloadTenants(),
            (e: unknown) => Alert.alert('Could not remove', e instanceof Error ? e.message : 'Please try again.'),
          ),
      },
    ]);
  }

  function archive() {
    if (example || !property) return;
    const p = property;
    Alert.alert(`Remove ${p.name}?`, 'It leaves your dashboard and tenants can no longer send requests for it. Past jobs stay on record.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          void updateProperty(p.id, { archived: true }).then(
            () => router.replace('/properties'),
            (e: unknown) => Alert.alert('Could not remove', e instanceof Error ? e.message : 'Please try again.'),
          ),
      },
    ]);
  }

  function book(trade: (typeof TRADES)[number]['id']) {
    if (example || !property) {
      Alert.alert('Example dashboard', 'Sign in and add your property to book jobs for it.');
      return;
    }
    router.push({ pathname: '/request', params: { trade, postcode: property.postcode, property: property.id, propertyName: property.name } });
  }

  const spentAll = jobs.filter((j) => j.status === 'completed').reduce((s, j) => s + (j.finalPricePence ?? 0), 0);

  const side = (
    <View style={{ gap: Spacing.five }}>
      <Card style={{ gap: Spacing.four }}>
        <T variant="overline" color="inkSubtle">
          TENANT CODE
        </T>
        <T variant="money" style={{ letterSpacing: 4 }} accessibilityLabel={`Tenant code ${property.joinCode.split('').join(' ')}`}>
          {formatJoinCode(property.joinCode)}
        </T>
        <T variant="footnote" color="inkMuted">
          {'Your tenant enters this in Relay, under Account, then "Your landlord or agent". Their repairs then come to you.'}
        </T>
        <Button label="Send to your tenant" icon={Share2} size="md" onPress={share} />
      </Card>

      <Card style={{ gap: Spacing.three }}>
        <T variant="overline" color="inkSubtle">
          TENANTS
        </T>
        {tenants.length ? (
          tenants.map((t, i) => (
            <View key={t.id}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.tenant}>
                <View style={{ flex: 1 }}>
                  <T variant="subhead" style={{ fontWeight: '600' }}>
                    {t.name}
                  </T>
                  <T variant="footnote" color="inkSubtle">{`Joined ${shortDate(t.joinedAt)}`}</T>
                </View>
                {example ? null : <Button label="Remove" variant="ghost" size="md" onPress={() => remove(t)} />}
              </View>
            </View>
          ))
        ) : (
          <T variant="footnote" color="inkMuted">
            No tenants yet. Send them the code above.
          </T>
        )}
      </Card>

      <Card style={{ gap: Spacing.two }}>
        <View style={styles.tenant}>
          <Zap size={20} color={c.urgent} />
          <T variant="subhead" style={{ flex: 1, fontWeight: '600' }}>
            Send emergencies straight away
          </T>
          <Switch value={urgentOn} onValueChange={toggleUrgent} accessibilityLabel="Send emergencies straight away" />
        </View>
        <T variant="footnote" color="inkMuted">
          {urgentOn
            ? "Leaks, no heating, power cuts and lock-outs go to a pro without waiting for you. We'll tell you straight away."
            : 'Every request waits for your OK, even emergencies.'}
        </T>
      </Card>
    </View>
  );

  const main = (
    <View style={{ gap: Spacing.five }}>
      <Grid columns={{ narrow: 3, medium: 3, wide: 3 }} gap={Spacing.two}>
        <StatTile icon={PoundSterling} label="Spent this year" value={formatPence(property.spendYearPence)} tone="success" />
        <StatTile icon={PoundSterling} label="Spent in total" value={formatPence(Math.max(property.spendPence, spentAll))} tone="neutral" />
        <StatTile icon={CalendarCheck} label="Jobs" value={String(property.jobs)} tone="neutral" />
      </Grid>

      <View style={{ gap: Spacing.three }}>
        <SectionLabel>Book a job here</SectionLabel>
        <T variant="footnote" color="inkMuted">
          Gas safety certificates, EICRs, a check between tenants: book it yourself and it needs no approval.
        </T>
        <View style={styles.trades}>
          {TRADES.map((t) => {
            const Icon = TRADE_ICONS[t.id];
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                onPress={() => book(t.id)}
                style={({ pressed }) => [styles.trade, { backgroundColor: pressed ? c.surfaceMuted : c.surface, borderColor: c.border }]}>
                <Icon size={16} color={c.accentStrong} />
                <T variant="subhead" style={{ fontWeight: '600' }}>
                  {t.short}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: Spacing.one }}>
        <SectionLabel>Request history</SectionLabel>
        <Card style={{ paddingVertical: 0 }}>
          {jobs.length ? (
            jobs.map((j) => <HistoryRow key={j.jobId} job={j} />)
          ) : (
            <T variant="callout" color="inkMuted" style={{ paddingVertical: Spacing.five }}>
              No requests yet.
            </T>
          )}
        </Card>
      </View>
      {example ? null : <Button label="Remove this property" variant="ghost" icon={Trash2} onPress={archive} />}
    </View>
  );

  return (
    <ManagerScreen>
      <BackLink label="All properties" href={example && isLive ? { pathname: '/properties', params: { example: '1' } } : '/properties'} />
      <View style={{ gap: 4 }}>
        <T variant="display" accessibilityRole="header">
          {property.name}
        </T>
        <T variant="callout" color="inkMuted">
          {property.postcode}
        </T>
      </View>
      {wide ? (
        <View style={{ flexDirection: 'row', gap: Spacing.six, alignItems: 'flex-start' }}>
          <View style={{ flex: 1.7 }}>{main}</View>
          <View style={{ flex: 1 }}>{side}</View>
        </View>
      ) : (
        <>
          {side}
          {main}
        </>
      )}
    </ManagerScreen>
  );
}

const styles = StyleSheet.create({
  tenant: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.one },
  trades: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  trade: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderWidth: 1, borderRadius: Radii.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
});
