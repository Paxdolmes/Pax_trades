// Minimal Stripe client over fetch, plus webhook signature checks. No Deno-only
// APIs, so it runs in Edge Functions and under `node --test`.

const API = 'https://api.stripe.com/v1';
export const STRIPE_VERSION = '2025-09-30.clover';

type Params = Record<string, string | number | boolean | undefined | Record<string, string | number>>;

/** Stripe's form encoding, with one level of nesting: { metadata: { job_id } } -> metadata[job_id]. */
export function formEncode(params: Params): string {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) out.append(`${key}[${k}]`, String(v));
    } else {
      out.append(key, String(value));
    }
  }
  return out.toString();
}

export class StripeError extends Error {
  readonly code: string | undefined;
  readonly status: number;
  constructor(message: string, code: string | undefined, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function stripeClient(secretKey: string, fetcher: typeof fetch = fetch) {
  return async function stripe<T = Record<string, unknown>>(
    path: string,
    params: Params = {},
    opts: { method?: 'GET' | 'POST'; idempotencyKey?: string; version?: string } = {},
  ): Promise<T> {
    const method = opts.method ?? 'POST';
    const body = formEncode(params);
    const res = await fetcher(method === 'GET' && body ? `${API}${path}?${body}` : `${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': opts.version ?? STRIPE_VERSION,
        ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
      },
      body: method === 'POST' ? body : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new StripeError(json?.error?.message ?? 'Stripe request failed', json?.error?.code, res.status);
    return json as T;
  };
}

const encoder = new TextEncoder();

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Checks a Stripe-Signature header ("t=...,v1=...") against the raw body, and that
 * it was signed within `toleranceSeconds`. See stripe.com/docs/webhooks/signatures.
 */
export async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(',').map((p) => p.split('=') as [string, string]);
  const t = Number(parts.find(([k]) => k === 't')?.[1]);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!Number.isFinite(t) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - t) > toleranceSeconds) return false;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  return signatures.some((s) => safeEqual(s, expected));
}

/** For tests: signs a body the way Stripe does. */
export async function signForTest(rawBody: string, secret: string, t: number): Promise<string> {
  return `t=${t},v1=${await hmacHex(secret, `${t}.${rawBody}`)}`;
}

export type ChargeRow = {
  job_id: string;
  amount_pence: number;
  fee_pence: number;
  customer_id: string | null;
  payment_method_id: string | null;
  destination: string | null;
};

/**
 * The PaymentIntent for a confirmed job: charged off-session to the card saved at
 * request time. When the pro has finished Stripe onboarding the money goes to them
 * minus Relay's commission; otherwise it stays with Relay to pay out by hand.
 */
export function paymentIntentParams(row: ChargeRow): Params {
  return {
    amount: row.amount_pence,
    currency: 'gbp',
    customer: row.customer_id ?? undefined,
    payment_method: row.payment_method_id ?? undefined,
    off_session: true,
    confirm: true,
    description: 'Relay job',
    metadata: { job_id: row.job_id },
    ...(row.destination
      ? { application_fee_amount: row.fee_pence, transfer_data: { destination: row.destination } }
      : {}),
  };
}
