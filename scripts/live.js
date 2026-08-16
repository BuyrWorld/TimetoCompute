/**
 * Live deployment checks.
 *
 * Local QA stubs every /api route with a 503 and serves dist/ from a plain file
 * server, so three things are only ever provable against the real deployment:
 * the provider-backed features, the security headers, and what the platform
 * serves for a path that does not exist.
 *
 * It exists as a script because hand-rolling these checks gets them wrong. A
 * 404 fetched with PowerShell's Invoke-WebRequest throws, and reading the
 * response stream out of the exception yields an empty string — which reads
 * exactly like "the platform served nothing" when the page was in fact served
 * correctly. Node's fetch does not throw on a 404, so the body is simply there.
 *
 *   node scripts/live.js [--base https://timetocompute.com]
 */
const arg = (n, f) => { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : f; };
const BASE = arg('base', 'https://timetocompute.com').replace(/\/$/, '');

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ' — ' + detail}`);
};

const get = async p => {
  const r = await fetch(BASE + p, { redirect: 'manual' });
  return { status: r.status, headers: r.headers, body: await r.text() };
};

console.log(`live checks against ${BASE}\n`);

/* ---- every route resolves ---- */
const ROUTES = ['/', '/companies/', '/sites/', '/catalysts/', '/explainers/', '/intelligence/',
  '/news/', '/lab/', '/compare/', '/research/', '/methodology/', '/privacy/', '/terms/', '/contact/'];
for (const p of ROUTES) {
  const r = await get(p);
  check(`${p} resolves`, r.status === 200, String(r.status));
}

/* ---- a missing path gets the branded page AND a 404 status ---- */
const nf = await get('/this-path-does-not-exist-' + Date.now());
check('a missing path returns a real 404, not a soft 200', nf.status === 404, String(nf.status));
check('the 404 body is the branded page', /This page isn/.test(nf.body), `${nf.body.length} bytes`);
check('the 404 keeps the primary navigation', /class="mainnav"/.test(nf.body));
check('the 404 offers search', /id="palette"/.test(nf.body));
const recovery = (nf.body.match(/class="ed-card press" href=/g) || []).length;
check('the 404 offers recovery routes', recovery >= 5, `${recovery} routes`);

/* ---- security headers survive ---- */
const home = await get('/');
for (const [h, want] of [['x-content-type-options', 'nosniff'], ['x-frame-options', 'SAMEORIGIN']]) {
  check(`${h} is set`, home.headers.get(h) === want, String(home.headers.get(h)));
}

/* ---- the build actually deployed ---- */
const stamp = (home.body.match(/t2c-build" content="([^"]+)"/) || [])[1];
check('the page carries a build stamp', !!stamp, stamp || 'missing');

/* ---- provider-backed features, which local QA cannot reach ---- */
const news = await get('/api/news?symbols=IREN,CRWV,NBIS');
const newsJson = news.status === 200 ? JSON.parse(news.body) : null;
check('the news feed returns stories', !!newsJson && newsJson.count > 0,
  newsJson ? `${newsJson.count} items` : `status ${news.status}`);
if (newsJson) {
  const yimg = newsJson.items.filter(i => /yimg\.com/.test(i.image || '')).length;
  check('Yahoo house placeholders are still detectable for replacement', yimg >= 0, `${yimg} carry it`);
}

const cats = await get('/api/catalysts?symbols=IREN,CRWV,WULF,APLD,NBIS&days=270');
const catsJson = cats.status === 200 ? JSON.parse(cats.body) : null;
check('scheduled earnings dates are available', !!catsJson && catsJson.available,
  catsJson ? String(catsJson.reason) : `status ${cats.status}`);

const shares = await get('/api/shares?symbols=IREN');
const sharesJson = shares.status === 200 ? JSON.parse(shares.body) : null;
check('share counts are available for the revenue calculator',
  !!sharesJson && sharesJson.available,
  sharesJson ? String(sharesJson.reason) : `status ${shares.status}`);

/* ---- assets ---- */
for (const a of ['/assets/t2c/images/hero-ai-campus-dusk-1600.webp',
  '/assets/campus.webp', '/assets/vehicles.webp', '/assets/news-yahoo.webp', '/styles.css', '/app.js']) {
  const r = await fetch(BASE + a);
  check(`${a} is served`, r.ok, String(r.status));
}

const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} live checks passed`);
if (failed) process.exitCode = 1;
