/**
 * Analyst data.
 *
 * The current plan grants recommendation trends (a rating distribution) but NOT
 * price targets, per-firm rating actions or target history. This route returns
 * whatever is genuinely available plus an explicit `unavailable` block naming the
 * missing fields, so the UI can say what is missing instead of showing a blank
 * chart or, worse, a fabricated consensus.
 *
 * Call: /api/analysts?symbols=IREN,CRWV
 */
import { finnhub, cached, json, TRADING_TICKERS } from './_provider.js';

const TTL = 6 * 60 * 60 * 1000; // research changes slowly; 6h is polite and sufficient

export default async function handler(req, res) {
  const symbols = String(req.query.symbols || TRADING_TICKERS.join(','))
    .toUpperCase().split(',').map(s => s.trim())
    .filter(s => /^[A-Z.\-]{1,8}$/.test(s)).slice(0, 12);

  const out = {};
  let targetsAvailable = false;
  let actionsAvailable = false;

  await Promise.all(symbols.map(async sym => {
    const entry = { ticker: sym, ratingDistribution: null, targets: [], actions: [] };

    // Rating distribution — available on this plan.
    const trend = await cached(`rec:${sym}`, TTL, async () => {
      const r = await finnhub('/stock/recommendation', { symbol: sym });
      return { ok: r.ok, rows: r.ok && Array.isArray(r.data) ? r.data : [], reason: r.reason || null };
    });
    if (trend.ok && trend.rows.length) {
      entry.ratingDistribution = trend.rows.slice(0, 6);
      entry.ratingDistributionCache = trend.cache;
    } else {
      entry.ratingDistributionReason = trend.reason || 'no-data';
    }

    // Price targets — plan-restricted at time of writing. Probed, never faked.
    const pt = await cached(`pt:${sym}`, TTL, async () => {
      const r = await finnhub('/stock/price-target', { symbol: sym });
      return { ok: r.ok, data: r.ok ? r.data : null, reason: r.reason || null };
    });
    if (pt.ok && pt.data && (pt.data.targetMedian || pt.data.targetMean)) {
      targetsAvailable = true;
      // Consensus aggregate only — this endpoint carries no per-firm attribution,
      // so it is surfaced as a provider consensus and never as an analyst record.
      entry.consensusAggregate = {
        median: pt.data.targetMedian ?? null,
        mean: pt.data.targetMean ?? null,
        high: pt.data.targetHigh ?? null,
        low: pt.data.targetLow ?? null,
        analystCount: pt.data.numberOfAnalysts ?? null,
        lastUpdated: pt.data.lastUpdated ?? null,
        attribution: 'Finnhub aggregated sell-side consensus'
      };
    } else {
      entry.targetsReason = pt.reason || 'no-data';
    }

    // Per-firm rating actions — plan-restricted at time of writing.
    const ud = await cached(`ud:${sym}`, TTL, async () => {
      const r = await finnhub('/stock/upgrade-downgrade', { symbol: sym });
      return { ok: r.ok, rows: r.ok && Array.isArray(r.data) ? r.data : [], reason: r.reason || null };
    });
    if (ud.ok && ud.rows.length) {
      actionsAvailable = true;
      entry.actions = ud.rows.slice(0, 25).map(a => ({
        firmName: a.company || null,
        analystName: null,            // this endpoint carries no individual analyst name
        rating: a.toGrade || null,
        previousRating: a.fromGrade || null,
        publishedAt: a.gradeTime ? new Date(a.gradeTime * 1000).toISOString().slice(0, 10) : null,
        action: a.action || null,
        targetPrice: null,            // not supplied by this endpoint
        previousTargetPrice: null,
        targetDate: null,
        horizonLabel: null
      }));
    } else {
      entry.actionsReason = ud.reason || 'no-data';
    }

    out[sym] = entry;
  }));

  return json(res, 200, {
    provider: 'finnhub',
    asOf: new Date().toISOString(),
    symbols: out,
    /**
     * Named explicitly so the interface can state what it cannot show rather than
     * rendering an empty component.
     */
    availability: {
      ratingDistribution: true,
      priceTargets: targetsAvailable,
      perFirmActions: actionsAvailable,
      targetHistory: false,
      analystNames: false,
      targetHorizons: false
    },
    unavailableFields: [
      ...(targetsAvailable ? [] : ['targetPrice', 'previousTargetPrice', 'consensus median/mean/high/low']),
      ...(actionsAvailable ? [] : ['firm-level rating actions', 'upgrades and downgrades']),
      'analystName', 'targetDate', 'horizonLabel', 'target revision history'
    ],
    limitation:
      'The connected plan does not grant price-target, upgrade/downgrade or historical-candle ' +
      'endpoints. Analyst price targets, per-firm attribution and target horizons are therefore not ' +
      'displayed. T2C does not publish an unattributed target.'
  }, 3600);
}
