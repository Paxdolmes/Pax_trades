// Words for the website's information pages, from the v0 site design. Prices and
// trades come from domain/catalog.ts so the pages never disagree with booking.
import {
  Banknote,
  CalendarCheck,
  CalendarClock,
  Camera,
  CircleCheck,
  CreditCard,
  FileUp,
  Flame,
  Handshake,
  IdCard,
  ListChecks,
  Lock,
  MapPin,
  MapPinned,
  MessageCircleMore,
  MessageSquareText,
  PoundSterling,
  ReceiptPoundSterling,
  Send,
  ShieldCheck,
  Star,
  Clock,
  Umbrella,
  UserCheck,
  Briefcase,
  Wrench,
  Zap,
  LayoutDashboard,
  House,
  KeyRound,
  FileCheck,
  type LucideIcon,
} from 'lucide-react-native';

import { CALLOUT_RATES, FOUNDING_COMMISSION, formatPence, PILOT, STANDARD_COMMISSION } from '@/domain/catalog';

type Item = { icon: LucideIcon; title: string; text: string };

const firstHour = formatPence(CALLOUT_RATES.standard.firstHourPence);

export const JOURNEY: (Item & { tone: 'teal' | 'peach' })[] = [
  {
    icon: ListChecks,
    title: 'Choose your job',
    text: 'Pick from heating and gas, electrical, plumbing or carpentry. You’ll see a fixed price or the callout rate before you go any further.',
    tone: 'teal',
  },
  {
    icon: Camera,
    title: 'Add a photo or two',
    text: 'A quick snap of the leak, lock or boiler helps your pro bring the right parts. It’s optional, but it helps.',
    tone: 'peach',
  },
  {
    icon: UserCheck,
    title: 'Get matched with a nearby pro',
    text: 'We find a vetted pro close to you who’s free now, or at the time you chose. You’ll see their name and rating.',
    tone: 'teal',
  },
  {
    icon: MapPinned,
    title: 'Track them and chat in the app',
    text: 'Watch them on the map as they come to you, and message them in the app. Your phone number stays private.',
    tone: 'peach',
  },
  {
    icon: CircleCheck,
    title: 'Confirm, pay and review',
    text: 'When the job is done, you confirm and we take payment. Then leave a review to help your neighbours.',
    tone: 'teal',
  },
];

export const PAYMENT_STEPS: Item[] = [
  { icon: Lock, title: 'Card held at booking', text: 'We check your card and hold the amount. Nothing is taken yet.' },
  { icon: MessageSquareText, title: 'Extra work? You decide', text: 'If your pro needs to do more, they send you the price in the app first. Nothing happens without your OK.' },
  { icon: CreditCard, title: 'Charged when it’s done', text: 'You confirm the job is finished, then we take payment and email your receipt.' },
];

export const FEES_AND_CANCELLING: Item[] = [
  { icon: ReceiptPoundSterling, title: 'No booking fees', text: 'The price you see includes VAT and Relay’s fee. Nothing extra is added at checkout.' },
  {
    icon: Handshake,
    title: 'What pros pay',
    text: `Pros pay Relay a commission out of their earnings (${FOUNDING_COMMISSION * 100}% for founding pros, then ${STANDARD_COMMISSION * 100}%). It never changes your price.`,
  },
  {
    icon: CircleCheck,
    title: 'Free to cancel',
    text: 'Cancel from the job screen at no charge any time before your pro arrives. Quote requests can be cancelled any time before you accept a quote.',
  },
  {
    icon: Clock,
    title: 'On the day',
    text: `Callout jobs are charged for your pro’s time, starting with the first hour. If they’re more than ${PILOT.lateGraceMinutes} minutes late, we send the next pro and add ${formatPence(PILOT.noShowCreditPence)} credit.`,
  },
];

export const CHECKS: Item[] = [
  { icon: IdCard, title: 'ID check', text: 'Every pro’s photo ID is checked before they join, whatever their trade.' },
  { icon: Umbrella, title: 'Public liability insurance', text: 'Every pro must be insured, so you’re covered if anything is damaged.' },
  { icon: Flame, title: 'Gas Safe registration', text: 'Required for any gas work, and checked on the official register.' },
  { icon: Zap, title: 'NICEIC, NAPIT or ELECSA', text: 'Required for electrical work, so it can be signed off properly.' },
  { icon: Wrench, title: 'Plumbing qualifications', text: 'Recognised plumbing certificates, plus G3 for unvented hot water cylinders.' },
  { icon: CalendarClock, title: 'Re-checked on expiry', text: 'Pros stop getting jobs the day a document runs out, until they upload a new one.' },
];

export const GUARANTEE_CASES = ['It wasn’t fixed', 'Something was damaged', 'Your pro didn’t show', 'You were overcharged'];

export const ON_THE_DAY: Item[] = [
  {
    icon: Clock,
    title: 'No-show protection',
    text: `If your pro is more than ${PILOT.lateGraceMinutes} minutes late, we send the next one and give you ${formatPence(PILOT.noShowCreditPence)} credit.`,
  },
  { icon: MessageCircleMore, title: 'Private chat', text: 'Chat with your pro in the app. Phone numbers and emails are hidden on both sides.' },
  { icon: Star, title: 'Real reviews only', text: 'Only customers with a completed job can leave a review. No fake stars.' },
];

export const PERKS: Item[] = [
  { icon: MapPin, title: 'Steady local jobs', text: 'Work in Fulham, close to home. Less driving, more doing.' },
  { icon: CalendarCheck, title: 'You set your hours', text: 'Go online when you’re free. Go offline when you’re not.' },
  { icon: PoundSterling, title: 'Fixed, fair prices', text: 'No haggling. Customers know the price before you arrive.' },
  { icon: Banknote, title: 'Paid within 48 hours', text: 'Money in your bank after each confirmed job.' },
];

export const JOIN_STEPS: Item[] = [
  { icon: Send, title: 'Apply', text: 'Tell us your trades. It takes five minutes.' },
  { icon: FileUp, title: 'Upload your documents', text: 'ID, insurance, and your registrations or qualifications.' },
  { icon: ShieldCheck, title: 'Get approved', text: 'We check everything and let you know as soon as you’re approved.' },
  { icon: Briefcase, title: 'Start getting jobs', text: 'Go online in the app and jobs nearby come to you.' },
];

export const COMMISSION = {
  founding: `${FOUNDING_COMMISSION * 100}%`,
  standard: `${STANDARD_COMMISSION * 100}%`,
};

export type Faq = { q: string; a: string };

export const FAQ_GROUPS: { id: string; title: string; items: Faq[] }[] = [
  {
    id: 'booking',
    title: 'Booking',
    items: [
      {
        q: 'How quickly can someone come?',
        a: `For urgent jobs we aim to have a pro with you within ${PILOT.urgentEtaMinutes} minutes, day or night. For planned jobs, like a boiler service, you pick the exact time your pro arrives.`,
      },
      {
        q: 'What can I book?',
        a: 'Heating and gas, electrical, plumbing and carpentry. Drains, locksmiths, appliance repairs and roofing are coming soon. If your job isn’t listed, describe it and get quotes from vetted pros.',
      },
      {
        q: 'Do I need to download an app?',
        a: 'No. You can book, track your pro and chat with them right here in your browser.',
      },
      { q: 'Can I cancel?', a: 'Yes. You can cancel any time before your pro arrives, from the job screen.' },
    ],
  },
  {
    id: 'payment',
    title: 'Prices & payment',
    items: [
      {
        q: 'What does "fixed, all-in price" mean?',
        a: 'The price you see includes VAT and our fees. No hidden fees, no surprise extras.',
      },
      {
        q: 'How does the callout rate work?',
        a: `For repairs where nobody knows the fix until they see it, you pay ${firstHour} including the first hour on weekdays, then ${formatPence(CALLOUT_RATES.standard.perHourPence)} an hour. Evenings and weekends are ${formatPence(CALLOUT_RATES.outOfHours.firstHourPence)}, then ${formatPence(CALLOUT_RATES.outOfHours.perHourPence)} an hour.`,
      },
      { q: 'When do I pay?', a: 'We hold the amount on your card when you book. You’re only charged once you confirm the job is done.' },
      {
        q: 'What if the job needs more work or parts?',
        a: 'Your pro explains what’s needed and sends you the price in the app. Nothing extra happens unless you approve it.',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety & guarantee',
    items: [
      {
        q: 'How do you check your pros?',
        a: 'Every pro has their ID and insurance checked before their first job. Gas engineers must be Gas Safe registered, electricians must be with NICEIC, NAPIT or ELECSA, and plumbers need recognised qualifications.',
      },
      {
        q: 'What is the Relay Guarantee?',
        a: `If something isn’t right, report it within ${PILOT.guaranteeDays} days of the job and we’ll make it right. That covers work that didn’t fix the problem, damage, no-shows and overcharging.`,
      },
      {
        q: 'What if my pro is late?',
        a: `If your pro is more than ${PILOT.lateGraceMinutes} minutes late, we send the next available pro and add ${formatPence(PILOT.noShowCreditPence)} credit to your account.`,
      },
    ],
  },
  {
    id: 'areas',
    title: 'Areas we cover',
    items: [
      { q: 'Where does Relay work?', a: 'We’re starting in Fulham, covering every SW6 postcode, and adding more of London soon.' },
      {
        q: 'I’m not in SW6. Can I still use Relay?',
        a: 'Not yet, sorry. Join the waitlist with your postcode and we’ll email you the day we launch in your area.',
      },
    ],
  },
];

export const HELP_TOPICS = ['Booking', 'Prices & payment', 'A problem with a job', 'Becoming a pro', 'Something else'];

// For landlords and letting agents -------------------------------------------------

export const LANDLORD_FEATURES: Item[] = [
  { icon: LayoutDashboard, title: 'Every property in one place', text: 'See what’s waiting for your OK, what’s in progress and what’s done, across all your properties.' },
  { icon: PoundSterling, title: 'Spend per property', text: 'Every job is filed under its property with its cost, so this year’s spend is always one look away.' },
  { icon: Zap, title: 'Emergencies don’t wait', text: 'Leaks, no heating and power cuts can go straight to a pro. You’re told the moment it happens.' },
  { icon: FileCheck, title: 'Vetted pros, records kept', text: 'Gas Safe engineers and NICEIC or NAPIT electricians, all insured and ID-checked. Gas safety records and EICRs stay with each job.' },
];

export const LANDLORD_STEPS: Item[] = [
  { icon: House, title: 'Add your properties', text: 'Just the address and postcode. It takes a minute each, and it’s free.' },
  { icon: KeyRound, title: 'Send each tenant their code', text: 'Your tenant enters the six-character code in Relay, and their repairs come to you.' },
  { icon: CircleCheck, title: 'Approve, and you’re done', text: 'You see the job and the price, then tap Approve. We handle the rest with your tenant.' },
];

export const LANDLORD_FAQS: Faq[] = [
  {
    q: 'Who pays for the work?',
    a: 'You do, at the same all-in prices as everyone else on Relay. The bill for each job you approve goes on your saved card once your tenant confirms it’s fixed. Tenants pay nothing.',
  },
  { q: 'What does it cost to set up?', a: 'Nothing. There’s no subscription and no setup fee. You only pay for the jobs you approve.' },
  {
    q: 'Do I have to approve everything?',
    a: 'Every request waits for you, except emergencies if you choose. Each property has a switch for emergencies: on, they go straight to a pro and you’re told at once; off, they wait for you too.',
  },
  {
    q: 'What about bigger jobs that need a quote?',
    a: 'Your tenant describes the job and vetted local pros send fixed, all-in quotes. They come to you: compare them side by side and accept the one you want, or say it’s not going ahead. The pro then arranges the visit with your tenant.',
  },
  {
    q: 'Can I book jobs myself, like a gas safety certificate?',
    a: 'Yes. Open the property and book any job for it, such as a CP12, an EICR or a boiler service. Your own bookings need no approval.',
  },
  {
    q: 'What if my tenant wants something done that I won’t pay for?',
    a: 'Decline it with a short note and they’ll see why. Tenants can also switch “Send to my landlord” off and book and pay for something themselves.',
  },
  { q: 'Where does it work?', a: 'Fulham, SW6, while we launch. Properties elsewhere in London are coming soon.' },
];
