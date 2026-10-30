// Finding a job from what the customer types, e.g. "boiler", "tap" or "fuse".
// Kept free of React Native imports so it runs under `node --test`.

import { isOffered, JOB_TYPES, TRADES, type JobType } from './catalog.ts';

// Everyday words for jobs whose names don't use them.
const EXTRA_WORDS: Record<string, string> = {
  leak: 'water dripping ceiling pipe flood',
  'blocked-toilet': 'loo',
  'tap-repair': 'leaking tap washer',
  'toilet-repair': 'loo cistern flush',
  'appliance-plumb-in': 'install washing machine dishwasher',
  'power-fault': 'electricity no power fuse box trips rcd',
  'socket-replace': 'plug switch',
  'light-fitting': 'lamp ceiling light',
  'eicr-small': 'electrical safety certificate landlord',
  'no-heating': 'cold radiators no hot water',
  'boiler-repair': 'boiler broken pressure',
  'boiler-service': 'annual boiler check',
  cp12: 'gas safety certificate landlord gas check',
  'boiler-service-cp12': 'landlord gas safety certificate',
  'odd-jobs': 'tv mount shelf picture hanging curtain',
  'flat-pack': 'ikea furniture assemble',
  'door-repair': 'door stuck sticking hinge',
  'floor-repair': 'creaky floorboard skirting board',
};

const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

function haystack(job: JobType): string[] {
  const trade = TRADES.find((t) => t.id === job.trade);
  return words(`${job.label} ${trade?.service ?? ''} ${trade?.label ?? ''} ${EXTRA_WORDS[job.id] ?? ''}`);
}

/** Bookable jobs matching every word typed (as the start of a word), best matches first. */
export function searchJobs(query: string): JobType[] {
  const wanted = words(query);
  if (!wanted.length) return [];
  const scored = JOB_TYPES.filter((j) => isOffered(j.trade)).flatMap((job) => {
    const hay = haystack(job);
    if (!wanted.every((w) => hay.some((h) => h.startsWith(w)))) return [];
    // Jobs whose own name has the words come before ones found by trade or extra words.
    const inName = words(job.label);
    const score = wanted.filter((w) => inName.some((h) => h.startsWith(w))).length;
    return [{ job, score }];
  });
  return scored.sort((a, b) => b.score - a.score).map((s) => s.job);
}
