import { CircleCheck, MapPin, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Container, H2, H3, isHovered, Lead, PageIntro, Pill, SiteIcon, SitePage, useBreakpoint } from '@/components/site/frame';
import { FaqList, PostcodeCheck } from '@/components/site/widgets';
import { T } from '@/components/ui';
import { Radii, SoftShadows, Spacing, Type, usePalette } from '@/constants/theme';
import { FAQ_GROUPS, HELP_TOPICS } from '@/content/site';
import { useAuth } from '@/lib/auth';
import { sendEnquiry } from '@/lib/contact';

export default function Help() {
  const c = usePalette();
  const { wide } = useBreakpoint();
  const [group, setGroup] = useState(FAQ_GROUPS[0].id);
  const current = FAQ_GROUPS.find((g) => g.id === group) ?? FAQ_GROUPS[0];
  return (
    <SitePage title="Help">
      <PageIntro eyebrow="Help" title="How can we help?" sub="Answers to the questions we hear most. Can’t find yours? Send us a message below." />
      <Container style={{ gap: Spacing.six, paddingBottom: Spacing.ten }}>
        <View style={styles.tabs}>
          {FAQ_GROUPS.map((g) => {
            const on = g.id === group;
            return (
              <Pressable
                key={g.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setGroup(g.id)}
                style={(state) => [styles.tab, { backgroundColor: on ? c.ink : isHovered(state) ? c.accentTint : c.surface, borderColor: on ? c.ink : c.border }]}>
                <T variant="subhead" color={on ? 'onBrand' : 'ink'} style={{ fontWeight: '600', fontSize: 15 }}>
                  {g.title}
                </T>
              </Pressable>
            );
          })}
        </View>
        <FaqList key={current.id} items={current.items} />
      </Container>
      <Container style={{ paddingBottom: 88 }}>
        <View style={[{ flexDirection: 'row', gap: Spacing.six, alignItems: 'flex-start' }, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flex: wide ? 1.4 : undefined }}>
            <ContactForm />
          </View>
          <View style={[styles.areas, { backgroundColor: c.accentTint, flex: wide ? 1 : undefined }]}>
            <SiteIcon icon={MapPin} tone="white" />
            <H3>Areas we cover</H3>
            <T variant="body" color="inkMuted">
              We’re live across Fulham (every SW6 postcode). Check yours, or join the waitlist for your area.
            </T>
            <PostcodeCheck stacked />
          </View>
        </View>
      </Container>
    </SitePage>
  );
}

function ContactForm() {
  const c = usePalette();
  const { narrow } = useBreakpoint();
  const { profile, session } = useAuth();
  const [name, setName] = useState(profile?.fullName ?? '');
  const [email, setEmail] = useState(session?.user.email ?? '');
  const [topic, setTopic] = useState(HELP_TOPICS[0]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email) && message.trim().length >= 5;

  async function send() {
    setSending(true);
    setError(null);
    try {
      await sendEnquiry({ kind: 'help', name, email, topic, message });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  const input = [Type.body, styles.input, { backgroundColor: c.bg, borderColor: c.border, color: c.ink }];

  if (sent) {
    return (
      <View style={[styles.form, SoftShadows.soft, { backgroundColor: c.surface, alignItems: 'flex-start' }]}>
        <SiteIcon icon={CircleCheck} size={56} />
        <H2 style={{ fontSize: 28, lineHeight: 34 }}>Thanks, we’ll be in touch soon</H2>
        <Lead>{`We’ve got your message and will reply to ${email.trim()} within one working day.`}</Lead>
        <Pill
          label="Send another message"
          variant="secondary"
          onPress={() => {
            setMessage('');
            setSent(false);
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.form, SoftShadows.soft, { backgroundColor: c.surface, padding: narrow ? Spacing.six : Spacing.eight }]}>
      <View style={{ gap: Spacing.two }}>
        <H2 style={{ fontSize: 28, lineHeight: 34 }}>Still need help?</H2>
        <Lead style={{ fontSize: 16, lineHeight: 24 }}>Send us a message and we’ll reply within one working day.</Lead>
      </View>
      <View style={[{ flexDirection: 'row', gap: Spacing.four }, narrow && { flexDirection: 'column' }]}>
        <Field label="Your name" style={{ flex: 1 }}>
          <TextInput value={name} onChangeText={setName} autoComplete="name" accessibilityLabel="Your name" style={input} />
        </Field>
        <Field label="Email" style={{ flex: 1 }}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email"
            style={input}
          />
        </Field>
      </View>
      <Field label="What’s it about?">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {HELP_TOPICS.map((t) => {
            const on = t === topic;
            return (
              <Pressable
                key={t}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setTopic(t)}
                style={[styles.topic, { backgroundColor: on ? c.accentTint : c.bg, borderColor: on ? c.accentStrong : c.border }]}>
                <T variant="subhead" style={{ fontWeight: on ? '700' : '500' }}>
                  {t}
                </T>
              </Pressable>
            );
          })}
        </View>
      </Field>
      <Field label="Message">
        <TextInput
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          maxLength={4000}
          placeholder="Tell us what’s going on. If it’s about a job, include the date and address."
          placeholderTextColor={c.inkSubtle}
          accessibilityLabel="Message"
          style={[input, { height: 140, paddingTop: Spacing.three, textAlignVertical: 'top' }]}
        />
      </Field>
      {error ? (
        <T variant="footnote" color="danger">
          {error}
        </T>
      ) : null}
      <Pill
        label={sending ? 'Sending…' : 'Send message'}
        icon={Send}
        size="lg"
        onPress={ready && !sending ? send : undefined}
        style={[{ alignSelf: narrow ? 'stretch' : 'flex-start' }, !ready && { opacity: 0.45 }]}
      />
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
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tab: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  form: { borderRadius: 28, gap: Spacing.five, padding: Spacing.eight },
  input: { height: 48, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.four },
  topic: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  areas: { borderRadius: 28, padding: Spacing.eight, gap: Spacing.four },
});
