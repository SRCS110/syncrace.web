class SiteNav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="sticky top-0 z-50 bg-brand-black/90 backdrop-blur-md border-b border-brand-border px-6 py-4">
        <div class="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          <!-- LOGO -->
          <a href="../index.html" class="font-mono text-2xl font-black text-white flex items-center gap-2">
            SYNC RACE <span class="text-brand-accent text-sm font-normal">[srcs.online]</span>
          </a>

          <!-- NAVIGATION LINKS -->
          <nav class="flex flex-wrap items-center gap-2 font-mono text-sm">
            <a href="/pages/home.html" class="px-3 py-1.5 rounded hover:bg-brand-border hover:text-brand-accent transition-all">/home</a>
            <a href="/pages/codestudio.html" class="px-3 py-1.5 rounded hover:bg-brand-border hover:text-brand-accent transition-all">/code-studio</a>
            <a href="/pages/creativestudio.html" class="px-3 py-1.5 rounded hover:bg-brand-border hover:text-brand-accent transition-all">/creative-studio</a>
            <a href="/pages/arcade.html" class="px-3 py-1.5 rounded hover:bg-brand-border hover:text-brand-accent transition-all">/arcade</a>
            <a href="/pages/manifesto.html" class="px-3 py-1.5 rounded bg-brand-warning/10 text-brand-warning hover:bg-brand-warning hover:text-black font-bold transition-all">!manifesto</a>
          </nav>

        </div>
      </header>
    `;
  }
}

// Registers the custom <site-nav></site-nav> tag
customElements.define('site-nav', SiteNav);
