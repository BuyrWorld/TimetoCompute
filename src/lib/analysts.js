/**
 * Analyst target model and consensus maths.
 *
 * T2C holds no analyst opinions of its own. Every record here must carry a firm and
 * a source; an unattributed target is not displayable and the validator rejects it.
 *
 * IMPORTANT: the current provider plan does not grant per-firm price targets,
 * rating actions or target history (see api/capabilities.js). These functions are
 * therefore fully implemented and tested against fixtures, and the UI renders an
 * honest unavailable state until a provider that supplies them is connected. No
 * placeholder or demo targets are shipped.
 */

export const RATING_BUCKETS = {
  bullish: ['strong buy', 'buy', 'outperform', 'overweight', 'accumulate', 'add', 'positive'],
  neutral: ['hold', 'neutral', 'market perform', 'equal-weight', 'equalweight', 'sector perform', 'peer perform'],
  bearish: ['sell', 'strong sell', 'underperform', 'underweight', 'reduce', 'negative']
};

export function ratingBucket(rating) {
  if (!rating) return null;
  const r = String(rating).trim().toLowerCase();
  for (const [bucket, list] of Object.entries(RATING_BUCKETS)) if (list.includes(r)) return bucket;
  return null;
}

export const ANALYST_ACTIONS = {
  initiated: { label: 'Initiated' },
  reiterated: { label: 'Reiterated' },
  upgraded: { label: 'Upgraded', tone: 'ok' },
  downgraded: { label: 'Downgraded', tone: 'bad' },
  'target-raised': { label: 'Target raised', tone: 'ok' },
  'target-lowered': { label: 'Target lowered', tone: 'bad' },
  'rating-suspended': { label: 'Rating suspended' },
  'coverage-dropped': { label: 'Coverage dropped' }
};

/* ---------------- derived values on a single record ---------------- */

export const targetChangeAbsolute = r =>
  r.targetPrice !== null && r.previousTargetPrice !== null ? r.targetPrice - r.previousTargetPrice : null;

export const targetChangePercent = r =>
  r.targetPrice !== null && r.previousTargetPrice !== null && r.previousTargetPrice !== 0
    ? ((r.targetPrice - r.previousTargetPrice) / r.previousTargetPrice) * 100
    : null;

export const impliedUpsidePercent = (targetPrice, currentPrice) =>
  targetPrice !== null && targetPrice !== undefined && currentPrice > 0
    ? ((targetPrice - currentPrice) / currentPrice) * 100
    : null;

/** A horizon is never invented. Absent means absent. */
export const horizonLabel = r =>
  r.horizonLabel || (r.targetDate ? `To ${r.targetDate}` : 'Horizon not stated');

export function decorate(record, currentPrice) {
  return {
    ...record,
    targetChangeAbsolute: targetChangeAbsolute(record),
    targetChangePercent: targetChangePercent(record),
    impliedUpsidePercent: impliedUpsidePercent(record.targetPrice, currentPrice),
    priceUsedForUpside: currentPrice > 0 ? currentPrice : null,
    horizon: horizonLabel(record),
    direction: (() => {
      const d = targetChangeAbsolute(record);
      return d === null ? null : d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
    })()
  };
}

/* ---------------- deduplication ---------------- */

/**
 * Aggregators repeat the same research action, which would double-count a firm in
 * the consensus. Keep one record per firm — the most recent — and treat identical
 * firm+date+target triples as the same action regardless of provider record id.
 */
export function dedupe(records) {
  const seen = new Map();
  for (const r of records) {
    const actionKey = `${(r.firmName || '').toLowerCase()}|${r.publishedAt}|${r.targetPrice ?? ''}|${r.rating ?? ''}`;
    if (seen.has(actionKey)) continue;
    seen.set(actionKey, r);
  }
  return [...seen.values()];
}

/** Latest record per firm, newest first. */
export function latestPerFirm(records) {
  const byFirm = new Map();
  for (const r of dedupe(records)) {
    const key = (r.firmName || '').toLowerCase();
    const prev = byFirm.get(key);
    if (!prev || String(r.publishedAt) > String(prev.publishedAt)) byFirm.set(key, r);
  }
  return [...byFirm.values()].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
}

/* ---------------- statistics ---------------- */

export function median(values) {
  const v = values.filter(x => typeof x === 'number' && Number.isFinite(x)).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}
export function mean(values) {
  const v = values.filter(x => typeof x === 'number' && Number.isFinite(x));
  return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null;
}

const daysAgoIso = (n, now) => new Date(now.getTime() - n * 86400000).toISOString().slice(0, 10);

/**
 * Consensus for one ticker. Returns `available: false` rather than zeros when
 * there are no records, so the UI can say so instead of printing an empty chart.
 */
export function consensus(records, currentPrice, now = new Date()) {
  const latest = latestPerFirm(records || []);
  if (!latest.length) {
    return { available: false, reason: 'no-records', analystCount: 0, records: [] };
  }

  const decorated = latest.map(r => decorate(r, currentPrice));
  const targets = decorated.map(r => r.targetPrice).filter(x => typeof x === 'number');
  const med = median(targets), avg = mean(targets);

  const buckets = { bullish: 0, neutral: 0, bearish: 0, unrated: 0 };
  for (const r of decorated) {
    const b = ratingBucket(r.rating);
    if (b) buckets[b]++; else buckets.unrated++;
  }

  const all = dedupe(records);
  const windows = {};
  for (const n of [30, 90, 180]) {
    const cutoff = daysAgoIso(n, now);
    const inWindow = all.filter(r => String(r.publishedAt) >= cutoff);
    windows[n] = {
      raised: inWindow.filter(r => (targetChangeAbsolute(r) ?? 0) > 0).length,
      lowered: inWindow.filter(r => (targetChangeAbsolute(r) ?? 0) < 0).length
    };
  }

  const byDate = [...all].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  const firstWhere = fn => byDate.find(fn) || null;

  return {
    available: true,
    analystCount: latest.length,
    records: decorated,
    meanTarget: avg,
    medianTarget: med,
    lowTarget: targets.length ? Math.min(...targets) : null,
    highTarget: targets.length ? Math.max(...targets) : null,
    currentPrice: currentPrice > 0 ? currentPrice : null,
    medianImpliedUpsidePercent: impliedUpsidePercent(med, currentPrice),
    meanImpliedUpsidePercent: impliedUpsidePercent(avg, currentPrice),
    buckets,
    windows,
    latestUpgrade: firstWhere(r => r.action === 'upgraded'),
    latestDowngrade: firstWhere(r => r.action === 'downgraded'),
    latestRaise: firstWhere(r => (targetChangeAbsolute(r) ?? 0) > 0),
    latestCut: firstWhere(r => (targetChangeAbsolute(r) ?? 0) < 0),
    /** positive = more raises than cuts over 90 days */
    netRevisionTrend90: windows[90].raised - windows[90].lowered,
    asOf: byDate[0]?.publishedAt || null
  };
}

/**
 * Rating distribution from a provider that supplies counts but not targets — which
 * is exactly what the current plan grants. Attributable to the provider in
 * aggregate, so it is presented as a distribution, never as a price target.
 */
export function ratingDistribution(trendRows) {
  if (!Array.isArray(trendRows) || !trendRows.length) return { available: false };
  const rows = [...trendRows].sort((a, b) => String(b.period).localeCompare(String(a.period)));
  const latest = rows[0];
  const total = (latest.strongBuy || 0) + (latest.buy || 0) + (latest.hold || 0) + (latest.sell || 0) + (latest.strongSell || 0);
  if (!total) return { available: false };
  const prior = rows[1] || null;
  return {
    available: true,
    period: latest.period,
    total,
    bullish: (latest.strongBuy || 0) + (latest.buy || 0),
    neutral: latest.hold || 0,
    bearish: (latest.sell || 0) + (latest.strongSell || 0),
    breakdown: {
      strongBuy: latest.strongBuy || 0, buy: latest.buy || 0, hold: latest.hold || 0,
      sell: latest.sell || 0, strongSell: latest.strongSell || 0
    },
    priorPeriod: prior ? {
      period: prior.period,
      bullish: (prior.strongBuy || 0) + (prior.buy || 0),
      neutral: prior.hold || 0,
      bearish: (prior.sell || 0) + (prior.strongSell || 0)
    } : null,
    history: rows.slice(0, 6)
  };
}

/** Fields the product wants versus what a provider actually returned. */
export function fieldCoverage(records) {
  const fields = ['analystName', 'firmName', 'rating', 'previousRating', 'action', 'targetPrice', 'previousTargetPrice', 'targetDate', 'horizonLabel'];
  const out = {};
  for (const f of fields) {
    out[f] = records && records.length ? records.filter(r => r[f] !== null && r[f] !== undefined).length : 0;
  }
  return { total: records ? records.length : 0, present: out };
}
