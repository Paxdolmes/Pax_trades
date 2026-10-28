import { AlertCircle, ArrowRight, ChevronLeft, Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppIcon, Wordmark } from '@/components/brand';
import { Button, Footer, IconButton, Note, Screen, T } from '@/components/ui';
import { Radii, Shadows, Spacing, Type, usePalette } from '@/constants/theme';
import { completeProfile, isEmail, sendCode, signOut, useAuth, verifyCode } from '@/lib/auth';
import { appVariant } from '@/lib/variant';

// Supabase's Email OTP Length setting (6 to 10 digits); accept any so the app keeps working if it changes.
const CODE_MIN = 6;
const CODE_MAX = 10;
const RESEND_AFTER_S = 60; // Supabase allows one code per email a minute

const pro = appVariant === 'pro';

const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

/** Email, then the code we email them, then their name the first time. */
export default function SignIn() {
  const { status, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function run(step: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await step();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  const send = () =>
    run(async () => {
      await sendCode(email);
      setSentTo(email.trim().toLowerCase());
      setCode('');
      setWait(RESEND_AFTER_S);
    });

  // The auth listener moves them on once the code checks out.
  const verify = () => run(() => verifyCode(sentTo ?? email, code));

  const saveName = () =>
    run(async () => {
      await completeProfile(name);
      await refresh();
    });

  if (status === 'wrong-app') {
    return (
      <Shell
        title={pro ? 'This is a customer account' : 'This is a Relay Traders account'}
        body={
          pro
            ? 'You signed up in the Relay app to book jobs. To work as a tradesperson, sign out and use a different email here.'
            : 'You signed up in Relay Traders to take jobs. To book a job yourself, sign out and use a different email here.'
        }
        action={<Button label="Sign out" variant="outline" onPress={() => void signOut()} />}
      />
    );
  }

  if (status === 'needs-name') {
    return (
      <Shell
        title="What's your name?"
        body={pro ? 'Customers see it when you accept their job.' : 'Your pro sees it when they accept your job.'}
        error={error}
        action={<Button label={pro ? 'Continue to your application' : 'Continue'} trailingIcon={ArrowRight} loading={busy} disabled={name.trim().length < 2} onPress={saveName} />}>
        <Field value={name} onChangeText={setName} placeholder="Full name" label="Full name" autoComplete="name" textContentType="name" autoCapitalize="words" onSubmit={saveName} />
      </Shell>
    );
  }

  if (sentTo) {
    return (
      <Shell
        title="Check your email"
        body={`We sent a code to ${sentTo}. It works for 1 hour.`}
        error={error}
        onBack={() => {
          setSentTo(null);
          setError(null);
        }}
        action={
          <View style={{ gap: Spacing.two }}>
            <Button label="Sign in" loading={busy} disabled={code.length < CODE_MIN} onPress={verify} />
            <Button
              label={wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
              variant="ghost"
              size="md"
              disabled={wait > 0 || busy}
              onPress={send}
            />
          </View>
        }>
        <Field
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, CODE_MAX))}
          placeholder="Code from your email"
          label="Code from your email"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          code
          onSubmit={() => code.length >= CODE_MIN && verify()}
        />
      </Shell>
    );
  }

  return (
    <Shell
      title={pro ? 'Sign in to Relay Traders' : 'Sign in to Relay'}
      body={"Enter your email and we'll send you a code. New here? This creates your account."}
      error={error}
      action={<Button label="Email me a code" icon={Mail} loading={busy} disabled={!isEmail(email)} onPress={send} />}>
      <Field
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        label="Email"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        onSubmit={() => isEmail(email) && send()}
      />
    </Shell>
  );
}

function Shell({
  title,
  body,
  error,
  action,
  onBack,
  children,
}: {
  title: string;
  body: string;
  error?: string | null;
  action: React.ReactNode;
  onBack?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Screen background="surface" footer={<Footer>{action}</Footer>}>
      <View style={styles.header}>
        {onBack ? <IconButton icon={ChevronLeft} label="Back" onPress={onBack} tone="muted" /> : <View style={{ width: 44 }} />}
        <Wordmark size={22} traders={pro} />
        <View style={{ width: 44 }} />
      </View>
      <View style={{ gap: Spacing.two, marginTop: Spacing.four }}>
        <View style={{ marginBottom: Spacing.three }}>
          <AppIcon size={64} traders={pro} />
        </View>
        <T variant="title1" style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole="header">
          {title}
        </T>
        <T variant="callout" color="inkMuted">
          {body}
        </T>
      </View>
      {children}
      {error ? (
        <View accessibilityLiveRegion="polite">
          <Note icon={AlertCircle} color="danger">
            {error}
          </Note>
        </View>
      ) : null}
    </Screen>
  );
}

function Field({
  label,
  code,
  onSubmit,
  ...input
}: React.ComponentProps<typeof TextInput> & { label: string; code?: boolean; onSubmit: () => void }) {
  const c = usePalette();
  return (
    <TextInput
      {...input}
      accessibilityLabel={label}
      autoCapitalize={input.autoCapitalize ?? 'none'}
      autoCorrect={false}
      autoFocus
      returnKeyType="go"
      onSubmitEditing={onSubmit}
      placeholderTextColor={c.inkSubtle}
      style={[
        code ? Type.title1 : Type.body,
        styles.input,
        Shadows.card,
        { backgroundColor: c.surface, color: c.ink, borderColor: c.border },
        code ? styles.code : null,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { height: 56, borderRadius: Radii.md, borderWidth: 1, paddingHorizontal: Spacing.four },
  code: { letterSpacing: 12, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
