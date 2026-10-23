# Accessibility audit

- Date: 2026-09-27
- Target: WCAG 2.2 Level AA
- Tools: axe-core 4.13.0 via @axe-core/playwright, Chromium (Playwright build 1194)
- Pages: index.html, pages/codestudio.html, pages/creativestudio.html, pages/arcade.html, pages/manifesto.html, pages/contact.html, pages/privacy.html, pages/terms.html, pages/accessibility.html
- Conditions: day and evening themes, 1440px and 320px wide

## Findings

| Severity | Rule | WCAG | Where | Status |
|---|---|---|---|---|
| Serious | color-contrast | 1.4.3 | Software page: grey text in `.well` feature lists on the `--sunk` panel | Open (redesign declined for now) |
| Serious | color-contrast | 1.4.3 | Websites page: `.frame-url` and `.slot` placeholder labels | Open (redesign declined for now) |
| Moderate | heading-order | 1.3.1 | Home, Websites, How we work, Contact: h1 followed by h3 | Open |
| Moderate | region | 1.3.1 | Header brand link sits outside a landmark (`<site-nav>` has no `<header>`) | Open |
| Moderate | (manual) bypass blocks | 2.4.1 | No skip link on any page | Open |
| Known | (manual) | 2.1.1, 1.1.1 | Playground canvas: Sparks, Draw, Jellyfish are pointer-only; canvas not readable by screen readers | Open |

New in this change (footer, legal pages, cookie banner): no axe violations.
Cookie banner checked by hand: keyboard reachable, focus kept inside when opened from Cookie settings, Escape closes without accepting, Reject has the same weight as Accept.

## Not yet done
- Screen reader pass with VoiceOver and NVDA.

The open items above are listed as known limitations in pages/accessibility.html. Owner and target date: [CLIENT TO SUPPLY].
