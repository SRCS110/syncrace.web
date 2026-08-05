class SiteNav extends HTMLElement {
  connectedCallback() {
    // Detect if page is located in /pages/ to route relative paths correctly
    const isSubpage = window.location.pathname.includes('/pages/');
    const indexPath = isSubpage ? '../index.html' : './index.html';
    const featuresPath = isSubpage ? 'features.html' : 'pages/features.html';
    const pricingPath = isSubpage ? 'pricing.html' : 'pages/pricing.html';
    const videoPath = isSubpage ? '../index.html#video-demo' : '#video-demo';
    const demoUrl = 'https://freelancer.srcs.online/index.html?demo=true';

    this.innerHTML = `
      <header class="sticky top-0 z-50 backdrop-blur-md bg-[#FAFAF9]/90 border-b border-[#1C1C1E]/5 px-6 py-4">
        <div class="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

          <!-- LOGO (Steps out of /pages/ up to root index.html) -->
          <a href="${indexPath}" class="font-mono text-xl font-bold tracking-wider uppercase text-[#1C1C1E] flex items-center gap-2 group">
            <span class="w-2.5 h-2.5 rounded-full bg-[#059669] group-hover:scale-125 transition-transform"></span>
            ROGUE <span class="text-[#059669] text-xs font-normal">[OS]</span>
          </a>

          <!-- NAVIGATION LINKS -->
          <nav class="flex flex-wrap items-center gap-2 font-mono text-sm">
            <a href="${videoPath}" class="px-3 py-1.5 rounded text-[#6B7280] hover:bg-[#F5F4F2] hover:text-[#1C1C1E] transition-all">/tour</a>
            <a href="${featuresPath}" class="px-3 py-1.5 rounded text-[#6B7280] hover:bg-[#F5F4F2] hover:text-[#1C1C1E] transition-all">/features</a>
            <a href="${pricingPath}" class="px-3 py-1.5 rounded text-[#6B7280] hover:bg-[#F5F4F2] hover:text-[#1C1C1E] transition-all">/pricing</a>
            <a href="${demoUrl}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded bg-[#059669]/10 text-[#059669] hover:bg-[#059669] hover:text-white font-bold transition-all">!demo ↗</a>
            
            <button
              id="theme-toggle"
              type="button"
              onclick="toggleSiteTheme()"
              aria-label="Toggle light and dark theme"
              aria-pressed="false"
              class="px-3 py-1.5 rounded border border-[#1C1C1E]/10 text-[#6B7280] hover:text-[#1C1C1E] hover:border-[#1C1C1E] transition-all"
            >// <span id="theme-toggle-label">light</span></button>
          </nav>

        </div>
      </header>
    `;
    updateThemeToggleUI();
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback() {
    const isSubpage = window.location.pathname.includes('/pages/');
    const privacyPath = isSubpage ? 'privacy.html' : 'pages/privacy.html';

    this.innerHTML = `
      <footer class="border-t border-[#1C1C1E]/5 py-12 bg-[#F5F4F2]/50 text-xs text-[#6B7280]">
        <div class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 Sync Race Studios LLC dba Rogue OS. All rights reserved.</p>
          <div class="flex items-center space-x-6 font-mono">
            <a href="${privacyPath}" class="hover:text-[#1C1C1E] transition-colors">/privacy</a>
            <span>•</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </footer>
    `;
  }
}

customElements.define('site-nav', SiteNav);
customElements.define('site-footer', SiteFooter);

// THEME TOGGLE LOGIC
function toggleSiteTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('sr-theme', isDark ? 'dark' : 'light');
  updateThemeToggleUI();
}

function updateThemeToggleUI() {
  const isDark = document.documentElement.classList.contains('dark');
  const label = document.getElementById('theme-toggle-label');
  const button = document.getElementById('theme-toggle');
  if (label) label.textContent = isDark ? 'dark' : 'light';
  if (button) button.setAttribute('aria-pressed', String(isDark));
}
