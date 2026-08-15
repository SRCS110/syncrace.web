/* ============================================================
   POST /api/contact
   Receives the contact form and sends it on with Resend.

   ENVIRONMENT VARIABLES (Vercel → Settings → Environment Variables)

     RESEND_API_KEY   required   Starts with "re_". From resend.com/api-keys
     CONTACT_TO       optional   Where enquiries land. Defaults to hello@srcs.online
     CONTACT_FROM     optional   The From address. MUST be on a domain you've
                                 verified in Resend — see the note below.

   IMPORTANT: Resend will reject the send if CONTACT_FROM is on an
   unverified domain. Add srcs.online under resend.com/domains and
   add the DNS records it gives you before going live. Until that's
   done, use onboarding@resend.dev, which only delivers to the email
   address on your own Resend account — fine for testing, not for real.
   ============================================================ */

import { Resend } from 'resend';

const TO   = process.env.CONTACT_TO   || 'hello@srcs.online';
const FROM = process.env.CONTACT_FROM || 'Sync Race Studios <hello@srcs.online>';

const SUBJECTS = {
  website:         'a website',
  software:        'software or a reporting tool',
  stayntouch:      'the Stayntouch reporting engine',
  'freelancer-os': 'Freelancer OS early access',
  care:            'ongoing site care',
  other:           'something else',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  if (!process.env.RESEND_API_KEY) {
    // Don't leak config problems to visitors — log it, show something human.
    console.error('RESEND_API_KEY is not set.');
    return res.status(500).json({ error: 'Mail is not configured yet.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const { name = '', email = '', about = 'other', message = '', _gotcha = '' } = body;

  // Honeypot. Bots fill this; people can't see it. Pretend it worked.
  if (_gotcha) return res.status(200).json({ ok: true });

  const clean = {
    name:    String(name).trim().slice(0, 120),
    email:   String(email).trim().slice(0, 200),
    message: String(message).trim().slice(0, 5000),
    about:   SUBJECTS[about] ? about : 'other',
  };

  if (!clean.name || !clean.message) {
    return res.status(400).json({ error: 'Please add your name and a message.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean.email)) {
    return res.status(400).json({ error: 'That email address looks incomplete.' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: `${clean.name} <${clean.email}>`,   // hit Reply and it goes to them
      subject: `New enquiry from ${clean.name} — ${SUBJECTS[clean.about]}`,
      text:
`${clean.name} <${clean.email}>
Asking about: ${SUBJECTS[clean.about]}

${clean.message}

—
Sent from the contact form at srcs.online`,
    });

    if (error) {
      console.error('Resend rejected the send:', error);
      return res.status(502).json({ error: 'That didn\'t send.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form failed:', err);
    return res.status(500).json({ error: 'That didn\'t send.' });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
