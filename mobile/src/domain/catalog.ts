// Launch catalogue: trades, job types and the credentials each job needs.
// Prices are in pence and come from the Phase 0 launch price list.

export type Trade =
  | 'plumbing'
  | 'electrical'
  | 'heating'
  | 'drains'
  | 'locksmith'
  | 'handyman'
  | 'carpentry'
  | 'appliances';

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

/**
 * Every trade the database knows. `short` fits a small tile; `service` names the
 * trade on the website; `includes` says what customers can book under it.
 * Customers only see OFFERED_TRADES; the rest stay for older jobs and pros.
 */
export const TRADES: { id: Trade; label: string; short: string; service: string; detail: string; pro: string; includes: string[] }[] = [
  { id: 'plumbing', label: 'Plumber', short: 'Plumber', service: 'Plumbing', detail: 'Leaks, taps, toilets and hot water', pro: 'plumber', includes: ['Leaks and burst pipes', 'Dripping taps', 'Toilets that block, run or won’t flush', 'Washing machines and dishwashers plumbed in', 'Hot water cylinders'] },
  { id: 'electrical', label: 'Electrician', short: 'Electrician', service: 'Electrical', detail: 'Faults, sockets, lighting and safety checks', pro: 'electrician', includes: ['Power cuts and tripping fuses', 'Sockets and switches', 'Lights and light fittings', 'Electrical repairs', 'EICR safety certificates'] },
  { id: 'heating', label: 'Heating & gas engineer', short: 'Heating', service: 'Heating & gas', detail: 'No heat, boilers, radiators and CP12', pro: 'Gas Safe engineer', includes: ['No heating or hot water', 'Boiler faults and error codes', 'Boiler servicing', 'Radiators', 'Gas safety certificates (CP12)'] },
  { id: 'drains', label: 'Drain engineer', short: 'Drains', service: 'Drains', detail: 'Blocked sinks, showers and outside drains', pro: 'drain engineer', includes: [] },
  { id: 'locksmith', label: 'Locksmith', short: 'Locksmith', service: 'Locksmith', detail: 'Locked out, broken or new locks', pro: 'locksmith', includes: [] },
  { id: 'handyman', label: 'Handyman', short: 'Handyman', service: 'Handyman', detail: 'Shelves, pictures, curtain rails and flat-pack', pro: 'handyman', includes: [] },
  { id: 'carpentry', label: 'Carpenter', short: 'Carpenter', service: 'Carpentry', detail: 'Doors, floors, shelves and flat-pack', pro: 'carpenter', includes: ['Doors that stick, break or need hanging', 'Floorboards, skirting and woodwork', 'Shelves, pictures, curtain rails and TV mounting', 'Flat-pack furniture'] },
  { id: 'appliances', label: 'Appliance engineer', short: 'Appliances', service: 'Appliance repairs', detail: 'Washing machines, dishwashers and ovens', pro: 'appliance engineer', includes: [] },
];

/** What customers can book while Relay launches, in the order the website shows them. */
export const OFFERED_TRADES = (['heating', 'electrical', 'plumbing', 'carpentry'] as const).map((id) => TRADES.find((t) => t.id === id)!);

export const isOffered = (trade: Trade) => OFFERED_TRADES.some((t) => t.id === trade);

/** Shown as "coming soon" on the website. Roofing comes from Pimlico Plumbers' range. */
export const COMING_SOON = ['Drains', 'Locksmiths', 'Appliance repairs', 'Roofing'];

/** Trades where a pro can be with you within the hour. */
export const URGENT_TRADES: Trade[] = ['heating', 'electrical', 'plumbing'];

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
    label: 'Blocked toilet',
    requires: ['plumbing_nvq', 'public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: true,
  },
  {
    id: 'tap-repair',
    trade: 'plumbing',
    label: 'Dripping or broken tap',
    requires: ['plumbing_nvq', 'public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: false,
  },
  {
    id: 'toilet-repair',
    trade: 'plumbing',
    label: "Toilet won't flush or keeps running",
    requires: ['plumbing_nvq', 'public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: true,
  },
  {
    id: 'appliance-plumb-in',
    trade: 'plumbing',
    label: 'Plumb in a washing machine or dishwasher',
    requires: ['plumbing_nvq', 'public_liability'],
    pricing: { kind: 'fixed', pence: 9500 },
    urgentAllowed: false,
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
    id: 'light-fitting',
    trade: 'electrical',
    label: 'Replace a light fitting',
    requires: ['competent_person_scheme', 'public_liability'],
    pricing: { kind: 'fixed', pence: 9500, extraUnitPence: 4000, extraUnitLabel: 'each extra' },
    urgentAllowed: false,
  },
  {
    id: 'electrical-repair',
    trade: 'electrical',
    label: 'Other electrical repair',
    requires: ['competent_person_scheme', 'public_liability'],
    pricing: { kind: 'callout' },
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
    id: 'boiler-repair',
    trade: 'heating',
    label: 'Boiler fault or error code',
    requires: ['gas_safe', 'public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: true,
  },
  {
    id: 'radiator',
    trade: 'heating',
    label: 'Radiator cold, leaking or needs moving',
    requires: ['gas_safe', 'public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: false,
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
  {
    id: 'blocked-sink',
    trade: 'drains',
    label: 'Blocked sink, shower or bath',
    requires: ['public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: true,
  },
  {
    id: 'blocked-drain',
    trade: 'drains',
    label: 'Blocked outside drain or manhole',
    requires: ['public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: true,
  },
  {
    id: 'locked-out',
    trade: 'locksmith',
    label: 'Locked out',
    requires: ['public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: true,
  },
  {
    id: 'lock-change',
    trade: 'locksmith',
    label: 'Change, repair or upgrade a lock',
    requires: ['public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: true,
  },
  {
    id: 'odd-jobs',
    trade: 'carpentry',
    label: 'Shelves, pictures, curtain rails or TV mounting',
    requires: ['public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: false,
  },
  {
    id: 'flat-pack',
    trade: 'carpentry',
    label: 'Flat-pack furniture assembly',
    requires: ['public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: false,
  },
  {
    id: 'door-repair',
    trade: 'carpentry',
    label: 'Door sticking, broken or needs hanging',
    requires: ['public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: false,
  },
  {
    id: 'floor-repair',
    trade: 'carpentry',
    label: 'Floorboards, skirting or woodwork repair',
    requires: ['public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: false,
  },
  {
    id: 'washer-repair',
    trade: 'appliances',
    label: 'Washing machine or dishwasher fault',
    requires: ['public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: false,
  },
  {
    id: 'oven-repair',
    trade: 'appliances',
    label: 'Electric oven, hob or fridge fault',
    requires: ['public_liability'],
    pricing: { kind: 'callout' },
    urgentAllowed: false,
  },
];

// "Something else? Get quotes": work outside the catalogue still needs the
// trade's baseline documents. Mirrors the custom-* job types in the database.
export const QUOTE_REQUIREMENTS: Record<Trade, CredentialType[]> = {
  plumbing: ['plumbing_nvq', 'public_liability'],
  electrical: ['competent_person_scheme', 'public_liability'],
  heating: ['gas_safe', 'public_liability'],
  drains: ['public_liability'],
  locksmith: ['public_liability'],
  handyman: ['public_liability'],
  carpentry: ['public_liability'],
  appliances: ['public_liability'],
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

const QUOTED_LABELS: Record<Trade, string> = {
  plumbing: 'Quoted plumbing job',
  electrical: 'Quoted electrical job',
  heating: 'Quoted heating or gas job',
  drains: 'Quoted drainage job',
  locksmith: 'Quoted locksmith job',
  handyman: 'Quoted handyman job',
  carpentry: 'Quoted carpentry job',
  appliances: 'Quoted appliance repair',
};

/**
 * A catalogue job, or a job made from an accepted quote (custom-plumbing and so on).
 * Pass the quoted price so a quoted job shows it; it's a fixed price once accepted.
 */
export function findJobType(id: string, quotedPence?: number | null): JobType | undefined {
  const listed = JOB_TYPES.find((j) => j.id === id);
  if (listed) return listed;
  const trade = id.startsWith('custom-') ? (id.slice('custom-'.length) as Trade) : null;
  if (!trade || !(trade in QUOTE_REQUIREMENTS)) return undefined;
  return {
    id,
    trade,
    label: QUOTED_LABELS[trade],
    requires: QUOTE_REQUIREMENTS[trade],
    pricing: { kind: 'fixed', pence: quotedPence ?? 0 },
    urgentAllowed: false,
  };
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
