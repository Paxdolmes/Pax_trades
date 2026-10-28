// Pure business rules shared by the app and mirrored in the database.
// Kept free of React Native imports so they run under `node --test`.

import { PILOT, QUOTE_REQUIREMENTS, type CredentialType, type JobType, type Trade } from './catalog.ts';

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

const HOUR = 3_600_000;
const MINUTE = 60_000;

/**
 * Hides phone numbers and emails in a chat message so bookings stay in the app.
 * Mirrors mask_contact_details() in the database.
 */
export function maskContactDetails(body: string): string {
  return body
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email hidden]')
    .replace(/(\+?\d[\s().-]*){10,}/g, '[number hidden] ')
    .trimEnd();
}

/** When the pro must arrive: an hour after accepting an urgent job, or the booked slot plus grace. */
export function arriveBy(urgent: boolean, acceptedAt: number, scheduledFor: number | null): number {
  return urgent ? acceptedAt + PILOT.urgentEtaMinutes * MINUTE : (scheduledFor ?? acceptedAt) + PILOT.lateGraceMinutes * MINUTE;
}

/** True once the pro has missed the arrive-by time and the grace period, so the job goes to the next pro. */
export function isLate(arriveByMs: number, now: number): boolean {
  return now > arriveByMs + PILOT.lateGraceMinutes * MINUTE;
}

/** When a finished job confirms itself if the customer neither confirms nor reports a problem. */
export function autoConfirmAt(finishedAt: number): number {
  return finishedAt + PILOT.autoConfirmHours * HOUR;
}

/** The customer can report a problem until 30 days after the job was confirmed. */
export function canReportProblem(confirmedAt: number | null, now: number): boolean {
  return confirmedAt === null || now < confirmedAt + PILOT.guaranteeDays * 24 * HOUR;
}

/** Reviews only come from jobs that were finished, confirmed and paid. */
export function canReview(job: { status: string; paid: boolean; reviewed: boolean }): boolean {
  return job.status === 'completed' && job.paid && !job.reviewed;
}

export type Media = { kind: 'photo' | 'video'; seconds?: number };

/** Up to 3 photos, or one video of 30 seconds or less. Returns why not, or null if fine. */
export function mediaProblem(current: Media[], next: Media): string | null {
  if (next.kind === 'video' && (next.seconds ?? 0) > PILOT.maxVideoSeconds) return `Videos can be up to ${PILOT.maxVideoSeconds} seconds`;
  if (current.some((m) => m.kind === 'video')) return 'You can add one video, or up to 3 photos';
  if (next.kind === 'video' && current.length > 0) return 'You can add one video, or up to 3 photos';
  if (current.length >= PILOT.maxPhotos) return `You can add up to ${PILOT.maxPhotos} photos`;
  return null;
}

/** Average rating to one decimal, or null with no reviews yet. */
export function ratingSummary(ratings: number[]): { rating: number | null; count: number } {
  if (ratings.length === 0) return { rating: null, count: 0 };
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return { rating: Math.round(avg * 10) / 10, count: ratings.length };
}

/** "31/01/2027" to "2027-01-31", or null unless it's a real date after today. */
export function parseUkDate(text: string, today = new Date()): string | null {
  const m = text.trim().match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/);
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  const iso = d.toISOString().slice(0, 10);
  return iso > today.toISOString().slice(0, 10) ? iso : null;
}
