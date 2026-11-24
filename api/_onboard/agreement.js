// The Client Service Agreement. One structured document is rendered three ways:
// HTML for review on /start, plain text (hashed, so the signature is tied to the
// exact words the client read) and the signed PDF.
import crypto from 'node:crypto';

export const TEMPLATE_VERSION = '2026-11-22';

const money = (n) => (n == null || n === '' || Number.isNaN(Number(n)) ? '' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`);
const longDate = (d) => {
  if (!d) return '';
  const x = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00Z`) : new Date(d);
  return Number.isNaN(x.getTime()) ? '' : x.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' });
};

/**
 * invite: onboarding_invites row. client: clients row. intake: { answers, submitted_at }.
 * Returns { version, title, parties, sections }.
 * Blocks: { p } (a leading "**…**" is bold), { ul: [] }, { table: { head, rows } }.
 */
export function buildAgreement(invite, client, intake) {
  const a = intake?.answers || {};
  const services = Array.isArray(invite.services) ? invite.services : [];
  const total = invite.total_fee != null ? Number(invite.total_fee) : services.reduce((t, s) => t + (Number(s.fee) || 0), 0);
  const deposit = Number(invite.deposit_percent ?? 50);
  const hourly = money(invite.hourly_rate ?? 129);
  const hosting = money(invite.hosting_monthly ?? 49);
  const clientName = a.legal_name || client.legal_name || client.business_name;

  const parties = [
    ['Client legal name', clientName],
    ['Doing business as', a.display_name || (client.business_name !== clientName ? client.business_name : '')],
    ['Client contact', [a.contact_name || client.contact_name, a.contact_title].filter(Boolean).join(', ')],
    ['Client email and phone', [a.email || client.contact_email, a.phone || client.contact_phone].filter(Boolean).join(' · ')],
    ['Client address', (a.address || '').replace(/\s*\n+\s*/g, ', ')],
    ['Project', invite.project_name],
    ['Estimated start', longDate(invite.est_start) || 'To be scheduled'],
    ['Estimated completion', longDate(invite.est_completion) || 'To be scheduled'],
  ].filter(([, v]) => v);

  const rows = services.map((s) => [s.service || '', s.description || '', money(s.fee) || 'Included']);
  rows.push(['Total project fee', '', money(total) || '$0']);

  const sections = [
    {
      h: '1. Parties and project',
      blocks: [
        { p: `This Client Service Agreement ("Agreement") is between **Sync Race Studios** ("SRCS"), serving Sonoma County, California, hello@srcs.online, and ${clientName} ("Client").` },
        { table: { head: ['', ''], rows: parties } },
        { p: `The project is described in Section 2 and in the Client Intake Form submitted by Client${intake?.submitted_at ? ` on ${longDate(intake.submitted_at)}` : ''}, which is part of this Agreement.` },
      ],
    },
    {
      h: '2. Scope, fees and payment',
      blocks: [
        { p: '**2.1 Deliverables.** SRCS will provide the following services. Anything not listed here is outside the scope of this Agreement.' },
        { table: { head: ['Service', 'Description', 'Fee'], rows } },
        { p: '**2.2 Included with websites.** Every website includes Google Analytics, Google Search Console and Bing Webmaster Tools setup, basic on-page search optimization, and access to the SRCS site editor.' },
        { p: `**2.3 Payment schedule.** A non-refundable deposit of ${deposit}% of the total project fee is due before work begins. The remaining ${100 - deposit}% is due at Completion (Section 3.4), before the site or app is launched publicly.` },
        { p: `**2.4 Hourly work.** Work outside the scope above, revisions beyond those included, and changes after the 30-day Post-Completion Period are billed at **${hourly} per hour**. Google Business Profile, Google Ads management and print design are also billed at ${hourly} per hour. SRCS will give an estimate and get Client's approval before starting any hourly work.` },
        { p: `**2.5 Recurring services.** Website hosting and the site editor are ${hosting} per month per website, billed monthly starting at launch. Optional add-ons, such as the automated blog content service at $50 per month and the AI website assistant at $99 per month, are billed monthly in advance. AI assistant usage is billed monthly in arrears at cost. Recurring services may be canceled by either party with 30 days' written notice.` },
        { p: '**2.6 Third-party costs.** Client pays directly for domain registration and renewal, ad spend, printing, paid software or plugins, stock images and other third-party costs. SRCS will not buy anything on Client\'s behalf without written approval.' },
        { p: '**2.7 Invoices.** Invoices are due within 15 days. Unpaid balances over 30 days may accrue a late fee of 1.5% per month, or the maximum allowed by law if lower. SRCS may pause work, or take a site or app offline, if an invoice is more than 30 days overdue, after 7 days\' written notice.' },
      ],
    },
    {
      h: '3. Revisions and corrections',
      blocks: [
        { p: '**3.1 Two revision rounds included.** The project fee includes **two (2) rounds of revisions**. A round is one consolidated list of changes that Client sends at one time. Unused rounds do not carry over after Completion.' },
        { p: '**3.2 What counts as a revision.** A revision is any change to the design, structure or function, including:' },
        { ul: ['Styling changes (layout, spacing, colors, visual style)', 'Changing typography (fonts, sizes, text styles)', 'Adding pages or sections', 'Adding or changing features or functionality', 'Reworking a design that Client already approved'] },
        { p: '**3.3 What counts as a correction.** A correction is a small change that does not alter the design, structure or function, including:' },
        { ul: ['Replacing or swapping images', 'Editing, updating or fixing text and typos', 'Updating contact details, hours, prices or links', 'Fixing broken links or display errors', 'Other small adjustments of similar size'] },
        { p: 'Corrections during the project are part of the normal process and do not use a revision round. SRCS decides in good faith whether a request is a revision or a correction and will tell Client before doing any work that would be billed.' },
        { p: '**3.4 Completion.** "Completion" is the earlier of (a) the date the site or app is launched publicly, or (b) 10 business days after SRCS delivers the final version for approval, if Client has not sent revision requests or corrections by then.' },
        { p: '**3.5 30-day Post-Completion Period.** For **30 days after Completion**, SRCS will make **unlimited corrections at no charge**, and will fix any defects in SRCS\'s own work at no charge. Revisions requested during this period, beyond the two included rounds, are billed at the hourly rate in Section 2.4.' },
        { p: '**3.6 After 30 days.** After the Post-Completion Period, Client may make content updates through the SRCS site editor at no charge. Corrections and revisions done by SRCS are billed at the hourly rate in Section 2.4.' },
      ],
    },
    {
      h: '4. Hosting, management and site editor',
      blocks: [
        { p: '**4.1 SRCS hosts and manages.** SRCS hosts, maintains and manages the websites and apps it builds for Client, under the recurring fees in Section 2.5. Hosting terms for apps are set in the app\'s quote.' },
        { p: '**4.2 Site editor.** SRCS will give Client\'s named editors logins to the SRCS site editor so they can update text and content. Client is responsible for content its editors publish and for keeping logins secure.' },
        { p: '**4.3 Service level.** SRCS will use commercially reasonable efforts to keep sites and apps online, secure and backed up. SRCS does not guarantee uninterrupted service, and is not responsible for outages caused by hosting providers, third-party services or events outside its control.' },
        { p: '**4.4 Domain.** Client\'s domain stays registered in Client\'s name. Client gives SRCS the access needed to point the domain to the site and keep DNS records working.' },
        { p: '**4.5 Results.** SRCS will follow current best practices for search, AI search and advertising, but does not guarantee any specific search ranking, traffic, ad performance or sales.' },
      ],
    },
    {
      h: '5. Client responsibilities and ownership',
      blocks: [
        { p: '**5.1 Content and feedback.** Client will provide content, materials, account access and feedback promptly, and will name one decision-maker for approvals. Delays caused by Client may move the completion date.' },
        { p: '**5.2 Inactive projects.** If Client does not respond for 30 days, SRCS may pause the project. If it stays paused for 60 days, SRCS may close it and invoice for work completed. Restarting a closed project may carry a restart fee.' },
        { p: '**5.3 Client materials.** Client confirms it owns or has permission to use all text, images, logos and other materials it provides, and will cover any claims arising from those materials.' },
        { p: '**5.4 Client ownership.** Client owns its content, data, domain and trademarks. After full payment, Client owns the final logo and branding files SRCS creates for Client.' },
        { p: '**5.5 SRCS ownership.** SRCS keeps ownership of its code, templates, frameworks, the SRCS site editor and other tools, including those used to build Client\'s site or app. Client receives a license to use them for its site or app while SRCS hosts it.' },
        { p: '**5.6 Portfolio.** SRCS may show the finished work in its portfolio and marketing unless Client opts out in writing.' },
        { p: '**5.7 Confidentiality.** Each party will keep the other\'s non-public business information confidential and use it only for this project.' },
      ],
    },
    {
      h: '6. Termination and general terms',
      blocks: [
        { p: '**6.1 Termination.** Either party may end this Agreement with 14 days\' written notice. Client pays for all work completed through the end date. The deposit is non-refundable.' },
        { p: '**6.2 Leaving SRCS hosting.** If Client ends hosting, SRCS will provide an export of Client\'s content (text, images and data) within 30 days, once all invoices are paid. A transfer of the site\'s code may be purchased for a separately quoted fee.' },
        { p: '**6.3 Limitation of liability.** SRCS\'s total liability under this Agreement is limited to the fees Client paid SRCS in the 12 months before the claim. Neither party is liable for indirect, incidental or consequential damages, such as lost profits.' },
        { p: '**6.4 Independent contractor.** SRCS is an independent contractor, not an employee or agent of Client.' },
        { p: '**6.5 Governing law.** This Agreement is governed by the laws of the State of California. Any dispute will be handled in Sonoma County, California.' },
        { p: '**6.6 Electronic signatures.** The parties agree to sign this Agreement electronically. An electronic signature has the same effect as a handwritten one, and a signed electronic copy counts as an original.' },
        { p: '**6.7 Entire agreement.** This Agreement and the Client Intake Form are the full agreement between the parties. Changes must be in writing and approved by both parties; email counts. If any part is found unenforceable, the rest stays in effect.' },
      ],
    },
  ];

  return { version: TEMPLATE_VERSION, title: 'Client Service Agreement', clientName, issuedAt: invite.created_at, sections };
}

const stripMarks = (s) => s.replace(/\*\*/g, '');

// Canonical plain text. This is what gets hashed and stored with the signature.
export function agreementText(doc) {
  const out = [`SYNC RACE STUDIOS — ${doc.title.toUpperCase()}`, `Template ${doc.version}`, ''];
  for (const s of doc.sections) {
    out.push(s.h.toUpperCase(), '');
    for (const b of s.blocks) {
      if (b.p) out.push(stripMarks(b.p), '');
      if (b.ul) { b.ul.forEach((x) => out.push(`  • ${x}`)); out.push(''); }
      if (b.table) {
        if (b.table.head.some(Boolean)) out.push(`  ${b.table.head.join(' | ')}`);
        b.table.rows.forEach((r) => out.push(`  ${r.filter((c, i) => c || i === 0).join(' | ')}`));
        out.push('');
      }
    }
  }
  return out.join('\n').trimEnd() + '\n';
}

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

export function agreementHTML(doc) {
  let h = '';
  for (const s of doc.sections) {
    h += `<h3>${esc(s.h)}</h3>`;
    for (const b of s.blocks) {
      if (b.p) h += `<p>${inline(b.p)}</p>`;
      if (b.ul) h += `<ul>${b.ul.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`;
      if (b.table) {
        const head = b.table.head.some(Boolean) ? `<thead><tr>${b.table.head.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>` : '';
        const body = b.table.rows.map((r, i) => {
          const last = b.table.head.some(Boolean) && i === b.table.rows.length - 1;
          return `<tr${last ? ' class="total"' : ''}>${r.map((c, j) => (j === 0 && !b.table.head.some(Boolean) ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`;
        }).join('');
        h += `<div class="ag-table"><table>${head}<tbody>${body}</tbody></table></div>`;
      }
    }
  }
  return h;
}
