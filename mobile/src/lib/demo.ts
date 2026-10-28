// Demo data used until a Supabase project is connected, so the apps can be
// clicked through on a phone from day one.

import type { CredentialType, Trade } from '@/domain/catalog';
import type { Credential } from '@/domain/rules';

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
  name: 'James Carter',
  firstName: 'James',
  rating: 4.9,
  jobs: 128,
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
