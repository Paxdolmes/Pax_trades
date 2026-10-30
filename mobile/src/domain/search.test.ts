import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isOffered, JOB_TYPES, POPULAR_JOBS } from './catalog.ts';
import { searchJobs } from './search.ts';

const ids = (query: string) => searchJobs(query).map((j) => j.id);

test('finds jobs by their name, trade and everyday words', () => {
  assert.ok(ids('boiler').includes('boiler-service'));
  assert.ok(ids('boiler').includes('boiler-repair'));
  assert.equal(ids('tap')[0], 'tap-repair');
  assert.ok(ids('fuse').includes('power-fault'));
  assert.ok(ids('ikea').includes('flat-pack'));
  assert.ok(ids('gas safety').includes('cp12'));
  assert.ok(ids('electrician').includes('socket-replace'));
});

test('only offers jobs customers can book now', () => {
  assert.deepEqual(ids('locked out'), []);
  assert.deepEqual(ids('blocked sink'), []);
  assert.deepEqual(ids('xyz'), []);
  assert.deepEqual(ids('   '), []);
});

test('every popular job is a bookable catalogue job', () => {
  for (const p of POPULAR_JOBS) {
    const job = JOB_TYPES.find((j) => j.id === p.id);
    assert.ok(job, p.id);
    assert.ok(isOffered(job.trade), p.id);
  }
});
