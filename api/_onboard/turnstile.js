// Cloudflare Turnstile, verified on the server only. Fails closed: no secret,
// a network error or any failed check means the request is refused.
// ENV: TURNSTILE_SECRET_KEY (secret), TURNSTILE_HOSTNAMES (optional allowlist,
//      defaults to the production domains; never include localhost in production).
import { HttpError } from './lib.js';

const VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const HOSTS = () => new Set(String(process.env.TURNSTILE_HOSTNAMES || 'www.srcs.online,srcs.online').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));

export async function verifyTurnstile(token, { action, ip }) {
  if (typeof token !== 'string' || !token || token.length > 2048) throw new HttpError(400, 'Please complete the verification check.', { turnstile: 'missing' });
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) { console.error('TURNSTILE_SECRET_KEY is not set; refusing request'); throw new HttpError(503, 'Verification isn’t available right now. Please email hello@srcs.online.'); }

  let data;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);
    const r = await fetch(VERIFY, { method: 'POST', body, signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`siteverify HTTP ${r.status}`);
    data = await r.json();
  } catch (e) {
    console.error('turnstile siteverify failed', e?.message);
    throw new HttpError(503, 'Verification isn’t available right now. Please try again in a minute.');
  }

  const codes = Array.isArray(data?.['error-codes']) ? data['error-codes'] : [];
  if (data?.success !== true) {
    if (codes.includes('timeout-or-duplicate')) throw new HttpError(400, 'Verification expired. Please try again.', { turnstile: 'expired' });
    console.warn('turnstile rejected', codes);
    throw new HttpError(403, 'Verification failed. Please try again.', { turnstile: 'failed' });
  }
  if (data.action !== action) { console.warn('turnstile action mismatch', data.action); throw new HttpError(403, 'Verification failed. Please try again.', { turnstile: 'failed' }); }
  if (!HOSTS().has(String(data.hostname || '').toLowerCase())) { console.warn('turnstile hostname mismatch', data.hostname); throw new HttpError(403, 'Verification failed. Please try again.', { turnstile: 'failed' }); }
  return true;
}
