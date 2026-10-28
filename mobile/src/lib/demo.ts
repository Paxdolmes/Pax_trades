// Demo data used until a Supabase project is connected, so the apps can be
// clicked through on a phone from day one.

import type { CredentialType } from '@/domain/catalog';
import type { Credential } from '@/domain/rules';

export const CREDENTIAL_LABELS: Record<CredentialType, string> = {
  gas_safe: 'Gas Safe registration',
  competent_person_scheme: 'NICEIC, NAPIT or ELECSA membership',
  plumbing_nvq: 'Plumbing NVQ Level 2 or 3',
  unvented_g3: 'G3 unvented hot water qualification',
  public_liability: 'Public liability insurance',
};

export const DEMO_PRO_CREDENTIALS: Credential[] = [
  { type: 'gas_safe', verified: true, expiresOn: '2027-06-30' },
  { type: 'public_liability', verified: true, expiresOn: '2027-01-31' },
  { type: 'plumbing_nvq', verified: true, expiresOn: null },
];

export type DemoOffer = {
  id: string;
  jobTypeId: string;
  postcode: string;
  distanceKm: number;
  urgent: boolean;
  note: string;
};

export const DEMO_OFFERS: DemoOffer[] = [
  { id: 'o1', jobTypeId: 'no-heating', postcode: 'SW6 4', distanceKm: 1.2, urgent: true, note: 'Combi boiler showing a fault code' },
  { id: 'o2', jobTypeId: 'leak', postcode: 'SW6 2', distanceKm: 0.8, urgent: true, note: 'Leak under the kitchen sink' },
  { id: 'o3', jobTypeId: 'eicr-small', postcode: 'SW6 7', distanceKm: 2.1, urgent: false, note: 'Landlord needs EICR for a 2-bed flat' },
  { id: 'o4', jobTypeId: 'cp12', postcode: 'SW6 3', distanceKm: 1.6, urgent: false, note: 'Boiler and gas hob' },
];
