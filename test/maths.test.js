import test from 'node:test';
import assert from 'node:assert/strict';

import {
  scenario, probFinishAbove, probTouch, quantile, daysBetweenUtc, formatDateUtc,
  realisedVolPct, normCdf, inverseNorm, percentile, fanBands
} from '../src/lib/odds.js';
import {
  consensus, dedupe, latestPerFirm, median, mean, targetChangeAbsolute,
  targetChangePercent, impliedUpsidePercent, horizonLabel, ratingBucket, ratingDistribution
} from '../src/lib/analysts.js';
import {
  alignToSession, studyEvent, comparableStats, describeReaction, METHODOLOGY
} from '../src/lib/eventstudy.js';
import {
  normaliseSelection, canAdd, MAX_TICKERS, normaliseSeries, maxDrawdownPct,
  periodReturnPct, bestWorstDay, tickerOptions
} from '../src/lib/compare.js';

const near = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) <= tol, `${msg}: expected ~${b}, got ${a}`);

/* ================= Phase 8: odds reference case ================= */
// Hand-computed: S0=44.06, K=65, sigma=0.77, mu=0, T=90/365.25=0.246406
//   sigma*sqrt(T) = 0.382223 ; (mu - sigma^2/2)T = -0.073048

test('odds match the hand-computed reference case', () => {
  const s = scenario({ spot: 44.06, target: 65, days: 90, volPct: 77, driftPct: 0 });
  assert.equal(s.valid, true);

  near(s.finishAbove * 100, 11, 0.6, 'finish above');
  near(s.touch * 100, 25, 1.0, 'touch before deadline');
  near(s.median, 40.96, 0.05, 'median outcome');
  near(s.lo, 28, 0.6, 'two-thirds lower bound');
  near(s.hi, 60, 0.6, 'two-thirds upper bound');
  near(s.halve * 100, 5, 0.6, 'chance of halving');
});

test('touch probability always exceeds finish-above for an upside target', () => {
  for (const days of [30, 90, 180, 365]) {
    const s = scenario({ spot: 44.06, target: 65, days, volPct: 77 });
    assert.ok(s.touch > s.finishAbove, `touch should exceed finish-above at ${days} days`);
  }
});

test('median is the 50th percentile, not the mode or the mean', () => {
  const s = scenario({ spot: 100, target: 120, days: 365, volPct: 50 });
  near(s.median, quantile(100, 0.5, 365 / 365.25, 0, 0), 1e-9, 'median equals the z=0 quantile');
  near(probFinishAbove(100, s.median, 0.5, 365 / 365.25, 0) * 100, 50, 0.1, 'half of outcomes finish above the median');
});

test('normCdf and inverseNorm round-trip', () => {
  for (const p of [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99]) {
    near(normCdf(inverseNorm(p)), p, 1e-6, `round trip at p=${p}`);
  }
});

test('percentile bands are ordered and start at spot', () => {
  const s = scenario({ spot: 44.06, target: 65, days: 90, volPct: 77 });
  const bands = fanBands(s, 10);
  assert.equal(bands[0].values[0.5], 44.06, 'the fan starts at the current price');
  for (const b of bands.slice(1)) {
    assert.ok(b.values[0.1] < b.values[0.25], 'p10 below p25');
    assert.ok(b.values[0.25] < b.values[0.5], 'p25 below median');
    assert.ok(b.values[0.5] < b.values[0.75], 'median below p75');
    assert.ok(b.values[0.75] < b.values[0.9], 'p75 below p90');
  }
});

test('invalid inputs return a reason rather than a number', () => {
  assert.equal(scenario({ spot: 0, target: 65, days: 90, volPct: 77 }).valid, false);
  assert.equal(scenario({ spot: 44, target: 65, days: -1, volPct: 77 }).valid, false);
  assert.equal(scenario({ spot: 44, target: 65, days: 90, volPct: 0 }).valid, false);
});

/* ================= UTC date handling ================= */

test('date arithmetic is UTC-safe — the 13 Nov bug', () => {
  // The reported bug: a 13 November deadline displayed as "before 12 Nov".
  assert.equal(daysBetweenUtc('2026-08-15', '2026-11-13'), 90);
  assert.equal(formatDateUtc('2026-11-13'), '13 Nov');
  assert.equal(formatDateUtc('2026-01-01'), '1 Jan');
  // Midnight boundaries must not shift the day for users behind UTC.
  assert.equal(formatDateUtc('2026-11-13T00:00:00Z'), '13 Nov');
  assert.equal(daysBetweenUtc('2026-11-13', '2026-11-13'), 0);
  assert.equal(daysBetweenUtc('2026-12-31', '2027-01-01'), 1);
  // leap day
  assert.equal(daysBetweenUtc('2028-02-28', '2028-03-01'), 2);
});

test('realised volatility annualises with sqrt(252)', () => {
  // constant 1% daily moves alternating sign -> daily sd ~0.01
  const closes = [100];
  for (let i = 1; i <= 100; i++) closes.push(closes[i - 1] * (i % 2 ? 1.01 : 1 / 1.01));
  const vol = realisedVolPct(closes, 90);
  near(vol, 0.00995 * Math.sqrt(252) * 100, 2, 'annualised realised volatility');
  assert.equal(realisedVolPct([100], 90), null, 'too few points returns null, not zero');
});

/* ================= Phase 6: analyst maths ================= */

const rec = (o) => ({
  id: o.id, ticker: 'IREN', companyName: 'IREN Limited', analystName: o.analystName ?? null,
  firmName: o.firmName, rating: o.rating ?? null, previousRating: o.previousRating ?? null,
  action: o.action ?? 'reiterated', targetPrice: o.targetPrice ?? null,
  previousTargetPrice: o.previousTargetPrice ?? null, currency: 'USD',
  publishedAt: o.publishedAt, targetDate: o.targetDate ?? null, horizonLabel: o.horizonLabel ?? null,
  sourceId: o.sourceId ?? 'provider', verifiedAt: '2026-08-15'
});

test('target change and implied upside calculations', () => {
  const r = rec({ id: '1', firmName: 'Firm A', targetPrice: 80, previousTargetPrice: 64, publishedAt: '2026-08-01' });
  assert.equal(targetChangeAbsolute(r), 16);
  near(targetChangePercent(r), 25, 1e-9, 'target change percent');
  near(impliedUpsidePercent(80, 44.06), 81.57, 0.01, 'implied upside');
  // a missing previous target yields null, never zero
  assert.equal(targetChangeAbsolute(rec({ id: '2', firmName: 'B', targetPrice: 80, publishedAt: '2026-08-01' })), null);
  assert.equal(impliedUpsidePercent(null, 44.06), null);
  assert.equal(impliedUpsidePercent(80, 0), null);
});

test('a missing horizon is never invented', () => {
  assert.equal(horizonLabel(rec({ id: '1', firmName: 'A', publishedAt: '2026-08-01' })), 'Horizon not stated');
  assert.equal(horizonLabel(rec({ id: '2', firmName: 'A', publishedAt: '2026-08-01', horizonLabel: '12 months' })), '12 months');
  assert.equal(horizonLabel(rec({ id: '3', firmName: 'A', publishedAt: '2026-08-01', targetDate: '2027-08-01' })), 'To 2027-08-01');
});

test('duplicate research actions are not double-counted', () => {
  const dup = rec({ id: 'a', firmName: 'Firm A', targetPrice: 80, rating: 'Buy', publishedAt: '2026-08-01' });
  const same = { ...dup, id: 'b-from-another-aggregator' };
  assert.equal(dedupe([dup, same]).length, 1, 'identical firm/date/target must collapse');

  const older = rec({ id: 'c', firmName: 'Firm A', targetPrice: 70, rating: 'Buy', publishedAt: '2026-05-01' });
  assert.equal(latestPerFirm([dup, same, older]).length, 1, 'one record per firm');
  assert.equal(latestPerFirm([dup, older])[0].targetPrice, 80, 'the newest survives');
});

test('consensus statistics', () => {
  const records = [
    rec({ id: '1', firmName: 'Firm A', targetPrice: 60, rating: 'Buy', publishedAt: '2026-08-01', previousTargetPrice: 50 }),
    rec({ id: '2', firmName: 'Firm B', targetPrice: 80, rating: 'Hold', publishedAt: '2026-08-02', previousTargetPrice: 90 }),
    rec({ id: '3', firmName: 'Firm C', targetPrice: 100, rating: 'Strong Buy', publishedAt: '2026-08-03' }),
    rec({ id: '4', firmName: 'Firm D', targetPrice: 400, rating: 'Sell', publishedAt: '2026-08-04' })
  ];
  const c = consensus(records, 50, new Date('2026-08-15T00:00:00Z'));
  assert.equal(c.available, true);
  assert.equal(c.analystCount, 4);
  assert.equal(c.medianTarget, 90, 'median of 60,80,100,400');
  assert.equal(c.meanTarget, 160, 'mean is dragged by the outlier');
  assert.equal(c.lowTarget, 60);
  assert.equal(c.highTarget, 400);
  assert.deepEqual(
    { bullish: c.buckets.bullish, neutral: c.buckets.neutral, bearish: c.buckets.bearish },
    { bullish: 2, neutral: 1, bearish: 1 }
  );
  near(c.medianImpliedUpsidePercent, 80, 1e-9, 'median implied upside');
  assert.equal(c.windows[30].raised, 1);
  assert.equal(c.windows[30].lowered, 1);
  assert.equal(c.netRevisionTrend90, 0);
});

test('consensus reports unavailable rather than zeros', () => {
  const c = consensus([], 44.06);
  assert.equal(c.available, false);
  assert.equal(c.analystCount, 0);
  assert.equal(c.medianTarget, undefined, 'no fabricated zero target');
});

test('median and mean handle empty and single inputs', () => {
  assert.equal(median([]), null);
  assert.equal(mean([]), null);
  assert.equal(median([7]), 7);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test('rating buckets and provider rating distribution', () => {
  assert.equal(ratingBucket('Outperform'), 'bullish');
  assert.equal(ratingBucket('Equal-Weight'), 'neutral');
  assert.equal(ratingBucket('Underperform'), 'bearish');
  assert.equal(ratingBucket('Nonsense'), null);

  const d = ratingDistribution([
    { period: '2026-08-01', strongBuy: 5, buy: 8, hold: 3, sell: 1, strongSell: 0 },
    { period: '2026-07-01', strongBuy: 4, buy: 8, hold: 4, sell: 1, strongSell: 0 }
  ]);
  assert.equal(d.available, true);
  assert.equal(d.total, 17);
  assert.equal(d.bullish, 13);
  assert.equal(d.neutral, 3);
  assert.equal(d.bearish, 1);
  assert.equal(d.priorPeriod.bullish, 12);
  assert.equal(ratingDistribution([]).available, false);
});

/* ================= Phase 7: event studies ================= */

// Ten consecutive trading sessions with a weekend gap between index 4 and 5.
const SESSIONS = [
  '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
  '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'
];

test('session alignment skips weekends and respects announcement timing', () => {
  // Saturday announcement -> first reactive session is Monday
  assert.equal(SESSIONS[alignToSession(SESSIONS, '2026-08-08', 'after-close')], '2026-08-10');
  // after the close on a Friday -> Monday
  assert.equal(SESSIONS[alignToSession(SESSIONS, '2026-08-07', 'after-close')], '2026-08-10');
  // before the open on a trading day -> that same session
  assert.equal(SESSIONS[alignToSession(SESSIONS, '2026-08-06', 'before-open')], '2026-08-06');
  // during market hours -> that same session
  assert.equal(SESSIONS[alignToSession(SESSIONS, '2026-08-06', 'during-market')], '2026-08-06');
  // a date after the series ends has no session
  assert.equal(alignToSession(SESSIONS, '2026-09-01', 'after-close'), -1);
});

test('event study computes returns against the previous close', () => {
  const series = {
    dates: SESSIONS,
    closes: [100, 100, 100, 100, 100, 114.2, 120, 118, 130, 125],
    volumes: SESSIONS.map(() => 1000)
  };
  const benchmark = { dates: SESSIONS, closes: [50, 50, 50, 50, 50, 50.55, 51, 51, 52, 52] };

  // announced after Friday's close -> measured from Monday
  const s = studyEvent({ series, benchmark, announcedAt: '2026-08-07', timing: 'after-close' });
  assert.equal(s.available, true);
  assert.equal(s.sessionDate, '2026-08-10');
  assert.equal(s.previousClose, 100);
  near(s.return1d, 14.2, 1e-9, 'first full session return');
  near(s.benchmarkReturn1d, 1.1, 1e-9, 'benchmark return');
  near(s.abnormalReturn1d, 13.1, 1e-9, 'benchmark-adjusted return');
  near(s.maxGain5d, 30, 1e-9, 'max gain over the following five sessions');
});

test('event outside the price window reports unavailable, not zero', () => {
  const series = { dates: SESSIONS, closes: SESSIONS.map(() => 100) };
  assert.equal(studyEvent({ series, announcedAt: '2027-01-01' }).available, false);
  assert.equal(studyEvent({ series: { dates: [], closes: [] }, announcedAt: '2026-08-07' }).available, false);
});

test('comparable statistics need at least three events', () => {
  const mk = r => ({ available: true, return1d: r, return5d: r, abnormalReturn1d: r - 1, sessionDate: '2026-08-10' });
  const two = comparableStats([mk(5), mk(-3)]);
  assert.equal(two.sufficient, false);
  assert.equal(two.median1d, undefined, 'no summary statistics below the minimum sample');
  assert.equal(two.sampleSize, 2);

  const three = comparableStats([mk(5), mk(-3), mk(10)]);
  assert.equal(three.sufficient, true);
  assert.equal(three.median1d, 5);
  near(three.positiveFrequency, 2 / 3, 1e-9, 'positive reaction frequency');
  assert.equal(three.best1d, 10);
  assert.equal(three.worst1d, -3);
  assert.equal(three.minimumSample, METHODOLOGY.minimumSample);
});

test('reaction wording is observational, never causal', () => {
  const s = { available: true, return1d: 14.2, benchmarkReturn1d: 1.1, abnormalReturn1d: 13.1 };
  const text = describeReaction(s, 'QQQ');
  assert.match(text, /rose 14\.2%/);
  assert.match(text, /QQQ rose 1\.1%/);
  assert.match(text, /benchmark-adjusted return of approximately 13\.1%/);
  assert.ok(!/caused|because of|due to|will/i.test(text), 'must not assert causation or prediction');
  assert.match(METHODOLOGY.caution, /do not establish that an event caused/);
});

/* ================= Phase 9: comparison ================= */

test('comparison is capped at three tickers', () => {
  assert.equal(normaliseSelection(['IREN', 'CRWV', 'NBIS', 'WULF', 'APLD']).length, MAX_TICKERS);
  assert.deepEqual(normaliseSelection(['IREN', 'CRWV', 'NBIS', 'WULF']), ['IREN', 'CRWV', 'NBIS']);
  assert.equal(canAdd(['IREN', 'CRWV']), true);
  assert.equal(canAdd(['IREN', 'CRWV', 'NBIS']), false);
});

test('comparison rejects duplicates and unknown tickers', () => {
  assert.deepEqual(normaliseSelection(['IREN', 'IREN', 'CRWV']), ['IREN', 'CRWV']);
  assert.deepEqual(normaliseSelection(['FAKE', 'IREN']), ['IREN']);
  assert.deepEqual(normaliseSelection(['iren']), ['IREN'], 'case-insensitive');
  assert.deepEqual(normaliseSelection([]), []);
});

test('normalised performance indexes to 100', () => {
  const n = normaliseSeries([50, 55, 45, 60]);
  assert.equal(n[0], 100);
  near(n[1], 110, 1e-9, 'up 10%');
  near(n[2], 90, 1e-9, 'down 10%');
  near(n[3], 120, 1e-9, 'up 20%');
  assert.deepEqual(normaliseSeries([]), []);
});

test('drawdown, period return and best/worst day', () => {
  near(maxDrawdownPct([100, 120, 60, 90]), -50, 1e-9, 'max drawdown from the running peak');
  near(periodReturnPct([100, 120, 60, 90]), -10, 1e-9, 'period return');
  const bw = bestWorstDay([100, 110, 99]);
  near(bw.best, 10, 1e-9, 'best day');
  near(bw.worst, -10, 1e-9, 'worst day');
  assert.equal(periodReturnPct([100]), null, 'a single point has no return');
});

test('every ticker option carries a full company name', () => {
  const opts = tickerOptions();
  assert.ok(opts.length >= 8);
  for (const o of opts) {
    assert.ok(o.name && o.name.length > o.ticker.length, `${o.ticker} needs a full name`);
    assert.ok(!o.name.endsWith('…'), 'names must not be pre-truncated in the data');
  }
  assert.equal(opts.find(o => o.ticker === 'NVDA').name, 'NVIDIA');
  assert.equal(opts.find(o => o.ticker === 'KEEL').name, 'Keel Infrastructure');
});
