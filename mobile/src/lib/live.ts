// Reads for the live screens: the database functions in
// 20261028160000_live_push_admin.sql. Each screen keeps its demo data when
// Supabase isn't configured.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { CredentialType, Trade } from '@/domain/catalog';
import type { Credential } from '@/domain/rules';
import type { JobStatus, Urgency } from '@/lib/jobs';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export const isLive = isSupabaseConfigured;

/**
 * Loads data when the screen comes into view, and again each time it's revisited.
 * In demo mode it returns `demo` and never calls `load`. Pass `key` when `load`
 * depends on something that changes, such as an id.
 */
export function useLive<T>(load: () => Promise<T>, demo: T, key = '') {
  const [data, setData] = useState<T>(demo);
  const [loading, setLoading] = useState(isLive);
  const [error, setError] = useState<string | null>(null);
  // `load` is usually an inline function; `key` says when it really changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => load(), [key]);

  const reload = useCallback(async () => {
    if (!isLive) return;
    try {
      setData(await run());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load. Pull down to try again.');
    } finally {
      setLoading(false);
    }
  }, [run]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { data, loading, error, reload };
}

async function me(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Please sign in again');
  return id;
}

// Pros ----------------------------------------------------------------------------

export type ProAccount = {
  trades: Trade[];
  founding: boolean;
  approved: boolean;
  online: boolean;
  credentials: (Credential & { id: string; reference: string | null })[];
};

type CredentialRow = { id: string; type: CredentialType; reference: string | null; expires_on: string | null; verified_at: string | null };

/** The signed-in pro's record and documents. A renewal replaces the older document of the same type. */
export async function loadProAccount(): Promise<ProAccount> {
  const id = await me();
  const [pro, creds] = await Promise.all([
    supabase.from('pros').select('trades, is_founding, approved_at, is_online').eq('id', id).maybeSingle(),
    supabase.from('credentials').select('id, type, reference, expires_on, verified_at').eq('pro_id', id).order('created_at'),
  ]);
  if (pro.error) throw pro.error;
  if (creds.error) throw creds.error;
  const latest = new Map<CredentialType, CredentialRow>();
  for (const c of (creds.data ?? []) as CredentialRow[]) {
    const held = latest.get(c.type);
    // Keep the verified one while a renewal is being checked.
    if (!held || c.verified_at || !held.verified_at) latest.set(c.type, c);
  }
  const p = pro.data as { trades: Trade[]; is_founding: boolean; approved_at: string | null; is_online: boolean } | null;
  return {
    trades: p?.trades ?? [],
    founding: p?.is_founding ?? false,
    approved: Boolean(p?.approved_at),
    online: p?.is_online ?? false,
    credentials: [...latest.values()].map((c) => ({
      id: c.id,
      type: c.type,
      reference: c.reference,
      verified: Boolean(c.verified_at),
      expiresOn: c.expires_on,
    })),
  };
}

export type LiveOffer = {
  offerId: string;
  jobId: string;
  jobTypeId: string;
  urgency: Urgency;
  district: string;
  description: string;
  customerName: string;
  distanceM: number | null;
  scheduledFor: string | null;
  expiresAt: string;
};

type OfferRow = {
  offer_id: string;
  job_id: string;
  job_type_id: string;
  urgency: Urgency;
  district: string;
  description: string;
  customer_name: string | null;
  distance_m: number | null;
  scheduled_for: string | null;
  expires_at: string;
};

export async function loadMyOffers(): Promise<LiveOffer[]> {
  const { data, error } = await supabase.rpc('my_offers');
  if (error) throw error;
  return ((data ?? []) as OfferRow[]).map((r) => ({
    offerId: r.offer_id,
    jobId: r.job_id,
    jobTypeId: r.job_type_id,
    urgency: r.urgency,
    district: r.district,
    description: r.description,
    customerName: r.customer_name ?? 'Customer',
    distanceM: r.distance_m,
    scheduledFor: r.scheduled_for,
    expiresAt: r.expires_at,
  }));
}

/** Calls back when an offer is made to or withdrawn from this pro. Returns an unsubscribe function. */
export function subscribeOffers(proId: string, onChange: () => void): () => void {
  if (!isLive) return () => {};
  const channel = supabase
    .channel(`offers-${proId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'job_offers', filter: `pro_id=eq.${proId}` }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function acceptOffer(offerId: string): Promise<{ jobId: string }> {
  const { data, error } = await supabase.rpc('accept_offer', { p_offer: offerId });
  if (error) throw error;
  return { jobId: (data as { id: string }).id };
}

export async function setAvailability(online: boolean, point: { lng: number; lat: number } | null): Promise<void> {
  const { error } = await supabase.rpc('set_availability', { p_online: online, p_lng: point?.lng ?? 0, p_lat: point?.lat ?? 0 });
  if (error) throw error;
}

export type ProJob = {
  jobId: string;
  jobTypeId: string;
  urgency: Urgency;
  status: JobStatus;
  postcode: string;
  description: string;
  customerName: string;
  scheduledFor: string | null;
  arriveBy: string | null;
  finishedAt: string | null;
  confirmedAt: string | null;
  paidAt: string | null;
  finalPricePence: number | null;
  tipPence: number;
  payoutPence: number | null;
};

type ProJobRow = {
  job_id: string;
  job_type_id: string;
  urgency: Urgency;
  status: JobStatus;
  postcode: string;
  description: string;
  customer_name: string | null;
  scheduled_for: string | null;
  arrive_by: string | null;
  finished_at: string | null;
  confirmed_at: string | null;
  paid_at: string | null;
  final_price_pence: number | null;
  tip_pence: number;
  payout_pence: number | null;
};

export async function loadProJobs(jobId?: string): Promise<ProJob[]> {
  const { data, error } = await supabase.rpc('pro_jobs', jobId ? { p_job: jobId } : {});
  if (error) throw error;
  return ((data ?? []) as ProJobRow[]).map((r) => ({
    jobId: r.job_id,
    jobTypeId: r.job_type_id,
    urgency: r.urgency,
    status: r.status,
    postcode: r.postcode,
    description: r.description,
    customerName: r.customer_name ?? 'Customer',
    scheduledFor: r.scheduled_for,
    arriveBy: r.arrive_by,
    finishedAt: r.finished_at,
    confirmedAt: r.confirmed_at,
    paidAt: r.paid_at,
    finalPricePence: r.final_price_pence,
    tipPence: r.tip_pence,
    payoutPence: r.payout_pence,
  }));
}

/** Jobs a pro is still working on: accepted, on the way or on site, not yet signed off. */
export const isActiveJob = (j: ProJob) => ['accepted', 'en_route', 'on_site'].includes(j.status) && !j.finishedAt;

export type QuoteRequestRow = {
  id: string;
  trades: Trade[];
  postcode: string;
  description: string;
  timing: string;
  created_at: string;
};

/** Open "Something else?" requests the database lets this pro see. */
export async function loadOpenQuoteRequests(): Promise<QuoteRequestRow[]> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('id, trades, postcode, description, timing, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as QuoteRequestRow[];
}

// Customers ---------------------------------------------------------------------

export type CustomerJob = {
  jobId: string;
  jobTypeId: string;
  urgency: Urgency;
  status: JobStatus;
  postcode: string;
  createdAt: string;
  scheduledFor: string | null;
  arriveBy: string | null;
  finishedAt: string | null;
  confirmedAt: string | null;
  paidAt: string | null;
  finalPricePence: number | null;
  tipPence: number;
  pro: null | {
    id: string;
    name: string;
    rating: number | null;
    reviews: number;
    jobs: number;
    credentials: CredentialType[];
  };
};

type CustomerJobRow = {
  job_id: string;
  job_type_id: string;
  urgency: Urgency;
  status: JobStatus;
  postcode: string;
  created_at: string;
  scheduled_for: string | null;
  arrive_by: string | null;
  finished_at: string | null;
  confirmed_at: string | null;
  paid_at: string | null;
  final_price_pence: number | null;
  tip_pence: number;
  pro_id: string | null;
  pro_name: string | null;
  pro_rating: number | null;
  pro_reviews: number | null;
  pro_completed_jobs: number | null;
  pro_credentials: CredentialType[] | null;
};

export async function loadCustomerJobs(jobId?: string): Promise<CustomerJob[]> {
  const { data, error } = await supabase.rpc('customer_jobs', jobId ? { p_job: jobId } : {});
  if (error) throw error;
  return ((data ?? []) as CustomerJobRow[]).map((r) => ({
    jobId: r.job_id,
    jobTypeId: r.job_type_id,
    urgency: r.urgency,
    status: r.status,
    postcode: r.postcode,
    createdAt: r.created_at,
    scheduledFor: r.scheduled_for,
    arriveBy: r.arrive_by,
    finishedAt: r.finished_at,
    confirmedAt: r.confirmed_at,
    paidAt: r.paid_at,
    finalPricePence: r.final_price_pence,
    tipPence: r.tip_pence,
    pro: r.pro_id
      ? {
          id: r.pro_id,
          name: r.pro_name ?? 'Your pro',
          rating: r.pro_rating === null ? null : Number(r.pro_rating),
          reviews: Number(r.pro_reviews ?? 0),
          jobs: Number(r.pro_completed_jobs ?? 0),
          credentials: r.pro_credentials ?? [],
        }
      : null,
  }));
}

export type CustomerQuoteRequest = { id: string; description: string; status: string; createdAt: string; quotes: number };

export async function loadCustomerQuoteRequests(): Promise<CustomerQuoteRequest[]> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('id, description, status, created_at, quotes(count)')
    .eq('customer_id', await me())
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as { id: string; description: string; status: string; created_at: string; quotes: { count: number }[] }[]).map((r) => ({
    id: r.id,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    quotes: r.quotes[0]?.count ?? 0,
  }));
}

// Dates -------------------------------------------------------------------------

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function dayAndTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`;
}

export const firstName = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] || '';
