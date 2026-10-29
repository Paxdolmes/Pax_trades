import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Building2, CalendarDays, ChevronLeft, Lock, Send, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { MediaPicker } from '@/components/media-picker';
import { Button, Card, Chip, Footer, IconButton, IconTile, Note, Radio, Screen, T } from '@/components/ui';
import { Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import { formatPence, jobTypesForTrade, TRADES, type JobType, type Trade } from '@/domain/catalog';
import { bookingDays } from '@/domain/slots';
import { createJob, type Urgency } from '@/lib/jobs';
import { uploadMedia, type PickedMedia } from '@/lib/media';
import { useAccountGate } from '@/lib/auth';
import { useLive } from '@/lib/live';
import { ensureSavedCard } from '@/lib/payments';
import { priceLine } from '@/lib/pricing';
import { loadMyProperty } from '@/lib/properties';

/** Saving against booking the two jobs separately, e.g. service plus CP12. */
function bundleSaving(job: JobType, all: JobType[]): number | null {
  if (job.pricing.kind !== 'fixed' || !job.id.includes('-cp12')) return null;
  const parts = job.id.split('-cp12')[0];
  const a = all.find((j) => j.id === parts);
  const b = all.find((j) => j.id === 'cp12');
  if (a?.pricing.kind !== 'fixed' || b?.pricing.kind !== 'fixed') return null;
  return a.pricing.pence + b.pricing.pence - job.pricing.pence;
}

export default function RequestJob() {
  const c = usePalette();
  const params = useLocalSearchParams<{ trade: Trade; postcode: string; job?: string; property?: string; propertyName?: string }>();
  const { trade, job } = params;
  const tradeInfo = TRADES.find((t) => t.id === trade);
  const jobTypes = jobTypesForTrade(trade);
  // A job picked on the website's Services page starts selected.
  const [jobType, setJobType] = useState<JobType>(jobTypes.find((j) => j.id === job) ?? jobTypes[0]);
  const [urgency, setUrgency] = useState<Urgency>('urgent');
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [days] = useState(() => bookingDays(new Date()));
  const [dayKey, setDayKey] = useState(days[0]?.key);
  const [slot, setSlot] = useState<string | null>(null);
  const signedIn = useAccountGate();
  // A tenant who has joined their landlord's property can send the request to them
  // to approve and pay. A manager booking for one of their properties arrives with it.
  const { data: home } = useLive(loadMyProperty, null);
  const [toLandlord, setToLandlord] = useState(true);
  const tenantHome = !params.property && home && toLandlord ? home : null;
  const propertyId = params.property ?? tenantHome?.id ?? null;
  const postcode = tenantHome?.postcode ?? params.postcode;

  // Opened without a trade, e.g. a refreshed web page: start again from home.
  if (!jobType) return <Redirect href="/home" />;

  const effectiveUrgency: Urgency = jobType.urgentAllowed ? urgency : 'booked';
  const urgent = effectiveUrgency === 'urgent';
  const day = days.find((d) => d.key === dayKey) ?? days[0];
  const ready = urgent || slot !== null;
  // Emergencies skip the landlord's OK when their property allows it.
  const needsApproval = Boolean(tenantHome) && !(urgent && tenantHome?.autoApproveUrgent);

  async function submit() {
    if (!signedIn()) return;
    setSubmitting(true);
    try {
      // The landlord pays for their tenant's requests, so the tenant needs no card.
      if (!tenantHome && !(await ensureSavedCard())) return;
      const { id } = await createJob({
        propertyId,
        trade,
        jobTypeId: jobType.id,
        urgency: effectiveUrgency,
        postcode,
        description,
        scheduledFor: urgent ? null : slot,
      });
      // The request is in either way; don't let a failed photo upload send it twice.
      await uploadMedia({ jobId: id }, media).catch(() =>
        Alert.alert('Your request is sent', "Your photos didn't upload. You can show them to your pro in the chat."),
      );
      router.replace({ pathname: '/job/[id]', params: { id, jobType: jobType.id, urgency: effectiveUrgency } });
    } catch (e) {
      Alert.alert('Could not send your request', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      footer={
        <Footer>
          {tenantHome ? (
            <Note icon={Building2}>
              {needsApproval
                ? `This goes to ${tenantHome.managerName} to approve. They pay the bill, so there's nothing for you to pay.`
                : `Emergencies go straight to a pro, and ${tenantHome.managerName} pays the bill. There's nothing for you to pay.`}
            </Note>
          ) : (
            <Note icon={Lock}>Prices include VAT and fees, with no hidden extras. Your card is held, not charged, until you confirm the job is done.</Note>
          )}
          {needsApproval ? (
            <Button label={`Send to ${tenantHome?.managerName}`} icon={Send} loading={submitting} disabled={!ready} onPress={submit} />
          ) : urgent ? (
            <Button label="Find a pro now" variant="urgent" icon={Zap} loading={submitting} onPress={submit} />
          ) : (
            <Button label="Request a booking" trailingIcon={ArrowRight} loading={submitting} disabled={!ready} onPress={submit} />
          )}
        </Footer>
      }>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
        <View>
          <T variant="caption" color="inkSubtle">
            {params.propertyName ? `${params.propertyName} · ${postcode}` : postcode}
          </T>
          <T variant="headline">{tradeInfo?.label}</T>
        </View>
      </View>

      {home && !params.property ? (
        <Card selected={toLandlord} onPress={() => setToLandlord(!toLandlord)} style={styles.option} accessibilityLabel={`Send to ${home.managerName} to approve and pay`}>
          <IconTile icon={Building2} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="headline">{`Send to ${home.managerName}`}</T>
            <T variant="footnote" color="inkMuted">
              {toLandlord ? `For ${home.name}. They approve it and pay the bill.` : "Off: you're booking and paying for this yourself."}
            </T>
          </View>
          <Radio on={toLandlord} />
        </Card>
      ) : null}

      <View style={{ gap: Spacing.three }}>
        <T variant="title1" accessibilityRole="header">
          What do you need?
        </T>
        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          {jobTypes.map((j) => {
            const on = jobType.id === j.id;
            const saving = bundleSaving(j, jobTypes);
            return (
              <Card key={j.id} selected={on} onPress={() => setJobType(j)} accessibilityLabel={`${j.label}. ${priceLine(j, effectiveUrgency)}`} style={styles.option}>
                <View style={{ flex: 1, gap: 4 }}>
                  <T variant="headline">{j.label}</T>
                  {saving ? <Chip label={`Save ${formatPence(saving)}`} tone="success" /> : null}
                  <T variant="footnote" color="inkMuted">
                    {priceLine(j, effectiveUrgency)}
                  </T>
                </View>
                <Radio on={on} />
              </Card>
            );
          })}
        </View>
      </View>

      {jobType.urgentAllowed ? (
        <View style={{ gap: Spacing.three }}>
          <T variant="title2" accessibilityRole="header">
            When do you need someone?
          </T>
          <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
            <Card
              selected={urgency === 'urgent'}
              selectedTone="urgent"
              onPress={() => setUrgency('urgent')}
              style={[styles.option, urgency === 'urgent' && { backgroundColor: c.urgentTint }]}>
              <IconTile icon={Zap} tone="urgent" size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="headline">As soon as possible</T>
                <T variant="footnote" color="inkMuted">
                  We send the nearest available {tradeInfo?.pro}
                </T>
              </View>
              <Radio on={urgency === 'urgent'} tone="urgent" />
            </Card>
            <Card selected={urgency === 'booked'} onPress={() => setUrgency('booked')} style={styles.option}>
              <IconTile icon={CalendarDays} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="headline">Book a time</T>
                <T variant="footnote" color="inkMuted">
                  Pick a 2-hour slot that suits you
                </T>
              </View>
              <Radio on={urgency === 'booked'} />
            </Card>
          </View>
        </View>
      ) : null}

      {urgent ? null : (
        <View style={{ gap: Spacing.three }}>
          <T variant="title2" accessibilityRole="header">
            Pick a 2-hour slot
          </T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
            {days.map((d) => (
              <Pill key={d.key} label={d.label} on={d.key === day?.key} onPress={() => (setDayKey(d.key), setSlot(null))} />
            ))}
          </ScrollView>
          <View style={[styles.pills, { flexWrap: 'wrap' }]}>
            {day?.slots.map((s) => (
              <Pill key={s.start} label={s.label} on={slot === s.start} onPress={() => setSlot(s.start)} />
            ))}
          </View>
        </View>
      )}

      <View style={{ gap: Spacing.three }}>
        <T variant="title2" accessibilityRole="header">
          Anything we should know?
        </T>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="e.g. Worcester Bosch combi showing error F28. Boiler is in the kitchen cupboard."
          placeholderTextColor={c.inkSubtle}
          accessibilityLabel="Notes for your tradesperson"
          style={[Type.callout, styles.notes, Shadows.card, { backgroundColor: c.surface, color: c.ink }]}
        />
        <MediaPicker value={media} onChange={setMedia} />
      </View>
    </Screen>
  );
}

function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[styles.pill, { borderColor: on ? c.brand : c.border, backgroundColor: on ? c.brandTint : c.surface }]}>
      <T variant="subhead" color={on ? 'brand' : 'ink'} style={{ fontWeight: '600' }}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', gap: Spacing.two },
  pill: { borderWidth: 2, borderRadius: Radii.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  notes: { minHeight: 96, borderRadius: Radii.md, padding: Spacing.four, textAlignVertical: 'top' },
});
