/**
 * Multi-ticker comparison. Hard limit of three, enforced here rather than in the UI
 * so the rule cannot be bypassed by a component that forgets it.
 */
import { COMPANY_BY_TICKER, WATCH_TICKERS, TICKER_NAMES } from '../../data/companies.js';
import { getMeasure, isKnown, companyView } from './compute.js';

export const MAX_TICKERS = 3;

/** Colours are assigned per ticker and stay stable across every view. */
export const SERIES_COLOURS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];

export const PERIODS = [
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 91 },
  { id: '6M', label: '6M', days: 182 },
  { id: 'YTD', label: 'YTD', days: null },
  { id: '1Y', label: '1Y', days: 365 },
  { id: '3Y', label: '3Y', days: 1095 },
  { id: 'custom', label: 'Custom', days: null }
];

export const DISPLAY_MODES = [
  { id: 'normalised', label: 'Normalised', hint: 'Indexed to 100 at the start of the period so shares with different prices compare fairly.' },
  { id: 'price', label: 'Share price', hint: 'Actual quoted price. Not comparable across shares with different nominal prices.' },
  { id: 'drawdown', label: 'Drawdown', hint: 'Percentage below the running peak within the period.' },
  { id: 'upside', label: 'Analyst implied upside', hint: 'Distance from current price to the consensus median target.' },
  { id: 'capacity', label: 'Delivered capacity', hint: 'Energised critical IT, where companies disclose it on a comparable basis.' }
];

/** Enforce the ceiling and drop unknown or duplicate tickers. */
export function normaliseSelection(tickers) {
  const seen = new Set();
  const out = [];
  for (const t of tickers || []) {
    const up = String(t).toUpperCase();
    if (!WATCH_TICKERS.includes(up) || seen.has(up)) continue;
    seen.add(up);
    out.push(up);
    if (out.length === MAX_TICKERS) break;
  }
  return out;
}

export const canAdd = tickers => normaliseSelection(tickers).length < MAX_TICKERS;

/** Index a close series to 100 at its first point. */
export function normaliseSeries(closes) {
  const first = (closes || []).find(c => c > 0);
  if (!first) return [];
  return closes.map(c => (c > 0 ? (c / first) * 100 : null));
}

export function maxDrawdownPct(closes) {
  let peak = -Infinity, worst = 0;
  for (const c of closes || []) {
    if (!(c > 0)) continue;
    if (c > peak) peak = c;
    const dd = ((c - peak) / peak) * 100;
    if (dd < worst) worst = dd;
  }
  return closes && closes.length ? worst : null;
}

export function periodReturnPct(closes) {
  const valid = (closes || []).filter(c => c > 0);
  if (valid.length < 2) return null;
  return ((valid[valid.length - 1] - valid[0]) / valid[0]) * 100;
}

export function bestWorstDay(closes) {
  const rets = [];
  for (let i = 1; i < (closes || []).length; i++) {
    if (closes[i] > 0 && closes[i - 1] > 0) rets.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
  }
  if (!rets.length) return { best: null, worst: null };
  return { best: Math.max(...rets), worst: Math.min(...rets) };
}

/**
 * Operational side of the comparison row. Only figures on a matching basis are
 * returned, so the table cannot rank companies on incompatible definitions.
 */
export function operationalRow(ticker) {
  const company = COMPANY_BY_TICKER[ticker];
  if (!company) {
    return { ticker, name: TICKER_NAMES[ticker] || ticker, tracked: false };
  }
  const v = companyView(company);
  const pick = name => {
    const m = getMeasure(company, name);
    return isKnown(m)
      ? { value: m.valueMw, basis: m.powerBasis, status: m.valueStatus, confidence: m.confidence, asOf: m.asOf, sourceIds: m.sourceIds }
      : { value: null, note: m.notes || null };
  };
  return {
    ticker, name: company.name, slug: company.slug, tracked: true,
    model: company.model,
    securedPower: pick('securedPowerMw'),
    customerContracted: pick('customerContractedMw'),
    energisedCriticalIt: pick('energisedCriticalItMw'),
    customerAccepted: pick('customerAcceptedMw'),
    revenueLive: pick('revenueLiveMw'),
    sourceCount: v.sourceIds.length,
    lastVerifiedAt: v.lastVerifiedAt,
    nextCatalyst: v.catalysts.find(c => c.status !== 'completed') || null
  };
}

/** Ticker options carrying the full company name, never a truncated label. */
export function tickerOptions() {
  return WATCH_TICKERS.map(t => ({
    ticker: t,
    name: TICKER_NAMES[t] || t,
    tracked: !!COMPANY_BY_TICKER[t],
    slug: COMPANY_BY_TICKER[t]?.slug || null
  }));
}
