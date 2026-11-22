/* ============================================================
   /api/onboard-admin — client files for srcs.online/start/admin
   Sign-in is the SRCS CMS login (Supabase). Only users in public.admins.

   GET  ?action=list                     every client, newest first
   GET  ?action=client&id=UUID           one client file: intake, invites, agreement, history, files
   POST { action:'invite', ... }         create a project + signing link (optionally email it)
   POST { action:'status', id, status }  move a client between stages
   ============================================================ */
import { handler, send, db, must, HttpError, logEvent, newToken, slugify, signedUrl, mail, notifyTo, SITE, escHtml } from './_onboard/lib.js';
import { summarize } from './_onboard/fields.js';

async function requireAdmin(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'Please sign in.');
  const { data, error } = await db().auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  const row = must(await db().from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle());
  if (!row) throw new HttpError(403, 'This account isn’t a Sync Race Studios admin.');
  return data.user;
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, min, max) => { const n = Number(v); return v === '' || v == null || !Number.isFinite(n) ? null : Math.min(max, Math.max(min, Math.round(n * 100) / 100)); };
const day = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const link = (t) => `${SITE}/start?invite=${t}`;

export default handler(['GET', 'POST'], async (req, res) => {
  const user = await requireAdmin(req);
  const action = req.method === 'GET' ? req.query.action : req.body.action;

  if (action === 'list') {
    const clients = must(await db().from('clients').select('id, slug, business_name, contact_name, contact_email, status, created_at, updated_at').order('updated_at', { ascending: false }).limit(500));
    const invites = must(await db().from('onboarding_invites').select('client_id, project_name, created_at, viewed_at, signed_at, expires_at').order('created_at', { ascending: false }));
    const latest = new Map();
    for (const i of invites) if (!latest.has(i.client_id)) latest.set(i.client_id, i);
    return send(res, 200, { clients: clients.map((c) => ({ ...c, invite: latest.get(c.id) || null })) });
  }

  if (action === 'client') {
    const id = String(req.query.id || '');
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(400, 'Invalid client');
    const client = must(await db().from('clients').select('*').eq('id', id).maybeSingle());
    if (!client) throw new HttpError(404, 'Client not found');
    const [intakes, invites, agreements, events] = await Promise.all([
      db().from('intake_submissions').select('id, answers, file_path, submitted_at, ip').eq('client_id', id).order('submitted_at', { ascending: false }),
      db().from('onboarding_invites').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      db().from('agreements').select('id, invite_id, template_version, document_sha256, signer_name, signer_title, signer_email, signature_type, signed_at, ip, user_agent, pdf_path, emailed_at').eq('client_id', id).order('signed_at', { ascending: false }),
      db().from('onboarding_events').select('kind, detail, ip, at').eq('client_id', id).order('at', { ascending: true }).limit(200),
    ]).then((rs) => rs.map(must));
    const name = client.business_name.replace(/[^\w .,&()-]/g, '');
    return send(res, 200, {
      client,
      intakes: await Promise.all(intakes.map(async (i) => ({ ...i, summary: summarize(i.answers), file: await signedUrl(i.file_path, 3600, `${name} intake.json`) }))),
      invites: invites.map((i) => ({ ...i, link: link(i.token), token: undefined })),
      agreements: await Promise.all(agreements.map(async (a) => ({ ...a, pdf: await signedUrl(a.pdf_path, 3600, `Sync Race Studios agreement - ${name}.pdf`) }))),
      events,
    });
  }

  if (action === 'invite') {
    const b = req.body;
    let client;
    if (b.client_id) {
      client = must(await db().from('clients').select('*').eq('id', String(b.client_id)).maybeSingle());
      if (!client) throw new HttpError(404, 'Client not found');
    } else {
      const business_name = str(b.business_name, 160);
      if (!business_name) throw new HttpError(400, 'Add the business name.');
      const email = str(b.contact_email, 200).toLowerCase();
      if (email && !EMAIL.test(email)) throw new HttpError(400, 'That email address looks incomplete.');
      client = must(await db().from('clients').insert({ slug: slugify(business_name), business_name, contact_name: str(b.contact_name, 120) || null, contact_email: email || null, status: 'invited' }).select('*').single());
      await logEvent(req, 'client_created', { client_id: client.id, detail: { by: user.email } });
    }
    const project_name = str(b.project_name, 160);
    if (!project_name) throw new HttpError(400, 'Add a project name.');
    const services = (Array.isArray(b.services) ? b.services : []).slice(0, 20)
      .map((s) => ({ service: str(s?.service, 120), description: str(s?.description, 500), fee: num(s?.fee, 0, 1e7) }))
      .filter((s) => s.service);
    if (!services.length) throw new HttpError(400, 'Add at least one service.');
    const total_fee = services.reduce((t, s) => t + (s.fee || 0), 0);
    const days = num(b.expires_days, 1, 90) || 30;
    const inv = must(await db().from('onboarding_invites').insert({
      client_id: client.id, token: newToken(), project_name, services, total_fee,
      deposit_percent: num(b.deposit_percent, 0, 100) ?? 50, hourly_rate: num(b.hourly_rate, 0, 10000) ?? 125, hosting_monthly: num(b.hosting_monthly, 0, 10000) ?? 25,
      est_start: day(b.est_start), est_completion: day(b.est_completion), message: str(b.message, 2000) || null,
      expires_at: new Date(Date.now() + days * 86400_000).toISOString(), created_by: user.id,
    }).select('*').single());
    await logEvent(req, 'invite_created', { client_id: client.id, invite_id: inv.id, detail: { by: user.email, total_fee } });

    let emailed = false;
    const to = str(b.send_to, 200).toLowerCase() || client.contact_email;
    if (b.send_email && to) {
      if (!EMAIL.test(to)) throw new HttpError(400, 'That email address looks incomplete.');
      const first = (client.contact_name || '').split(' ')[0];
      emailed = await mail({
        to, replyTo: notifyTo, subject: `Your project with Sync Race Studios: next steps`,
        text: `${first ? `Hi ${first},` : 'Hi,'}\n\n${inv.message ? `${inv.message}\n\n` : ''}To get "${project_name}" started, please fill in the short intake form and review and sign your agreement here:\n\n${link(inv.token)}\n\nIt takes about 10 minutes. The link works for ${days} days.\n\nDaniel, Sync Race Studios\nhello@srcs.online`,
        html: `<p>${first ? `Hi ${escHtml(first)},` : 'Hi,'}</p>${inv.message ? `<p style="white-space:pre-wrap">${escHtml(inv.message)}</p>` : ''}<p>To get “${escHtml(project_name)}” started, please fill in the short intake form and review and sign your agreement.</p><p><a href="${link(inv.token)}" style="display:inline-block;background:#FF6F4E;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Start your project</a></p><p style="color:#5A6170">It takes about 10 minutes. The link works for ${days} days.</p><p>Daniel, Sync Race Studios<br><a href="mailto:hello@srcs.online">hello@srcs.online</a></p>`,
      });
      if (emailed) await logEvent(req, 'invite_emailed', { client_id: client.id, invite_id: inv.id, detail: { to } });
    }
    return send(res, 200, { ok: true, client_id: client.id, link: link(inv.token), emailed });
  }

  if (action === 'status') {
    const status = String(req.body.status || '');
    if (!['invited', 'intake', 'signed', 'active', 'archived'].includes(status)) throw new HttpError(400, 'Invalid status');
    const id = String(req.body.id || '');
    must(await db().from('clients').update({ status, updated_at: new Date().toISOString() }).eq('id', id));
    await logEvent(req, 'status_changed', { client_id: id, detail: { status, by: user.email } });
    return send(res, 200, { ok: true });
  }

  throw new HttpError(400, 'Unknown action');
});
