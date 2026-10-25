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

  await Promise.all(symbols.map(async sym => {
    /* A failed lookup (rate limit, outage) must not be cached: it used to be
       kept for the full six hours, so one burst of traffic could drop a
       company off the calendar for the rest of the day. Throwing skips the
       cache write, and `cached` serves any older good copy instead. */
    const r = await cached(`earn:${sym}:${from}`, TTL, async () => {
      const c = await finnhub('/calendar/earnings', { from, to, symbol: sym });
      if (!c.ok) throw Object.assign(new Error(c.reason || 'provider-error'), { reason: c.reason });
      return { ok: true, rows: c.data?.earningsCalendar || [], reason: null };
    }).catch(err => ({ ok: false, rows: [], reason: err.reason || err.message || 'provider-error' }));
    if (!r.ok) failed += 1;
    if (!r.ok || !r.rows.length) { reason = reason || r.reason || 'no-data'; return; }
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
  }));

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
