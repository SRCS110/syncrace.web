/* ============================================================
   SYNC RACE STUDIOS — shared chrome
   <site-nav>, <site-foot>, the dragon curve (logo mark, fold icons
   and the background line that draws with scroll), and cookie consent.

   Works from both the root (index.html) and /pages/, so there is
   only ever one copy of this file.
   ============================================================ */

const IN_PAGES = /\/pages\//.test(location.pathname);
const TO_PAGES = IN_PAGES ? './' : './pages/';
const TO_ROOT  = IN_PAGES ? '../' : './';
const HERE     = location.pathname.split('/').pop() || 'index.html';

// Six core items: three either side of the centred logo.
const LINKS_LEFT = [
  { file: 'services.html',        label: 'Services', also: ['advertising.html','print.html'] },
  { file: 'websites.html',        label: 'Websites' },
  { file: 'google-business.html', label: 'Google' },
];
const LINKS_RIGHT = [
  { file: 'apps.html',    label: 'Apps' },
  { file: 'about.html',   label: 'About' },
  { file: 'contact.html', label: 'Contact' },
];

const SERVICES = [
  { file: 'websites.html',        label: 'Website design',        n: 10 },
  { file: 'google-business.html', label: 'Google Business Profile', n: 6 },
  { file: 'advertising.html',     label: 'Google Ads',            n: 8 },
  { file: 'print.html',           label: 'Print & creative',      n: 5 },
  { file: 'apps.html',            label: 'Business apps',         n: 9 },
];

/* ---------- the dragon curve ----------
   n folds -> 2^n segments, every turn exactly 90°, never crossing itself.
   Rotated so the curve runs from top to bottom. */
const SRCurve = (() => {
  const turns = n => { let s = []; for (let i = 0; i < n; i++) s = s.concat([1], s.slice().reverse().map(t => -t)); return s; };
  const points = n => {
    const s = turns(n), D = [[1,0],[0,1],[-1,0],[0,-1]];
    let x = 0, y = 0, d = 0; const p = [[0,0]];
    [0, ...s].forEach(t => { d = (d + t + 4) % 4; x += D[d][0]; y += D[d][1]; p.push([x, y]); });
    const [ex, ey] = p[p.length - 1], a = Math.PI / 2 - Math.atan2(ey, ex), c = Math.cos(a), si = Math.sin(a);
    return p.map(([x, y]) => [Math.round(x * c - y * si), Math.round(x * si + y * c)]);
  };
  const fit = (p, padF = .08) => {
    const xs = p.map(q => q[0]), ys = p.map(q => q[1]), mx = Math.min(...xs), my = Math.min(...ys);
    const w = Math.max(...xs) - mx, h = Math.max(...ys) - my, pad = Math.max(w, h, 1) * padF + .5;
    const r = .32; let d = `M${p[0][0]} ${p[0][1]}`;
    for (let i = 1; i < p.length - 1; i++) {
      const [ax, ay] = p[i-1], [bx, by] = p[i], [cx, cy] = p[i+1];
      d += `L${bx-(bx-ax)*r} ${by-(by-ay)*r}Q${bx} ${by} ${bx+(cx-bx)*r} ${by+(cy-by)*r}`;
    }
    d += `L${p[p.length-1][0]} ${p[p.length-1][1]}`;
    return { vb: `${mx-pad} ${my-pad} ${w+pad*2} ${h+pad*2}`, w: w + pad * 2, h: h + pad * 2, d };
  };
  const draw = (el, n, sw = 1.6) => {
    const f = fit(points(n));
    el.setAttribute('viewBox', f.vb);
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<path d="${f.d}" fill="none" stroke="var(--lamp)" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`;
  };
  return { turns, points, fit, draw };
})();
window.SRCurve = SRCurve;

const MARK = '<svg class="mark" data-fold="10" data-sw="1.1" width="32" height="32"></svg>';
const BRAND = `<span><b>Sync Race</b><em>Business Services</em></span>`;

class SiteNav extends HTMLElement {
  connectedCallback() {
    const link = l => {
      const cur = l.file === HERE || (l.also || []).includes(HERE);
      return `<a href="${TO_PAGES}${l.file}"${cur ? ' aria-current="page"' : ''}>${l.label}</a>`;
    };
    const left = LINKS_LEFT.map(link).join(''), right = LINKS_RIGHT.map(link).join('');

    if (!document.querySelector('.skip') && document.getElementById('main')) {
      const skip = document.createElement('a');
      skip.className = 'skip'; skip.href = '#main'; skip.textContent = 'Skip to content';
      document.body.prepend(skip);
    }

    this.innerHTML = `
      <header class="nav-shade">
        <div class="nav-in">
          <nav class="nav-links nav-left" aria-label="Main">${left}</nav>
          <a class="brand brand-center" href="${TO_ROOT}index.html" aria-label="Sync Race Studios home">${MARK}${BRAND}</a>
          <nav class="nav-links nav-right" aria-label="More">${right}</nav>
          <button class="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="nav-sheet"><span></span><span></span><span></span></button>
        </div>
        <nav class="nav-sheet" id="nav-sheet" aria-label="Menu">${left}${right}</nav>
      </header>`;

    const burger = this.querySelector('.nav-toggle');
    burger.addEventListener('click', () => {
      const open = this.hasAttribute('data-open');
      open ? this.removeAttribute('data-open') : this.setAttribute('data-open', '');
      burger.setAttribute('aria-expanded', String(!open));
    });
    this.querySelectorAll('.nav-links a, .nav-sheet a').forEach(a => a.addEventListener('click', () => this.removeAttribute('data-open')));
    drawFolds(this);
  }
}
customElements.define('site-nav', SiteNav);

class SiteFoot extends HTMLElement {
  connectedCallback() {
    const li = (f, l) => `<li><a href="${TO_PAGES}${f}"${f === HERE ? ' aria-current="page"' : ''}>${l}</a></li>`;
    this.innerHTML = `
      <footer class="foot">
        <div class="shell foot-grid">
          <div class="foot-brand">
            <a class="brand" href="${TO_ROOT}index.html">${MARK}${BRAND}</a>
            <p>Websites, Google, print and small apps for local businesses. One partner, one connected line.</p>
          </div>
          <nav class="foot-col" aria-labelledby="foot-svc">
            <h2 class="foot-title" id="foot-svc">Services</h2>
            <ul>${SERVICES.map(s => li(s.file, s.label)).join('')}</ul>
          </nav>
          <nav class="foot-col" aria-labelledby="foot-studio">
            <h2 class="foot-title" id="foot-studio">Studio</h2>
            <ul>${li('about.html','About')}${li('work.html','Work')}${li('manifesto.html','How we work')}${li('arcade.html','Playground')}${li('contact.html','Get started')}<li><a href="mailto:hello@srcs.online">hello@srcs.online</a></li></ul>
          </nav>
          <nav class="foot-col" aria-labelledby="foot-legal">
            <h2 class="foot-title" id="foot-legal">Legal</h2>
            <ul>${li('privacy.html','Privacy')}${li('terms.html','Terms')}${li('accessibility.html','Accessibility')}<li><a href="#cookie-settings" data-cookie-settings>Cookie settings</a></li></ul>
          </nav>
        </div>
        <div class="shell foot-base">
          <span>&copy; <span data-year>${new Date().getFullYear()}</span> Sync Race Studios</span>
          <span>srcs.online</span>
        </div>
      </footer>`;
    drawFolds(this);
  }
}
customElements.define('site-foot', SiteFoot);

/* Any <svg data-fold="n"> on the page becomes an n-fold dragon curve. */
function drawFolds(root = document) {
  root.querySelectorAll('svg[data-fold]').forEach(s => {
    if (s.dataset.drawn) return;
    SRCurve.draw(s, +s.dataset.fold, +(s.dataset.sw || 1.6));
    s.dataset.drawn = '1';
  });
}
document.addEventListener('DOMContentLoaded', () => drawFolds());
drawFolds();

/* ---------- background curve: 1,024 steps that draw with scroll ----------
   Sits in its own depth layer (see #curve-depth in srcs.css): below the nav,
   pushed back in z, and drifting slower than the page. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const layer = document.createElement('div');
  layer.id = 'curve-depth'; layer.setAttribute('aria-hidden', 'true');
  const bg = document.createElementNS(NS, 'svg');
  bg.id = 'curve-bg'; bg.setAttribute('preserveAspectRatio', 'xMidYMin meet');
  bg.innerHTML = '<path class="ghost" fill="none" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/><path class="trail" fill="none" stroke-linejoin="round" stroke-linecap="round"/><circle class="pen" r="0"/>';
  layer.appendChild(bg);
  document.body.prepend(layer);
  const ghost = bg.querySelector('.ghost'), trail = bg.querySelector('.trail'), pen = bg.querySelector('.pen');
  const F = SRCurve.fit(SRCurve.points(10), .04);
  bg.setAttribute('viewBox', F.vb); ghost.setAttribute('d', F.d); trail.setAttribute('d', F.d);
  const L = trail.getTotalLength();
  trail.style.strokeDasharray = `${L} ${L}`;
  const START = .02, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shown = 0, target = START, ticking = false;
  const progress = () => { const max = document.documentElement.scrollHeight - innerHeight; return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 1; };
  const render = v => { trail.style.strokeDashoffset = L * (1 - v); const pt = trail.getPointAtLength(L * v); pen.setAttribute('cx', pt.x); pen.setAttribute('cy', pt.y); };
  const loop = () => {
    shown += (target - shown) * (reduce ? 1 : .12);
    if (Math.abs(target - shown) < .0005) shown = target;
    render(shown); ticking = shown !== target; if (ticking) requestAnimationFrame(loop);
  };
  const size = () => {
    const r = bg.getBoundingClientRect(), k = Math.min(r.width / F.w, r.height / F.h) || 1;
    trail.setAttribute('stroke-width', 2.2 / k); pen.setAttribute('r', 5 / k);
  };
  const update = () => {
    size();
    const p = progress();
    target = START + (1 - START) * p;
    // parallax: the far layer moves a little against the scroll
    if (!reduce) bg.style.setProperty('--drift', `${(-p * 6).toFixed(2)}vh`);
    if (!ticking) { ticking = true; requestAnimationFrame(loop); }
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  new ResizeObserver(update).observe(document.body);
  update();
})();

/* ---------- entrance animation for .rise ---------- */
(() => {
  const go = () => {
    const items = document.querySelectorAll('.rise:not(.in)');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach((e, i) => {
      if (!e.isIntersecting) return;
      setTimeout(() => e.target.classList.add('in'), i * 70);
      io.unobserve(e.target);
    }), { threshold: .1, rootMargin: '0px 0px -50px' });
    items.forEach(el => io.observe(el));
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
})();

/* ============================================================
   COOKIE CONSENT + GOOGLE TAG
   Google Analytics (G-7CEJ06WQR2) loads only after a visitor
   accepts Analytics. Declining, ignoring the banner, or sending a
   Global Privacy Control signal keeps it off.
   Bump CONSENT_VERSION when cookie categories or vendors change.
   ============================================================ */
(() => {
  const GA_ID = 'G-7CEJ06WQR2';
  const CONSENT_VERSION = 1;
  const KEY = 'srcs-consent';
  const gpc = navigator.globalPrivacyControl === true;
  const inPages = /\/pages\//.test(location.pathname);
  const privacyHref = (inPages ? './' : './pages/') + 'privacy.html';

  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };
  let state = read();
  if (state && state.v !== CONSENT_VERSION) state = null;
  if (!state && gpc) { state = { v: CONSENT_VERSION, ts: new Date().toISOString(), analytics: false, gpc: true }; write(state); }

  /* ---------- Google tag, gated ---------- */
  let gaLoaded = false;
  function loadGA() {
    if (gaLoaded || gpc || !state || !state.analytics) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('js', new Date());
    gtag('config', GA_ID);
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }
  function revokeGA() {
    if (gaLoaded && window.gtag) gtag('consent', 'update', { analytics_storage: 'denied' });
    const host = location.hostname.replace(/^www\./, '');
    document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => /^_ga/.test(n)).forEach(n => {
      [location.hostname, '.' + host, ''].forEach(d => {
        document.cookie = `${n}=; Max-Age=0; path=/${d ? '; domain=' + d : ''}`;
      });
    });
  }

  /* ---------- banner ---------- */
  const banner = document.createElement('div');
  banner.className = 'consent';
  banner.id = 'consent';
  banner.hidden = true;
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-modal', 'false');
  banner.setAttribute('aria-labelledby', 'consent-title');
  banner.setAttribute('aria-describedby', 'consent-desc');
  banner.tabIndex = -1;
  banner.innerHTML = `
    <h2 id="consent-title">Your privacy choices</h2>
    <p id="consent-desc">We'd like to use Google Analytics to see which pages are useful. It stays off unless you accept. We never use advertising cookies. <a href="${privacyHref}">Privacy policy</a></p>
    <form id="consent-prefs" hidden>
      <fieldset>
        <legend class="sr-only">Cookie categories</legend>
        <label class="consent-opt"><input type="checkbox" checked disabled> <span><b>Strictly necessary</b> Always on. Remembers this choice.</span></label>
        <label class="consent-opt"><input type="checkbox" name="analytics"> <span><b>Analytics</b> Google Analytics: counts visits and pages viewed.</span></label>
      </fieldset>
    </form>
    <div class="consent-actions">
      <button type="button" class="btn btn-quiet" data-consent="reject">Reject all</button>
      <button type="button" class="btn btn-quiet" data-consent="accept">Accept all</button>
      <button type="button" class="btn btn-link" data-consent="prefs" aria-expanded="false" aria-controls="consent-prefs">Preferences</button>
      <button type="button" class="btn btn-quiet" data-consent="save" hidden>Save choices</button>
    </div>`;
  const nav = document.querySelector('site-nav');
  if (nav) nav.after(banner); else document.body.prepend(banner);

  const prefs = banner.querySelector('#consent-prefs');
  const prefsBtn = banner.querySelector('[data-consent="prefs"]');
  const saveBtn = banner.querySelector('[data-consent="save"]');
  let returnFocus = null;

  function showPrefs(show) {
    prefs.hidden = !show; saveBtn.hidden = !show;
    prefsBtn.setAttribute('aria-expanded', String(show));
    if (show) prefs.analytics.checked = !!(state && state.analytics);
  }
  function open(fromSettings) {
    returnFocus = fromSettings ? document.activeElement : null;
    banner.hidden = false; showPrefs(!!fromSettings);
    if (fromSettings) banner.focus();
  }
  function close() {
    banner.hidden = true;
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    returnFocus = null;
  }
  function save(analytics) {
    state = { v: CONSENT_VERSION, ts: new Date().toISOString(), analytics: gpc ? false : analytics };
    write(state); close();
    state.analytics ? loadGA() : revokeGA();
  }

  banner.addEventListener('click', (e) => {
    const a = e.target.closest('[data-consent]')?.dataset.consent;
    if (a === 'accept') save(true);
    if (a === 'reject') save(false);
    if (a === 'prefs') showPrefs(prefs.hidden);
    if (a === 'save') save(prefs.analytics.checked);
  });
  banner.addEventListener('keydown', (e) => {
    // Escape hides the banner for now without accepting anything.
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') {
      const items = [...banner.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])')].filter(el => el.offsetParent !== null);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.querySelectorAll('[data-cookie-settings]').forEach(a =>
    a.addEventListener('click', (e) => { e.preventDefault(); open(true); }));
  if (location.hash === '#cookie-settings') open(true);

  if (!state) open(false);
  loadGA();
})();
