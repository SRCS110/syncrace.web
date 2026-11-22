// Request and input guards shared by every srcs.online API endpoint.
// Output is always escaped where it's rendered; these checks are the second
// layer: markup and script never get stored in the first place.

// Tags (<script>, <img …>, </div>, <!--, <?php), script URLs, and CSS/HTML entity
// tricks that only matter when someone is trying to smuggle code.
const CODE = [
  /<\s*\/?\s*[a-z!?%]/i,
  /\b(?:javascript|vbscript|livescript)\s*:/i,
  /\bdata\s*:\s*(?:text\/html|application\/(?:x-)?javascript|image\/svg)/i,
  /&#x?0*(?:3c|60|0*60);?/i,
  /\bexpression\s*\(/i,
  /\$\{|\{\{|\}\}|<%|%>/,
];
// Invisible characters used to disguise text (zero-width, bidi overrides).
const INVISIBLE = /[​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;

export const looksLikeCode = (s) => CODE.some((re) => re.test(s));

/**
 * Normalizes one text value. Returns { value } or { error }.
 * opts: { max, multiline, label }
 */
export function cleanText(input, { max = 300, multiline = false, label = 'This field' } = {}) {
  if (input == null) return { value: '' };
  if (typeof input !== 'string') return { error: `${label} must be text.` };
  let v = input.normalize('NFC').replace(/\r\n?/g, '\n').replace(CONTROL, '').replace(INVISIBLE, '');
  v = multiline ? v.replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n') : v.replace(/\s+/g, ' ');
  v = v.trim();
  if (v.length > max) return { error: `${label} is too long (${max} characters max).` };
  if (looksLikeCode(v)) return { error: `${label} can’t include code or HTML. Please remove any < > tags or scripts.` };
  return { value: v };
}

export const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function cleanEmail(input, label = 'Email') {
  const r = cleanText(input, { max: 254, label });
  if (r.error || !r.value) return r;
  if (!EMAIL.test(r.value)) return { error: `${label} doesn’t look like an email address.` };
  return { value: r.value.toLowerCase() };
}

export function cleanUrl(input, label = 'Website') {
  const r = cleanText(input, { max: 300, label });
  if (r.error || !r.value) return r;
  const raw = /^[a-z][a-z0-9+.-]*:/i.test(r.value) ? r.value : `https://${r.value}`;
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) throw new Error();
    return { value: u.href };
  } catch {
    return { error: `${label} should be a web address like yourbusiness.com.` };
  }
}

// Allowed browser origins. Requests from any other site are refused.
const ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || 'https://www.srcs.online,https://srcs.online').split(',').map((s) => s.trim()).filter(Boolean),
);

/**
 * Rejects cross-site browser requests and oversized bodies.
 * Browsers always send Sec-Fetch-Site and send Origin on POST, so a page on any
 * other site can't call these endpoints from a visitor's browser.
 */
export function checkRequest(req, { maxBytes }) {
  const site = String(req.headers['sec-fetch-site'] || '');
  if (site && site !== 'same-origin' && site !== 'none') return 'Cross-site requests are not allowed.';
  const origin = req.headers.origin;
  if (origin && !ORIGINS.has(origin)) return 'Cross-site requests are not allowed.';
  const len = Number(req.headers['content-length'] || 0);
  if (len > maxBytes) return 'Request too large.';
  if (req.method === 'POST') {
    const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (type !== 'application/json') return 'Requests must be JSON.';
  }
  return null;
}

// Headers on every API response: nothing renders, nothing frames, nothing caches.
export function lockHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Robots-Tag', 'noindex');
}
