// Demo data used until a Supabase project is connected, so the apps can be
// clicked through on a phone from day one.

import type { CredentialType, QuoteTiming, Trade } from '@/domain/catalog';
import type { Credential } from '@/domain/rules';
import type { Quote } from '@/lib/quotes';

export const CREDENTIAL_LABELS: Record<CredentialType, string> = {
  gas_safe: 'Gas Safe registration',
  competent_person_scheme: 'NICEIC, NAPIT or ELECSA',
  plumbing_nvq: 'Plumbing NVQ Level 2 or 3',
  unvented_g3: 'G3 unvented hot water',
  public_liability: 'Public liability insurance',
};

/** What each credential unlocks, shown while it's missing. */
export const CREDENTIAL_UNLOCKS: Record<CredentialType, string> = {
  gas_safe: 'Unlocks boilers and gas appliances',
  competent_person_scheme: 'Unlocks electrical jobs and EICRs',
  plumbing_nvq: 'Unlocks plumbing jobs',
  unvented_g3: 'Unlocks unvented cylinders',
  public_liability: 'Needed for every job',
};

export const DEMO_CUSTOMER = { name: 'Sophie Turner', firstName: 'Sophie', postcode: 'SW6 4EH' };

export const DEMO_PRO = {
  id: 'demo-james',
  name: 'James Carter',
  firstName: 'James',
  rating: 4.9,
  jobs: 128,
  reviews: 46,
  since: 'March 2026',
  van: 'Grey Ford Transit · LK21 PXA',
  gasSafeNumber: '512345',
  etaMinutes: 12,
};

/** The signed-in tradesperson in the Relay Traders demo. */
export const DEMO_TRADER = {
  name: 'Tom Haskins',
  firstName: 'Tom',
  trades: ['plumbing', 'heating'] as Trade[],
  founding: true,
};

export const DEMO_PRO_CREDENTIALS: Credential[] = [
  { type: 'gas_safe', verified: true, expiresOn: '2027-06-30' },
  { type: 'public_liability', verified: true, expiresOn: '2027-01-31' },
  { type: 'plumbing_nvq', verified: true, expiresOn: null },
];

/** Extra work the pro asks the customer to approve mid-job. */
export const DEMO_EXTRA_WORK = {
  title: 'Replace diverter valve',
  reason: "The valve that switches between heating and hot water has seized, so hot water isn't reaching your taps.",
  lines: [
    { label: 'Parts', detail: 'Diverter valve, Worcester Bosch', pence: 6800 },
    { label: 'Labour', detail: '30 min at £80 per hour', pence: 4000 },
  ],
};

export type DemoOffer = {
  id: string;
  jobTypeId: string;
  postcode: string;
  street: string;
  customer: string;
  distanceKm: number;
  minutesAway: number;
  urgent: boolean;
  when: string;
  note: string;
};

export const DEMO_OFFERS: DemoOffer[] = [
  {
    id: 'o1',
    jobTypeId: 'no-heating',
    postcode: 'SW6 4EH',
    street: '14 Lettice Street',
    customer: 'Sarah C.',
    distanceKm: 1.2,
    minutesAway: 6,
    urgent: true,
    when: 'Now',
    note: 'Combi boiler showing fault code F28',
  },
  {
    id: 'o2',
    jobTypeId: 'leak',
    postcode: 'SW6 5',
    street: 'Bishops Road',
    customer: 'Daniel R.',
    distanceKm: 2.1,
    minutesAway: 9,
    urgent: false,
    when: 'Today, 16:00 to 18:00',
    note: 'Dripping under the kitchen sink',
  },
  {
    id: 'o3',
    jobTypeId: 'boiler-service-cp12',
    postcode: 'SW6 6',
    street: 'Munster Road',
    customer: 'Priya S.',
    distanceKm: 2.8,
    minutesAway: 11,
    urgent: false,
    when: 'Tomorrow, 08:00 to 12:00',
    note: 'Landlord service and gas safety record',
  },
  {
    id: 'o4',
    jobTypeId: 'eicr-small',
    postcode: 'SW6 3',
    street: 'Peterborough Road',
    customer: 'Alex M.',
    distanceKm: 1.8,
    minutesAway: 8,
    urgent: false,
    when: 'Thu, any time',
    note: 'Landlord needs an EICR for a 2-bed flat',
  },
];

/** Net earnings per day last week, in pence, after commission. */
export const DEMO_WEEK = [
  { day: 'Mon', pence: 16800, jobs: 2 },
  { day: 'Tue', pence: 23600, jobs: 3 },
  { day: 'Wed', pence: 19200, jobs: 2 },
  { day: 'Thu', pence: 27400, jobs: 3 },
  { day: 'Fri', pence: 21400, jobs: 2 },
  { day: 'Sat', pence: 13200, jobs: 1 },
  { day: 'Sun', pence: 6800, jobs: 1 },
];

export const DEMO_COMPLETED = [
  { title: 'Boiler repair, F28 fault', customer: 'Sarah C.', place: 'Lettice St · Thu', grossPence: 17500 },
  { title: 'Leaking kitchen tap', customer: 'Daniel R.', place: 'Bishops Rd · Thu', grossPence: 9500 },
  { title: 'Boiler service', customer: 'Priya S.', place: 'Munster Rd · Fri', grossPence: 11900 },
];

/** Quotes that arrive on a demo "Something else?" request, a few seconds apart. */
export const DEMO_QUOTES: (Quote & { afterMs: number })[] = [
  {
    id: 'demo-q1',
    proName: 'James Carter',
    trade: 'heating',
    rating: 4.9,
    jobs: 128,
    pricePence: 18000,
    earliest: 'Thu 30 Oct, 9am',
    note: 'Includes draining down, moving the pipework and refilling. Towel rail supplied by you.',
    afterMs: 2500,
  },
  {
    id: 'demo-q2',
    proName: 'Tomasz Nowak',
    trade: 'plumbing',
    rating: 4.8,
    jobs: 64,
    pricePence: 15000,
    earliest: 'Mon 3 Nov, 8am',
    note: 'Half a day. I can bring a chrome towel rail for £45 extra if you need one.',
    afterMs: 5500,
  },
  {
    id: 'demo-q3',
    proName: 'Ade Okafor',
    trade: 'heating',
    rating: 5,
    jobs: 31,
    pricePence: 21000,
    earliest: 'Tomorrow, 1pm',
    note: 'Can do it tomorrow afternoon. Price includes new valves.',
    afterMs: 9000,
  },
];

export type DemoQuoteRequest = {
  id: string;
  customer: string;
  postcode: string;
  description: string;
  trades: Trade[];
  timing: QuoteTiming;
  postedAgo: string;
  quotes: number;
};

/** Open "Something else?" requests a pro might see. */
export const DEMO_QUOTE_REQUESTS: DemoQuoteRequest[] = [
  {
    id: 'demo-r1',
    customer: 'Sophie T.',
    postcode: 'SW6 4',
    description: 'Move a radiator to the other wall in the bathroom and fit a towel rail in its place.',
    trades: [],
    timing: 'this_week',
    postedAgo: '12 min ago',
    quotes: 1,
  },
  {
    id: 'demo-r2',
    customer: 'Daniel R.',
    postcode: 'SW6 5',
    description: 'Fit an outside tap on the back wall of the house, near the kitchen sink.',
    trades: ['plumbing'],
    timing: 'flexible',
    postedAgo: '1 h ago',
    quotes: 3,
  },
  {
    id: 'demo-r3',
    customer: 'Alex M.',
    postcode: 'SW6 3',
    description: 'Install an electric car charger on the front of the house.',
    trades: ['electrical'],
    timing: 'flexible',
    postedAgo: '2 h ago',
    quotes: 2,
  },
];

export type DemoReview = {
  id: string;
  customer: string;
  rating: number;
  body: string;
  job: string;
  when: string;
  reply?: string;
};

/** Verified reviews for James, the demo customer's pro. Every one is from a paid, finished job. */
export const DEMO_PRO_REVIEWS: DemoReview[] = [
  {
    id: 'rv1',
    customer: 'Hannah W.',
    rating: 5,
    body: 'Boiler back on within 40 minutes of booking. Explained the fault and showed me the old part.',
    job: 'No heating or hot water',
    when: '3 days ago',
    reply: 'Thanks Hannah, glad you were warm again before the weekend.',
  },
  {
    id: 'rv2',
    customer: 'Marcus O.',
    rating: 5,
    body: 'Tidy, on time, and the price was exactly what the app said.',
    job: 'Boiler service',
    when: '1 week ago',
  },
  {
    id: 'rv3',
    customer: 'Priya S.',
    rating: 4,
    body: 'Good work on the radiator valves. Arrived near the end of the slot but messaged ahead.',
    job: 'Radiator not heating',
    when: '2 weeks ago',
    reply: 'Sorry for cutting it fine, Priya. The job before ran over. Thanks for the review.',
  },
];

/** Reviews of the demo trader, Tom, as he sees them. */
export const DEMO_TRADER_REVIEWS: DemoReview[] = [
  {
    id: 'tr1',
    customer: 'Sarah C.',
    rating: 5,
    body: 'Fixed the F28 fault quickly and left everything clean. Would book again.',
    job: 'Boiler repair, F28 fault',
    when: 'Thu',
  },
  {
    id: 'tr2',
    customer: 'Daniel R.',
    rating: 4,
    body: 'Tap sorted. Took a little longer than expected but kept me updated.',
    job: 'Leaking kitchen tap',
    when: 'Thu',
    reply: 'Thanks Daniel. The old valve was seized solid, glad it is sorted.',
  },
  {
    id: 'tr3',
    customer: 'Priya S.',
    rating: 5,
    body: 'Friendly and thorough. Gas safety record was in the app the same day.',
    job: 'Boiler service',
    when: 'Fri',
  },
];

export type DemoChatLine = { from: 'customer' | 'pro'; body: string; at: string };

/** The opening of the chat on the demo job, seen from either side. */
export const DEMO_CHAT: DemoChatLine[] = [
  { from: 'pro', body: "Hi, I'm on my way now. Is there somewhere I can park nearby?", at: '10:31' },
  { from: 'customer', body: 'Hi! There are pay-and-display bays right outside. Ring the top bell.', at: '10:32' },
];

/** What the other side says back in demo mode, so the chat feels alive. */
export const DEMO_CHAT_REPLY: Record<'customer' | 'pro', string> = {
  customer: 'Great, thanks. See you shortly.',
  pro: 'No problem, see you in a few minutes.',
};
