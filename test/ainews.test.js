/**
 * AI News tests.
 *
 * The page makes three promises that are easy to state and easy to break: the
 * set is finite, every signal answers happened/matters/next, and every material
 * claim opens its documents. Most of what follows holds those three.
 *
 * The fourth thing worth testing is the grouping claim. "Noise removed" is the
 * kind of figure that quietly becomes marketing, so the rule behind it is
 * asserted rather than the number.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signals } from '../src/lib/signals.js';
import { leadStory, storyFor } from '../src/lib/leadstory.js';
import {
  newsSignals, signalGroups, featuredSignal, dailySet, sourceQuality,
  companyImpact, upcomingCatalysts, filterOptions, MATERIALITY
} from '../src/lib/ainews.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = rel => fs.readFileSync(path.join(ROOT, 'dist', rel), 'utf8');
const page = () => read('ai-news/index.html');

/* ================= the triad ================= */

test('every signal answers what happened, why it matters and what may happen next', () => {
  for (const r of newsSignals()) {
    assert.ok(r.happened && r.happened.length > 15, `${r.id}: no "what happened"`);
    assert.ok(r.matters && r.matters.length > 15, `${r.id}: no "why it matters"`);
    assert.ok(r.next && r.next.length > 15, `${r.id}: no "what may happen next"`);
  }
});

test('the triad comes from the same function the homepage uses, not a second copy', () => {
  // Two implementations of this logic drifting apart is a bug this codebase has
  // already shipped once. leadStory must be storyFor applied to its selection.
  const lead = leadStory();
  const direct = storyFor(lead.signal);
  for (const k of ['headline', 'whatHappened', 'whyItMatters', 'whatHappensNext']) {
    assert.equal(lead[k], direct[k], `leadStory and storyFor disagree on ${k}`);
  }
});

test('the rendered page shows all three questions on every signal', () => {
  const html = page();
  const rows = (html.match(/class="an-triad"/g) || []).length;
  assert.ok(rows > 0, 'no signal renders the triad');
  for (const q of ['What happened', 'Why it matters', 'What may happen next']) {
    assert.equal((html.match(new RegExp(q, 'g')) || []).length, rows,
      `"${q}" does not appear once per signal`);
  }
});

/* ================= finite ================= */

test('the set is finite and the page says how large it is', () => {
  const g = signalGroups();
  assert.equal(g.records, signals({}).length);
  const html = page();
  assert.ok(html.includes(`<b>${g.records}</b> material signal`),
    'the page does not state the size of the whole record');
  assert.match(html, /the whole record, not the\s+first page of one/i);
});

test('the progress bar has one pip per signal in the latest set', () => {
  const set = dailySet();
  const html = page();
  assert.equal((html.match(/class="an-pip"/g) || []).length, set.rows.length);
  assert.match(html, new RegExp(`aria-valuemax="${set.rows.length}"`));
});

test('a caught-up state exists and starts hidden', () => {
  const html = page();
  assert.match(html, /id="anCaughtUp"[^>]*hidden/);
  assert.match(html, /You're caught up/);
});

test('the daily set is the newest date on the record, not "today"', () => {
  const set = dailySet();
  const newest = newsSignals()[0].announcedAt;
  assert.equal(set.at, newest);
  for (const r of set.rows) assert.equal(r.announcedAt, set.at);
});

/* ================= evidence ================= */

test('every signal opens its documents', () => {
  for (const r of newsSignals()) {
    assert.ok(r.sourceCount > 0, `${r.id} cites nothing`);
    for (const s of r.sources) {
      assert.ok(s.url && s.title && s.publisher, `${r.id} has an incomplete source`);
    }
  }
});

test('the rendered evidence drawer carries publisher, date and primary status', () => {
  const html = page();
  const drawers = (html.match(/class="an-ev"/g) || []).length;
  assert.ok(drawers > 0);
  assert.match(html, /class="an-evmeta"/);
  assert.match(html, /Primary|Secondary/);
  assert.match(html, /does not verify the underlying event/);
});

test('evidence anchors are unique, and the lead is not repeated in the feed', () => {
  const html = page();
  const ids = [...html.matchAll(/id="(ev-[^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'two evidence drawers share an id');
  // The lead renders above the feed and is removed from it: the same headline
  // twice in succession reads as a bug.
  const lead = featuredSignal();
  assert.ok(ids.includes(`ev-lead-${lead.id}`), 'the lead has no evidence drawer');
  assert.ok(!ids.includes(`ev-feed-${lead.id}`), 'the lead is duplicated in the feed');
  const rows = [...html.matchAll(/class="an-row"[^>]*data-id="([^"]+)"/g)].map(m => m[1]);
  assert.ok(!rows.includes(lead.id), 'the lead signal appears twice');
  assert.equal(new Set(rows).size, rows.length, 'a signal appears more than once in the feed');
});

test('the lead is still counted in the whole record and in the review set', () => {
  const g = signalGroups();
  const html = page();
  // Lifting it out of the feed must not shrink the totals.
  assert.ok(html.includes(`<b>${g.records}</b> material signal`));
  const cfg = JSON.parse(html.match(/id="t2c-config">([\s\S]*?)<\/script>/)[1]);
  assert.ok(cfg.aiNews.latest.includes(featuredSignal().id),
    'the lead is excluded from the review set, so the pips can never fill');
});

/* ================= grouping ================= */

test('grouping rests on shared documents and nothing else', () => {
  const { groups } = signalGroups();
  for (const g of groups) {
    if (g.grouped === 1) continue;
    // Every member of a group must cite exactly the same document set.
    const key = ids => [...(ids || [])].sort().join('+');
    const first = key(g.members[0].signal.sourceIds);
    for (const m of g.members) {
      assert.equal(key(m.signal.sourceIds), first,
        `group ${g.key} contains records citing different documents`);
    }
  }
});

test('grouping never loses a record', () => {
  const g = signalGroups();
  assert.equal(g.groups.reduce((a, x) => a + x.grouped, 0), g.records);
  assert.equal(g.groups.length, g.disclosures);
});

test('the page states the real noise figure, not the mockup\'s', () => {
  const g = signalGroups();
  const html = page();
  assert.ok(html.includes(`<b>${g.records} records</b>`), 'the record count is not stated');
  assert.ok(html.includes(`<b>${g.disclosures} disclosures</b>`), 'the disclosure count is not stated');
  // The rule is published, because the number is only meaningful with it.
  assert.match(html, /does not group by matching headlines/i);
});

/* ================= materiality ================= */

test('materiality is the record\'s own significance, never rescored', () => {
  const bySig = Object.fromEntries(signals({}).map(s => [s.id, s.significance]));
  for (const r of newsSignals()) {
    assert.equal(r.materiality, bySig[r.id] || 'medium', `${r.id} materiality was recomputed`);
    assert.ok(MATERIALITY[r.materiality], `${r.id} has an undefined materiality`);
  }
});

test('signals sort newest first, most material first within a day', () => {
  const rows = newsSignals();
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    if (a.announcedAt === b.announcedAt) {
      assert.ok(MATERIALITY[a.materiality].rank >= MATERIALITY[b.materiality].rank,
        `${a.id} precedes ${b.id} despite being less material`);
    } else {
      assert.ok(a.announcedAt > b.announcedAt, `${a.id} precedes an older ${b.id}`);
    }
  }
});

/* ================= stage mapping ================= */

test('a signal is never mapped to a stage T2C does not track', () => {
  const tracked = new Set(['factory', 'accepted', 'revenue']);
  for (const r of newsSignals()) {
    for (const s of r.stages) {
      assert.ok(tracked.has(s.id), `${r.id} claims untracked stage ${s.id}`);
    }
  }
});

test('every affected-stage chip links to a built explainer', () => {
  const html = page();
  const hrefs = [...html.matchAll(/class="an-stage press" href="([^"]+)"/g)].map(m => m[1]);
  assert.ok(hrefs.length > 0, 'no signal names an affected stage');
  for (const h of new Set(hrefs)) {
    assert.ok(fs.existsSync(path.join(ROOT, 'dist', h.slice(1), 'index.html')), `${h} is a dead link`);
  }
});

/* ================= filters ================= */

test('no filter option would return an empty set', () => {
  const rows = newsSignals();
  const o = filterOptions();
  for (const c of o.categories) {
    assert.ok(rows.some(r => r.category === c.id), `category ${c.id} matches nothing`);
    assert.equal(c.count, rows.filter(r => r.category === c.id).length);
  }
  for (const m of o.materialities) {
    assert.ok(rows.some(r => r.materiality === m.id), `materiality ${m.id} matches nothing`);
  }
  for (const c of o.companies) {
    assert.ok(rows.some(r => r.ticker === c.ticker), `company ${c.ticker} matches nothing`);
  }
});

test('filters are real buttons and selects, not colour-only chips', () => {
  const html = page();
  const btns = [...html.matchAll(/<button[^>]*class="an-filter[^"]*"[^>]*>/g)].map(m => m[0]);
  assert.ok(btns.length > 1);
  for (const b of btns) assert.match(b, /aria-pressed="(true|false)"/);
  assert.match(html, /<select id="anMateriality"/);
  assert.match(html, /<select id="anCompany"/);
  // Each select has an accessible name even though its label is visually hidden.
  assert.match(html, /<span class="vh">Minimum materiality<\/span>/);
});

test('the filter state is announced, not only shown', () => {
  assert.match(page(), /id="anFilterState"[^>]*aria-live="polite"/);
});

/* ================= the rail ================= */

test('watchlist impact ships counts but no reader state', () => {
  const html = page();
  const rows = companyImpact();
  assert.ok(rows.length > 0);
  for (const r of rows) {
    assert.ok(html.includes(`data-co="${r.ticker}"`), `${r.ticker} missing from the impact panel`);
  }
  // Every row starts hidden; only the browser knows what is watched.
  const watchRows = (html.match(/class="an-watchrow"[^>]*hidden/g) || []).length;
  assert.equal(watchRows, rows.length, 'a watchlist row is visible before the browser decides');
  assert.match(html, /stored on this device only/i);
});

test('catalysts are forward-looking, and a window stays a window', () => {
  const rows = upcomingCatalysts('2026-08-16');
  for (const c of rows) {
    assert.ok(c.when >= '2026-08-16', `${c.id} is in the past`);
    if (c.isWindow) assert.equal(c.expectedAt, null, `${c.id} claims an exact date it does not have`);
  }
  // Sorted soonest first.
  const dates = rows.map(c => c.when);
  assert.deepEqual(dates, [...dates].sort());
});

test('source quality counts the strongest document behind each signal', () => {
  const q = sourceQuality();
  assert.equal(q.rows.reduce((a, r) => a + r.count, 0), newsSignals().length);
  assert.equal(q.allPrimary, newsSignals().every(r => r.confidence === 'confirmed'));
});

/* ================= separation of the three news routes ================= */

test('AI News, the ledger and the wire are distinct and say so', () => {
  const html = page();
  assert.ok(html.includes('href="/intelligence/"'), 'AI News does not point at the expert view');
  assert.ok(html.includes('href="/news/"'), 'AI News does not point at the wire');
  assert.match(html, /third-party headlines T2C has not verified/i);
});

test('the wire is never presented as a T2C record', () => {
  const wire = read('news/index.html');
  assert.match(wire, /Third-party|unverified|not verified/i);
});

/* ================= no invention ================= */

test('nothing on the page claims a figure the record does not carry', () => {
  const html = page();
  // The mockup's "27 stories grouped into 8 material signals" must not survive.
  assert.ok(!/27 stories/.test(html), 'a mockup figure was copied into production');
  assert.ok(!/\(EXAMPLE\)/i.test(html), 'mockup example labelling reached production');
});

test('the editorial raster only appears where it depicts the subject', () => {
  const html = page();
  // Nothing on file is photonics, so the optical image must not appear at all.
  const photonicsSignals = newsSignals().filter(r => r.stages.some(s => s.id === 'photonics'));
  if (!photonicsSignals.length) {
    assert.ok(!html.includes('optical-network-signal'),
      'the optical editorial image appears with no photonics signal to illustrate');
  }
});
