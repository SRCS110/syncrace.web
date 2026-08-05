class SiteNav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="sticky top-0 z-50 bg-brand-black/90 backdrop-blur-md border-b border-brand-border px-6 py-4">
        <div class="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

          <!-- LOGO (Steps out of /pages/ up to root index.html) -->
          <a href="../index.html" class="font-mono text-2xl font-black text-white flex items-center gap-2">
            SYNC RACE <span class="text-brand-accent text-sm font-normal">[srcs.online]</span>
          </a>

          <!-- NAVIGATION LINKS (Relative paths inside /pages/) -->
          <nav class="flex flex-wrap items-center gap-2 font-mono text-sm">
            <a href="home.html" class="px-3 py-1.5 rounded hover:bg-brand-border hover:text-brand-accent transition-all">/home</a>
            <a href="codestudio.html" class="px-3 py-1.5 rounded hover:bg-brand-border hover:text-brand-accent transition-all">/code-studio</a>
            <a href="creativestudio.html" class="px-3 py-1.5 rounded hover:bg-brand-border hover:text-brand-accent transition-all">/creative-studio</a>
            <a href="arcade.html" class="px-3 py-1.5 rounded hover:bg-brand-border hover:text-brand-accent transition-all">/arcade</a>
            <a href="manifesto.html" class="px-3 py-1.5 rounded bg-brand-warning/10 text-brand-warning hover:bg-brand-warning hover:text-black font-bold transition-all">!manifesto</a>
            <button
              id="theme-toggle"
              type="button"
              onclick="toggleSiteTheme()"
              aria-label="Toggle light and dark theme"
              aria-pressed="false"
              class="px-3 py-1.5 rounded border border-brand-border text-brand-muted hover:text-brand-accent hover:border-brand-accent transition-all"
            >// <span id="theme-toggle-label">dark</span></button>
          </nav>

        </div>
      </header>
    `;
    updateThemeToggleUI();
  }
}

customElements.define('site-nav', SiteNav);

// THEME (light/dark) — persisted in localStorage, applied via a `light` class on <html>.
// The initial class is set synchronously in each page's <head> to avoid a flash; this
// just handles the user-triggered toggle and keeps the button label/state in sync.
function toggleSiteTheme() {
  const isLight = document.documentElement.classList.toggle('light');
  localStorage.setItem('sr-theme', isLight ? 'light' : 'dark');
  updateThemeToggleUI();
}

function updateThemeToggleUI() {
  const isLight = document.documentElement.classList.contains('light');
  const label = document.getElementById('theme-toggle-label');
  const button = document.getElementById('theme-toggle');
  if (label) label.textContent = isLight ? 'light' : 'dark';
  if (button) button.setAttribute('aria-pressed', String(isLight));
}" 
