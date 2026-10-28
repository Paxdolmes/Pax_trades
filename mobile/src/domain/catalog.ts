// Launch catalogue: trades, job types and the credentials each job needs.
// Prices are in pence and come from the Phase 0 launch price list.

export type Trade = 'plumbing' | 'electrical' | 'heating';

export type CredentialType =
  | 'gas_safe'
  | 'competent_person_scheme' // NICEIC, NAPIT or ELECSA (Part P self-certification)
  | 'plumbing_nvq'
  | 'unvented_g3'
  | 'public_liability';

export type Pricing =
  | { kind: 'callout' } // urgent callout rates apply
  | { kind: 'fixed'; pence: number; extraUnitPence?: number; extraUnitLabel?: string };

export type JobType = {
  id: string;
  trade: Trade;
  label: string;
  requires: CredentialType[];
  pricing: Pricing;
  urgentAllowed: boolean;
};

export const TRADES: { id: Trade; label: string; detail: string; pro: string }[] = [
  { id: 'plumbing', label: 'Plumber', detail: 'Leaks, blockages, taps and toilets', pro: 'plumber' },
  { id: 'electrical', label: 'Electrician', detail: 'Faults, sockets, lighting and fuse boxes', pro: 'electrician' },
  { id: 'heating', label: 'Heating & gas engineer', detail: 'No heat, boilers, servicing and CP12', pro: 'Gas Safe engineer' },
];

export const CALLOUT_RATES = {
  standard: { firstHourPence: 9500, perHourPence: 8000, label: '7am to 8pm weekdays' },
  outOfHours: { firstHourPence: 16000, perHourPence: 11000, label: 'Evenings and weekends' },
} as const;

export const STANDARD_COMMISSION = 0.15;
export const FOUNDING_COMMISSION = 0.1;

export const JOB_TYPES: JobType[] = [
  {
    id: 'leak',
    trade: 'plumbing',
    label: 'Leak or burst pipe',
    requires: ['plumbing_nvq', 'public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: true,
  },
  {
    id: 'blocked-toilet',
    trade: 'plumbing',
    label: 'Blocked toilet or drain',
    requires: ['plumbing_nvq', 'public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: true,
  },
  {
    id: 'unvented-cylinder',
    trade: 'plumbing',
    label: 'Unvented hot water cylinder',
    requires: ['plumbing_nvq', 'unvented_g3', 'public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: true,
  },
  {
    id: 'power-fault',
    trade: 'electrical',
    label: 'Power cut or tripping fuse',
    requires: ['competent_person_scheme', 'public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: true,
  },
  {
    id: 'socket-replace',
    trade: 'electrical',
    label: 'Replace a socket or switch',
    requires: ['competent_person_scheme', 'public_liability'],
    pricing: { kind: 'fixed', pence: 9500, extraUnitPence: 4000, extraUnitLabel: 'each extra' },
    urgentAllowed: false,
  },
  {
    id: 'eicr-small',
    trade: 'electrical',
    label: 'EICR, flat up to 2 bedrooms',
    requires: ['competent_person_scheme', 'public_liability'],
    pricing: { kind: 'fixed', pence: 26000 },
    urgentAllowed: false,
  },
  {
    id: 'no-heating',
    trade: 'heating',
    label: 'No heating or hot water',
    requires: ['gas_safe', 'public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: true,
  },
  {
    id: 'boiler-service',
    trade: 'heating',
    label: 'Boiler service',
    requires: ['gas_safe', 'public_liability'],
    pricing: { kind: 'fixed', pence: 11900 },
    urgentAllowed: false,
  },
  {
    id: 'cp12',
    trade: 'heating',
    label: 'Landlord gas safety certificate (CP12)',
    requires: ['gas_safe', 'public_liability'],
    pricing: { kind: 'fixed', pence: 9500, extraUnitPence: 2000, extraUnitLabel: 'per extra gas appliance' },
    urgentAllowed: false,
  },
  {
    id: 'boiler-service-cp12',
    trade: 'heating',
    label: 'Boiler service plus CP12',
    requires: ['gas_safe', 'public_liability'],
    pricing: { kind: 'fixed', pence: 14900 },
    urgentAllowed: false,
  },
];

// "Something else? Get quotes": work outside the catalogue still needs the
// trade's baseline documents. Mirrors the custom-* job types in the database.
export const QUOTE_REQUIREMENTS: Record<Trade, CredentialType[]> = {
  plumbing: ['plumbing_nvq', 'public_liability'],
  electrical: ['competent_person_scheme', 'public_liability'],
  heating: ['gas_safe', 'public_liability'],
};

export type QuoteTiming = 'asap' | 'this_week' | 'flexible';

export const QUOTE_TIMING_LABELS: Record<QuoteTiming, string> = {
  asap: 'As soon as possible',
  this_week: 'This week',
  flexible: "I'm flexible",
};

// Pilot trust rules. Mirrors relay_setting() and friends in the database.
export const PILOT = {
  guaranteeDays: 30, // customers can report a problem this long after the job
  autoConfirmHours: 48, // a finished job confirms itself after this, unless disputed
  urgentEtaMinutes: 60, // an urgent pro must arrive within this
  lateGraceMinutes: 15, // slack before a late job goes to the next pro
  noShowCreditPence: 1000, // credit for the customer when a pro doesn't turn up
  maxQuotesPerRequest: 5,
  maxPhotos: 3,
  maxVideoSeconds: 30,
} as const;

// Shown next to every customer price: what they see is what they pay.
export const ALL_IN_NOTE = 'Includes VAT and fees. No hidden fees.';

// Outward codes served at launch. Anything else joins the waitlist.
export const LAUNCH_OUTWARD_CODES = ['SW6'];

export function jobTypesForTrade(trade: Trade): JobType[] {
  return JOB_TYPES.filter((j) => j.trade === trade);
}

export function findJobType(id: string): JobType | undefined {
  return JOB_TYPES.find((j) => j.id === id);
}

export function formatPence(pence: number): string {
  const pounds = pence / 100;
  const digits = Number.isInteger(pounds) ? 0 : 2;
  return `£${pounds.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** Cheapest way in for a trade: the lowest fixed price or the standard first-hour callout. */
export function fromPricePence(trade: Trade): number {
  return Math.min(
    ...jobTypesForTrade(trade).map((j) =>
      j.pricing.kind === 'fixed' ? j.pricing.pence : CALLOUT_RATES.standard.firstHourPence,
    ),
  );
}
