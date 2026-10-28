/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formEncode, paymentIntentParams, signForTest, verifyStripeSignature } from './stripe.ts';

const secret = 'whsec_test';
const body = '{"id":"evt_1","type":"payment_intent.succeeded"}';
const t = 1_800_000_000;

describe('webhook signatures', () => {
  it('accepts a body Stripe signed', async () => {
    assert.equal(await verifyStripeSignature(body, await signForTest(body, secret, t), secret, t + 10), true);
  });

  it('rejects a changed body, a wrong secret, an old signature or no header', async () => {
    const header = await signForTest(body, secret, t);
    assert.equal(await verifyStripeSignature(body.replace('evt_1', 'evt_2'), header, secret, t), false);
    assert.equal(await verifyStripeSignature(body, header, 'whsec_other', t), false);
    assert.equal(await verifyStripeSignature(body, header, secret, t + 301), false);
    assert.equal(await verifyStripeSignature(body, null, secret, t), false);
  });
});

describe('charging a job', () => {
  const row = { job_id: 'j1', amount_pence: 20500, fee_pence: 2000, customer_id: 'cus_1', payment_method_id: 'pm_1', destination: 'acct_1' };

  it('pays the pro through Stripe, keeping the commission', () => {
    const encoded = new URLSearchParams(formEncode(paymentIntentParams(row)));
    assert.equal(encoded.get('amount'), '20500');
    assert.equal(encoded.get('application_fee_amount'), '2000');
    assert.equal(encoded.get('transfer_data[destination]'), 'acct_1');
    assert.equal(encoded.get('metadata[job_id]'), 'j1');
    assert.equal(encoded.get('off_session'), 'true');
  });

  it('keeps the money with Relay while the pro has no Stripe account', () => {
    const encoded = new URLSearchParams(formEncode(paymentIntentParams({ ...row, destination: null })));
    assert.equal(encoded.get('application_fee_amount'), null);
    assert.equal(encoded.get('transfer_data[destination]'), null);
  });
});
