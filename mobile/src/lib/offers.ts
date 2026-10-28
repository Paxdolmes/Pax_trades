import { CALLOUT_RATES, findJobType, formatPence, type CredentialType, type JobType } from '@/domain/catalog';
import { missingCredentials } from '@/domain/rules';
import { DEMO_OFFERS, DEMO_PRO_CREDENTIALS, type DemoOffer } from '@/lib/demo';

export const today = () => new Date().toISOString().slice(0, 10);

export type OfferView = DemoOffer & { jobType: JobType; missing: CredentialType[] };

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
