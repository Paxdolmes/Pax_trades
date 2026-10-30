// Example pros and customer reviews shown on the website and the Relay home
// screen while we launch. Stock photos (see assets/images/people/CREDITS.md);
// names, ratings and words are made up, so the UI always labels them as examples.
// Swap in real pros and reviews as they come in.
import type { ImageSourcePropType } from 'react-native';

export type ExamplePro = {
  name: string;
  trade: string;
  years: number;
  rating: number;
  reviews: number;
  check: string;
  photo: ImageSourcePropType;
};

export type ExampleReview = {
  name: string;
  area: string;
  rating: number;
  text: string;
  photo: ImageSourcePropType;
};

export const EXAMPLE_PROS: ExamplePro[] = [
  { name: 'Samuel A.', trade: 'Plumber', years: 18, rating: 4.9, reviews: 212, check: 'Plumbing NVQ', photo: require('@/assets/images/people/pro-samuel.jpg') },
  { name: 'Tom H.', trade: 'Electrician', years: 11, rating: 4.9, reviews: 164, check: 'NICEIC', photo: require('@/assets/images/people/pro-tom.jpg') },
  { name: 'Karim B.', trade: 'Heating & gas', years: 9, rating: 4.8, reviews: 97, check: 'Gas Safe', photo: require('@/assets/images/people/pro-karim.jpg') },
  { name: 'Jake M.', trade: 'Carpenter', years: 7, rating: 5.0, reviews: 58, check: 'Insured', photo: require('@/assets/images/people/pro-jake.jpg') },
];

export const EXAMPLE_REVIEWS: ExampleReview[] = [
  {
    name: 'Carmen R.',
    area: 'Parsons Green',
    rating: 5,
    text: 'Our boiler died on a Sunday night. Karim was here in under an hour and the price was exactly what the app said.',
    photo: require('@/assets/images/people/customer-carmen.jpg'),
  },
  {
    name: 'Olly T.',
    area: 'Fulham Broadway',
    rating: 5,
    text: 'Booked an electrician in two minutes and watched him arrive on the map. No ringing round, no waiting in all day.',
    photo: require('@/assets/images/people/customer-olly.jpg'),
  },
  {
    name: 'Marcus B.',
    area: 'Sands End',
    rating: 4,
    text: 'Loved seeing the price before booking and only paying once the leak was fixed. Will use it again.',
    photo: require('@/assets/images/people/customer-marcus.jpg'),
  },
];

export const EXAMPLES_NOTE = 'Example profiles and reviews while Relay launches in Fulham.';
