// One page per trade for people searching "plumber near me", "emergency electrician"
// and so on. Each lives at its own address (e.g. /plumber-fulham) with its title and
// description in seo.json. Kept to what Relay really offers: no made-up reviews.

import type { Trade } from '@/domain/catalog';

import type { Faq } from './site';

export type LocalPage = {
  trade: Trade;
  path: '/plumber-fulham' | '/electrician-fulham' | '/gas-engineer-fulham' | '/carpenter-fulham';
  /** Short name for links between the pages. */
  name: string;
  title: string;
  sub: string;
  /** What the pro's checks are called, for "Why Relay". */
  checks: string;
  urgent: boolean;
  faqs: Faq[];
};

export const AREAS = ['Fulham Broadway', 'Parsons Green', 'Sands End', 'Walham Green', 'Bishop’s Park', 'Munster Village', 'Lillie Road', 'Fulham Palace Road'];

export const LOCAL_PAGES: LocalPage[] = [
  {
    trade: 'plumbing',
    path: '/plumber-fulham',
    name: 'Plumber in Fulham',
    title: 'Emergency plumber in Fulham',
    sub: 'Burst pipe, leak or a toilet that won’t stop running? Book a vetted local plumber in two minutes. You see the price first, and we aim to have someone with you within the hour, day or night.',
    checks: 'Plumbing qualifications, ID and insurance checked',
    urgent: true,
    faqs: [
      { q: 'How quickly can a plumber get to me in Fulham?', a: 'For an emergency like a leak or burst pipe, we aim to have a plumber with you within the hour, day or night. You can watch them arrive on the map.' },
      { q: 'How much does an emergency plumber cost?', a: 'From £95 including the first hour on weekdays, then £80 an hour. Evenings and weekends are £160 for the first hour, then £110 an hour. Prices include VAT and fees, and you pay when the job’s done.' },
      { q: 'What should I do while I wait?', a: 'If water is leaking, turn it off at the stopcock (often under the kitchen sink) and switch off any electrics near the water. Your plumber can talk you through it in the app.' },
    ],
  },
  {
    trade: 'electrical',
    path: '/electrician-fulham',
    name: 'Electrician in Fulham',
    title: 'Emergency electrician in Fulham',
    sub: 'Power cut, tripping fuse or a socket that’s stopped working? Book a vetted local electrician in two minutes. You see the price first, and we aim to have someone with you within the hour, day or night.',
    checks: 'NICEIC or NAPIT registered, ID and insurance checked',
    urgent: true,
    faqs: [
      { q: 'How quickly can an electrician get to me in Fulham?', a: 'For an emergency like a power cut or a fuse that keeps tripping, we aim to have an electrician with you within the hour, day or night.' },
      { q: 'How much does an emergency electrician cost?', a: 'From £95 including the first hour on weekdays, then £80 an hour. Evenings and weekends are £160 for the first hour, then £110 an hour. Socket and light fitting swaps are a fixed £95.' },
      { q: 'Can you do an EICR for my rented flat?', a: 'Yes. An EICR for a flat with up to two bedrooms is a fixed £260, carried out by a registered electrician, with the certificate kept with the job.' },
    ],
  },
  {
    trade: 'heating',
    path: '/gas-engineer-fulham',
    name: 'Gas engineer in Fulham',
    title: 'Gas engineer and boiler repair in Fulham',
    sub: 'No heating, no hot water or a boiler showing an error code? Book a Gas Safe registered engineer in two minutes. You see the price first, and we aim to have someone with you within the hour, day or night.',
    checks: 'Gas Safe registered, ID and insurance checked',
    urgent: true,
    faqs: [
      { q: 'Are your engineers Gas Safe registered?', a: 'Yes. Every engineer who does gas work through Relay is Gas Safe registered, and we check their registration, ID and insurance before their first job.' },
      { q: 'How much is a boiler service or gas safety certificate?', a: 'A boiler service is a fixed £119. A landlord gas safety certificate (CP12) is a fixed £95, plus £20 for each extra gas appliance, or £149 for both together.' },
      { q: 'My boiler has stopped working. What can I check first?', a: 'Check the boiler has power, the pressure gauge reads between 1 and 1.5, and the thermostat is calling for heat. If you smell gas, leave the property and call the National Gas Emergency line on 0800 111 999.' },
    ],
  },
  {
    trade: 'carpentry',
    path: '/carpenter-fulham',
    name: 'Carpenter in Fulham',
    title: 'Carpenter and handyman in Fulham',
    sub: 'A door that sticks, a loose floorboard, shelves to put up or flat-pack to build? Book a vetted local carpenter in two minutes, at a time that suits you, and see the price first.',
    checks: 'ID and insurance checked',
    urgent: false,
    faqs: [
      { q: 'What jobs can a carpenter do?', a: 'Doors that stick, break or need hanging, floorboards, skirting and woodwork repairs, shelves, pictures, curtain rails, TV mounting and flat-pack furniture.' },
      { q: 'How much does a carpenter cost?', a: 'From £95 including the first hour on weekdays, then £80 an hour. Evenings and weekends are £160 for the first hour, then £110 an hour. You see the price before you book.' },
      { q: 'Can I get a quote for a bigger job?', a: 'Yes. Describe the job, add a few photos and get up to five fixed quotes from vetted local pros, with no obligation.' },
    ],
  },
];
