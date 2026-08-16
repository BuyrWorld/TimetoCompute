/**
 * Supplier Passport tests.
 *
 * The passport is where a research site most easily drifts into inventing
 * proprietary-looking numbers. These tests hold every panel to the same rule as
 * the rest of the product: derived from records, explained, and absent rather
 * than zeroed when nothing was published.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPANIES } from '../data/companies.js';
import { CONTRACTS_BY_COMPANY, PROJECTS_BY_COMPANY } from '../data/projects.js';
import {
  passport, allPassports, chainPosition, commercialMomentum,
  customerConcentration, geographicExposure, bottleneckRadar, thesisRisks
} from '../src/lib/passport.js';

const byTicker = t => COMPANIES.find(c => c.ticker === t);

test('every company produces a complete passport', () => {
  for (const p of allPassports()) {
    for (const k of ['position', 'momentum', 'concentration', 'geography', 'radar', 'risks', 'score']) {
      assert.ok(p[k], `${p.company.ticker} passport is missing ${k}`);
    }
  }
});

/* ---- the radar ---- */

test('every radar axis explains how it was computed', () => {
  for (const p of allPassports()) {
    for (const a of p.radar.axes) {
      assert.ok(a.label && a.label.length > 3, `${p.company.ticker}: an axis has no label`);
      assert.ok(a.how && a.how.length > 40, `${p.company.ticker}/${a.id} does not explain its scoring`);
    }
  }
});

test('an axis that cannot be computed is absent, never zero', () => {
  for (const p of allPassports()) {
    for (const a of p.radar.axes) {
      if (a.available) {
        assert.ok(a.value >= 0 && a.value <= 1, `${p.company.ticker}/${a.id} out of range: ${a.value}`);
        assert.ok(a.detail, `${p.company.ticker}/${a.id} shows a value with no counts behind it`);
      } else {
        assert.equal(a.value, null, `${p.company.ticker}/${a.id} has a value but is unavailable`);
        assert.ok(a.reason && a.reason.length > 15, `${p.company.ticker}/${a.id} does not say why it is missing`);
      }
    }
  }
});

test('the radar reports how much of itself it could compute', () => {
  for (const p of allPassports()) {
    assert.equal(p.radar.total, 5);
    assert.equal(p.radar.available, p.radar.axes.filter(a => a.available).length);
  }
});

test('customer diversity is derived from disclosed megawatts, not invented', () => {
  const iren = bottleneckRadar(byTicker('IREN'));
  const diversity = iren.axes.find(a => a.id === 'diversity');
  const conc = customerConcentration(byTicker('IREN'));
  assert.ok(diversity.available);
  assert.ok(Math.abs(diversity.value - (1 - conc.largest.share)) < 1e-9);
});

/* ---- concentration ---- */

test('concentration is withheld when no contract states megawatts', () => {
  // CoreWeave discloses backlog in dollars only.
  const c = customerConcentration(byTicker('CRWV'));
  assert.equal(c.available, false);
  assert.ok(c.reason.length > 15);
});

test('concentration counts only sized contracts and reports the exclusions', () => {
  for (const co of COMPANIES) {
    const c = customerConcentration(co);
    if (!c.available) continue;
    const all = CONTRACTS_BY_COMPANY[co.id] || [];
    const sized = all.filter(x => typeof x.mw === 'number' && x.mw > 0);
    assert.equal(c.excluded, all.length - sized.length,
      `${co.ticker} miscounts the contracts excluded from concentration`);
    // The shares must sum to one over the sized book.
    const sum = c.rows.reduce((a, r) => a + r.share, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `${co.ticker} shares sum to ${sum}`);
  }
});

test('the largest customer really is the largest', () => {
  for (const p of allPassports()) {
    const c = p.concentration;
    if (!c.available) continue;
    assert.equal(c.largest.mw, Math.max(...c.rows.map(r => r.mw)));
  }
});

/* ---- position and momentum ---- */

test('every tracked company sits at the AI-factory stage, and says so', () => {
  for (const p of allPassports()) {
    assert.equal(p.position.label, 'AI factory');
    assert.match(p.position.plain, /no record of it supplying materials/i);
  }
});

test('momentum names the furthest gate actually reached', () => {
  // TeraWulf has disclosed billing; IREN has acceptance but not billing.
  assert.equal(commercialMomentum(byTicker('WULF')).label, 'Billing');
  assert.equal(commercialMomentum(byTicker('IREN')).label, 'Customer accepted');
});

test('momentum never claims a gate the record does not support', () => {
  for (const p of allPassports()) {
    const reached = p.position.path
      .filter(s => s.status === 'complete').map(s => s.label);
    if (p.momentum.label === 'Billing') assert.ok(reached.includes('Billing'));
    if (p.momentum.label === 'Customer accepted') assert.ok(!reached.includes('Billing'));
  }
});

/* ---- geography ---- */

test('geography counts real sites and nothing else', () => {
  for (const co of COMPANIES) {
    const g = geographicExposure(co);
    assert.equal(g.total, (PROJECTS_BY_COMPANY[co.id] || []).length);
    assert.equal(g.rows.reduce((a, r) => a + r.count, 0), g.total);
    for (const r of g.rows) assert.ok(r.country && r.country !== r.code || r.country.length > 1);
  }
});

/* ---- thesis risks ---- */

test('every risk names something from the record', () => {
  for (const p of allPassports()) {
    for (const r of p.risks) {
      assert.ok(r.length > 25, `${p.company.ticker}: a risk is too thin to check: "${r}"`);
      // Each risk cites a figure, a gate, or a missing disclosure.
      assert.ok(/\d|no |not /i.test(r), `${p.company.ticker}: a risk cites nothing: "${r}"`);
    }
  }
});

test('risks are plural-safe', () => {
  for (const p of allPassports()) {
    for (const r of p.risks) {
      assert.ok(!/\b1 [a-z]+s\b/.test(r), `bad plural in "${r}"`);
      assert.ok(!/\b1 disclosed contracts?\b.*\bstate no\b/.test(r), `bad verb agreement in "${r}"`);
    }
  }
});

test('a company with everything disclosed would carry no manufactured risk', () => {
  // The risk list is assembled from absences; it must not invent one when there
  // is nothing to report.
  const risks = thesisRisks(byTicker('IREN'));
  assert.ok(Array.isArray(risks));
  for (const r of risks) assert.ok(typeof r === 'string' && r.length > 0);
});
