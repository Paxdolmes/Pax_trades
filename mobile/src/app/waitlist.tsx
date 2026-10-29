// The waiting list, until Relay opens: the website's Book buttons, and the last step
// of every booking screen, come here. Sign-ups land in the enquiries table and the
// Relay inbox. A trade, job or postcode picked on the way arrives filled in.
import { useLocalSearchParams } from 'expo-router';
import { BellRing, CircleCheck, Eye, HardHat, Send } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';

import { ArrowLink, Container, H2, H3, Lead, linkProps, PageIntro, Pill, SiteIcon, SitePage, useBreakpoint } from '@/components/site/frame';
import { TRADE_ICONS } from '@/components/trade-icons';
import { T, type LucideIcon } from '@/components/ui';
import { Radii, SoftShadows, Spacing, Type, usePalette } from '@/constants/theme';
import { JOB_TYPES, OFFERED_TRADES, type Trade } from '@/domain/catalog';
import { outwardCode } from '@/domain/rules';
import { useAuth } from '@/lib/auth';
import { sendEnquiry } from '@/lib/contact';

const OTHER = 'Something else';

export default function Waitlist() {
  const c = usePalette();
  const { wide, narrow } = useBreakpoint();
  const scroll = useRef<ScrollViewInstance>(null);
  return (
    <SitePage title="Join the waiting list" scrollRef={scroll}>
      <PageIntro
        eyebrow="Opening soon"
        title="Join the waiting list"
        sub="Relay opens soon in Fulham. Leave your email and we’ll tell you the day you can book a vetted local pro."
      />
      <Container style={{ paddingBottom: 88 }}>
        <View style={[{ flexDirection: 'row', gap: Spacing.six, alignItems: 'flex-start' }, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flex: wide ? 1.4 : undefined }}>
            <SignUpForm onJoined={() => scroll.current?.scrollTo({ y: 0, animated: true })} />
          </View>
          <View style={[styles.next, { backgroundColor: c.accentTint, flex: wide ? 1 : undefined, padding: narrow ? Spacing.six : Spacing.eight }]}>
            <H3>What happens next</H3>
            <NextStep icon={BellRing} title="One email when we open" text="We’ll write once, the day you can book in your area. No spam." />
            <NextStep icon={Eye} title="Look around until then" text="Every booking screen is open, so you can see how it will work.">
              <ArrowLink label="See how booking will work" href="/home" />
            </NextStep>
            <NextStep icon={HardHat} title="Are you a tradesperson?" text="Apply to join Relay Traders and get local jobs from day one.">
              <ArrowLink label="Join Relay Traders" href="/for-tradespeople" />
            </NextStep>
          </View>
        </View>
      </Container>
    </SitePage>
  );
}

function SignUpForm({ onJoined }: { onJoined: () => void }) {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  const { profile, session } = useAuth();
  // Filled in from wherever they came from: a trade's page, a job, a quote request.
  const params = useLocalSearchParams<{ postcode?: string; trade?: Trade; job?: string; urgent?: string; quote?: string }>();
  const job = JOB_TYPES.find((j) => j.id === params.job && j.trade === params.trade);
  const [name, setName] = useState(profile?.fullName ?? '');
  const [email, setEmail] = useState(session?.user.email ?? '');
  const [postcode, setPostcode] = useState(params.postcode?.toUpperCase() ?? '');
  const [needs, setNeeds] = useState<string[]>(() => {
    const t = OFFERED_TRADES.find((x) => x.id === params.trade);
    return t ? [t.service] : params.quote ? [OTHER] : [];
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const district = outwardCode(postcode.trim());
  const ready = /\S+@\S+\.\S+/.test(email) && district !== null;
  const toggle = (n: string) => setNeeds((all) => (all.includes(n) ? all.filter((x) => x !== n) : [...all, n]));

  async function join() {
    setSending(true);
    setError(null);
    try {
      const message = job ? `Was booking: ${job.label}${params.urgent ? ' (urgent)' : ''}` : params.quote ? `Was asking for quotes: ${params.quote}` : undefined;
      await sendEnquiry({ kind: 'waitlist', name: name.trim() || undefined, email, postcode, topic: needs.join(', ') || undefined, message });
      setSent(true);
      onJoined();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  const input = [Type.body, styles.input, { backgroundColor: c.bg, borderColor: c.border, color: c.ink }];
  const box = [styles.form, SoftShadows.soft, { backgroundColor: c.surface, padding: narrow ? Spacing.six : Spacing.eight }];

  if (sent) {
    return (
      <View style={[box, { alignItems: 'flex-start' }]}>
        <SiteIcon icon={CircleCheck} size={56} />
        <H2 style={{ fontSize: 28, lineHeight: 34 }}>You’re on the list</H2>
        <Lead>{`We’ll email ${email.trim()} the day you can book in ${district}.`}</Lead>
        <ArrowLink label="See how booking will work" href="/home" />
      </View>
    );
  }

  return (
    <View style={box}>
      {job ? (
        <View style={[styles.picked, { backgroundColor: c.accentTint }]}>
          <T variant="subhead" color="inkMuted">
            You were booking
          </T>
          <T variant="headline">{`${job.label}${params.urgent ? ' (urgent)' : ''}`}</T>
        </View>
      ) : null}
      <View style={[{ flexDirection: 'row', gap: Spacing.four }, narrow && { flexDirection: 'column' }]}>
        <Field label="Email" style={{ flex: narrow ? undefined : 1 }}>
          <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" accessibilityLabel="Email" style={input} />
        </Field>
        <Field label="Postcode" style={{ flex: narrow ? undefined : 0.6 }}>
          <TextInput
            value={postcode}
            onChangeText={(v) => setPostcode(v.toUpperCase())}
            placeholder="SW6 1AA"
            placeholderTextColor={c.inkSubtle}
            autoCapitalize="characters"
            autoComplete="postal-code"
            accessibilityLabel="Postcode"
            style={input}
          />
        </Field>
      </View>
      <Field label="Your name (optional)">
        <TextInput value={name} onChangeText={setName} autoComplete="name" accessibilityLabel="Your name" style={input} />
      </Field>
      <Field label="What might you need? (optional)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {[...OFFERED_TRADES.map((t) => ({ label: t.service, icon: TRADE_ICONS[t.id] as LucideIcon | null })), { label: OTHER, icon: null }].map(({ label, icon: Icon }) => {
            const on = needs.includes(label);
            return (
              <Pressable
                key={label}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggle(label)}
                style={[styles.chip, { backgroundColor: on ? c.accentTint : c.bg, borderColor: on ? c.accentStrong : c.border }]}>
                {Icon ? <Icon size={15} color={on ? c.accentStrong : c.inkMuted} strokeWidth={2.2} /> : null}
                <T variant="subhead" style={{ fontWeight: on ? '700' : '500' }}>
                  {label}
                </T>
              </Pressable>
            );
          })}
        </View>
      </Field>
      {error ? (
        <T variant="footnote" color="danger">
          {error}
        </T>
      ) : null}
      <View style={{ gap: Spacing.three }}>
        <Pill
          label={sending ? 'Joining…' : 'Join the waiting list'}
          variant="teal"
          icon={Send}
          size="lg"
          onPress={ready && !sending ? join : undefined}
          style={[{ alignSelf: narrow ? 'stretch' : 'flex-start' }, !ready && { opacity: 0.45 }]}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 4 }}>
          <T variant="footnote" color="inkMuted">
            We only use your details to tell you when Relay opens.
          </T>
          <Pressable {...linkProps('/privacy')}>
            <T variant="footnote" color="accentStrong" style={{ fontWeight: '700', textDecorationLine: 'underline' }}>
              Privacy policy
            </T>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function NextStep({ icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.four, alignItems: 'flex-start' }}>
      <SiteIcon icon={icon} tone="white" size={44} />
      <View style={{ flex: 1, gap: Spacing.one }}>
        <T variant="headline">{title}</T>
        <T variant="body" color="inkMuted">
          {text}
        </T>
        {children ? <View style={{ marginTop: Spacing.one }}>{children}</View> : null}
      </View>
    </View>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[{ gap: Spacing.two }, style]}>
      <T variant="subhead" style={{ fontWeight: '600' }}>
        {label}
      </T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { borderRadius: 28, gap: Spacing.five },
  input: { height: 48, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.four },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  picked: { borderRadius: Radii.md, padding: Spacing.four, gap: 2 },
  next: { borderRadius: 28, gap: Spacing.six },
});
