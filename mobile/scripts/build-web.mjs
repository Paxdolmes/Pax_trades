// Builds the web version of both apps into dist-web/ for a static host:
// Relay at <base>/ and Relay Traders at <base>/traders/.
//   WEB_BASE=/Pax_trades node scripts/build-web.mjs
// Each app is a single-page app, so the host's 404.html sends any other path (a
// refreshed page, a shared link) to the right app with the path in ?from=, and a
// line in each index.html puts the path back before the app starts.
// Adds the tags iPhone Safari needs for "Add to Home Screen".
// For search engines: each website page gets its own title, description and share
// card (src/content/seo.json), app screens are marked noindex, and robots.txt and
// sitemap.xml are written at the root. Each page's text and links are also copied
// into its HTML (see prerender below), for crawlers that don't run the app.

import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';

const base = (process.env.WEB_BASE ?? '').replace(/\/$/, '');
const out = 'dist-web';

const apps = [
  { variant: 'customer', name: 'Relay', path: `${base}/`, dir: out, icon: 'assets/images/icon.png', theme: '#FAF7F2' },
  { variant: 'pro', name: 'Relay Traders', path: `${base}/traders/`, dir: join(out, 'traders'), icon: 'assets/images/icon-traders.png', theme: '#070F24' },
];

const seo = JSON.parse(readFileSync('src/content/seo.json', 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// GitHub Pages serves /help from help/index.html, redirecting to /help/.
const pageUrl = (path) => seo.site + (path === '/' ? '/' : `${path}/`);

// Who Relay is, for Google's knowledge panel. No reviews or ratings: the ones on the site are examples.
const organisation = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', name: 'Relay', url: `${seo.site}/`, logo: `${seo.site}/apple-touch-icon.png`, areaServed: 'Fulham, London' },
    { '@type': 'WebSite', name: 'Relay', url: `${seo.site}/`, inLanguage: 'en-GB' },
  ],
};

/** Title, description, canonical link and share card for one website page. data-rh lets the app's <Head> take them over. */
function pageTags(path) {
  const page = seo.pages[path];
  const url = pageUrl(path);
  return [
    `<title data-rh="true">${esc(page.title)}</title>`,
    `<meta data-rh="true" name="description" content="${esc(page.description)}">`,
    `<link data-rh="true" rel="canonical" href="${url}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Relay">`,
    `<meta property="og:locale" content="en_GB">`,
    `<meta data-rh="true" property="og:title" content="${esc(page.title)}">`,
    `<meta data-rh="true" property="og:description" content="${esc(page.description)}">`,
    `<meta data-rh="true" property="og:url" content="${url}">`,
    `<meta data-rh="true" property="og:image" content="${seo.site}${seo.image}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    path === '/' ? `<script type="application/ld+json">${JSON.stringify(organisation)}</script>` : '',
    page.service ? `<script type="application/ld+json">${JSON.stringify(service(path, page))}</script>` : '',
    page.article ? `<script type="application/ld+json">${JSON.stringify(article(path, page))}</script>` : '',
  ].join('');
}

/** A trade page's service, where it's offered and its starting price. */
function service(path, page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: page.service,
    name: page.title.replace(/ \| Relay$/, ''),
    description: page.description,
    url: pageUrl(path),
    provider: { '@type': 'Organization', name: 'Relay', url: `${seo.site}/` },
    areaServed: { '@type': 'Place', name: 'Fulham, London SW6' },
    offers: { '@type': 'Offer', price: '95', priceCurrency: 'GBP', description: 'From £95 including the first hour on weekdays, VAT and fees included' },
  };
}

/** A guide, written by Relay. */
function article(path, page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title.replace(/ \| Relay$/, ''),
    description: page.description,
    url: pageUrl(path),
    inLanguage: 'en-GB',
    author: { '@type': 'Organization', name: 'Relay', url: `${seo.site}/` },
    publisher: { '@type': 'Organization', name: 'Relay', logo: { '@type': 'ImageObject', url: `${seo.site}/apple-touch-icon.png` } },
    image: `${seo.site}${seo.image}`,
  };
}

rmSync(out, { recursive: true, force: true });

for (const app of apps) {
  const tmp = `dist-web-${app.variant}`;
  execFileSync('npx', ['expo', 'export', '--platform', 'web', '--clear', '--output-dir', tmp], {
    stdio: 'inherit',
    env: { ...process.env, APP_VARIANT: app.variant, EXPO_BASE_URL: app.path.replace(/\/$/, '') },
  });
  mkdirSync(app.dir, { recursive: true });
  cpSync(tmp, app.dir, { recursive: true });
  rmSync(tmp, { recursive: true, force: true });

  copyFileSync(app.icon, join(app.dir, 'apple-touch-icon.png'));
  // The logo at the top of Relay's emails (supabase/functions/_shared/email.ts) is served from the site.
  if (app.variant === 'customer') copyFileSync('assets/images/email-logo.png', join(app.dir, 'email-logo.png'));
  // Proves to Google Search Console that we own app.relay-trade.co.uk. Keep it, or the site is unverified.
  if (app.variant === 'customer') copyFileSync('assets/web/googleddf927cddb8aba22.html', join(app.dir, 'googleddf927cddb8aba22.html'));
  // The picture shown when a page is shared in WhatsApp, iMessage or on social media.
  if (app.variant === 'customer') copyFileSync('assets/web/og-image.png', join(app.dir, 'og-image.png'));
  writeFileSync(
    join(app.dir, 'manifest.json'),
    JSON.stringify(
      {
        name: app.name,
        short_name: app.name,
        start_url: app.path,
        scope: app.path,
        display: 'standalone',
        background_color: app.theme,
        theme_color: app.theme,
        icons: [{ src: `${app.path}apple-touch-icon.png`, sizes: '1024x1024', type: 'image/png' }],
      },
      null,
      2,
    ),
  );

  const head = [
    `<meta name="apple-mobile-web-app-capable" content="yes">`,
    `<meta name="mobile-web-app-capable" content="yes">`,
    `<meta name="apple-mobile-web-app-title" content="${app.name}">`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="default">`,
    `<meta name="theme-color" content="${app.theme}">`,
    `<link rel="apple-touch-icon" href="${app.path}apple-touch-icon.png">`,
    `<link rel="manifest" href="${app.path}manifest.json">`,
    `<script>(function(){var f=new URLSearchParams(location.search).get('from');if(f&&f.charAt(0)==='/')history.replaceState(null,'',f);})();</script>`,
  ].join('');
  const index = join(app.dir, 'index.html');
  const shell = readFileSync(index, 'utf8')
    .replace('<html lang="en">', '<html lang="en-GB">')
    // Fill the iPhone screen edge to edge; the app handles the notch itself.
    .replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
  // Sign-in, booking and account screens (served by 404.html) and the Relay Traders app
  // stay out of search results.
  const appPage = shell.replace(/<title>.*?<\/title>/, `<title>${app.name}</title>`).replace('</head>', `<meta name="robots" content="noindex">${head}</head>`);
  if (app.variant !== 'customer' || base !== '') {
    writeFileSync(index, appPage);
    continue;
  }
  // Each website page gets its own copy of the app's page, so search engines find it
  // (rather than a "not found") with its own title and description.
  for (const [path, page] of Object.entries(seo.pages)) {
    const html = shell
      .replace(/<title>.*?<\/title>/, '')
      .replace(/<noscript>.*?<\/noscript>/s, `<noscript><h1>${esc(page.title)}</h1><p>${esc(page.description)}</p></noscript>`)
      .replace('</head>', `${pageTags(path)}${head}</head>`);
    const dir = join(app.dir, path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
  }
}

// Other paths (a refreshed page or a shared link) open in the app they belong to.
writeFileSync(
  join(out, '404.html'),
  `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Relay</title><script>
var t = ${JSON.stringify(`${base}/traders/`)};
var app = location.pathname.indexOf(t) === 0 ? t : ${JSON.stringify(`${base}/`)};
location.replace(app + '?from=' + encodeURIComponent(location.pathname + location.search + location.hash));
</script>`,
);
writeFileSync(join(out, '.nojekyll'), '');

if (base === '') {
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${seo.site}/sitemap.xml\n`);
  const today = new Date().toISOString().slice(0, 10);
  const urls = Object.keys(seo.pages)
    .map((path) => `  <url><loc>${pageUrl(path)}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n');
  // Proves to Bing and other IndexNow search engines that the pings after each deploy come from us (scripts/indexnow.mjs).
  writeFileSync(join(out, `${seo.indexNowKey}.txt`), seo.indexNowKey);
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}
if (base === '') await prerender();
console.log(`Built ${apps.map((a) => a.path).join(' and ')} into ${out}/`);

/**
 * Opens each website page in a headless browser and copies its text, headings and
 * links into that page's index.html, so crawlers that don't run the app still read
 * the whole page. The copy is plain HTML kept invisible: the app replaces it as soon
 * as it starts, so visitors only ever see the app itself. Needs Playwright (the web
 * workflow installs it); without it the pages keep the short <noscript> summary.
 */
async function prerender() {
  let chromium;
  try {
    ({ chromium } = createRequire(import.meta.url)('playwright'));
  } catch {
    console.warn('Playwright not installed: skipping the prerendered page text.');
    return;
  }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.css': 'text/css' };
  const server = createServer((req, res) => {
    let file = join(out, decodeURIComponent(req.url.split('?')[0]));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) file = join(out, 'index.html');
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  }).listen(0);
  const origin = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    const tab = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    for (const path of Object.keys(seo.pages)) {
      await tab.goto(origin + (path === '/' ? '/' : `${path}/`), { waitUntil: 'networkidle' });
      await tab.waitForTimeout(500);
      // Keep the words, headings, lists and links; drop the app's styling and scripts.
      const body = await tab.evaluate(() => {
        const root = document.getElementById('root').cloneNode(true);
        root.querySelectorAll('script, style, svg, input, textarea, img').forEach((el) => el.remove());
        root.querySelectorAll('*').forEach((el) => {
          for (const { name } of [...el.attributes]) if (!['href', 'aria-level', 'role'].includes(name)) el.removeAttribute(name);
        });
        return root.innerHTML.replace(/<div>\s*<\/div>/g, '');
      });
      if (!/<h1[\s>]/.test(body)) throw new Error(`Prerender of ${path} found no page heading`);
      const file = join(out, path, 'index.html');
      const html = readFileSync(file, 'utf8');
      if (!html.includes('<div id="root"></div>')) throw new Error(`No empty root in ${file}`);
      writeFileSync(file, html.replace('<div id="root"></div>', `<div id="root"><div style="opacity:0">${body}</div></div>`));
    }
  } finally {
    await browser.close();
    server.close();
  }
}
