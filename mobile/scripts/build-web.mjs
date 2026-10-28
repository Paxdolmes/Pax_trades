// Builds the web version of both apps into dist-web/ for a static host:
// Relay at <base>/ and Relay Traders at <base>/traders/.
//   WEB_BASE=/Pax_trades node scripts/build-web.mjs
// Each app is a single-page app, so the host's 404.html sends any other path (a
// refreshed page, a shared link) to the right app with the path in ?from=, and a
// line in each index.html puts the path back before the app starts.
// Adds the tags iPhone Safari needs for "Add to Home Screen".

import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = (process.env.WEB_BASE ?? '').replace(/\/$/, '');
const out = 'dist-web';

const apps = [
  { variant: 'customer', name: 'Relay', path: `${base}/`, dir: out, icon: 'assets/images/icon.png', theme: '#FAF7F2' },
  { variant: 'pro', name: 'Relay Traders', path: `${base}/traders/`, dir: join(out, 'traders'), icon: 'assets/images/icon-traders.png', theme: '#070F24' },
];

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

  const index = join(app.dir, 'index.html');
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
  let html = readFileSync(index, 'utf8')
    .replace(/<title>.*?<\/title>/, `<title>${app.name}</title>`)
    // Fill the iPhone screen edge to edge; the app handles the notch itself.
    .replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
  html = html.replace('</head>', `${head}</head>`);
  writeFileSync(index, html);
}

// Other paths (a refreshed page or a shared link) open in the app they belong to.
writeFileSync(
  join(out, '404.html'),
  `<!doctype html><meta charset="utf-8"><title>Relay</title><script>
var t = ${JSON.stringify(`${base}/traders/`)};
var app = location.pathname.indexOf(t) === 0 ? t : ${JSON.stringify(`${base}/`)};
location.replace(app + '?from=' + encodeURIComponent(location.pathname + location.search + location.hash));
</script>`,
);
writeFileSync(join(out, '.nojekyll'), '');
console.log(`Built ${apps.map((a) => a.path).join(' and ')} into ${out}/`);
