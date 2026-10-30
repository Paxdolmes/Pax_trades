import { useEffect } from 'react';

import { CALLOUT_RATES, findJobType, formatPence, type CredentialType, type JobType, type QuoteTiming, type Trade } from '@/domain/catalog';
import { missingCredentials, quotableTrades } from '@/domain/rules';
import { useAuth } from '@/lib/auth';
import { DEMO_OFFERS, DEMO_PRO_CREDENTIALS, DEMO_QUOTE_REQUESTS, DEMO_TRADER, type DemoOffer, type DemoQuoteRequest } from '@/lib/demo';
import { dayAndTime, loadMyOffers, loadOpenQuoteRequests, subscribeOffers, useLive, type LiveOffer } from '@/lib/live';

export const today = () => new Date().toISOString().slice(0, 10);

export type OfferView = DemoOffer & { jobType: JobType; missing: CredentialType[]; jobId?: string; expiresAt?: string };

/** Demo offers with their job type and anything the pro still needs to take them. */
export function listOffers(): OfferView[] {
  return DEMO_OFFERS.flatMap((o) => {
    const jobType = findJobType(o.jobTypeId);
    // A booking asked for by name gives the pro an hour to answer.
    const expiresAt = o.askedForYou ? new Date(Date.now() + 3_600_000).toISOString() : undefined;
    return jobType ? [{ ...o, jobType, missing: missingCredentials(jobType, DEMO_PRO_CREDENTIALS, today()), expiresAt }] : [];
  });
}

export function findOffer(id: string): OfferView | undefined {
  return listOffers().find((o) => o.id === id);
}

/** Headline pay for an offer card: the first hour for callouts, the price for fixed jobs. */
export function offerPay(job: JobType): { amount: string; note: string } {
  if (job.pricing.kind === 'fixed') return { amount: formatPence(job.pricing.pence), note: 'fixed' };
  return {
    amount: formatPence(CALLOUT_RATES.standard.firstHourPence),
    note: `+ ${formatPence(CALLOUT_RATES.standard.perHourPence)}/hr`,
  };
}

export type QuoteRequestView = DemoQuoteRequest & { quotableAs: Trade[] };

/** Open "Something else?" requests this pro may quote on, as the database's can_quote allows. */
export function listQuoteRequests(): QuoteRequestView[] {
  return DEMO_QUOTE_REQUESTS.map((r) => ({
    ...r,
    quotableAs: quotableTrades(r.trades, DEMO_TRADER.trades, DEMO_PRO_CREDENTIALS, today()),
  })).filter((r) => r.quotableAs.length > 0);
}

export function findQuoteRequest(id: string): QuoteRequestView | undefined {
  return listQuoteRequests().find((r) => r.id === id);
}

/** About 3 minutes a km across Fulham, plus getting going. */
const minutesFor = (km: number) => Math.max(3, Math.round(km * 3 + 2));

function fromLive(o: LiveOffer): OfferView | null {
  const jobType = findJobType(o.jobTypeId);
  if (!jobType) return null;
  const distanceKm = o.distanceM === null ? 0 : Math.round(o.distanceM / 100) / 10;
  return {
    id: o.offerId,
    jobId: o.jobId,
    expiresAt: o.expiresAt,
    jobTypeId: o.jobTypeId,
    jobType,
    postcode: o.district,
    street: o.district, // the full postcode shows once they accept
    customer: o.customerName,
    distanceKm,
    minutesAway: minutesFor(distanceKm),
    urgent: o.urgency === 'urgent',
    when: o.urgency === 'urgent' ? 'Now' : o.scheduledFor ? dayAndTime(o.scheduledFor) : 'Flexible',
    note: o.description || 'No details given',
    missing: [], // the dispatcher only offers jobs the pro is qualified for
    askedForYou: o.askedForYou,
  };
}

/** This pro's open offers, kept up to date as new ones arrive. Demo offers without a backend. */
export function useOffers(): OfferView[] {
  const { session } = useAuth();
  const { data, reload } = useLive(async () => (await loadMyOffers()).flatMap((o) => fromLive(o) ?? []), listOffers());
  const proId = session?.user.id;
  useEffect(() => (proId ? subscribeOffers(proId, () => void reload()) : undefined), [proId, reload]);
  return data;
}

/** Open quote requests this pro can answer, live or demo. */
export function useQuoteRequests(trades: Trade[]): QuoteRequestView[] {
  const { data } = useLive(
    async () =>
      (await loadOpenQuoteRequests()).map((r) => ({
        id: r.id,
        customer: 'Customer',
        description: r.description,
        postcode: r.postcode.split(' ')[0],
        trades: r.trades,
        timing: r.timing as QuoteTiming,
        postedAgo: dayAndTime(r.created_at),
        quotes: 0,
        quotableAs: r.trades.length ? r.trades.filter((t) => trades.includes(t)) : trades,
      })),
    listQuoteRequests(),
    trades.join(','),
  );
  return data.filter((r) => r.quotableAs.length > 0);
}
