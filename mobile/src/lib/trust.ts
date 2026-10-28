// Pilot trust features: chat, confirming a job, the Relay Guarantee, reviews and
// public pro profiles. Each call falls back to demo behaviour without Supabase.

import { maskContactDetails, ratingSummary } from '@/domain/rules';
import type { CredentialType, Trade } from '@/domain/catalog';
import { DEMO_PRO, DEMO_PRO_REVIEWS, type DemoReview } from '@/lib/demo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const live = (id: string) => isSupabaseConfigured && !id.startsWith('demo-');

async function myId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// Chat ------------------------------------------------------------------------

export type ChatMessage = { id: string; mine: boolean; body: string; at: string };

type MessageRow = { id: string; sender_id: string; body: string; created_at: string };

export async function loadMessages(jobId: string): Promise<ChatMessage[]> {
  if (!live(jobId)) return [];
  const me = await myId();
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('job_id', jobId)
    .order('created_at');
  if (error) throw error;
  return (data as MessageRow[]).map((r) => ({ id: r.id, mine: r.sender_id === me, body: r.body, at: timeOf(r.created_at) }));
}

/** Calls back for each new message on the job. Returns an unsubscribe function. */
export function subscribeMessages(jobId: string, onMessage: (m: ChatMessage) => void): () => void {
  if (!live(jobId)) return () => {};
  let me: string | null = null;
  void myId().then((id) => (me = id));
  const channel = supabase
    .channel(`chat-${jobId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` }, (payload) => {
      const r = payload.new as MessageRow;
      onMessage({ id: r.id, mine: r.sender_id === me, body: r.body, at: timeOf(r.created_at) });
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Sends a message. Returns it as stored, with contact details hidden. */
export async function sendMessage(jobId: string, body: string): Promise<ChatMessage | null> {
  if (!live(jobId)) return null;
  const { data, error } = await supabase.from('messages').insert({ job_id: jobId, body }).select('id, body, created_at').single();
  if (error) throw error;
  return { id: data.id as string, mine: true, body: data.body as string, at: timeOf(data.created_at as string) };
}

/** What a message will look like once sent, so the sender sees the masking straight away. */
export const previewMessage = maskContactDetails;

// Job lifecycle -------------------------------------------------------------

export async function confirmJob(jobId: string, tipPence: number): Promise<void> {
  if (!live(jobId)) return;
  const { error } = await supabase.rpc('confirm_job', { p_job: jobId, p_tip_pence: tipPence });
  if (error) throw error;
}

export async function proArrived(jobId: string): Promise<void> {
  if (!live(jobId)) return;
  const { error } = await supabase.rpc('pro_arrived', { p_job: jobId });
  if (error) throw error;
}

/** The pro's final price: labour, parts and approved extras, before any tip. */
export async function proFinished(jobId: string, finalPricePence: number): Promise<void> {
  if (!live(jobId)) return;
  const { error } = await supabase.rpc('pro_finished', { p_job: jobId, p_final_price_pence: finalPricePence });
  if (error) throw error;
}

// Relay Guarantee -------------------------------------------------------------

export type ProblemKind = 'not_fixed' | 'damage' | 'no_show' | 'overcharged' | 'other';

export const PROBLEM_KINDS: { kind: ProblemKind; label: string; detail: string }[] = [
  { kind: 'not_fixed', label: "It isn't fixed", detail: 'The problem is still there or came back' },
  { kind: 'damage', label: 'Something was damaged', detail: 'During the visit' },
  { kind: 'no_show', label: "The pro didn't turn up", detail: 'Or arrived very late' },
  { kind: 'overcharged', label: 'I was charged more than agreed', detail: 'Extra work I did not approve' },
  { kind: 'other', label: 'Something else', detail: 'Tell us what happened' },
];

export async function reportProblem(r: { jobId: string; kind: ProblemKind; description: string }): Promise<{ id: string }> {
  if (!live(r.jobId)) return { id: `demo-${r.jobId}` };
  const { data, error } = await supabase
    .from('problem_reports')
    .insert({ job_id: r.jobId, kind: r.kind, description: r.description })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

// Reviews -------------------------------------------------------------------

export async function saveReview(r: { jobId: string; proId: string; rating: number; body: string }): Promise<void> {
  if (!live(r.jobId)) return;
  const { error } = await supabase.from('reviews').insert({ job_id: r.jobId, pro_id: r.proId, rating: r.rating, body: r.body });
  if (error) throw error;
}

export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  if (!isSupabaseConfigured || !/^[0-9a-f-]{36}$/.test(reviewId)) return;
  const { error } = await supabase.rpc('reply_to_review', { p_review: reviewId, p_reply: reply });
  if (error) throw error;
}

export type ProProfile = {
  id: string;
  name: string;
  trades: Trade[];
  founding: boolean;
  rating: number | null;
  reviewCount: number;
  completedJobs: number;
  credentials: CredentialType[];
  reviews: DemoReview[];
};

const DEMO_PROFILE: ProProfile = {
  id: DEMO_PRO.id,
  name: 'James C',
  trades: ['heating', 'plumbing'],
  founding: true,
  rating: DEMO_PRO.rating,
  reviewCount: DEMO_PRO.reviews,
  completedJobs: DEMO_PRO.jobs,
  credentials: ['gas_safe', 'plumbing_nvq', 'public_liability'],
  reviews: DEMO_PRO_REVIEWS,
};

type ProfileRow = {
  id: string;
  display_name: string;
  trades: Trade[];
  is_founding: boolean;
  rating: number | null;
  review_count: number;
  completed_jobs: number;
  verified_credentials: CredentialType[];
};

type ReviewRow = { id: string; rating: number; body: string; pro_reply: string | null; created_at: string };

/** A pro as customers see them: first name and initial, verified reviews and checked documents. */
export async function loadProProfile(proId: string): Promise<ProProfile> {
  if (!live(proId)) return DEMO_PROFILE;
  const [{ data: p, error }, { data: reviews }] = await Promise.all([
    supabase.from('pro_public_profiles').select('*').eq('id', proId).single(),
    supabase.from('reviews').select('id, rating, body, pro_reply, created_at').eq('pro_id', proId).order('created_at', { ascending: false }).limit(20),
  ]);
  if (error) throw error;
  const row = p as ProfileRow;
  const list = ((reviews ?? []) as ReviewRow[]).map((r) => ({
    id: r.id,
    customer: 'Verified customer',
    rating: r.rating,
    body: r.body,
    job: '',
    when: new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    reply: r.pro_reply ?? undefined,
  }));
  return {
    id: row.id,
    name: row.display_name,
    trades: row.trades,
    founding: row.is_founding,
    rating: row.rating ?? ratingSummary(list.map((r) => r.rating)).rating,
    reviewCount: row.review_count,
    completedJobs: row.completed_jobs,
    credentials: row.verified_credentials,
    reviews: list,
  };
}
