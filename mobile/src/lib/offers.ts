import { useEffect } from 'react';

import { CALLOUT_RATES, findJobType, formatPence, type CredentialType, type JobType, type QuoteTiming, type Trade } from '@/domain/catalog';
import { missingCredentials, quotableTrades } from '@/domain/rules';
import { useAuth } from '@/lib/auth';
import { DEMO_OFFERS, DEMO_PRO_CREDENTIALS, DEMO_QUOTE_REQUESTS, DEMO_TRADER, type DemoOffer, type DemoQuoteRequest } from '@/lib/demo';
import { dayAndTime, isLive, loadMyOffers, loadOpenQuoteRequests, subscribeOffers, useLive, type LiveOffer } from '@/lib/live';

export const today = () => new Date().toISOString().slice(0, 10);

export type OfferView = DemoOffer & { jobType: JobType; missing: CredentialType[]; jobId?: string; expiresAt?: string };

/** Demo offers with their job type and anything the pro still needs to take them. */
export function listOffers(): OfferView[] {
  return DEMO_OFFERS.flatMap((o) => {
    const jobType = findJobType(o.jobTypeId);
    return jobType ? [{ ...o, jobType, missing: missingCredentials(jobType, DEMO_PRO_CREDENTIALS, today()) }] : [];
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
  };
}

function useOfferList() {
  const { session } = useAuth();
  const { data, loading, reload } = useLive(async () => (await loadMyOffers()).flatMap((o) => fromLive(o) ?? []), isLive ? [] : listOffers());
  const proId = session?.user.id;
  useEffect(() => (proId ? subscribeOffers(proId, () => void reload()) : undefined), [proId, reload]);
  return { offers: data, loading };
}

/** This pro's open offers, kept up to date as new ones arrive. Demo offers without a backend. */
export function useOffers(): OfferView[] {
  return useOfferList().offers;
}

/** One offer, and whether the list is still loading (so "gone" isn't shown too early). */
export function useOffer(id: string): { offer: OfferView | undefined; loading: boolean } {
  const { offers, loading } = useOfferList();
  return { offer: offers.find((o) => o.id === id), loading };
}

/** Open quote requests this pro can answer, live or demo, and whether they're still loading. */
export function useQuoteRequestList(trades: Trade[]): { requests: QuoteRequestView[]; loading: boolean } {
  const { data, loading } = useLive(
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
    isLive ? [] : listQuoteRequests(),
    trades.join(','),
  );
  return { requests: data.filter((r) => r.quotableAs.length > 0), loading };
}

export function useQuoteRequests(trades: Trade[]): QuoteRequestView[] {
  return useQuoteRequestList(trades).requests;
}
