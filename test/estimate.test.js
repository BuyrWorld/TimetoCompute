/**
 * Estimate tests.
 *
 * An estimate is the weakest claim on this site. These tests exist to keep it
 * that way: it may never override a disclosure, never enter a confirmed total,
 * never come from a peer, and never appear without its derivation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPANIES } from '../data/companies.js';
import { PROJECTS } from '../data/projects.js';
import { CONFIDENCE } from '../data/schema.js';
import { aggregate, getMeasure, isKnown } from '../src/lib/compute.js';
import {
  GROSS_TO_CRITICAL_IT, RULES, estimateCriticalIt, estimateBilling, estimateSiteCapacity,
  estimateSiteCriticalIt, estimateRevenueRate, companyEstimates, siteEstimates, estimateCoverage
} from '../src/lib/estimate.js';

const byTicker = t => COMPANIES.find(c => c.ticker === t);
const project = id => PROJECTS.find(p => p.id === id);

const everyEstimate = function* () {
  for (const c of COMPANIES) for (const e of Object.values(companyEstimates(c))) yield e;
  for (const p of PROJECTS) for (const e of Object.values(siteEstimates(p))) yield e;
};

test('every rule states its assumption in full', () => {
  for (const r of Object.values(RULES)) {
    assert.ok(r.id && r.label, 'a rule is missing its identity');
    assert.ok(r.assumption.length > 80, `${r.id} does not explain its assumption`);
  }
});

test('every estimate is marked estimated and carries its derivation', () => {
  for (const e of everyEstimate()) {
    assert.equal(e.confidence, 'estimated', 'an estimate is not marked as one');
    assert.equal(e.isEstimate, true);
    assert.ok(e.derivation && e.derivation.length > 10, 'an estimate shows no derivation');
    assert.ok(RULES[e.rule], `an estimate cites unknown rule ${e.rule}`);
    assert.ok(Array.isArray(e.sourceIds), 'an estimate carries no source list');
  }
});

test('an estimate can never enter a confirmed total', () => {
  // The schema is what enforces this; the test is here so a future change to
  // CONFIDENCE cannot quietly promote estimates into sourced aggregates.
  assert.equal(CONFIDENCE.estimated.countsAsVerified, false);
  for (const e of everyEstimate()) {
    assert.equal(CONFIDENCE[e.confidence].countsAsVerified, false);
  }
});

test('aggregates are unchanged by the existence of estimates', () => {
  // Aggregates read the company records, which estimates never write to.
  const before = aggregate('energisedCriticalItMw', { basis: 'critical-it' });
  for (const c of COMPANIES) companyEstimates(c);
  const after = aggregate('energisedCriticalItMw', { basis: 'critical-it' });
  assert.deepEqual(before.total, after.total);
  assert.deepEqual(before.contributorCount, after.contributorCount);
});

test('an estimate never overrides a disclosure', () => {
  for (const c of COMPANIES) {
    const e = companyEstimates(c);
    for (const [metric, row] of Object.entries(e)) {
      assert.ok(!isKnown(getMeasure(c, metric)),
        `${c.ticker} has a disclosed ${metric} but an estimate was produced anyway`);
      assert.ok(row.valueMw !== null);
    }
  }
});

test('critical IT is derived from gross by the stated divisor', () => {
  const keel = byTicker('KEEL');
  const e = estimateCriticalIt(keel);
  assert.ok(e, 'KEEL no longer produces a critical IT estimate — the fixture has changed');
  const gross = getMeasure(keel, 'energisedGrossMw');
  assert.equal(e.valueMw, Math.round(gross.valueMw / GROSS_TO_CRITICAL_IT));
  assert.ok(e.derivation.includes(String(GROSS_TO_CRITICAL_IT)), 'the divisor is not shown');
});

test('billing is estimated from acceptance and says acceptance is not billing', () => {
  const iren = byTicker('IREN');
  const e = estimateBilling(iren);
  assert.ok(e);
  assert.equal(e.valueMw, getMeasure(iren, 'customerAcceptedMw').valueMw);
  assert.match(RULES[e.rule].assumption, /not separately confirmed/i);
});

test('a site target is never converted into a comparable operating figure', () => {
  // Mantsala's 310 MW is planned capacity, not energised. Dividing it would
  // dress an ambition up as a current critical IT load.
  const mantsala = project('nbis-mantsala');
  assert.equal(mantsala.valueStatus, 'target', 'fixture changed');
  assert.equal(estimateSiteCriticalIt(mantsala), null);
});

test('only gross-basis sites are converted, and only actual ones', () => {
  for (const p of PROJECTS) {
    const e = estimateSiteCriticalIt(p);
    if (!e) continue;
    assert.equal(p.powerBasis, 'gross-utility');
    assert.ok(['actual', 'minimum'].includes(p.valueStatus));
    assert.equal(e.valueMw, Math.round(p.capacityMw / GROSS_TO_CRITICAL_IT));
    assert.ok(e.valueMw < p.capacityMw, 'critical IT came out above gross');
  }
});

test('a disclosed site capacity is never replaced', () => {
  for (const p of PROJECTS) {
    if (p.capacityMw === null || p.capacityMw === undefined) continue;
    assert.equal(estimateSiteCapacity(p), null, `${p.id} capacity was overridden`);
  }
});

test('a revenue rate uses only the company own contracts', () => {
  const iren = estimateRevenueRate('iren');
  assert.ok(iren, 'IREN has disclosed contracts but no rate was derived');
  for (const c of iren.contracts) {
    assert.ok(c.id.startsWith('iren-'), `a peer contract leaked in: ${c.id}`);
  }
  // Capacity-weighted, so it sits between the individual contract rates.
  const rates = iren.contracts.map(c => c.perMwYearM);
  assert.ok(iren.perMwYearM >= Math.min(...rates) && iren.perMwYearM <= Math.max(...rates),
    'the weighted mean falls outside the contracts it is drawn from');
});

test('a company with no priced contract gets no rate rather than a peer average', () => {
  // CoreWeave discloses backlog in dollars but no contract with MW and a term.
  assert.equal(estimateRevenueRate('coreweave'), null);
  assert.equal(estimateRevenueRate('nebius'), null);
});

test('coverage reports what it actually filled', () => {
  const c = estimateCoverage();
  assert.equal(c.companies, COMPANIES.length);
  assert.equal(c.projects, PROJECTS.length);
  assert.ok(c.filled > 0, 'no estimate fires at all');
  // Counted, not guessed.
  let manual = 0;
  for (const co of COMPANIES) manual += Object.keys(companyEstimates(co)).length;
  for (const p of PROJECTS) manual += Object.keys(siteEstimates(p)).length;
  assert.equal(c.filled, manual);
});

test('estimates are stable across calls', () => {
  for (const c of COMPANIES) {
    assert.deepEqual(companyEstimates(c), companyEstimates(c));
  }
});
