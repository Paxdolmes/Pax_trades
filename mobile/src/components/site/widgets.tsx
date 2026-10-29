// Bigger building blocks shared by the website's pages: the postcode checker,
// FAQ accordion, call-to-action band, trust strip and the hero's phone mockup.
import { router } from 'expo-router';
import { ArrowRight, BadgeCheck, Car, CircleCheck, House, MailPlus, MapPin, MessageCircle, Plus, ShieldCheck, Star, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { RelayMark } from '@/components/brand';
import { T } from '@/components/ui';
import { Radii, SoftShadows, Spacing, Type, usePalette } from '@/constants/theme';
import { COMING_SOON, LAUNCH_OUTWARD_CODES } from '@/domain/catalog';
import { isInLaunchArea, outwardCode } from '@/domain/rules';
import { TRUST_ITEMS, type Faq } from '@/content/site';
import { sendEnquiry } from '@/lib/contact';
import { WAITLIST } from '@/lib/launch';

import { ArrowLink, Container, Grid, H2, Lead, MAIN_CTA, MarkTile, Pill, SiteIcon, useBreakpoint } from './frame';

/** "Check my area": covered postcodes go on to booking (the waiting list until Relay
 *  opens), others can join the waitlist for their area. */
export function PostcodeCheck({ next = '/home', stacked }: { next?: string; stacked?: boolean }) {
  const c = usePalette();
  const narrow = useBreakpoint().narrow || stacked;
  const [value, setValue] = useState('');
  const [result, setResult] = useState<null | 'covered' | 'waitlist' | 'invalid'>(null);
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const postcode = value.trim().toUpperCase();

  function check() {
    if (outwardCode(postcode) === null) return setResult('invalid');
    setResult(isInLaunchArea(postcode, LAUNCH_OUTWARD_CODES) ? 'covered' : 'waitlist');
  }

  async function join() {
    setSending(true);
    setError(null);
    try {
      await sendEnquiry({ kind: 'waitlist', email, postcode });
      setJoined(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={{ gap: Spacing.three, width: '100%', maxWidth: 520 }}>
      <View style={[styles.postcodeBox, SoftShadows.soft, { backgroundColor: c.surface, borderRadius: narrow ? 24 : Radii.pill }, narrow && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={styles.postcodeField}>
          <MapPin size={20} color={c.accentStrong} strokeWidth={2.2} />
          <TextInput
            value={value}
            onChangeText={(v) => {
              setValue(v);
              setResult(null);
            }}
            onSubmitEditing={check}
            placeholder="Enter your postcode"
            placeholderTextColor={c.inkSubtle}
            autoCapitalize="characters"
            autoComplete="postal-code"
            accessibilityLabel="Your postcode"
            returnKeyType="search"
            style={[Type.bodyStrong, styles.postcodeInput, { color: c.ink }]}
          />
        </View>
        <Pill label="Check my area" size="lg" onPress={check} />
      </View>

      {result === 'covered' ? (
        <View style={[styles.result, { backgroundColor: c.accentTint }]}>
          <CircleCheck size={20} color={c.accentStrong} />
          <T variant="bodyStrong" style={{ flex: 1 }}>
            {WAITLIST ? `Good news, we’re opening in ${outwardCode(postcode)} first.` : `Good news, we cover ${postcode}.`}
          </T>
          {WAITLIST ? (
            <ArrowLink label="Join the waiting list" href={{ pathname: '/waitlist', params: { postcode } }} />
          ) : (
            <ArrowLink label="Book a job" href={{ pathname: next as '/home', params: { postcode } }} />
          )}
        </View>
      ) : null}
      {result === 'waitlist' ? (
        <View style={[styles.result, { backgroundColor: c.urgentTint, flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'center' }}>
            <MailPlus size={20} color={c.urgent} />
            <T variant="bodyStrong" style={{ flex: 1 }}>
              {joined ? `You're on the list. We'll email you the day Relay reaches ${outwardCode(postcode)}.` : `We're not in ${postcode} yet. Join the waitlist and we'll tell you first.`}
            </T>
          </View>
          {joined ? null : (
            <View style={[{ flexDirection: 'row', gap: Spacing.two }, narrow && { flexDirection: 'column' }]}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Your email"
                placeholderTextColor={c.inkSubtle}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                accessibilityLabel="Your email"
                style={[Type.callout, styles.smallInput, { backgroundColor: c.surface, color: c.ink }]}
              />
              <Pill label={sending ? 'Joining…' : 'Join the waitlist'} variant="primary" onPress={email.includes('@') && !sending ? join : undefined} />
            </View>
          )}
          {error ? (
            <T variant="footnote" color="danger">
              {error}
            </T>
          ) : null}
        </View>
      ) : null}
      {result === 'invalid' ? (
        <T variant="subhead" color="urgent" style={{ paddingHorizontal: Spacing.two }}>
          Please enter a full UK postcode, like SW6 4UL.
        </T>
      ) : null}
    </View>
  );
}

export function FaqList({ items }: { items: Faq[] }) {
  const c = usePalette();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={{ gap: Spacing.three }}>
      {items.map((item, i) => {
        const on = open === i;
        return (
          <View key={item.q} style={[styles.faq, SoftShadows.soft, { backgroundColor: c.surface }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: on }}
              onPress={() => setOpen(on ? null : i)}
              style={styles.faqButton}>
              <T variant="headline" style={{ flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '600' }}>
                {item.q}
              </T>
              <View style={[styles.faqIcon, { backgroundColor: c.accentTint, transform: [{ rotate: on ? '45deg' : '0deg' }] }]}>
                <Plus size={16} color={c.accentStrong} strokeWidth={2.4} />
              </View>
            </Pressable>
            {on ? (
              <T variant="body" color="inkMuted" style={{ paddingHorizontal: Spacing.six, paddingBottom: Spacing.six, maxWidth: 680 }}>
                {item.a}
              </T>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const CTA_SUB = WAITLIST
  ? 'Relay opens soon in Fulham. Join the waiting list and we’ll tell you the day you can book.'
  : 'Tell us what’s wrong and we’ll send a vetted local pro. See the price before you book.';

export function CtaBand({ title = 'Something need fixing?', sub = CTA_SUB }: { title?: string; sub?: string }) {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  return (
    <Container style={{ paddingVertical: narrow ? 56 : 88 }}>
      <View style={[styles.cta, { backgroundColor: c.accentTint, paddingVertical: narrow ? 56 : 80 }]}>
        <MarkTile />
        <H2 style={{ textAlign: 'center', fontWeight: '800', fontSize: narrow ? 32 : 46, lineHeight: narrow ? 36 : 52 }}>{title}</H2>
        <Lead style={{ textAlign: 'center', maxWidth: 560 }}>{sub}</Lead>
        <Pill label={MAIN_CTA.label} href={MAIN_CTA.href} variant={WAITLIST ? 'teal' : 'primary'} size="lg" icon={ArrowRight} trailing />
        {WAITLIST ? (
          <View>
            <ArrowLink label="See how booking will work" href="/home" />
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
          <T variant="callout" color="inkMuted">
            Are you a tradesperson?
          </T>
          <Pressable accessibilityRole="link" onPress={() => router.navigate('/for-tradespeople')}>
            <T variant="callout" color="accentStrong" style={{ fontWeight: '700', textDecorationLine: 'underline' }}>
              Join Relay Traders
            </T>
          </Pressable>
        </View>
      </View>
    </Container>
  );
}

export function TrustStrip() {
  const c = usePalette();
  return (
    <Container>
      <View style={[styles.trust, SoftShadows.soft, { backgroundColor: c.surface }]}>
        <Grid columns={{ narrow: 2, medium: 2, wide: 4 }} gap={Spacing.five}>
          {TRUST_ITEMS.map(({ icon, label }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
              <SiteIcon icon={icon} size={40} />
              <T variant="bodyStrong" style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>
                {label}
              </T>
            </View>
          ))}
        </Grid>
      </View>
    </Container>
  );
}

/** A Relay booking on a phone: a map, the pro on their way and the price. */
export function BookingMockup() {
  const c = usePalette();
  const { width } = useBreakpoint();
  const chips = width >= 400;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Example Relay booking on a phone" style={styles.mockWrap}>
      <View style={[styles.mockBackdrop, { backgroundColor: c.accentTint }]} />
      <View style={[styles.phone, SoftShadows.lift, { backgroundColor: c.ink }]}>
        <View style={[styles.screen, { backgroundColor: c.bg }]}>
          <View style={styles.phoneTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <RelayMark size={24} />
              <T variant="headline" style={{ fontWeight: '800' }}>
                relay
              </T>
            </View>
            <View style={[styles.tag, { backgroundColor: c.accentTint }]}>
              <T variant="caption" color="accentStrong">
                On the way
              </T>
            </View>
          </View>
          <MapArt />
          <View style={[styles.sheet, { backgroundColor: c.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
              <View style={[styles.avatar, { backgroundColor: c.urgentTint }]}>
                <T variant="title2" color="urgent">
                  S
                </T>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <T variant="headline">Sam</T>
                  <BadgeCheck size={16} color={c.accentStrong} />
                </View>
                <T variant="footnote" color="inkMuted">
                  Gas Safe engineer
                </T>
              </View>
              <View style={[styles.rating, { backgroundColor: c.surfaceMuted }]}>
                <Star size={13} color={c.urgent} fill={c.urgent} />
                <T variant="subhead" style={{ fontWeight: '600' }}>
                  4.9
                </T>
              </View>
            </View>
            <View style={[styles.eta, { backgroundColor: c.accentTint }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T variant="subhead">Arriving in</T>
                <T variant="title2">18 min</T>
              </View>
              <View style={[styles.track, { backgroundColor: c.surface }]}>
                <View style={[styles.trackFill, { backgroundColor: c.accentStrong }]} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={[styles.priceChip, { backgroundColor: c.ink }]}>
                <T variant="caption" color="onBrand">
                  £95 including the first hour
                </T>
              </View>
              <View style={[styles.chatDot, { backgroundColor: c.surfaceMuted }]}>
                <MessageCircle size={16} color={c.ink} />
              </View>
            </View>
          </View>
        </View>
      </View>
      {chips ? (
        <>
          <FloatChip icon={ShieldCheck} label="ID & Gas Safe checked" style={{ top: 72, left: 0 }} />
          <FloatChip icon={Wallet} label="Pay when it's fixed" style={{ bottom: 64, right: 0 }} />
        </>
      ) : null}
    </View>
  );
}

function FloatChip({ icon: Icon, label, style }: { icon: typeof ShieldCheck; label: string; style: object }) {
  const c = usePalette();
  return (
    <View style={[styles.floatChip, SoftShadows.lift, { backgroundColor: c.surface }, style]}>
      <View style={[styles.floatIcon, { backgroundColor: c.accentTint }]}>
        <Icon size={15} color={c.accentStrong} />
      </View>
      <T variant="subhead" style={{ fontWeight: '600' }}>
        {label}
      </T>
    </View>
  );
}

function MapArt() {
  const c = usePalette();
  const road = { position: 'absolute' as const, backgroundColor: 'rgba(255,255,255,0.8)' };
  return (
    <View style={[styles.map, { backgroundColor: c.accentTint }]}>
      <View style={[road, { top: 40, left: 0, right: 0, height: 20 }]} />
      <View style={[road, { top: 128, left: 0, right: 0, height: 16 }]} />
      <View style={[road, { top: 0, bottom: 0, left: 64, width: 16 }]} />
      <View style={[road, { top: 0, bottom: 0, left: 192, width: 20 }]} />
      <View style={{ position: 'absolute', top: 80, left: 96, width: 64, height: 32, borderRadius: 12, backgroundColor: c.urgentTint }} />
      <View style={{ position: 'absolute', top: 160, left: 224, width: 56, height: 40, borderRadius: 12, backgroundColor: c.urgentTint }} />
      <View style={[styles.route, { borderColor: c.accentStrong }]} />
      <View style={[styles.pin, { top: 20, left: 44, backgroundColor: c.accentStrong, borderColor: c.surface }]}>
        <Car size={16} color="#FFFFFF" />
      </View>
      <View style={[styles.pin, { top: 118, left: 186, width: 44, height: 44, borderRadius: 22, backgroundColor: c.ink, borderColor: c.surface }]}>
        <House size={16} color="#FFFFFF" />
      </View>
    </View>
  );
}

/** The trades we're adding next: a quiet line under the four we offer now. */
export function ComingSoon({ center }: { center?: boolean }) {
  const c = usePalette();
  return (
    <View style={[styles.soon, center && { justifyContent: 'center' }]}>
      <T variant="subhead" color="inkMuted" style={{ fontWeight: '700' }}>
        Coming soon
      </T>
      {COMING_SOON.map((s) => (
        <View key={s} style={[styles.soonChip, { borderColor: c.border }]}>
          <T variant="subhead" color="inkMuted">
            {s}
          </T>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  soon: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  soonChip: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 4 },
  postcodeBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two },
  postcodeField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, minHeight: 48 },
  postcodeInput: { flex: 1, height: 48, padding: 0, outlineStyle: 'none' } as object,
  smallInput: { flex: 1, height: 44, borderRadius: Radii.pill, paddingHorizontal: Spacing.four },
  result: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.three, borderRadius: Radii.md, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  faq: { borderRadius: 24 },
  faqButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, paddingHorizontal: Spacing.six, paddingVertical: Spacing.five },
  faqIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cta: { alignItems: 'center', gap: Spacing.six, borderRadius: 28, paddingHorizontal: Spacing.six },
  trust: { borderRadius: 24, padding: Spacing.six },
  mockWrap: { width: '100%', alignItems: 'center', paddingVertical: Spacing.six },
  mockBackdrop: { position: 'absolute', left: 32, right: 32, top: 48, bottom: 0, borderRadius: 28 },
  phone: { width: 310, borderRadius: 44, padding: 10 },
  screen: { borderRadius: 36, overflow: 'hidden' },
  phoneTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.five, paddingTop: Spacing.five, paddingBottom: Spacing.three },
  tag: { borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  map: { height: 208, overflow: 'hidden' },
  route: { position: 'absolute', top: 48, left: 68, width: 128, height: 88, borderLeftWidth: 4, borderBottomWidth: 4, borderStyle: 'dashed', borderBottomLeftRadius: 24 },
  pin: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  sheet: { marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: Spacing.five, paddingTop: Spacing.five, paddingBottom: Spacing.six, gap: Spacing.four },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radii.pill, paddingHorizontal: 8, paddingVertical: 4 },
  eta: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  track: { height: 8, borderRadius: 4 },
  trackFill: { height: 8, width: '66%', borderRadius: 4 },
  priceChip: { borderRadius: Radii.pill, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  chatDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  floatChip: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 16, paddingVertical: 10, paddingLeft: 10, paddingRight: Spacing.four },
  floatIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
