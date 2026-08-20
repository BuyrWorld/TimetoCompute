/**
 * Explainer and supplier tests.
 *
 * The supplier table is the highest-risk surface added in this phase. A reader
 * scanning "public companies in this area" assumes somebody bought something,
 * and six of the seven rows rest on documents that name no buyer at all. Most of
 * what follows exists to keep that distinction from eroding — in the data, in
 * the markup, and in the words on screen.
 *
 * The rest covers the promise the homepage now makes: every stage links to a
 * real page, and every one of those pages is genuinely readable by somebody who
 * arrived knowing nothing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPLAINERS, STAGE_EXPLAINERS, COMPONENT_EXPLAINERS, EXPLAINER_BY_SLUG } from '../data/explainers.js';
import { PHOTONICS_SUPPLIERS, EVIDENCE_GRADES } from '../data/suppliers.js';
import { GLOSSARY } from '../data/glossary.js';
import {
  supplierRows, glossaryFor, chainContext, neighbours, childrenOf, relatedSignals, explainerRoutes
} from '../src/lib/explain.js';
import { chainState } from '../src/lib/chain.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = rel => fs.readFileSync(path.join(ROOT, 'dist', rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, 'dist', rel));

/* ================= routes ================= */

test('all thirteen explainer routes are built', () => {
  const routes = explainerRoutes();
  assert.equal(routes.length, 13);
  for (const { href } of routes) {
    assert.ok(exists(`${href.slice(1)}index.html`), `${href} was not built`);
  }
});

test('every homepage chain node opens a page that exists', () => {
  const html = read('index.html');
  const hrefs = [...html.matchAll(/class="cn-hit press" href="([^"]+)"/g)].map(m => m[1]);
  assert.equal(hrefs.length, 7);
  for (const h of hrefs) assert.ok(exists(`${h.slice(1)}index.html`), `${h} is a dead link`);
});

test('every component card is a link, never a modal-only dead end', () => {
  const html = read('explainers/photonics/index.html');
  const hrefs = [...html.matchAll(/class="ex-partlink press" href="([^"]+)"/g)].map(m => m[1]);
  assert.equal(hrefs.length, 6, `photonics shows ${hrefs.length} component links, expected 6`);
  for (const h of hrefs) assert.ok(exists(`${h.slice(1)}index.html`), `${h} is a dead link`);
});

test('every explainer is reachable from the hub', () => {
  const html = read('explainers/index.html');
  for (const s of STAGE_EXPLAINERS) {
    assert.ok(html.includes(`href="/explainers/${s.slug}/"`), `the hub omits ${s.slug}`);
  }
});

/* ================= the supplier table ================= */

test('every supplier row states what its document actually establishes', () => {
  for (const s of PHOTONICS_SUPPLIERS) {
    assert.ok(EVIDENCE_GRADES[s.grade], `${s.id} has no evidence grade`);
    assert.ok(s.evidence.length > 40, `${s.id} does not describe its evidence`);
    assert.ok(s.sourceIds.length, `${s.id} cites nothing`);
  }
});

test('a capability row never claims a counterparty, and an agreement always names one', () => {
  for (const s of PHOTONICS_SUPPLIERS) {
    if (s.grade === 'capability') {
      assert.equal(s.counterparty, null,
        `${s.id} is graded capability but names ${s.counterparty}`);
    }
    if (s.grade === 'supply-agreement') {
      assert.ok(s.counterparty, `${s.id} claims an agreement with nobody`);
    }
  }
});

test('exactly one row is a named company-to-company supply agreement', () => {
  // The ingested seed marked four rows "direct supplier". Reading the documents,
  // only AXT→Lumentum is an agreement between two named companies. If a future
  // edit promotes another row, this test should be updated deliberately — with
  // the document that justifies it.
  const agreements = PHOTONICS_SUPPLIERS.filter(s => s.grade === 'supply-agreement');
  assert.equal(agreements.length, 1);
  assert.equal(agreements[0].ticker, 'AXTI');
  assert.equal(agreements[0].counterparty, 'Lumentum');
});

test('a withheld counterparty is shown as withheld, never guessed', () => {
  const aaoi = PHOTONICS_SUPPLIERS.find(s => s.ticker === 'AAOI');
  assert.equal(aaoi.grade, 'volume-order');
  assert.match(aaoi.counterparty, /withheld/i);
  // No hyperscaler may be named against it anywhere on the page.
  const html = read('what-is/optical-transceiver/index.html');
  const row = html.slice(html.indexOf('AAOI'), html.indexOf('AAOI') + 1400);
  for (const guess of ['Microsoft', 'Amazon', 'Google', 'Meta', 'Oracle']) {
    assert.ok(!row.includes(guess), `the AAOI row names ${guess}, which the release does not`);
  }
});

test('rows are ordered strongest evidence first', () => {
  for (const slug of ['photonics', 'optical-transceiver']) {
    const ranks = supplierRows(slug).map(r => EVIDENCE_GRADES[r.grade].rank);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => b - a),
      `${slug} does not lead with its strongest evidence`);
  }
});

test('a capability row is not drawn like a confirmed award', () => {
  const css = read('styles.css');
  // Tone comes from the grade and nothing else, and the three tones differ.
  for (const g of ['ok', 'warn', 'info']) {
    assert.match(css, new RegExp(`\\.ex-grade\\[data-grade="${g}"\\]`),
      `no styling distinguishes the ${g} evidence tone`);
  }
  const html = read('explainers/photonics/index.html');
  assert.ok(html.includes('data-grade="info"'), 'no capability row is marked as such');
  assert.ok(html.includes('data-grade="ok"'), 'no confirmed row is marked as such');
});

test('the supplier caveat appears wherever a supplier table does', () => {
  for (const { href } of explainerRoutes()) {
    const html = read(`${href.slice(1)}index.html`);
    if (!html.includes('ex-suppliers')) continue;
    assert.ok(/making a component is not the same as having been awarded work/.test(html),
      `${href} shows suppliers without the caveat`);
  }
});

/* ================= market quotes ================= */

test('no share price is hard-coded anywhere in the built pages', () => {
  for (const { href } of explainerRoutes()) {
    const html = read(`${href.slice(1)}index.html`);
    const cells = [...html.matchAll(/class="ex-quote"[\s\S]{0,400}?<\/span>\s*<\/td>/g)];
    for (const [cell] of cells) {
      assert.ok(!/\$\s?\d/.test(cell), `${href} prints a currency figure in a quote cell`);
      assert.match(cell, /data-quote-state="unavailable"/);
    }
  }
});

test('an unavailable quote is a stated state, not a blank', () => {
  const html = read('explainers/photonics/index.html');
  assert.match(html, /No market-data provider is configured/);
  assert.match(html, /never prints a stored price/);
});

test('a missing quote does not block the content', () => {
  // Every substantive section must render with no provider configured.
  const html = read('explainers/photonics/index.html');
  for (const id of ['why', 'parts', 'how', 'io', 'bottleneck', 'chain', 'suppliers', 'glossary']) {
    assert.ok(html.includes(`id="${id}"`), `photonics is missing its ${id} section`);
  }
});

/* ================= writing rules ================= */

test('the plain-English translation appears exactly once per page', () => {
  for (const { explainer, href } of explainerRoutes()) {
    const html = read(`${href.slice(1)}index.html`);
    const count = (html.match(/class="ex-simple"/g) || []).length;
    assert.equal(count, 1, `${href} has ${count} bracketed translations, expected 1`);
    assert.ok(html.includes(`(In simple terms: ${explainer.simple}.)`),
      `${href} does not carry its own translation`);
  }
});

test('every explainer states a definition, a mechanism and a bottleneck', () => {
  for (const e of EXPLAINERS) {
    assert.ok(e.definition.length > 40, `${e.slug}: thin definition`);
    assert.ok(e.howItWorks.length >= 3, `${e.slug}: fewer than three steps`);
    assert.ok(e.bottleneck.length > 60, `${e.slug}: thin bottleneck`);
    assert.ok(e.simple.length > 10 && e.simple.length < 90, `${e.slug}: translation is not one line`);
  }
});

test('a bottleneck is a statement about the technology, never about a named project', () => {
  const named = ['IREN', 'TeraWulf', 'CoreWeave', 'Microsoft', 'Anthropic', 'Nebius',
    'Applied Digital', 'Horizon 1', 'Lake Mariner'];
  for (const e of EXPLAINERS) {
    for (const n of named) {
      assert.ok(!e.bottleneck.includes(n),
        `${e.slug} attributes a bottleneck to ${n} without a source`);
    }
  }
});

/* ================= glossary ================= */

test('a glossary term is only listed on a page that actually uses it', () => {
  for (const e of EXPLAINERS) {
    const prose = [e.definition, e.whyAi, e.madeOf, e.inputs, e.outputs, e.bottleneck,
      ...e.howItWorks].join(' ').toLowerCase();
    for (const g of glossaryFor(e.slug)) {
      const used = [g.term, ...g.aliases].some(t => prose.includes(t.toLowerCase()));
      assert.ok(used, `${e.slug} lists "${g.term}" but never uses it`);
    }
  }
});

test('every glossary popover is keyboard reachable and has an accessible name', () => {
  const html = read('what-is/optical-transceiver/index.html');
  const triggers = [...html.matchAll(/<button[^>]*class="ex-glosstrigger press"[^>]*>/g)];
  assert.ok(triggers.length > 0, 'the transceiver page shows no glossary triggers');
  for (const [t] of triggers) {
    assert.match(t, /popovertarget="gloss-/, 'a glossary trigger controls no popover');
    assert.match(t, /aria-label="What does /, 'a glossary trigger has no accessible name');
  }
});

test('every glossary entry defines itself twice: short and long', () => {
  for (const g of GLOSSARY) {
    assert.ok(g.short.length > 15 && g.short.length < 90, `${g.id}: short form is not a one-liner`);
    assert.ok(g.long.length > 80, `${g.id}: long form adds nothing`);
    assert.ok(!g.short.toLowerCase().includes(g.term.toLowerCase()),
      `${g.id} defines itself using its own name`);
  }
});

/* ================= chain position ================= */

test('a component page places itself under its parent stage', () => {
  for (const c of COMPONENT_EXPLAINERS) {
    const ctx = chainContext(c.slug);
    const here = ctx.filter(s => s.here);
    assert.equal(here.length, 1, `${c.slug} highlights ${here.length} stages`);
    assert.equal(here[0].label, 'Photonics');
    const html = read(`what-is/${c.slug}/index.html`);
    assert.ok(html.includes('href="/explainers/photonics/"'), `${c.slug} does not link to its parent`);
  }
});

test('the chain strip reports the same state as the homepage', () => {
  // Two copies of the evidenced/implied mapping drifting apart is a bug this
  // codebase has already shipped once.
  const ctx = chainContext('materials');
  const home = chainState();
  assert.equal(ctx.filter(s => s.happened === 'evidenced').length,
    home.filter(s => s.happened === 'evidenced').length);
  assert.equal(ctx.filter(s => s.happened === 'implied').length,
    home.filter(s => s.happened === 'implied').length);
});

test('adjacent stages are offered, and the ends do not wrap', () => {
  assert.equal(neighbours('materials').previous, null);
  assert.equal(neighbours('materials').next.slug, 'wafers');
  assert.equal(neighbours('revenue-recognition').next, null);
  assert.equal(neighbours('revenue-recognition').previous.slug, 'customer-acceptance');
});

/* ================= empty states ================= */

test('a stage with no signals says so rather than borrowing one', () => {
  assert.equal(relatedSignals('photonics').length, 0);
  const html = read('explainers/photonics/index.html');
  assert.match(html, /T2C holds no sourced signal for Photonics/);
});

test('a stage with real signals shows them', () => {
  assert.ok(relatedSignals('customer-acceptance').length > 0);
  const html = read('explainers/customer-acceptance/index.html');
  assert.ok(html.includes('class="ex-signals"'), 'acceptance shows no signal list');
});

test('only photonics carries children; the other stages say nothing about parts', () => {
  for (const s of STAGE_EXPLAINERS) {
    const n = childrenOf(s).length;
    assert.equal(n, s.slug === 'photonics' ? 6 : 0, `${s.slug} has ${n} components`);
    const html = read(`explainers/${s.slug}/index.html`);
    assert.equal(html.includes('class="ex-parts"'), s.slug === 'photonics',
      `${s.slug} renders a component list it does not have`);
  }
});
