// Booking in three steps: the job and where, an exact arrival time, then check and
// book. Until Relay opens, the last step on the website joins the waiting list.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, BellRing, Building2, ChevronLeft, CircleCheck, Clock, Lock, MapPin, Send, X, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { menuPrice } from '@/components/job-menu';
import { MediaPicker } from '@/components/media-picker';
import { TRADE_ICONS } from '@/components/trade-icons';
import { Button, Card, Chip, Divider, Footer, IconButton, IconTile, Note, Radio, Screen, T } from '@/components/ui';
import { Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import { ALL_IN_NOTE, formatPence, isOffered, jobTypesForTrade, LAUNCH_OUTWARD_CODES, TRADES, type JobType, type Trade } from '@/domain/catalog';
import { isInLaunchArea, outwardCode } from '@/domain/rules';
import { arrivalLabel, bookingDays, clockLabel } from '@/domain/slots';
import { useAccountGate } from '@/lib/auth';
import { DEMO_CUSTOMER } from '@/lib/demo';
import { createJob, type Urgency } from '@/lib/jobs';
import { WAITLIST } from '@/lib/launch';
import { isLive, useLive } from '@/lib/live';
import { uploadMedia, type PickedMedia } from '@/lib/media';
import { ensureSavedCard } from '@/lib/payments';
import { priceLine, upfrontPence } from '@/lib/pricing';
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

const STEPS = 3;

export default function RequestJob() {
  const c = usePalette();
  const params = useLocalSearchParams<{ trade: Trade; postcode?: string; job?: string; urgent?: string; property?: string; propertyName?: string }>();
  const { trade } = params;
  const tradeInfo = TRADES.find((t) => t.id === trade);
  const jobTypes = jobTypesForTrade(trade);
  const [step, setStep] = useState(0);
  // A job picked from the menu starts chosen; a trade on its own shows its jobs.
  const [jobType, setJobType] = useState<JobType | null>(jobTypes.find((j) => j.id === params.job) ?? null);
  const [choosing, setChoosing] = useState(!jobType);
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [typed, setPostcode] = useState(params.postcode?.toUpperCase() ?? (isLive ? '' : DEMO_CUSTOMER.postcode));
  const [urgency, setUrgency] = useState<Urgency | null>(params.urgent ? 'urgent' : null);
  const [days] = useState(() => bookingDays(new Date()));
  const [dayKey, setDayKey] = useState(days[0]?.key);
  const [slot, setSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const signedIn = useAccountGate();
  // A tenant who has joined their landlord's property can send the request to them
  // to approve and pay. A manager booking for one of their properties arrives with it.
  const { data: home } = useLive(loadMyProperty, null);
  const [toLandlord, setToLandlord] = useState(true);
  const tenantHome = !params.property && home && toLandlord ? home : null;
  const propertyId = params.property ?? tenantHome?.id ?? null;
  const fixedPlace = params.property ? { name: params.propertyName ?? 'Your property', postcode: params.postcode ?? '' } : tenantHome;
  const postcode = (fixedPlace?.postcode ?? typed).trim().toUpperCase();

  // Opened without a trade, e.g. a refreshed web page: start again from home.
  // An old link to a trade we've paused also goes back home.
  if (!tradeInfo || !isOffered(trade)) return <Redirect href="/home" />;

  const asap = urgency === 'urgent' && Boolean(jobType?.urgentAllowed);
  const effectiveUrgency: Urgency = asap ? 'urgent' : 'booked';
  const day = days.find((d) => d.key === dayKey) ?? days[0];
  const district = outwardCode(postcode);
  const covered = district !== null && isInLaunchArea(postcode, LAUNCH_OUTWARD_CODES);
  // Until Relay opens anyone can carry on to the waiting list; after, only covered postcodes.
  const placeOk = Boolean(fixedPlace) || (WAITLIST ? district !== null : covered);
  const timeOk = asap || slot !== null;
  // Emergencies skip the landlord's OK when their property allows it.
  const needsApproval = Boolean(tenantHome) && !(asap && tenantHome?.autoApproveUrgent);
  const when = asap ? 'As soon as possible' : slot ? arrivalLabel(slot) : '';
  const JobIcon = TRADE_ICONS[trade];

  function pickJob(j: JobType) {
    setJobType(j);
    setChoosing(false);
  }

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  async function submit() {
    if (!jobType || !signedIn()) return;
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
        scheduledFor: asap ? null : slot,
      });
      // The request is in either way; don't let a failed photo upload send it twice.
      await uploadMedia({ jobId: id }, media).catch(() =>
        Alert.alert('Your request is sent', "Your photos didn't upload. You can show them to your pro in the chat."),
      );
      router.replace({ pathname: '/job/[id]', params: { id, jobType: jobType.id, urgency: effectiveUrgency, ...(slot && !asap ? { scheduledFor: slot } : {}) } });
    } catch (e) {
      Alert.alert('Could not send your request', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const titles = ['Your job', 'When', WAITLIST ? 'Nearly there' : tenantHome ? 'Check and send' : 'Check and book'];

  const footer =
    step === 0 ? (
      <Footer>
        <Button label="Choose a time" trailingIcon={ArrowRight} disabled={!jobType || choosing || !placeOk} onPress={() => setStep(1)} />
      </Footer>
    ) : step === 1 ? (
      <Footer>
        <Button label="Continue" trailingIcon={ArrowRight} disabled={!timeOk} onPress={() => setStep(2)} />
      </Footer>
    ) : WAITLIST ? (
      <Footer>
        <Note icon={BellRing}>Bookings open soon. Join the waiting list and we’ll tell you the day you can book this.</Note>
        <Button
          label="Join the waiting list"
          trailingIcon={ArrowRight}
          onPress={() => router.push({ pathname: '/waitlist', params: { trade, job: jobType?.id ?? '', postcode, ...(asap ? { urgent: '1' } : {}) } })}
        />
      </Footer>
    ) : tenantHome ? (
      <Footer>
        <Note icon={Building2}>
          {needsApproval
            ? `This goes to ${tenantHome.managerName} to approve. They pay the bill, so there's nothing for you to pay.`
            : `Emergencies go straight to a pro, and ${tenantHome.managerName} pays the bill. There's nothing for you to pay.`}
        </Note>
        {needsApproval ? (
          <Button label={`Send to ${tenantHome.managerName}`} icon={Send} loading={submitting} onPress={submit} />
        ) : (
          <Button label="Find a pro now" variant="urgent" icon={Zap} loading={submitting} onPress={submit} />
        )}
      </Footer>
    ) : (
      <Footer>
        <Button
          label="Book now"
          sublabel="Nothing to pay until it’s done"
          variant={asap ? 'urgent' : 'primary'}
          icon={asap ? Zap : undefined}
          loading={submitting}
          onPress={submit}
        />
      </Footer>
    );

  return (
    <Screen key={step} footer={footer}>
      <View style={{ gap: Spacing.four }}>
        <View style={styles.top}>
          {step > 0 ? <IconButton icon={ChevronLeft} label="Back" tone="muted" onPress={() => setStep(step - 1)} /> : null}
          <T variant="subhead" color="inkMuted" style={{ flex: 1, fontWeight: '600' }}>
            {`${step + 1} of ${STEPS}`}
          </T>
          <IconButton icon={X} label="Close" tone="muted" onPress={close} />
        </View>
        <View style={styles.bars} accessibilityLabel={`Step ${step + 1} of ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={[styles.bar, { backgroundColor: i <= step ? c.accent : c.surfaceMuted }]} />
          ))}
        </View>
        <T variant="display" accessibilityRole="header">
          {titles[step]}
        </T>
      </View>

      {step === 0 ? (
        <>
          {choosing || !jobType ? (
            <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
              <T variant="subhead" color="inkMuted" style={{ fontWeight: '600' }}>
                {`${tradeInfo.service}: pick a job`}
              </T>
              {jobTypes.map((j) => {
                const saving = bundleSaving(j, jobTypes);
                return (
                  <Card key={j.id} selected={jobType?.id === j.id} onPress={() => pickJob(j)} accessibilityLabel={`${j.label}. ${priceLine(j, 'booked')}`} style={styles.option}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <T variant="headline">{j.label}</T>
                      {saving ? <Chip label={`Save ${formatPence(saving)}`} tone="success" /> : null}
                      <T variant="footnote" color="inkMuted">
                        {priceLine(j, 'booked')}
                      </T>
                    </View>
                    <Radio on={jobType?.id === j.id} />
                  </Card>
                );
              })}
            </View>
          ) : (
            <View style={[styles.picked, { backgroundColor: c.accentTint }]}>
              <View style={[styles.pickedIcon, { backgroundColor: c.surface }]}>
                <JobIcon size={24} color={c.accentStrong} strokeWidth={2.1} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="title2">{jobType.label}</T>
                <T variant="footnote" color="inkMuted">{`${menuPrice(jobType).price} ${menuPrice(jobType).note}, all-in`}</T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Change job" hitSlop={8} onPress={() => setChoosing(true)}>
                <T variant="subhead" color="accentStrong" style={{ fontWeight: '700', textDecorationLine: 'underline' }}>
                  Change
                </T>
              </Pressable>
            </View>
          )}

          <View style={{ gap: Spacing.three }}>
            <T variant="title2" accessibilityRole="header">
              Where
            </T>
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
            {fixedPlace ? (
              <View style={[styles.place, Shadows.card, { backgroundColor: c.surface }]}>
                <MapPin size={20} color={c.accentStrong} strokeWidth={2.2} />
                <View style={{ flex: 1 }}>
                  <T variant="headline">{fixedPlace.name}</T>
                  <T variant="footnote" color="inkMuted">
                    {fixedPlace.postcode}
                  </T>
                </View>
              </View>
            ) : (
              <>
                <View style={[styles.place, Shadows.card, { backgroundColor: c.surface }]}>
                  <MapPin size={20} color={c.accentStrong} strokeWidth={2.2} />
                  <View style={{ flex: 1 }}>
                    <T variant="caption" color="inkSubtle">
                      Your postcode
                    </T>
                    <TextInput
                      value={typed}
                      onChangeText={(v) => setPostcode(v.toUpperCase())}
                      placeholder="SW6 1AA"
                      placeholderTextColor={c.inkSubtle}
                      autoCapitalize="characters"
                      autoComplete="postal-code"
                      accessibilityLabel="Your postcode"
                      style={[Type.headline, styles.input, { color: c.ink }]}
                    />
                  </View>
                  {covered ? (
                    <View style={styles.covered}>
                      <CircleCheck size={16} color={c.success} strokeWidth={2.4} />
                      <T variant="caption" color="success">
                        Covered
                      </T>
                    </View>
                  ) : null}
                </View>
                {typed.trim().length >= 5 && !district ? (
                  <T variant="footnote" color="danger">
                    Please enter a full postcode, like SW6 4UL.
                  </T>
                ) : null}
                {district && !covered ? (
                  WAITLIST ? (
                    <T variant="footnote" color="inkMuted">{`We’re opening in Fulham (SW6) first. Carry on and we’ll tell you when we reach ${district}.`}</T>
                  ) : (
                    <View style={[styles.notCovered, { backgroundColor: c.urgentTint }]}>
                      <T variant="footnote" style={{ flex: 1 }}>{`We’re not in ${district} yet. Join the waiting list and we’ll tell you first.`}</T>
                      <Button label="Join" size="md" variant="ink" onPress={() => router.push({ pathname: '/waitlist', params: { postcode, trade, job: jobType?.id ?? '' } })} style={{ height: 40 }} />
                    </View>
                  )
                ) : null}
              </>
            )}
          </View>

          <View style={{ gap: Spacing.three }}>
            <View style={{ gap: 2 }}>
              <T variant="title2" accessibilityRole="header">
                Help your pro come prepared
              </T>
              <T variant="footnote" color="inkMuted">
                Optional. A photo or a quick note saves time on the day.
              </T>
            </View>
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
        </>
      ) : null}

      {step === 1 && jobType ? (
        <>
          {jobType.urgentAllowed ? (
            <Card
              selected={asap}
              selectedTone="urgent"
              onPress={() => (setUrgency('urgent'), setSlot(null))}
              accessibilityLabel="As soon as possible"
              style={[styles.option, asap && { backgroundColor: c.urgentTint }]}>
              <IconTile icon={Zap} tone="urgent" size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="headline">As soon as possible</T>
                <T variant="footnote" color="inkMuted">
                  {`The nearest ${tradeInfo.pro}, usually with you within the hour`}
                </T>
              </View>
              <Radio on={asap} tone="urgent" />
            </Card>
          ) : null}

          <View style={{ gap: Spacing.three }}>
            <T variant="subhead" color="inkMuted" style={{ fontWeight: '600' }}>
              {jobType.urgentAllowed ? 'Or pick a day' : 'Pick a day'}
            </T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
              {days.map((d) => (
                <Choice key={d.key} label={d.label} on={d.key === day?.key && !asap} round onPress={() => (setDayKey(d.key), setSlot(null), setUrgency('booked'))} />
              ))}
            </ScrollView>
          </View>

          <View style={{ gap: Spacing.three }}>
            <T variant="subhead" color="inkMuted" style={{ fontWeight: '600' }}>
              Arrival time
            </T>
            <View style={{ gap: Spacing.two }}>
              {[0, 3].map((from) => (
                <View key={from} style={{ flexDirection: 'row', gap: Spacing.two }}>
                  {[0, 1, 2].map((k) => {
                    const s = day?.slots[from + k];
                    return s ? (
                      <Choice key={s.start} label={s.label} on={!asap && slot === s.start} onPress={() => (setSlot(s.start), setUrgency('booked'))} />
                    ) : (
                      <View key={k} style={{ flex: 1 }} />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {slot && !asap ? (
            <View style={[styles.exact, { backgroundColor: c.accentTint }]}>
              <Clock size={20} color={c.accentStrong} strokeWidth={2.2} />
              <View style={{ flex: 1 }}>
                <T variant="headline">{`Your ${tradeInfo.pro} arrives at ${clockLabel(new Date(slot))}`}</T>
                <T variant="footnote" color="inkMuted">
                  {`${day?.label}. An exact time, not a 4-hour window.`}
                </T>
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      {step === 2 && jobType ? (
        <View style={[styles.summary, { backgroundColor: c.surface }, Shadows.card]}>
          <Row label="Job" value={jobType.label} />
          <Row label="When" value={when} />
          <Row label="Where" value={fixedPlace ? `${fixedPlace.name} · ${fixedPlace.postcode}` : postcode} />
          {media.length ? <Row label="Photos" value={`${media.length} added`} /> : null}
          <Divider />
          <View style={styles.total}>
            <T variant="headline">{jobType.pricing.kind === 'fixed' ? 'Total' : 'First hour'}</T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <T variant="money" style={{ fontSize: 36, lineHeight: 40 }}>
                {formatPence(upfrontPence(jobType, effectiveUrgency))}
              </T>
              <T variant="subhead" color="inkMuted">
                all-in
              </T>
            </View>
          </View>
          <T variant="footnote" color="inkMuted">
            {jobType.pricing.kind === 'fixed' && !jobType.pricing.extraUnitPence ? ALL_IN_NOTE : `${priceLine(jobType, effectiveUrgency)}. ${ALL_IN_NOTE}`}
          </T>
          {WAITLIST || tenantHome ? null : (
            <>
              <Divider />
              <Note icon={Lock}>Nothing is taken now. We charge your card only when you confirm the job’s done.</Note>
            </>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <T variant="callout" color="inkMuted">
        {label}
      </T>
      <T variant="bodyStrong" style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </T>
    </View>
  );
}

/** A day or a time to pick. Navy when chosen. */
function Choice({ label, on, round, onPress }: { label: string; on: boolean; round?: boolean; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => [
        round ? styles.day : styles.time,
        { backgroundColor: on ? c.ink : pressed ? c.border : c.surfaceMuted },
      ]}>
      <T variant="bodyStrong" color={on ? 'surface' : 'ink'} style={{ fontWeight: '700' }}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bars: { flexDirection: 'row', gap: Spacing.two },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  picked: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radii.lg, padding: Spacing.four },
  pickedIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  place: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 64, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: Radii.md },
  input: { padding: 0, margin: 0, outlineStyle: 'none' } as object,
  covered: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notCovered: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radii.md, padding: Spacing.three },
  notes: { minHeight: 88, borderRadius: Radii.md, padding: Spacing.four, textAlignVertical: 'top' },
  days: { gap: Spacing.two },
  day: { height: 48, paddingHorizontal: Spacing.five, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  time: { flex: 1, height: 52, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  exact: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radii.lg, padding: Spacing.four },
  summary: { borderRadius: Radii.lg, padding: Spacing.five, gap: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.four },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
