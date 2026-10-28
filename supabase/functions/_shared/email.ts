// The Relay email layout: logo, a white card on the warm site background, and a
// short footer. Plain tables and inline styles, so it looks the same in Gmail,
// Outlook and Apple Mail. supabase/templates/sign-in-code.html uses the same look.

export const SITE = 'https://app.relay-trade.co.uk';

const C = { bg: '#FAF7F2', card: '#FFFFFF', ink: '#0D1B3E', muted: '#525D78', border: '#EBE5DA', tint: '#E3F6F3', teal: '#008F80' };
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/** A navy pill button. */
export function button(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:999px;background:${C.ink}">` +
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px">${escapeHtml(label)}</a>` +
    `</td></tr></table>`;
}

/** Label and value rows, for details like who sent a message. Values are escaped. */
export function detailRows(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">` +
    rows
      .map(
        ([k, v], i) =>
          `<tr><td style="padding:10px 0;${i ? `border-top:1px solid ${C.border};` : ''}font-family:${FONT};font-size:14px;color:${C.muted};width:96px;vertical-align:top">${escapeHtml(k)}</td>` +
          `<td style="padding:10px 0;${i ? `border-top:1px solid ${C.border};` : ''}font-family:${FONT};font-size:15px;color:${C.ink};font-weight:600">${escapeHtml(v)}</td></tr>`,
      )
      .join('') +
    `</table>`;
}

/** A soft teal panel, for the message itself. Text is escaped and keeps its line breaks. */
export function panel(text: string) {
  return `<div style="background:${C.tint};border-radius:16px;padding:18px 20px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.ink};white-space:pre-wrap">${escapeHtml(text)}</div>`;
}

/** The whole email. `body` is trusted HTML built from the helpers above; heading and preheader are escaped. */
export function brandedEmail({ preheader, heading, body, footer }: { preheader: string; heading: string; body: string; footer?: string }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light"><title>${escapeHtml(heading)}</title></head>` +
    `<body style="margin:0;padding:0;background:${C.bg}">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg}"><tr><td align="center" style="padding:32px 16px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">` +
    `<tr><td style="padding:0 4px 20px"><a href="${SITE}"><img src="${SITE}/email-logo.png" width="118" height="44" alt="Relay" style="display:block;border:0"></a></td></tr>` +
    `<tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:24px;padding:32px 28px">` +
    `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:30px;font-weight:800;color:${C.ink};letter-spacing:-0.4px">${escapeHtml(heading)}</h1>` +
    body +
    `</td></tr>` +
    `<tr><td style="padding:20px 4px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted}">` +
    (footer ? `${footer}<br>` : '') +
    `Relay · Trusted local trades at your door, in Fulham, SW6<br>` +
    `<a href="${SITE}" style="color:${C.teal};text-decoration:none">app.relay-trade.co.uk</a> · <a href="${SITE}/help" style="color:${C.teal};text-decoration:none">Help</a>` +
    `</td></tr></table></td></tr></table></body></html>`;
}

/** A paragraph in the body text style. Text is escaped. */
export function para(text: string, muted = false) {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${muted ? C.muted : C.ink}">${escapeHtml(text)}</p>`;
}
