import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseUkDate } from './rules.ts';

const today = new Date('2026-10-28T12:00:00Z');

test('reads UK dates in the future', () => {
  assert.equal(parseUkDate('31/01/2027', today), '2027-01-31');
  assert.equal(parseUkDate('1.2.2027', today), '2027-02-01');
});

test('rejects past, impossible and American dates', () => {
  assert.equal(parseUkDate('01/10/2026', today), null);
  assert.equal(parseUkDate('31/02/2027', today), null);
  assert.equal(parseUkDate('12/31/2027', today), null);
  assert.equal(parseUkDate('2027-01-31', today), null);
});
