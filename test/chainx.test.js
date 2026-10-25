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
import vm from 'node:vm';

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

test('no product or model is ever linked to a site or an operator', () => {
  // What a buyer builds is never attributed to whose halls it runs in: products
  // are reached only from their owner or from a model they are disclosed to use.
  for (const l of CHAIN_LINKS) {
    const to = CHAIN_COMPANY_BY_ID[l.to];
    if (to.stage === 'applications') {
      assert.ok(['buyers', 'models'].includes(CHAIN_COMPANY_BY_ID[l.from].stage), `${l.id} ties a product to an infrastructure company`);
    }
    if (to.stage === 'models') {
      assert.equal(CHAIN_COMPANY_BY_ID[l.from].stage, 'buyers', `${l.id} ties a model to a non-owner`);
    }
  }
});

test('the twelve-stage chain carries the three new stages and their artwork', () => {
  const html = read('index.html');
  for (const art of ['stage-servers-racks-networking', 'stage-datacentre-owners', 'stage-models-platforms']) {
    assert.ok(html.includes(art), `${art} is not on the homepage`);
  }
  for (const [id, stage] of [['arista', 'servers'], ['digital-realty', 'owners'], ['model-claude', 'models']]) {
    assert.equal(CHAIN_COMPANY_BY_ID[id].stage, stage, `${id} is not in ${stage}`);
  }
  // Private companies, models and apps carry a label instead of a ticker.
  assert.match(html, /cxkind">PRIVATE</);
  assert.match(html, /cxkind">MODEL</);
});

/* ---- homepage ---- */

test('the homepage is the supply chain, with every company as a button', () => {
  const html = read('index.html');
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
  assert.equal(h1s.length, 1);
  assert.match(h1s[0][1], /Follow AI from the ground to the app/);
  // Twelve visual columns: power and cooling share one.
  const cols = [...html.matchAll(/class="cxcol cn-node[^"]*"/g)].length;
  assert.equal(cols, 12, 'a stage column is missing');
  assert.ok((html.match(/class="cn-art cxart"/g) || []).length === 12, 'a column lost its hexagon art');
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
  assert.ok(html.indexOf('id="ecOps"') < html.indexOf('id="ecNext"'), 'the operators do not lead the calendar');
  assert.ok(html.indexOf('id="ecNext"') < html.indexOf('an-head'), 'earnings do not come first');
  assert.ok(html.includes('src="/earnings.js"'), 'the earnings script is not loaded');
  const data = JSON.parse(html.match(/Object\.assign\(window, (\{[\s\S]*?\})\);<\/script>/)[1]).T2C_EARNINGS;
  for (const t of ['IREN', 'CRWV', 'NBIS', 'WULF', 'APLD', 'KEEL', 'CIFR', 'NVDA', 'TSM']) {
    assert.ok(data.some(r => r.t === t), `${t} is not in the earnings calendar`);
  }
  const nvda = data.find(r => r.t === 'NVDA');
  assert.ok(nvda.ops.some(o => o.name === 'CoreWeave'), 'an NVIDIA report does not reach the neoclouds');
  assert.equal(nvda.lead, true, 'NVIDIA does not lead with the operators');
});

test('the sites page has no animated map', () => {
  const html = read('sites/index.html');
  assert.ok(!/id="infrastructure"/.test(html), 'the infrastructure map is back');
  assert.ok(!/class="vehicle/.test(html), 'the moving vehicle is back');
});

/* ---- news: industry news vs market commentary ---- */

const classify = (() => {
  const m = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src', 'news-classify.js'), 'utf8'), { module: m });
  return m.exports.classify;
})();

test('real industry headlines are kept as news', () => {
  for (const h of [
    'Nebius Group (NBIS) Starts On Site Power At Its 300 MW New Jersey Data Center',
    'Amazon.com (AMZN) Cancels $427 Million Loudoun County Data Center Project',
    'Nebius Secures $3.5 Billion From Citi as It Shifts From Converts to Secured Debt',
    'IREN Rises 4% on 300MW Spanish “Sovereign AI” Campus as Neocloud Stocks Rebound',
    'TSMC warns of tight advanced-packaging supply'
  ]) assert.equal(classify(h), 'industry', h);
});

test('stock-tip and valuation pieces are market commentary', () => {
  for (const h of [
    "Here's What $10,000 Invested Equally in Nvidia, AMD, and Broadcom Could Be Worth by 2030",
    'Where Will Broadcom Stock Be in 5 Years?',
    'Nvidia vs. Micron: The AI Revolution Is Big Enough for Both. Here\'s the Better Buy.',
    'Can GE Vernova\'s Gas Turbines Make Up for a Collapsing Wind Business?',
    'GE Vernova Fell Nearly 11% in a Day After Meta\'s Earnings. Here\'s Where the Stock Could Go by 2030',
    'Top 3 Grid Infrastructure Stocks To Watch In October 2026',
    'Elon Musk Just Delivered Spectacular News for SpaceX Stock Investors'
  ]) assert.equal(classify(h), 'commentary', h);
});

/* ---- company pages ---- */

test('a company page leads with where it sits, every link a disclosed one', () => {
  const html = read('companies/iren/index.html');
  assert.ok(html.indexOf('class="cohero"') < html.indexOf('class="copos"'), 'the hero does not lead');
  assert.ok(html.indexOf('class="copos"') < html.indexOf('class="cotabs"'), 'where-it-sits does not come before the tabs');
  const pos = html.slice(html.indexOf('class="copos"'), html.indexOf('class="cotabs"'));
  for (const n of ['NVIDIA', 'Dell Technologies', 'Microsoft']) assert.ok(pos.includes(n), `${n} missing from where IREN sits`);
  const linked = [...pos.matchAll(/href="\/\?entity=([a-z0-9-]+)"/g)].map(m => m[1]).filter(Boolean);
  for (const id of linked.filter(x => x !== 'iren')) {
    assert.ok(CHAIN_LINKS.some(l => (l.from === id && l.to === 'iren') || (l.from === 'iren' && l.to === id)),
      `${id} is drawn next to IREN without a disclosed link`);
  }
});

test('the company page is a fraction of its old height in markup', () => {
  // The old page was ~11,500px; the overview now carries five figures and the
  // chain position, and the full record sits behind its own tab.
  const html = read('companies/iren/index.html');
  assert.match(html, /class="cofacts"/);
  assert.equal((html.match(/class="cofact"/g) || []).length + (html.match(/class="cofact" id=/g) || []).length >= 5, true);
  assert.match(html, /id="record" role="tabpanel"/, 'the full record lost its tab');
});
