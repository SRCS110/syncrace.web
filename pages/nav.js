/* ============================================================
   SYNC RACE STUDIOS — <site-nav>

   Works from both the root (index.html) and /pages/, so there is
   only ever one copy of this file. Labels live in LINKS below;
   filenames are unchanged, so renaming a label breaks nothing.
   ============================================================ */

const LINKS = [
  { file: 'codestudio.html',     label: 'Software' },
  { file: 'creativestudio.html', label: 'Websites' },
  { file: 'arcade.html',         label: 'Playground' },
  { file: 'manifesto.html',      label: 'How we work' },
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

    this.innerHTML = `
      <div class="nav-shade">
        <div class="nav-in">
          <a class="brand" href="${toRoot}index.html">
            <img src="${toRoot}assets/srcslogo" alt="" width="32" height="32">
            <span><b>Sync Race Studios</b><em>srcs.online</em></span>
          </a>
          <button class="nav-toggle" aria-label="Menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
          <nav class="nav-links">
            <a href="${toRoot}index.html"${homeCurrent}>Home</a>
            ${items}
            <button class="theme-btn" type="button" aria-label="Switch between day and evening"></button>
            <a class="nav-cta" href="mailto:hello@srcs.online">Get in touch</a>
          </nav>
        </div>
      </div>`;

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
  localStorage.setItem('sr-theme', dark ? 'dark' : 'light');
  paintThemeButton();
}

function paintThemeButton() {
  const dark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.textContent = dark ? 'Day' : 'Evening';
    b.setAttribute('aria-pressed', String(dark));
  });
}
