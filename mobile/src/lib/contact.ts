// The Help page's contact form and the waiting list (the out-of-area one and, until
// Relay opens, everyone's), sent through the contact Edge Function. In demo mode (no
// Supabase) they pretend to send.
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Enquiry =
  | { kind: 'help'; name: string; email: string; topic: string; message: string; postcode?: string }
  | { kind: 'waitlist'; email: string; postcode: string; name?: string; topic?: string; message?: string };

export async function sendEnquiry(enquiry: Enquiry): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.functions.invoke('contact', { body: enquiry });
  if (!error) return;
  // The function explains what's wrong (a bad email, too many messages) in its reply.
  const reply = (error as { context?: Response }).context;
  const detail = await reply?.json?.().catch(() => null);
  throw new Error(detail?.error ?? 'Could not send. Check your connection and try again.');
}
