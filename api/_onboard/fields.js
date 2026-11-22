// The client intake form, defined once. /start renders its steps from this,
// the API validates answers against it, and emails, PDFs and the admin view
// use its labels.

const SERVICES = [
  ['website', 'Website design and build'],
  ['app', 'Custom app or business tool'],
  ['gbp', 'Google Business Profile setup or optimization'],
  ['ads', 'Google Ads'],
  ['print', 'Print marketing (flyers, menus, signage, cards)'],
  ['branding', 'Logo design and branding'],
  ['marketing', 'Marketing campaign help'],
  ['content', 'Automated blog content engine ($50/month)'],
];

const FEATURES = [
  ['contact', 'Contact form'],
  ['booking', 'Booking or reservations'],
  ['store', 'Online store or payments'],
  ['menu', 'Menu, price list or service list'],
  ['events', 'Events calendar'],
  ['gallery', 'Photo gallery'],
  ['blog', 'Blog or news'],
  ['newsletter', 'Newsletter signup'],
  ['applications', 'Job or vendor applications'],
  ['accounts', 'Customer accounts or logins'],
  ['languages', 'More than one language'],
];

export const STEPS = [
  {
    id: 'business',
    title: 'Your business',
    intro: 'The basics we need for your agreement and your site.',
    fields: [
      { key: 'legal_name', label: 'Legal business name', required: true, autocomplete: 'organization' },
      { key: 'display_name', label: 'Name customers know you by', hint: 'if different' },
      { key: 'contact_name', label: 'Your name', required: true, half: true, autocomplete: 'name' },
      { key: 'contact_title', label: 'Your title', half: true, autocomplete: 'organization-title' },
      { key: 'email', label: 'Email', type: 'email', required: true, half: true, autocomplete: 'email' },
      { key: 'phone', label: 'Phone', type: 'tel', half: true, autocomplete: 'tel' },
      { key: 'address', label: 'Business address', hint: 'or "service area only"', autocomplete: 'street-address', type: 'textarea', rows: 2 },
      { key: 'public_contact', label: 'Phone and email to show on your site', half: true },
      { key: 'hours', label: 'Business hours', half: true },
      { key: 'industry', label: 'Type of business', half: true },
      { key: 'years', label: 'Years in business', half: true },
      { key: 'summary', label: 'What do you do, and who do you serve?', type: 'textarea', required: true, hint: 'one or two sentences' },
      { key: 'difference', label: 'What sets you apart from competitors?', type: 'textarea' },
    ],
  },
  {
    id: 'scope',
    title: 'Services and scope',
    intro: 'Check everything you’re interested in. Nothing here is a commitment.',
    fields: [
      { key: 'services', label: 'Services', type: 'checks', options: SERVICES },
      { key: 'goal', label: 'What’s the main goal of this project?', type: 'textarea', hint: 'more calls, bookings, sales, credibility, time saved' },
      { key: 'current_site', label: 'Current website, if you have one', type: 'url', placeholder: 'https://' },
      { key: 'current_site_notes', label: 'What do you like and dislike about it?', type: 'textarea' },
      { key: 'pages', label: 'Pages you expect to need', type: 'textarea', hint: 'Home, About, Services, Menu, Gallery, Contact…' },
      { key: 'app_details', label: 'For an app: what should it solve, and who will use it?', type: 'textarea' },
      { key: 'launch', label: 'Target launch date or event', half: true },
      { key: 'budget', label: 'Budget range', half: true, placeholder: 'Not sure yet' },
    ],
  },
  {
    id: 'brand',
    title: 'Brand and content',
    intro: 'Send what you have. We can fill the gaps.',
    fields: [
      { key: 'logo', label: 'Do you have a logo?', type: 'radio', options: [['yes', 'Yes, I’ll send the files'], ['no', 'No, I need one'], ['refresh', 'Yes, but it needs a refresh']] },
      { key: 'colors', label: 'Brand colors', half: true, hint: 'hex codes if you know them' },
      { key: 'fonts', label: 'Brand fonts', half: true },
      { key: 'brand_words', label: 'Three words for how your brand should feel' },
      { key: 'liked_sites', label: '2–3 websites you like, and what you like about each', type: 'textarea' },
      { key: 'competitors', label: 'Competitors or similar businesses', type: 'textarea' },
      { key: 'avoid', label: 'Anything you definitely don’t want', type: 'textarea' },
      { key: 'copy_by', label: 'Who will write the text?', type: 'radio', options: [['client', 'We will'], ['srcs', 'Sync Race Studios'], ['both', 'A mix']] },
      { key: 'photos', label: 'Photos or video', type: 'textarea', hint: 'what you have, and how you’ll share it' },
      { key: 'rights', label: 'Do you own or have permission to use everything you’ll send us?', type: 'radio', options: [['yes', 'Yes'], ['unsure', 'Not sure'], ['no', 'No']] },
      { key: 'socials', label: 'Social accounts to link', type: 'textarea', rows: 2, hint: 'Instagram, Facebook, Yelp…' },
    ],
  },
  {
    id: 'accounts',
    title: 'Domain and accounts',
    intro: 'Please don’t write any passwords here. We’ll ask you to add us as a user on each account instead.',
    fields: [
      { key: 'domain', label: 'Domain name(s)', half: true, placeholder: 'yourbusiness.com' },
      { key: 'registrar', label: 'Where is it registered?', half: true, hint: 'GoDaddy, Squarespace, Namecheap…' },
      { key: 'current_host', label: 'Who hosts your site now?', half: true },
      { key: 'email_provider', label: 'Business email provider', half: true, hint: 'Google, Microsoft…' },
      { key: 'gbp', label: 'Do you have a Google Business Profile? Who manages it?' },
      { key: 'google_accounts', label: 'Existing Google Analytics, Search Console or Ads accounts' },
      { key: 'google_email', label: 'Google account email that should own these', type: 'email' },
      { key: 'other_access', label: 'Other tools we’ll need access to', type: 'textarea', rows: 2, hint: 'booking system, POS, newsletter…' },
    ],
  },
  {
    id: 'features',
    title: 'Features',
    intro: 'What your site or app needs to do.',
    fields: [
      { key: 'features', label: 'Features', type: 'checks', options: FEATURES },
      { key: 'form_email', label: 'Where should form submissions go?', type: 'email' },
      { key: 'integrations', label: 'Tools that should connect', type: 'textarea', rows: 2, hint: 'Square, Toast, OpenTable, Tripleseat, Calendly, Mailchimp, Shopify…' },
      { key: 'personal_data', label: 'What personal information will you collect from visitors?', type: 'textarea', rows: 2, hint: 'names, emails, phone numbers, addresses, payments' },
      { key: 'outside_ca', label: 'Do you serve customers outside California or the US?', type: 'radio', options: [['no', 'No'], ['us', 'Other US states'], ['intl', 'Outside the US']] },
      { key: 'legal', label: 'Accessibility or legal requirements we should know about', type: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'billing',
    title: 'Editing and billing',
    intro: 'Sync Race Studios hosts and manages your site. Your team can update text and photos with the built-in editor.',
    fields: [
      { key: 'editors', label: 'Who will edit the site?', type: 'textarea', rows: 2, hint: 'names and emails for editor logins' },
      { key: 'frequent', label: 'What will you change most often?', hint: 'hours, menu, events, pricing…' },
      { key: 'approver', label: 'Who approves designs and gives feedback?', half: true },
      { key: 'contact_pref', label: 'Best way and time to reach you', half: true },
      { key: 'billing_contact', label: 'Billing contact and email', hint: 'if different from you' },
      { key: 'billing_address', label: 'Mailing address for invoices', type: 'textarea', rows: 2 },
      { key: 'referral', label: 'How did you hear about us?' },
      { key: 'other', label: 'Anything else we should know?', type: 'textarea' },
    ],
  },
];

export const FIELDS = STEPS.flatMap((s) => s.fields);
const BY_KEY = new Map(FIELDS.map((f) => [f.key, f]));

const LIMIT = { textarea: 3000, default: 300 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Returns { answers, errors }. Unknown keys are dropped; values are trimmed and capped.
export function cleanAnswers(input) {
  const answers = {};
  const errors = [];
  const src = input && typeof input === 'object' ? input : {};
  for (const f of FIELDS) {
    let v = src[f.key];
    if (f.type === 'checks') {
      const allowed = new Set(f.options.map(([k]) => k));
      v = Array.isArray(v) ? [...new Set(v.map(String))].filter((x) => allowed.has(x)) : [];
      if (v.length) answers[f.key] = v;
      continue;
    }
    if (f.type === 'radio') {
      v = typeof v === 'string' && f.options.some(([k]) => k === v) ? v : '';
    } else {
      v = typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim() : '';
      v = v.slice(0, f.type === 'textarea' ? LIMIT.textarea : LIMIT.default);
    }
    if (f.required && !v) errors.push(`${f.label} is required.`);
    if (v && f.type === 'email' && !EMAIL.test(v)) errors.push(`${f.label} doesn’t look like an email address.`);
    if (v) answers[f.key] = v;
  }
  return { answers, errors };
}

// Human-readable value for emails, PDFs and the admin view.
export function display(key, value) {
  const f = BY_KEY.get(key);
  if (!f || value == null || value === '') return '';
  if (f.type === 'checks') return value.map((k) => (f.options.find(([o]) => o === k) || [k, k])[1]).join(', ');
  if (f.type === 'radio') return (f.options.find(([o]) => o === value) || [value, value])[1];
  return String(value);
}

// [{ title, rows: [[label, value]] }] for every answered field.
export function summarize(answers) {
  return STEPS.map((s) => ({
    title: s.title,
    rows: s.fields.map((f) => [f.label, display(f.key, answers[f.key])]).filter(([, v]) => v),
  })).filter((s) => s.rows.length);
}

// The spec sent to the browser (labels and options only).
export function publicSpec() {
  return STEPS.map((s) => ({ ...s, fields: s.fields.map((f) => ({ ...f })) }));
}
