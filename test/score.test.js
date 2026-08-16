/**
 * Reality Score tests.
 *
 * This is the only constructed number on the site, so these tests are almost
 * entirely about what it refuses to claim: no zero standing in for silence, no
 * composite built on one factor, no missing factor quietly treated as a pass.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPANIES } from '../data/companies.js';
import {
  FACTORS, FACTOR_BY_ID, MIN_WEIGHT_COVERAGE, THIN_SAMPLE, realityScore
} from '../src/lib/score.js';

const byTicker = t => COMPANIES.find(c => c.ticker === t);

test('the factor weights are declared and sum to one', () => {
  const total = FACTORS.reduce((a, f) => a + f.weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `weights sum to ${total}`);
});

test('every factor publishes a definition a reader can check', () => {
  for (const f of FACTORS) {
    assert.ok(f.definition.length > 60, `${f.id} has no usable definition`);
    assert.ok(f.label && f.weight > 0, `${f.id} is incomplete`);
  }
});

test('a factor with no sample is unavailable, never zero', () => {
  for (const c of COMPANIES) {
    for (const f of realityScore(c).factors) {
      if (f.available) continue;
      assert.equal(f.value, null, `${c.ticker}/${f.id} reports a value with no sample`);
      assert.ok(f.reason && f.reason.length > 20, `${c.ticker}/${f.id} does not say why it is missing`);
    }
  }
});

test('an available factor always reports its own sample size', () => {
  for (const c of COMPANIES) {
    for (const f of realityScore(c).factors) {
      if (!f.available) continue;
      assert.ok(f.sample > 0, `${c.ticker}/${f.id} is available with no sample`);
      assert.ok(f.detail, `${c.ticker}/${f.id} shows a bar with no counts behind it`);
      assert.ok(f.value >= 0 && f.value <= 1, `${c.ticker}/${f.id} value out of range: ${f.value}`);
    }
  }
});

test('the composite is withheld below the coverage threshold', () => {
  for (const c of COMPANIES) {
    const r = realityScore(c);
    if (r.available) {
      assert.ok(r.coverage >= MIN_WEIGHT_COVERAGE,
        `${c.ticker} scored on only ${r.coverage} coverage`);
    } else {
      assert.equal(r.score, null, `${c.ticker} is unavailable but still reports a score`);
      assert.ok(r.reason.includes('%'), `${c.ticker} does not state its coverage`);
    }
  }
});

test('a withheld score still exposes the factors that could be computed', () => {
  // "Unavailable" must not mean an empty panel — whatever is known is still shown.
  for (const c of COMPANIES) {
    const r = realityScore(c);
    if (r.available) continue;
    assert.equal(r.factors.length, FACTORS.length,
      `${c.ticker} drops factors when the composite is withheld`);
  }
});

test('IREN scores, because it is the only company with a reached milestone', () => {
  const r = realityScore(byTicker('IREN'));
  assert.ok(r.available, 'IREN no longer scores — the fixture has changed');
  assert.ok(r.score > 0 && r.score <= 100);
  assert.equal(r.factors.find(f => f.id === 'promise').available, true);
});

test('a company with no reached milestone does not score', () => {
  // Every other tracked company has guided milestones still pending. A composite
  // that ignored promise delivery would be a different metric wearing the same name.
  const r = realityScore(byTicker('CRWV'));
  assert.equal(r.available, false);
  assert.equal(r.factors.find(f => f.id === 'promise').available, false);
});

test('a missing factor is never treated as a pass', () => {
  // The composite divides by the weight actually covered, so an absent factor
  // cannot silently contribute a zero or a one.
  const r = realityScore(byTicker('IREN'));
  const got = r.factors.filter(f => f.available);
  const expected = Math.round(
    (got.reduce((a, f) => a + f.value * f.weight, 0) / r.coverage) * 100);
  assert.equal(r.score, expected);
  assert.ok(r.coverage < 1, 'IREN now has full coverage — this test needs a new subject');
});

test('a thin sample is flagged rather than hidden', () => {
  const r = realityScore(byTicker('IREN'));
  assert.ok(Array.isArray(r.thin));
  if (r.thin.length) {
    assert.ok(r.thinNote && r.thinNote.length > 30, 'thin samples are not explained');
    for (const f of r.thin) assert.ok(f.sample < THIN_SAMPLE);
  }
});

test('promise delivery counts a guided window as met, not as a miss', () => {
  // Landing inside a guided window is hitting guidance. Only missing the window
  // is a miss — the "43 days early" artefact this codebase already rejects.
  const r = realityScore(byTicker('IREN'));
  const promise = r.factors.find(f => f.id === 'promise');
  assert.ok(promise.available);
  assert.match(promise.detail, /^\d+ of \d+ met$/);
});

test('the band is labelled, never colour alone', () => {
  for (const c of COMPANIES) {
    const r = realityScore(c);
    if (!r.available) continue;
    assert.ok(r.bandLabel && r.bandLabel.length > 5, `${c.ticker} has no band label`);
    assert.ok(['strong', 'mixed', 'weak'].includes(r.band));
  }
});

test('the score is stable across calls', () => {
  for (const c of COMPANIES) {
    assert.deepEqual(realityScore(c).score, realityScore(c).score);
  }
});
