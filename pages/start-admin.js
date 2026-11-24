(() => {
  const CMS = 'https://cms.srcs.online', SITE_KEY = 'srcs', KEY = 'srcs-cms:' + SITE_KEY;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const money = (n) => (n == null ? '—' : '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }));
  const when = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
  const b64e = (o) => { const b = new TextEncoder().encode(JSON.stringify(o)); let s = ''; b.forEach((c) => { s += String.fromCharCode(c); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const b64d = (str) => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return JSON.parse(new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0)))); };
  const auth = {
    get() { try { const r = localStorage.getItem(KEY); const a = r ? b64d(r) : null; if (a && !String(a.access_token || '').startsWith('scms1.')) { localStorage.removeItem(KEY); return null; } return a; } catch { return null; } },
    set(a) { try { localStorage.setItem(KEY, b64e(a)); } catch {} },
    clear() { try { localStorage.removeItem(KEY); } catch {} },
  };
  const VIEWS = ['v-loading', 'v-signin', 'v-list', 'v-new', 'v-client'];
  const show = (id) => { VIEWS.forEach((v) => { $(v).hidden = v !== id; }); const h = $(id).querySelector('h2'); if (h) h.focus({ preventScroll: true }); };

  // Sign-in comes back from the CMS with the session in the address bar's #fragment.
  const m = location.hash.match(/[#&]srcs-cms=([^&]+)/);
  if (m) { try { auth.set(b64d(m[1])); } catch {} history.replaceState(null, '', location.pathname); }
  const ret = location.origin + '/start/admin';
  $('signin-btn').href = `${CMS}/login.html?site=${SITE_KEY}&return=${encodeURIComponent(ret)}`;
  $('signin-btn').addEventListener('click', () => { try { if (route.client) sessionStorage.setItem('srcs-admin-client', route.client); } catch {} });

  // Passes last 12 hours; a new one comes from the sign-in page (no new email while
  // you're still signed in at cms.srcs.online).
  async function api(method, query, body) {
    const a = auth.get();
    if (!a || (a.expires_at && a.expires_at * 1000 < Date.now() + 30_000)) throw Object.assign(new Error('Please sign in.'), { status: 401 });
    const r = await fetch('/api/onboard-admin' + (query || ''), { method, headers: { Authorization: 'Bearer ' + a.access_token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: r.status });
    return data;
  }
  function handle(e) {
    if (e.status === 401 || e.status === 403) { if (e.status === 401) auth.clear(); $('signin-msg').textContent = e.status === 403 ? e.message : ''; show('v-signin'); }
    else alert(e.message);
  }

  const route = { client: null };
  function go(hash) { if (location.hash !== hash) history.pushState(null, '', hash || location.pathname); render(); }
  window.addEventListener('popstate', render);
  document.querySelectorAll('[data-back]').forEach((b) => b.onclick = () => go(''));

  async function render() {
    const h = location.hash;
    route.client = (h.match(/client=([0-9a-f-]{36})/) || [])[1] || null;
    if (!auth.get()) return show('v-signin');
    if (h.startsWith('#new')) return openNew((h.match(/new=([0-9a-f-]{36})/) || [])[1]);
    if (route.client) return openClient(route.client);
    return openList();
  }

  async function openList() {
    show('v-loading');
    try {
      const { clients } = await api('GET', '?action=list');
      $('list').innerHTML = clients.map((c) => `<tr><td><button class="rowlink" type="button" data-id="${c.id}">${esc(c.business_name)}</button><div class="muted">${esc(c.contact_name || '')}${c.contact_email ? ' · ' + esc(c.contact_email) : ''}</div></td><td><span class="pill ${esc(c.status)}">${esc(c.status)}</span></td><td class="hide-sm">${esc(c.invite?.project_name || '—')}${c.invite && !c.invite.signed_at ? `<div class="muted">${c.invite.viewed_at ? 'Opened ' + when(c.invite.viewed_at) : 'Not opened yet'}</div>` : ''}</td><td class="hide-sm muted">${when(c.updated_at)}</td></tr>`).join('');
      $('list-empty').hidden = clients.length > 0;
      $('list').querySelectorAll('[data-id]').forEach((b) => b.onclick = () => go('#client=' + b.dataset.id));
      show('v-list');
    } catch (e) { handle(e); }
  }

  /* ---------- new project link ---------- */
  let newClientId = null, createdClient = null;
  function svcRow(s = {}) {
    const d = document.createElement('div'); d.className = 'svc';
    d.innerHTML = `<div class="field"><label>Service</label><input class="s-name" list="svc-list" maxlength="120" value="${esc(s.service || '')}"></div><div class="field"><label>Description</label><input class="s-desc" maxlength="500" value="${esc(s.description || '')}"></div><div class="field"><label>Fee ($)</label><input class="s-fee" type="number" min="0" step="1" value="${s.fee ?? ''}"></div><button class="x" type="button" aria-label="Remove this service">×</button>`;
    d.querySelector('.x').onclick = () => { d.remove(); total(); };
    d.addEventListener('input', total);
    $('svcs').appendChild(d);
  }
  function services() { return [...$('svcs').children].map((d) => ({ service: d.querySelector('.s-name').value.trim(), description: d.querySelector('.s-desc').value.trim(), fee: d.querySelector('.s-fee').value === '' ? null : Number(d.querySelector('.s-fee').value) })).filter((s) => s.service); }
  function total() { $('svc-total').textContent = 'Total ' + money(services().reduce((t, s) => t + (s.fee || 0), 0)); }
  $('add-svc').onclick = () => svcRow();

  async function openNew(clientId) {
    newClientId = clientId || null;
    $('new-form').reset(); $('svcs').innerHTML = ''; svcRow({ service: 'Website design and build', fee: 1200 }); total();
    $('new-result').hidden = true; $('new-form').hidden = false; $('new-status').textContent = '';
    $('new-client-fields').hidden = !!newClientId;
    $('n-biz').required = !newClientId;
    $('new-h').textContent = 'New project link';
    if (newClientId) { try { const d = await api('GET', '?action=client&id=' + newClientId); $('new-h').textContent = 'New project link for ' + d.client.business_name; } catch (e) { return handle(e); } }
    show('v-new');
  }
  $('new-btn').onclick = () => go('#new');
  $('c-new').onclick = () => go('#new=' + route.client);
  $('new-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = $('new-form'); if (!f.checkValidity()) { f.reportValidity(); return; }
    const body = { action: 'invite', client_id: newClientId || undefined, business_name: $('n-biz').value, contact_name: $('n-contact').value, contact_email: $('n-email').value,
      project_name: $('n-project').value, services: services(), deposit_percent: $('n-deposit').value, hourly_rate: $('n-hourly').value, hosting_monthly: $('n-hosting').value,
      est_start: $('n-start').value, est_completion: $('n-end').value, expires_days: $('n-days').value, message: $('n-msg').value, send_email: $('n-send').checked };
    $('new-submit').disabled = true; $('new-status').textContent = 'Creating…';
    try {
      const r = await api('POST', '', body);
      createdClient = r.client_id;
      $('new-link').textContent = r.link; $('new-result').hidden = false; f.hidden = true;
      $('new-status').textContent = '';
      $('new-h').textContent = body.send_email ? (r.emailed ? 'Link created and emailed.' : 'Link created. The email didn’t send; copy the link instead.') : 'Link created.';
    } catch (err) { if (err.status === 401) return handle(err); $('new-status').textContent = err.message; }
    finally { $('new-submit').disabled = false; }
  });
  $('copy-link').onclick = async () => { try { await navigator.clipboard.writeText($('new-link').textContent); $('copy-link').textContent = 'Copied'; setTimeout(() => { $('copy-link').textContent = 'Copy'; }, 1600); } catch { getSelection().selectAllChildren($('new-link')); } };
  $('open-new-client').onclick = () => go('#client=' + createdClient);

  /* ---------- client file ---------- */
  const EVENTS = { client_created: 'Client file created', invite_created: 'Project link created', invite_emailed: 'Link emailed', invite_viewed: 'Client opened the link', intake_open: 'Intake form submitted', intake_invited: 'Intake form submitted', agreement_viewed: 'Agreement opened', sign_attempt: 'Signing started', signed: 'Agreement signed', status_changed: 'Status changed' };
  async function openClient(id) {
    show('v-loading');
    let d;
    try { d = await api('GET', '?action=client&id=' + id); } catch (e) { return handle(e); }
    const c = d.client;
    $('c-name').textContent = c.business_name;
    $('c-facts').innerHTML = [['Legal name', c.legal_name], ['Contact', c.contact_name], ['Email', c.contact_email ? `<a href="mailto:${esc(c.contact_email)}">${esc(c.contact_email)}</a>` : ''], ['Phone', c.contact_phone], ['Created', when(c.created_at)]]
      .filter(([, v]) => v).map(([k, v]) => `<tr><th scope="row">${k}</th><td>${k === 'Email' ? v : esc(v)}</td></tr>`).join('');
    $('c-status').value = c.status;
    $('c-status').onchange = async () => { $('c-status-msg').textContent = 'Saving…'; try { await api('POST', '', { action: 'status', id: c.id, status: $('c-status').value }); $('c-status-msg').textContent = 'Saved.'; } catch (e) { $('c-status-msg').textContent = e.message; } };

    $('c-agreement').innerHTML = d.agreements.map((a) => `<h3>Signed agreement</h3><table><tbody>
      <tr><th scope="row">Signed by</th><td>${esc(a.signer_name)}${a.signer_title ? ', ' + esc(a.signer_title) : ''}<div class="muted">${esc(a.signer_email)}</div></td></tr>
      <tr><th scope="row">Signed</th><td>${when(a.signed_at)} · ${a.signature_type === 'drawn' ? 'drawn' : 'typed'} signature</td></tr>
      <tr><th scope="row">IP address</th><td>${esc(a.ip || '—')}</td></tr>
      <tr><th scope="row">Fingerprint</th><td><code style="font-size:12.5px;word-break:break-all">${esc(a.document_sha256)}</code></td></tr>
      <tr><th scope="row">Copy emailed</th><td>${a.emailed_at ? when(a.emailed_at) : 'No'}</td></tr></tbody></table>
      ${a.pdf ? `<p style="margin-top:1rem"><a class="btn" href="${esc(a.pdf)}">Download signed PDF</a></p>` : ''}`).join('');

    const intake = d.intakes[0];
    $('c-intake').innerHTML = intake ? `<h3>Intake form <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· ${when(intake.submitted_at)}${d.intakes.length > 1 ? ` · ${d.intakes.length} versions` : ''}</span></h3>` +
      intake.summary.map((s) => `<p class="muted" style="margin:1.25rem 0 .25rem;font-weight:500">${esc(s.title)}</p><table><tbody>${s.rows.map(([l, v]) => `<tr><th scope="row">${esc(l)}</th><td class="pre">${esc(v)}</td></tr>`).join('')}</tbody></table>`).join('') +
      (intake.file ? `<p style="margin-top:1rem"><a class="linkish" href="${esc(intake.file)}">Download answers (JSON)</a></p>` : '')
      : '<h3>Intake form</h3><p class="muted">Not submitted yet.</p>';

    $('c-invites').innerHTML = d.invites.length ? d.invites.map((i) => `<div style="padding:12px 0;border-bottom:1px solid var(--hair)"><b>${esc(i.project_name)}</b> · ${money(i.total_fee)}
      <div class="muted">${i.signed_at ? 'Signed ' + when(i.signed_at) : i.viewed_at ? 'Opened ' + when(i.viewed_at) : 'Not opened yet'} · ${new Date(i.expires_at) < new Date() && !i.signed_at ? 'expired' : 'expires ' + when(i.expires_at)}</div>
      ${i.signed_at ? '' : `<button class="linkish" type="button" data-copy="${esc(i.link)}">Copy link</button>`}</div>`).join('') : '<p class="muted">None yet.</p>';
    $('c-invites').querySelectorAll('[data-copy]').forEach((b) => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; } catch { prompt('Copy this link', b.dataset.copy); } });

    $('c-events').innerHTML = d.events.filter((e) => e.kind !== 'sign_attempt').map((e) => `<li><time datetime="${esc(e.at)}">${when(e.at)}</time><span>${esc(EVENTS[e.kind] || e.kind)}${e.kind === 'status_changed' ? ' to ' + esc(e.detail?.status) : ''}${e.kind === 'invite_emailed' ? ' to ' + esc(e.detail?.to) : ''}</span></li>`).join('') || '<li class="muted">Nothing yet.</li>';
    show('v-client');
  }

  try { const back = sessionStorage.getItem('srcs-admin-client'); if (back && !location.hash) { sessionStorage.removeItem('srcs-admin-client'); history.replaceState(null, '', '#client=' + back); } } catch {}
  render();
})();
