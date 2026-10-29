// Builds the web version of both apps into dist-web/ for a static host:
// Relay at <base>/ and Relay Traders at <base>/traders/.
//   WEB_BASE=/Pax_trades node scripts/build-web.mjs
// Each app is a single-page app, so the host's 404.html sends any other path (a
// refreshed page, a shared link) to the right app with the path in ?from=, and a
// line in each index.html puts the path back before the app starts.
// Adds the tags iPhone Safari needs for "Add to Home Screen".
// For search engines: each website page gets its own title, description and share
// card (src/content/seo.json), app screens are marked noindex, and robots.txt and
// sitemap.xml are written at the root.

import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
  ].join('');
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
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}
console.log(`Built ${apps.map((a) => a.path).join(' and ')} into ${out}/`);
