// Pros link their bank account through Stripe's hosted onboarding.
//   POST (signed-in pro): returns a one-time onboarding link to open in the browser.
//   GET ?done=1: where Stripe sends them back afterwards.
import { admin, caller, env, json, stripe } from './deps.ts';

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return new Response('All done. You can go back to the Relay Traders app.', { headers: { 'Content-Type': 'text/plain' } });
  }
  const user = await caller(req);
  if (!user) return json({ error: 'Please sign in' }, 401);
  const db = admin();
  const s = stripe();

  const { data: pro } = await db.from('pros').select('stripe_account_id').eq('id', user.id).single();
  if (!pro) return json({ error: 'Only approved tradespeople can add bank details' }, 403);

  let account = pro.stripe_account_id as string | null;
  if (!account) {
    const created = await s<{ id: string }>(
      '/accounts',
      {
        type: 'express',
        country: 'GB',
        business_type: 'individual',
        'capabilities[transfers][requested]': 'true',
        metadata: { relay_user_id: user.id },
      },
      { idempotencyKey: `account-${user.id}` },
    );
    account = created.id;
    await db.from('pros').update({ stripe_account_id: account }).eq('id', user.id);
  }

  const back = `${env('SUPABASE_URL')}/functions/v1/connect-onboarding?done=1`;
  const link = await s<{ url: string }>('/account_links', { account, refresh_url: back, return_url: back, type: 'account_onboarding' });
  return json({ url: link.url });
});
