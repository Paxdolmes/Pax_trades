import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bookingDays } from './slots.ts';

test('offers later slots today and full days after', () => {
  const days = bookingDays(new Date(2026, 9, 28, 11, 30));
  assert.equal(days[0].label, 'Today');
  assert.deepEqual(
    days[0].slots.map((s) => s.label),
    ['2 to 4pm', '4 to 6pm'],
  );
  assert.equal(days[1].label, 'Tomorrow');
  assert.equal(days[1].slots.length, 5);
  assert.equal(new Date(days[1].slots[0].start).getHours(), 8);
  assert.equal(days.length, 7);
});

test('skips today once the last slot is too close', () => {
  const days = bookingDays(new Date(2026, 9, 28, 15, 0));
  assert.equal(days[0].label, 'Tomorrow');
  assert.equal(days.length, 6);
});
