// Shared setup for Relay's Edge Functions (Deno).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

import { stripeClient } from './stripe.ts';

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

/** Service-role client: bypasses row level security, so only use it after checking who's asking. */
export const admin = (): SupabaseClient => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

export const stripe = () => stripeClient(env('STRIPE_SECRET_KEY'));

/** The signed-in user behind the request's bearer token, or null. */
export async function caller(req: Request): Promise<{ id: string } | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await admin().auth.getUser(token);
  return data.user ? { id: data.user.id } : null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
