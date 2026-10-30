import type { Trade } from '@/domain/catalog';
import { postcodePoint } from '@/lib/geo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Urgency = 'urgent' | 'booked';

export type JobStatus =
  | 'requested'
  | 'offered'
  | 'accepted'
  | 'en_route'
  | 'on_site'
  | 'finished' // the pro says it's done; waiting for the customer to confirm
  | 'completed'
  | 'cancelled';

export type NewJob = {
  trade: Trade;
  jobTypeId: string;
  urgency: Urgency;
  postcode: string;
  description: string;
  /** Booked jobs: the time the pro arrives. */
  scheduledFor: string | null;
  /** A tenant's request to their landlord, or a landlord booking for their property. */
  propertyId?: string | null;
  /** "Book Sam again": the pro who did a past job, offered this one first. */
  preferredProId?: string | null;
};

/** Creates a job request. Without Supabase configured, returns a local demo id. */
export async function createJob(job: NewJob): Promise<{ id: string }> {
  if (!isSupabaseConfigured) return { id: `demo-${Date.now()}` };

  const location = await postcodePoint(job.postcode);
  if (!location) throw new Error("We couldn't find that postcode. Please check it and try again.");
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      trade: job.trade,
      job_type_id: job.jobTypeId,
      urgency: job.urgency,
      postcode: job.postcode,
      description: job.description,
      scheduled_for: job.scheduledFor,
      property_id: job.propertyId ?? null,
      // Sent only when a pro is asked for. Demo pros have made-up ids, so only a real pro can be.
      ...(job.preferredProId && /^[0-9a-f-]{36}$/.test(job.preferredProId) ? { preferred_pro_id: job.preferredProId } : {}),
      location,
    })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export const STATUS_LABELS: Record<JobStatus, string> = {
  requested: 'Finding a pro near you',
  offered: 'Offer sent to a pro',
  accepted: 'Pro accepted',
  en_route: 'On the way',
  on_site: 'Arrived',
  finished: 'Waiting for your OK',
  completed: 'Job done',
  cancelled: 'Cancelled',
};

/** The customer cancels before the pro arrives. Demo jobs just go away. */
export async function cancelJob(jobId: string): Promise<void> {
  if (!isSupabaseConfigured || jobId.startsWith('demo-')) return;
  const { error } = await supabase.rpc('cancel_job', { p_job: jobId });
  if (error) throw error;
}
