/**
 * Historical event-reaction engine.
 *
 * Measures how a share traded around a past announcement. It measures association,
 * never causation — the wording helpers below exist so no caller can accidentally
 * write "the announcement caused a 14% rise".
 *
 * NOTE: the current provider plan does not grant daily candles, so no live study
 * can run today (see api/capabilities.js). The engine is implemented and tested
 * against fixtures so it produces correct numbers the moment a price source is
 * connected, and the UI shows an honest unavailable state until then.
 */

export const DEFAULT_BENCHMARK = 'QQQ';

export const METHODOLOGY = {
  benchmark: DEFAULT_BENCHMARK,
  priceBasis: 'Adjusted daily closes',
  sessionAlignment:
    'Announcements are mapped to the next trading session when they land before the open, the same ' +
    'session when they land during market hours, and the next session when they land after the close ' +
    'or on a non-trading day. Weekends and market holidays are skipped using the trading calendar ' +
    'implied by the price series itself, so a Saturday announcement is never measured against a ' +
    'session that did not trade.',
  abnormalReturn:
    'Benchmark-adjusted return is the simple difference between the share return and the benchmark ' +
    'return over the same sessions. It is not a beta-adjusted or risk-model alpha.',
  minimumSample: 3,
  caution:
    'Historical event reactions are observations of what happened. They do not establish that an ' +
    'event caused a move, and they are not predictions of how the share will react in future.'
};

/**
 * Index of the session an announcement should be measured from.
 *
 * `sessions` is an ascending array of YYYY-MM-DD trading dates — genuine sessions
 * only, so holidays are handled by absence rather than by a hard-coded calendar.
 */
export function alignToSession(sessions, announcedAt, timing = 'after-close') {
  if (!Array.isArray(sessions) || !sessions.length) return -1;
  const day = String(announcedAt).slice(0, 10);
  const exact = sessions.indexOf(day);

  if (timing === 'before-open') {
    // Trades in that day's session if it traded, else the next one.
    return exact >= 0 ? exact : nextSessionIndex(sessions, day);
  }
  if (timing === 'during-market') {
    return exact >= 0 ? exact : nextSessionIndex(sessions, day);
  }
  // after-close or a non-trading day: the first session that can react is the next one.
  return exact >= 0 ? exact + 1 : nextSessionIndex(sessions, day);
}

function nextSessionIndex(sessions, day) {
  for (let i = 0; i < sessions.length; i++) if (sessions[i] > day) return i;
  return -1;
}

const pct = (a, b) => (b > 0 && Number.isFinite(a) && Number.isFinite(b) ? ((a - b) / b) * 100 : null);

/**
 * Study one event.
 *
 * `series` and `benchmark` are { dates: string[], closes: number[], volumes?: number[] }
 * with matching ascending dates.
 */
export function studyEvent({ series, benchmark = null, announcedAt, timing = 'after-close' }) {
  if (!series?.dates?.length || !series?.closes?.length) {
    return { available: false, reason: 'no-price-data' };
  }
  const idx = alignToSession(series.dates, announcedAt, timing);
  if (idx < 1 || idx >= series.dates.length) {
    return { available: false, reason: 'event-outside-price-window' };
  }

  const prevClose = series.closes[idx - 1];
  const at = n => (idx + n < series.closes.length ? series.closes[idx + n] : null);

  const window = n => {
    const slice = series.closes.slice(idx, Math.min(idx + n + 1, series.closes.length));
    if (!slice.length) return { max: null, min: null };
    return { max: Math.max(...slice), min: Math.min(...slice) };
  };
  const w5 = window(5), w20 = window(20);

  // Benchmark over the same sessions, matched by date so a mismatched calendar
  // cannot silently offset the comparison.
  let benchReturn1 = null, benchReturn5 = null, benchReturn20 = null;
  if (benchmark?.dates?.length) {
    const bIdx = benchmark.dates.indexOf(series.dates[idx]);
    if (bIdx >= 1) {
      const bPrev = benchmark.closes[bIdx - 1];
      const bAt = n => (bIdx + n < benchmark.closes.length ? benchmark.closes[bIdx + n] : null);
      benchReturn1 = pct(bAt(0), bPrev);
      benchReturn5 = pct(bAt(5), bPrev);
      benchReturn20 = pct(bAt(20), bPrev);
    }
  }

  let volumeRatio = null;
  if (Array.isArray(series.volumes) && idx >= 20) {
    const trailing = series.volumes.slice(idx - 20, idx).filter(v => v > 0);
    const avg = trailing.length ? trailing.reduce((a, v) => a + v, 0) / trailing.length : null;
    if (avg && series.volumes[idx] > 0) volumeRatio = series.volumes[idx] / avg;
  }

  const r1 = pct(at(0), prevClose);
  const r5 = pct(at(5), prevClose);
  const r20 = pct(at(20), prevClose);

  return {
    available: true,
    sessionDate: series.dates[idx],
    previousClose: prevClose,
    timing,
    returnEventSession: r1,
    returnFirstFullSession: r1,
    return1d: r1,
    return5d: r5,
    return20d: r20,
    maxGain5d: pct(w5.max, prevClose),
    maxDrawdown5d: pct(w5.min, prevClose),
    maxGain20d: pct(w20.max, prevClose),
    maxDrawdown20d: pct(w20.min, prevClose),
    volumeVs20dAverage: volumeRatio,
    benchmarkReturn1d: benchReturn1,
    benchmarkReturn5d: benchReturn5,
    benchmarkReturn20d: benchReturn20,
    abnormalReturn1d: r1 !== null && benchReturn1 !== null ? r1 - benchReturn1 : null,
    abnormalReturn5d: r5 !== null && benchReturn5 !== null ? r5 - benchReturn5 : null,
    abnormalReturn20d: r20 !== null && benchReturn20 !== null ? r20 - benchReturn20 : null
  };
}

const med = xs => {
  const v = xs.filter(x => typeof x === 'number' && Number.isFinite(x)).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const avg = xs => {
  const v = xs.filter(x => typeof x === 'number' && Number.isFinite(x));
  return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null;
};

/**
 * Statistics across comparable events. Below the minimum sample the caller gets
 * the individual studies but no summary — a "median" of two events is noise
 * dressed as a finding.
 */
export function comparableStats(studies) {
  const ok = studies.filter(s => s.available);
  const base = {
    sampleSize: ok.length,
    sufficient: ok.length >= METHODOLOGY.minimumSample,
    minimumSample: METHODOLOGY.minimumSample,
    events: ok
  };
  if (!base.sufficient) return base;

  const r1 = ok.map(s => s.return1d), r5 = ok.map(s => s.return5d);
  const dates = ok.map(s => s.sessionDate).filter(Boolean).sort();
  return {
    ...base,
    median1d: med(r1),
    mean1d: avg(r1),
    positiveFrequency: r1.filter(x => typeof x === 'number' && x > 0).length / r1.filter(x => typeof x === 'number').length,
    median5d: med(r5),
    best1d: Math.max(...r1.filter(Number.isFinite)),
    worst1d: Math.min(...r1.filter(Number.isFinite)),
    medianAbnormal1d: med(ok.map(s => s.abnormalReturn1d)),
    dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null
  };
}

/** Non-causal phrasing, so descriptions cannot drift into asserting cause. */
export function describeReaction(study, benchmarkName = DEFAULT_BENCHMARK) {
  if (!study?.available || study.return1d === null) return 'No comparable price history available.';
  const dir = study.return1d >= 0 ? 'rose' : 'fell';
  const parts = [
    `The share price ${dir} ${Math.abs(study.return1d).toFixed(1)}% over the first full trading session following the announcement.`
  ];
  if (study.benchmarkReturn1d !== null) {
    const bdir = study.benchmarkReturn1d >= 0 ? 'rose' : 'fell';
    parts.push(`${benchmarkName} ${bdir} ${Math.abs(study.benchmarkReturn1d).toFixed(1)}%, producing an observed benchmark-adjusted return of approximately ${study.abnormalReturn1d.toFixed(1)}%.`);
  }
  return parts.join(' ');
}
