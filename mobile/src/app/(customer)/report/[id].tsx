import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CircleCheck, Clock, RotateCcw, ShieldCheck, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { MediaPicker } from '@/components/media-picker';
import { Button, Card, Footer, IconButton, Note, Radio, Screen, T } from '@/components/ui';
import { Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import { PILOT } from '@/domain/catalog';
import { uploadMedia, type PickedMedia } from '@/lib/media';
import { PROBLEM_KINDS, reportProblem, type ProblemKind } from '@/lib/trust';

const MIN_DESCRIPTION = 5;

/** Relay Guarantee: tell us what went wrong within 30 days and we put it right. */
export default function ReportProblem() {
  const c = usePalette();
  const { id, job, kind: initialKind } = useLocalSearchParams<{ id: string; job?: string; kind?: ProblemKind }>();
  const [kind, setKind] = useState<ProblemKind>(initialKind ?? 'not_fixed');
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const ready = description.trim().length >= MIN_DESCRIPTION;

  async function submit() {
    setSending(true);
    try {
      const report = await reportProblem({ jobId: id, kind, description: description.trim() });
      await uploadMedia({ problemReportId: report.id }, media);
      setSent(true);
    } catch (e) {
      Alert.alert('Could not send your report', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Screen
        fixed
        contentStyle={{ justifyContent: 'center', gap: Spacing.four }}
        footer={
          <Footer>
            <Button label="Back to my jobs" onPress={() => router.replace('/my-jobs')} />
          </Footer>
        }>
        <View style={[styles.doneIcon, { backgroundColor: c.successTint }]}>
          <CircleCheck size={36} color={c.success} strokeWidth={2.2} />
        </View>
        <T variant="title1" style={{ textAlign: 'center' }}>
          {"We're on it"}
        </T>
        <T variant="callout" color="inkMuted" style={{ textAlign: 'center' }}>
          {"The Relay team will be in touch within one working day. The pro isn't paid for this job until it's sorted."}
        </T>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Footer>
          <Button label="Send report" disabled={!ready} loading={sending} onPress={submit} />
        </Footer>
      }>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <T variant="caption" color="inkSubtle">
            RELAY GUARANTEE
          </T>
          <T variant="headline" numberOfLines={1}>
            {job ?? 'Report a problem'}
          </T>
        </View>
      </View>

      <View style={{ gap: Spacing.three }}>
        <T variant="title1" accessibilityRole="header">
          What went wrong?
        </T>
        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          {PROBLEM_KINDS.map((p) => (
            <Card key={p.kind} selected={kind === p.kind} onPress={() => setKind(p.kind)} style={styles.option}>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="headline">{p.label}</T>
                <T variant="footnote" color="inkMuted">
                  {p.detail}
                </T>
              </View>
              <Radio on={kind === p.kind} />
            </Card>
          ))}
        </View>
      </View>

      <View style={{ gap: Spacing.three }}>
        <T variant="title2" accessibilityRole="header">
          Tell us more
        </T>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
          placeholder="What happened, and when did you notice it?"
          placeholderTextColor={c.inkSubtle}
          accessibilityLabel="Describe the problem"
          style={[Type.callout, styles.notes, Shadows.card, { backgroundColor: c.surface, color: c.ink }]}
        />
        <MediaPicker value={media} onChange={setMedia} />
      </View>

      <View style={[styles.how, { backgroundColor: c.surfaceMuted }]}>
        <T variant="headline">How the guarantee works</T>
        <Note icon={RotateCcw}>{"If the work wasn't right, we send the pro back to fix it for free."}</Note>
        <Note icon={Undo2}>{"If that can't happen, we refund you."}</Note>
        <Note icon={Clock}>{`You can report a problem for ${PILOT.guaranteeDays} days after the job.`}</Note>
        <Note icon={ShieldCheck}>Only jobs booked and paid in Relay are covered.</Note>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  notes: { minHeight: 110, borderRadius: Radii.md, padding: Spacing.four, textAlignVertical: 'top' },
  how: { borderRadius: Radii.md, padding: Spacing.four, gap: Spacing.three },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
