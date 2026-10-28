// Sign-in with an email and a one-time code (Supabase Auth). No passwords and no
// text-message fees. Without Supabase the apps stay in demo mode and skip sign-in.

import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Trade } from '@/domain/catalog';
import { unregisterForPush } from '@/lib/push';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { appVariant } from '@/lib/variant';

export type Profile = { id: string; role: 'customer' | 'pro' | 'admin'; fullName: string | null };

/**
 * demo: no backend, everything runs on demo data
 * loading: reading the saved session
 * signed-out: needs their email and code
 * needs-name: signed in for the first time, no profile yet
 * wrong-app: their account belongs to the other app
 * ready: signed in with a profile
 */
export type AuthStatus = 'demo' | 'loading' | 'signed-out' | 'needs-name' | 'wrong-app' | 'ready';

type AuthState = {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  /** Pros only: whether they've started their application. */
  hasApplication: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  status: 'demo',
  session: null,
  profile: null,
  hasApplication: true,
  refresh: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/** True until the person has an account in this app. Guests can still look around. */
export const needsSignIn = (s: AuthStatus) => s === 'signed-out' || s === 'needs-name' || s === 'wrong-app';

/** Signed in but not finished (no name yet, or the other app's account): send them back to sign-in. */
export const mustFinishSignIn = (s: AuthStatus) => s === 'needs-name' || s === 'wrong-app';

/**
 * For actions that need an account, such as sending a request. Returns a check
 * that opens sign-in for guests and returns false, so the screen keeps what
 * they typed and they can carry on after signing in.
 */
export function useAccountGate() {
  const { status } = useAuth();
  return useCallback(() => {
    if (!needsSignIn(status)) return true;
    router.push('/sign-in');
    return false;
  }, [status]);
}

type ProfileRow = { id: string; role: Profile['role']; full_name: string | null };

const toProfile = (r: ProfileRow): Profile => ({ id: r.id, role: r.role, fullName: r.full_name });

async function loadAccount(userId: string): Promise<{ profile: Profile | null; hasApplication: boolean }> {
  const { data, error } = await supabase.from('profiles').select('id, role, full_name').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data || appVariant !== 'pro') return { profile: data ? toProfile(data as ProfileRow) : null, hasApplication: true };
  const pro = await supabase.from('pros').select('id').eq('id', userId).maybeSingle();
  if (pro.error) throw pro.error;
  return { profile: toProfile(data as ProfileRow), hasApplication: Boolean(pro.data) };
}

function statusFor(session: Session | null, profile: Profile | null): AuthStatus {
  if (!session) return 'signed-out';
  if (!profile) return 'needs-name';
  if (profile.role !== 'admin' && profile.role !== appVariant) return 'wrong-app';
  return 'ready';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasApplication, setHasApplication] = useState(true);
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'demo');

  const apply = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setProfile(null);
      setStatus('signed-out');
      return;
    }
    try {
      const account = await loadAccount(s.user.id);
      setProfile(account.profile);
      setHasApplication(account.hasApplication);
      setStatus(statusFor(s, account.profile));
    } catch {
      // Offline or a server error: let them in on the saved session rather than
      // locking them out; screens show their own errors.
      setStatus(statusFor(s, { id: s.user.id, role: appVariant, fullName: null }));
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      // Token refreshes don't change who is signed in.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void apply(s);
    });
    return () => data.subscription.unsubscribe();
  }, [apply]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await apply(data.session);
  }, [apply]);

  return <AuthContext.Provider value={{ status, session, profile, hasApplication, refresh }}>{children}</AuthContext.Provider>;
}

/** Emails a one-time code, creating the account the first time. */
export async function sendCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: 'email' });
  if (error) throw error;
}

/** Saves the person's name; the first time, this creates their profile in this app's role. */
export async function completeProfile(fullName: string): Promise<void> {
  const { error } = await supabase.rpc('complete_profile', { p_role: appVariant, p_full_name: fullName });
  if (error) throw error;
}

/** Pros: starts their application, or updates their trades while it's waiting. Demo mode does nothing. */
export async function startProApplication(trades: Trade[]): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.rpc('start_pro_application', { p_trades: trades });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) return;
  await unregisterForPush().catch(() => {});
  await supabase.auth.signOut();
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
