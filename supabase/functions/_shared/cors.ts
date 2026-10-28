// The web version calls Edge Functions from app.relay-trade.co.uk, so browsers
// first ask (OPTIONS) whether that's allowed, and drop any response without the
// CORS headers, which the app then only sees as "Failed to send a request".

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-region',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/**
 * Wraps a function's handler for calls from the apps: answers the browser's check,
 * adds the CORS headers to every response, and turns a crash into a JSON error
 * the app can show instead of a blocked request.
 */
export function withCors(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
    let res: Response;
    try {
      res = await handler(req);
    } catch (e) {
      console.error(e);
      res = new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  };
}
