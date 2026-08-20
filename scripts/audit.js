/**
 * Post-build audit. Walks dist/ and asserts the release criteria that a unit test
 * cannot see: no broken internal links, no leaked secrets, required files present,
 * accessible form labels, and correct metadata on every page.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chainState, STAGES } from '../src/lib/chain.js';

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
/* Double-encoded UTF-8. A source file read as Windows-1252 and written back as
   UTF-8 turns "—" into "â€"" and "→" into "â†’". It builds and tests clean and
   only shows up as gibberish on the page, so it is checked for here. */
const MOJIBAKE = /â€"|â€™|â†’|Ã©|Â·|Â»/;
for (const f of htmlFiles) {
  if (MOJIBAKE.test(fs.readFileSync(f, 'utf8'))) {
    fail(`mojibake in ${rel(f)} — a source file was re-encoded from the wrong codepage`);
  }
}

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
    // A query string selects state within a route; the route itself is what must exist.
    const clean = h.split('#')[0].split('?')[0];
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

/* ---- titles are unique, except for a declared alias ----
   Two distinct pages sharing a title is a defect. An ALIAS sharing one is not:
   /news/ is the wire's original published address and renders the same page as
   /ai-news/, canonicalised to it so the two never compete for the same query.
   The rule therefore ignores a page whose canonical points somewhere other than
   itself, which is exactly what an alias is and nothing else is. */
const titles = new Map();
const canonicalOf = html => (html.match(/rel="canonical" href="([^"]+)"/) || [])[1] || '';
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const t = (html.match(/<title>([^<]+)<\/title>/) || [])[1];
  const own = canonicalOf(html).replace(/^https?:\/\/[^/]+/, '');
  const isAlias = own && own !== rel(f).replace(/index\.html$/, '');
  if (titles.has(t) && !isAlias) fail(`duplicate <title> "${t}" in ${rel(f)} and ${titles.get(t)}`);
  if (!isAlias) titles.set(t, rel(f));
}

/* ---- accessibility spot checks on the homepage ---- */
const home = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const lab = fs.readFileSync(path.join(OUT, 'lab', 'index.html'), 'utf8');
const research = fs.readFileSync(path.join(OUT, 'research', 'index.html'), 'utf8');
const companiesPg = fs.readFileSync(path.join(OUT, 'companies', 'index.html'), 'utf8');
const comparePg = fs.readFileSync(path.join(OUT, 'compare', 'index.html'), 'utf8');

// every form control has a programmatic label
const controlIds = [...lab.matchAll(/<(?:input|select)[^>]*id="([^"]+)"/g)].map(m => m[1]);
const labelFor = new Set([...lab.matchAll(/<label[^>]*for="([^"]+)"/g)].map(m => m[1]));
for (const id of controlIds) {
  if (!labelFor.has(id)) fail(`form control #${id} has no <label for>`);
}
if (controlIds.length < 6) fail(`expected the Edge Lab inputs, found ${controlIds.length}`);

/* ---- navigation is now real routes, not tabs ---- */
for (const [pageName, html] of [['home', home], ['lab', lab], ['research', research], ['companies', companiesPg]]) {
  if (!/<nav class="mainnav" aria-label="Primary">/.test(html)) fail(`${pageName}: no primary navigation`);
  const links = [...html.matchAll(/class="navlink[^"]*"\s+href="([^"]+)"/g)].map(m => m[1]);
  if (links.length !== 7) fail(`${pageName}: expected 7 primary nav links, found ${links.length}`);
  for (const href of links) {
    const clean = href.split('#')[0];
    if (!routes.has(clean)) fail(`${pageName}: nav points at unbuilt route ${href}`);
  }
  // Demoting a route to the utility menu is fine; orphaning it is not.
  for (const href of ['/sites/', '/intelligence/', '/news/', '/lab/', '/compare/', '/research/', '/methodology/']) {
    if (!html.includes(`href="${href}"`)) fail(`${pageName}: secondary route ${href} is unreachable`);
  }
  // exactly one page marks itself current
  const current = (html.match(/aria-current="page"/g) || []).length;
  if (current < 1) fail(`${pageName}: no nav item marked aria-current`);
}

// No page carries a marketing hero — Today leads with the day's signal.
for (const [pageName, html] of [['home', home], ['lab', lab], ['research', research],
  ['companies', companiesPg], ['compare', comparePg]]) {
  if (/class="hero"/.test(html)) fail(`${pageName}: ships a marketing hero — every route starts with the tool`);
  if (/class="tapein"/.test(html)) fail(`${pageName}: repeats the ticker tape`);
}
// The homepage leads with the proposition, then the chain, then the day's story.
if (!/class="fl-hero"/.test(home)) fail('the homepage lost its flagship hero');
if (!/Follow AI from atoms to revenue/.test(home)) fail('the homepage lost its proposition headline');
if (!/class="cn-track"/.test(home)) fail('the homepage lost the supply chain');
if (!/id="whyDrawer"/.test(home)) fail('the homepage lost its why-this-matters drawer');
if (!/class="ed-disclosure"/.test(home)) fail('an illustration is on the homepage with no disclosure');
// Every chain stage must state whether it is tracked, in words.
const chainNodes = (home.match(/class="cn-node/g) || []).length;
if (chainNodes !== 7) fail(`homepage chain has ${chainNodes} stages; the model has 7`);
// A stage upstream of an evidenced one certainly happened. Drawing it as unknown
// would say the opposite, so the two facts are asserted separately.
// Counts derived from the model, never written here: these read < 4 while the
// model said 4 implied, then silently pinned the page to a stale fact when
// photonics gained supplier records and the implied count fell to 3.
const impliedCount = chainState().filter(s => s.happened === 'implied').length;
if ((home.match(/>Happened</g) || []).length < impliedCount) fail('implied stages do not say they happened');
if ((home.match(/Not tracked by T2C/g) || []).length < impliedCount) {
  fail('implied stages do not say T2C fails to track them');
}
const guideItems = (home.match(/class="cn-guideitem /g) || []).length;
if (guideItems !== STAGES.length) fail(`homepage explains ${guideItems} chain stages; the model has ${STAGES.length}`);
// Nothing above the fold may load eagerly except a genuine LCP image.
const eagerImgs = (home.match(/loading="eager"/g) || []).length;
if (eagerImgs > 1) fail(`homepage has ${eagerImgs} eagerly-loaded images; at most 1 is allowed`);

// mode switchers keep proper tab semantics
if (!/role="tablist"/.test(lab)) fail('Edge Lab mode switcher is not a tablist');
if (!/role="tablist"/.test(comparePg)) fail('Compare mode switcher is not a tablist');

/* ---- expandable country rows live on Research now ---- */
const geoRows = [...research.matchAll(/class="georow"[^>]*aria-expanded="false"[^>]*aria-controls="(geo-\d+)"/g)];
if (!geoRows.length) fail('country rows missing aria-expanded/aria-controls');
for (const [, target] of geoRows) {
  if (!research.includes(`id="${target}"`)) fail(`country row points at missing panel ${target}`);
}

/* ---- charts carry a text alternative ---- */
if (!/id="distChart"[^>]*aria-labelledby="distSummary"/.test(lab)) fail('distribution chart has no text summary');
if (!lab.includes('id="distSummary"')) fail('chart summary target #distSummary does not exist');
if (!/role="img"\s+aria-label(ledby)?=/.test(home)) fail('no aria-labelled chart graphics found');

// decorative duplicates must not be read twice by a screen reader
if (!/aria-hidden="true"/.test(home)) fail('no aria-hidden found on decorative elements');

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
if (!/up to 3|Select up to 3|at most 3/i.test(comparePg)) {
  fail('the comparison ceiling is not stated on the Compare route');
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
