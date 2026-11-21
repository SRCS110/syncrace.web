// Vendored from SRCS110/srcs-cms lib/ — keep in sync. Used by tools/build.mjs to re-apply CMS edits.
// Applies editor changes to an HTML file by splicing the original source.
// Only the inner content / attributes of matched regions change; every other
// byte of the file is left exactly as it was, so diffs stay minimal.
import { parse, parseFragment } from 'parse5';
import { ContentError, sanitizeText, sanitizeRich, escapeAttr, escapeText, safeHref, safeSrc, hostIsInlineOnly } from './sanitize.js';

const TYPES = new Set(['text', 'rich', 'link', 'image', 'list']);

const attrOf = (node, name) => node.attrs?.find((a) => a.name === name)?.value;

function walk(node, fn) {
  if (!node) return;
  if (fn(node) === false) return;
  const kids = node.tagName === 'template' ? node.content?.childNodes : node.childNodes;
  if (kids) for (const k of kids) walk(k, fn);
}

// Lists every editable region in a document (used by the session endpoint and tests).
export function listRegions(html) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const regions = [];
  walk(doc, (node) => {
    if (!node.tagName) return;
    const key = attrOf(node, 'data-cms');
    const g = attrOf(node, 'data-cms-global');
    if (key || g) {
      regions.push({ key: key || g, global: !key, type: regionType(node), tag: node.tagName });
      if (regionType(node) === 'list') return false; // fields inside lists belong to the list
    }
  });
  return regions;
}

function regionType(node) {
  const t = attrOf(node, 'data-cms-type');
  if (t && TYPES.has(t)) return t;
  if (node.tagName === 'img') return 'image';
  return 'text';
}

function innerRange(node) {
  const loc = node.sourceCodeLocation;
  if (!loc?.startTag || !loc?.endTag) return null;
  return [loc.startTag.endOffset, loc.endTag.startOffset];
}

// Builds splice operations that set attributes on a start tag.
function attrOps(src, node, attrs, base = 0) {
  const loc = node.sourceCodeLocation;
  const ops = [];
  let inserts = '';
  for (const [name, value] of Object.entries(attrs)) {
    const text = value == null ? '' : ` ${name}="${escapeAttr(value)}"`;
    const at = loc.attrs?.[name];
    if (at) {
      // Replace the existing attribute, including the space before it if we are removing it.
      let start = at.startOffset;
      if (value == null) { while (start > 0 && /\s/.test(src[start - 1 - base] ?? '')) start--; }
      ops.push({ start, end: at.endOffset, text: value == null ? '' : text.slice(1) });
    } else if (value != null) {
      inserts += text;
    }
  }
  if (inserts) {
    const tagEnd = loc.startTag.endOffset;
    const selfClose = src[tagEnd - 2 - base] === '/';
    let pos = tagEnd - (selfClose ? 2 : 1);
    // Insert right after the last attribute, keeping any space before "/>" or ">".
    while (pos > loc.startTag.startOffset && /\s/.test(src[pos - 1 - base])) pos--;
    ops.push({ start: pos, end: pos, text: inserts });
  }
  return ops;
}

// Returns splice ops for one region node given a change value.
function regionOps(src, node, type, value, base = 0) {
  const tag = node.tagName;
  switch (type) {
    case 'text': {
      const r = innerRange(node);
      if (!r) throw new ContentError(`Region <${tag}> has no closing tag`);
      return [{ start: r[0], end: r[1], text: sanitizeText(value) }];
    }
    case 'rich': {
      const r = innerRange(node);
      if (!r) throw new ContentError(`Region <${tag}> has no closing tag`);
      return [{ start: r[0], end: r[1], text: sanitizeRich(value, { inlineOnly: hostIsInlineOnly(tag) }) }];
    }
    case 'link': {
      const v = value && typeof value === 'object' ? value : { text: value };
      const ops = [];
      if (v.href !== undefined) {
        const href = safeHref(v.href);
        if (!href) throw new ContentError('Link address is not allowed');
        if (tag !== 'a') throw new ContentError('Link regions must be <a> elements');
        ops.push(...attrOps(src, node, { href }, base));
      }
      if (v.text !== undefined) {
        const r = innerRange(node);
        if (!r) throw new ContentError(`Region <${tag}> has no closing tag`);
        ops.push({ start: r[0], end: r[1], text: sanitizeText(v.text) });
      }
      return ops;
    }
    case 'image': {
      if (tag !== 'img') throw new ContentError('Image regions must be <img> elements');
      const v = value || {};
      const set = {};
      if (v.src !== undefined) {
        const s = safeSrc(v.src);
        if (!s) throw new ContentError('Image address is not allowed');
        set.src = s;
        // A new file invalidates responsive sources.
        if (node.sourceCodeLocation.attrs?.srcset) set.srcset = null;
      }
      if (v.alt !== undefined) set.alt = String(v.alt).slice(0, 300);
      for (const d of ['width', 'height']) {
        if (v[d] !== undefined) {
          const n = parseInt(v[d], 10);
          if (!(n > 0 && n < 20000)) throw new ContentError(`Invalid image ${d}`);
          set[d] = String(n);
        }
      }
      return attrOps(src, node, set, base);
    }
    default:
      throw new ContentError(`Unsupported region type "${type}"`);
  }
}

function splice(src, ops, base = 0) {
  const sorted = [...ops].sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) throw new ContentError('Editable regions overlap');
  }
  let out = '';
  let pos = 0;
  for (const op of sorted) {
    out += src.slice(pos, op.start - base) + op.text;
    pos = op.end - base;
  }
  return out + src.slice(pos);
}

// Rebuilds a list region from the original children.
// value: [{ src: <index of original child>, fields: { name: { type?, value } } }]
function listOps(src, node, value) {
  const r = innerRange(node);
  if (!r) throw new ContentError('List region has no closing tag');
  if (!Array.isArray(value)) throw new ContentError('List value must be an array');
  if (value.length > 200) throw new ContentError('Too many list items');
  const kids = node.childNodes.filter((n) => n.tagName && n.sourceCodeLocation);
  if (!kids.length) throw new ContentError('List region needs at least one item to copy');
  const ranges = kids.map((k) => [k.sourceCodeLocation.startOffset, k.sourceCodeLocation.endOffset]);
  const lead = src.slice(r[0], ranges[0][0]);
  const trail = src.slice(ranges[ranges.length - 1][1], r[1]);
  const sep = ranges.length > 1 ? src.slice(ranges[0][1], ranges[1][0]) : (lead.match(/\n[ \t]*$/)?.[0] || '');
  const items = value.map((item) => {
    const i = Number(item?.src);
    if (!Number.isInteger(i) || i < 0 || i >= kids.length) throw new ContentError('List item refers to an unknown template');
    const [s, e] = ranges[i];
    const outer = src.slice(s, e);
    const fields = item.fields || {};
    if (!Object.keys(fields).length) return outer;
    // Re-parse the item in the list's context so table rows etc. survive.
    const frag = parseFragment(node, outer, { sourceCodeLocationInfo: true });
    const ops = [];
    const seen = new Set();
    walk(frag, (n) => {
      if (!n.tagName) return;
      const f = attrOf(n, 'data-cms-field');
      if (f && Object.prototype.hasOwnProperty.call(fields, f)) {
        const fv = fields[f];
        const type = (fv && fv.type) || regionType(n);
        if (type === 'list') throw new ContentError('Nested lists are not supported');
        ops.push(...regionOps(outer, n, type, fv && 'value' in fv ? fv.value : fv));
        seen.add(f);
      }
    });
    for (const f of Object.keys(fields)) if (!seen.has(f)) throw new ContentError(`Unknown list field "${f}"`);
    return splice(outer, ops);
  });
  return [{ start: r[0], end: r[1], text: lead + items.join(sep) + trail }];
}

/**
 * Apply changes to an HTML document.
 * changes: [{ key, global?: boolean, type?, value }]
 * Returns { html, applied: [keys], missing: [keys] }
 */
export function applyChanges(html, changes, { onlyGlobals = false } = {}) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const byKey = new Map();
  const byGlobal = new Map();
  walk(doc, (node) => {
    if (!node.tagName) return;
    const key = attrOf(node, 'data-cms');
    const g = attrOf(node, 'data-cms-global');
    if (key) {
      if (byKey.has(key)) throw new ContentError(`Duplicate region key "${key}"`);
      byKey.set(key, node);
    }
    if (g) {
      if (!byGlobal.has(g)) byGlobal.set(g, []);
      byGlobal.get(g).push(node);
    }
    if ((key || g) && regionType(node) === 'list') return false;
  });

  const ops = [];
  const applied = [];
  const missing = [];
  for (const ch of changes) {
    if (!ch || typeof ch.key !== 'string') throw new ContentError('Each change needs a key');
    if (onlyGlobals && !ch.global) continue;
    const nodes = ch.global ? (byGlobal.get(ch.key) || []) : (byKey.has(ch.key) ? [byKey.get(ch.key)] : []);
    if (!nodes.length) { missing.push(ch.key); continue; }
    for (const node of nodes) {
      const type = regionType(node);
      if (ch.type && ch.type !== type) throw new ContentError(`Region "${ch.key}" is ${type}, not ${ch.type}`);
      ops.push(...(type === 'list' ? listOps(html, node, ch.value) : regionOps(html, node, type, ch.value)));
    }
    applied.push(ch.key);
  }
  return { html: ops.length ? splice(html, ops) : html, applied, missing };
}

export { escapeText };
