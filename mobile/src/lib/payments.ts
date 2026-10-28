// Card payments through Stripe. The customer saves a card before their first
// request; it's charged once they confirm the job (or it confirms itself after
// 48 hours). All Stripe calls go through Supabase Edge Functions.

import { presentSaveCardSheet } from '@/lib/payment-sheet';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** Turns an Edge Function failure into the message the function sent back, when it sent one. */
async function readable(error: unknown, fallback: string): Promise<Error> {
  const reply = (error as { context?: Response }).context;
  const detail = await reply?.json?.().catch(() => null);
  return new Error(detail?.error ?? fallback);
}

/** Asks for a card if the customer hasn't saved one. Resolves false if they back out. Demo: always true. */
export async function ensureSavedCard(): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  const { data: session } = await supabase.auth.getSession();
  const me = session.session?.user.id;
  if (!me) throw new Error('Please sign in again');
  const { data: profile } = await supabase.from('profiles').select('stripe_payment_method_id').eq('id', me).single();
  if (profile?.stripe_payment_method_id) return true;
  return saveCard();
}

/** Adds or replaces the customer's saved card. Resolves false if they back out. Demo: always true. */
export async function saveCard(): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  const { data, error } = await supabase.functions.invoke('payment-setup');
  if (error) throw await readable(error, 'Could not reach our payment service. Check your connection and try again.');
  return presentSaveCardSheet(data as { customerId: string; ephemeralKey: string; setupIntent: string });
}

/** Charges a job the customer has just confirmed. Returns Stripe's status, e.g. "succeeded". */
export async function chargeJob(jobId: string): Promise<string> {
  if (!isSupabaseConfigured || jobId.startsWith('demo-')) return 'succeeded';
  const { data, error } = await supabase.functions.invoke('charge-jobs', { body: { jobId } });
  if (error) throw await readable(error, 'Could not take payment. Check your connection and try again.');
  const result = (data as { results: { status: string }[] }).results[0];
  return result?.status ?? 'succeeded'; // nothing left to charge: already paid
}

/** Pros: opens Stripe's hosted page to add their bank details. Returns the link to open. */
export async function bankSetupLink(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.functions.invoke('connect-onboarding', { method: 'POST' });
  if (error) throw await readable(error, 'Could not reach Stripe. Check your connection and try again.');
  return (data as { url: string }).url;
}
