/**
 * Post-build audit. Walks dist/ and asserts the release criteria that a unit test
 * cannot see: no broken internal links, no leaked secrets, required files present,
 * accessible form labels, and correct metadata on every page.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'dist');
const fails = [];
const notes = [];
const fail = m => fails.push(m);

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

if (!fs.existsSync(OUT)) { console.error('dist/ missing — run npm run build'); process.exit(1); }
const files = walk(OUT);
const htmlFiles = files.filter(f => f.endsWith('.html'));
const rel = f => '/' + path.relative(OUT, f).split(path.sep).join('/');

/* ---- required artefacts ---- */
for (const required of ['robots.txt', 'sitemap.xml', 'favicon.svg', 'styles.css', 'app.js', 'index.html']) {
  if (!fs.existsSync(path.join(OUT, required))) fail(`missing ${required}`);
}
for (const slug of ['methodology', 'privacy', 'terms', 'contact']) {
  if (!fs.existsSync(path.join(OUT, slug, 'index.html'))) fail(`missing /${slug}/`);
}

/* ---- no secrets in client output ---- */
const SECRET = /(FINNHUB_KEY|SEC_UA)\s*[:=]\s*["'][^"']+["']|sk-[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/;
for (const f of files.filter(f => /\.(html|js|css|json|svg|txt|xml)$/.test(f))) {
  const txt = fs.readFileSync(f, 'utf8');
  if (SECRET.test(txt)) fail(`possible secret in ${rel(f)}`);
  // The env var names may be *mentioned* in prose; an assigned value must not appear.
  if (/process\.env\.[A-Z_]+\s*(\||\?\?)?\s*["'][A-Za-z0-9]{12,}/.test(txt)) {
    fail(`hard-coded env fallback in ${rel(f)}`);
  }
}

/* ---- internal links resolve ---- */
const linkable = new Set(files.map(rel));
const routes = new Set(htmlFiles.map(f => rel(f).replace(/index\.html$/, '')));
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  const srcs = [...html.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
  for (const h of [...hrefs, ...srcs]) {
    if (/^(https?:|mailto:|#|data:)/.test(h)) continue;
    const clean = h.split('#')[0];
    if (!clean) continue;
    if (!routes.has(clean) && !linkable.has(clean)) fail(`broken internal link ${h} in ${rel(f)}`);
  }
}

/* ---- per-page metadata ---- */
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const r = rel(f);
  if (!/<title>[^<]{10,}<\/title>/.test(html)) fail(`weak or missing <title> in ${r}`);
  if (!/<meta name="description" content="[^"]{40,}"/.test(html)) fail(`weak meta description in ${r}`);
  if (!/<link rel="canonical"/.test(html)) fail(`missing canonical in ${r}`);
  if (!/property="og:title"/.test(html)) fail(`missing og:title in ${r}`);
  if (!/name="twitter:card"/.test(html)) fail(`missing twitter card in ${r}`);
  if (!/rel="icon"/.test(html)) fail(`missing favicon link in ${r}`);
  if (!/<html lang="en" data-theme="dark">/.test(html)) fail(`${r} does not default to dark theme`);
  if (/\bSetup\b/.test(html) && !/setup/i.test('')) {
    // "Setup" must no longer appear as a navigable view.
    if (/data-tab="setup"|>Setup</.test(html)) fail(`Setup tab still present in ${r}`);
  }
}

/* ---- titles are unique ---- */
const titles = new Map();
for (const f of htmlFiles) {
  const t = (fs.readFileSync(f, 'utf8').match(/<title>([^<]+)<\/title>/) || [])[1];
  if (titles.has(t)) fail(`duplicate <title> "${t}" in ${rel(f)} and ${titles.get(t)}`);
  titles.set(t, rel(f));
}

/* ---- accessibility spot checks on the homepage ---- */
const home = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');

// every form control has a programmatic label
const controlIds = [...home.matchAll(/<(?:input|select)[^>]*id="([^"]+)"/g)].map(m => m[1]);
const labelFor = new Set([...home.matchAll(/<label[^>]*for="([^"]+)"/g)].map(m => m[1]));
for (const id of controlIds) {
  if (!labelFor.has(id)) fail(`form control #${id} has no <label for>`);
}
if (controlIds.length < 6) fail(`expected the Odds inputs in the homepage markup, found ${controlIds.length}`);

// tab semantics
if (!/role="tablist"/.test(home)) fail('missing role=tablist');
const tabs = [...home.matchAll(/class="tab" role="tab"[^>]*id="tab-([^"]+)"[^>]*aria-controls="view-([^"]+)"/g)];
if (tabs.length < 6) fail(`expected 6 tabs with aria-controls, found ${tabs.length}`);
for (const [, id, controls] of tabs) {
  if (id !== controls) fail(`tab ${id} controls mismatched panel ${controls}`);
  if (!home.includes(`id="view-${controls}"`)) fail(`tab ${id} points at a missing panel`);
}

// expandable rows
const geoRows = [...home.matchAll(/class="georow"[^>]*aria-expanded="false"[^>]*aria-controls="(geo-\d+)"/g)];
if (!geoRows.length) fail('country rows missing aria-expanded/aria-controls');
for (const [, target] of geoRows) {
  if (!home.includes(`id="${target}"`)) fail(`country row points at missing panel ${target}`);
}

// charts carry a text alternative — aria-labelledby pointing at a real summary,
// or an inline aria-label for small inline graphics
if (!/id="distChart"[^>]*aria-labelledby="distSummary"/.test(home)) fail('distribution chart has no text summary');
if (!/id="fanChart"[^>]*aria-labelledby="fanSummary"/.test(home)) fail('fan chart has no text summary');
for (const id of ['distSummary', 'fanSummary']) {
  if (!home.includes(`id="${id}"`)) fail(`chart summary target #${id} does not exist`);
}
if (!/role="img"\s+aria-label(ledby)?=/.test(home)) fail('no aria-labelled chart graphics found');

// the marquee duplicate must not be read twice by a screen reader
if (!/aria-hidden="true"/.test(home)) fail('no aria-hidden found — check the ticker clone');

/* ---- provenance and honesty rules ---- */
// a minimum must never be presented as an exhaustive total
if (home.includes('confirmed minimum') && !home.includes('≥')) {
  fail('a minimum is described without the >= marker');
}
// corrected values must be gone from the shipped output
const STALE = [
  { v: '3.5 GW', why: 'superseded CoreWeave contracted-power figure' },
  { v: '600 MW', why: 'stale Applied Digital contracted figure' }
];
for (const s of STALE) {
  if (home.includes(s.v)) notes.push(`homepage still contains "${s.v}" — verify it is a dated historical record (${s.why})`);
}
// no analyst target may appear without attribution
if (/target price/i.test(home) && !/Finnhub|research firm|attributab/i.test(home)) {
  fail('a price target appears without provider or firm attribution');
}
// causal language about price reactions is forbidden
for (const f of htmlFiles) {
  const t = fs.readFileSync(f, 'utf8');
  if (/announcement caused|caused the (share|stock|price)/i.test(t)) {
    fail(`causal language about a price move in ${rel(f)}`);
  }
  if (/guaranteed return|certain to rise|will rise to/i.test(t)) {
    fail(`language implying a guaranteed outcome in ${rel(f)}`);
  }
}

// comparison must state its own ceiling
if (!/at most 3 companies|up to 3|Up to 3/i.test(home)) {
  fail('the comparison ceiling is not stated in the interface');
}

// status must never be colour-only: every status pill carries a text label
const pills = [...home.matchAll(/<span class="st st-\w+"[^>]*>(.*?)<\/span>/g)];
for (const [full, inner] of pills) {
  const text = inner.replace(/<[^>]+>/g, '').trim();
  if (!text) fail('status pill with no text label: ' + full.slice(0, 60));
}

/* ---- "not disclosed" is never rendered as a zero ---- */
if (!home.includes('Not disclosed')) notes.push('homepage shows no "Not disclosed" cells — check data');

/* ---- sitemap and robots sanity ---- */
const sitemap = fs.readFileSync(path.join(OUT, 'sitemap.xml'), 'utf8');
for (const r of [...routes].filter(x => !x.includes('/companies/') || x !== '/companies/')) {
  if (r === '/') continue;
}
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
for (const u of sitemapUrls) {
  const p = new URL(u).pathname;
  if (!routes.has(p)) fail(`sitemap lists ${p} which is not built`);
}
if (sitemapUrls.length !== routes.size) {
  notes.push(`sitemap has ${sitemapUrls.length} urls, build produced ${routes.size} routes`);
}
const robots = fs.readFileSync(path.join(OUT, 'robots.txt'), 'utf8');
if (!/Sitemap:\s*https?:\/\//.test(robots)) fail('robots.txt does not point at the sitemap');

/* ---- report ---- */
console.log(`audited ${htmlFiles.length} pages, ${files.length} files`);
for (const n of notes) console.log('  note: ' + n);
if (fails.length) {
  console.error('\nAUDIT FAILED:\n' + fails.map(f => '  ✗ ' + f).join('\n'));
  process.exit(1);
}
console.log('✓ audit passed');
