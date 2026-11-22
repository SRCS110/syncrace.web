/* ============================================================
   POST /api/contact
   Receives the contact form and sends it on with Resend.

   ENVIRONMENT VARIABLES (Vercel → Settings → Environment Variables)

     RESEND_API_KEY   required   Starts with "re_". From resend.com/api-keys
     CONTACT_TO       optional   Where enquiries land. Defaults to admin@srcs.online
     CONTACT_FROM     optional   The From address. MUST be on a domain you've
                                 verified in Resend — see the note below.

   IMPORTANT: Resend will reject the send if CONTACT_FROM is on an
   unverified domain. Add srcs.online under resend.com/domains and
   add the DNS records it gives you before going live. Until that's
   done, use onboarding@resend.dev, which only delivers to the email
   address on your own Resend account — fine for testing, not for real.
   ============================================================ */

import { Resend } from 'resend';
import { checkRequest, lockHeaders, cleanText, cleanEmail } from './_onboard/guard.js';
import { rateLimit, logEvent, HttpError } from './_onboard/lib.js';

// Accept both spellings — the Vercel project uses CONTACT_TO_EMAIL,
// CONTACT_FROM_EMAIL and Resend_Api_Key.
const TO   = process.env.CONTACT_TO   || process.env.CONTACT_TO_EMAIL   || 'admin@srcs.online';
const FROM = process.env.CONTACT_FROM || process.env.CONTACT_FROM_EMAIL || 'Sync Race Studios <hello@srcs.online>';
const API_KEY = process.env.RESEND_API_KEY || process.env.Resend_Api_Key;

const SUBJECTS = {
  website:          'website design',
  google:           'Google Business Profile and Ads',
  'google-profile': 'a Google Business Profile',
  branding:         'logo design and branding',
  ads:              'Google Ads',
  marketing:        'a marketing campaign',
  content:          'the $50/month content engine',
  print:            'print and creative',
  apps:             'a business app',
  bundle:           'a few services together',
  care:             'looking after what they already have',
  other:            'something else',
  // Older deep links still resolve.
  software:         'a business app',
  editor:           'the visual HTML editor',
  stayntouch:       'the Stayntouch reporting engine',
  'freelancer-os':  'Freelancer OS early access',
};

const reply = (res, status, body) => { lockHeaders(res); res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.status(status).json(body); };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Use POST.' });
  }
  const blocked = checkRequest(req, { maxBytes: 32 * 1024 });
  if (blocked) return reply(res, blocked === 'Request too large.' ? 413 : 403, { error: blocked });

  if (!API_KEY) {
    // Don't leak config problems to visitors — log it, show something human.
    console.error('RESEND_API_KEY is not set.');
    return reply(res, 500, { error: 'Mail is not configured yet.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const { name = '', email = '', phone = '', budget = '',
          about = 'other', message = '', _gotcha = '' } = body;

  // Honeypot. Bots fill this; people can't see it. Pretend it worked.
  if (_gotcha) return reply(res, 200, { ok: true });

  // 5 messages an hour per visitor, 50 a day overall. If the limiter's database
  // is unreachable the form still works (fail open).
  try {
    await rateLimit(req, ['contact'], 5, { failOpen: true });
    await rateLimit(req, ['contact'], 50, { scope: 'global', windowMs: 86400_000, failOpen: true });
  } catch (e) {
    if (e instanceof HttpError) return reply(res, e.status, { error: 'You’ve sent a few messages already. Please email hello@srcs.online directly.' });
    throw e;
  }

  const fields = {
    name: cleanText(name, { max: 120, label: 'Your name' }),
    email: cleanEmail(email, 'Email'),
    phone: cleanText(phone, { max: 40, label: 'Phone' }),
    budget: cleanText(budget, { max: 60, label: 'Budget' }),
    message: cleanText(message, { max: 5000, multiline: true, label: 'Your message' }),
  };
  const bad = Object.values(fields).find((f) => f.error);
  if (bad) return reply(res, 400, { error: bad.error });
  const clean = Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.value]));
  clean.about = typeof about === 'string' && Object.hasOwn(SUBJECTS, about) ? about : 'other';

  if (!clean.name || !clean.message) {
    return reply(res, 400, { error: 'Please add your name and a message.' });
  }
  if (!clean.email) {
    return reply(res, 400, { error: 'That email address looks incomplete.' });
  }
  await logEvent(req, 'contact');

  const resend = new Resend(API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: `${clean.name} <${clean.email}>`,   // hit Reply and it goes to them
      subject: `New enquiry from ${clean.name} — ${SUBJECTS[clean.about]}`,
      text:
`${clean.name} <${clean.email}>
${clean.phone  ? `Phone: ${clean.phone}\n` : ''}${clean.budget ? `Budget: ${clean.budget}\n` : ''}Asking about: ${SUBJECTS[clean.about]}

${clean.message}

—
Sent from the contact form at srcs.online`,
    });

    if (error) {
      console.error('Resend rejected the send:', error);
      return reply(res, 502, { error: 'That didn\'t send.' });
    }

    return reply(res, 200, { ok: true });
  } catch (err) {
    console.error('Contact form failed:', err);
    return reply(res, 500, { error: 'That didn\'t send.' });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
