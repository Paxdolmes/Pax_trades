// Stripe tells us when a card is saved and when a charge succeeds or fails.
// Point a Stripe webhook at /functions/v1/stripe-webhook (see docs/going-live.md).
import { admin, env, json, STRIPE } from './deps.ts';

type Event = { type: string; data: { object: Record<string, unknown> } };

Deno.serve(async (req) => {
  const raw = await req.text();
  const ok = await STRIPE.verifyStripeSignature(raw, req.headers.get('Stripe-Signature'), env('STRIPE_WEBHOOK_SECRET'));
  if (!ok) return json({ error: 'Bad signature' }, 400);

  const event = JSON.parse(raw) as Event;
  const obj = event.data.object;
  const db = admin();
  const now = new Date().toISOString();

  switch (event.type) {
    case 'setup_intent.succeeded':
      await db
        .from('profiles')
        .update({ stripe_payment_method_id: obj.payment_method as string })
        .eq('stripe_customer_id', obj.customer as string);
      break;
    case 'payment_intent.succeeded':
      await db.from('jobs').update({ paid_at: now }).eq('payment_intent_id', obj.id as string).is('paid_at', null);
      break;
    case 'payment_intent.payment_failed':
      await db.from('jobs').update({ payment_failed_at: now }).eq('payment_intent_id', obj.id as string);
      break;
  }
  return json({ received: true });
});
