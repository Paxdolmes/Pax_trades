/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calloutChargePence,
  canTakeJob,
  credentialStatus,
  isCredentialValid,
  isInLaunchArea,
  isOutOfHours,
  missingCredentials,
  outwardCode,
  splitPayment,
  type Credential,
} from './rules.ts';
import type { JobType } from './catalog';

const today = '2026-10-28';
const gasJob: Pick<JobType, 'requires'> = { requires: ['gas_safe', 'public_liability'] };

describe('credentials', () => {
  const valid: Credential[] = [
    { type: 'gas_safe', verified: true, expiresOn: '2027-03-01' },
    { type: 'public_liability', verified: true, expiresOn: '2026-12-31' },
  ];

  it('allows a pro with every required credential', () => {
    assert.equal(canTakeJob(gasJob, valid, today), true);
  });

  it('blocks an expired Gas Safe registration', () => {
    const expired = [{ ...valid[0], expiresOn: '2026-10-27' }, valid[1]];
    assert.deepEqual(missingCredentials(gasJob, expired, today), ['gas_safe']);
  });

  it('blocks an unverified credential', () => {
    const unverified = [valid[0], { ...valid[1], verified: false }];
    assert.equal(canTakeJob(gasJob, unverified, today), false);
  });

  it('accepts a credential that expires today', () => {
    const lastDay = [{ ...valid[0], expiresOn: today }, valid[1]];
    assert.equal(canTakeJob(gasJob, lastDay, today), true);
  });
});

describe('postcodes', () => {
  it('extracts the outward code', () => {
    assert.equal(outwardCode('sw6 1aa'), 'SW6');
    assert.equal(outwardCode('SW10 0XY'), 'SW10');
    assert.equal(outwardCode('W1A 1AA'), 'W1A');
    assert.equal(outwardCode('not a postcode'), null);
  });

  it('does not treat SW10 as SW6', () => {
    assert.equal(isInLaunchArea('SW6 4HJ', ['SW6']), true);
    assert.equal(isInLaunchArea('SW10 9AB', ['SW6']), false);
  });
});

describe('pricing', () => {
  it('marks evenings and weekends as out of hours', () => {
    assert.equal(isOutOfHours(3, 10), false);
    assert.equal(isOutOfHours(3, 20), true);
    assert.equal(isOutOfHours(3, 6), true);
    assert.equal(isOutOfHours(6, 12), true);
  });

  it('charges the first hour flat, then per started half hour', () => {
    const rate = { firstHourPence: 9500, perHourPence: 8000 };
    assert.equal(calloutChargePence(45, rate), 9500);
    assert.equal(calloutChargePence(60, rate), 9500);
    assert.equal(calloutChargePence(61, rate), 13500);
    assert.equal(calloutChargePence(120, rate), 17500);
  });

  it('splits commission without losing a penny', () => {
    assert.deepEqual(splitPayment(11900, 0.15), { platformPence: 1785, proPence: 10115 });
    const { platformPence, proPence } = splitPayment(9999, 0.1);
    assert.equal(platformPence + proPence, 9999);
  });
});

describe('credential status', () => {
  it('flags documents in the renewal window but still counts them as valid', () => {
    const insurance: Credential = { type: 'public_liability', verified: true, expiresOn: '2026-11-20' };
    assert.equal(credentialStatus(insurance, today), 'expiring');
    assert.equal(isCredentialValid(insurance, today), true);
  });

  it('separates missing, pending, expired and verified', () => {
    assert.equal(credentialStatus(undefined, today), 'missing');
    assert.equal(credentialStatus({ type: 'gas_safe', verified: false, expiresOn: '2027-06-30' }, today), 'pending');
    assert.equal(credentialStatus({ type: 'gas_safe', verified: true, expiresOn: '2026-10-27' }, today), 'expired');
    assert.equal(credentialStatus({ type: 'gas_safe', verified: true, expiresOn: '2027-06-30' }, today), 'verified');
    assert.equal(credentialStatus({ type: 'plumbing_nvq', verified: true, expiresOn: null }, today), 'verified');
  });
});
