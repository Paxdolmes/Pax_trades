// Called by the customer app before their first request: makes sure they have a
// Stripe customer and returns what the PaymentSheet needs to save a card. The card
// is charged later, off-session, once the job is confirmed.
import { admin, caller, json, stripe, STRIPE, withCors } from './deps.ts';

Deno.serve(withCors(async (req) => {
  const user = await caller(req);
  if (!user) return json({ error: 'Please sign in' }, 401);
  const db = admin();
  const s = stripe();

  const { data: profile, error } = await db.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
  if (error) return json({ error: error.message }, 400);

  let customerId = profile.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await s<{ id: string }>('/customers', { metadata: { relay_user_id: user.id } }, { idempotencyKey: `customer-${user.id}` });
    customerId = customer.id;
    await db.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const [key, intent] = await Promise.all([
    s<{ secret: string }>('/ephemeral_keys', { customer: customerId }, { version: STRIPE.STRIPE_VERSION }),
    s<{ client_secret: string }>('/setup_intents', {
      customer: customerId,
      usage: 'off_session',
      automatic_payment_methods: { enabled: 'true' },
    }),
  ]);
  return json({ customerId, ephemeralKey: key.secret, setupIntent: intent.client_secret });
}));
