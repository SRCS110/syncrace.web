// Shared plumbing for the onboarding API: Supabase (service role, server only),
// request helpers, the audit trail and email.
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { checkRequest, lockHeaders } from './guard.js';

export const SITE = (process.env.SITE_ORIGIN || 'https://www.srcs.online').replace(/\/$/, '');
export const BUCKET = 'client-files';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jhlnvcpfldlnraaoyhkz.supabase.co';
const NOTIFY = process.env.ONBOARD_NOTIFY || process.env.CONTACT_TO || process.env.CONTACT_TO_EMAIL || 'hello@srcs.online';
const FROM = process.env.CONTACT_FROM || process.env.CONTACT_FROM_EMAIL || 'Sync Race Studios <hello@srcs.online>';

export class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}

let client;
export function db() {
  if (!client) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (!key) throw new HttpError(503, 'Onboarding isn’t switched on yet. Please email hello@srcs.online.');
    client = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

export function send(res, status, body) {
  res.statusCode = status;
  lockHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

// Wraps a handler: method check, cross-site and size checks, JSON body,
// errors that never leak internals.
export function handler(methods, fn, { maxBytes = 64 * 1024 } = {}) {
  return async (req, res) => {
    if (!methods.includes(req.method)) { res.setHeader('Allow', methods.join(', ')); return send(res, 405, { error: 'Method not allowed' }); }
    const bad = checkRequest(req, { maxBytes });
    if (bad) return send(res, bad === 'Request too large.' ? 413 : 403, { error: bad });
    try {
      if (typeof req.body === 'string') { try { req.body = JSON.parse(req.body); } catch { req.body = {}; } }
      req.body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      req.query = req.query || {};
      await fn(req, res);
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message, ...(e.extra || {}) });
      console.error('api error', e);
      send(res, 500, { error: 'Something went wrong on our side. Please try again, or email hello@srcs.online.' });
    }
  };
}

export const must = (r) => { if (r.error) throw r.error; return r.data; };

export function ipOf(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (xf || req.headers['x-real-ip'] || req.socket?.remoteAddress || '').slice(0, 64);
}
export const uaOf = (req) => String(req.headers['user-agent'] || '').slice(0, 400);

export async function logEvent(req, kind, { client_id = null, invite_id = null, detail = {} } = {}) {
  let d; try { d = db(); } catch (e) { console.error('event log skipped', kind); return; }
  const r = await d.from('onboarding_events').insert({ client_id, invite_id, kind, detail, ip: req ? ipOf(req) : null, user_agent: req ? uaOf(req) : null });
  if (r.error) console.error('event log failed', kind, r.error);
}

/**
 * Throws 429 when too many matching events happened in the window.
 * scope: 'ip' (this visitor), 'global' (everyone) or { invite_id } / { client_id }.
 * failOpen: let the request through if the limiter itself can't be reached
 * (used by the contact form so it keeps working if the database is down).
 */
export async function rateLimit(req, kinds, max, { windowMs = 3600_000, scope = 'ip', failOpen = false, message } = {}) {
  try {
    let q = db().from('onboarding_events').select('id', { count: 'exact', head: true }).in('kind', kinds).gte('at', new Date(Date.now() - windowMs).toISOString());
    if (scope === 'ip') q = q.eq('ip', ipOf(req));
    else if (scope && typeof scope === 'object') for (const [k, v] of Object.entries(scope)) q = q.eq(k, v);
    const r = await q;
    if (r.error) throw r.error;
    if (r.count >= max) throw new HttpError(429, message || 'Too many attempts. Please wait a while and try again, or email hello@srcs.online.');
  } catch (e) {
    if (!failOpen || (e instanceof HttpError && e.status === 429)) throw e;
    console.error('rate limiter unavailable', e);
  }
}

export const newToken = () => crypto.randomBytes(24).toString('base64url');
export const validToken = (t) => typeof t === 'string' && /^[A-Za-z0-9_-]{32,64}$/.test(t);

export function slugify(name) {
  const base = String(name || 'client').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'client';
  return `${/^[a-z0-9]/.test(base) ? base : `c-${base}`}-${crypto.randomBytes(3).toString('hex')}`;
}

export async function upload(path, bytes, contentType) {
  const r = await db().storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (r.error) throw r.error;
  return path;
}
export async function signedUrl(path, seconds = 3600, download) {
  if (!path) return null;
  const r = await db().storage.from(BUCKET).createSignedUrl(path, seconds, download ? { download } : undefined);
  return r.error ? null : r.data.signedUrl;
}

export const stamp = (d = new Date()) => d.toISOString().replace(/[:.]/g, '-').slice(0, 19);

let mailer;
// Returns true if sent. Never throws: a failed email must not undo a signature.
export async function mail({ to, subject, text, html, replyTo, attachments }) {
  const key = process.env.RESEND_API_KEY || process.env.Resend_Api_Key;
  if (!key) { console.error('RESEND_API_KEY is not set; onboarding email skipped'); return false; }
  mailer ||= new Resend(key);
  try {
    const { error } = await mailer.emails.send({ from: FROM, to, subject, text, html, replyTo, attachments });
    if (error) { console.error('Resend rejected onboarding email', error); return false; }
    return true;
  } catch (e) {
    console.error('onboarding email failed', e);
    return false;
  }
}
export const notifyTo = NOTIFY;

export const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Local tests only: swap in a stand-in database.
export function __setDb(fake) { if (process.env.ONBOARD_TEST === '1') client = fake; }
