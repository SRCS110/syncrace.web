/* ============================================================
   SYNC RACE STUDIOS — <site-nav>

   Works from both the root (index.html) and /pages/, so there is
   only ever one copy of this file. Labels live in LINKS below;
   filenames are unchanged, so renaming a label breaks nothing.
   ============================================================ */

const LINKS = [
  { file: 'creativestudio.html', label: 'Websites' },
  { file: 'codestudio.html',     label: 'Software' },
  { file: 'arcade.html',         label: 'Playground' },
  { file: 'manifesto.html',      label: 'How we work' },
  // Contact is deliberately NOT here — the Get in touch button is its only
  // entry point, so the link doesn't appear twice in the nav.
];

class SiteNav extends HTMLElement {
  connectedCallback() {
    // Are we sitting inside /pages/, or at the site root?
    const inPages = /\/pages\//.test(location.pathname);
    const toPages = inPages ? './'          : './pages/';
    const toRoot  = inPages ? '../'         : './';
    const here    = location.pathname.split('/').pop() || 'index.html';

    const items = LINKS.map(l =>
      `<a href="${toPages}${l.file}"${l.file === here ? ' aria-current="page"' : ''}>${l.label}</a>`
    ).join('');

    const homeCurrent = (here === 'index.html' || here === '') ? ' aria-current="page"' : '';

    // Skip link goes first in the page so keyboard users can jump the nav.
    if (!document.querySelector('.skip') && document.getElementById('main')) {
      const skip = document.createElement('a');
      skip.className = 'skip'; skip.href = '#main'; skip.textContent = 'Skip to content';
      document.body.prepend(skip);
    }

    this.innerHTML = `
      <header class="nav-shade">
        <div class="nav-in">
          <a class="brand" href="${toRoot}index.html">
            <img src="${toRoot}assets/srcs-mark.png" alt="" width="36" height="36">
            <span><b>Sync Race</b><em>Code Studio · Creative Studio</em></span>
          </a>
          <button class="nav-toggle" aria-label="Menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
          <nav class="nav-links" aria-label="Main">
            <a href="${toRoot}index.html"${homeCurrent}>Home</a>
            ${items}
            <button class="theme-btn" type="button" aria-label="Switch between day and evening"></button>
            <a class="nav-cta" href="${toPages}contact.html">Get in touch</a>
          </nav>
        </div>
      </header>`;

    const burger = this.querySelector('.nav-toggle');
    burger.addEventListener('click', () => {
      const open = this.hasAttribute('data-open');
      open ? this.removeAttribute('data-open') : this.setAttribute('data-open', '');
      burger.setAttribute('aria-expanded', String(!open));
    });
    this.querySelectorAll('.nav-links a').forEach(a =>
      a.addEventListener('click', () => this.removeAttribute('data-open')));

    this.querySelector('.theme-btn').addEventListener('click', toggleSiteTheme);
    paintThemeButton();
  }
}
customElements.define('site-nav', SiteNav);

/* Day / evening. Both are warm — evening is the same room after dark.
   The initial class is set in each page's <head> to avoid a flash. */
function toggleSiteTheme() {
  const dark = document.documentElement.classList.toggle('dark');
  try {
    localStorage.setItem('sr-theme', dark ? 'dark' : 'light');
    localStorage.setItem('sr-theme-v', '2');
  } catch (e) { /* private browsing — the choice just won't persist */ }
  paintThemeButton();
}

function paintThemeButton() {
  const dark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.textContent = dark ? 'Day' : 'Evening';
    b.setAttribute('aria-pressed', String(dark));
  });
}

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
        <label class="consent-opt"><input type="checkbox" checked disabled> <span><b>Strictly necessary</b> Always on. Remembers your theme and this choice.</span></label>
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
