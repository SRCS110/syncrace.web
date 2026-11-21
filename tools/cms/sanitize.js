// Vendored from SRCS110/srcs-cms lib/ — keep in sync. Used by tools/build.mjs to re-apply CMS edits.
// Allowlist sanitizer for content coming from the inline editor.
// Everything not explicitly allowed is unwrapped (kept as text) or dropped.
import { parseFragment } from 'parse5';

// Thrown for content the editor sent that cannot be applied; safe to show the user.
export class ContentError extends Error {
  constructor(message) { super(message); this.name = 'ContentError'; }
}

const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'svg', 'math', 'link', 'meta', 'form', 'input', 'button', 'select', 'textarea', 'video', 'audio', 'canvas', 'img', 'picture', 'source', 'head', 'title']);
const INLINE = new Set(['strong', 'b', 'em', 'i', 'u', 'a', 'br']);
const BLOCK = new Set(['p', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote']);
const BLOCKISH = new Set(['div', 'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'section', 'article', 'ul', 'ol', 'tr', 'table']);
const VOID = new Set(['br']);

export const MAX_REGION_CHARS = 20000;

export function escapeText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Accepts http(s), mailto, tel, and relative URLs. Returns null if unsafe.
export function safeHref(raw) {
  if (raw == null) return null;
  const href = String(raw).trim();
  if (!href) return null;
  // Strip control characters and whitespace that browsers ignore inside schemes.
  const probe = href.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
  const m = probe.match(/^([a-z][a-z0-9+.-]*):/);
  if (m && !['http', 'https', 'mailto', 'tel'].includes(m[1])) return null;
  if (probe.startsWith('//')) return 'https:' + href.replace(/^\s*/, '');
  return href;
}

// Images may only point at https URLs or site-relative paths.
export function safeSrc(raw) {
  if (raw == null) return null;
  const src = String(raw).trim();
  const probe = src.toLowerCase();
  if (probe.startsWith('https://')) return src;
  if (probe.startsWith('/') && !probe.startsWith('//')) return src;
  if (/^[a-z0-9_.\-][a-z0-9_.\-/]*$/i.test(src) && !src.includes('..')) return src; // relative file
  return null;
}

export function sanitizeText(value) {
  const s = String(value ?? '').replace(/\r\n?/g, '\n');
  if (s.length > MAX_REGION_CHARS) throw new ContentError('Text is too long');
  return escapeText(s);
}

// inlineOnly: the region element can only hold phrasing content (p, h1, span…)
export function sanitizeRich(html, { inlineOnly = false } = {}) {
  const src = String(html ?? '');
  if (src.length > MAX_REGION_CHARS * 2) throw new ContentError('Content is too long');
  const frag = parseFragment(src);
  let out = '';

  const walk = (nodes, ctx) => {
    for (const node of nodes) {
      if (node.nodeName === '#text') { out += escapeText(node.value); continue; }
      if (node.nodeName === '#comment' || !node.tagName) continue;
      const tag = node.tagName.toLowerCase();
      if (DROP.has(tag)) continue;

      if (inlineOnly) {
        if (INLINE.has(tag)) { emit(tag, node, ctx); continue; }
        if (BLOCKISH.has(tag)) {
          if (out && !/<br>$/.test(out)) out += '<br>';
          walk(node.childNodes, ctx);
          continue;
        }
        walk(node.childNodes, ctx);
        continue;
      }

      if (INLINE.has(tag) || BLOCK.has(tag)) { emit(tag, node, ctx); continue; }
      if (tag === 'div' || tag === 'section' || tag === 'article') {
        // Editors produce <div> on Enter; treat as a paragraph.
        if (ctx.inBlock) { walk(node.childNodes, ctx); if (!/<br>$/.test(out)) out += '<br>'; }
        else emit('p', node, ctx);
        continue;
      }
      if (/^h[156]$/.test(tag)) { emit(tag === 'h1' ? 'h2' : 'h4', node, ctx); continue; }
      walk(node.childNodes, ctx);
    }
  };

  const emit = (tag, node, ctx) => {
    if (tag === 'a') {
      const attrs = Object.fromEntries(node.attrs.map((a) => [a.name, a.value]));
      const href = safeHref(attrs.href);
      if (!href) { walk(node.childNodes, ctx); return; }
      const blank = attrs.target === '_blank';
      out += `<a href="${escapeAttr(href)}"${blank ? ' target="_blank" rel="noopener noreferrer"' : ''}>`;
      walk(node.childNodes, { ...ctx, inLink: true });
      out += '</a>';
      return;
    }
    if (VOID.has(tag)) { out += `<${tag}>`; return; }
    const block = BLOCK.has(tag);
    out += `<${tag}>`;
    walk(node.childNodes, block ? { ...ctx, inBlock: true } : ctx);
    out += `</${tag}>`;
  };

  walk(frag.childNodes, { inBlock: false });
  // Tidy: collapse empty paragraphs and trailing breaks.
  out = out.replace(/<p>(\s|<br>)*<\/p>/g, '').replace(/(<br>)+$/g, '');
  return out;
}

const INLINE_ONLY_HOSTS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'button', 'label', 'strong', 'em', 'b', 'i', 'small', 'figcaption', 'td', 'th', 'dt', 'dd', 'cite', 'q', 'summary', 'legend', 'caption']);

export function hostIsInlineOnly(tagName) {
  return INLINE_ONLY_HOSTS.has(String(tagName).toLowerCase());
}
