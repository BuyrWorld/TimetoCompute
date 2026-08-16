/**
 * Today / Mission Control tests.
 *
 * The homepage headline is the single easiest number on the site to get
 * dishonestly wrong, so most of these assert what it refuses to do.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { METRICS } from '../data/schema.js';
import { COMPANIES } from '../data/companies.js';
import { todaySet, signals } from '../src/lib/signals.js';
import {
  todaySignal, largestMovement, setConfidence, signalIndex, sinceCategories, watchCandidates
} from '../src/lib/today.js';

test('the headline never sums across metrics', () => {
  // secured gross power and accepted critical IT are different quantities.
  const rows = [
    { category: 'advanced', metric: 'securedPowerMw', unit: 'MW', previousValue: 0, newValue: 1000, ticker: 'A', companyId: 'a' },
    { category: 'advanced', metric: 'customerAcceptedMw', unit: 'MW', previousValue: 0, newValue: 50, ticker: 'B', companyId: 'b' }
  ];
  const m = largestMovement(rows);
  assert.equal(m.metric, 'securedPowerMw');
  assert.equal(m.totalMw, 1000, 'the two metrics were added together');
});

test('a movement sums only within one metric', () => {
  const rows = [
    { category: 'advanced', metric: 'customerAcceptedMw', unit: 'MW', previousValue: null, newValue: 50, ticker: 'A', companyId: 'a' },
    { category: 'advanced', metric: 'customerAcceptedMw', unit: 'MW', previousValue: 100, newValue: 175, ticker: 'B', companyId: 'b' }
  ];
  assert.equal(largestMovement(rows).totalMw, 125);
});

test('a movement counts the increase, not the new total', () => {
  const rows = [{ category: 'advanced', metric: 'securedPowerMw', unit: 'MW', previousValue: 3700, newValue: 4200, ticker: 'A', companyId: 'a' }];
  assert.equal(largestMovement(rows).totalMw, 500);
});

test('a reduction never becomes a headline movement', () => {
  const rows = [{ category: 'reduced', metric: 'securedPowerMw', unit: 'MW', previousValue: 4200, newValue: 3700, ticker: 'A', companyId: 'a' }];
  assert.equal(largestMovement(rows), null);
});

test('a non-megawatt figure is never treated as capacity', () => {
  // Revenue backlog is $bn. It must not become a megawatt headline.
  const rows = [{ category: 'advanced', metric: null, unit: '$bn', previousValue: null, newValue: 104.2, ticker: 'A', companyId: 'a' }];
  assert.equal(largestMovement(rows), null);
});

test('an empty set produces no movement rather than zero', () => {
  assert.equal(largestMovement([]), null);
});

test('the headline names the metric it measured', () => {
  const t = todaySignal();
  assert.ok(t.available, 'the ledger reports nothing at all');
  if (t.movement) {
    assert.ok(METRICS[t.movement.metric], 'the headline cites an unknown metric');
    assert.ok(t.sentence.includes(METRICS[t.movement.metric].label.toLowerCase()),
      `the sentence does not say what moved: "${t.sentence}"`);
  }
});

test('the headline is derived from the finite daily set, not the whole ledger', () => {
  const t = todaySignal();
  const set = todaySet();
  assert.equal(t.signals.length, set.signals.length);
  assert.ok(t.signals.length < signals({}).length, 'the headline used the entire ledger');
  assert.equal(t.at, set.at);
});

test('a set with no capacity movement still says something true', () => {
  const t = todaySignal();
  assert.ok(t.headline, 'no headline was produced');
  assert.ok(t.headline.value && t.headline.rest, 'the headline is incomplete');
  assert.ok(t.sentence.length > 10);
  // Never a bare zero.
  assert.notEqual(t.headline.value, '0');
  assert.notEqual(t.headline.value, '0 MW');
});

test('sentences are plural-safe', () => {
  const t = todaySignal();
  assert.ok(!/\b1 (sites|companies|changes)\b/.test(t.sentence), `bad plural: "${t.sentence}"`);
  assert.ok(!/\b\d\d+ (site|company|change)\b/.test(t.sentence), `bad plural: "${t.sentence}"`);
});

test('confidence reports its own sample and is withheld when empty', () => {
  assert.equal(setConfidence([]), null);
  const c = setConfidence([{ confidence: 'confirmed' }, { confidence: 'reported' }]);
  assert.equal(c.total, 2);
  assert.equal(c.confirmed, 1);
  assert.equal(c.share, 0.5);
  assert.equal(c.level, 'medium');
});

test('confidence levels are labelled, never colour alone', () => {
  for (const rows of [[{ confidence: 'confirmed' }], [{ confidence: 'reported' }]]) {
    const c = setConfidence(rows);
    assert.ok(['High', 'Medium', 'Low'].includes(c.label));
  }
});

test('the signal index ships every signal with a date and a category', () => {
  const idx = signalIndex();
  assert.equal(idx.length, signals({}).length);
  for (const row of idx) {
    assert.ok(row.id && row.c, 'an index row is missing its id or category');
    assert.match(row.at, /^\d{4}-\d{2}-\d{2}$/, `bad date in the index: ${row.at}`);
  }
});

test('the index carries no counts — the browser owns the comparison', () => {
  // Shipping a build-time "new since your last visit" would show every reader
  // the same number, which cannot be true for more than one of them.
  const idx = signalIndex();
  for (const row of idx) {
    assert.deepEqual(Object.keys(row).sort(), ['at', 'c', 'id']);
  }
});

test('every index category is one the UI can label', () => {
  const known = new Set(sinceCategories().map(c => c.id));
  for (const row of signalIndex()) {
    assert.ok(known.has(row.c), `index uses category ${row.c}, which has no label`);
  }
});

test('watch candidates cover every tracked company and link somewhere real', () => {
  const rows = watchCandidates();
  assert.equal(rows.length, COMPANIES.length);
  for (const r of rows) {
    assert.ok(r.ticker && r.name && r.slug, `incomplete watch row: ${JSON.stringify(r)}`);
  }
});
