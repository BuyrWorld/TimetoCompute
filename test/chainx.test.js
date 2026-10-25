/**
 * The supply-chain homepage and the simplified site pages (October 2026).
 *
 * The rule the whole map rests on: a line between two companies exists only
 * where a filing says so, and it quotes that filing. These tests keep it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAIN_COMPANIES, CHAIN_COMPANY_BY_ID, CHAIN_LINKS } from '../data/chain.js';
import { CHAIN_STAGES } from '../data/chainstages.js';
import { SOURCE_BY_ID } from '../data/sources.js';
import { allSites, siteStatus } from '../src/lib/sites.js';
import { siteAliases } from '../src/pages.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = rel => fs.readFileSync(path.join(ROOT, 'dist', rel), 'utf8');

/* ---- data ---- */

test('every chain stage has at least three companies', () => {
  for (const s of CHAIN_STAGES) {
    const n = CHAIN_COMPANIES.filter(c => c.stage === s.id).length;
    assert.ok(n >= 3, `${s.label} has only ${n} companies`);
  }
});

test('every link quotes a primary document', () => {
  for (const l of CHAIN_LINKS) {
    const src = SOURCE_BY_ID[l.sourceId];
    assert.ok(src, `${l.id} cites nothing`);
    assert.ok(src.isPrimary, `${l.id} rests on a secondary source`);
    assert.ok(l.excerpt && l.excerpt.length > 15, `${l.id} quotes nothing`);
  }
});

test('the chain runs unbroken from a chipmaker to an end product', () => {
  // TSMC -> NVIDIA -> CoreWeave -> Meta -> Meta AI, each hop a disclosed link.
  const hop = (a, b) => CHAIN_LINKS.some(l => l.from === a && l.to === b);
  for (const [a, b] of [['tsmc', 'nvidia'], ['nvidia', 'coreweave'], ['coreweave', 'meta'], ['meta', 'app-meta-ai']]) {
    assert.ok(hop(a, b), `no disclosed link ${a} -> ${b}`);
  }
});

test('no product is ever linked to a site or an operator', () => {
  // What a buyer builds is never attributed to whose halls it runs in.
  for (const l of CHAIN_LINKS) {
    const to = CHAIN_COMPANY_BY_ID[l.to];
    if (to.stage !== 'applications') continue;
    assert.equal(CHAIN_COMPANY_BY_ID[l.from].stage, 'buyers', `${l.id} ties a product to a non-buyer`);
  }
});

/* ---- homepage ---- */

test('the homepage is the supply chain, with every company as a button', () => {
  const html = read('index.html');
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
  assert.equal(h1s.length, 1);
  assert.match(h1s[0][1], /Follow AI from the ground to the app/);
  // Nine visual columns over ten stages: power and cooling share one.
  const cols = [...html.matchAll(/class="cxcol cn-node"/g)].length;
  assert.equal(cols, 9, 'a stage column is missing');
  assert.ok((html.match(/class="cn-art cxart"/g) || []).length === 9, 'a column lost its hexagon art');
  for (const c of CHAIN_COMPANIES) {
    assert.ok(html.includes(`data-co="${c.id}"`), `${c.name} has no button`);
  }
  assert.ok(html.includes('src="/chainx.js"'), 'the explorer script is not loaded');
  assert.ok(html.includes('id="cxDrawer"'), 'the details drawer is missing');
});

test('the explorer ships its data and every cited document', () => {
  const html = read('index.html');
  const m = html.match(/Object\.assign\(window, (\{[\s\S]*?\})\);<\/script>/);
  assert.ok(m, 'no inline data');
  const data = JSON.parse(m[1]).T2C_CHAIN;
  assert.equal(data.companies.length, CHAIN_COMPANIES.length);
  assert.equal(data.links.length, CHAIN_LINKS.length);
  for (const l of data.links) assert.ok(data.sources[l.src], `${l.from}>${l.to} ships without its source`);
});

test('the header carries five destinations and no mode switch or game', () => {
  const html = read('index.html');
  const labels = [...html.matchAll(/class="navlink[^"]*"[^>]*>([^<]+)</g)].map(m => m[1]);
  assert.deepEqual(labels, ['Chain', 'News', 'Models', 'Catalysts', 'Companies']);
  assert.ok(!html.includes('/time-machine/'), 'the retired game is still linked');
  assert.ok(!html.includes('class="modetoggle"'), 'the Standard/Focus switch is back in the header');
});

/* ---- sites ---- */

test('every site resolves to one of the four plain statuses, or says it is unreported', () => {
  for (const s of allSites()) {
    assert.ok(['planned', 'building', 'live', 'billing', 'unreported'].includes(siteStatus(s).id), s.slug);
  }
});

test('a site is Billing only on its own billing disclosure, never on acceptance', () => {
  const h1 = allSites().find(s => s.slug === 'iren-horizon-1');
  assert.equal(siteStatus(h1).id, 'live', 'Horizon 1 is accepted, not disclosed as billing');
});

test('a site page shows its status, its news and what comes next, without the old trackers', () => {
  const html = read('sites/iren-horizons-2-4/index.html');
  assert.ok(/class="hmstatus hmstatus-building"/.test(html), 'no status label');
  assert.ok(html.includes('id="siteNews"'), 'no site news list');
  assert.ok(html.includes('src="/site-news.js"'), 'the site news script is not loaded');
  assert.match(html, /Q4 2026/, 'the guided delivery window is not shown');
  for (const gone of ['ed-railstep', 'class="gates"', 'replaytrack']) {
    assert.ok(!html.includes(gone), `the site page still renders ${gone}`);
  }
});

test('site news matches on the site name, not on its state or customer', () => {
  const by = slug => siteAliases(allSites().find(s => s.slug === slug));
  assert.ok(!by('wulf-muskie').includes('Kentucky'));
  assert.ok(!by('wulf-justified').includes('Anthropic'));
  assert.ok(!by('iren-horizon-1').includes('Horizon'), 'a bare "Horizon" would match any story');
  assert.ok(by('apld-polaris-1').includes('Polaris Forge'));
});

/* ---- retired routes ---- */

test('retired tools redirect instead of 404ing', () => {
  const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  for (const src of ['/lab/', '/compare/']) {
    assert.ok((v.redirects || []).some(r => r.source === src && r.destination === '/companies/'),
      `${src} does not redirect`);
  }
  assert.ok((v.redirects || []).some(r => r.source === '/time-machine/' && r.destination === '/'),
    '/time-machine/ does not redirect');
});

/* ---- catalysts: earnings lead ---- */

test('the catalysts page leads with the earnings calendar', () => {
  const html = read('catalysts/index.html');
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
  assert.equal(h1.length, 1);
  assert.match(h1[0][1], /Earnings calendar/);
  assert.ok(html.indexOf('id="ecNext"') < html.indexOf('an-head'), 'earnings do not come first');
  assert.ok(html.includes('src="/earnings.js"'), 'the earnings script is not loaded');
  const data = JSON.parse(html.match(/Object\.assign\(window, (\{[\s\S]*?\})\);<\/script>/)[1]).T2C_EARNINGS;
  for (const t of ['IREN', 'CRWV', 'NBIS', 'WULF', 'APLD', 'KEEL', 'CIFR', 'NVDA', 'TSM']) {
    assert.ok(data.some(r => r.t === t), `${t} is not in the earnings calendar`);
  }
  const nvda = data.find(r => r.t === 'NVDA');
  assert.ok(nvda.ops.some(o => o.name === 'CoreWeave'), 'an NVIDIA report does not reach the neoclouds');
});

test('the sites page has no animated map', () => {
  const html = read('sites/index.html');
  assert.ok(!/id="infrastructure"/.test(html), 'the infrastructure map is back');
  assert.ok(!/class="vehicle/.test(html), 'the moving vehicle is back');
});
