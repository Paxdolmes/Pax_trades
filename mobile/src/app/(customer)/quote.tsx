import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, BellRing, Building2, Check, ChevronLeft, CircleHelp, Plus, Send, ShieldCheck } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { MediaPicker } from '@/components/media-picker';
import { TRADE_ICONS } from '@/components/trade-icons';
import { Button, Card, Footer, IconButton, IconTile, Note, Radio, Screen, T } from '@/components/ui';
import { Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import { OFFERED_TRADES, PILOT, QUOTE_TIMING_LABELS, type QuoteTiming, type Trade } from '@/domain/catalog';
import { uploadMedia, type PickedMedia } from '@/lib/media';
import { useAccountGate } from '@/lib/auth';
import { WAITLIST } from '@/lib/launch';
import { useLive } from '@/lib/live';
import { loadMyProperty } from '@/lib/properties';
import { createQuoteRequest } from '@/lib/quotes';

const MIN_DESCRIPTION = 10;

const TRADE_CHOICES = OFFERED_TRADES.map((t) => ({ id: t.id, label: t.short, icon: TRADE_ICONS[t.id] }));

// Tapping one adds it as a line to fill in, so quotes are based on the same facts.
const PROMPTS = ['Where in the home', 'Size or how many', 'What’s there now', 'Parts you already have', 'Access and parking'];

const TIMING_DETAIL: Record<QuoteTiming, string> = {
  asap: 'Pros who can come in the next day or two',
  this_week: 'Within the next 7 days',
  flexible: 'Get the best price and pick a date later',
};

export default function QuoteRequest() {
  const c = usePalette();
  const params = useLocalSearchParams<{ postcode: string; property?: string; propertyName?: string }>();
  // A tenant can send the request to their landlord, who picks a quote and pays.
  // A manager asking for one of their properties arrives with it.
  const { data: home } = useLive(loadMyProperty, null);
  const [toLandlord, setToLandlord] = useState(true);
  const tenantHome = !params.property && home && toLandlord ? home : null;
  const propertyId = params.property ?? tenantHome?.id ?? null;
  const postcode = tenantHome?.postcode ?? params.postcode;
  const [description, setDescription] = useState('');
  const input = useRef<TextInputInstance>(null);
  const addPrompt = (p: string) => {
    setDescription((d) => `${d.trimEnd()}${d.trim() ? '\n' : ''}${p}: `);
    input.current?.focus();
  };
  const [trades, setTrades] = useState<Trade[]>([]);
  const [timing, setTiming] = useState<QuoteTiming>('this_week');
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const signedIn = useAccountGate();
  const ready = description.trim().length >= MIN_DESCRIPTION;

  const toggle = (t: Trade) => setTrades((all) => (all.includes(t) ? all.filter((x) => x !== t) : [...all, t]));

  async function submit() {
    if (!signedIn()) return;
    setSubmitting(true);
    try {
      const { id } = await createQuoteRequest({ trades, postcode, description: description.trim(), timing, propertyId });
      // The request is in either way; don't let a failed photo upload send it twice.
      await uploadMedia({ quoteRequestId: id }, media).catch(() =>
        Alert.alert('Your request is sent', "Your photos didn't upload. You can show them to the pro you pick in the chat."),
      );
      router.replace({ pathname: '/quotes/[id]', params: { id, description: description.trim() } });
    } catch (e) {
      Alert.alert('Could not send your request', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Until Relay opens, the last step is the waiting list, with the job noted.
  const waitlistFooter = (
    <Footer>
      <Note icon={BellRing}>Quotes open soon. Join the waiting list and we’ll tell you the day you can ask for these.</Note>
      <Button
        label="Join the waiting list"
        trailingIcon={ArrowRight}
        onPress={() =>
          router.push({ pathname: '/waitlist', params: { postcode: postcode ?? '', quote: description.trim().slice(0, 300) || 'Something else', ...(trades.length === 1 ? { trade: trades[0] } : {}) } })
        }
      />
    </Footer>
  );

  return (
    <Screen
      footer={
        WAITLIST ? waitlistFooter : (
        <Footer>
          {tenantHome ? (
            <Note icon={Building2}>{`Vetted pros quote, then ${tenantHome.managerName} picks one and pays the bill. There's nothing for you to pay.`}</Note>
          ) : (
            <Note icon={ShieldCheck}>Only vetted, insured pros can quote. Asking is free, quotes include VAT and fees, and you only pay for the one you accept.</Note>
          )}
          <Button label={tenantHome ? `Get quotes for ${tenantHome.managerName}` : 'Get quotes'} icon={Send} disabled={!ready} loading={submitting} onPress={submit} />
        </Footer>
        )
      }>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
        <View>
          <T variant="caption" color="inkSubtle">
            {params.propertyName ? `${params.propertyName} · ${postcode}` : postcode}
          </T>
          <T variant="headline">Something else</T>
        </View>
      </View>

      {home && !params.property ? (
        <Card selected={toLandlord} onPress={() => setToLandlord(!toLandlord)} style={styles.option} accessibilityLabel={`Send to ${home.managerName} to pick a quote and pay`}>
          <IconTile icon={Building2} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="headline">{`Send to ${home.managerName}`}</T>
            <T variant="footnote" color="inkMuted">
              {toLandlord ? `For ${home.name}. They pick a quote and pay the bill.` : "Off: you're choosing and paying for this yourself."}
            </T>
          </View>
          <Radio on={toLandlord} />
        </Card>
      ) : null}

      <View style={{ gap: Spacing.three }}>
        <T variant="title1" accessibilityRole="header">
          What do you need doing?
        </T>
        <TextInput
          ref={input}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
          placeholder="e.g. Move a radiator to the other wall in the bathroom and fit a towel rail in its place."
          placeholderTextColor={c.inkSubtle}
          accessibilityLabel="Describe the job"
          style={[Type.callout, styles.notes, Shadows.card, { backgroundColor: c.surface, color: c.ink }]}
        />
        <View style={{ gap: Spacing.two }}>
          <T variant="footnote" color="inkMuted">
            Pros quote more accurately with these. Tap to add any that apply:
          </T>
          <View style={styles.chips}>
            {PROMPTS.map((p) => {
              const done = description.includes(`${p}:`);
              return (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  accessibilityLabel={done ? `${p}, added` : `Add ${p}`}
                  disabled={done}
                  onPress={() => addPrompt(p)}
                  style={[styles.prompt, { borderColor: done ? c.success : c.border, backgroundColor: done ? c.successTint : c.surface }]}>
                  {done ? <Check size={14} color={c.success} strokeWidth={3} /> : <Plus size={14} color={c.inkMuted} strokeWidth={2.5} />}
                  <T variant="footnote" color={done ? 'success' : 'ink'} style={{ fontWeight: '600' }}>
                    {p}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </View>
        <MediaPicker value={media} onChange={setMedia} />
      </View>

      <View style={{ gap: Spacing.three }}>
        <T variant="title2" accessibilityRole="header">
          Who should quote?
        </T>
        <View style={styles.chips}>
          {TRADE_CHOICES.map((t) => {
            const on = trades.includes(t.id);
            return (
              <Pressable
                key={t.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggle(t.id)}
                style={[styles.chip, { borderColor: on ? c.brand : c.border, backgroundColor: on ? c.brandTint : c.surface }]}>
                {on ? <Check size={16} color={c.brand} strokeWidth={3} /> : <t.icon size={16} color={c.inkMuted} strokeWidth={2.25} />}
                <T variant="subhead" color={on ? 'brand' : 'ink'} style={{ fontWeight: '600' }}>
                  {t.label}
                </T>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: trades.length === 0 }}
            onPress={() => setTrades([])}
            style={[
              styles.chip,
              { borderColor: trades.length === 0 ? c.brand : c.border, backgroundColor: trades.length === 0 ? c.brandTint : c.surface },
            ]}>
            <CircleHelp size={16} color={trades.length === 0 ? c.brand : c.inkMuted} strokeWidth={2.25} />
            <T variant="subhead" color={trades.length === 0 ? 'brand' : 'ink'} style={{ fontWeight: '600' }}>
              Not sure
            </T>
          </Pressable>
        </View>
        <T variant="footnote" color="inkMuted">
          {trades.length === 0
            ? `Vetted local pros can quote. We stop at ${PILOT.maxQuotesPerRequest} quotes so you get a short list, not a flood.`
            : `Vetted pros nearby in the trades you picked can quote. We stop at ${PILOT.maxQuotesPerRequest} quotes so you get a short list, not a flood.`}
        </T>
      </View>

      <View style={{ gap: Spacing.three }}>
        <T variant="title2" accessibilityRole="header">
          When?
        </T>
        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          {(Object.keys(QUOTE_TIMING_LABELS) as QuoteTiming[]).map((t) => (
            <Card key={t} selected={timing === t} onPress={() => setTiming(t)} style={styles.option}>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="headline">{QUOTE_TIMING_LABELS[t]}</T>
                <T variant="footnote" color="inkMuted">
                  {TIMING_DETAIL[t]}
                </T>
              </View>
              <Radio on={timing === t} />
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  notes: { minHeight: 120, borderRadius: Radii.md, padding: Spacing.four, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: Radii.pill, borderWidth: 1.5 },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 12, borderRadius: Radii.pill, borderWidth: 1 },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
