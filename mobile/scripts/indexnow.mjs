// Tells Bing (and the other search engines that share IndexNow) about every website
// page after a deploy, so new and changed pages are crawled within days rather than
// weeks. Google doesn't use IndexNow; it reads the sitemap instead.
//   node scripts/indexnow.mjs
// The key file it points to is written by scripts/build-web.mjs.

import { readFileSync } from 'node:fs';

const seo = JSON.parse(readFileSync('src/content/seo.json', 'utf8'));
const host = new URL(seo.site).host;
const urlList = Object.keys(seo.pages).map((path) => seo.site + (path === '/' ? '/' : `${path}/`));

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key: seo.indexNowKey, keyLocation: `${seo.site}/${seo.indexNowKey}.txt`, urlList }),
});
// 200 and 202 both mean received; anything else is reported but doesn't fail the deploy.
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} pages`);
if (!res.ok) console.log(await res.text());
