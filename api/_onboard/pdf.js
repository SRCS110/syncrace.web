// Signed agreement PDF: the agreement, both signatures, the intake form as
// Exhibit A, and a signing certificate (audit trail). Uses only built-in fonts.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const W = 612, H = 792, M = 60, BODY = 10.5, LH = 15;
const INK = rgb(0.118, 0.141, 0.188), DUST = rgb(0.353, 0.38, 0.44), CORAL = rgb(0.722, 0.255, 0.106), HAIR = rgb(0.894, 0.867, 0.827);

// Built-in PDF fonts only cover Windows-1252. Swap anything else for a close match or "?".
const CP1252 = new Set([0x20ac, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039, 0x152, 0x17d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc, 0x2122, 0x161, 0x203a, 0x153, 0x17e, 0x178]);
const SWAP = { '→': '->', '←': '<-', '≥': '>=', '≤': '<=', ' ': ' ', ' ': ' ', ' ': ' ', '‑': '-', '−': '-' };
export const safe = (s) => Array.from(String(s ?? '')).map((ch) => {
  if (SWAP[ch]) return SWAP[ch];
  const c = ch.codePointAt(0);
  if (c === 10) return '\n';
  if (c < 32) return ' ';
  if ((c >= 32 && c < 127) || (c >= 160 && c < 256) || CP1252.has(c)) return ch;
  return '?';
}).join('');

class Writer {
  constructor(pdf, fonts, footer) { this.pdf = pdf; this.f = fonts; this.footer = footer; this.newPage(); }
  newPage() { this.page = this.pdf.addPage([W, H]); this.y = H - M; }
  need(h) { if (this.y - h < M + 20) this.newPage(); }
  // Draw runs [{ text, bold }] wrapped to width, starting at x.
  runs(runs, { x = M, width = W - 2 * M, size = BODY, color = INK, lh = LH } = {}) {
    const words = [];
    for (const r of runs) for (const [i, w] of safe(r.text).split(/(\s+)/).entries()) if (w) words.push({ w, bold: r.bold, i });
    let line = [], lineW = 0;
    const flush = () => {
      this.need(lh);
      let cx = x;
      for (const t of line) { const font = t.bold ? this.f.bold : this.f.reg; this.page.drawText(t.w, { x: cx, y: this.y - size, size, font, color }); cx += font.widthOfTextAtSize(t.w, size); }
      this.y -= lh; line = []; lineW = 0;
    };
    for (const t of words) {
      if (t.w.includes('\n')) { flush(); continue; }
      const font = t.bold ? this.f.bold : this.f.reg;
      const ww = font.widthOfTextAtSize(t.w, size);
      if (/^\s+$/.test(t.w)) { if (line.length) { line.push({ ...t, w: ' ' }); lineW += font.widthOfTextAtSize(' ', size); } continue; }
      if (lineW + ww > width && line.length) { while (line.length && line[line.length - 1].w === ' ') line.pop(); flush(); }
      if (ww > width) { // a very long word: hard break
        let s = t.w;
        while (s) { let n = s.length; while (n > 1 && font.widthOfTextAtSize(s.slice(0, n), size) > width) n--; line.push({ ...t, w: s.slice(0, n) }); flush(); s = s.slice(n); }
        continue;
      }
      line.push(t); lineW += ww;
    }
    if (line.length) flush();
  }
  text(s, o) { this.runs(parseBold(s), o); }
  gap(h = 8) { this.y -= h; }
  rule() { this.need(10); this.page.drawLine({ start: { x: M, y: this.y }, end: { x: W - M, y: this.y }, thickness: 0.6, color: HAIR }); this.y -= 10; }
  heading(s, size = 13) { this.need(size + 30); this.gap(6); this.page.drawText(safe(s), { x: M, y: this.y - size, size, font: this.f.bold, color: INK }); this.y -= size + 9; }
  table(head, rows, cols) {
    const widths = cols.map((c) => c * (W - 2 * M));
    const hasHead = head.some(Boolean);
    const drawRow = (cells, bold) => {
      const heights = cells.map((c, i) => this.measure(c, widths[i] - 8, 10));
      const h = Math.max(...heights) * 14 + 8;
      this.need(h);
      const top = this.y;
      let cx = M;
      cells.forEach((c, i) => {
        const yy = this.y;
        this.y = top - 4;
        this.runs([{ text: c, bold: bold || (i === 0 && !hasHead) }], { x: cx + 4, width: widths[i] - 8, size: 10, lh: 14, color: i === 0 && !hasHead ? DUST : INK });
        this.y = yy;
        cx += widths[i];
      });
      this.y = top - h;
      this.page.drawLine({ start: { x: M, y: this.y }, end: { x: W - M, y: this.y }, thickness: 0.5, color: HAIR });
    };
    if (hasHead) drawRow(head, true);
    rows.forEach((r, i) => drawRow(r, hasHead && i === rows.length - 1));
    this.gap(8);
  }
  measure(s, width, size) {
    let lines = 1, w = 0;
    for (const word of safe(s).split(/\s+/)) {
      const ww = this.f.reg.widthOfTextAtSize(word + ' ', size);
      if (w + ww > width && w > 0) { lines++; w = ww; } else w += ww;
    }
    return lines;
  }
  finish() {
    const pages = this.pdf.getPages();
    pages.forEach((p, i) => {
      p.drawText(safe(`${this.footer}   ·   Page ${i + 1} of ${pages.length}`), { x: M, y: 32, size: 8, font: this.f.reg, color: DUST });
    });
  }
}

const parseBold = (s) => String(s).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) => (p.startsWith('**') ? { text: p.slice(2, -2), bold: true } : { text: p, bold: false }));

const pacific = (d) => new Date(d).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });

/**
 * doc: buildAgreement() result. sig: { name, title, email, type, typed, png (Uint8Array|null), signedAt, ip, userAgent }.
 * intake: summarize() result. audit: { sha256, inviteCreatedAt, inviteViewedAt, intakeAt, agreementId }.
 */
export async function agreementPDF(doc, sig, intakeSummary, audit) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.title} — ${safe(doc.clientName)}`);
  pdf.setAuthor('Sync Race Studios');
  pdf.setSubject(`Signed ${new Date(sig.signedAt).toISOString()}`);
  pdf.setCreator('srcs.online/start');
  const fonts = { reg: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold), sig: await pdf.embedFont(StandardFonts.TimesRomanItalic) };
  const w = new Writer(pdf, fonts, `Sync Race Studios · ${doc.title} · ${safe(doc.clientName)} · Document ${audit.sha256.slice(0, 12)}`);

  w.page.drawText('SYNC RACE STUDIOS', { x: M, y: w.y - 9, size: 9, font: fonts.bold, color: CORAL });
  w.y -= 26;
  w.page.drawText(safe(doc.title), { x: M, y: w.y - 22, size: 22, font: fonts.bold, color: INK });
  w.y -= 34;
  w.text(`Signed electronically on ${pacific(sig.signedAt)}`, { color: DUST, size: 10 });
  w.gap(6);
  w.rule();

  for (const s of doc.sections) {
    w.heading(s.h);
    for (const b of s.blocks) {
      if (b.p) { w.text(b.p); w.gap(5); }
      if (b.ul) { for (const li of b.ul) { w.need(LH); w.page.drawText('•', { x: M + 6, y: w.y - BODY, size: BODY, font: fonts.reg, color: CORAL }); w.text(li, { x: M + 18, width: W - 2 * M - 18 }); } w.gap(5); }
      if (b.table) w.table(b.table.head, b.table.rows, b.table.head.some(Boolean) ? [0.3, 0.5, 0.2] : [0.32, 0.68]);
    }
  }

  // Signatures
  w.heading('Signatures');
  w.need(150);
  const colW = (W - 2 * M - 24) / 2, top = w.y, cx = M + colW + 24, sigY = top - 18, lineY = sigY - 44;
  w.page.drawText('Sync Race Studios', { x: M, y: top - 10, size: 10, font: fonts.bold, color: DUST });
  w.page.drawText('Client', { x: cx, y: top - 10, size: 10, font: fonts.bold, color: DUST });
  w.page.drawText('Daniel', { x: M, y: sigY - 32, size: 22, font: fonts.sig, color: INK });
  if (sig.type === 'drawn' && sig.png) {
    const img = await pdf.embedPng(sig.png);
    const scale = Math.min(colW / img.width, 40 / img.height);
    w.page.drawImage(img, { x: cx, y: lineY + 2, width: img.width * scale, height: img.height * scale });
  } else {
    w.page.drawText(safe(sig.typed || sig.name), { x: cx, y: sigY - 32, size: 22, font: fonts.sig, color: INK });
  }
  for (const x of [M, cx]) w.page.drawLine({ start: { x, y: lineY }, end: { x: x + colW, y: lineY }, thickness: 0.7, color: INK });
  const col = (x, lines) => { w.y = lineY - 6; for (const l of lines) w.runs([{ text: l, bold: false }], { x, width: colW, size: 9.5, lh: 13 }); return w.y; };
  const y1 = col(M, ['Daniel, Sync Race Studios', `Issued electronically ${pacific(audit.inviteCreatedAt)}`]);
  const y2 = col(cx, [`${sig.name}${sig.title ? `, ${sig.title}` : ''}`, doc.clientName, sig.email, `Signed electronically ${pacific(sig.signedAt)}`]);
  w.y = Math.min(y1, y2) - 10;

  // Exhibit A: intake form
  w.newPage();
  w.heading('Exhibit A: Client Intake Form', 15);
  w.text(audit.intakeAt ? `Submitted ${pacific(audit.intakeAt)}` : 'Submitted with this agreement', { color: DUST, size: 10 });
  w.gap(4);
  for (const s of intakeSummary) {
    w.heading(s.title, 11.5);
    w.table(['', ''], s.rows, [0.38, 0.62]);
  }

  // Signing certificate
  w.newPage();
  w.heading('Signing certificate', 15);
  w.text('This page records how the agreement was signed. It is part of the signed document.', { color: DUST, size: 10 });
  w.gap(6);
  w.table(['', ''], [
    ['Document', `${doc.title}, template ${doc.version}`],
    ['Document fingerprint (SHA-256 of the agreement text)', audit.sha256],
    ['Agreement ID', audit.agreementId],
    ['Issued by', `Sync Race Studios (hello@srcs.online), ${pacific(audit.inviteCreatedAt)}`],
    ['First opened by client', audit.inviteViewedAt ? pacific(audit.inviteViewedAt) : '—'],
    ['Intake form submitted', audit.intakeAt ? pacific(audit.intakeAt) : '—'],
    ['Signed by', `${sig.name}${sig.title ? `, ${sig.title}` : ''} <${sig.email}>`],
    ['Signature method', sig.type === 'drawn' ? 'Drawn on screen' : 'Typed name'],
    ['Signed at', `${pacific(sig.signedAt)} (${new Date(sig.signedAt).toISOString()})`],
    ['IP address', sig.ip || '—'],
    ['Browser', sig.userAgent || '—'],
    ['Consent given', sig.consent],
  ], [0.38, 0.62]);

  w.finish();
  return pdf.save();
}
