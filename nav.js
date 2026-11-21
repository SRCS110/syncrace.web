/* ============================================================
   SYNC RACE STUDIOS — shared chrome
   Nav, footer and fold icons are pre-rendered into each page by
   tools/build.mjs; this file adds the menu button, the background line
   that draws with scroll, the entrance animation and cookie consent.

   Works from both the root (index.html) and /pages/, so there is
   only ever one copy of this file.
   ============================================================ */

/* @shared-start ------------------------------------------------------
   Everything between the @shared markers is also run by the page build
   (tools/build.mjs), which writes the nav, footer, breadcrumbs and fold
   icons straight into each page's HTML. Crawlers get finished HTML; the
   code below only wires up the menu button in the browser. */

// Six core items: three either side of the centred logo.
const LINKS_LEFT = [
  { file: 'services.html',        label: 'Services', also: ['print.html','apps.html','branding.html','marketing.html','content.html'] },
  { file: 'websites.html',        label: 'Websites' },
  { file: 'google-business.html', label: 'Google' },
];
const LINKS_RIGHT = [
  { file: 'pricing.html', label: 'Pricing' },
  { file: 'about.html',   label: 'About' },
  { file: 'contact.html', label: 'Contact' },
];

const SERVICES = [
  { file: 'websites.html',        label: 'Website design',        n: 10 },
  { file: 'google-business.html', label: 'Google Profile & Ads',  n: 6 },
  { file: 'branding.html',        label: 'Logo & branding',       n: 4 },
  { file: 'marketing.html',       label: 'Marketing campaigns',   n: 3 },
  { file: 'print.html',           label: 'Print & creative',      n: 5 },
  { file: 'content.html',         label: 'Content engine',        n: 8 },
  { file: 'apps.html',            label: 'Business apps',         n: 9 },
];

/* ---------- the dragon curve ----------
   n folds -> 2^n segments, every turn exactly 90°, never crossing itself. */
const SRCurve = (() => {
  const turns = n => { let s = []; for (let i = 0; i < n; i++) s = s.concat([1], s.slice().reverse().map(t => -t)); return s; };
  // Walk the turns on a square grid: every step is one unit, every turn exactly 90°.
  // The finished curve is then turned by a whole quarter-turn (never an odd angle,
  // which would knock it off the grid) so it runs roughly top to bottom.
  const points = n => {
    const s = turns(n), D = [[1,0],[0,1],[-1,0],[0,-1]];
    let x = 1, y = 0, d = 0; const p = [[0,0], [1,0]];
    s.forEach(t => { d = (d + t + 4) % 4; x += D[d][0]; y += D[d][1]; p.push([x, y]); });
    const [ex, ey] = p[p.length - 1];
    const q = Math.round((Math.PI / 2 - Math.atan2(ey, ex)) / (Math.PI / 2));
    const rot = ([x, y]) => [-y, x];                       // exact 90° turn
    let out = p;
    for (let i = 0; i < ((q % 4) + 4) % 4; i++) out = out.map(rot);
    return out;
  };
  const fit = (p, padF = .08) => {
    const xs = p.map(q => q[0]), ys = p.map(q => q[1]), mx = Math.min(...xs), my = Math.min(...ys);
    const w = Math.max(...xs) - mx, h = Math.max(...ys) - my, pad = Math.max(w, h, 1) * padF + .5;
    const r = .32, k = v => +v.toFixed(2); let d = `M${p[0][0]} ${p[0][1]}`;
    for (let i = 1; i < p.length - 1; i++) {
      const [ax, ay] = p[i-1], [bx, by] = p[i], [cx, cy] = p[i+1];
      d += `L${k(bx-(bx-ax)*r)} ${k(by-(by-ay)*r)}Q${bx} ${by} ${k(bx+(cx-bx)*r)} ${k(by+(cy-by)*r)}`;
    }
    d += `L${p[p.length-1][0]} ${p[p.length-1][1]}`;
    return { vb: `${k(mx-pad)} ${k(my-pad)} ${k(w+pad*2)} ${k(h+pad*2)}`, w: w + pad * 2, h: h + pad * 2, d };
  };
  // One <symbol> per fold count; every icon on the page is a <use> of it.
  const symbol = n => { const f = fit(points(n)); return `<symbol id="sr-fold-${n}" viewBox="${f.vb}"><path d="${f.d}" vector-effect="non-scaling-stroke"/></symbol>`; };
  // An icon is a <use> of its symbol; stroke width and colour are inherited.
  const icon = (n, { sw = 1.6, cls = '', attrs = '', style = '' } = {}) =>
    `<svg data-fold="${n}" data-sw="${sw}" data-drawn="1" class="fold-icon${cls ? ' ' + cls : ''}"${attrs} style="stroke-width:${sw}${style ? ';' + style : ''}" aria-hidden="true" focusable="false"><use href="#sr-fold-${n}"/></svg>`;
  return { turns, points, fit, symbol, icon };
})();

const BRAND = `<span><b>Sync Race</b><em>Business Services</em></span>`;
const MARK = () => SRCurve.icon(10, { sw: 1.1, cls: 'mark', attrs: ' width="32" height="32"' });

const navHTML = (here, toPages, toRoot) => {
  const link = l => {
    const cur = l.file === here || (l.also || []).includes(here);
    return `<a href="${toPages}${l.file}"${cur ? ' aria-current="page"' : ''}>${l.label}</a>`;
  };
  const left = LINKS_LEFT.map(link).join(''), right = LINKS_RIGHT.map(link).join('');
  return `<header class="nav-shade"><div class="nav-in"><nav class="nav-links nav-left" aria-label="Main">${left}</nav><a class="brand brand-center" href="${toRoot}index.html" aria-label="Sync Race Studios home">${MARK()}${BRAND}</a><nav class="nav-links nav-right" aria-label="More">${right}</nav><button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="nav-sheet"><span></span><span></span><span></span></button></div><nav class="nav-sheet" id="nav-sheet" aria-label="Menu">${left}${right}</nav></header>`;
};

const footHTML = (here, toPages, toRoot, year) => {
  const li = (f, l) => `<li><a href="${toPages}${f}"${f === here ? ' aria-current="page"' : ''}>${l}</a></li>`;
  return `<footer class="foot"><div class="shell foot-grid"><div class="foot-brand"><a class="brand" href="${toRoot}index.html">${MARK()}${BRAND}</a><p>Websites, branding, Google, print and small apps for local businesses. One partner, one connected line.</p></div><nav class="foot-col" aria-labelledby="foot-svc"><h2 class="foot-title" id="foot-svc">Services</h2><ul>${SERVICES.map(s => li(s.file, s.label)).join('')}</ul></nav><nav class="foot-col" aria-labelledby="foot-studio"><h2 class="foot-title" id="foot-studio">Studio</h2><ul>${li('about.html','About')}${li('resources.html','Resources')}${li('work.html','Work')}${li('pricing.html','Pricing')}${li('arcade.html','Playground')}${li('contact.html','Get started')}</ul></nav><nav class="foot-col" aria-labelledby="foot-legal"><h2 class="foot-title" id="foot-legal">Legal</h2><ul>${li('privacy.html','Privacy')}${li('terms.html','Terms')}${li('accessibility.html','Accessibility')}${li('sitemap.html','Sitemap')}<li><a href="#cookie-settings" data-cookie-settings>Cookie settings</a></li></ul></nav></div><div class="shell foot-base"><span>&copy; <span data-year>${year}</span> Sync Race Studios</span><span class="foot-links"><a href="mailto:hello@srcs.online">hello@srcs.online</a><a href="https://www.instagram.com/syncracestudios/" target="_blank" rel="me noopener">Instagram<span class="sr-only"> (opens in a new tab)</span></a><span>srcs.online</span></span></div></footer>`;
};
/* @shared-end ------------------------------------------------------ */

const IN_PAGES = /\/pages\//.test(location.pathname);
const TO_PAGES = IN_PAGES ? './' : './pages/';
const TO_ROOT  = IN_PAGES ? '../' : './';
const HERE     = location.pathname.split('/').pop() || 'index.html';
window.SRCurve = SRCurve;

/* The build writes the nav and footer into the HTML. These elements only
   fill themselves in if that didn't happen (e.g. a page opened from disk
   before a build), and wire up the menu button. */
class SiteNav extends HTMLElement {
  connectedCallback() {
    if (!this.querySelector('.nav-in')) { this.innerHTML = navHTML(HERE, TO_PAGES, TO_ROOT); ensureSymbols(); }
    const burger = this.querySelector('.nav-toggle');
    burger.addEventListener('click', () => {
      const open = this.hasAttribute('data-open');
      open ? this.removeAttribute('data-open') : this.setAttribute('data-open', '');
      burger.setAttribute('aria-expanded', String(!open));
    });
    this.querySelectorAll('.nav-links a, .nav-sheet a').forEach(a => a.addEventListener('click', () => this.removeAttribute('data-open')));
  }
}
customElements.define('site-nav', SiteNav);

class SiteFoot extends HTMLElement {
  connectedCallback() {
    if (!this.querySelector('.foot')) { this.innerHTML = footHTML(HERE, TO_PAGES, TO_ROOT, new Date().getFullYear()); ensureSymbols(); }
  }
}
customElements.define('site-foot', SiteFoot);

/* Fallback for icons the build didn't pre-render: add any missing symbols,
   and turn bare <svg data-fold="n"> elements into <use> icons. */
function ensureSymbols() {
  let defs = document.getElementById('sr-folds');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defs.id = 'sr-folds'; defs.setAttribute('aria-hidden', 'true'); defs.setAttribute('class', 'sr-defs');
    document.body.prepend(defs);
  }
  document.querySelectorAll('svg[data-fold]').forEach(s => {
    const n = +s.dataset.fold;
    if (!document.getElementById('sr-fold-' + n)) defs.insertAdjacentHTML('beforeend', SRCurve.symbol(n));
    if (!s.dataset.drawn) {
      s.setAttribute('aria-hidden', 'true'); s.classList.add('fold-icon');
      s.style.strokeWidth = s.dataset.sw || 1.6; s.removeAttribute('viewBox');
      s.innerHTML = `<use href="#sr-fold-${n}"/>`; s.dataset.drawn = '1';
    }
  });
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', ensureSymbols) : ensureSymbols();

/* ---------- background curve: 1,024 steps that draw with scroll ----------
   Fills the screen below the nav. On landscape screens the curve is turned
   on its side so it fits the screen's shape and the drawing stays in view.
   Separation from the foreground comes from srcs.css: a soft shadow under
   the line and a paper-coloured halo around the page text. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const layer = document.createElement('div');
  layer.id = 'curve-depth'; layer.setAttribute('aria-hidden', 'true');
  const bg = document.createElementNS(NS, 'svg');
  bg.id = 'curve-bg'; bg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  bg.innerHTML = '<path class="ghost" fill="none" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/><path class="trail" fill="none" stroke-linejoin="round" stroke-linecap="round"/><circle class="pen" r="0"/>';
  layer.appendChild(bg);
  document.body.prepend(layer);
  const ghost = bg.querySelector('.ghost'), trail = bg.querySelector('.trail'), pen = bg.querySelector('.pen');
  const START = .02, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let F, L, wide = null, shown = 0, target = START, ticking = false;

  const build = () => {
    const isWide = innerWidth > innerHeight * 1.05;
    if (isWide === wide) return;
    wide = isWide;
    let p = SRCurve.points(10);
    if (wide) p = p.map(([x, y]) => [y, -x]);          // lay it on its side
    F = SRCurve.fit(p, .03);
    bg.setAttribute('viewBox', F.vb); ghost.setAttribute('d', F.d); trail.setAttribute('d', F.d);
    L = trail.getTotalLength();
    trail.style.strokeDasharray = `${L} ${L}`;
  };
  const progress = () => { const max = document.documentElement.scrollHeight - innerHeight; return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 1; };
  const render = v => { trail.style.strokeDashoffset = L * (1 - v); const pt = trail.getPointAtLength(L * v); pen.setAttribute('cx', pt.x); pen.setAttribute('cy', pt.y); };
  const loop = () => {
    shown += (target - shown) * (reduce ? 1 : .12);
    if (Math.abs(target - shown) < .0005) shown = target;
    render(shown); ticking = shown !== target; if (ticking) requestAnimationFrame(loop);
  };
  const size = () => {
    const r = bg.getBoundingClientRect(), k = Math.max(r.width / F.w, r.height / F.h) || 1;
    trail.setAttribute('stroke-width', 1.7 / k); pen.setAttribute('r', 4.5 / k);
  };
  const update = () => {
    build(); size();
    const p = progress();
    target = START + (1 - START) * p;
    if (!reduce) bg.style.setProperty('--drift', `${(-p * 3).toFixed(2)}vh`);
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
