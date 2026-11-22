// Build for srcs.online. Run:  node tools/build.mjs
// 1. Generates the pages defined below (home, services, pricing, about, resources…).
// 2. Post-processes EVERY .html page: writes the nav, footer, skip link,
//    breadcrumbs (visible + BreadcrumbList schema) and dragon-curve icons
//    straight into the HTML, so crawlers get finished pages.
// Pages not generated here (case studies, legal, playground) are edited by
// hand and still go through step 2.
// 3. Connects every page to the SRCS CMS: marks headlines and intros as
//    editable, adds the editor loader, and re-applies edits saved in
//    cms/content.json so rebuilding never undoes what was changed in the editor.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POSTS } from './articles.mjs';
import { applyChanges } from './cms/apply.js';
import * as parse5 from 'parse5';
const ROOT = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');


/* ---------- schema.org JSON-LD ---------- */
const SITE = 'https://www.srcs.online/';
const ORG = { '@type': 'ProfessionalService', '@id': SITE + '#org', name: 'Sync Race Studios', alternateName: 'SRCS', url: SITE,
  logo: SITE + 'assets/srcs-curve.svg', image: SITE + 'assets/srcs-curve.svg', email: 'hello@srcs.online',
  description: 'Business services for local businesses: website design, logo design and branding, Google Business Profile, Google Ads, print marketing and small business apps.',
  knowsAbout: ['Website design', 'AI search optimization', 'Schema markup', 'Google Business Profile', 'Google Ads', 'Logo design', 'Branding', 'Print design', 'Web applications'] };
const strip = h => String(h).replace(/<[^>]+>/g, '').replace(/\\'/g, "'");
const crumbs = (path, name) => path ? { '@type': 'BreadcrumbList', itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
  { '@type': 'ListItem', position: 2, name, item: SITE + path }] } : null;
const ldScript = (meta, faqs) => {
  const url = SITE + meta.path;
  const graph = [ORG];
  if (!meta.path) graph.push({ '@type': 'WebSite', '@id': SITE + '#site', url: SITE, name: 'Sync Race Studios', publisher: { '@id': SITE + '#org' } });
  graph.push({ '@type': meta.pageType || 'WebPage', '@id': url + '#page', url, name: meta.title, description: meta.desc,
    isPartOf: { '@id': SITE + '#site' }, about: { '@id': SITE + '#org' } });
  const bc = crumbs(meta.path, meta.crumb || meta.title.split(':')[0]); if (bc) graph.push(bc);
  if (meta.service) graph.push({ '@type': 'Service', name: meta.service.name, serviceType: meta.service.name, description: meta.desc, url,
    provider: { '@id': SITE + '#org' }, ...(meta.service.areaServed ? { areaServed: meta.service.areaServed } : {}), ...(meta.service.offers ? { offers: meta.service.offers } : {}) });
  if (meta.extraLd) graph.push(...meta.extraLd);
  if (faqs.length) graph.push({ '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: strip(q), acceptedAnswer: { '@type': 'Answer', text: strip(a) } })) });
  return `<script type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 1)}\n</script>\n`;
};
const HOURLY = { '@type': 'Offer', priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: 125, priceCurrency: 'USD', unitCode: 'HUR', unitText: 'hour' } };

const head = ({ title, desc, path, root }) => {
  const r = root ? './' : '../';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="https://www.srcs.online/${path}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://www.srcs.online/${path}">
<meta name="theme-color" content="#FBF8F4">
<link rel="icon" href="${r}assets/srcs-curve.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Marcellus&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${r}srcs.css">
</head>
<body>

<site-nav></site-nav>

<main id="main" tabindex="-1">
`;
};
const foot = (root, extra = '') => `
</main>

<site-foot></site-foot>

<script src="${root ? './' : '../'}nav.js" defer></script>${extra}
</body>
</html>
`;
const page = (file, meta, body, extra) => {
  const root = file === 'index.html';
  // Every "kicker + h2 + content" column becomes the same two-column editorial section.
  body = body.replace(/<div class="col(?: right)?">\s*((?:<span class="kicker[^"]*">[^<]*<\/span>\s*)?<h2[^>]*>[\s\S]*?<\/h2>)([\s\S]*?)\n    <\/div>\n  <\/section>/g,
    (m, h, rest) => `<div class="sec">\n      <div class="sec-head">${h}</div>\n      <div class="sec-body">${rest}\n      </div>\n    </div>\n  </section>`);
  const out = head({ ...meta, root }).replace('</head>', ldScript(meta, FAQS) + '</head>') + body + foot(root, extra);
  FAQS = [];
  fs.writeFileSync(`${ROOT}/${root ? '' : 'pages/'}${file}`, out);
};

/* ---------- shared content ---------- */
const SVC = [
  { key: 'website', file: 'websites.html', n: 10, t: 'Website design', d: 'Fast, custom websites shaped around your business, optimized for Google and AI search.', s: 'New sites · redesigns · AI search ready · built-in editor' },
  { key: 'google', file: 'google-business.html', n: 6, t: 'Google Business Profile & Ads', d: 'Get on Google Search and Maps with a complete, verified profile, then run ads that bring in customers, with tracking to prove it.', s: 'Profile setup · reviews · ad campaigns · conversion tracking' },
  { key: 'branding', file: 'branding.html', n: 4, t: 'Logo design & branding', d: 'A logo and a simple brand system, colours, type and voice, that hold together everywhere your business shows up.', s: 'Logos · colour and type · brand guide' },
  { key: 'marketing', file: 'marketing.html', n: 3, t: 'Marketing campaigns', d: 'Plan and run a campaign around a launch, a season or an event: the message, the channels, the creative and the tracking.', s: 'Campaign plans · creative · launch and reporting' },
  { key: 'print', file: 'print.html', n: 5, t: 'Print & creative', d: 'Business cards, flyers, menus and signage that match your website and send people to it.', s: 'Print-ready files · QR codes · social graphics' },
  { key: 'apps', file: 'apps.html', n: 9, t: 'Business apps', d: 'Small, focused tools that take repetitive work off your week: bookings, forms, reports and dashboards.', s: 'Booking and intake · dashboards · automations' },
  { key: 'content', file: 'content.html', n: 8, t: 'Content engine', d: 'An optional add-on that keeps your site fresh with new blog posts on a regular schedule, written for search and AI.', s: '$50/month · optional · cancel anytime' },
  { key: 'pricing', file: 'pricing.html', n: 7, t: 'Hosting & management', d: 'We host and look after every website and app we build. Websites are $25/month, with a built-in editor so you can make content changes yourself.', s: 'Hosting · updates · backups · monitoring' },
];
/* =================== SONOMA COUNTY PAGES ===================
   One local search page per service. Copy is drawn from the service pages; the area
   (Sonoma County, served, no in-person claim) was confirmed by Daniel. */
const AREA = { '@type': 'AdministrativeArea', name: 'Sonoma County, California' };
const LOCAL = [
  { key: 'website', file: 'website-design-sonoma-county.html', svc: 'websites.html', n: 10, short: 'Website design',
    title: 'Website design in Sonoma County: Sync Race Studios', h1: 'Website design in Sonoma County',
    desc: 'Custom website design for Sonoma County businesses: fast, built for Google and AI search, hosted for $25/month, with a built-in editor for your own changes.',
    lede: 'Custom websites for businesses across Sonoma County, designed from an empty file around what your customers come to you for. Fast, built for Google and AI search, and hosted by us for $25 a month, with a built-in editor so you can change your own content.',
    btn: 'Start a website',
    incH: 'Everything a site needs to launch',
    inc: [['Custom design', 'in your colours, type and photography, never a template with your logo dropped in.'], ['Schema markup', 'structured data that tells Google and AI search what your business is, where it is and what it offers.'], ['Fast on any phone', 'lean, mobile-first code, compressed images and caching.'], ['Analytics and search listings', 'Google Analytics set up, and your site added to Google Search Console and Bing Webmaster Tools.'], ['Built-in content editor', 'change text, photos and lists on your own site and publish in about a minute. <a href="../demo">Try the demo</a>.']],
    priceH: 'From $1,500, then $25 a month', prices: [['$1,500+', 'one-time build'], ['$25/mo', 'hosting and built-in editor'], ['$125/hr', 'bigger changes, quoted first']],
    priceP: 'Hosting covers updates, backups and monitoring on Vercel and Cloudflare.',
    locH: 'Made to be found nearby',
    loc: [['Your location in the code', 'schema markup tells Google and AI assistants where you are and what you offer.'], ['Matched to your Google profile', 'the same name, hours and phone number, so Google trusts both.'], ['Pages for each campaign', 'Google Ads land on pages written for the search, with conversion tracking built in.'], ['Room to grow', 'add the content engine for regular posts on local events, seasons and the questions your customers ask.']],
    ctaH: 'Tell us about your site.', ctaP: 'What your business does and what the site needs to do. Rough is fine.' },
  { key: 'google', file: 'google-business-profile-sonoma-county.html', svc: 'google-business.html', n: 6, short: 'Google Business Profile & Ads',
    title: 'Google Profile and Ads in Sonoma County: Sync Race Studios', h1: 'Google Business Profile and Ads in Sonoma County',
    desc: 'Google Business Profile setup and Google Ads management for Sonoma County businesses: show up on Search and Maps, and track what every ad dollar brings in.',
    lede: 'Your Google Business Profile puts you on Search and Maps for free, and Google Ads put you at the top when it matters most. We set up both properly for Sonoma County businesses, connect them, and track what they bring in.',
    btn: 'Talk about Google',
    incH: 'Profile and ads, set up properly',
    inc: [['Claim or create', 'your profile, or recover one someone else set up.'], ['Categories, services and service area', 'chosen carefully and matched to your website.'], ['Reviews', 'a simple way to ask happy customers for reviews, and help drafting replies.'], ['Google Ads', 'Search, local and Performance Max campaigns where they make sense, in an account in your name.'], ['Conversion tracking', 'calls, forms and bookings measured with Google Analytics 4 and Google Ads, with consent.']],
    priceH: '$125 an hour, estimate first', prices: [['$125/hr', 'profile and ads work']],
    priceP: 'Ad spend goes directly to Google on your own card, and you set the limit.',
    locH: 'Showing up in local searches',
    loc: [['Maps', 'rankings depend on relevance, distance and prominence. A complete, active profile gives you the best chance.'], ['Your service area', 'filled in on your profile, so Google knows where you work.'], ['Local ads', 'can show your location, hours and reviews straight from your profile.'], ['Reviews at the counter', 'a QR code on receipts and table cards takes customers straight to leave a review.']],
    ctaH: 'Get your business seen on Google.', ctaP: 'Tell us your business name, whether you have a profile today, and whether you\'re running ads.' },
  { key: 'branding', file: 'logo-design-sonoma-county.html', svc: 'branding.html', n: 4, short: 'Logo design & branding',
    title: 'Logo design in Sonoma County: Sync Race Studios', h1: 'Logo design and branding in Sonoma County',
    desc: 'Logo design and branding for Sonoma County businesses: a logo, colour palette, typefaces and a one-page brand guide for your website, signage and print.',
    lede: 'A logo and a simple brand system for Sonoma County businesses: your mark plus the colours, type and tone around it, so your website, Google listing, menus and signs all look like the same business.',
    btn: 'Start a brand',
    incH: 'What you get',
    inc: [['Logo design', 'a primary logo, a simplified mark for small spaces, and versions for light and dark backgrounds.'], ['Colour palette', 'a few colours with exact values for screen and print.'], ['Typefaces', 'heading and body fonts that work on the web and in print.'], ['Brand guide', 'one page showing how to use it all, so anyone can keep it consistent.'], ['Every file you need', 'SVG, PNG and PDF, plus a favicon and social profile images.']],
    priceH: '$125 an hour, estimate first', prices: [['$125/hr', 'logo and brand work']],
    priceP: 'You get the final logo files and the rights to use them for your business.',
    locH: 'One look, everywhere you show up',
    loc: [['Storefront and signage', 'signs, menus and business cards all follow the brand guide.'], ['Google Business Profile', 'gets a matching logo and cover image.'], ['Your website', 'uses the same colours, type and logo from day one.'], ['Ads and social', 'graphics look like you, so people recognise you before they read the name.']],
    ctaH: 'Ready for a brand that fits?', ctaP: 'Tell us about your business and whether you have a logo today.' },
  { key: 'marketing', file: 'marketing-campaigns-sonoma-county.html', svc: 'marketing.html', n: 3, short: 'Marketing campaigns',
    title: 'Marketing campaigns in Sonoma County: Sync Race Studios', h1: 'Marketing campaigns in Sonoma County',
    desc: 'Marketing campaign help for Sonoma County businesses: plan the message, pick the channels, make the creative and track results for a launch, season or event.',
    lede: 'A grand opening, a new menu, a holiday rush, an event. We help Sonoma County businesses plan the campaign around it, make everything it needs, and see what it brought in.',
    btn: 'Plan a campaign',
    incH: 'Everything a campaign needs',
    inc: [['Goal and offer', 'what the campaign is for and why someone should act now.'], ['Channel plan', 'the mix that fits your customers: Google, social, email, print, your website and your storefront.'], ['Campaign calendar', 'what goes out where, and when, from teaser to last call.'], ['Creative', 'headlines, ad copy, social graphics, flyers and short video, all in your brand.'], ['Tracking and wrap-up', 'links, codes and conversions, then a report on what it cost and what it brought in.']],
    priceH: '$125 an hour, estimate first', prices: [['$125/hr', 'campaign planning and creative']],
    priceP: 'Ad spend and printing are separate. We can plan only, or run it end to end.',
    locH: 'Reaching people nearby',
    loc: [['Google Business Profile & Ads', 'carry the offer to people searching nearby.'], ['Print', 'flyers, posters and table cards with QR codes back to the campaign page.'], ['Your storefront', 'part of the channel plan, alongside your website, email and social.'], ['Dates that matter', 'openings, launches, seasonal promotions and events: anything with a date and a goal.']],
    ctaH: 'Got something to promote?', ctaP: 'Tell us what it is, when it happens and who you want to reach.' },
  { key: 'print', file: 'print-design-sonoma-county.html', svc: 'print.html', n: 5, short: 'Print & creative',
    title: 'Print design in Sonoma County: Sync Race Studios', h1: 'Print design in Sonoma County',
    desc: 'Print design for Sonoma County businesses: business cards, flyers, menus, posters and signage, delivered print-ready and matched to your website and brand.',
    lede: 'Business cards, flyers, menus, posters and signs for Sonoma County businesses, designed to match your website and Google listing, and delivered as print-ready files.',
    btn: 'Start a print job',
    incH: 'Creative for the real world',
    inc: [['Business cards and stationery', 'letterheads, envelopes, thank-you cards.'], ['Flyers, postcards and rack cards', 'for counters, mailers and local events.'], ['Menus and price lists', 'easy to read and easy to update for next season.'], ['Posters, banners and signage', 'from window decals to event banners.'], ['Print-ready files', 'CMYK, bleed and crop marks set up for your printer, plus PDFs for sharing.']],
    priceH: '$125 an hour, estimate first', prices: [['$125/hr', 'print design']],
    priceP: 'You get the final print files and editable source files.',
    locH: 'Printed locally, tracked online',
    loc: [['A local printer', 'we send files to your printer, or coordinate printing with a local shop and pass the cost through at quote.'], ['QR codes', 'that point to the right page, so you can tell which piece worked.'], ['Reviews', 'a QR code on receipts and table cards brings customers to your Google profile.'], ['Same look as online', 'the same colours, type and message as your website and listing.']],
    ctaH: 'Need something printed?', ctaP: 'Tell us what it is, how many, and when you need it.' },
  { key: 'apps', file: 'business-apps-sonoma-county.html', svc: 'apps.html', n: 9, short: 'Business apps',
    title: 'Business apps in Sonoma County: Sync Race Studios', h1: 'Small business apps in Sonoma County',
    desc: 'Small web apps for Sonoma County businesses: booking, intake forms, dashboards, reports and automations, built, hosted and managed by Sync Race Studios.',
    lede: 'Small, focused tools for Sonoma County businesses that take repetitive work off your week: bookings, forms, reports and dashboards. We build the one tool that removes the task eating your week, then host and manage it for you.',
    btn: 'Describe the job',
    incH: 'The kind of jobs we take off your plate',
    inc: [['Booking and scheduling', 'customers or vendors pick dates; you approve from one place.'], ['Intake and request forms', 'quotes, applications and work orders, sent to the right person automatically.'], ['Dashboards and reports', 'your numbers each morning, without an hour of exporting.'], ['Directories and catalogues', 'searchable, filterable lists of places, products or services.'], ['Automations', 'emails, reminders and hand-offs that happen on their own.']],
    priceH: 'Quoted per project', prices: [],
    priceP: 'Each app is quoted on its own: a build price and a monthly hosting and management fee, based on what it does and how much data it handles.',
    locH: 'Connected to how customers find you',
    loc: [['Your website', 'hosts the forms and booking customers use.'], ['Google Business Profile', 'can link straight to your booking page.'], ['Ads', 'track a completed booking as a conversion, not just a click.'], ['Your team', 'sees everything in one dashboard instead of five inboxes.']],
    ctaH: 'Got a job eating your week?', ctaP: 'Tell us what it looks like. We\'ll say honestly whether it\'s worth building.' },
  { key: 'content', file: 'blog-content-sonoma-county.html', svc: 'content.html', n: 8, short: 'Content engine',
    title: 'Blog writing in Sonoma County: Sync Race Studios', h1: 'Blog content for Sonoma County businesses',
    desc: 'Regular blog posts for Sonoma County business websites, on local and seasonal topics, written for Google and AI search. An optional $50/month add-on.',
    lede: 'The content engine adds new blog posts to your website on a regular schedule, on topics that fit your business and your area, so your site keeps working for you between updates. It is optional, and $50 a month.',
    btn: 'Add the content engine',
    incH: 'What the content engine does',
    inc: [['Topics that fit your business', 'local events, seasons, questions your customers ask, and news in your industry.'], ['Posts on a regular schedule', 'so your site never sits still.'], ['Written for search and AI', 'clear headings, schema markup and internal links on every post.'], ['Published to your site', 'added to your blog, sitemap and llms.txt automatically.'], ['Your voice', 'written to match your business, your area and the way you talk to customers.']],
    priceH: '$50 a month, optional', prices: [['$50/mo', 'content engine add-on']],
    priceP: 'Add it to any website we host. You can stop anytime, and your existing posts stay on your site.',
    locH: 'Local topics, all year',
    loc: [['Seasons and events', 'seasonal and local topics added as the year goes on.'], ['Your area', 'posts written for your business, your area and your customers.'], ['Your Google profile', 'new posts can be shared as updates on your profile.'], ['AI assistants', 'more clear answers about your business for ChatGPT, Claude and Perplexity to draw on.']],
    ctaH: 'Keep your site posting.', ctaP: 'Tell us about your business and the topics you want to be known for.' },
];
const LOCAL_BY = Object.fromEntries(LOCAL.map(o => [o.key, o]));

const svcList = (pre) => `<div class="svcs">${SVC.map(s => `
      <a class="svc rise" href="${pre}${s.file}">
        <svg data-fold="${s.n}" width="56" height="56"></svg>
        <div><h3>${s.t}</h3><p>${s.d}</p><small>${s.s}</small><span class="more">${s.key === 'pricing' ? 'See pricing' : 'Learn more'} <span aria-hidden="true">→</span></span></div>
      </a>`).join('')}
    </div>`;
const steps = (arr) => `<div class="steps">${arr.map(([n, t, d]) => `
        <div class="step rise"><svg data-fold="${n}" width="64" height="64"></svg><div><b>${t}</b><span>${d}</span></div></div>`).join('')}
      </div>`;
const list = (arr) => `<ul class="list">${arr.map(([b, t]) => `<li><b>${b}</b>${t ? ` ${t}` : ''}</li>`).join('')}</ul>`;
let FAQS = [];
const faq = (arr) => (FAQS.push(...arr), `<div class="faq">${arr.map(([q, a]) => `
        <details><summary>${q}</summary><p>${a}</p></details>`).join('')}
      </div>`);
const cta = (h, p, href = 'contact.html', label = 'Get started') => `
  <section class="shell">
    <div class="cta rise">
      <div><h2>${h}</h2><p>${p}</p></div>
      <a class="btn" href="${href}">${label} <span class="arrow" aria-hidden="true">→</span></a>
    </div>
  </section>
`;
const folds = () => `<div class="folds" aria-hidden="true">${Array.from({ length: 10 }, (_, i) =>
  `<div class="fold"><svg data-fold="${i + 1}" width="${Math.round(22 + i * 4.4)}" height="${Math.round(22 + i * 4.4)}"></svg><span>${i + 1}</span></div>`).join('')}</div>`;

const workRow = (pre, w) => `
        <article class="work-row">
          <${w.case ? `a class="work-media rise" href="${pre}${w.case}" aria-label="${w.t} case study"` : 'div class="work-media rise"'}>
            <div class="frame">
              <div class="frame-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="frame-url">${w.url}</span></div>
              <img class="shot" src="${pre === './pages/' ? './' : '../'}assets/work/${w.img}" alt="${w.alt}" width="1600" height="${w.h || 1000}" loading="lazy" decoding="async">
            </div>${w.phone ? `
            <div class="phone"><img src="${pre === './pages/' ? './' : '../'}assets/work/${w.phone}" alt="" width="600" height="1299" loading="lazy" decoding="async"${w.pos ? ` style="object-position:${w.pos}"` : ''}></div>` : ''}
          </${w.case ? 'a' : 'div'}>
          <div class="work-body rise">
            <div class="pills">${w.pills.map((p, i) => `<span class="pill ${i ? 'pill-blue' : 'pill-lamp'}">${p}</span>`).join('')}</div>
            <h3>${w.t}</h3>
            <p>${w.d}</p>
            <div class="btns">${w.case ? `
              <a class="btn" href="${pre}${w.case}">Read the case study <span class="arrow" aria-hidden="true">→</span></a>` : ''}${w.site ? `
              <a class="btn btn-quiet" href="${w.site}" target="_blank" rel="noopener">Visit site<span class="sr-only"> (opens in a new tab)</span></a>` : ''}
            </div>
          </div>
        </article>`;
const WORK = [
  { t: 'Wanderlust Santa Rosa', url: 'wanderlustsantarosa.com', img: 'wanderlust-home.webp', phone: 'wanderlust-application.webp', pos: '72% 40%', case: 'wanderlust.html', site: 'https://wanderlustsantarosa.com/', pills: ['Website', 'Business app'],
    alt: 'Wanderlust Santa Rosa home page: a red food truck under string lights at dusk, with the headline Thursday night, food truck festival.',
    d: 'A weekly food truck festival in Old Courthouse Square. The public site shows this Thursday\'s lineup; behind it, vendors pick their Thursdays on a live calendar and the market manager approves them from an admin dashboard.' },
  { t: 'Stay Santa Rosa', url: 'staysantarosa.com', img: 'stay-home.webp', phone: 'stay-mobile.webp', case: 'staysantarosa.html', site: 'https://staysantarosa.com/', pills: ['Website', 'Travel guide'],
    alt: 'Stay Santa Rosa home page: redwoods behind the headline One City Worth Exploring, with a hotel booking bar along the bottom.',
    d: 'A travel guide to Santa Rosa and Sonoma wine country, created by two downtown hotels. Dining, wine, attractions and a searchable directory of 79 places, with booking that sends guests straight to each hotel.' },
];
const SURF = { t: 'Surfline 8th Ave. So', url: 'surflinejaxbeach.com', img: 'surfline.webp', h: 864, pills: ['Website', 'Availability calendar'],
  alt: 'Surfline 8th Ave. So rental website home page.',
  d: 'A marketing website for an Airbnb/VRBO rental in Jacksonville, Florida. With an integrated availability calendar, the owner can now market their rental directly.' };

const own = `
  <section class="band shell">
    <div class="col">
      <span class="kicker rise">Hosted and managed</span>
      <h2 class="rise">We build it, host it and look after it.</h2>
      <p class="stack rise">Websites and apps run on our stack: <b>Vercel</b> hosting, <b>Supabase</b> data and <b>Cloudflare</b> in front, managed by us. Websites are <b>$25/month</b> and come with a <b>built-in editor</b>, so you can change your own content any time. Bigger changes and Google and print work are billed <b>hourly</b>, quoted before we start.</p>
      <div class="btns rise"><a class="btn btn-quiet" href="./pages/pricing.html">See pricing <span class="arrow" aria-hidden="true">→</span></a></div>
    </div>
  </section>`;

/* =================== HOME =================== */
page('index.html', {
  title: 'Sync Race Studios: Websites, Google, print and apps for local businesses',
  desc: 'Sync Race Studios is a business services partner: website design, logo design and branding, Google Business Profile setup, Google Ads, print marketing and small business apps, all connected.',
  path: '',
}, `
  <section class="shell hero">
    <div class="col">
      <span class="kicker rise">Business services</span>
      <h1 class="rise">Every piece of your business, in one unbroken line.</h1>
      <p class="lede rise">Sync Race Studios helps local businesses get found and run smoothly: <strong>websites, logo design and branding, Google Business Profile and Ads, marketing campaigns, print and small apps</strong> that save time. One partner, every piece connected.</p>
      <div class="hero-btns rise"><a class="btn" href="./pages/contact.html">Get started <span class="arrow" aria-hidden="true">→</span></a><a class="btn btn-quiet" href="#services">See services</a></div>
      <p class="scroll-hint rise"><i></i>Scroll, and the line keeps folding</p>
    </div>
  </section>

  <section class="band shell">
    <div class="col right">
      <h2 class="rise">One line, folded ten times.</h2>
      <p class="lede rise">Fold a strip of paper in half ten times, then open every crease to a right angle. You get <strong>one unbroken line of 1,024 steps</strong> that never runs over itself.</p>
      <p class="lede rise">Most small businesses juggle a web designer, an ads person, a print shop and a spreadsheet nobody owns. Each one is a fold. We take all of them and open them into a single line, so your website, your Google listing, your ads and your flyers all say the same thing and lead to the same place.</p>
      <div class="rise">${folds()}</div>
      <div class="btns rise"><a class="btn btn-quiet" href="./pages/about.html">The story behind the logo <span class="arrow" aria-hidden="true">→</span></a></div>
    </div>
  </section>

  <section class="band shell" id="services">
    <div class="head">
      <span class="kicker rise">Services</span>
      <h2 class="rise">What we do for your business</h2>
      <p class="rise">Pick one piece or hand us the whole line. Every service is built to connect to the others.</p>
    </div>
    ${svcList('./pages/')}
  </section>

  <section class="band shell" id="work">
    <div class="head">
      <span class="kicker rise">Selected work</span>
      <h2 class="rise">Live, in use, and looked after by us.</h2>
    </div>
    <div class="work">${WORK.map(w => workRow('./pages/', w)).join('')}
    </div>
    <div class="btns rise" style="margin-top:clamp(3rem,6vw,4.5rem)"><a class="btn btn-quiet" href="./pages/work.html">All work <span class="arrow" aria-hidden="true">→</span></a></div>
  </section>

  <section class="band shell" id="process">
    <div class="col right">
      <span class="kicker rise">How it works</span>
      <h2 class="rise">How a project flows</h2>
      <p class="lede rise">Each stage grows out of the one before it, the same way each fold doubles the line.</p>
      ${steps([
        [2, 'Talk', 'What your business needs, who your customers are, and what\'s already in place. Free, with no pitch deck.'],
        [4, 'Plan and price', 'A written scope and price for each piece. It doesn\'t change unless you ask it to.'],
        [7, 'Build and launch', 'Site, profile, campaigns and print files, shared on real previews as they come together.'],
        [10, 'Host and manage', 'Websites and apps stay with us: hosted, updated, backed up and watched. Edit your own content with the built-in editor; bigger changes are billed by the hour.'],
      ])}
    </div>
  </section>
${own}

  <section class="band shell">
    <div class="head">
      <span class="kicker rise">Resources</span>
      <h2 class="rise">Best practices, in plain language</h2>
    </div>
    <div class="posts">${POSTS.slice(0, 4).map((p, i) => `
      <a class="post rise" href="./pages/${p.slug}">
        <svg data-fold="${[10, 6, 9, 4, 8][i % 5]}" width="56" height="56"></svg>
        <div><span class="pill pill-lamp">${p.tag}</span><h3>${p.title}</h3><small>${p.read} min read</small></div>
      </a>`).join('')}
    </div>
    <div class="btns rise" style="margin-top:clamp(2rem,5vw,3rem)"><a class="btn btn-quiet" href="./pages/resources.html">All resources <span class="arrow" aria-hidden="true">→</span></a></div>
  </section>
${cta('Tell us what your business needs.', 'A couple of sentences is plenty. You\'ll get a real reply from the person doing the work, usually the same day.', './pages/contact.html')}`);

/* =================== SERVICES OVERVIEW =================== */
page('services.html', {
  title: 'Services: Sync Race Studios',
  desc: 'Website design, Google Business Profile setup, Google Ads, print marketing and small business apps for local businesses, from one partner.',
  path: 'pages/services.html', pageType: 'CollectionPage', crumb: 'Services',
}, `
  <section class="shell page-top">
    <div class="col">
      <span class="kicker rise">Services</span>
      <h1 class="rise">One partner for the whole line.</h1>
      <p class="lede rise">Getting found, looking the part, and running smoothly usually takes four or five different vendors. We handle every piece, and make sure each one hands off cleanly to the next.</p>
    </div>
  </section>

  <section class="band shell" style="padding-top:clamp(2rem,5vw,3.5rem)">
    ${svcList('./')}
  </section>

  <section class="band shell">
    <div class="col">
      <span class="kicker rise">Sonoma County</span>
      <h2 class="rise">Serving businesses across Sonoma County</h2>
      <div class="rise">${list(LOCAL.map(o => [`<a href="${o.file}">${o.h1}</a>`, '']))}</div>
    </div>
  </section>

  <section class="band shell">
    <div class="col right">
      <span class="kicker rise">How the pieces connect</span>
      <h2 class="rise">Each fold leads to the next.</h2>
      ${list([
        ['A flyer', 'carries a QR code to the right page of your website, not just the home page.'],
        ['Your website', 'shows the same name, hours and phone number as your Google Business Profile, so Google trusts both.'],
        ['Your Google profile', 'links to booking or ordering, and its reviews and photos appear where customers are already searching.'],
        ['Google Ads', 'send people to pages built for the ad, with tracking that tells you which calls and forms came from them.'],
        ['A small app', 'takes the bookings, requests or orders that all of this brings in, and keeps them in one place.'],
      ])}
    </div>
  </section>

  <section class="band shell">
    <div class="col">
      <span class="kicker rise">Questions</span>
      <h2 class="rise">Good to know</h2>
      ${faq([
        ['Do I have to buy everything?', 'No. Start with whichever piece matters most. Many clients begin with a Google Business Profile or a website and add the rest later.'],
        ['Who hosts my website or app?', 'We do. Every website and app we build is hosted and managed by us, so one team is responsible for keeping it fast, secure and working. Websites are $25/month; apps have a monthly fee quoted with the build.'],
        ['How is pricing handled?', 'Websites have a one-time build fee and $25/month hosting, with a built-in editor for your own content changes. Bigger changes are billed hourly. Apps are quoted per project. Google Business Profile, Google Ads and print work are billed hourly, with an estimate before we start. <a href="pricing.html">See pricing</a>.'],
        ['Whose name are my Google accounts in?', 'Yours. Your Google Business Profile and Google Ads account are set up under your Google account, and we work inside them as a manager.'],
        ['Can you work with what I already have?', 'Yes. We can take over an existing website, claim a profile someone else set up, or clean up an ads account that isn\'t tracking properly.'],
      ])}
    </div>
  </section>
${cta('Not sure where to start?', 'Tell us about your business and what you want more of: calls, bookings, foot traffic or time back. We\'ll suggest the first fold.')}`);

/* =================== SERVICE PAGES =================== */
const OFFERS = {
  website: [
    { '@type': 'Offer', priceCurrency: 'USD', priceSpecification: { '@type': 'PriceSpecification', minPrice: 1500, priceCurrency: 'USD', description: 'One-time build from $1,500. Bigger changes after launch billed at $125/hour.' } },
    { '@type': 'Offer', name: 'Hosting and built-in content editor', priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: 25, priceCurrency: 'USD', unitCode: 'MON', unitText: 'month' } }],
  google: HOURLY, print: HOURLY, branding: HOURLY, marketing: HOURLY,
  content: { '@type': 'Offer', priceCurrency: 'USD', price: 50, priceSpecification: { '@type': 'UnitPriceSpecification', price: 50, priceCurrency: 'USD', unitCode: 'MON', unitText: 'month' } },
};

const svcPage = (o) => page(o.file, { title: `${o.title}: Sync Race Studios`, desc: o.desc, path: `pages/${o.file}`, crumb: o.title, service: { name: o.title, offers: OFFERS[o.key] } }, `
  <section class="shell page-top">
    <div class="split" style="align-items:end">
      <div class="col">
        <span class="kicker rise">${o.kicker}</span>
        <h1 class="rise">${o.h1}</h1>
        <p class="lede rise">${o.lede}</p>
        <div class="hero-btns rise"><a class="btn" href="contact.html?about=${o.key}">${o.btn} <span class="arrow" aria-hidden="true">→</span></a><a class="btn btn-quiet" href="services.html">All services</a></div>${LOCAL_BY[o.key] ? `
        <p class="rise local-link">In Sonoma County? <a href="${LOCAL_BY[o.key].file}">${LOCAL_BY[o.key].h1}</a></p>` : ''}
      </div>
      <div class="rise" aria-hidden="true" style="justify-self:center"><svg data-fold="${o.n}" data-sw="1.4" width="260" height="260" style="width:min(260px,60vw);height:auto;aspect-ratio:1"></svg></div>
    </div>
  </section>

  <section class="band shell">
    <div class="col">
      <span class="kicker rise">What's included</span>
      <h2 class="rise">${o.incH}</h2>
      <div class="rise">${list(o.inc)}</div>
    </div>
  </section>
${o.extra || ''}
  <section class="band shell">
    <div class="col right">
      <span class="kicker rise">How it works</span>
      <h2 class="rise">${o.stepH}</h2>
      ${steps(o.steps)}
    </div>
  </section>

  <section class="band shell">
    <div class="col">
      <span class="kicker rise">How it connects</span>
      <h2 class="rise">${o.conH}</h2>
      <div class="rise">${list(o.con)}</div>
    </div>
  </section>

  <section class="band shell">
    <div class="col right">
      <span class="kicker rise">Questions</span>
      <h2 class="rise">Good to know</h2>
      ${faq(o.faq)}
    </div>
  </section>
${cta(o.ctaH, o.ctaP, `contact.html?about=${o.key}`)}`);

svcPage({
  file: 'websites.html', key: 'website', n: 10, kicker: 'Website design', title: 'Website design',
  desc: 'Custom websites for local businesses, optimized for Google and AI search, with a built-in editor for your own content changes. Hosting is $25/month. Built by Sync Race Studios.',
  h1: 'A website that fits your business.', btn: 'Start a website',
  lede: 'Designed and built from an empty file around what your customers actually come to you for. Server-side rendered, fast and optimized, with schema markup for Google and AI search, and hosted by us for $25 a month, with a built-in editor so you can change your own content.',
  incH: 'Everything a site needs to launch',
  inc: [['Custom design', 'in your colours, type and photography, never a template with your logo dropped in.'], ['Server-side rendered', 'every page arrives as finished HTML, so it loads fast and search engines and AI assistants read all of it.'], ['Fast and optimized', 'lean, mobile-first code, compressed images and caching, so pages load quickly on any phone.'], ['Schema markup', 'structured data that tells Google and AI search exactly what your business is, where it is and what it offers.'], ['Optimized for AI search', 'schema markup, llms.txt and clearly written pages, so ChatGPT, Claude, Perplexity and Google AI Overviews can understand and recommend your business.'], ['Search basics', 'page titles, descriptions, sitemap and fast load times for Google and Bing.'], ['Analytics and search listings', 'Google Analytics set up, and your site added to Google Search Console and Bing Webmaster Tools.'], ['Forms that reach you', 'contact, quote and booking forms delivered to your inbox.'], ['Hosting for $25/month', 'on Vercel and Cloudflare, managed by us, with updates, backups and monitoring.'], ['Privacy and accessibility', 'consent-based analytics, a privacy policy and a WCAG 2.2 AA target.'], ['Built-in content editor', 'sign in on your own site, change text, photos and lists right on the page, and publish in about a minute. Every change can be undone. <a href="../demo">Try the demo</a>.']],
  extra: `
  <section class="band shell">
    <div class="head"><span class="kicker rise">Recent sites</span><h2 class="rise">Live and in use</h2></div>
    <div class="work">${WORK.map(w => workRow('./', w)).join('')}
    </div>
  </section>`,
  stepH: 'From first call to launch',
  steps: [[2, 'Discover', 'Goals, audience, content and timeline, agreed together.'], [4, 'Design', 'Layouts and a visual direction you approve before we build.'], [7, 'Build', 'Clean code on a live preview link, so you\'re never guessing from a flat picture.'], [10, 'Launch and manage', 'We put it live and host it for $25 a month. You edit your own content with the built-in editor; bigger changes are billed by the hour.']],
  conH: 'The hub of the whole line',
  con: [['Google Business Profile', 'links here, with matching name, hours and phone number.'], ['Google Ads', 'land on pages written for each campaign, with conversion tracking built in.'], ['Print', 'QR codes point to specific pages, so you can see which flyer worked.'], ['Business apps', 'like booking or intake forms plug straight into the site.']],
  faq: [['Can you redesign the site I already have?', 'Yes. We carry over the content that works, fix speed and search issues, and rebuild it mobile first.'], ['Will I be able to edit it myself?', 'Yes. Every site comes with a built-in editor: open your site, sign in with your email, change text, photos and lists in place, and publish. Every change is kept in a history you can undo, and the site stays plain HTML underneath, so it\'s never locked to a tool.'], ['What happens after launch?', 'We host and manage the site for $25 a month. You can make content changes yourself with the built-in editor; new pages, features or design changes are billed at $125 an hour, quoted first.'], ['What does a website cost?', 'Builds start from $1,500, then $25 a month for hosting and the built-in editor. Bigger changes after launch are $125 an hour. <a href="pricing.html">See pricing</a>.']],
  ctaH: 'Tell us about your site.', ctaP: 'What your business does and what the site needs to do. Rough is fine.',
});

svcPage({
  file: 'google-business.html', key: 'google', n: 6, kicker: 'Google Business Profile & Ads', title: 'Google Business Profile and Google Ads',
  desc: 'Google Business Profile setup and Google Ads management for local businesses: show up on Search and Maps, run ads that bring in customers, and track what each dollar brings in.',
  h1: 'Get found on Google, then get chosen.', btn: 'Talk about Google',
  lede: 'Your Google Business Profile puts you on Search and Maps for free. Google Ads put you at the top when it matters most. We set up both properly, connect them, and track what they bring in.',
  incH: 'Google Business Profile',
  inc: [['Claim or create', 'your profile, or recover one someone else set up.'], ['Verification', 'walked through with you, using whichever method Google offers your business.'], ['Categories and services', 'chosen carefully, with your services, products and service area filled in.'], ['Hours, holidays and attributes', 'accurate and matching your website everywhere.'], ['Photos, posts and updates', 'to show your space and work, and share offers and news.'], ['Reviews', 'a simple way to ask happy customers for reviews, and help drafting replies.']],
  extra: `
  <section class="band shell" id="ads">
    <div class="col">
      <span class="kicker rise">What's included</span>
      <h2 class="rise">Google Ads</h2>
      <div class="rise">${list([['Account setup', 'in your name, with billing on your card so spend is always visible to you.'], ['Keyword research', 'around what your customers type, and the searches you don\'t want to pay for.'], ['Campaigns', 'Search, local and Performance Max where they make sense for your business.'], ['Ad copy and assets', 'headlines, descriptions, images, call and location assets.'], ['Landing pages', 'written for each campaign, so clicks arrive somewhere that answers the search.'], ['Conversion tracking', 'calls, forms and bookings measured with Google Analytics 4 and Google Ads, with consent.'], ['Monthly report', 'what you spent, what it brought in, and what we\'re changing next.']])}</div>
    </div>
  </section>`,
  stepH: 'From search result to customer',
  steps: [[2, 'Audit', 'What Google already shows for your business, and what\'s missing or wrong.'], [4, 'Profile', 'Claim, verify and complete every section, matched to your website.'], [6, 'Ads and tracking', 'Keywords, ads, landing pages and conversion tracking, set up before anything goes live.'], [9, 'Refine and report', 'Fresh posts and photos, review replies, and campaigns tuned on what actually brings in customers.']],
  conH: 'How profile and ads work together',
  con: [['Local ads', 'can show your location, hours and reviews straight from your profile.'], ['Your website', 'shares the same details as your profile and provides the landing pages for ads.'], ['Tracking', 'shows calls, direction requests and bookings from both, in one place.'], ['Print', 'can carry a QR code that takes customers straight to leave a review.']],
  faq: [['Can you guarantee a top spot on Google?', 'No one honestly can. Maps rankings depend on relevance, distance and prominence, and ad positions on your bids and ad quality. A complete, active profile and well-built campaigns give you the best chance.'], ['How is this billed?', 'At $125 an hour, with an estimate before we start. Ad spend goes directly to Google on your own card. <a href="pricing.html">See pricing</a>.'], ['How much should I spend on ads?', 'It depends on your area, your industry and what a customer is worth to you. We\'ll suggest a starting budget to test, and you set the limit.'], ['Who owns the profile and ads account?', 'You do. Both are set up under your Google account, and we\'re added as a manager you can remove at any time.'], ['Can you fix what someone else set up?', 'Yes. We can recover a profile, and audit an ads account, fixing the tracking first and then the campaigns.']],
  ctaH: 'Get your business seen on Google.', ctaP: 'Tell us your business name, whether you have a profile today, and whether you\'re running ads.',
});

svcPage({
  file: 'branding.html', key: 'branding', n: 4, kicker: 'Logo design & branding', title: 'Logo design and branding',
  desc: 'Logo design and branding for local businesses: a logo, colour palette, typefaces and a simple brand guide that work on your website, Google listing, signage and print.',
  h1: 'A brand that holds together everywhere.', btn: 'Start a brand',
  lede: 'A logo is the first fold. We design your mark and the small set of rules around it, colours, type and tone, so your website, Google listing, menus and signs all look like the same business.',
  incH: 'What you get',
  inc: [['Logo design', 'a primary logo, a simplified mark for small spaces, and versions for light and dark backgrounds.'], ['Colour palette', 'a few colours with exact values for screen and print.'], ['Typefaces', 'heading and body fonts that work on the web and in print.'], ['Brand guide', 'one page showing how to use it all, so anyone can keep it consistent.'], ['Every file you need', 'SVG, PNG and PDF, plus a favicon and social profile images.'], ['Refresh or start fresh', 'we can tidy up a logo you already have or design a new one from scratch.']],
  extra: `
  <section class="band shell">
    <div class="col">
      <span class="kicker rise">Our own mark</span>
      <h2 class="rise">Ten folds, one line</h2>
      <p class="lede rise">Our logo is a dragon curve: a strip of paper folded ten times and opened into one line that never crosses itself. It\'s the kind of thinking we bring to every brand: one simple idea that carries everywhere.</p>
      <div class="btns rise"><a class="btn btn-quiet" href="about.html">The story behind it <span class="arrow" aria-hidden="true">→</span></a></div>
    </div>
  </section>`,
  stepH: 'From idea to brand guide',
  steps: [[2, 'Listen', 'Your business, your customers, what you want people to feel, and what you don\'t.'], [4, 'Explore', 'A few distinct logo directions, shown on real things: a sign, a card, a phone screen.'], [6, 'Refine', 'One direction, developed with colours and type, with a round of changes included.'], [8, 'Deliver', 'Final files and a one-page brand guide, ready for web and print.']],
  conH: 'Where branding fits',
  con: [['Your website', 'uses the same colours, type and logo from day one.'], ['Google Business Profile', 'gets a matching logo and cover image.'], ['Print', 'business cards, menus and signs all follow the brand guide.'], ['Ads and social', 'graphics look like you, so people recognise you before they read the name.']],
  faq: [['How is branding billed?', 'At $125 an hour, with an estimate before we start. <a href="pricing.html">See pricing</a>.'], ['Do I own my logo?', 'Yes. You get the final logo files and the rights to use them for your business.'], ['Can you work with the logo I already have?', 'Yes. We can redraw it cleanly, build colours and type around it, or refresh it without losing what customers recognise.']],
  ctaH: 'Ready for a brand that fits?', ctaP: 'Tell us about your business and whether you have a logo today.',
});

svcPage({
  file: 'marketing.html', key: 'marketing', n: 3, kicker: 'Marketing campaigns', title: 'Marketing campaigns',
  desc: 'Marketing campaign help for local businesses: plan the message, pick the channels, make the creative and track the results of a launch, season or event.',
  h1: 'Campaigns with a beginning, a middle and results.', btn: 'Plan a campaign',
  lede: 'A grand opening, a new menu, a holiday rush, an event. We help you plan the campaign around it, make everything it needs, and see what it brought in.',
  incH: 'Everything a campaign needs',
  inc: [['Goal and offer', 'what the campaign is for and why someone should act now.'], ['Channel plan', 'the mix that fits your customers: Google, social, email, print, your website and your storefront.'], ['Campaign calendar', 'what goes out where, and when, from teaser to last call.'], ['Creative', 'headlines, ad copy, social graphics, flyers and short video, all in your brand.'], ['Landing page', 'one page on your site that every channel points to, so nothing gets lost.'], ['Tracking', 'links, codes and conversions set up so you can see which channel worked.'], ['Wrap-up report', 'what it cost, what it brought in, and what to keep for next time.']],
  stepH: 'How a campaign comes together',
  steps: [[2, 'Brief', 'The goal, the offer, the dates and the budget.'], [4, 'Plan', 'Channels, calendar and message, agreed before anything is made.'], [6, 'Create and launch', 'Creative, landing page and tracking, then everything goes live on schedule.'], [9, 'Measure', 'Results gathered across channels, with lessons for the next one.']],
  conH: 'Where campaigns fit',
  con: [['Your website', 'hosts the landing page every channel points to.'], ['Google Business Profile & Ads', 'carry the offer to people searching nearby.'], ['Print', 'flyers, posters and table cards with QR codes back to the campaign page.'], ['Branding', 'keeps every piece of the campaign looking like you.']],
  faq: [['How is campaign help billed?', 'At $125 an hour, with an estimate before we start. Ad spend and printing are separate. <a href="pricing.html">See pricing</a>.'], ['Can you just help me plan, and I run it?', 'Yes. Some clients want the plan and creative only; others want us to run it end to end.'], ['What kind of campaigns?', 'Openings, launches, seasonal promotions, events, re-openings and anything with a date and a goal.']],
  ctaH: 'Got something to promote?', ctaP: 'Tell us what it is, when it happens and who you want to reach.',
});

svcPage({
  file: 'content.html', key: 'content', n: 8, kicker: 'Content engine', title: 'Content engine for your blog',
  desc: 'An optional $50/month add-on from Sync Race Studios that keeps your website fresh with new blog posts on a regular schedule, optimized for Google and AI search.',
  h1: 'A site that keeps posting, without you.', btn: 'Add the content engine',
  lede: 'Search engines and AI assistants favour sites that stay current. The content engine adds new blog posts to your website on a regular schedule, so it keeps working for you between updates. It is optional, and $50 a month.',
  incH: 'What the content engine does',
  inc: [['Topics that fit your business', 'local events, seasons, questions your customers ask, and news in your industry.'], ['Posts on a regular schedule', 'so your site never sits still.'], ['Written for search and AI', 'clear headings, schema markup and internal links on every post.'], ['Published to your site', 'added to your blog, sitemap and llms.txt automatically.'], ['Your voice', 'written to match your business, your area and the way you talk to customers.']],
  extra: `
  <section class="band shell">
    <div class="col">
      <span class="kicker rise">Pricing</span>
      <h2 class="rise">$50 a month, optional</h2>
      <div class="prices rise"><div class="price"><b>$50/mo</b><span>content engine add-on</span></div></div>
      <p class="lede rise">Add it to any website we host. Your site works without it; the content engine just keeps it fresh. See it in action on <a href="resources.html" style="color:var(--lamp-ink)">our own resources page</a>.</p>
    </div>
  </section>`,
  stepH: 'How it runs',
  steps: [[2, 'Set the direction', 'Your services, your area, and the topics you want to be known for.'], [5, 'Plan topics', 'A running list of posts built around what your customers search for.'], [8, 'Write and publish', 'New posts go live on schedule, with schema and links in place.'], [10, 'Keep it relevant', 'Seasonal and local topics added as the year goes on.']],
  conH: 'Why it matters',
  con: [['Search', 'fresh, useful pages give Google and Bing more reasons to show your site.'], ['AI assistants', 'more clear answers about your business for ChatGPT, Claude and Perplexity to draw on.'], ['Your Google profile', 'new posts can be shared as updates on your profile.'], ['Social', 'every post is something new to share.']],
  faq: [['Is it required?', 'No. It is an optional add-on for websites we host.'], ['What does it cost?', '$50 a month. <a href="pricing.html">See pricing</a>.'], ['Can I stop it?', 'Yes. Your existing posts stay on your site.']],
  ctaH: 'Keep your site posting.', ctaP: 'Tell us about your business and the topics you want to be known for.',
});

svcPage({
  file: 'print.html', key: 'print', n: 5, kicker: 'Print & creative', title: 'Print marketing and creative',
  desc: 'Print marketing design for local businesses: business cards, flyers, menus, posters and signage, delivered print-ready and matched to your brand.',
  h1: 'Print that looks like you, and leads somewhere.', btn: 'Start a print job',
  lede: 'Business cards, flyers, menus, posters and signs, designed to match your website and Google listing, and delivered as print-ready files.',
  incH: 'Creative for the real world',
  inc: [['Business cards and stationery', 'letterheads, envelopes, thank-you cards.'], ['Flyers, postcards and rack cards', 'for counters, mailers and local events.'], ['Menus and price lists', 'easy to read and easy to update for next season.'], ['Posters, banners and signage', 'from window decals to event banners.'], ['Social and email graphics', 'in the same look, sized for each platform.'], ['Print-ready files', 'CMYK, bleed and crop marks set up for your printer, plus PDFs for sharing.'], ['QR codes', 'that point to the right page, so you can tell which piece worked.']],
  stepH: 'From brief to box of prints',
  steps: [[2, 'Brief', 'What it\'s for, where it\'ll live, sizes, quantities and deadline.'], [4, 'Design', 'Drafts in your brand, with a round of changes included.'], [6, 'Proof', 'Final proof checked for spelling, contact details and print setup.'], [8, 'Print', 'Files sent to your printer, or we\'ll coordinate with a local one.']],
  conH: 'Where print fits',
  con: [['Your website', 'gets the visits, through QR codes that land on the right page.'], ['Google Business Profile', 'gets reviews, through a QR code on receipts and table cards.'], ['Brand consistency', 'same colours, type and message as everything online.'], ['Ads', 'and print can share campaign artwork, so each reinforces the other.']],
  faq: [['Do you print, or just design?', 'We design and prepare print-ready files. We can send them to your printer, or coordinate printing with a local shop and pass the cost through at quote.'], ['Can you work from my existing logo?', 'Yes. If you only have a low-quality version, we can rebuild it as a clean vector file.'], ['Do I own the files?', 'Yes. You get the final print files and editable source files.']],
  ctaH: 'Need something printed?', ctaP: 'Tell us what it is, how many, and when you need it.',
});

svcPage({
  file: 'apps.html', key: 'apps', n: 9, kicker: 'Business apps', title: 'Small business apps',
  desc: 'Small web apps that make local businesses more efficient: booking, intake forms, dashboards, reporting and automations, built by Sync Race Studios.',
  h1: 'Small tools that give you hours back.', btn: 'Describe the job',
  lede: 'Most software charges you for a hundred features you\'ll never open. We build the one tool that removes the task eating your week, then host and manage it for you.',
  incH: 'The kind of jobs we take off your plate',
  inc: [['Booking and scheduling', 'customers or vendors pick dates; you approve from one place.'], ['Intake and request forms', 'quotes, applications, work orders, sent to the right person automatically.'], ['Dashboards and reports', 'your numbers each morning, without an hour of exporting.'], ['Directories and catalogues', 'searchable, filterable lists of places, products or services.'], ['Ticketing and task tracking', 'maintenance requests or jobs, with status everyone can see.'], ['Automations', 'emails, reminders and hand-offs that happen on their own.'], ['Logins and secure data', 'built on Supabase, with only the people you choose able to see it.']],
  extra: `
  <section class="band shell">
    <div class="head"><span class="kicker rise">Built and running</span><h2 class="rise">A few we've made</h2></div>
    <div class="cards">
      <a class="card rise" href="wanderlust.html"><span class="pill pill-lamp">Markets and events</span><h3>Wanderlust vendor app</h3><p>Food trucks pick their Thursdays on a live calendar, the manager approves them from one dashboard, and the public lineup updates itself.</p><span class="more">Case study <span aria-hidden="true">→</span></span></a>
      <a class="card rise" href="staysantarosa.html"><span class="pill pill-lamp">Hotels and tourism</span><h3>Stay Santa Rosa directory</h3><p>79 places to eat, drink and explore, searchable by name, cuisine or street, with an open-now switch and a map.</p><span class="more">Case study <span aria-hidden="true">→</span></span></a>
      <a class="card rise" href="https://htmlv.srcs.online" target="_blank" rel="noopener"><span class="pill pill-lamp">Website tools</span><h3>Visual HTML editor</h3><p>Click a heading on your own site and retype it. No code, and it\'s still plain HTML underneath.</p><span class="more">Try it<span class="sr-only"> (opens in a new tab)</span> <span aria-hidden="true">→</span></span></a>
      <div class="card rise"><span class="pill pill-lamp">Hotels</span><h3>Morning reporting</h3><p>A hotel group gets its numbers each morning, without an hour of exporting from the property system.</p></div>
    </div>
  </section>`,
  stepH: 'From a messy task to a tool',
  steps: [[2, 'Describe the job', 'Show us the spreadsheet, inbox or paper form. We\'ll say honestly whether it\'s worth building.'], [4, 'Scope', 'One clear job, written down, with a fixed price.'], [7, 'Build', 'A working version on a real link early, refined with the people who\'ll use it.'], [10, 'Host and manage', 'Hosting on Vercel, data in Supabase, updates and backups, all looked after by us.']],
  conH: 'Where apps fit',
  con: [['Your website', 'hosts the forms and booking customers use.'], ['Google Business Profile', 'can link straight to your booking page.'], ['Ads', 'track a completed booking as a conversion, not just a click.'], ['Your team', 'sees everything in one dashboard instead of five inboxes.']],
  faq: [['Is this for big companies?', 'No. These are small, focused tools for independent businesses: one job, done well.'], ['How are apps priced?', 'Each app is quoted on its own: a build price and a monthly hosting and management fee, based on what it does and how much data it handles.'], ['What if my needs change?', 'We extend it. Changes and new features are quoted before we start.']],
  ctaH: 'Got a job eating your week?', ctaP: 'Tell us what it looks like. We\'ll say honestly whether it\'s worth building.',
});


/* =================== SONOMA COUNTY PAGES (rendered after the service pages) =================== */
const LOCAL_WORK = WORK.filter(w => w.case);
const localPage = (o) => page(o.file, { title: o.title, desc: o.desc, path: `pages/${o.file}`, crumb: o.h1,
  service: { name: `${o.short} in Sonoma County`, offers: OFFERS[o.key], areaServed: AREA } }, `
  <section class="shell page-top">
    <div class="split" style="align-items:end">
      <div class="col">
        <span class="kicker rise">Sonoma County</span>
        <h1 class="rise">${o.h1}</h1>
        <p class="lede rise">${o.lede}</p>
        <div class="hero-btns rise"><a class="btn" href="contact.html?about=${o.key}">${o.btn} <span class="arrow" aria-hidden="true">→</span></a><a class="btn btn-quiet" href="${o.svc}">Full service details</a></div>
      </div>
      <div class="rise" aria-hidden="true" style="justify-self:center"><svg data-fold="${o.n}" data-sw="1.4" width="260" height="260" style="width:min(260px,60vw);height:auto;aspect-ratio:1"></svg></div>
    </div>
  </section>

  <section class="band shell">
    <div class="col">
      <span class="kicker rise">What's included</span>
      <h2 class="rise">${o.incH}</h2>
      <div class="rise">${list(o.inc)}</div>
    </div>
  </section>

  <section class="band shell">
    <div class="col right">
      <span class="kicker rise">Pricing</span>
      <h2 class="rise">${o.priceH}</h2>${o.prices.length ? `
      <div class="prices rise">${o.prices.map(([a, b]) => `<div class="price"><b>${a}</b><span>${b}</span></div>`).join('')}</div>` : ''}
      <p class="lede rise">${o.priceP} <a href="pricing.html" style="color:var(--lamp-ink)">See pricing</a>.</p>
    </div>
  </section>

  <section class="band shell">
    <div class="col">
      <span class="kicker rise">Local search</span>
      <h2 class="rise">${o.locH}</h2>
      <div class="rise">${list(o.loc)}</div>
    </div>
  </section>

  <section class="band shell">
    <div class="head"><span class="kicker rise">Local work</span><h2 class="rise">Built in Santa Rosa</h2></div>
    <div class="cards">${LOCAL_WORK.map(w => `
      <a class="card rise" href="${w.case}"><span class="pill pill-lamp">${w.pills.join(' and ')}</span><h3>${w.t}</h3><p>${w.d}</p><span class="more">Case study <span aria-hidden="true">→</span></span></a>`).join('')}
    </div>
  </section>

  <section class="band shell">
    <div class="col right">
      <span class="kicker rise">Also in Sonoma County</span>
      <h2 class="rise">More ways we can help</h2>
      <div class="rise">${list(LOCAL.filter(x => x !== o).map(x => [`<a href="${x.file}">${x.h1}</a>`, '']))}</div>
    </div>
  </section>
${cta(o.ctaH, o.ctaP, `contact.html?about=${o.key}`)}`);
LOCAL.forEach(localPage);


/* =================== PRICING =================== */
const tier = (o) => `
  <section class="band shell">
    <div class="col">
      <span class="kicker rise">${o.kicker}</span>
      <h2 class="rise">${o.h}</h2>
      <div class="prices rise">${o.prices.map(([a, b]) => `<div class="price"><b>${a}</b><span>${b}</span></div>`).join('')}</div>
      <p class="lede rise">${o.p}</p>
      <div class="rise">${list(o.inc)}</div>
      <div class="btns rise"><a class="btn" href="contact.html?about=${o.key}">${o.btn} <span class="arrow" aria-hidden="true">→</span></a></div>
    </div>
  </section>`;
page('pricing.html', {
  title: 'Pricing: Sync Race Studios',
  desc: 'Sync Race Studios pricing: websites from $1,500 plus $25/month hosting with a built-in content editor, optimized for AI search, an optional $50/month content engine, business apps quoted per project, and Google and print work at $125/hour.',
  path: 'pages/pricing.html',
  extraLd: [{ '@type': 'OfferCatalog', name: 'Sync Race Studios pricing', itemListElement: [
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Website design and build' }, priceCurrency: 'USD', priceSpecification: { '@type': 'PriceSpecification', minPrice: 1500, priceCurrency: 'USD', description: 'One-time build.' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Website hosting and built-in content editor' }, priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: 25, priceCurrency: 'USD', unitCode: 'MON', unitText: 'month' } },
    { ...HOURLY, itemOffered: { '@type': 'Service', name: 'Website changes after launch' } },
    { ...HOURLY, itemOffered: { '@type': 'Service', name: 'Logo design and branding' } },
    { ...HOURLY, itemOffered: { '@type': 'Service', name: 'Google Business Profile and Google Ads' } },
    { ...HOURLY, itemOffered: { '@type': 'Service', name: 'Marketing campaigns' } },
    { ...HOURLY, itemOffered: { '@type': 'Service', name: 'Print and creative' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Content engine (blog add-on)' }, price: 50, priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: 50, priceCurrency: 'USD', unitCode: 'MON', unitText: 'month' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Business apps' }, description: 'Quoted per app: build price plus monthly hosting and management.' },
  ] }],
}, `
  <section class="shell page-top">
    <div class="col">
      <span class="kicker rise">Pricing</span>
      <h1 class="rise">Clear prices, no surprises.</h1>
      <p class="lede rise">Websites are built by us, then hosted for $25 a month with a built-in editor so you can change your own content. Bigger changes, branding, Google, campaign and print work are billed by the hour, with an estimate before any work starts. Apps are quoted per project.</p>
    </div>
  </section>
${tier({ kicker: 'Websites', key: 'website', btn: 'Start a website', h: 'Built, hosted and managed',
  prices: [['From $1,500', 'one-time build'], ['$25/mo', 'hosting and built-in editor'], ['$125/hr', 'changes after launch']],
  p: 'The build fee depends on the number of pages and features. Once it\'s live, we host it for $25 a month, and you can change your own text and photos with the built-in editor. Anything bigger is billed by the hour.',
  inc: [['Custom design and build', 'server-side rendered, fast and optimized, with schema markup on every page.'], ['Optimized for AI search', 'schema markup, llms.txt and clearly written pages, so AI assistants like ChatGPT, Claude, Perplexity and Google AI Overviews can find and recommend you.'], ['Google Analytics', 'set up with a consent banner, so you can see who visits and what they do.'], ['Google Search Console and Bing Webmaster Tools', 'your site added and its sitemap submitted to both, so Google and Bing find every page.'], ['Hosting for $25/month', 'on Vercel, with Cloudflare in front and SSL included.'], ['Built-in content editor', 'change text, photos and lists on your own site and publish in about a minute, with a full history you can undo. <a href="../demo">Try the demo</a>.'], ['Bigger changes and new features', 'billed at $125/hour, quoted first.']] })}
${tier({ kicker: 'Content engine', key: 'content', btn: 'Add the content engine', h: 'Optional blog add-on',
  prices: [['$50/mo', 'new blog posts on a regular schedule']],
  p: 'Keep your website fresh without lifting a finger. Optional, for any website we host.',
  inc: [['Regular blog posts', 'on topics that fit your business, your area and your customers.'], ['Written for search and AI', 'schema markup, headings and internal links on every post.'], ['Published automatically', 'added to your blog, sitemap and llms.txt.']] })}
${tier({ kicker: 'Business apps', key: 'apps', btn: 'Describe the job', h: 'Quoted per app',
  prices: [['Custom quote', 'build and monthly management']],
  p: 'Every app does a different job, so each one is priced on its own: a build price plus a monthly fee for hosting and managing it, based on what it does and how much data it handles.',
  inc: [['Fixed build price', 'agreed in writing before we start.'], ['Hosting and data', 'on Vercel and Supabase, managed by us.'], ['Updates, backups and monitoring', 'included in the monthly fee.'], ['Changes and new features', 'quoted before we start.']] })}
${tier({ kicker: 'Branding, Google, campaigns and print', key: 'other', btn: 'Get an estimate', h: 'Billed by the hour',
  prices: [['$125/hr', 'Branding · Google Profile & Ads · Campaigns · Print']],
  p: 'You get an estimate in hours before any work starts, and you only pay for the time used.',
  inc: [['Logo design & branding', 'logo, colour palette, type and a one-page brand guide.'], ['Google Business Profile & Ads', 'profile setup, verification, posts and review replies; ad campaigns, tracking and ongoing management. Ad spend is paid directly to Google, on your card.'], ['Marketing campaigns', 'campaign plans, creative, landing pages and tracking. Ad spend is separate.'], ['Print & creative', 'business cards, flyers, menus, signage and social graphics. Printing costs are quoted separately.']] })}

  <section class="band shell">
    <div class="col right">
      <span class="kicker rise">Questions</span>
      <h2 class="rise">Good to know</h2>
      ${faq([
        ['Why do you host the websites and apps you build?', 'So one team is responsible for keeping them fast, secure and working. You don\'t have to deal with hosting accounts, updates or outages.'],
        ['What does the website build fee depend on?', 'Mostly the number of pages and features such as booking, forms or a directory. You get a fixed price in writing before we start.'],
        ['How does hourly billing work?', 'We estimate the hours before we start. If a job looks like it will run over, we tell you before going further.'],
        ['Is Google Ads spend included?', 'No. Ad spend is paid directly to Google on your own card. Our $125/hour covers setting up and managing the campaigns.'],
      ])}
    </div>
  </section>
${cta('Want a number for your project?', 'Tell us what you need and we\'ll come back with a price or an hourly estimate.')}`);



/* =================== RESOURCES =================== */
const DATE = '2026-11-21', DATE_H = 'November 21, 2026';
POSTS.forEach(p => {
  const url = SITE + 'pages/' + p.slug;
  page(p.slug, { title: `${p.title}: Sync Race Studios`, desc: p.desc, path: `pages/${p.slug}`, crumb: p.short,
    extraLd: [{ '@type': 'BlogPosting', headline: p.title, description: p.desc, url, mainEntityOfPage: url,
      datePublished: DATE, dateModified: DATE, articleSection: p.tag,
      author: { '@id': SITE + '#org' }, publisher: { '@id': SITE + '#org' }, image: SITE + 'assets/srcs-curve.svg' }] }, `
  <article class="shell article">
    <header class="page-top">
      <div class="col">
        <a class="kicker rise" href="resources.html">Resources · ${p.tag}</a>
        <h1 class="rise">${p.title}</h1>
        <p class="post-meta rise">${DATE_H} · ${p.read} min read · Sync Race Studios</p>
        <p class="lede rise">${p.lede}</p>
      </div>
    </header>
    <div class="post-body">${p.body.map(([h, html]) => `
      <section class="rise"><h2>${h}</h2>${html}</section>`).join('')}
    </div>
    <nav class="post-more" aria-label="More resources">
      <h2>More resources</h2>
      <ul class="list">${POSTS.filter(o => o !== p).map(o => `<li><a href="${o.slug}">${o.title}</a></li>`).join('')}</ul>
    </nav>
  </article>
${cta('Want help putting this into practice?', "Tell us about your business and we’ll suggest where to start.")}`);
});

page('resources.html', {
  title: 'Resources: website, search, branding and advertising guides for small businesses',
  desc: 'Practical guides from Sync Race Studios on website design, search and AI visibility, branding and Google Ads for small businesses.',
  path: 'pages/resources.html', pageType: 'CollectionPage', crumb: 'Resources',
  extraLd: [{ '@type': 'Blog', name: 'Sync Race Studios resources', url: SITE + 'pages/resources.html', publisher: { '@id': SITE + '#org' },
    blogPost: POSTS.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: SITE + 'pages/' + p.slug, datePublished: DATE })) }],
}, `
  <section class="shell page-top">
    <div class="col">
      <span class="kicker rise">Resources</span>
      <h1 class="rise">Best practices for being found and chosen.</h1>
      <p class="lede rise">Plain-language guides on website design, search, branding and advertising for small businesses. No jargon, no upsell.</p>
    </div>
  </section>
  <section class="band shell" style="padding-top:clamp(1.5rem,4vw,2.5rem)">
    <div class="posts">${POSTS.map((p, i) => `
      <a class="post rise" href="${p.slug}">
        <svg data-fold="${[10, 6, 9, 4, 8][i % 5]}" width="56" height="56"></svg>
        <div><span class="pill pill-lamp">${p.tag}</span><h3>${p.title}</h3><p>${p.desc}</p><small>${DATE_H} · ${p.read} min read</small></div>
      </a>`).join('')}
    </div>
  </section>
${cta("Have a question we haven’t covered?", "Ask us. If it’s useful to others, it might become the next guide.")}`);

/* =================== SITEMAP (HTML) =================== */
const SM = [
  ['Main', [['../index.html', 'Home'], ['services.html', 'Services'], ['pricing.html', 'Pricing'], ['work.html', 'Work'], ['about.html', 'About'], ['contact.html', 'Get started']]],
  ['Services', [['websites.html', 'Website design'], ['branding.html', 'Logo design & branding'], ['google-business.html', 'Google Business Profile & Ads'], ['marketing.html', 'Marketing campaigns'], ['content.html', 'Content engine'], ['print.html', 'Print & creative'], ['apps.html', 'Business apps']]],
  ['Sonoma County', LOCAL.map(o => [o.file, o.h1])],
  ['Resources', [['resources.html', 'All resources'], ...POSTS.map(p => [p.slug, p.short])]],
  ['Work', [['wanderlust.html', 'Wanderlust Santa Rosa case study'], ['staysantarosa.html', 'Stay Santa Rosa case study'], ['arcade.html', 'Playground']]],
  ['Legal', [['privacy.html', 'Privacy policy'], ['terms.html', 'Terms of use'], ['accessibility.html', 'Accessibility statement'], ['../sitemap.xml', 'XML sitemap']]],
];
page('sitemap.html', {
  title: 'Sitemap: Sync Race Studios',
  desc: 'Every page on srcs.online: services, pricing, work, about and legal pages.',
  path: 'pages/sitemap.html', crumb: 'Sitemap',
}, `
  <section class="shell page-top">
    <div class="col">
      <span class="kicker rise">Sitemap</span>
      <h1 class="rise">Every page, in one place.</h1>
    </div>
  </section>
  <section class="band shell" style="padding-top:clamp(1.5rem,4vw,2.5rem)">
    <div class="cards">${SM.map(([h, links]) => `
      <nav class="card rise" aria-label="${h}"><h3>${h}</h3>${list(links.map(([f, l]) => [`<a href="${f}">${l}</a>`, '']))}</nav>`).join('')}
    </div>
  </section>
`);

/* =================== WORK =================== */
page('work.html', {
  title: 'Work: Sync Race Studios',
  desc: 'Websites and business apps by Sync Race Studios: Wanderlust Santa Rosa, Stay Santa Rosa and Surfline 8th Ave. So.',
  path: 'pages/work.html', pageType: 'CollectionPage', crumb: 'Work',
}, `
  <section class="shell page-top">
    <div class="col">
      <span class="kicker rise">Work</span>
      <h1 class="rise">Live, in use, and looked after by us.</h1>
      <p class="lede rise">Every project below is live. Click through and have a proper look.</p>
    </div>
  </section>
  <section class="band shell" style="padding-top:clamp(2rem,5vw,3.5rem)">
    <div class="work">${[...WORK, SURF].map(w => workRow('./', w)).join('')}
    </div>
  </section>
${cta('Want one of these?', 'Send a couple of sentences about your business and what you need.')}`);

/* =================== ABOUT =================== */
page('about.html', {
  title: 'About: the dragon curve behind Sync Race Studios',
  desc: 'Why the Sync Race Studios logo is a dragon curve: a strip of paper folded ten times and opened into one line of 1,024 steps that never crosses itself.',
  path: 'pages/about.html', pageType: 'AboutPage', crumb: 'About',
}, `
  <section class="shell page-top">
    <div class="split" style="align-items:center">
      <div class="col">
        <span class="kicker rise">About</span>
        <h1 class="rise">One strip. Ten folds. No crossings.</h1>
        <p class="lede rise">Our logo isn't a drawing. It's the shape you get when you fold a strip of paper in half ten times and open it back up. It's also the best description we have of what we do.</p>
      </div>
      <div class="rise" aria-hidden="true" style="justify-self:center"><svg data-fold="10" data-sw="1.3" width="320" height="320" style="width:min(320px,70vw);height:auto;aspect-ratio:1"></svg></div>
    </div>
  </section>

  <section class="band shell">
    <div class="col">
      <span class="kicker rise">The fold</span>
      <h2 class="rise">How to make the curve</h2>
      <p class="lede rise">Take a long strip of paper. Fold it in half, always in the same direction. Fold it again, and again, ten times in all. Now open it up so that every crease sits at exactly 90°.</p>
      <p class="lede rise">What you're holding is a <strong>dragon curve</strong>: one line of <strong>1,024 straight steps</strong> joined by <strong>1,023 right-angle turns</strong>. However many times you fold, the line never runs back over itself. Corners can touch, but no step is ever drawn twice.</p>
    </div>
  </section>

  <section class="band shell" id="unfold">
    <div class="head">
      <span class="kicker rise">Try it</span>
      <h2 class="rise">Unfold it yourself</h2>
      <p class="rise">Drag the slider, or press play, to add one fold at a time.</p>
    </div>
    <div class="unfold rise">
      <div class="unfold-stage"><svg id="uf-svg" role="img" aria-labelledby="uf-label"><title id="uf-label">Dragon curve</title><path id="uf-path" fill="none" stroke="var(--lamp)" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" stroke-width="2"/></svg></div>
      <div class="unfold-ctl">
        <div class="count" aria-live="polite"><span id="uf-n">1</span><small>fold<span id="uf-s"></span></small></div>
        <label for="uf-range" class="sr-only">Number of folds</label>
        <input id="uf-range" type="range" min="1" max="10" step="1" value="1">
        <div class="unfold-stats">
          <div><b id="uf-seg">2</b>steps</div>
          <div><b id="uf-turn">1</b>turns</div>
          <div><b>0</b>crossings</div>
        </div>
        <p class="muted" style="font-size:15px">The creases, read from one end (R = right turn, L = left):</p>
        <p class="seq" id="uf-seq"></p>
        <div><button class="btn" type="button" id="uf-play">Play the folds</button></div>
      </div>
    </div>
  </section>

  <section class="band shell">
    <div class="col right">
      <span class="kicker rise">The rule</span>
      <h2 class="rise">Simple steps, whole result</h2>
      <p class="lede rise">Every new fold follows one rule: <strong>keep the line you have, add a right turn, then add the same line again, backwards and mirrored.</strong></p>
      ${steps([
        [1, 'One fold', 'R'],
        [2, 'Two folds', 'R · R · L'],
        [3, 'Three folds', 'R R L · R · R L L'],
        [10, 'Ten folds', '1,023 creases, each one decided by the folds before it.'],
      ])}
      <p class="lede rise" style="margin-top:44px">No single fold is complicated. The order is what makes the whole thing hold together.</p>
    </div>
  </section>

  <section class="band shell">
    <div class="col">
      <span class="kicker rise">Like Sync Race</span>
      <h2 class="rise">We take all the folds and unwind them into one chain.</h2>
      <p class="lede rise">A local business has a lot of folds. A website. A Google listing. Ads. Business cards and flyers. The spreadsheet that runs the bookings. Usually each one was made by someone different, at a different time, and they pile up on top of each other: different hours here, an old logo there, a flyer pointing at a page that no longer exists.</p>
      <p class="lede rise">We open all of them out into a single line.</p>
      <div class="rise">${list([
        ['No overlap.', 'One partner, so no two vendors are doing the same job, or undoing each other\'s.'],
        ['One direction.', 'Every piece hands off to the next: a flyer\'s QR code to the website, the website to your Google profile, the profile to booking.'],
        ['Nothing out of sync.', 'Same name, hours, look and message everywhere a customer might find you.'],
        ['Each step on its own.', 'You can start with one fold and add the rest later. The line still runs true.'],
      ])}</div>
    </div>
  </section>

  <section class="band shell">
    <div class="col right">
      <span class="kicker rise">The mark</span>
      <h2 class="rise">Ten folds, one colour</h2>
      <p class="lede rise">The logo is the ten-fold curve drawn as a single terracotta line with softened corners and no wordmark. It sits behind every page of this site too, faintly, and draws itself as you scroll, so by the time you reach the bottom of a page you've unfolded the whole thing.</p>
      <div class="btns rise"><a class="btn btn-quiet" href="../assets/srcs-curve.svg" download>Download the mark (SVG)</a></div>
    </div>
  </section>
${cta('Let\'s unfold your business.', 'Tell us which pieces you have and which are missing. We\'ll show you how they connect.')}`, `
<script>
document.addEventListener('DOMContentLoaded', () => {
  const C = window.SRCurve, svg = document.getElementById('uf-svg'), path = document.getElementById('uf-path');
  const range = document.getElementById('uf-range'), play = document.getElementById('uf-play');
  const out = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = null;
  function show(n, animate) {
    const f = C.fit(C.points(n), .1);
    svg.setAttribute('viewBox', f.vb); path.setAttribute('d', f.d);
    out('uf-n').textContent = n; out('uf-s').textContent = n === 1 ? '' : 's';
    out('uf-seg').textContent = (2 ** n).toLocaleString(); out('uf-turn').textContent = (2 ** n - 1).toLocaleString();
    const s = C.turns(n).map(t => t > 0 ? 'R' : 'L'), max = 63;
    out('uf-seq').innerHTML = s.slice(0, max).map(c => c === 'R' ? '<span class="r">R</span>' : 'L').join('') + (s.length > max ? ' …' : '');
    if (animate && !reduce) {
      const L = path.getTotalLength();
      path.style.transition = 'none'; path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
      path.getBoundingClientRect();
      path.style.transition = 'stroke-dashoffset .9s cubic-bezier(.22,.61,.36,1)'; path.style.strokeDashoffset = 0;
    } else { path.style.strokeDasharray = 'none'; path.style.strokeDashoffset = 0; }
  }
  range.addEventListener('input', () => { stop(); show(+range.value, true); });
  function stop() { clearInterval(timer); timer = null; play.textContent = 'Play the folds'; }
  play.addEventListener('click', () => {
    if (timer) return stop();
    let n = 1; range.value = n; show(n, true); play.textContent = 'Pause';
    timer = setInterval(() => { n++; if (n > 10) return stop(); range.value = n; show(n, true); }, 1100);
  });
  show(1, false);
});
</script>`);

/* =================== CONTACT =================== */
page('contact.html', {
  title: 'Get started: Sync Race Studios',
  desc: 'Tell Sync Race Studios what your business needs: a website, Google Business Profile, Google Ads, print or a small app. A couple of sentences is plenty.',
  path: 'pages/contact.html', pageType: 'ContactPage', crumb: 'Get started',
}, `
  <section class="shell page-top">
    <div class="col">
      <span class="kicker rise">Get started</span>
      <h1 class="rise">Tell us what your business needs.</h1>
      <p class="lede rise">A couple of sentences is plenty to start. You'll get a reply from the person who'd actually be doing the work, usually the same day.</p>
    </div>
  </section>

  <section class="band shell" style="padding-top:clamp(2rem,4vw,3rem)">
    <div class="contact-grid">
      <form class="form rise" id="contact-form" action="/api/contact" method="POST">
        <div class="row">
          <div class="field"><label for="name">Your name</label><input id="name" name="name" type="text" autocomplete="name" required></div>
          <div class="field"><label for="email">Email <span class="hint">so we can reply</span></label><input id="email" name="email" type="email" autocomplete="email" required></div>
        </div>
        <div class="row">
          <div class="field"><label for="phone">Phone <span class="hint">optional</span></label><input id="phone" name="phone" type="tel" autocomplete="tel"></div>
          <div class="field"><label for="budget">Budget <span class="hint">a rough range is fine</span></label><input id="budget" name="budget" type="text" placeholder="Not sure yet"></div>
        </div>
        <div class="field">
          <label for="about">What do you need?</label>
          <select id="about" name="about">
            <option value="website">Website design</option>
            <option value="branding">Logo design and branding</option>
            <option value="google">Google Business Profile and Ads</option>
            <option value="marketing">A marketing campaign</option>
            <option value="content">The $50/month content engine</option>
            <option value="print">Print and creative</option>
            <option value="apps">A business app</option>
            <option value="bundle">A few of these together</option>
            <option value="care">Looking after what I already have</option>
            <option value="other">Something else</option>
          </select>
        </div>
        <div class="field">
          <label for="message">Tell us a bit more</label>
          <textarea id="message" name="message" required placeholder="What does your business do, and what do you want more of: calls, bookings, foot traffic, time back?"></textarea>
        </div>
        <div class="trap" aria-hidden="true"><label for="company">Company</label><input id="company" name="_gotcha" type="text" tabindex="-1" autocomplete="off"></div>
        <div><button class="btn" type="submit">Send it</button></div>
        <p class="form-note" id="form-status" role="status" aria-live="polite"></p>
      </form>

      <aside class="cards" style="grid-template-columns:minmax(0,1fr);gap:36px">
        <div class="card rise"><h3>Rather just email?</h3><p><a href="mailto:hello@srcs.online" style="color:var(--lamp-ink);font-weight:500">hello@srcs.online</a></p></div>
        <div class="card rise"><h3>What happens next</h3><p>We read it and reply with some questions, a suggested first step, or an honest "we're not the right fit." No automated sequence, no drip emails.</p></div>
        <div class="card rise"><h3>No budget yet?</h3><p>That's fine. Tell us the problem anyway and we'll give you a rough number so you know what you're planning for.</p></div>
      </aside>
    </div>
  </section>
`, `
<script>
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const button = form.querySelector('button[type="submit"]');
  // Deep links like contact.html?about=ads preselect the dropdown.
  const asked = new URLSearchParams(location.search).get('about');
  if (asked) { const opt = document.querySelector('#about option[value="' + CSS.escape(asked) + '"]'); if (opt) opt.selected = true; }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    button.disabled = true; const label = button.textContent; button.textContent = 'Sending…'; status.textContent = '';
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      form.reset(); status.textContent = 'Thanks, that came through. You\\'ll hear back shortly.';
    } catch (err) {
      status.textContent = /name|email|code|HTML|long|messages/.test(err.message) ? err.message : 'That didn\\'t send. Email hello@srcs.online directly and it\\'ll reach us.';
    } finally { button.disabled = false; button.textContent = label; }
  });
</script>`);


/* =================== POST-PROCESS: pre-render the chrome =================== */
const navSrc = fs.readFileSync(`${ROOT}/nav.js`, 'utf8');
const shared = navSrc.slice(navSrc.indexOf('/* @shared-start'), navSrc.indexOf('/* @shared-end'));
const { navHTML, footHTML, SRCurve } = new Function(shared + '\nreturn { navHTML, footHTML, SRCurve };')();
const YEAR = new Date().getFullYear();

// Breadcrumb trails: file -> [[label, file], ...] after Home. Last item is the page itself.
const SVC_NAMES = { 'websites.html': 'Website design', 'branding.html': 'Logo design & branding', 'google-business.html': 'Google Business Profile & Ads', 'marketing.html': 'Marketing campaigns', 'content.html': 'Content engine', 'print.html': 'Print & creative', 'apps.html': 'Business apps' };
const SIMPLE = { 'services.html': 'Services', 'pricing.html': 'Pricing', 'about.html': 'About', 'contact.html': 'Get started', 'work.html': 'Work', 'resources.html': 'Resources', 'sitemap.html': 'Sitemap', 'privacy.html': 'Privacy policy', 'terms.html': 'Terms of use', 'accessibility.html': 'Accessibility statement', 'arcade.html': 'Playground' };
const CASES = { 'wanderlust.html': 'Wanderlust Santa Rosa', 'staysantarosa.html': 'Stay Santa Rosa' };
const trail = f => {
  if (SVC_NAMES[f]) return [['Services', 'services.html'], [SVC_NAMES[f], f]];
  const loc = LOCAL.find(o => o.file === f);
  if (loc) return [['Services', 'services.html'], [SVC_NAMES[loc.svc], loc.svc], ['Sonoma County', f]];
  if (CASES[f]) return [['Work', 'work.html'], [CASES[f], f]];
  const post = POSTS.find(p => p.slug === f);
  if (post) return [['Resources', 'resources.html'], [post.short, f]];
  if (SIMPLE[f]) return [[SIMPLE[f], f]];
  return null;
};

const foldPass = html => html.replace(/<svg data-fold="(\d+)"([^>]*)>(?:\s*<use[^>]*\/>\s*|\s*<path[^>]*\/>\s*)?<\/svg>/g, (m, n, a) => {
  const sw = (a.match(/data-sw="([\d.]+)"/) || [])[1] || 1.6;
  let cls = ((a.match(/class="([^"]*)"/) || [])[1] || '').split(/\s+/).filter(c => c && c !== 'fold-icon').join(' ');
  let style = ((a.match(/style="([^"]*)"/) || [])[1] || '').split(';').map(x => x.trim()).filter(x => x && !/^stroke-width/.test(x)).join(';');
  const attrs = a.replace(/\s(data-sw|data-drawn|class|style|aria-hidden|focusable|viewBox)="[^"]*"/g, '');
  return SRCurve.icon(+n, { sw: +sw, cls, attrs, style });
});

/* ---------- SRCS CMS ----------
   Marks text inside <main> as editable, then re-applies edits saved in cms/content.json.
   Editable: h1 (except article titles), section headings, intros, paragraphs, card titles and
   notes, "how it works" steps, and list items.
   Locked on purpose, so edits can't break the site or put visible text out of step with the
   structured data Google reads: article titles (BlogPosting headline), prices (OfferCatalog),
   FAQs (FAQPage), forms, interactive pieces, buttons, link lists and anything with an id or
   script hook.
   Keys follow page order per kind (title, heading-N, lede-N, text-N…). Existing kinds keep
   their numbering, so saved edits stay attached. */
const CMS_LOADER = '<script src="https://cms.srcs.online/loader.js" data-site="srcs" defer></script>';
const CMS_FILE = `${ROOT}/cms/content.json`;
const CMS_DATA = fs.existsSync(CMS_FILE) ? JSON.parse(fs.readFileSync(CMS_FILE, 'utf8')) : { files: {}, globals: {} };
const CMS_SKIP_TAGS = new Set(['form', 'details', 'nav', 'svg', 'script', 'style', 'noscript', 'template', 'button', 'select', 'label', 'textarea', 'site-nav', 'site-foot']);
const CMS_SKIP_CLASS = /(^|\s)(faq|prices|price|unfold|folds|crumbs|trap|frame-bar|more)(\s|$)/;
const hasClass = (cls, name) => new RegExp(`(^|\\s)${name}(\\s|$)`).test(cls);
const cmsAttr = (n, k) => n.attrs?.find((a) => a.name === k)?.value;
const plainText = (inner) => !/[<>]/.test(inner) && inner.trim().length > 0;
// A [CLIENT TO SUPPLY] marker may sit inside editable copy; publishing an edit unwraps it.
const simpleInline = (inner) => { inner = inner.replace(/<span class="supply">([^<]*)<\/span>/g, '$1'); return !/<(?!\/?(strong|em|b|i|br|a)\b)[a-z]/i.test(inner) && !/\s(style|class|id|data-[a-z-]+)=/.test(inner) && inner.trim().length > 0; };

function cms(html, rel) {
  // Start clean so the marking is the same on every build.
  html = html.replace(/<span data-cms="button-\d+">([^<]*)<\/span>/g, '$1').replace(/ data-cms(?:-type)?="[^"]*"/g, '');
  const doc = parse5.parse(html, { sourceCodeLocationInfo: true });
  const isArticle = POSTS.some((p) => rel === `pages/${p.slug}`);
  const n = { heading: 0, lede: 0, h2: 0, subhead: 0, text: 0, item: 0, note: 0, stepTitle: 0, stepText: 0, kicker: 0, tag: 0, wellTitle: 0, wellText: 0, term: 0, detail: 0, itemLink: 0, cell: 0, button: 0, image: 0, caption: 0 };
  let h1done = false;
  const inserts = [];
  const mark = (node, key, rich) => {
    const loc = node.sourceCodeLocation;
    if (!loc?.startTag || !loc?.endTag) return false;
    const inner = html.slice(loc.startTag.endOffset, loc.endTag.startOffset);
    let type;
    if (plainText(inner)) type = '';
    else if (rich !== false && simpleInline(inner)) type = ' data-cms-type="rich"';
    else return false;
    inserts.push([loc.startTag.endOffset - 1, ` data-cms="${key}"${type}`]);
    return true;
  };
  // Images: the attribute goes inside the start tag (void element, maybe written as "/>").
  const markImage = (node, key) => {
    const loc = node.sourceCodeLocation?.startTag;
    if (!loc || !cmsAttr(node, 'src')) return false;
    let at = loc.endOffset - 1;
    if (html[at - 1] === '/') at -= 1;
    while (/\s/.test(html[at - 1])) at -= 1;
    inserts.push([at, ` data-cms="${key}"`]);
    return true;
  };
  // Buttons: only the label text becomes editable (wrapped in a span), never the link or icon.
  const markButton = (node, key) => {
    const t = (node.childNodes || []).find((c) => c.nodeName === '#text' && c.value.trim());
    const loc = t?.sourceCodeLocation;
    if (!loc) return false;
    const raw = html.slice(loc.startOffset, loc.endOffset);
    const lead = raw.length - raw.trimStart().length, trail = raw.length - raw.trimEnd().length;
    inserts.push([loc.endOffset - trail, '</span>'], [loc.startOffset + lead, `<span data-cms="${key}">`]);
    return true;
  };
  const walk = (node, ctx) => {
    for (const c of node.childNodes || []) {
      if (!c.tagName) continue;
      const tag = c.tagName, cls = cmsAttr(c, 'class') || '';
      if (tag === 'main') { walk(c, { ...ctx, main: true }); continue; }
      if (CMS_SKIP_TAGS.has(tag) || CMS_SKIP_CLASS.test(cls) || cmsAttr(c, 'aria-hidden') === 'true') continue;
      if (!ctx.main) { walk(c, ctx); continue; }
      const id = cmsAttr(c, 'id');
      const hooked = id || c.attrs.some((a) => a.name.startsWith('data-'));
      if (tag === 'img') { if (!hooked) markImage(c, `image-${++n.image}`); continue; }
      if (tag === 'a' && hasClass(cls, 'btn')) { if (!hooked) markButton(c, `button-${++n.button}`); continue; }
      if (ctx.media) { walk(c, ctx); continue; }   // portfolio frames: photos only
      const inner = c.sourceCodeLocation?.endTag ? html.slice(c.sourceCodeLocation.startTag.endOffset, c.sourceCodeLocation.endTag.startOffset) : '';
      let key = null, rich;
      // Kinds that already have saved edits keep the exact counting they had.
      if (tag === 'h1' && !h1done) { h1done = true; if (!isArticle) key = 'title'; }
      else if (tag === 'h2' && cls === 'rise') key = `heading-${++n.heading}`;
      else if (tag === 'p' && /^lede/.test(cls)) key = `lede-${++n.lede}`;
      else if (tag === 'h2') key = `h2-${++n.h2}`;
      else if (tag === 'h3') key = `subhead-${++n.subhead}`;
      else if (tag === 'p') key = `text-${++n.text}`;
      else if (tag === 'small') key = `note-${++n.note}`;
      else if (tag === 'li' && !/<a\s/i.test(inner)) key = `item-${++n.item}`;
      else if (ctx.step && tag === 'b') key = `step-title-${++n.stepTitle}`;
      else if (ctx.step && tag === 'span' && !cls) key = `step-text-${++n.stepText}`;
      // Newer kinds count separately, so the keys above never shift.
      else if (tag === 'span' && hasClass(cls, 'kicker')) key = `kicker-${++n.kicker}`;
      else if (tag === 'span' && hasClass(cls, 'pill')) key = `tag-${++n.tag}`;
      else if (ctx.well && tag === 'b') key = `well-title-${++n.wellTitle}`;
      else if (ctx.well && tag === 'span') key = `well-text-${++n.wellText}`;
      else if (tag === 'dt') key = `term-${++n.term}`;
      else if (tag === 'dd') key = `detail-${++n.detail}`;
      else if (tag === 'li') key = `item-link-${++n.itemLink}`;
      else if (tag === 'td') key = `cell-${++n.cell}`;
      else if (tag === 'figcaption') key = `caption-${++n.caption}`;
      // Section headings that are link targets keep their id; the text is keyed by it.
      if (id && /^h[23]$/.test(tag) && !c.attrs.some((a) => a.name.startsWith('data-')) && mark(c, `section-${id}`)) continue;
      if (key && !hooked && mark(c, key, rich)) continue;
      walk(c, { ...ctx, step: ctx.step || /(^|\s)step(\s|$)/.test(cls), well: ctx.well || hasClass(cls, 'well'), media: ctx.media || hasClass(cls, 'work-media') });
    }
  };
  walk(doc, {});
  for (const [pos, text] of inserts.sort((a, b) => b[0] - a[0])) html = html.slice(0, pos) + text + html.slice(pos);
  if (!html.includes('cms.srcs.online/loader.js')) html = html.replace('</body>', `${CMS_LOADER}\n</body>`);
  const saved = Object.entries(CMS_DATA.files?.[rel] || {}).map(([key, v]) => ({ key, type: v.type, value: v.value }));
  const globals = Object.entries(CMS_DATA.globals || {}).map(([key, v]) => ({ key, global: true, type: v.type, value: v.value }));
  if (!saved.length && !globals.length) return html;
  const r = applyChanges(html, [...saved, ...globals.filter((g) => html.includes(`data-cms-global="${g.key}"`))]);
  if (r.missing.length) console.warn(`  cms: ${rel} no longer has ${r.missing.join(', ')} (saved edits skipped)`);
  return r.html;
}

// Client onboarding (srcs.online/start): no CMS editing on the admin page, and both are served at /start.
const NO_CMS = new Set(['start-admin.html']);
const ROOT_LINKS = new Set(['start.html', 'start-admin.html']);
const files = ['index.html', ...fs.readdirSync(`${ROOT}/pages`).filter(f => f.endsWith('.html')).map(f => `pages/${f}`)];
// Icons: the same dragon-curve set on every page, by absolute path.
const ICONS = '<link rel="icon" href="/favicon.ico" sizes="48x48">\n<link rel="icon" href="/assets/srcs-curve.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">\n';
for (const rel of files) {
  let html = fs.readFileSync(`${ROOT}/${rel}`, 'utf8');
  html = html.replace(/<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*>\n?/g, '').replace('</head>', ICONS + '</head>');
  if (!html.includes('<site-nav')) { fs.writeFileSync(`${ROOT}/${rel}`, html); continue; }   // e.g. the old redirect page
  const inPages = rel.startsWith('pages/'), file = path.basename(rel);
  const toPages = inPages ? './' : './pages/', toRoot = inPages ? '../' : './';

  // clear anything a previous build wrote
  html = html.replace(/<site-nav>[\s\S]*?<\/site-nav>/, '<site-nav></site-nav>')
             .replace(/<site-foot>[\s\S]*?<\/site-foot>/, '<site-foot></site-foot>')
             .replace(/<svg id="sr-folds"[\s\S]*?<\/svg>\n?/, '')
             .replace(/<a class="skip"[^>]*>[^<]*<\/a>\n?/, '')
             .replace(/<nav class="crumbs[^"]*" aria-label="Breadcrumb">[\s\S]*?<\/nav>/, '<!--crumbs-->');

  html = foldPass(html);
  html = html.replace('<site-nav></site-nav>', `<site-nav>${navHTML(file, toPages, toRoot)}</site-nav>`)
             .replace('<site-foot></site-foot>', `<site-foot>${footHTML(file, toPages, toRoot, YEAR)}</site-foot>`);

  // breadcrumbs: visible trail + BreadcrumbList schema
  const t = trail(file);
  if (t) {
    const items = [['Home', `${toRoot}index.html`, SITE], ...t.map(([l, f]) => [l, `${toPages}${f}`, `${SITE}pages/${f}`])];
    const ol = items.map(([l, href], i) => i === items.length - 1
      ? `<li><span aria-current="page">${l}</span></li>` : `<li><a href="${href}">${l}</a></li>`).join('');
    // Breadcrumbs take the place of the page's top kicker ("— Page name").
    // Legal pages have no kicker, so they go just above the h1.
    if (!html.includes('<!--crumbs-->')) {
      const at = html.indexOf('<main');
      const rest = html.slice(at);
      const k = rest.match(/<(span|a) class="kicker rise"[^>]*>[\s\S]*?<\/\1>/);
      const h = rest.match(/<h1[\s>]/);
      const pos = k && (!h || k.index < h.index) ? null : h;
      html = html.slice(0, at) + (pos ? rest.replace(/<h1([\s>])/, '<!--crumbs--><h1$1') : rest.replace(k[0], '<!--crumbs-->'));
    }
    html = html.replace('<!--crumbs-->', `<nav class="crumbs" aria-label="Breadcrumb"><ol>${ol}</ol></nav>`);
    const list = { '@type': 'BreadcrumbList', itemListElement: items.map(([l, , abs], i) => ({ '@type': 'ListItem', position: i + 1, name: l, item: abs })) };
    html = html.replace(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/, (m, j) => {
      const data = JSON.parse(j);
      data['@graph'] = (data['@graph'] || []).filter(x => x['@type'] !== 'BreadcrumbList');
      data['@graph'].push(list);
      return `<script type="application/ld+json">\n${JSON.stringify(data, null, 1)}\n</script>`;
    });
  }

  // social profiles on the business entity, every page
  html = html.replace(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/, (m, j) => {
    const data = JSON.parse(j);
    (data['@graph'] || []).forEach(x => { if (x['@type'] === 'ProfessionalService') x.sameAs = ['https://www.instagram.com/syncracestudios/']; });
    return `<script type="application/ld+json">\n${JSON.stringify(data, null, 1)}\n</script>`;
  });

  // one <symbol> per fold count used on the page, plus the skip link
  const used = [...new Set([...html.matchAll(/href="#sr-fold-(\d+)"/g)].map(m => +m[1]))].sort((a, b) => a - b);
  const defs = `<svg id="sr-folds" class="sr-defs" aria-hidden="true" focusable="false">${used.map(SRCurve.symbol).join('')}</svg>`;
  html = html.replace(/<body([^>]*)>\n?/, (m, a) => `<body${a}>\n<a class="skip" href="#main">Skip to content</a>\n${defs}\n`);
  if (!NO_CMS.has(file)) html = cms(html, rel);
  else html = html.replace(/ data-cms(?:-type)?="[^"]*"/g, '').replace(`${CMS_LOADER}\n`, '');
  // Pages served from a rewrite (srcs.online/start) need root-relative links.
  if (ROOT_LINKS.has(file)) html = html.replace(/(href|src)="\.\.\/(?!\.)/g, '$1="/').replace(/(href|src)="\.\/(?!\.)/g, '$1="/pages/');
  fs.writeFileSync(`${ROOT}/${rel}`, html);
}
console.log('built', files.length, 'pages');
