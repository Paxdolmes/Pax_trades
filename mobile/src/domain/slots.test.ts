import assert from 'node:assert/strict';
import { test } from 'node:test';

import { arrivalLabel, arrivalPhrase, bookingDays, clockLabel } from './slots.ts';

test('offers later arrival times today and full days after', () => {
  const days = bookingDays(new Date(2026, 9, 28, 11, 30));
  assert.equal(days[0].label, 'Today');
  assert.deepEqual(
    days[0].slots.map((s) => s.label),
    ['2pm', '4pm'],
  );
  assert.equal(days[1].label, 'Tomorrow');
  assert.deepEqual(
    days[1].slots.map((s) => s.label),
    ['8am', '10am', '12pm', '2pm', '4pm'],
  );
  assert.equal(new Date(days[1].slots[0].start).getHours(), 8);
  assert.equal(days.length, 7);
});

test('skips today once the last time is too close', () => {
  const days = bookingDays(new Date(2026, 9, 28, 15, 0));
  assert.equal(days[0].label, 'Tomorrow');
  assert.equal(days.length, 6);
});

test('reads arrival times the way people say them', () => {
  assert.equal(clockLabel(new Date(2026, 9, 31, 0, 0)), '12am');
  assert.equal(clockLabel(new Date(2026, 9, 31, 9, 30)), '9:30am');
  assert.equal(clockLabel(new Date(2026, 9, 31, 12, 0)), '12pm');
  const now = new Date(2026, 9, 30, 11, 0);
  assert.equal(arrivalLabel(new Date(2026, 9, 30, 14, 0), now), 'Today at 2pm');
  assert.equal(arrivalLabel(new Date(2026, 9, 31, 8, 0), now), 'Tomorrow at 8am');
  assert.equal(arrivalLabel(new Date(2026, 10, 1, 10, 0), now), 'Sun 1 Nov at 10am');
  assert.equal(arrivalPhrase(new Date(2026, 9, 31, 8, 0), now), 'tomorrow at 8am');
  assert.equal(arrivalPhrase(new Date(2026, 10, 1, 10, 0), now), 'Sun 1 Nov at 10am');
});
