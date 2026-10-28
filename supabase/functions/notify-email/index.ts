// Emails one notification to someone who has no phone registered for push, such
// as a customer using the web version. public.notify() calls it through pg_net
// with the cron secret. Secrets: RESEND_API_KEY and RELAY_CRON_SECRET.
import { admin, brandedEmail, button, env, json, para, SITE } from './deps.ts';

type Row = { id: string; user_id: string; title: string; body: string; url: string | null; emailed_at: string | null };

Deno.serve(async (req) => {
  if (req.headers.get('x-relay-cron-secret') !== env('RELAY_CRON_SECRET')) return json({ error: 'Not allowed' }, 401);
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return json({ error: 'id is required' }, 400);

  const db = admin();
  const { data: n } = await db.from('notifications').select('id, user_id, title, body, url, emailed_at').eq('id', id).maybeSingle<Row>();
  if (!n) return json({ error: 'Not found' }, 404);
  if (n.emailed_at) return json({ ok: true, skipped: 'already emailed' });

  const [{ data: profile }, { data: user }] = await Promise.all([
    db.from('profiles').select('role').eq('id', n.user_id).maybeSingle<{ role: string }>(),
    db.auth.admin.getUserById(n.user_id),
  ]);
  const to = user.user?.email;
  if (!to) return json({ ok: true, skipped: 'no email' });

  // Pros and admins use Relay Traders, which lives under /traders on the website.
  const traders = profile?.role === 'pro' || profile?.role === 'admin';
  const app = traders ? 'Relay Traders' : 'Relay';
  const link = `${SITE}${traders ? '/traders' : ''}${n.url ?? (traders ? '/dashboard' : '/my-jobs')}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${app} <no-reply@relay-trade.co.uk>`,
      to: [to],
      subject: n.title,
      html: brandedEmail({
        preheader: n.body,
        heading: n.title,
        body: para(n.body) + '<div style="height:8px"></div>' + button(`Open ${app}`, link),
        footer: `You’re getting this by email because ${app} isn’t set up for notifications on your phone yet.`,
      }),
    }),
  });
  if (!res.ok) return json({ error: `Resend said ${res.status}` }, 502);

  await db.from('notifications').update({ emailed_at: new Date().toISOString() }).eq('id', n.id);
  return json({ ok: true });
});
