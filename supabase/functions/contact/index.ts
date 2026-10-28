// The website's contact form and waitlist. Open to guests, so it checks the input
// itself and limits each email address to a few messages an hour. Help messages
// are emailed to the Relay inbox through Resend, with Reply-To set to the sender.
// Secrets: RESEND_API_KEY and SUPPORT_INBOX (the address that receives them).
// Without them messages are still saved in the enquiries table.
import { admin, caller, json } from './deps.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PER_HOUR = 5;

type Body = { kind?: string; name?: string; email?: string; postcode?: string; topic?: string; message?: string };

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const escape = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

async function sendToInbox(e: { name: string; email: string; topic: string; message: string; postcode: string }) {
  const key = Deno.env.get('RESEND_API_KEY');
  const inbox = Deno.env.get('SUPPORT_INBOX');
  if (!key || !inbox) return false;
  const rows = [
    ['From', `${e.name} <${e.email}>`],
    ['Topic', e.topic || 'General'],
    ['Postcode', e.postcode || 'Not given'],
  ];
  const html =
    `<p>${rows.map(([k, v]) => `<b>${k}:</b> ${escape(v)}`).join('<br>')}</p>` +
    `<p style="white-space:pre-wrap">${escape(e.message)}</p>` +
    `<p style="color:#5B6478">Reply to this email to answer them.</p>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Relay website <no-reply@relay-trade.co.uk>',
      to: [inbox],
      reply_to: e.email,
      subject: `Help: ${e.topic || 'New message'} from ${e.name}`,
      html,
    }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const reply = (body: unknown, status = 200) => {
    const res = json(body, status);
    for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
    return res;
  };
  if (req.method !== 'POST') return reply({ error: 'Use POST' }, 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return reply({ error: 'Please try again' }, 400);
  }
  const kind = body.kind === 'waitlist' ? 'waitlist' : 'help';
  const e = {
    name: clean(body.name, 120),
    email: clean(body.email, 254).toLowerCase(),
    postcode: clean(body.postcode, 10).toUpperCase(),
    topic: clean(body.topic, 80),
    message: clean(body.message, 4000),
  };
  if (!EMAIL.test(e.email)) return reply({ error: 'Please enter a valid email address' }, 400);
  if (kind === 'help' && (!e.name || e.message.length < 5)) return reply({ error: 'Please add your name and a message' }, 400);

  const db = admin();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db.from('enquiries').select('id', { count: 'exact', head: true }).eq('email', e.email).gte('created_at', since);
  if ((count ?? 0) >= PER_HOUR) return reply({ error: "We've had a few messages from you already. Please try again in an hour." }, 429);

  const user = await caller(req).catch(() => null);
  const { data, error } = await db
    .from('enquiries')
    .insert({ kind, ...e, name: e.name || null, postcode: e.postcode || null, topic: e.topic || null, message: e.message || null, user_id: user?.id ?? null })
    .select('id')
    .single();
  if (error) return reply({ error: 'Could not send your message. Please try again.' }, 500);

  if (kind === 'help' && (await sendToInbox(e).catch(() => false))) {
    await db.from('enquiries').update({ emailed_at: new Date().toISOString() }).eq('id', data.id);
  }
  return reply({ ok: true });
});
