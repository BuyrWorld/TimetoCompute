/**
 * Scheduled catalysts from the provider's earnings calendar.
 *
 * These are independently scheduled events, not company guidance, and are labelled
 * as such. T2C's own curated catalysts (delivery windows, permitting) live in
 * data/catalysts.js and are merged client-side; nothing here is invented.
 *
 * Call: /api/catalysts?symbols=IREN,CRWV&days=180
 */
import { finnhub, cached, json, TRADING_TICKERS } from './_provider.js';

const TTL = 6 * 60 * 60 * 1000;

export default async function handler(req, res) {
  const symbols = String(req.query.symbols || TRADING_TICKERS.join(','))
    .toUpperCase().split(',').map(s => s.trim())
    // The earnings calendar asks for every listed company on the supply-chain map.
    .filter(s => /^[A-Z.\-]{1,8}$/.test(s)).slice(0, 45);

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 180, 7), 365);
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

  const events = [];
  let available = false;
  let reason = null;
  let failed = 0;

  /* A failed lookup (rate limit, outage) is never cached: it used to be kept
     for the full six hours, so one burst could drop a company off the
     calendar for the day. Throwing skips the cache write, and `cached`
     serves any older good copy instead. */
  const lookup = (key, params) => cached(key, TTL, async () => {
    const c = await finnhub('/calendar/earnings', params);
    if (!c.ok) throw Object.assign(new Error(c.reason || 'provider-error'), { reason: c.reason });
    return { ok: true, rows: c.data?.earningsCalendar || [], reason: null };
  }).catch(err => ({ ok: false, rows: [], reason: err.reason || err.message || 'provider-error' }));

  /* ONE CALL PER MONTH, NOT PER COMPANY. The per-symbol fan-out made 35+
     provider calls per refresh and ran into the free plan's rate limit. The
     calendar without a symbol returns every company reporting in the range,
     so the window is fetched month by month and filtered to the tickers
     asked for. */
  const wanted = new Set(symbols);
  const bySym = new Map(symbols.map(s => [s, []]));
  const chunks = [];
  for (let t = Date.parse(from); t < Date.parse(to); t += 30 * 86400000) {
    const a = new Date(t).toISOString().slice(0, 10);
    const b = new Date(Math.min(t + 29 * 86400000, Date.parse(to))).toISOString().slice(0, 10);
    chunks.push([a, b]);
  }
  const results = await Promise.all(chunks.map(([a, b]) => lookup(`earn:all:${a}:${b}`, { from: a, to: b })));
  const chunkFailed = results.some(r => !r.ok);
  for (const r of results) {
    for (const e of r.rows) if (wanted.has(String(e.symbol).toUpperCase())) bySym.get(String(e.symbol).toUpperCase()).push(e);
  }
  /* A failed month is NOT retried company by company: if it failed because of
     the rate limit, 35 more calls would only deepen it. The answer is marked
     partial (short edge cache, so it is retried in minutes), and `cached`
     already served the last good copy of that month where one exists. */
  if (chunkFailed) {
    failed = results.filter(r => !r.ok).length;
    reason = results.find(r => !r.ok).reason;
  }

  for (const sym of symbols) {
    const r = { ok: true, rows: bySym.get(sym) || [] };
    if (!r.rows.length) { reason = reason || 'no-data'; continue; }
    available = true;
    for (const e of r.rows) {
      if (!e.date) continue;
      events.push({
        id: `earn-${sym}-${e.date}`,
        ticker: sym,
        title: `${sym} quarterly results`,
        category: 'earnings',
        // An exchange-scheduled date the company has confirmed, hence confirmed-date.
        status: 'confirmed-date',
        expectedAt: e.date,
        expectedWindowStart: null,
        expectedWindowEnd: null,
        // Finnhub reports bmo / amc / dmh where known.
        session: e.hour || null,
        // Fiscal period being reported, where the provider gives it.
        quarter: e.quarter || null,
        year: e.year || null,
        timezone: 'America/New_York',
        confidence: 'confirmed',
        isCompanyGuidance: false,
        provider: 'finnhub',
        affectsMetric: null,
        description:
          'Scheduled quarterly results. Capacity, contracted power and delivery disclosures are ' +
          'typically updated at this event.'
      });
    }
  }

  events.sort((a, b) => String(a.expectedAt).localeCompare(String(b.expectedAt)));

  return json(res, 200, {
    provider: 'finnhub',
    asOf: new Date().toISOString(),
    window: { from, to },
    events,
    available,
    reason: available ? null : (reason || 'no-data'),
    failed,
    note:
      'Earnings dates are independently scheduled events, not company guidance about delivery. ' +
      'Delivery windows guided by management are held separately in T2C\'s own catalyst records.'
  }, failed ? 120 : 3600);   // a partial answer is retried in minutes, not held for an hour
}
