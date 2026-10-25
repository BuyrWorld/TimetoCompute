import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROVIDERS } from '../data/models.js';
import { MODEL_FACTS, BUILT_WITH } from '../data/modelfacts.js';
import { PLAN_PROVIDERS, STOREFRONTS, storePrice, parsePrice } from '../data/plans.js';
import { SOURCE_BY_ID } from '../data/sources.js';
import { perUsd } from '../src/lib/fx.js';

const names = new Set(PROVIDERS.flatMap(p => p.models.map(m => m.name)));

test('every model fact belongs to a model on the page and cites a registered source', () => {
  for (const [name, f] of Object.entries(MODEL_FACTS)) {
    assert.ok(names.has(name), `${name} has facts but is not in the lineup`);
    if (f.released) {
      assert.match(f.released, /^\d{4}-\d{2}-\d{2}$/, `${name} release date`);
      assert.ok(SOURCE_BY_ID[f.src], `${name} release cites ${f.src}, which is not registered`);
      assert.ok(['provider', 'listing'].includes(f.basis), `${name} release has no basis`);
    }
    if (f.api) assert.ok(SOURCE_BY_ID[f.api.src], `${name} price cites ${f.api.src}, which is not registered`);
  }
});

test('a marketplace estimate is only ever labelled as one, and only comes from the marketplace', () => {
  for (const [name, f] of Object.entries(MODEL_FACTS)) {
    for (const [what, basis, src] of [['date', f.basis, f.src], ['price', f.api?.basis, f.api?.src]]) {
      if (!src) continue;
      const marketplace = SOURCE_BY_ID[src].sourceType === 'marketplace';
      assert.equal(basis === 'listing', marketplace, `${name} ${what}: basis ${basis} but source ${src}`);
    }
  }
  assert.equal(SOURCE_BY_ID['openrouter-models'].isPrimary, false, 'a marketplace is never a primary source');
});

test('every "built with" entry cites a source', () => {
  for (const [prov, rows] of Object.entries(BUILT_WITH)) {
    for (const r of rows) assert.ok(SOURCE_BY_ID[r.src], `${prov}: ${r.what} cites ${r.src}`);
  }
});

test('every plan matched to the App Store is found there in the US storefront', () => {
  for (const prov of PLAN_PROVIDERS) for (const pl of prov.plans) {
    if (pl.store) assert.ok(storePrice(prov.app, 'us', pl.store), `${prov.name} ${pl.name}: "${pl.store}" is not in the US App Store snapshot`);
  }
});

test('a repeated App Store item resolves to the lower, monthly price', () => {
  assert.equal(storePrice('chatgpt', 'us', 'ChatGPT Plus'), '$19.99', 'ChatGPT Plus also lists a $200 annual item');
  assert.equal(parsePrice('R$ 1.499,90'), 1499.9);
  assert.equal(parsePrice('22,00 €'), 22);
  assert.equal(parsePrice('¥3,000'), 3000);
  assert.equal(parsePrice('₹ 1,999'), 1999);
});

test('currency conversion runs through the dollar, and the euro is handled', () => {
  const fx = { perEur: { USD: 1.2, GBP: 0.84, JPY: 180 } };
  assert.equal(perUsd(fx, 'USD'), 1);
  assert.ok(Math.abs(perUsd(fx, 'GBP') - 0.7) < 1e-9);
  assert.ok(Math.abs(perUsd(fx, 'EUR') - 1 / 1.2) < 1e-9);
  assert.equal(perUsd(fx, 'JPY'), 150);
});

test('the models page is built, in the nav, and offers every storefront', () => {
  const html = fs.readFileSync('dist/models/index.html', 'utf8');
  for (const s of STOREFRONTS) assert.match(html, new RegExp(`<option value="${s.cc}"`), `${s.name} missing from the country picker`);
  assert.match(html, /href="\/models\/"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/models\/"/, 'the nav does not mark Models');
  assert.match(html, /Marketplace estimate/);
});
