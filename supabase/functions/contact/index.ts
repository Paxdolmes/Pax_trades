// The website's contact form and waitlist. Open to guests, so it checks the input
// itself and limits each email address to a few messages an hour. Help messages and
// waiting-list sign-ups are emailed to the Relay inbox through Resend, with Reply-To
// set to the sender.
// Secrets: RESEND_API_KEY and SUPPORT_INBOX (the address that receives them).
// Without them messages are still saved in the enquiries table.
import { admin, brandedEmail, button, caller, detailRows, json, panel, para } from './deps.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PER_HOUR = 5;

type Body = { kind?: string; name?: string; email?: string; postcode?: string; topic?: string; message?: string };

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function sendToInbox(e: { name: string; email: string; topic: string; message: string; postcode: string }) {
  const key = Deno.env.get('RESEND_API_KEY');
  const inbox = Deno.env.get('SUPPORT_INBOX');
  if (!key || !inbox) return false;
  return send(key, inbox, e.email, `Help: ${e.topic || 'New message'} from ${e.name}`, helpEmail(e));
}

async function sendSignUpToInbox(e: { name: string; email: string; topic: string; message: string; postcode: string }) {
  const key = Deno.env.get('RESEND_API_KEY');
  const inbox = Deno.env.get('SUPPORT_INBOX');
  if (!key || !inbox) return false;
  const who = e.name || e.email;
  const html = brandedEmail({
    preheader: `${who} joined the waiting list${e.postcode ? ` from ${e.postcode}` : ''}`,
    heading: 'New waiting list sign-up',
    body:
      para(`${who} joined the Relay waiting list.`, true) +
      detailRows([
        ['Name', e.name || 'Not given'],
        ['Email', e.email],
        ['Postcode', e.postcode || 'Not given'],
        ['Needs', e.topic || 'Not given'],
        ...(e.message ? ([['Note', e.message]] as [string, string][]) : []),
      ]),
    footer: 'Every sign-up is also saved in the enquiries table in Supabase.',
  });
  return send(key, inbox, e.email, `Waiting list: ${who}${e.postcode ? ` (${e.postcode})` : ''}`, html);
}

async function send(key: string, inbox: string, replyTo: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Relay website <no-reply@relay-trade.co.uk>', to: [inbox], reply_to: replyTo, subject, html }),
  });
  return res.ok;
}

function helpEmail(e: { name: string; email: string; topic: string; message: string; postcode: string }) {
  const first = e.name.split(' ')[0];
  return brandedEmail({
    preheader: `${e.name}: ${e.message.slice(0, 90)}`,
    heading: 'New help message',
    body:
      para(`${e.name} sent a message from the Relay website.`, true) +
      detailRows([
        ['From', e.name],
        ['Email', e.email],
        ['Topic', e.topic || 'General'],
        ['Postcode', e.postcode || 'Not given'],
      ]) +
      '<div style="height:16px"></div>' +
      panel(e.message) +
      '<div style="height:24px"></div>' +
      button(`Reply to ${first}`, `mailto:${e.email}?subject=${encodeURIComponent(`Re: ${e.topic || 'Your message to Relay'}`)}`),
    footer: 'Pressing Reply in your inbox answers them too.',
  });
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

  const emailed = kind === 'help' ? sendToInbox(e) : sendSignUpToInbox(e);
  if (await emailed.catch(() => false)) {
    await db.from('enquiries').update({ emailed_at: new Date().toISOString() }).eq('id', data.id);
  }
  return reply({ ok: true });
});
