import type { QuoteTiming, Trade } from '@/domain/catalog';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type NewQuoteRequest = {
  trades: Trade[]; // empty = not sure
  postcode: string;
  description: string;
  timing: QuoteTiming;
};

export type Quote = {
  id: string;
  proName: string;
  trade: Trade;
  rating: number;
  jobs: number;
  pricePence: number;
  earliest: string;
  note: string;
};

/** Posts a "Something else?" request. Without Supabase configured, returns a local demo id. */
export async function createQuoteRequest(req: NewQuoteRequest): Promise<{ id: string }> {
  if (!isSupabaseConfigured) return { id: `demo-${Date.now()}` };
  const { data, error } = await supabase
    .from('quote_requests')
    .insert({ trades: req.trades, postcode: req.postcode, description: req.description, timing: req.timing })
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
