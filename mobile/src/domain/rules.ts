// Pure business rules shared by the app and mirrored in the database.
// Kept free of React Native imports so they run under `node --test`.

import { QUOTE_REQUIREMENTS, type CredentialType, type JobType, type Trade } from './catalog.ts';

export type Credential = {
  type: CredentialType;
  verified: boolean;
  expiresOn: string | null; // ISO date, null if it never expires
};

/** True when the credential is verified and has not expired on `today`. */
export function isCredentialValid(c: Credential, today: string): boolean {
  if (!c.verified) return false;
  if (c.expiresOn === null) return true;
  return c.expiresOn >= today;
}

export type CredentialStatus = 'missing' | 'pending' | 'expired' | 'expiring' | 'verified';

/** Days before expiry when a pro is asked to upload a renewal. */
export const RENEWAL_WARNING_DAYS = 30;

/** Where a pro stands on one credential type, for the documents screen. */
export function credentialStatus(c: Credential | undefined, today: string): CredentialStatus {
  if (!c) return 'missing';
  if (!c.verified) return 'pending';
  if (c.expiresOn === null) return 'verified';
  if (c.expiresOn < today) return 'expired';
  const daysLeft = (Date.parse(c.expiresOn) - Date.parse(today)) / 86_400_000;
  return daysLeft <= RENEWAL_WARNING_DAYS ? 'expiring' : 'verified';
}

/** Credentials a pro is missing (or holds only expired/unverified) for a job type. */
export function missingCredentials(
  job: Pick<JobType, 'requires'>,
  credentials: Credential[],
  today: string,
): CredentialType[] {
  return job.requires.filter(
    (needed) => !credentials.some((c) => c.type === needed && isCredentialValid(c, today)),
  );
}

export function canTakeJob(
  job: Pick<JobType, 'requires'>,
  credentials: Credential[],
  today: string,
): boolean {
  return missingCredentials(job, credentials, today).length === 0;
}

/** Outward code of a UK postcode, e.g. "sw6 1aa" -> "SW6". Null if it does not look like a postcode. */
export function outwardCode(postcode: string): string | null {
  const cleaned = postcode.toUpperCase().replace(/\s+/g, '');
  const match = /^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/.exec(cleaned);
  return match ? match[1] : null;
}

export function isInLaunchArea(postcode: string, outwardCodes: string[]): boolean {
  const outward = outwardCode(postcode);
  return outward !== null && outwardCodes.includes(outward);
}

/** Out-of-hours = before 7am, from 8pm, or any time Saturday/Sunday (UK local time passed in). */
export function isOutOfHours(localDay: number, localHour: number): boolean {
  const weekend = localDay === 0 || localDay === 6;
  return weekend || localHour < 7 || localHour >= 20;
}

/** Callout charge in pence: first hour flat, then billed per started half hour. */
export function calloutChargePence(
  minutesOnSite: number,
  rate: { firstHourPence: number; perHourPence: number },
): number {
  if (minutesOnSite <= 60) return rate.firstHourPence;
  const extraHalfHours = Math.ceil((minutesOnSite - 60) / 30);
  return rate.firstHourPence + extraHalfHours * Math.round(rate.perHourPence / 2);
}

/** Split a customer payment into platform commission and the pro's payout, in pence. */
export function splitPayment(totalPence: number, commissionRate: number) {
  const platformPence = Math.round(totalPence * commissionRate);
  return { platformPence, proPence: totalPence - platformPence };
}

/**
 * Trades a pro can quote under for a request. An empty `requestTrades` means the
 * customer wasn't sure, so any of the pro's trades with valid documents will do.
 */
export function quotableTrades(
  requestTrades: Trade[],
  proTrades: Trade[],
  credentials: Credential[],
  today: string,
): Trade[] {
  return proTrades.filter(
    (t) =>
      (requestTrades.length === 0 || requestTrades.includes(t)) &&
      missingCredentials({ requires: QUOTE_REQUIREMENTS[t] }, credentials, today).length === 0,
  );
}
