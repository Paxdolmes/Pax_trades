// Charges confirmed jobs to the card the customer saved when they requested.
//   * pg_cron calls it every 5 minutes with the cron secret: charges every job due,
//     including ones that confirmed themselves after 48 hours.
//   * The customer app calls it right after "Confirm and pay" with { jobId }.
// The Stripe webhook sets paid_at once the charge succeeds.
import { admin, caller, env, json, stripe, STRIPE, withCors } from './deps.ts';

Deno.serve(withCors(async (req) => {
  const db = admin();
  const fromCron = req.headers.get('x-relay-cron-secret') === env('RELAY_CRON_SECRET');
  let jobId: string | null = null;

  if (!fromCron) {
    const user = await caller(req);
    if (!user) return json({ error: 'Please sign in' }, 401);
    jobId = ((await req.json().catch(() => ({}))) as { jobId?: string }).jobId ?? null;
    if (!jobId) return json({ error: 'jobId is required' }, 400);
    const { data: job } = await db.from('jobs').select('customer_id').eq('id', jobId).single();
    if (job?.customer_id !== user.id) return json({ error: 'Job not found' }, 404);
  }

  const { data: rows, error } = await db.rpc('jobs_to_charge', { p_job: jobId });
  if (error) return json({ error: error.message }, 500);

  const s = stripe();
  const results: { jobId: string; status: string }[] = [];
  for (const row of rows as STRIPE.ChargeRow[]) {
    if (!row.customer_id || !row.payment_method_id) {
      await db.from('jobs').update({ payment_failed_at: new Date().toISOString() }).eq('id', row.job_id);
      results.push({ jobId: row.job_id, status: 'no_card' });
      continue;
    }
    try {
      const intent = await s<{ id: string; status: string }>('/payment_intents', STRIPE.paymentIntentParams(row), {
        idempotencyKey: `job-${row.job_id}`,
      });
      await db
        .from('jobs')
        .update({ payment_intent_id: intent.id, ...(intent.status === 'succeeded' ? { paid_at: new Date().toISOString() } : {}) })
        .eq('id', row.job_id);
      results.push({ jobId: row.job_id, status: intent.status });
    } catch (e) {
      // Card declined or needs the customer: the Relay team follows up by hand in the pilot.
      await db.from('jobs').update({ payment_failed_at: new Date().toISOString() }).eq('id', row.job_id);
      results.push({ jobId: row.job_id, status: e instanceof STRIPE.StripeError ? (e.code ?? 'failed') : 'failed' });
    }
  }
  return json({ results });
}));
