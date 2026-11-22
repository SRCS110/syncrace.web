(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const money = (n) => (n == null || n === '' ? 'Included' : '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }));
  // start-theme.js already moved ?invite= out of the address bar into this tab's session.
  const token = (() => {
    const q = new URLSearchParams(location.search).get('invite');
    if (q) return q;
    try { return sessionStorage.getItem('srcs-start-invite') || ''; } catch { return ''; }
  })();
  // Same checks the server runs: no tags, script links or template code in any answer.
  const CODE = [/<\s*\/?\s*[a-z!?%]/i, /\b(?:javascript|vbscript|livescript)\s*:/i, /\bdata\s*:\s*(?:text\/html|application\/(?:x-)?javascript|image\/svg)/i, /&#x?0*(?:3c|60);?/i, /\bexpression\s*\(/i, /\$\{|\{\{|\}\}|<%|%>/];
  const hasCode = (v) => CODE.some((re) => re.test(v));
  const CODE_MSG = 'Please remove any code or HTML, like < > tags.';
  function checkCode(root) {
    let first = null;
    root.querySelectorAll('input[type=text], input[type=email], input[type=tel], input[type=url], input:not([type]), textarea').forEach((el) => {
      el.setCustomValidity(hasCode(el.value) ? CODE_MSG : '');
      if (!first && hasCode(el.value)) first = el;
    });
    return first;
  }
  const DRAFT = 'srcs-start:' + (token ? token.slice(0, 12) : 'open');
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch { return null; } },
    set(v) { try { localStorage.setItem(DRAFT, JSON.stringify(v)); return true; } catch { return false; } },
    clear() { try { localStorage.removeItem(DRAFT); } catch {} },
  };

  // Cloudflare Turnstile on the public form (no project link). Rendered explicitly so it
  // can be reset after every attempt: tokens work once.
  const TS_SITEKEY = '0x4AAAAAAGNkdynvd29FTfAN', TS_ACTION = 'start_intake';
  let tsId = null, tsToken = '', tsLoading = null;
  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve();
    if (tsLoading) return tsLoading;
    tsLoading = new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      sc.async = true; sc.defer = true;
      sc.onload = () => resolve(); sc.onerror = () => { tsLoading = null; reject(new Error('Turnstile failed to load')); };
      document.head.appendChild(sc);
    });
    return tsLoading;
  }
  async function renderTurnstile(el) {
    tsToken = '';
    try { await loadTurnstile(); } catch { el.textContent = 'The verification check didn’t load. Check your connection, or email hello@srcs.online.'; return; }
    if (tsId !== null) { try { window.turnstile.remove(tsId); } catch {} tsId = null; }
    if (!el.isConnected) return;
    tsId = window.turnstile.render(el, {
      sitekey: TS_SITEKEY, action: TS_ACTION,
      callback: (t) => { tsToken = t; },
      'expired-callback': () => { tsToken = ''; },
      'error-callback': () => { tsToken = ''; },
    });
  }
  function resetTurnstile() { tsToken = ''; if (tsId !== null && window.turnstile) { try { window.turnstile.reset(tsId); } catch {} } }

  let spec = [], invite = null, answers = {}, step = 0, agreement = null;
  const VIEWS = ['v-loading', 'v-error', 'v-welcome', 'v-wizard', 'v-agreement', 'v-done'];

  function show(id, focus = true) {
    VIEWS.forEach((v) => { $(v).hidden = v !== id; });
    if (focus) { const h = $(id).querySelector('h2'); if (h) h.focus({ preventScroll: true }); $('ob').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
  }
  function fail(msg) { $('error-msg').textContent = msg; show('v-error'); }

  async function api(method, body, query = '') {
    const r = await fetch('/api/onboard' + query, method === 'GET' ? {} : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(data.error || 'Something went wrong. Please try again.'); e.data = data; e.status = r.status; throw e; }
    return data;
  }

  /* ---------- intake wizard ---------- */
  const reviewIndex = () => spec.length;
  const labels = () => [...spec.map((s) => s.title), 'Review', ...(token ? ['Sign'] : [])];

  function renderSteps() {
    const all = labels();
    $('steps').innerHTML = all.map((t, i) => `<li${i === step ? ' aria-current="step"' : ''}${i < step ? ' class="done"' : ''}><i aria-hidden="true">${i < step ? '✓' : i + 1}</i><span>${esc(t)}</span></li>`).join('');
    $('bar').style.width = Math.round((step / (all.length - 1)) * 100) + '%';
  }

  function fieldHTML(f) {
    const id = 'f-' + f.key, v = answers[f.key];
    const req = f.required ? ' required' : '';
    const star = f.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
    const hint = f.hint ? ` <span class="hint">${esc(f.hint)}</span>` : '';
    if (f.type === 'checks' || f.type === 'radio') {
      const t = f.type === 'checks' ? 'checkbox' : 'radio';
      return `<fieldset class="field"><legend>${esc(f.label)}${star}${hint}</legend><div class="choices">${f.options.map(([k, l]) => {
        const on = f.type === 'checks' ? (Array.isArray(v) && v.includes(k)) : v === k;
        return `<label class="choice"><input type="${t}" name="${f.key}" value="${esc(k)}"${on ? ' checked' : ''}><span>${esc(l)}</span></label>`;
      }).join('')}</div></fieldset>`;
    }
    const common = `id="${id}" name="${f.key}"${req}${f.autocomplete ? ` autocomplete="${f.autocomplete}"` : ''}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}`;
    const input = f.type === 'textarea'
      ? `<textarea ${common} rows="${f.rows || 4}" maxlength="3000" style="${f.rows ? 'min-height:auto' : ''}">${esc(v || '')}</textarea>`
      : `<input ${common} type="${f.type === 'email' || f.type === 'tel' || f.type === 'url' ? f.type : 'text'}" maxlength="300" value="${esc(v || '')}">`;
    return `<div class="field"><label for="${id}">${esc(f.label)}${star}${hint}</label>${input}</div>`;
  }

  function renderStep() {
    renderSteps();
    const host = $('step-host');
    const last = labels().length - 1;
    if (step < spec.length) {
      const s = spec[step];
      let body = '', pend = [];
      const flush = () => { if (pend.length) { body += pend.length > 1 ? `<div class="row">${pend.join('')}</div>` : pend[0]; pend = []; } };
      for (const f of s.fields) { if (f.half) { pend.push(fieldHTML(f)); if (pend.length === 2) flush(); } else { flush(); body += fieldHTML(f); } }
      flush();
      host.innerHTML = `<form class="form" id="step-form" novalidate><h2 tabindex="-1">${esc(s.title)}</h2><p class="intro">${esc(s.intro || '')}</p>${body}
        <div class="trap" aria-hidden="true"><label for="hp">Leave empty</label><input id="hp" name="_gotcha" type="text" tabindex="-1" autocomplete="off"></div>
        <p class="form-note" id="step-status" role="status"></p>
        <div class="ob-nav">${step > 0 ? '<button class="btn btn-quiet" type="button" id="back">Back</button>' : '<span class="saved" id="saved"></span>'}<div class="right"><button class="btn" type="submit">${step === spec.length - 1 ? 'Review answers' : 'Next'} <span class="arrow" aria-hidden="true">→</span></button></div></div></form>`;
      const form = $('step-form');
      form.addEventListener('input', (e) => { if (e.target.setCustomValidity) e.target.setCustomValidity(''); collect(form); store.set({ answers, step }); });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        collect(form);
        checkCode(form);
        if (!form.checkValidity()) { form.reportValidity(); const bad = form.querySelector(':invalid'); if (bad) bad.focus(); return; }
        step++; store.set({ answers, step }); renderStep();
      });
      if ($('back')) $('back').onclick = () => { collect(form); step--; store.set({ answers, step }); renderStep(); };
      if ($('saved') && store.get()) $('saved').textContent = 'Your answers are saved on this device.';
    } else {
      // review
      const groups = spec.map((s, i) => {
        const rows = s.fields.map((f) => [f, display(f, answers[f.key])]).filter(([, v]) => v);
        return `<h3><span>${esc(s.title)}</span><button class="linkish" type="button" data-edit="${i}">Edit<span class="sr-only"> ${esc(s.title)}</span></button></h3>${rows.length ? `<table><tbody>${rows.map(([f, v]) => `<tr><th scope="row">${esc(f.label)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>` : '<p class="intro" style="margin:0">Nothing added.</p>'}`;
      }).join('');
      host.innerHTML = `<div class="review"><h2 tabindex="-1">Check your answers.</h2><p class="intro">${token ? 'Submit these, then you’ll review your agreement.' : 'Submit these and we’ll be in touch, usually the same day.'}</p>${groups}
        ${token ? '' : '<div id="ts" class="ts-box" style="margin-top:1.75rem;min-height:65px"></div>'}
        <p class="form-note" id="step-status" role="status"></p>
        <div class="ob-nav"><button class="btn btn-quiet" type="button" id="back">Back</button><div class="right"><button class="btn" type="button" id="submit">${token ? 'Submit and continue' : 'Submit'} <span class="arrow" aria-hidden="true">→</span></button></div></div></div>`;
      host.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => { step = Number(b.dataset.edit); renderStep(); });
      $('back').onclick = () => { step--; renderStep(); };
      $('submit').onclick = submitIntake;
      if (!token) renderTurnstile($('ts'));
    }
    const h = host.querySelector('h2'); if (h) h.focus({ preventScroll: true });
    $('ob').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function display(f, v) {
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '';
    if (f.type === 'checks') return v.map((k) => (f.options.find(([o]) => o === k) || [k, k])[1]).join(', ');
    if (f.type === 'radio') return (f.options.find(([o]) => o === v) || [v, v])[1];
    return v;
  }

  let trap = '';
  function collect(form) {
    const s = spec[step];
    for (const f of s.fields) {
      if (f.type === 'checks') answers[f.key] = [...form.querySelectorAll(`input[name="${f.key}"]:checked`)].map((i) => i.value);
      else if (f.type === 'radio') { const c = form.querySelector(`input[name="${f.key}"]:checked`); answers[f.key] = c ? c.value : ''; }
      else { const el = form.elements[f.key]; if (el) answers[f.key] = el.value; }
    }
    const hp = form.elements._gotcha; if (hp && hp.value) trap = hp.value;
  }

  async function submitIntake() {
    const btn = $('submit'), st = $('step-status');
    if (!token && !tsToken) { st.textContent = 'Please complete the verification check above.'; return; }
    btn.disabled = true; st.textContent = 'Sending…';
    const ts = tsToken;
    try {
      const r = await api('POST', { action: 'intake', t: token || undefined, answers, _gotcha: trap, ...(token ? {} : { 'cf-turnstile-response': ts }) });
      if (r.next === 'agreement') { invite.intake = { answers: { ...answers }, submitted_at: new Date().toISOString() }; await openAgreement(); }
      else { store.clear(); done('Thanks, we’ve got it.', 'We’ll read through your answers and reply by email, usually the same day. If it’s a fit, we’ll send your agreement to review and sign online.', []); }
    } catch (e) {
      st.textContent = e.message;
    } finally { btn.disabled = false; if (!token) resetTurnstile(); }
  }

  /* ---------- agreement + signature ---------- */
  async function openAgreement() {
    show('v-loading', false);
    try {
      agreement = await api('POST', { action: 'agreement', t: token });
    } catch (e) {
      if (e.data?.needIntake) { step = 0; show('v-wizard'); renderStep(); return; }
      if (e.data?.signed) return load();
      return fail(e.message);
    }
    $('doc').innerHTML = agreement.html;
    $('doc').scrollTop = 0;
    $('doc-fp').textContent = 'Document fingerprint ' + agreement.sha256.slice(0, 12);
    $('consent-text').textContent = agreement.consent;
    if (!$('s-name').value) $('s-name').value = agreement.signer.name || '';
    if (!$('s-title').value) $('s-title').value = agreement.signer.title || '';
    if (!$('s-email').value) $('s-email').value = agreement.signer.email || '';
    updateTyped();
    show('v-agreement');
    setupPad();
  }

  let mode = 'typed';
  function setMode(m) {
    mode = m;
    $('tab-type').setAttribute('aria-selected', m === 'typed'); $('tab-type').tabIndex = m === 'typed' ? 0 : -1;
    $('tab-draw').setAttribute('aria-selected', m === 'drawn'); $('tab-draw').tabIndex = m === 'drawn' ? 0 : -1;
    $('pane-type').hidden = m !== 'typed'; $('pane-draw').hidden = m !== 'drawn';
    if (m === 'drawn') sizePad();
  }
  $('tab-type').onclick = () => setMode('typed');
  $('tab-draw').onclick = () => setMode('drawn');
  document.querySelector('.tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); setMode(mode === 'typed' ? 'drawn' : 'typed'); (mode === 'typed' ? $('tab-type') : $('tab-draw')).focus();
  });
  function updateTyped() {
    const v = $('s-name').value.trim(), el = $('sig-typed');
    el.classList.toggle('empty', !v);
    el.textContent = v || 'Your signature appears here as you type your name.';
  }
  $('s-name').addEventListener('input', updateTyped);

  // Signature pad
  const pad = $('pad'); let ctx, drawing = false, inked = false, last = null, padReady = false;
  function sizePad() {
    const r = pad.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const keep = inked ? pad.toDataURL() : null;
    pad.width = Math.round(r.width * dpr); pad.height = Math.round(r.height * dpr);
    ctx = pad.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1E2430';
    if (keep) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height); img.src = keep; }
  }
  function setupPad() {
    if (padReady) return; padReady = true;
    const pt = (e) => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    pad.addEventListener('pointerdown', (e) => { if (!ctx) sizePad(); drawing = true; last = pt(e); pad.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(last.x, last.y, 1.1, 0, Math.PI * 2); ctx.fillStyle = '#1E2430'; ctx.fill(); inked = true; });
    pad.addEventListener('pointermove', (e) => { if (!drawing) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; inked = true; });
    const end = () => { drawing = false; };
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
    $('pad-clear').onclick = () => { if (ctx) ctx.clearRect(0, 0, pad.width, pad.height); inked = false; };
    let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (mode === 'drawn') sizePad(); }, 150); });
  }
  // Trim the drawing to its ink so it sits well in the PDF.
  function padPNG() {
    const w = pad.width, h = pad.height, data = pad.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0 || y1 <= y0) return null;
    const pad8 = 12, cw = x1 - x0 + pad8 * 2, ch = y1 - y0 + pad8 * 2, scale = Math.min(1, 900 / cw);
    const out = document.createElement('canvas'); out.width = Math.round(cw * scale); out.height = Math.round(ch * scale);
    out.getContext('2d').drawImage(pad, x0 - pad8, y0 - pad8, cw, ch, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }

  $('doc-print').onclick = () => window.print();
  $('sign-back').onclick = () => { step = reviewIndex(); show('v-wizard'); renderStep(); };

  $('sign-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const st = $('sign-status'), btn = $('sign-btn');
    const name = $('s-name').value.trim(), email = $('s-email').value.trim();
    const say = (m, el) => { st.innerHTML = `<span class="err">${esc(m)}</span>`; if (el) el.focus(); };
    const codeEl = checkCode($('sign-form'));
    if (codeEl) return say(CODE_MSG, codeEl);
    if (name.length < 2) return say('Please type your full name.', $('s-name'));
    if (!$('s-email').checkValidity() || !email) return say('Please enter a valid email address.', $('s-email'));
    let signature;
    if (mode === 'drawn') { const png = inked ? padPNG() : null; if (!png) return say('Please draw your signature, or switch to Type.', $('tab-draw')); signature = { type: 'drawn', png }; }
    else signature = { type: 'typed', typed: name };
    if (!$('s-consent').checked) return say('Please check the box to agree to sign electronically.', $('s-consent'));
    btn.disabled = true; btn.textContent = 'Signing…'; st.textContent = 'Signing and preparing your PDF…';
    try {
      const r = await api('POST', { action: 'sign', t: token, sha256: agreement.sha256, name, title: $('s-title').value.trim(), email, consent: true, signature });
      store.clear();
      const btns = [];
      if (r.pdf) btns.push(`<a class="btn" href="${esc(r.pdf)}">Download signed PDF</a>`);
      btns.push('<a class="btn btn-quiet" href="/">Back to srcs.online</a>');
      done('Signed. Welcome aboard.', r.emailed ? `A copy of your signed agreement is on its way to ${email}. Next, we’ll send your deposit invoice and set up a kickoff call.` : 'Your agreement is signed. Download your copy below. Next, we’ll send your deposit invoice and set up a kickoff call.', btns);
    } catch (err) {
      if (err.data?.changed) { say(err.message); await openAgreement(); return; }
      say(err.message);
    } finally { btn.disabled = false; btn.textContent = 'Sign agreement'; }
  });

  function done(h, msg, btns) {
    $('done-h').textContent = h; $('done-msg').textContent = msg; $('done-btns').innerHTML = btns.join('');
    $('ob-title').textContent = 'You’re all set.'; $('ob-lede').hidden = true;
    show('v-done');
  }

  /* ---------- start ---------- */
  async function load() {
    try {
      spec = (await api('GET', null, '?action=spec')).steps;
      if (token) invite = await api('GET', null, '?action=invite&t=' + encodeURIComponent(token));
    } catch (e) { return fail(e.message); }

    const draft = store.get();
    if (invite?.signed) {
      const s = invite.signed;
      return done('This agreement is signed.', `Signed by ${s.by} on ${new Date(s.at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Need a change? Email hello@srcs.online.`, s.pdf ? [`<a class="btn" href="${esc(s.pdf)}">Download signed PDF</a>`] : []);
    }
    if (!invite) {
      answers = draft?.answers || {};
      step = Math.min(draft?.step || 0, reviewIndex());
      show('v-wizard', false); renderStep(); return;
    }
    // Invited: show the project first.
    answers = draft?.answers || { ...(invite.intake?.answers || {}) };
    if (!answers.contact_name && invite.client.contact_name) answers.contact_name = invite.client.contact_name;
    if (!answers.email && invite.client.contact_email) answers.email = invite.client.contact_email;
    if (!answers.display_name && invite.client.business_name) answers.display_name = invite.client.business_name;
    step = Math.min(draft?.step || 0, reviewIndex());
    const first = (invite.client.contact_name || '').split(' ')[0];
    $('ob-title').textContent = invite.project.name;
    $('ob-lede').textContent = `For ${invite.client.business_name}. Three short steps and you’re booked in.`;
    $('welcome-h').textContent = first ? `Hi ${first}, here’s your project.` : 'Here’s your project.';
    $('welcome-msg').textContent = invite.project.message || '';
    $('welcome-msg').hidden = !invite.project.message;
    const sv = invite.project.services || [];
    $('welcome-services').innerHTML = sv.map((s) => `<tr><td>${esc(s.service)}</td><td>${esc(s.description || '')}</td><td class="fee">${money(s.fee)}</td></tr>`).join('') +
      `<tr class="total"><td>Total</td><td>${invite.project.deposit_percent}% deposit to start</td><td class="fee">${money(invite.project.total_fee)}</td></tr>`;
    if (invite.intake) { $('welcome-intake-note').textContent = 'We already have your answers; you can review them or skip ahead.'; $('welcome-skip').hidden = false; }
    $('welcome-go').onclick = () => { show('v-wizard', false); renderStep(); };
    $('welcome-skip').onclick = openAgreement;
    show('v-welcome', false);
  }
  load();
})();
