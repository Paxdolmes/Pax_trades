// Short guides for the questions people search before they book: "boiler not
// working", "burst pipe what to do", "landlord gas safety certificate". Each lives at
// /guides/<slug> with its title and description in seo.json. Prices come from the
// catalogue so they never drift from the booking screens. Safety advice is kept to
// what the Gas Safe Register, HSE and the energy networks tell the public.

import type { Href } from 'expo-router';

import { CALLOUT_RATES, formatPence, JOB_TYPES, type Trade } from '@/domain/catalog';

import type { LocalPage } from './local';

export type GuideStep = { title: string; text: string };

export type GuideSection = {
  heading: string;
  paragraphs?: string[];
  /** Numbered steps, in the order to do them. */
  steps?: GuideStep[];
  /** Plain bullet points. */
  points?: string[];
  /** A page on this site to read next. */
  link?: { label: string; href: Href };
  /** Links to the official source, opened in a new tab. */
  sources?: { label: string; url: string }[];
};

export type Guide = {
  slug: string;
  path: `/guides/${string}`;
  trade: Trade;
  /** Shown on the guides list. */
  summary: string;
  title: string;
  sub: string;
  /** A safety warning shown above everything else. */
  warning?: { title: string; text: string };
  sections: GuideSection[];
  /** The trade's own page, linked at the end. */
  related: LocalPage['path'];
  /** The job to preview booking with. */
  job: string;
};

/** A fixed-price job's price, e.g. "£119". */
function fixed(id: string): string {
  const job = JOB_TYPES.find((j) => j.id === id);
  if (job?.pricing.kind !== 'fixed') throw new Error(`No fixed price for ${id}`);
  return formatPence(job.pricing.pence);
}

/** A fixed-price job's charge for each extra item, e.g. "£20". */
function extra(id: string): string {
  const job = JOB_TYPES.find((j) => j.id === id);
  if (job?.pricing.kind !== 'fixed' || !job.pricing.extraUnitPence) throw new Error(`No extra price for ${id}`);
  return formatPence(job.pricing.extraUnitPence);
}

const { standard, outOfHours } = CALLOUT_RATES;
const weekday = `${formatPence(standard.firstHourPence)} including the first hour, then ${formatPence(standard.perHourPence)} an hour`;
const evening = `${formatPence(outOfHours.firstHourPence)} for the first hour, then ${formatPence(outOfHours.perHourPence)} an hour`;
const gasEmergency = 'Don’t use light switches or flames. Open doors and windows, turn the gas off at the meter if you can, leave the property and call the National Gas Emergency line on 0800 111 999. It’s free and open 24 hours.';

export const GUIDES: Guide[] = [
  {
    slug: 'boiler-not-working',
    path: '/guides/boiler-not-working',
    trade: 'heating',
    summary: 'Safe checks that often get the heating back on, and when to call a Gas Safe engineer.',
    title: 'Boiler not working? Checks to try before you call an engineer',
    sub: 'No heating or hot water? A few safe checks often get a boiler going again. If they don’t, a Gas Safe registered engineer can find the fault.',
    warning: { title: 'If you smell gas', text: gasEmergency },
    sections: [
      {
        heading: 'Safe checks you can do yourself',
        steps: [
          { title: 'Check it has power', text: 'Is the boiler’s display or light on? If not, check the switch on the wall next to it and look for a tripped switch in your fuse box.' },
          { title: 'Check the timer and thermostat', text: 'A power cut or the clocks changing can reset the timer. Make sure the heating is set to come on now, and turn the room thermostat up a few degrees.' },
          { title: 'Check the pressure', text: 'Most combi boilers should read between 1 and 1.5 bar when the heating is off. If it’s below 1, the boiler may shut itself off. Your boiler’s manual shows how to top it up. If the pressure keeps dropping, there may be a leak, so book an engineer.' },
          { title: 'Look for a frozen condensate pipe', text: 'In freezing weather, the thin plastic pipe that runs from the boiler to a drain outside can freeze, and the boiler stops with an error code or a gurgling noise. Pour warm water, not boiling, along the pipe, then reset the boiler.' },
          { title: 'Reset it once', text: 'If the boiler shows an error code, look it up in the manual and press reset once. If it locks out again, stop resetting it and book an engineer.' },
          { title: 'Check the gas is on', text: 'Does your hob light? If you have a prepayment meter, check it has credit. If no gas appliance works and the meter has credit, call the National Gas Emergency line on 0800 111 999.' },
        ],
      },
      {
        heading: 'What to leave to an engineer',
        paragraphs: [
          'Never take the cover off a boiler or try to repair the gas parts yourself. By law, only a Gas Safe registered engineer can work on gas appliances, and every engineer carries a Gas Safe ID card you can check online.',
          `Relay only sends Gas Safe registered engineers, and you see the price before you book: ${weekday} on weekdays, or ${evening} for urgent help in the evenings and at weekends.`,
        ],
        sources: [{ label: 'Check an engineer on the Gas Safe Register', url: 'https://www.gassaferegister.co.uk/' }],
      },
      {
        heading: 'Stopping it happening again',
        points: [
          `Have your boiler serviced once a year. A boiler service with Relay is a fixed ${fixed('boiler-service')}.`,
          'Keep an eye on the pressure gauge, especially after bleeding radiators.',
          'Run the heating for a short while in summer so parts don’t seize.',
        ],
      },
    ],
    related: '/gas-engineer-fulham',
    job: 'no-heating',
  },
  {
    slug: 'burst-pipe',
    path: '/guides/burst-pipe',
    trade: 'plumbing',
    summary: 'What to do in the first few minutes of a leak or burst pipe to limit the damage.',
    title: 'Burst pipe or leak? What to do right now',
    sub: 'The first few minutes matter most. Here’s how to stop the water, stay safe and limit the damage while a plumber is on the way.',
    warning: { title: 'Water and electrics don’t mix', text: 'If water is near sockets, lights or the fuse box, don’t touch them while you’re standing in water. Switch the electrics off at the fuse box only if you can reach it safely and your hands are dry.' },
    sections: [
      {
        heading: 'Do this first',
        steps: [
          { title: 'Turn off the water at the stopcock', text: 'It’s usually under the kitchen sink, where the water pipe comes into your home. In flats it can be in a cupboard, the hallway or by the front door. Turn it clockwise to close it.' },
          { title: 'Switch off electrics near the water', text: 'If the water is close to anything electrical, turn off the power at the fuse box, as long as you can do it safely.' },
          { title: 'Turn off the boiler or water heater', text: 'Then open your cold taps to drain the water left in the pipes. Flushing the toilets helps too.' },
          { title: 'Catch the water', text: 'Put down buckets and towels and move valuables out of the way. If a ceiling is bulging with water, keep out from under it.' },
          { title: 'Take photos', text: 'Photograph the leak and any damage before you clear up. Your insurer will want to see them.' },
        ],
      },
      {
        heading: 'If you live in a flat',
        points: [
          'Let the neighbours below know, as the water may reach them first.',
          'Tell your landlord, letting agent or building manager as soon as you can.',
          'If the water is coming from the flat above and nobody answers, contact the building manager or your landlord.',
        ],
      },
      {
        heading: 'Frozen pipes',
        paragraphs: [
          'If a pipe has frozen but not burst, turn off the stopcock and thaw it slowly with a hairdryer on a low setting or a hot water bottle, starting at the tap end. Never use a blowtorch or any naked flame.',
        ],
      },
      {
        heading: 'Getting it fixed',
        paragraphs: [
          `For an emergency like a burst pipe, Relay aims to have a vetted local plumber with you within the hour, day or night. It’s ${weekday} on weekdays, or ${evening} in the evenings and at weekends, including VAT and fees.`,
          'Once it’s fixed, find out where your stopcock is and check it turns, so you’re ready next time.',
        ],
      },
    ],
    related: '/plumber-fulham',
    job: 'leak',
  },
  {
    slug: 'plumber-cost-fulham',
    path: '/guides/plumber-cost-fulham',
    trade: 'plumbing',
    summary: 'Relay’s plumbing prices in full, and what changes what you pay.',
    title: 'How much does a plumber cost in Fulham?',
    sub: 'Here’s exactly what a plumber costs with Relay, with VAT and fees included, and what makes a job cost more or less.',
    sections: [
      {
        heading: 'Repairs charged by the hour',
        paragraphs: ['For most repairs nobody knows the fix until they see it, so you pay a callout that includes the first hour.'],
        points: [
          `${standard.label}: ${weekday}.`,
          `Urgent help in the evenings and at weekends: ${evening}.`,
          'After the first hour, time is charged in half hours.',
        ],
      },
      {
        heading: 'Fixed-price jobs',
        paragraphs: [`Some jobs have one price, whatever time it takes. Plumbing in a washing machine or dishwasher is a fixed ${fixed('appliance-plumb-in')}. For bigger jobs, like a new bathroom suite, describe the job and get up to five fixed quotes from local pros, with no obligation.`],
      },
      {
        heading: 'What changes the price',
        points: [
          'When you need someone. Evenings and weekends cost more for urgent jobs.',
          'How long the job takes. A dripping tap is often quick, while tracing a hidden leak can take longer.',
          'Parts. If your plumber needs parts or more work, they explain why and send you the price in the app. Nothing extra happens unless you approve it.',
        ],
      },
      {
        heading: 'Ways to keep the cost down',
        points: [
          'Turn the water off at the stopcock straight away to limit the damage.',
          'Add a photo when you book, so your plumber brings the right parts.',
          'Clear the area around the leak or appliance before they arrive.',
        ],
      },
      {
        heading: 'How you pay',
        paragraphs: ['You see the price before you book. We hold the amount on your card, and you’re only charged once you confirm the job is done.'],
      },
    ],
    related: '/plumber-fulham',
    job: 'tap-repair',
  },
  {
    slug: 'landlord-gas-safety-certificate',
    path: '/guides/landlord-gas-safety-certificate',
    trade: 'heating',
    summary: 'What landlords must do each year, what the engineer checks, and how long to keep the record.',
    title: 'Landlord gas safety certificates (CP12): what you need to know',
    sub: 'If you let a home with gas appliances, you need a gas safety check every year. Here’s what the law asks of you, in plain English.',
    sections: [
      {
        heading: 'What the law says',
        paragraphs: ['The Gas Safety (Installation and Use) Regulations 1998 say that landlords must:'],
        points: [
          'Have every gas appliance, fitting and flue they provide checked every 12 months by a Gas Safe registered engineer.',
          'Give current tenants a copy of the gas safety record within 28 days of the check, and give new tenants a copy before they move in.',
          'Keep each record for at least two years.',
          'Keep gas pipework, appliances and flues in safe working order.',
        ],
      },
      {
        heading: 'Timing the check',
        paragraphs: ['You can have the check done up to two months before the last one runs out and keep the same renewal date, so there’s no need to cut it fine.'],
      },
      {
        heading: 'What the engineer checks',
        points: [
          'Each gas appliance, such as the boiler, hob and any gas fire, is working safely.',
          'Flues and chimneys carry fumes away properly.',
          'There’s enough ventilation, and the gas pressure and safety devices are right.',
          'Gas appliances that belong to your tenant aren’t covered by your check, but you’re still responsible for the gas pipework that serves them.',
        ],
      },
      {
        heading: 'Electrical safety too',
        paragraphs: [`In England, private landlords also need an Electrical Installation Condition Report (EICR) at least every five years, with a copy for tenants within 28 days. An EICR with Relay is a fixed ${fixed('eicr-small')} for a flat with up to two bedrooms.`],
      },
      {
        heading: 'Booking it with Relay',
        paragraphs: [
          `A gas safety certificate is a fixed ${fixed('cp12')}, plus ${extra('cp12')} for each extra gas appliance, or ${fixed('boiler-service-cp12')} together with a boiler service. Every engineer is Gas Safe registered, and the certificate is kept with the job.`,
          'Letting more than one home? Relay for landlords keeps every job and certificate filed under its property.',
        ],
        link: { label: 'Relay for landlords', href: '/landlords' },
        sources: [
          { label: 'HSE guidance for landlords', url: 'https://www.hse.gov.uk/gas/landlords/' },
          { label: 'Gas Safe Register', url: 'https://www.gassaferegister.co.uk/' },
        ],
      },
    ],
    related: '/gas-engineer-fulham',
    job: 'cp12',
  },
  {
    slug: 'fuse-keeps-tripping',
    path: '/guides/fuse-keeps-tripping',
    trade: 'electrical',
    summary: 'How to find what’s tripping your electrics, and the signs you need an electrician.',
    title: 'Why does my fuse box keep tripping?',
    sub: 'A switch that trips is your fuse box doing its job: cutting the power before something overheats. Here’s how to find the cause safely.',
    warning: { title: 'Call an electrician straight away if', text: 'You smell burning, see scorch marks, hear buzzing from a socket or the fuse box, or a socket feels hot. Don’t keep resetting the switch.' },
    sections: [
      {
        heading: 'Find what’s tripping it',
        steps: [
          { title: 'See which switch has tripped', text: 'Open the fuse box (also called a consumer unit). One switch will be down. Its label often shows which part of the home it powers.' },
          { title: 'Unplug everything on that circuit', text: 'Switch off and unplug the appliances in that part of the home.' },
          { title: 'Reset the switch', text: 'Push it fully back up. If it won’t stay up with everything unplugged, the fault is likely in the wiring, so book an electrician.' },
          { title: 'Plug things back in one at a time', text: 'If it trips again when you plug something in, that appliance is the likely cause. Kettles, washing machines, ovens and outside lights are common culprits.' },
        ],
      },
      {
        heading: 'If the whole street is dark',
        paragraphs: ['If your neighbours have lost power too, it’s a power cut rather than a fault in your home. Call 105, the free power cut number, to report it and get updates.'],
      },
      {
        heading: 'Getting it fixed',
        paragraphs: [
          `Every Relay electrician is NICEIC or NAPIT registered and has their ID and insurance checked. For a fuse that keeps tripping, it’s ${weekday} on weekdays, or ${evening} for urgent help in the evenings and at weekends.`,
          `Want peace of mind about the whole home? An EICR safety check is a fixed ${fixed('eicr-small')} for a flat with up to two bedrooms.`,
        ],
      },
    ],
    related: '/electrician-fulham',
    job: 'power-fault',
  },
];
