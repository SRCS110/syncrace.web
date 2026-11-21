// Resource articles. Plain data; gen.mjs renders them.
export const POSTS = [
{
  slug: 'resources-website-builders.html',
  title: 'Squarespace and Wix: where website builders hold your traffic back',
  short: 'Where website builders hold your traffic back',
  tag: 'Website design',
  desc: 'Squarespace and Wix are quick to start with, but they limit the technical control that search and AI visibility depend on. What builders do well, where they fall short, and what to ask for instead.',
  read: 6,
  lede: 'Squarespace and Wix make it easy to get a site online in an afternoon. That convenience comes with limits, and most of them show up later, in how well the site is found.',
  body: [
    ['First, what builders do well', `
      <p>It's worth being fair. Hosted builders take care of servers, security updates and SSL for you, and their templates are tested on phones. Speed in particular is not the problem many people assume it is: public Core Web Vitals data from the HTTP Archive regularly shows Wix and Squarespace sites passing Google's speed checks more often than the average WordPress site.</p>
      <p>So if a builder site is losing you traffic, it's usually not because it loads slowly. It's because of what you can't control.</p>`],
    ['You only get the controls the platform gives you', `
      <p>Search engines and AI assistants read the code behind a page, not just what it looks like. On a builder you can edit what the platform exposes, page titles, descriptions and a few settings, and not much underneath. That affects things like:</p>
      <ul>
        <li><b>Schema markup.</b> The structured data that tells Google and AI search exactly what your business is, where it operates, your services, prices and FAQs. Builders add some automatically, but adding exactly what your business needs is often limited or awkward.</li>
        <li><b>Page structure.</b> Headings, the order content loads in, and the extra scripts every page carries are set by the template, not by what's best for your content.</li>
        <li><b>URLs and site structure.</b> Builders impose their own URL patterns for blogs, products and collections, which aren't always the clean, descriptive addresses you'd choose.</li>
        <li><b>Files for AI crawlers.</b> Things like <code>llms.txt</code> or a carefully tuned <code>robots.txt</code> are either unavailable or limited.</li>
      </ul>`],
    ['Templates make you look like everyone else', `
      <p>Thousands of businesses start from the same handful of templates. Customers notice, and so does search: when your pages share the same structure and stock phrasing as everyone else in your industry, there is less to set you apart. Original, specific content about your business, your area and your services is what earns rankings and AI citations.</p>`],
    ['You rent it, you don’t own it', `
      <p>A builder site lives inside the builder. Stop paying and it goes offline, and you can't simply pick up the site and move it elsewhere; moving usually means rebuilding. Monthly plan prices also tend to rise as you add features like booking, memberships or extra storage.</p>`],
    ['What to ask for instead', `
      <p>Whoever builds your site, builder or not, ask these questions:</p>
      <ul>
        <li>Is every page rendered as finished HTML, so search engines and AI can read all of it?</li>
        <li>Can you add schema markup for my business, services, prices and FAQs?</li>
        <li>Will the site be added to Google Search Console and Bing Webmaster Tools, with a sitemap submitted?</li>
        <li>Can I choose my own URLs and page structure?</li>
        <li>What happens to the site if I stop paying you?</li>
      </ul>
      <p>Our websites are server-side rendered, fast and optimized, with schema markup on every page, and they're set up in Google Search Console and Bing Webmaster Tools from day one. <a href="websites.html">See how we build websites</a>.</p>`],
  ],
},
{
  slug: 'resources-search-console-bing.html',
  title: 'Why your website needs Google Search Console and Bing Webmaster Tools',
  short: 'Google Search Console and Bing Webmaster Tools',
  tag: 'Search',
  desc: 'Two free tools tell you whether Google and Bing can find your website, which searches bring people in, and what is broken. Why both matter, including for AI search.',
  read: 5,
  lede: 'Launching a website doesn’t mean search engines know it exists. Google Search Console and Bing Webmaster Tools are free, take minutes to set up, and are the only way to see your site the way search engines do.',
  body: [
    ['What these tools actually do', `
      <p>Both tools work the same way. You prove you own the website, then they show you:</p>
      <ul>
        <li><b>Which pages are indexed</b>, meaning eligible to appear in search, and which aren't, with the reason.</li>
        <li><b>Which searches you appear for</b>, how often people see your listing, and how often they click.</li>
        <li><b>Problems</b>, such as pages that won't load, mobile issues, broken structured data or security warnings.</li>
      </ul>
      <p>Without them you're guessing. With them, you can see that a new page hasn't been indexed yet, or that people are finding you for a service you barely mention, and act on it.</p>`],
    ['Submit your sitemap', `
      <p>A sitemap is a file that lists every page on your site. Submitting it in both tools tells Google and Bing exactly what to crawl, instead of waiting for them to discover pages through links. For a new site, or a page you've just added, that can be the difference between showing up in days and showing up in weeks.</p>`],
    ['Why Bing matters more than it used to', `
      <p>Bing's own share of searches is smaller than Google's, but its index reaches further than its search box. It powers Microsoft Copilot and feeds other search engines, and it has been widely reported as one of the sources behind ChatGPT's web search. As more people ask AI assistants for recommendations, being properly indexed in Bing is part of being visible.</p>
      <p>Bing Webmaster Tools also supports IndexNow, a way for your site to tell participating search engines the moment a page changes, and you can import a site you've already verified in Google Search Console in a few clicks.</p>`],
    ['Check in once a month', `
      <p>You don't need to live in these dashboards. Once a month is enough to:</p>
      <ul>
        <li>Look for new indexing errors and fix them.</li>
        <li>See which searches are growing, and write more about those topics.</li>
        <li>Confirm new pages have been picked up.</li>
      </ul>
      <p>Every website we build is added to Google Search Console and Bing Webmaster Tools with its sitemap submitted, along with Google Analytics. <a href="pricing.html">See what's included</a>.</p>`],
  ],
},
{
  slug: 'resources-backlinks.html',
  title: 'Backlinks: why they matter and how a local business can earn them',
  short: 'How to earn backlinks',
  tag: 'Search',
  desc: 'Links from other websites are one of the strongest signals search engines use. Why backlinks matter, which ones count, and practical ways a local business can earn them without buying links.',
  read: 6,
  lede: 'A backlink is a link to your website from someone else’s. To search engines, each good one is a vote of confidence, and for a small business a handful of the right ones can matter more than anything else you change on your site.',
  body: [
    ['Why backlinks matter', `
      <p>Search engines use links to discover pages and to judge which ones to trust. A link from a respected, relevant site tells Google and Bing that your business is real and worth showing. AI assistants lean on the same signals: the businesses they recommend tend to be the ones other reputable sites already mention and link to.</p>
      <p>Links also send visitors directly. A link from your local chamber of commerce or a neighbourhood guide brings people who are already looking for what you do.</p>`],
    ['Quality beats quantity', `
      <p>One link from a local newspaper, a trade association or a well-known business in your area is worth more than hundreds from directories nobody visits. The links that count are:</p>
      <ul>
        <li><b>Relevant</b>: from sites connected to your industry or your area.</li>
        <li><b>Trusted</b>: from real organisations with real readers.</li>
        <li><b>Earned</b>: given because your business, page or work deserved it.</li>
      </ul>`],
    ['Where a local business can earn links', `
      <ul>
        <li><b>Your Google Business Profile and key directories.</b> Start with Google, Bing Places, Apple Business Connect, Yelp and the directories for your industry. Keep your name, address and phone number identical everywhere.</li>
        <li><b>Local organisations.</b> Chambers of commerce, business associations and downtown groups often list members with a link.</li>
        <li><b>Suppliers, partners and clients.</b> Businesses you work with may have a "partners", "stockists" or "where to find us" page. Ask to be included.</li>
        <li><b>Sponsorships and community events.</b> Sponsoring a school fundraiser, sports team or festival usually earns a mention and a link on their site.</li>
        <li><b>Local press.</b> A new location, an anniversary, a community project or an unusual story can earn coverage from local news sites and blogs.</li>
        <li><b>Useful content.</b> A genuinely helpful guide, checklist or local resource on your site gives others a reason to link to you without being asked.</li>
        <li><b>Expert quotes.</b> Offer your expertise to local journalists and industry blogs; quoted sources are often linked.</li>
      </ul>`],
    ['What to avoid', `
      <p>Buying links, swapping links in bulk, or using services that promise hundreds of backlinks breaks Google’s spam policies. At best those links are ignored; at worst they can hurt how your site ranks. The same goes for stuffing your link into comment sections and low-quality directories.</p>
      <p>If an offer sounds fast and cheap, it’s the wrong kind of link.</p>`],
    ['Keep track of what you earn', `
      <p>Google Search Console and Bing Webmaster Tools both show which sites link to you. Check them every month or two to see new links, spot any spammy ones, and notice which efforts paid off. <a href="resources-search-console-bing.html">Read our guide to setting them up</a>.</p>
      <p>Links point somewhere, so the page they land on needs to be worth visiting. A fast, well-structured site with clear information about your business turns those links into customers. <a href="websites.html">See how we build websites</a>.</p>`],
  ],
},
{
  slug: 'resources-branding.html',
  title: 'Why quality branding matters for a small business',
  short: 'Why quality branding matters',
  tag: 'Branding',
  desc: 'A clear, consistent brand makes a small business easier to recognise, remember and trust. What good branding actually includes, and how to keep it consistent everywhere.',
  read: 5,
  lede: 'Branding isn’t just a logo, and it isn’t only for big companies. For a small business it’s the difference between being recognised and being scrolled past.',
  body: [
    ['People decide quickly', `
      <p>Customers judge a business in seconds: a sign from across the street, a Google listing on a phone, a flyer on a counter. A clear, well-made brand signals that the business behind it is careful and established, before anyone has read a word.</p>
      <p>A dated or inconsistent look sends the opposite signal, even when the work itself is excellent.</p>`],
    ['Consistency is what builds recognition', `
      <p>Recognition comes from seeing the same thing again and again. When your website, Google Business Profile, social accounts, menus and van all use the same logo, colours and tone, each one reinforces the others. When every piece looks a little different, customers have to start from zero each time.</p>
      <p>Consistent details help search too. Using the same business name, address and phone number everywhere makes it easier for Google and AI assistants to connect your listings and trust them.</p>`],
    ['What good branding actually includes', `
      <ul>
        <li><b>A logo that works small.</b> It should read clearly as a tiny favicon, a profile picture and a phone screen, not only on a large sign.</li>
        <li><b>A colour palette</b> with exact values for screen and print, so the terracotta on your website matches the terracotta on your business cards.</li>
        <li><b>Two typefaces</b> at most, one for headings and one for everything else.</li>
        <li><b>A voice</b>: how you talk to customers, warm, plain-spoken, expert, playful.</li>
        <li><b>A one-page guide</b> so anyone who makes something for you, a printer, a sign maker, a new employee, gets it right.</li>
      </ul>`],
    ['Signs it’s time for a refresh', `
      <ul>
        <li>Your logo is blurry, or you only have it as a small image.</li>
        <li>Your website, signage and social profiles don't look like the same business.</li>
        <li>Your look no longer fits what you sell or who you sell to.</li>
        <li>You're about to spend on a new website, signage or advertising.</li>
      </ul>
      <p>That last one matters most: it's far cheaper to settle your brand before you print, build and advertise than after. <a href="branding.html">See our logo design and branding service</a>.</p>`],
  ],
},
{
  slug: 'resources-google-ads-tracking.html',
  title: 'Before you spend on Google Ads, set up conversion tracking',
  short: 'Set up conversion tracking before Google Ads',
  tag: 'Advertising',
  desc: 'Google Ads without conversion tracking is guesswork. What to track, how it improves your campaigns, and the other basics to get right before you spend.',
  read: 5,
  lede: 'Many small businesses try Google Ads, see clicks but no obvious results, and give up. The most common reason isn’t the ads. It’s that nothing was measuring what happened after the click.',
  body: [
    ['Clicks are not customers', `
      <p>Google Ads will happily report clicks and impressions. What you actually care about is calls, form enquiries, bookings and sales. Conversion tracking connects the two, so you can see which keywords and ads produced real customers and which only spent money.</p>`],
    ['What to track', `
      <ul>
        <li><b>Phone calls</b> from your ads and from your website.</li>
        <li><b>Form submissions</b>, such as contact, quote or booking requests.</li>
        <li><b>Bookings or purchases</b> completed on your site.</li>
        <li><b>Directions requests</b>, if foot traffic matters to you.</li>
      </ul>
      <p>Track a few things that clearly mean business, not every click on the page. Google Analytics 4 and Google Ads can share these conversions, and a consent banner keeps the tracking respectful of visitors' privacy choices.</p>`],
    ['Why tracking makes the ads themselves better', `
      <p>Google's automated bidding learns from your conversions. With good tracking, it spends more on the searches that bring in customers and less on the ones that don't. Without it, the system optimises for clicks, which is exactly the wrong goal for most local businesses.</p>`],
    ['Other basics to get right first', `
      <ul>
        <li><b>Send clicks to the right page.</b> Someone searching for "emergency plumber" should land on your emergency service page, not your home page.</li>
        <li><b>Use negative keywords</b> so you don't pay for searches like "plumber jobs" or "free".</li>
        <li><b>Set a clear budget</b> based on what a new customer is worth to you, and treat the first month as a test.</li>
        <li><b>Keep your Google Business Profile complete</b>, so local ads can show your location, hours and reviews.</li>
      </ul>
      <p>We set up conversion tracking before any campaign goes live, and report what your spend brought in. <a href="google-business.html#ads">See our Google Business Profile and Ads service</a>.</p>`],
  ],
},
];
