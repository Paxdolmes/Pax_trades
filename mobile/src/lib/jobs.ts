import type { Trade } from '@/domain/catalog';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Urgency = 'urgent' | 'booked';

export type JobStatus =
  | 'requested'
  | 'offered'
  | 'accepted'
  | 'en_route'
  | 'on_site'
  | 'completed'
  | 'cancelled';

export type NewJob = {
  trade: Trade;
  jobTypeId: string;
  urgency: Urgency;
  postcode: string;
  description: string;
};

/** Creates a job request. Without Supabase configured, returns a local demo id. */
export async function createJob(job: NewJob): Promise<{ id: string }> {
  if (!isSupabaseConfigured) return { id: `demo-${Date.now()}` };

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      trade: job.trade,
      job_type_id: job.jobTypeId,
      urgency: job.urgency,
      postcode: job.postcode,
      description: job.description,
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
  completed: 'Job done',
  cancelled: 'Cancelled',
};
