import type { CredentialType, QuoteTiming, Trade } from '@/domain/catalog';
import { postcodePoint } from '@/lib/geo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type NewQuoteRequest = {
  trades: Trade[]; // empty = not sure
  postcode: string;
  description: string;
  timing: QuoteTiming;
  /** A tenant's request for their landlord's property: the landlord accepts a quote and pays. */
  propertyId?: string | null;
};

export type Quote = {
  id: string;
  /** Set for live quotes; their name, rating and checks come from the pro's public profile. */
  proId?: string;
  proName: string;
  trade: Trade;
  rating: number;
  jobs: number;
  reviews?: number;
  checks?: CredentialType[];
  pricePence: number;
  earliest: string;
  note: string;
};

/** Posts a "Something else?" request. Without Supabase configured, returns a local demo id. */
export async function createQuoteRequest(req: NewQuoteRequest): Promise<{ id: string }> {
  if (!isSupabaseConfigured) return { id: `demo-${Date.now()}` };
  const { data, error } = await supabase
    .from('quote_requests')
    .insert({
      trades: req.trades,
      postcode: req.postcode,
      location: await postcodePoint(req.postcode),
      description: req.description,
      timing: req.timing,
      property_id: req.propertyId ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

/** Accepts one quote; the database books that pro and declines the rest. */
export async function acceptQuote(quoteId: string): Promise<{ jobId: string }> {
  if (!isSupabaseConfigured || quoteId.startsWith('demo-')) return { jobId: `demo-${Date.now()}` };
  const { data, error } = await supabase.rpc('accept_quote', { p_quote: quoteId });
  if (error) throw error;
  return { jobId: (data as { id: string }).id };
}

/** Whose home a request is for, and who accepts a quote: the landlord on a tenant's request. */
export type QuoteRequestDetails = {
  description: string;
  status: 'open' | 'accepted' | 'cancelled' | 'expired';
  jobId: string | null;
  propertyId: string | null;
  propertyName: string | null;
  managerName: string | null;
  requesterName: string;
  /** False when a landlord views their tenant's request. */
  yours: boolean;
  youAccept: boolean;
};

type DetailsRow = {
  description: string;
  status: QuoteRequestDetails['status'];
  job_id: string | null;
  property_id: string | null;
  property_name: string | null;
  manager_name: string | null;
  requester_name: string;
  yours: boolean;
  you_accept: boolean;
};

export async function loadQuoteRequestDetails(requestId: string): Promise<QuoteRequestDetails | null> {
  const { data, error } = await supabase.rpc('quote_request_details', { p_request: requestId });
  if (error) throw error;
  const r = (data as DetailsRow[] | null)?.[0];
  return r
    ? {
        description: r.description,
        status: r.status,
        jobId: r.job_id,
        propertyId: r.property_id,
        propertyName: r.property_name,
        managerName: r.manager_name,
        requesterName: r.requester_name,
        yours: r.yours,
        youAccept: r.you_accept,
      }
    : null;
}

/** Withdraws an open request, or on a tenant's request, the landlord turns it down. */
export async function cancelQuoteRequest(requestId: string): Promise<void> {
  if (!isSupabaseConfigured || requestId.startsWith('demo-')) return;
  const { error } = await supabase.rpc('cancel_quote_request', { p_request: requestId });
  if (error) throw error;
}

export type QuoteReply = { requestId: string; trade: Trade; pricePence: number; note: string; earliestAt: string | null };

/** Sends the signed-in pro's quote. */
export async function sendQuote(reply: QuoteReply): Promise<void> {
  if (!isSupabaseConfigured || reply.requestId.startsWith('demo-')) return;
  const { error } = await supabase.from('quotes').insert({
    request_id: reply.requestId,
    trade: reply.trade,
    price_pence: reply.pricePence,
    note: reply.note,
    earliest_at: reply.earliestAt,
  });
  if (error) throw error;
}
