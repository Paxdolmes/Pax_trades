/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatPence, fromPricePence, JOB_TYPES, OFFERED_TRADES } from './catalog.ts';

test('every trade customers can book has at least one job type', () => {
  for (const t of OFFERED_TRADES) assert.ok(JOB_TYPES.some((j) => j.trade === t.id), t.id);
});

test('from prices match the launch price list', () => {
  assert.equal(fromPricePence('plumbing'), 9500);
  assert.equal(fromPricePence('electrical'), 9500);
  assert.equal(fromPricePence('heating'), 9500);
});

test('prices show pence only when needed, with thousands separators', () => {
  assert.equal(formatPence(9500), '£95');
  assert.equal(formatPence(950), '£9.50');
  assert.equal(formatPence(128400), '£1,284');
});
