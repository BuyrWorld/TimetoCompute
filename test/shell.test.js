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

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');

const read = rel => fs.readFileSync(path.join(DIST, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(DIST, rel));

const ROUTES = ['index.html', 'companies/index.html', 'sites/index.html',
  'intelligence/index.html', 'compare/index.html', 'catalysts/index.html',
  'lab/index.html', 'research/index.html', 'methodology/index.html'];

/** The five primary destinations, in the order the shell presents them. */
const NAV_HREFS = ['/', '/companies/', '/sites/', '/intelligence/', '/lab/'];

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

test('the shell offers exactly the five primary destinations, in order', () => {
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
    for (const href of ['/compare/', '/catalysts/', '/research/', '/methodology/']) {
      assert.ok(html.includes(`href="${href}"`), `${r} orphans ${href}`);
    }
  }
});

test('a demoted route still tells the reader where they are', () => {
  // Research and Compare have no nav slot. They must still mark themselves
  // current somewhere, or the reader lands on a page the shell does not admit to.
  for (const [file, href] of [['research/index.html', '/research/'],
    ['compare/index.html', '/compare/'], ['catalysts/index.html', '/catalysts/'],
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

test('the marketing hero appears on the homepage and nowhere else', () => {
  assert.ok(read('index.html').includes('class="hero"'));
  for (const r of ROUTES.slice(1)) {
    assert.ok(!read(r).includes('class="hero"'), `${r} repeats the homepage hero`);
  }
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
  const cases = [['companies/index.html', '/companies/'], ['lab/index.html', '/lab/'],
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

test('the mobile bottom navigation exists and mirrors the primary routes', () => {
  // Mobile shows the same five destinations as the desktop bar — no "More"
  // bucket that hides a route from one viewport but not the other.
  for (const r of ROUTES) {
    const html = read(r);
    assert.ok(html.includes('class="bottomnav"'), `${r} has no mobile navigation`);
    const hrefs = [...html.matchAll(/class="bnav[^"]*" href="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(hrefs, NAV_HREFS, `${r} mobile navigation does not mirror the primary nav`);
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
