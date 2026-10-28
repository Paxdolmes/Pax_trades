/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { withCors } from './cors.ts';

const handler = withCors(async (req) => {
  if (req.method === 'PUT') throw new Error('Stripe said no');
  return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
});

test("answers the browser's check before a call from the website", async () => {
  const res = await handler(new Request('https://x.test/fn', { method: 'OPTIONS' }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert.match(res.headers.get('Access-Control-Allow-Headers') ?? '', /authorization/);
});

test('keeps the status and body, and adds the CORS headers', async () => {
  const res = await handler(new Request('https://x.test/fn', { method: 'POST' }));
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(res.headers.get('Content-Type'), 'application/json');
  assert.deepEqual(await res.json(), { ok: true });
});

test('a crash comes back as a readable error, not a blocked request', async () => {
  const res = await handler(new Request('https://x.test/fn', { method: 'PUT' }));
  assert.equal(res.status, 500);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert.deepEqual(await res.json(), { error: 'Stripe said no' });
});
