import { CALLOUT_RATES, formatPence, type JobType } from '@/domain/catalog';
import { isOutOfHours } from '@/domain/rules';
import type { Urgency } from '@/lib/jobs';

/** Callout rate that applies to a request made now. */
export function currentRate(urgency: Urgency, now = new Date()) {
  return urgency === 'urgent' && isOutOfHours(now.getDay(), now.getHours())
    ? CALLOUT_RATES.outOfHours
    : CALLOUT_RATES.standard;
}

/** One-line price shown to the customer, e.g. "£95 including the first hour, then £80 per hour". */
export function priceLine(job: JobType, urgency: Urgency): string {
  if (job.pricing.kind === 'fixed') {
    const extra = job.pricing.extraUnitPence
      ? `, plus ${formatPence(job.pricing.extraUnitPence)} ${job.pricing.extraUnitLabel}`
      : '';
    return `${formatPence(job.pricing.pence)} fixed price${extra}`;
  }
  const rate = currentRate(urgency);
  return `${formatPence(rate.firstHourPence)} including the first hour, then ${formatPence(rate.perHourPence)} per hour`;
}

/** The amount held on the customer's card when they request. */
export function upfrontPence(job: JobType, urgency: Urgency): number {
  return job.pricing.kind === 'fixed' ? job.pricing.pence : currentRate(urgency).firstHourPence;
}
