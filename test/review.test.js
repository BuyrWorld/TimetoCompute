import test from 'node:test';
import assert from 'node:assert/strict';
import { sentences, extract, mwFigures, newFigures, recordSummary, weight } from '../src/lib/review.js';

// Shaped like a real results release: run-together bullets, footnotes, boilerplate.
const RELEASE = `Highlights • Signed a new multi-year AI Cloud contract with a leading frontier AI lab
o Energised 160 MW (IT) at Childress, up from 50 MW last quarter • $3.6bn GPU financing for the Microsoft contract at 6.0%
Horizon 3-4 in late-stage construction, targeting delivery in Q4 2026.
Targeting cumulative delivery of approximately 0.8GW (IT) by the end of 2027.
This press release contains forward-looking statements within the meaning of the Private Securities Litigation Reform Act.
Adjusted EBITDA is defined as net income excluding certain items and is a non-GAAP measure.
Join the webcast using the Participant Registration Link at 8:00 a.m. Eastern Time today.`;

test('run-together bullets become separate sentences', () => {
  const s = sentences(RELEASE);
  assert.ok(s.includes('Signed a new multi-year AI Cloud contract with a leading frontier AI lab'), s.join(' | '));
  assert.ok(s.some(x => x.startsWith('Energised 160 MW (IT) at Childress')));
});

test('megawatt and gigawatt figures are read as megawatts', () => {
  assert.deepEqual(mwFigures('Energised 160 MW, with 1.5 GW and 2,000 megawatts planned'), [160, 1500, 2000]);
});

test('each sentence lands in the sections it bears on, and boilerplate in none', () => {
  const x = extract(RELEASE);
  const all = Object.values(x).flat().join(' ');
  assert.ok(x.capacity.some(s => /160 MW/.test(s)));
  assert.ok(x.customers.some(s => /frontier AI lab/.test(s)));
  assert.ok(x.financing.some(s => /\$3\.6bn GPU financing/.test(s)));
  assert.ok(x.timing.some(s => /Q4 2026/.test(s)));
  assert.doesNotMatch(all, /forward-looking|is defined as|webcast/i, 'boilerplate got through');
});

test('figures with hard numbers outrank ones without', () => {
  assert.ok(weight('Energised 160 MW in Q4 2026 for $3.6bn') > weight('We continue to grow our platform'));
});

test('a figure already in the record — measure, target or site — is not flagged as new', () => {
  const company = { measures: [{ metric: 'energisedCriticalItMw', valueMw: 50, valueStatus: 'actual', asOf: '2026-08-13' }],
    targets: [{ metric: 'energisedCriticalItMw', valueMw: 800, valueStatus: 'target', asOf: '2027-12-31' }] };
  const summary = recordSummary(company, {}, [{ name: 'Childress', capacityMw: 750, valueStatus: 'actual' }]);
  assert.deepEqual(summary.map(r => r.mw), [50, 800, 750]);
  const found = { capacity: ['Energised 160 MW (IT) at Childress, up from 50 MW', 'Targeting 0.8GW by 2027', 'Childress is 750 MW'] };
  assert.deepEqual(newFigures(found, summary), [160], 'only 160 MW is new');
});
