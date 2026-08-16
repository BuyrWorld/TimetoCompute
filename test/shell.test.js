/**
 * Shell and route tests.
 *
 * These assert things a data test cannot see: that the routes exist, that every
 * legacy hash still lands somewhere, that a page never claims a price it does not
 * have, and that the honesty rules survive a redesign. They read the built output,
 * because the built output is what a reader gets.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chainState } from '../src/lib/chain.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');

const read = rel => fs.readFileSync(path.join(DIST, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(DIST, rel));

const ROUTES = ['index.html', 'chain/index.html', 'companies/index.html', 'sites/index.html',
  'intelligence/index.html', 'news/index.html', 'explainers/index.html', 'compare/index.html',
  'catalysts/index.html', 'lab/index.html', 'research/index.html', 'methodology/index.html'];

/** The primary destinations, in the order the shell presents them. */
const NAV_HREFS = ['/', '/chain/', '/companies/', '/ai-news/', '/catalysts/', '/explainers/', '/time-machine/'];

/** Demoted but never orphaned — reachable from the utility menu on every page. */
const SECONDARY = ['/sites/', '/intelligence/', '/news/', '/lab/', '/compare/', '/research/', '/methodology/'];

/** Primary destinations must not also sit in the utility menu. */
const NOT_SECONDARY = ['/time-machine/'];

/* ================= routes ================= */

test('every navigation route is a real page, not a hash', () => {
  for (const r of ROUTES) assert.ok(exists(r), `${r} was not built`);
  const home = read('index.html');
  for (const href of ['/companies/', '/sites/', '/intelligence/', '/compare/',
    '/catalysts/', '/lab/', '/research/']) {
    assert.ok(home.includes(`href="${href}"`), `home does not link to ${href}`);
  }
});

/* ================= the shared shell ================= */

test('the shell offers exactly the primary destinations, in order', () => {
  for (const r of ROUTES) {
    const html = read(r);
    const hrefs = [...html.matchAll(/class="navlink[^"]*"\s+href="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(hrefs, NAV_HREFS, `${r} has the wrong primary navigation`);
  }
});

test('a route demoted from the nav is still reachable from every page', () => {
  // Compare, Catalysts and Research lost their nav slot. Losing a slot must not
  // mean losing the route.
  for (const r of ROUTES) {
    const html = read(r);
    for (const href of SECONDARY) {
      assert.ok(html.includes(`href="${href}"`), `${r} orphans ${href}`);
    }
  }
});

test('a primary destination is not duplicated in the utility menu', () => {
  for (const r of ROUTES) {
    const html = read(r);
    for (const href of NOT_SECONDARY) {
      assert.ok(!new RegExp('<a class="umenubtn[^"]*"[^>]*href="' + href + '"').test(html),
        r + ' lists ' + href + ' in both the primary nav and the utility menu');
    }
  }
});

test('every previously published route still resolves', () => {
  // Renaming a label must never break a link someone has already shared.
  for (const route of ['/', '/companies/', '/sites/', '/intelligence/', '/news/', '/lab/',
    '/compare/', '/catalysts/', '/research/', '/methodology/', '/privacy/', '/terms/', '/contact/']) {
    const file = route === '/' ? 'index.html' : route.replace(/^\//, '') + 'index.html';
    assert.ok(exists(file), `${route} no longer resolves`);
  }
  // The Megaprojects TAB was removed. Its route and every site page beneath it
  // must survive: those are published URLs, and deleting a tab is an editorial
  // decision while deleting a URL breaks every link anyone has ever shared.
  const html = read('index.html');
  assert.ok(!/class="navlink[^"]*"[^>]*>Megaprojects</.test(html),
    'the Megaprojects tab is still in the primary navigation');
  assert.ok(html.includes('href="/sites/"'), '/sites/ was orphaned when its tab was removed');
  assert.ok(exists('sites/iren-horizon-1/index.html'),
    'a published site page was deleted along with the tab');
});

test('site detail lives on the company page now that the tab is gone', () => {
  const html = read('companies/iren/index.html');
  assert.match(html, /Data centres and their gates/,
    'the company page does not present its data centres');
  // Every card reaches the site's own page, so the detail is a way in, not a
  // dead end.
  const links = [...html.matchAll(/class="projmore press" href="([^"]+)"/g)].map(m => m[1]);
  assert.ok(links.length > 0, 'no data-centre card links to its site page');
  for (const h of links) {
    assert.ok(exists(h.replace(/^\//, '') + 'index.html'), `${h} is a dead link`);
  }
  assert.ok(html.includes('>Data centres<'), 'the section nav still calls them Projects');
});

test('a branded 404 exists and offers real recovery routes', () => {
  assert.ok(exists('404.html'), 'no 404 page was built');
  const html = read('404.html');
  assert.ok(/<h1[^>]*>[\s\S]*?isn.t here/i.test(html), 'the 404 has no headline');
  assert.ok(html.includes('class="mainnav"'), 'the 404 has no primary navigation');
  assert.ok(html.includes('id="palette"'), 'the 404 has no search');
  // Every recovery link must resolve.
  const hrefs = [...html.matchAll(/class="ed-card press" href="([^"]+)"/g)].map(m => m[1]);
  assert.ok(hrefs.length >= 5, `expected several recovery routes, found ${hrefs.length}`);
  for (const h of hrefs) {
    assert.ok(exists(h.replace(/^\//, '') + 'index.html'), `404 offers ${h}, which was not built`);
  }
});

test('a demoted route still tells the reader where they are', () => {
  // Research and Compare have no nav slot. They must still mark themselves
  // current somewhere, or the reader lands on a page the shell does not admit to.
  for (const [file, href] of [['research/index.html', '/research/'],
    ['compare/index.html', '/compare/'], ['lab/index.html', '/lab/'],
    ['intelligence/index.html', '/intelligence/'], ['news/index.html', '/news/'],
    ['methodology/index.html', '/methodology/']]) {
    const html = read(file);
    const link = html.match(new RegExp(`<a class="umenubtn[^"]*"[^>]*href="${href}"[^>]*>`));
    assert.ok(link, `${file} has no utility-menu link to itself`);
    assert.ok(/aria-current="page"/.test(link[0]), `${file} does not mark itself current`);
  }
});

test('every page carries the Live/Focus toggle and it is a real pair of buttons', () => {
  for (const r of ROUTES) {
    const html = read(r);
    assert.ok(/<div class="modetoggle" role="group"/.test(html), `${r} has no mode toggle`);
    assert.ok(html.includes('data-mode="live"') && html.includes('data-mode="focus"'),
      `${r} is missing a mode button`);
    // Pressed state is expressed to assistive technology, not by colour alone.
    assert.ok(/data-mode="live" aria-pressed="true"/.test(html), `${r} does not default to Live`);
  }
});

test('every page carries the command palette and states its shortcut', () => {
  for (const r of ROUTES) {
    const html = read(r);
    assert.ok(html.includes('id="palette"'), `${r} has no palette dialog`);
    assert.ok(/<button class="paltrigger press"[^>]*aria-haspopup="dialog"/.test(html),
      `${r} has no palette trigger`);
    assert.ok(html.includes('Ctrl K'), `${r} does not show the palette shortcut`);
    assert.ok(/<label class="vh" for="palInput">/.test(html),
      `${r} palette input has no accessible name`);
  }
});

test('the palette can only offer destinations that were built', () => {
  const cfg = JSON.parse(read('index.html').match(/id="t2c-config">([^<]+)</)[1]);
  assert.ok(Array.isArray(cfg.palette) && cfg.palette.length > 0, 'the palette index is empty');
  for (const row of cfg.palette) {
    const file = row.h === '/' ? 'index.html' : row.h.replace(/^\//, '') + 'index.html';
    assert.ok(exists(file), `the palette offers ${row.h}, which was not built`);
    assert.ok(row.n && row.k, `a palette row has no name or kind: ${JSON.stringify(row)}`);
  }
});

test('the palette reaches every company and every site', () => {
  const cfg = JSON.parse(read('index.html').match(/id="t2c-config">([^<]+)</)[1]);
  const hrefs = new Set(cfg.palette.map(r => r.h));
  assert.ok(hrefs.has('/sites/iren-horizon-1/'), 'a known site is missing from the palette');
  assert.ok(hrefs.has('/companies/iren/'), 'a known company is missing from the palette');
  assert.equal(cfg.palette.filter(r => r.k === 'Site').length, 23, 'not every site is indexed');
});

test('nav links carry the click-glow primitive', () => {
  const html = read('index.html');
  const navLinks = [...html.matchAll(/<a class="(navlink[^"]*)"/g)].map(m => m[1]);
  assert.ok(navLinks.length > 0);
  for (const cls of navLinks) {
    assert.ok(cls.includes('press'), `a nav link is missing the press primitive: "${cls}"`);
  }
});

test('every legacy hash maps to a route that exists', () => {
  const cfg = JSON.parse(read('index.html').match(/id="t2c-config">([^<]+)</)[1]);
  assert.ok(cfg.hashRoutes, 'the client has no hash redirect table');
  for (const [hash, target] of Object.entries(cfg.hashRoutes)) {
    const route = target.split('#')[0];
    const file = route === '/' ? 'index.html' : route.replace(/^\//, '') + 'index.html';
    assert.ok(exists(file), `legacy #${hash} points at ${target}, which was not built`);
  }
});

test('no page ships a marketing hero', () => {
  // Today is a tool, not a landing page. The homepage leads with the day's
  // signal; the old hero is gone from every route including the homepage.
  for (const r of ROUTES) {
    assert.ok(!read(r).includes('class="hero"'), `${r} still ships the marketing hero`);
  }
});

test('the homepage leads with the proposition, in HTML', () => {
  const html = read('index.html');
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
  assert.equal(h1s.length, 1, 'the homepage does not have exactly one h1');
  assert.ok(/class="fl-h1"/.test(h1s[0][0]), 'the h1 is not the proposition headline');
  assert.match(h1s[0][1].replace(/<[^>]+>/g, ''), /Follow AI from atoms to revenue/);
  assert.ok(/class="fl-lede"/.test(html), 'no supporting copy follows the headline');
  // Both primary actions, and both lead somewhere built.
  assert.ok(html.includes('href="/chain/"'), 'no "explore the chain" destination');
  assert.ok(html.includes('href="/intelligence/?view=since-last-visit"'), 'no "see what changed" destination');
});

test('the homepage answers its questions in order', () => {
  const html = read('index.html');
  const at = s => html.indexOf(s);
  assert.ok(at('fl-h1') < at('cn-track'), 'the proposition does not lead the chain');
  assert.ok(at('cn-track') < at('The AI buildout today'), 'the chain does not lead the detail');
  assert.ok(at('The AI buildout today') < at('Megaprojects to watch'), 'sections are out of order');
  assert.ok(at('Megaprojects to watch') < at('ed-explainer'), 'the explainer is not last');
});

/* ================= the supply chain ================= */

test('the chain shows all seven stages and marks which are evidenced', () => {
  for (const r of ['index.html', 'chain/index.html']) {
    const html = read(r);
    const nodes = [...html.matchAll(/class="cn-node([^"]*)"/g)].map(m => m[1]);
    assert.equal(nodes.length, 7, `${r} has ${nodes.length} chain stages, expected 7`);
    assert.equal(nodes.filter(n => n.includes('is-evidenced')).length, 3,
      `${r} does not mark exactly 3 evidenced stages`);
    // The four upstream stages are lit, not blanked: billing capacity proves the
    // chips it runs on were made.
    assert.equal(nodes.filter(n => n.includes('is-implied')).length, 4,
      `${r} does not mark the 4 upstream stages as implied`);
    assert.equal(nodes.filter(n => n.includes('is-gap')).length, 0,
      `${r} draws a stage as unknown when a later stage proves it happened`);
  }
});

test('an implied stage holds both facts at once, in words', () => {
  const html = read('index.html');
  // It happened...
  assert.ok((html.match(/>Happened</g) || []).length >= 4,
    'implied stages do not say they happened');
  // ...and T2C does not track it. Neither claim may rest on styling.
  assert.ok((html.match(/Not tracked by T2C/g) || []).length >= 4,
    'implied stages do not say T2C fails to track them');
  assert.ok(/certainly made/.test(html), 'the coverage note drops the implication');
  assert.ok(/completed but untracked/.test(html),
    'the coverage note does not separate happening from tracking');
});

test('no stage is drawn as unknown while a later stage is evidenced', () => {
  const state = chainState();
  const lastEvidenced = state.reduce((a, s, i) => (s.happened === 'evidenced' ? i : a), -1);
  state.forEach((s, i) => {
    if (i < lastEvidenced) {
      assert.notEqual(s.happened, 'unknown',
        `${s.label} reads as unknown although ${state[lastEvidenced].label} is evidenced`);
    }
  });
});

test('an implied stage never borrows the evidence of the stage that implies it', () => {
  for (const s of chainState().filter(x => x.happened === 'implied')) {
    assert.equal(s.tracked, false, `${s.label} is implied but claims to be tracked`);
    assert.equal(s.href, null, `${s.label} is implied but links to records that do not exist`);
    assert.ok(s.needs, `${s.label} does not say what tracking it would require`);
    assert.ok(s.impliedBy, `${s.label} does not name what implies it`);
  }
});

test('every stage is a real link to a real explainer', () => {
  const html = read('index.html');
  const hrefs = [...html.matchAll(/class="cn-hit press" href="([^"]+)"/g)].map(m => m[1]);
  assert.equal(hrefs.length, 7, `expected all 7 stages to link, found ${hrefs.length}`);
  for (const h of hrefs) {
    assert.match(h, /^\/explainers\//, `a stage links to ${h} rather than its explainer`);
    assert.ok(exists(h.replace(/^\//, '') + 'index.html'), `a stage links to ${h}, which was not built`);
  }
  // An untracked stage leads to an explanation, never to records it does not have.
  assert.ok(!/class="cn-node is-(?:implied|gap)"[\s\S]{0,400}?class="cn-records"/.test(html),
    'an untracked stage offers a records link it cannot honour');
});

test('every stage states what it is in plain English, on the node itself', () => {
  const html = read('index.html');
  for (const s of chainState()) {
    assert.ok(html.includes(s.simple.replace(/&/g, '&amp;')),
      `the ${s.label} node does not carry its plain-English line`);
  }
  assert.equal((html.match(/class="cn-what"/g) || []).length, 7,
    'not every node offers the "What is this?" affordance');
});

test('the front page explains what happens at every stage, not only the gaps', () => {
  const html = read('index.html');
  assert.ok(/What happens at each stage/.test(html), 'the stage guide is missing');
  const items = (html.match(/class="cn-guideitem /g) || []).length;
  assert.equal(items, 7, `the guide explains ${items} stages, expected 7`);
  // Each entry says who sells to whom — the sentence that makes it a chain.
  for (const s of chainState()) {
    assert.ok(html.includes(s.role.replace(/&/g, '&amp;')),
      `the guide omits who sells to whom at ${s.label}`);
  }
});

test('a tracked stage offers its records as a second, separate action', () => {
  const html = read('index.html');
  const hrefs = [...html.matchAll(/class="cn-records press" href="([^"]+)"/g)].map(m => m[1]);
  assert.equal(hrefs.length, 3, `expected 3 tracked stages to offer records, found ${hrefs.length}`);
  for (const h of hrefs) {
    const file = h.split('?')[0].replace(/^\//, '') + 'index.html';
    assert.ok(exists(file), `a chain stage links to ${h}, which was not built`);
  }
});

test('stage cutouts are contained, never stretched', () => {
  const css = fs.readFileSync(path.join(DIST, 'styles.css'), 'utf8');
  assert.ok(/\.cn-asset\s*\{[^}]*object-fit:\s*contain/.test(css),
    'the stage cutout is not object-fit: contain');
  assert.ok(/\.cn-cut\s*\{[^}]*aspect-ratio/.test(css),
    'the stage cutout has no aspect-ratio container');
  const html = read('index.html');
  for (const img of html.match(/<img class="cn-asset[^>]*>/g) || []) {
    assert.ok(/width="\d+"\s+height="\d+"/.test(img), 'a stage cutout declares no dimensions');
    assert.ok(/srcset=/.test(img), 'a stage cutout ships no responsive derivatives');
  }
});

test('relationship types are distinguishable without colour', () => {
  const css = fs.readFileSync(path.join(DIST, 'styles.css'), 'utf8');
  for (const [type, style] of [['confirmed', 'solid'], ['ecosystem', 'dotted'], ['inferred', 'dashed']]) {
    assert.ok(new RegExp(`\\[data-line="${type}"\\][^}]*border-top-style:\\s*${style}`).test(css),
      `${type} relationships are not distinguished by line style`);
  }
  // And each is named in text on the page.
  const html = read('chain/index.html');
  for (const label of ['Confirmed', 'Ecosystem', 'Inferred exposure']) {
    assert.ok(html.includes(label), `the legend omits "${label}"`);
  }
});

test('the chain explorer states that every edge it holds is confirmed', () => {
  const html = read('chain/index.html');
  assert.ok(/no ecosystem or inferred edges on file/i.test(html),
    'the explorer does not say which relationship types it actually holds');
  // The graph has an accessible equal, not a fallback.
  assert.ok(/class="cor-table"/.test(html), 'there is no tabular form of the graph');
  const rows = (html.match(/<td class="tleft">/g) || []).length;
  assert.ok(rows > 20, `the relationship table looks thin: ${rows} cells`);
});

test('a customer with no disclosed site is flagged rather than guessed onto one', () => {
  const html = read('chain/index.html');
  assert.ok(/site not disclosed/.test(html), 'unsited relationships are not flagged');
  assert.ok(/guessing the site would put a fabricated delivery date/i.test(html),
    'the page does not explain why unsited edges stop at the operator');
});

test('every editorial module is present and points somewhere real', () => {
  const html = read('index.html');
  for (const marker of ['fl-hero', 'cn-track', 'whyDrawer', 'returnSummary', 'ed-grid4', 'ed-project', 'ed-explainer']) {
    assert.ok(html.includes(marker), `the homepage is missing ${marker}`);
  }
  // Every homepage href must resolve to a built route.
  const hrefs = [...html.matchAll(/href="(\/[^"#?]*)/g)].map(m => m[1]);
  for (const h of new Set(hrefs)) {
    const file = h === '/' ? 'index.html' : h.replace(/^\//, '') + (h.endsWith('/') ? 'index.html' : '');
    if (/\.(png|svg|css|js|xml|txt|webp)$/.test(h)) continue;
    assert.ok(exists(file), `the homepage links to ${h}, which was not built`);
  }
});

test('nothing above the fold loads eagerly without earning it', () => {
  const html = read('index.html');
  // The chain leads now, and its cutouts are small; no full-bleed hero image
  // means nothing needs eager loading at all.
  const eager = [...html.matchAll(/<img[^>]*loading="eager"[^>]*>/g)];
  assert.ok(eager.length <= 1, `expected at most 1 eager image, found ${eager.length}`);
});

test('every illustration is disclosed, dimensioned and lazy', () => {
  const html = read('index.html');
  const imgs = [...html.matchAll(/<img[^>]*class="ed-img[^>]*>/g)].map(m => m[0]);
  assert.ok(imgs.length >= 3, `expected several illustrations, found ${imgs.length}`);
  for (const img of imgs) {
    assert.ok(/alt="[^"]{20,}"/.test(img), `an illustration has no meaningful alt: ${img.slice(0, 90)}`);
    assert.ok(/width="\d+"/.test(img) && /height="\d+"/.test(img), 'an illustration declares no dimensions');
    assert.ok(/loading="lazy"/.test(img), 'an illustration below the fold is not lazy');
  }
  const disclosures = [...html.matchAll(/class="ed-disclosure"/g)].length;
  assert.ok(disclosures >= imgs.length, `${imgs.length} illustrations but ${disclosures} disclosures`);
});

test('promise and reality are shown side by side and never subtracted', () => {
  const html = read('index.html');
  if (!html.includes('ed-promise')) return;   // no comparable pair on file
  assert.ok(/are not subtracted/i.test(html), 'the promise/reality caveat is missing');
  // Each figure states its own basis, qualifier and as-of date.
  const metas = [...html.matchAll(/class="ed-prmeta">([^<]+)</g)].map(m => m[1]);
  assert.ok(metas.some(t => /as of/i.test(t)), 'no as-of date is shown');
  assert.ok(metas.some(t => /gross utility|critical it/i.test(t)), 'no measurement basis is shown');
  // A percentage or difference between the two would be the bug this guards.
  const promiseBlock = html.slice(html.indexOf('ed-promise'), html.indexOf('ed-caveat'));
  assert.ok(!/%/.test(promiseBlock), 'a percentage appears inside the promise/reality pair');
});

test('the delivery rail exposes both label layers and never colour alone', () => {
  // The rail lives on the site pages, where the delivery record is; the
  // homepage leads with the supply chain instead.
  const html = read('sites/iren-horizon-1/index.html');
  const steps = [...html.matchAll(/class="ed-railstep[^"]*"/g)];
  assert.equal(steps.length, 7, `expected 7 delivery stages, found ${steps.length}`);
  for (const label of ['Promised', 'Power secured', 'Being built', 'Switched on',
    'Customer signed', 'Customer accepted', 'Earning money']) {
    assert.ok(html.includes(label), `the rail is missing the simple label "${label}"`);
  }
  // Every stage prints its status as words as well as a state class.
  const states = [...html.matchAll(/class="ed-railstate">([^<]+)</g)].map(m => m[1].trim());
  assert.equal(states.length, 7);
  for (const s of states) assert.ok(s.length > 2, 'a stage has no textual status');
});

test('the why-this-matters drawer uses the fixed section order', () => {
  const html = read('index.html');
  const body = html.match(/<div class="ed-drawerbody">([\s\S]*?)<\/dialog>/);
  assert.ok(body, 'no drawer body found');
  const order = [...body[1].matchAll(/<h3>([^<]+)<\/h3>/g)].map(m => m[1]);
  assert.deepEqual(order, ['What happened', 'Why it matters', 'What changed',
    'What happens next', 'What could block it', 'View the evidence']);
});

test('the Reality Score publishes its formula and links to it', () => {
  const method = read('methodology/index.html');
  assert.ok(method.includes('id="reality-score"'), 'the score has no methodology entry');
  assert.ok(/constructed by T2C/i.test(method), 'the methodology does not say the score is constructed');
  for (const label of ['Promise delivery', 'Evidence quality', 'Timeline stability', 'Financing']) {
    assert.ok(method.includes(label), `the published formula omits ${label}`);
  }
  // Every company page must reach the formula from the score itself.
  for (const slug of ['iren', 'coreweave']) {
    const html = read(`companies/${slug}/index.html`);
    assert.ok(html.includes('href="/methodology/#reality-score"'),
      `${slug} shows a score with no link to how it is calculated`);
  }
});

test('a company that cannot be scored says why and still shows its factors', () => {
  const html = read('companies/coreweave/index.html');
  assert.ok(/Not enough published record to score/.test(html),
    'an unscored company does not explain itself');
  // The factor rows are still present — "unavailable" is not an empty panel.
  const factors = [...html.matchAll(/class="sfactor[ "]/g)].length;
  assert.equal(factors, 4, `expected 4 factor rows, found ${factors}`);
});

test('a scored company shows every input behind the number', () => {
  const html = read('companies/iren/index.html');
  const score = html.match(/<span class="scoreval [^"]*">(\d+)<\/span>/);
  assert.ok(score, 'IREN shows no score');
  assert.ok(Number(score[1]) > 0 && Number(score[1]) <= 100);
  assert.ok(/Derived/.test(html), 'the score is not labelled as derived');
  // Sample counts are printed beside each bar, not just the percentage.
  assert.ok(/\d+ of \d+ met/.test(html), 'promise delivery shows no sample');
  assert.ok(/\d+ of \d+ confirmed/.test(html), 'evidence quality shows no sample');
});

test('capacity truth states a basis for every figure', () => {
  const html = read('companies/iren/index.html');
  const cells = [...html.matchAll(/class="ctbasis">([^<]+)</g)].map(m => m[1].trim());
  assert.equal(cells.length, 4, `expected 4 capacity cells, found ${cells.length}`);
  for (const b of cells) assert.ok(b.length > 0, 'a capacity figure states no basis');
  assert.ok(/never subtracted from one another/.test(html),
    'the page does not warn that these are not one funnel');
});

test('the contract x-ray never adds a conditional maximum to committed value', () => {
  // Nebius: $12bn committed, up to $27bn. The two must appear apart.
  const html = read('companies/nebius/index.html');
  assert.ok(/class="xray"/.test(html), 'no contract x-ray on a company with contracts');
  assert.ok(/\$12bn/.test(html), 'committed value missing');
  assert.ok(/never added/i.test(html), 'the page does not state that the two are not added');
  assert.ok(!/\$27bn committed/.test(html), 'a conditional ceiling is described as committed');
});

/* ================= asset budget ================= */

test('no shipped image exceeds its budget', () => {
  // The source renders are 2 MB and 176 KB, for slots ~940px and 26px wide.
  // Shipping them untouched put 2.2 MB of images on the homepage.
  const budgets = {
    'assets/campus.webp': 200,
    'assets/campus.png': 700,
    // One sheet carrying all eight vehicle facings.
    'assets/vehicles.webp': 60,
    'assets/vehicles.png': 80,
    // Publisher mark, letterboxed to 16:9 at build time.
    'assets/news-yahoo.webp': 20,
    'assets/news-yahoo.png': 40
  };
  for (const [rel, maxKb] of Object.entries(budgets)) {
    assert.ok(exists(rel), `${rel} was not built`);
    const kb = fs.statSync(path.join(DIST, rel)).size / 1024;
    assert.ok(kb <= maxKb, `${rel} is ${kb.toFixed(0)} KB, over its ${maxKb} KB budget`);
  }
});

test('every raster image offers a WebP with a PNG fallback', () => {
  // <picture> in markup, image-set in CSS — a browser without WebP still gets
  // an image, and a build without sharp still gets a page.
  for (const r of ['sites/index.html', 'sites/iren-horizon-1/index.html']) {
    const html = read(r);
    assert.ok(/<source srcset="\/assets\/campus\.webp" type="image\/webp"/.test(html),
      `${r} offers no WebP for the campus image`);
    assert.ok(/<img[^>]+src="\/assets\/campus\.png"/.test(html),
      `${r} has no PNG fallback for the campus image`);
  }
  const css = fs.readFileSync(path.join(DIST, 'styles.css'), 'utf8');
  assert.ok(/image-set\(/.test(css), 'the vehicle sprite has no image-set');
  assert.ok(/vehicles\.png/.test(css), 'the vehicle sprite has no PNG fallback');
});

test('the vehicle sheet exposes all eight facings', () => {
  // Shipping one facing is what made the car look like it was driving backwards.
  const css = fs.readFileSync(path.join(DIST, 'styles.css'), 'utf8');
  for (const dir of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
    assert.ok(new RegExp(`\\.vehicle\\[data-dir="${dir}"\\]`).test(css),
      `the vehicle sheet has no "${dir}" facing`);
  }
});

test('images declare their dimensions so the layout cannot shift', () => {
  for (const r of ['index.html', 'sites/iren-horizon-1/index.html']) {
    const html = read(r);
    const imgs = [...html.matchAll(/<img[^>]+src="\/assets\/[^"]+"[^>]*>/g)].map(m => m[0]);
    assert.ok(imgs.length > 0, `${r} renders no asset image`);
    for (const img of imgs) {
      assert.ok(/width="\d+"/.test(img) && /height="\d+"/.test(img),
        `an image in ${r} declares no dimensions: ${img}`);
    }
  }
});

test('the map is schematic and says so', () => {
  // The map lives on the Sites explorer, where a reader is already looking for
  // sites; the homepage leads with the story instead.
  const html = read('sites/index.html');
  assert.ok(/class="mapnote"/.test(html), 'the map carries no explanation');
  assert.ok(/not geographic/i.test(html),
    'the map does not disclaim that its positions are not geographic');
  // Every hotspot opens a real site.
  const hots = [...html.matchAll(/class="hot press[^"]*" href="(\/sites\/[^"]+)"/g)].map(m => m[1]);
  assert.ok(hots.length > 0, 'the map has no hotspots');
  for (const h of hots) {
    assert.ok(exists(h.replace(/^\//, '') + 'index.html'), `hotspot points at unbuilt ${h}`);
  }
  // Every hotspot names itself for assistive technology, not by position alone.
  const labelled = [...html.matchAll(/class="hot press[^"]*"[\s\S]{0,220}?aria-label="([^"]+)"/g)];
  assert.equal(labelled.length, hots.length, 'a hotspot has no accessible name');
});

test('the map surface cannot steal a hotspot click', () => {
  const html = read('sites/index.html');
  // The full-surface link must precede the hotspots in source order and must not
  // wrap them — a nested link would fire both destinations.
  const surface = html.indexOf('class="mapsurface"');
  const firstHot = html.indexOf('class="hot press');
  assert.ok(surface > -1 && firstHot > -1, 'the map is missing its surface or hotspots');
  assert.ok(surface < firstHot, 'the map surface is drawn over the hotspots');
  assert.ok(/<a class="mapsurface"[^>]*><\/a>/.test(html),
    'the map surface is not an empty link — a hotspot may be nested inside it');
});

/* ================= document structure ================= */

test('each page has exactly one main landmark and one h1', () => {
  for (const r of [...ROUTES, 'companies/iren/index.html', 'companies/keel/index.html']) {
    const html = read(r);
    assert.equal((html.match(/<main[\s>]/g) || []).length, 1, `${r} has more than one <main>`);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${r} does not have exactly one <h1>`);
  }
});

test('every page offers a skip link as its first focusable element', () => {
  for (const r of ROUTES) {
    const html = read(r);
    assert.ok(html.includes('class="skiplink" href="#main"'), `${r} has no skip link`);
    assert.ok(html.indexOf('skiplink') < html.indexOf('class="appbar"'),
      `${r} puts the skip link after the header`);
  }
});

test('the current route is marked for assistive technology, not colour alone', () => {
  const cases = [['companies/index.html', '/companies/'],
    ['catalysts/index.html', '/catalysts/'], ['explainers/index.html', '/explainers/'],
    ['companies/iren/index.html', '/companies/']];
  for (const [file, href] of cases) {
    const html = read(file);
    const link = html.match(new RegExp(`<a class="navlink[^"]*"[^>]*href="${href}"[^>]*>`));
    assert.ok(link, `${file} has no nav link to ${href}`);
    assert.ok(/aria-current="page"/.test(link[0]), `${file} does not mark ${href} as current`);
  }
});

/* ================= market and feed state ================= */

test('no page ships a hard-coded price, change or market state', () => {
  for (const r of [...ROUTES, 'companies/iren/index.html']) {
    const html = read(r);
    const pill = html.match(/<span class="mstate[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<\/span>/);
    assert.ok(pill, `${r} has no market-state pill`);
    assert.ok(/Updating…/.test(pill[0]),
      `${r} states a market session in static HTML instead of waiting for the client`);
  }
});

test('price slots are placeholders the client fills, never baked figures', () => {
  const html = read('companies/index.html');
  const slots = [...html.matchAll(/data-price="([A-Z]+)"[^>]*>([\s\S]*?)<\/(?:div|span)>/g)];
  assert.ok(slots.length > 0, 'no price slots on the companies page');
  for (const s of slots) {
    assert.ok(/skel/.test(s[2]), `${s[1]} ships content in its price slot rather than a skeleton`);
  }
});

/* ================= honesty rules survive the redesign ================= */

test('guided windows are never printed as exact dates', () => {
  // The timeline is rendered from an inlined payload, so the payload is what must
  // be honest — the renderer only ever prints what it is handed.
  const html = read('catalysts/index.html');
  const raw = html.match(/Object\.assign\(window, (\{[\s\S]*?\})\);<\/script>/);
  assert.ok(raw, 'the catalysts page inlines no timeline data');
  const cats = JSON.parse(raw[1]).T2C_CATALYSTS;
  assert.ok(Array.isArray(cats) && cats.length, 'the catalyst payload is empty');

  for (const c of cats) {
    assert.ok(c.certainty, `${c.id} carries no certainty label`);
    if (c.status === 'confirmed-date') {
      assert.equal(c.certainty, 'Confirmed date');
      assert.equal(c.group !== 'Guided windows', true);
    } else if (c.group === 'Guided windows') {
      // A window must read as a window — a quarter, a half or a year, never a day.
      assert.ok(/^Expected during /.test(c.certainty),
        `${c.id} is a guided window but its label reads "${c.certainty}"`);
      assert.ok(!/^\d{1,2} [A-Z][a-z]{2} \d{4}$/.test(c.when),
        `${c.id} prints the guided window "${c.when}" as if it were an exact date`);
    } else {
      assert.equal(c.certainty, 'No date published');
      assert.equal(c.when, 'Date unknown');
    }
    // A countdown implies a date precise enough to count down to.
    if (c.countdown !== null) assert.equal(c.status, 'confirmed-date',
      `${c.id} shows a countdown without a confirmed date`);
  }
});

test('a company that cannot be modelled says why, and offers no Lab link', () => {
  const html = read('companies/coreweave/index.html');
  assert.ok(!html.includes('/lab/?company=coreweave'),
    'CoreWeave links into the Lab despite having no derivable revenue rate');
  assert.ok(/Not modellable yet/.test(html), 'CoreWeave does not say it cannot be modelled');
  assert.ok(/class="csnapwhy"/.test(html), 'CoreWeave gives no reason for being unmodellable');
});

test('a company that can be modelled links straight into the Lab', () => {
  const html = read('companies/iren/index.html');
  assert.ok(html.includes('href="/lab/?company=iren"'), 'IREN has no Edge Lab route');
});

test('undisclosed figures render as not disclosed, never as zero', () => {
  for (const r of ['companies/index.html', 'companies/keel/index.html', 'index.html']) {
    const html = read(r);
    assert.ok(!/>0 MW</.test(html), `${r} prints 0 MW, which is a value, not an absence`);
    assert.ok(!/>\$0(bn|m)</.test(html), `${r} prints a zero currency figure`);
  }
});

/* ================= mobile and interaction affordances ================= */

test('the mobile bar carries four reachable destinations', () => {
  // Six labels collide at 390px, so mobile prioritises Today, Chain, Watchlist
  // and Search. Everything omitted stays reachable from the utility menu, which
  // the "no orphaned route" test above already enforces on every page.
  for (const r of ROUTES) {
    const html = read(r);
    assert.ok(html.includes('class="bottomnav"'), `${r} has no mobile navigation`);
    const hrefs = [...html.matchAll(/class="bnav[^"]*" href="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(hrefs, ['/', '/chain/', '/companies/?filter=watching'],
      `${r} mobile navigation is wrong`);
    assert.ok(/id="palOpenMobile"/.test(html), `${r} mobile bar has no search`);
  }
});

test('every wide table can scroll inside its own container', () => {
  for (const r of ['research/index.html', 'companies/iren/index.html']) {
    const html = read(r);
    const tables = (html.match(/<table[\s>]/g) || []).length;
    const wrappers = (html.match(/class="tw"/g) || []).length;
    assert.ok(wrappers >= tables,
      `${r} has ${tables} tables but only ${wrappers} scroll containers`);
  }
});

test('the Lab and Compare mode switchers are real tab lists', () => {
  for (const r of ['lab/index.html', 'compare/index.html']) {
    const html = read(r);
    assert.ok(/role="tablist"/.test(html), `${r} modebar is not a tablist`);
    const tabs = [...html.matchAll(/class="mode(?: [^"]*)?" role="tab"[^>]*>/g)].map(m => m[0]);
    assert.ok(tabs.length >= 2, `${r} has fewer than two modes`);
    for (const t of tabs) {
      assert.ok(/aria-selected="(true|false)"/.test(t), `a mode button on ${r} has no aria-selected`);
    }
  }
});

test('the company page carries a section navigation whose targets all exist', () => {
  const html = read('companies/iren/index.html');
  const nav = html.match(/<nav class="secnav"[\s\S]*?<\/nav>/);
  assert.ok(nav, 'no section navigation on the company page');
  const ids = [...nav[0].matchAll(/href="#([a-z-]+)"/g)].map(m => m[1]);
  assert.ok(ids.length >= 4, 'section navigation is too thin to be useful');
  for (const id of ids) {
    assert.ok(html.includes(`id="${id}"`), `section navigation points at #${id}, which is not on the page`);
  }
});

/* ================= your own calls stay yours ================= */

test('a saved call never leaves the browser', () => {
  const app = fs.readFileSync(path.join(DIST, 'app.js'), 'utf8');
  const block = app.slice(app.indexOf('CALLS_KEY'), app.indexOf('sticky section navigation'));
  assert.ok(block.length > 500, 'the calls controller was not found in the shipped bundle');
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'navigator.sendBeacon', 'WebSocket']) {
    assert.ok(!block.includes(forbidden),
      `the calls controller uses ${forbidden}, so a private call could be transmitted`);
  }
  // The analytics event may record that a call happened, never its content.
  const ev = block.match(/track\('call_saved',\s*(\{[^}]*\})/);
  assert.ok(ev, 'no analytics call found to check');
  for (const field of ['why', 'confidence', 'mw', 'gate']) {
    assert.ok(!ev[1].includes(field), `the call_saved event carries "${field}", which is the reader's content`);
  }
});

test('the call panel says where the data lives, on the page itself', () => {
  const html = read('companies/iren/index.html');
  assert.ok(/Private to this browser/.test(html));
  assert.ok(/never receives it/.test(html),
    'the call panel does not state that T2C never receives a call');
});

/* ================= assets ================= */

test('the Lab ships its engine and its controller', () => {
  assert.ok(exists('lab-engine.js'));
  assert.ok(exists('lab-ui.js'));
  const html = read('lab/index.html');
  assert.ok(html.includes('/lab-engine.js'), 'the Lab page does not load the engine');
  assert.ok(html.includes('/lab-ui.js'), 'the Lab page does not load the controller');
  // and nowhere else pays for it
  assert.ok(!read('index.html').includes('/lab-engine.js'),
    'the homepage downloads the simulation engine it never runs');
});

test('the stylesheet is one request and includes the shell layer', () => {
  const html = read('index.html');
  assert.equal((html.match(/rel="stylesheet"/g) || []).length, 1);
  const css = read('styles.css');
  assert.ok(css.includes('.appbar'), 'shell styles are missing from the bundle');
  assert.ok(css.includes('.csnapfigs'), 'company snapshot styles are missing from the bundle');
});
