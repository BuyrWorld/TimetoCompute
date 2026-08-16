/**
 * Revenue calculator tests.
 *
 * The calculator multiplies four numbers together, one of which is an opinion.
 * These tests are mostly about it never pretending otherwise, and never
 * producing a per-share figure out of inputs it does not have.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_EV_REVENUE_MULTIPLE, INPUT_BASIS, revenueModel, multipleSensitivity
} from '../src/lib/revenue.js';

const base = () => revenueModel({
  billingMw: 102, perMwYearM: 2.37, evRevenue: 6,
  sharesOutstandingM: 383, currentPrice: 12.4
});

test('the chain multiplies through correctly', () => {
  const r = base();
  assert.ok(r.available);
  assert.equal(r.runRateRevenueM, 241.7);          // 102 x 2.37
  assert.equal(r.enterpriseValueM, 1450);          // x 6
  assert.equal(r.perShare, 3.79);                  // / 383
});

test('upside is measured against the live price at full precision', () => {
  // Computed from the exact per-share, not the 2dp display value, matching the
  // house rule in data/economics.js: rounding belongs in the display layer only.
  const r = base();
  const exact = ((102 * 2.37 * 6) / 383 / 12.4) - 1;
  assert.ok(Math.abs(r.upside - exact) < 1e-4, `${r.upside} vs ${exact}`);
  // It still agrees with the displayed figure to within the rounding.
  assert.ok(Math.abs(r.upside - ((r.perShare / 12.4) - 1)) < 0.01);
});

test('no billing capacity means no model, not a zero', () => {
  const r = revenueModel({ billingMw: null, perMwYearM: 2.37 });
  assert.equal(r.available, false);
  assert.equal(r.runRateRevenueM, null);
  assert.ok(r.missing.includes('billing capacity'));
  assert.ok(r.reason.length > 10);
});

test('no revenue rate means no model', () => {
  // CoreWeave and Nebius disclose no contract with value, MW and term together.
  const r = revenueModel({ billingMw: 1500, perMwYearM: null });
  assert.equal(r.available, false);
  assert.ok(r.missing.includes('revenue per MW per year'));
});

test('zero and negative inputs are refused rather than modelled', () => {
  assert.equal(revenueModel({ billingMw: 0, perMwYearM: 5 }).available, false);
  assert.equal(revenueModel({ billingMw: 100, perMwYearM: -1 }).available, false);
});

test('a missing share count still gives revenue, just no per-share figure', () => {
  const r = revenueModel({ billingMw: 102, perMwYearM: 2.37, sharesOutstandingM: null });
  assert.ok(r.available);
  assert.equal(r.runRateRevenueM, 241.7);
  assert.equal(r.perShare, null);
  assert.equal(r.perShareAvailable, false);
  assert.deepEqual(r.perShareMissing, ['a share count']);
});

test('a missing price gives a per-share figure but no upside', () => {
  const r = revenueModel({ billingMw: 102, perMwYearM: 2.37, sharesOutstandingM: 383, currentPrice: null });
  assert.ok(r.perShare > 0);
  assert.equal(r.upside, null);
});

test('a nonsensical price is ignored rather than producing infinite upside', () => {
  const r = revenueModel({ billingMw: 102, perMwYearM: 2.37, sharesOutstandingM: 383, currentPrice: 0 });
  assert.equal(r.currentPrice, null);
  assert.equal(r.upside, null);
});

test('the model always declares that enterprise value is not equity value', () => {
  const r = base();
  assert.match(r.equityCaveat, /not subtract net debt/i);
  assert.match(r.modelCaveat, /opinion/i);
});

test('every input declares what it rests on', () => {
  for (const [field, options] of Object.entries(INPUT_BASIS)) {
    assert.ok(Object.keys(options).length > 0, `${field} declares no basis`);
    for (const text of Object.values(options)) {
      assert.ok(text.length > 8, `${field} has an empty basis label`);
    }
  }
  // The multiple must be described as an opinion wherever it appears.
  assert.match(INPUT_BASIS.evRevenue.model, /opinion/i);
});

test('sensitivity spans the multiple and marks the base case', () => {
  const rows = multipleSensitivity(base());
  assert.ok(rows.length >= 4);
  assert.equal(rows.filter(r => r.isBase).length, 1);
  // Monotonic in the multiple — a higher multiple cannot be worth less.
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].perShare > rows[i - 1].perShare, 'sensitivity is not monotonic');
  }
});

test('sensitivity without a share count still shows enterprise value', () => {
  const rows = multipleSensitivity(revenueModel({ billingMw: 102, perMwYearM: 2.37 }));
  assert.ok(rows.length > 0);
  for (const r of rows) {
    assert.ok(r.enterpriseValueBn > 0);
    assert.equal(r.perShare, null);
  }
});

test('sensitivity of an unavailable model is empty, not zeroes', () => {
  assert.deepEqual(multipleSensitivity(revenueModel({})), []);
});

test('the default multiple is declared rather than hidden in the maths', () => {
  assert.ok(DEFAULT_EV_REVENUE_MULTIPLE > 0);
  const r = revenueModel({ billingMw: 10, perMwYearM: 1 });
  assert.equal(r.evRevenue, DEFAULT_EV_REVENUE_MULTIPLE);
});
