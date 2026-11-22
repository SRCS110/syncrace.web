/* ============================================================
   /api/onboard — client onboarding for srcs.online/start

   GET  ?action=spec                 intake form definition
   GET  ?action=invite&t=TOKEN       the client's invite (project, fees, status)
   POST { action:'intake', t?, answers }      save the intake form
   POST { action:'agreement', t }             the agreement to review + its fingerprint
   POST { action:'sign', t, sha256, name, title, email, consent, signature }

   ENVIRONMENT (Vercel → syncrace-web → Settings → Environment Variables)
     SUPABASE_SERVICE_ROLE_KEY  required, secret. The srcs-cms Supabase project's
                                secret key (same value the srcs-cms project uses).
     SUPABASE_URL               optional, defaults to the srcs-cms project.
     RESEND_API_KEY / Resend_Api_Key, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL
                                already set for the contact form; reused here.
   ============================================================ */
import crypto from 'node:crypto';
import { handler, send, db, must, HttpError, logEvent, rateLimit, ipOf, uaOf, validToken, slugify, upload, signedUrl, stamp, mail, notifyTo, SITE, escHtml } from './_onboard/lib.js';
import { cleanAnswers, summarize, publicSpec } from './_onboard/fields.js';
import { buildAgreement, agreementText, agreementHTML, sha256 } from './_onboard/agreement.js';
import { agreementPDF } from './_onboard/pdf.js';
import { cleanText, cleanEmail } from './_onboard/guard.js';
import { verifyTurnstile } from './_onboard/turnstile.js';

const consentText = (clientName) => `I have read the Client Service Agreement above and I am authorized to sign it for ${clientName}. I agree to sign electronically, and that my electronic signature has the same legal effect as my handwritten signature.`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SIGNED_LINK_DAYS = 30;   // a signed agreement's link keeps working this long, then stops
const field = (v, opts) => { const r = cleanText(v, opts); if (r.error) throw new HttpError(400, r.error); return r.value; };

async function loadInvite(req, t) {
  const invalid = 'That link isn’t valid. Please use the link from your email, or contact hello@srcs.online.';
  // Guessing links: after 15 wrong ones in an hour, this connection is locked out.
  await rateLimit(req, ['bad_token'], 15, { message: 'Too many invalid links from this connection. Please wait an hour, or email hello@srcs.online.' });
  const inv = validToken(t) ? must(await db().from('onboarding_invites').select('*').eq('token', t).maybeSingle()) : null;
  if (!inv) { await logEvent(req, 'bad_token'); throw new HttpError(404, invalid); }
  if (!inv.signed_at && new Date(inv.expires_at) < new Date()) throw new HttpError(410, 'This link has expired. Email hello@srcs.online and we’ll send a new one.');
  if (inv.signed_at && Date.now() - new Date(inv.signed_at).getTime() > SIGNED_LINK_DAYS * 86400_000) throw new HttpError(410, 'This agreement was signed and its link has now closed. Email hello@srcs.online for a copy.');
  const client = must(await db().from('clients').select('*').eq('id', inv.client_id).single());
  return { inv, client };
}

const latestIntake = async (clientId) => must(await db().from('intake_submissions').select('*').eq('client_id', clientId).order('submitted_at', { ascending: false }).limit(1).maybeSingle());

export default handler(['GET', 'POST'], async (req, res) => {
  if (req.method === 'POST' && req.body.action !== undefined && typeof req.body.action !== 'string') throw new HttpError(400, 'Unknown action');
  const action = req.method === 'GET' ? req.query.action : req.body.action;

  if (action === 'spec') return send(res, 200, { steps: publicSpec() });

  if (action === 'invite') {
    await rateLimit(req, ['invite_lookup'], 60);
    await logEvent(req, 'invite_lookup');
    const { inv, client } = await loadInvite(req, req.query.t);
    if (!inv.viewed_at) {
      await db().from('onboarding_invites').update({ viewed_at: new Date().toISOString() }).eq('id', inv.id);
      await logEvent(req, 'invite_viewed', { client_id: client.id, invite_id: inv.id });
    }
    const intake = await latestIntake(client.id);
    let signed = null;
    if (inv.signed_at) {
      const ag = must(await db().from('agreements').select('signed_at, signer_name, pdf_path').eq('invite_id', inv.id).maybeSingle());
      if (ag) signed = { at: ag.signed_at, by: ag.signer_name, pdf: await signedUrl(ag.pdf_path, 3600, `Sync Race Studios agreement - ${client.business_name}.pdf`) };
    }
    return send(res, 200, {
      client: { business_name: client.business_name, contact_name: client.contact_name, contact_email: client.contact_email },
      project: { name: inv.project_name, services: inv.services, total_fee: inv.total_fee, deposit_percent: inv.deposit_percent, est_start: inv.est_start, est_completion: inv.est_completion, message: inv.message },
      intake: intake ? { answers: intake.answers, submitted_at: intake.submitted_at } : null,
      signed,
    });
  }

  if (action === 'intake') {
    if (req.body._gotcha) return send(res, 200, { ok: true });   // honeypot
    const { answers, errors } = cleanAnswers(req.body.answers);
    if (errors.length) throw new HttpError(400, errors[0], { errors });
    let inv = null, client;
    if (req.body.t) {
      ({ inv, client } = await loadInvite(req, req.body.t));
      if (inv.signed_at) throw new HttpError(409, 'This agreement is already signed. Email hello@srcs.online to update your details.');
      await rateLimit(req, ['intake_invited'], 5, { scope: { invite_id: inv.id } });
    } else {
      await rateLimit(req, ['intake_open'], 3);
      await rateLimit(req, ['intake_open'], 30, { scope: 'global', windowMs: 86400_000, message: 'We’re getting a lot of requests right now. Please email hello@srcs.online instead.' });
      // The public form (no project link) must pass Cloudflare Turnstile.
      await verifyTurnstile(req.body['cf-turnstile-response'], { action: 'start_intake', ip: ipOf(req) });
      client = must(await db().from('clients').insert({
        slug: slugify(answers.display_name || answers.legal_name),
        business_name: answers.display_name || answers.legal_name,
        status: 'intake',
      }).select('*').single());
    }
    const patch = {
      legal_name: answers.legal_name, contact_name: answers.contact_name, contact_email: answers.email,
      contact_phone: answers.phone || client.contact_phone || null, updated_at: new Date().toISOString(),
      ...(['invited', 'intake'].includes(client.status) ? { status: 'intake' } : {}),
    };
    must(await db().from('clients').update(patch).eq('id', client.id));
    const now = new Date();
    const file_path = await upload(`${client.slug}/intake-${stamp(now)}.json`, Buffer.from(JSON.stringify({ submitted_at: now.toISOString(), answers }, null, 2)), 'application/json');
    must(await db().from('intake_submissions').insert({ client_id: client.id, invite_id: inv?.id || null, answers, file_path, ip: ipOf(req), user_agent: uaOf(req), submitted_at: now.toISOString() }));
    await logEvent(req, inv ? 'intake_invited' : 'intake_open', { client_id: client.id, invite_id: inv?.id || null });

    const summary = summarize(answers);
    const name = answers.display_name || answers.legal_name;
    await mail({
      to: notifyTo,
      replyTo: `${answers.contact_name} <${answers.email}>`,
      subject: `${inv ? 'Intake received' : 'New client intake'}: ${name}`,
      text: `${answers.contact_name} <${answers.email}> submitted the intake form${inv ? ` for "${inv.project_name}"` : ''}.\n\n${summary.map((s) => `${s.title.toUpperCase()}\n${s.rows.map(([l, v]) => `${l}: ${v}`).join('\n')}`).join('\n\n')}\n\nClient file: ${SITE}/start/admin#client=${client.id}`,
      html: `<p><b>${escHtml(answers.contact_name)}</b> &lt;${escHtml(answers.email)}&gt; submitted the intake form${inv ? ` for “${escHtml(inv.project_name)}”` : ''}.</p>${summary.map((s) => `<h3 style="font:600 15px sans-serif;margin:22px 0 6px">${escHtml(s.title)}</h3><table style="border-collapse:collapse;font:14px sans-serif">${s.rows.map(([l, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#5A6170;vertical-align:top">${escHtml(l)}</td><td style="padding:4px 0;white-space:pre-wrap">${escHtml(v)}</td></tr>`).join('')}</table>`).join('')}<p style="margin-top:24px"><a href="${SITE}/start/admin#client=${client.id}">Open the client file</a></p>`,
    });
    return send(res, 200, { ok: true, next: inv ? 'agreement' : 'done' });
  }

  if (action === 'agreement' || action === 'sign') {
    if (action === 'agreement') await rateLimit(req, ['agreement_viewed'], 30);
    const { inv, client } = await loadInvite(req, req.body.t);
    if (inv.signed_at) throw new HttpError(409, 'This agreement is already signed.', { signed: true });
    const intake = await latestIntake(client.id);
    if (!intake) throw new HttpError(409, 'Please complete the intake form first.', { needIntake: true });
    const doc = buildAgreement(inv, client, intake);
    const text = agreementText(doc);
    const hash = sha256(text);

    if (action === 'agreement') {
      await logEvent(req, 'agreement_viewed', { client_id: client.id, invite_id: inv.id, detail: { sha256: hash } });
      return send(res, 200, { html: agreementHTML(doc), sha256: hash, version: doc.version, clientName: doc.clientName, consent: consentText(doc.clientName), signer: { name: intake.answers.contact_name || '', title: intake.answers.contact_title || '', email: intake.answers.email || '' } });
    }

    // ---- sign ----
    await rateLimit(req, ['sign_attempt'], 10);
    await logEvent(req, 'sign_attempt', { client_id: client.id, invite_id: inv.id });
    if (req.body.sha256 !== hash) throw new HttpError(409, 'The agreement was updated since you opened it. Please review it again before signing.', { changed: true });
    const name = field(req.body.name, { max: 120, label: 'Your name' }), title = field(req.body.title, { max: 120, label: 'Title' });
    const em = cleanEmail(req.body.email, 'Email');
    if (em.error) throw new HttpError(400, em.error);
    const email = em.value || '';
    if (name.length < 2) throw new HttpError(400, 'Please type your full name.');
    if (!email) throw new HttpError(400, 'Please enter a valid email address.');
    if (req.body.consent !== true) throw new HttpError(400, 'Please check the box to agree to sign electronically.');
    const sig = req.body.signature || {};
    const type = sig.type === 'drawn' ? 'drawn' : 'typed';
    let png = null;
    if (type === 'drawn') {
      const m = typeof sig.png === 'string' && sig.png.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
      if (!m || m[1].length > 400_000) throw new HttpError(400, 'Please draw your signature again.');
      png = Buffer.from(m[1], 'base64');
      if (png.length < 100 || png.readUInt32BE(0) !== 0x89504e47) throw new HttpError(400, 'Please draw your signature again.');
    } else if (field(sig.typed, { max: 120, label: 'Signature' }).toLowerCase() !== name.toLowerCase()) {
      throw new HttpError(400, 'Your typed signature should match your full name.');
    }

    const signedAt = new Date();
    const agreementId = crypto.randomUUID();
    const consent = consentText(doc.clientName);
    const base = `${client.slug}/agreement-${stamp(signedAt)}`;
    const signature_path = png ? await upload(`${base}-signature.png`, png, 'image/png') : null;
    const pdfBytes = await agreementPDF(doc, { name, title, email, type, typed: name, png, signedAt, ip: ipOf(req), userAgent: uaOf(req), consent }, summarize(intake.answers), {
      sha256: hash, inviteCreatedAt: inv.created_at, inviteViewedAt: inv.viewed_at, intakeAt: intake.submitted_at, agreementId,
    });
    const pdf = Buffer.from(pdfBytes);
    const pdf_path = await upload(`${base}.pdf`, pdf, 'application/pdf');

    const ins = await db().from('agreements').insert({
      id: agreementId, client_id: client.id, invite_id: inv.id, template_version: doc.version, document: doc, document_text: text, document_sha256: hash,
      signer_name: name, signer_title: title || null, signer_email: email, signature_type: type, signature_path, consent_text: consent,
      signed_at: signedAt.toISOString(), ip: ipOf(req), user_agent: uaOf(req), pdf_path, pdf_sha256: sha256(pdf),
    });
    if (ins.error) {
      if (ins.error.code === '23505') throw new HttpError(409, 'This agreement is already signed.', { signed: true });
      throw ins.error;
    }
    must(await db().from('onboarding_invites').update({ signed_at: signedAt.toISOString() }).eq('id', inv.id));
    must(await db().from('clients').update({ status: 'signed', updated_at: signedAt.toISOString() }).eq('id', client.id));
    await logEvent(req, 'signed', { client_id: client.id, invite_id: inv.id, detail: { agreement_id: agreementId, sha256: hash, type } });

    const filename = `Sync Race Studios agreement - ${client.business_name}.pdf`.replace(/[^\w .,&()-]/g, '');
    const attachments = [{ filename, content: pdf }];
    const to = [...new Set([email, String(client.contact_email || '').toLowerCase()].filter((e) => EMAIL.test(e)))];
    const sentClient = await mail({
      to, replyTo: notifyTo, subject: `Your signed agreement with Sync Race Studios`, attachments,
      text: `Hi ${name.split(' ')[0]},\n\nThanks for signing. Your copy of the Client Service Agreement for "${inv.project_name}" is attached.\n\nNext, we'll send your deposit invoice and set up a kickoff call.\n\nDaniel, Sync Race Studios\nhello@srcs.online`,
      html: `<p>Hi ${escHtml(name.split(' ')[0])},</p><p>Thanks for signing. Your copy of the Client Service Agreement for “${escHtml(inv.project_name)}” is attached.</p><p>Next, we’ll send your deposit invoice and set up a kickoff call.</p><p>Daniel, Sync Race Studios<br><a href="mailto:hello@srcs.online">hello@srcs.online</a></p>`,
    });
    await mail({
      to: notifyTo, replyTo: `${name} <${email}>`, subject: `Signed: ${client.business_name} — ${inv.project_name}`, attachments,
      text: `${name}${title ? `, ${title}` : ''} <${email}> signed the agreement for ${doc.clientName} at ${signedAt.toISOString()}.\nFingerprint: ${hash}\nIP: ${ipOf(req)}\n\nClient file: ${SITE}/start/admin#client=${client.id}`,
    });
    if (sentClient) await db().from('agreements').update({ emailed_at: new Date().toISOString() }).eq('id', agreementId);

    return send(res, 200, { ok: true, signedAt: signedAt.toISOString(), emailed: sentClient, pdf: await signedUrl(pdf_path, 3600, filename) });
  }

  throw new HttpError(400, 'Unknown action');
}, { maxBytes: 600 * 1024 });
