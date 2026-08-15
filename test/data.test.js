import test from 'node:test';
import assert from 'node:assert/strict';

import { runChecks } from '../src/lib/validate.js';
import { COMPANIES } from '../data/companies.js';
import { PROJECTS } from '../data/projects.js';
import { EVENTS } from '../data/events.js';
import { CONFIDENCE } from '../data/schema.js';
import {
  getMeasure, isKnown, totalFor, headlineKpis, deliveryConversion, byCountry, currentStage
} from '../src/lib/compute.js';

test('all data integrity rules pass', () => {
  const { errors, ok } = runChecks();
  assert.deepEqual(errors, [], `validation errors:\n${errors.join('\n')}`);
  assert.ok(ok);
});

test('homepage KPIs reconcile to company records', () => {
  for (const kpi of headlineKpis()) {
    const fromRecords = COMPANIES.reduce((sum, c) => {
      const m = getMeasure(c, kpi.metric);
      return isKnown(m) ? sum + m.value : sum;
    }, 0);
    assert.equal(kpi.total, fromRecords, `${kpi.metric} must equal the sum of its records`);
  }
});

test('unknown values are never treated as zero', () => {
  const t = totalFor('customerAcceptedMw');
  // IREN is the only company disclosing an accepted figure; the rest are unknown
  // and must be reported as missing rather than folded in as zeros.
  assert.ok(t.missing.length > 0, 'expected undisclosed companies to be listed as missing');
  assert.equal(t.disclosedCount + t.missing.length, t.companyCount);
  assert.equal(t.total, 50);

  // A null measure must never become a number anywhere.
  for (const c of COMPANIES) {
    for (const m of c.measures) {
      if (m.value === null) assert.equal(m.confidence, 'unknown');
    }
  }
});

test('a genuine zero is distinguishable from not disclosed', () => {
  const keel = COMPANIES.find(c => c.id === 'keel');
  const contracted = getMeasure(keel, 'customerContractedMw');
  assert.equal(contracted.value, 0);
  assert.ok(isKnown(contracted), 'a real zero must count as known');

  const accepted = getMeasure(keel, 'customerAcceptedMw');
  assert.equal(accepted.value, null);
  assert.equal(isKnown(accepted), false);
});

test('CoreWeave matches the Q2 2026 disclosure', () => {
  const cw = COMPANIES.find(c => c.id === 'coreweave');
  const secured = getMeasure(cw, 'securedPowerMw');
  const active = getMeasure(cw, 'energisedCriticalItMw');

  assert.equal(secured.value, 3700);
  assert.equal(active.value, 1500);
  assert.equal(secured.confidence, 'confirmed');
  assert.equal(active.confidence, 'confirmed');
  assert.match(secured.source.url, /coreweave/i);
  assert.equal(secured.source.publishedDate, '2026-08-11');
  assert.equal(secured.effectiveDate, '2026-06-30');

  // The old record showed 3.5GW with active blank; both halves are now present.
  assert.notEqual(secured.value, 3500);
  assert.ok(isKnown(active), 'active capacity must no longer be blank');

  // Conversion must come out of the same records.
  const conv = deliveryConversion(cw);
  assert.ok(Math.abs(conv - 1500 / 3700) < 1e-12);
});

test('every confirmed figure can show a source', () => {
  for (const c of COMPANIES) {
    for (const m of c.measures) {
      if (m.confidence === 'confirmed') {
        assert.ok(m.source?.url, `${c.id}/${m.metric} confirmed without a source URL`);
        assert.ok(m.verifiedAt, `${c.id}/${m.metric} confirmed without verifiedAt`);
      }
    }
  }
});

test('verifiedAt is never auto-set to the current date', () => {
  const today = new Date().toISOString().slice(0, 10);
  const verified = COMPANIES.flatMap(c => c.measures).filter(m => m.verifiedAt);
  // Something verified today is legal, but only if it also has a source that was read.
  for (const m of verified) {
    if (m.verifiedAt === today) assert.ok(m.source?.url, 'verified today requires a linked source');
  }
  // Values with no source must have no verification date at all.
  for (const m of COMPANIES.flatMap(c => c.measures)) {
    if (!m.source) assert.equal(m.verifiedAt, null);
  }
});

test('power and customer measures are never summed together', () => {
  const secured = totalFor('securedPowerMw');
  const contracted = totalFor('customerContractedMw');
  assert.equal(secured.family, 'power');
  assert.equal(contracted.family, 'customer');
  assert.notEqual(secured.family, contracted.family);
});

test('country rollup excludes undisclosed sites from the total', () => {
  const { rows, disclosedTotal, undisclosedCount } = byCountry();
  const summed = rows.reduce((a, r) => a + r.mw, 0);
  assert.equal(summed, disclosedTotal);
  assert.ok(undisclosedCount > 0);

  const disclosedFromProjects = PROJECTS
    .filter(p => p.capacityMw !== null)
    .reduce((a, p) => a + p.capacityMw, 0);
  assert.equal(disclosedTotal, disclosedFromProjects);
});

test('ledger contains no unsourced confirmed events', () => {
  for (const e of EVENTS) {
    if (e.confidence === 'confirmed') assert.ok(e.sourceUrl, `${e.eventId} lacks a source`);
    assert.ok(CONFIDENCE[e.confidence], `${e.eventId} has an unknown confidence`);
  }
});

test('current stage is derived, not stored', () => {
  const cw = COMPANIES.find(c => c.id === 'coreweave');
  assert.equal(currentStage(cw).id, 'energised');
  const keel = COMPANIES.find(c => c.id === 'keel');
  // Keel has construction but no energised capacity.
  assert.equal(currentStage(keel).id, 'construction');
});
