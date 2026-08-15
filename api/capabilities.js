/**
 * Reports which provider capabilities this deployment's plan actually grants.
 *
 * The UI uses this to decide between showing analyst data and showing an honest
 * unavailable state. It deliberately reveals nothing about the key itself — only
 * whether an endpoint answers, and with how many records.
 */
import { finnhub, json, marketSession } from './_provider.js';

const PROBES = [
  { id: 'quote', path: '/quote', params: { symbol: 'NVDA' }, need: 'prices' },
  { id: 'priceTarget', path: '/stock/price-target', params: { symbol: 'NVDA' }, need: 'analyst consensus targets' },
  { id: 'recommendation', path: '/stock/recommendation', params: { symbol: 'NVDA' }, need: 'rating distribution' },
  { id: 'upgradeDowngrade', path: '/stock/upgrade-downgrade', params: { symbol: 'NVDA' }, need: 'per-firm rating actions' },
  { id: 'earningsCalendar', path: '/calendar/earnings', params: { from: '2026-08-01', to: '2026-12-31', symbol: 'NVDA' }, need: 'earnings catalyst dates' },
  { id: 'candles', path: '/stock/candle', params: { symbol: 'NVDA', resolution: 'D', from: '1781000000', to: '1786800000' }, need: 'historical event studies' }
];

function describe(id, r) {
  if (!r.ok) return { available: false, reason: r.reason, status: r.status, records: 0 };
  const d = r.data;
  let records = 0;
  if (Array.isArray(d)) records = d.length;
  else if (d && typeof d === 'object') {
    if (Array.isArray(d.earningsCalendar)) records = d.earningsCalendar.length;
    else if (d.s === 'no_data') records = 0;
    else if (Array.isArray(d.c)) records = d.c.length;
    else records = Object.keys(d).length ? 1 : 0;
  }
  // Finnhub answers 200 with an empty body when a plan lacks the endpoint.
  const empty = records === 0 || (d && d.s === 'no_data');
  return {
    available: !empty,
    reason: empty ? 'no-data-on-plan' : null,
    status: r.status,
    records,
    sampleKeys: d && !Array.isArray(d) ? Object.keys(d).slice(0, 12)
      : Array.isArray(d) && d[0] ? Object.keys(d[0]).slice(0, 12) : []
  };
}

export default async function handler(req, res) {
  const out = {};
  for (const p of PROBES) {
    const r = await finnhub(p.path, p.params);
    out[p.id] = { need: p.need, ...describe(p.id, r) };
  }
  return json(res, 200, {
    provider: 'finnhub',
    checkedAt: new Date().toISOString(),
    session: marketSession(),
    capabilities: out
  }, 300);
}
