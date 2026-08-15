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
    .filter(s => /^[A-Z.\-]{1,8}$/.test(s)).slice(0, 12);

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 180, 7), 365);
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

  const events = [];
  let available = false;
  let reason = null;

  await Promise.all(symbols.map(async sym => {
    const r = await cached(`earn:${sym}:${from}`, TTL, async () => {
      const c = await finnhub('/calendar/earnings', { from, to, symbol: sym });
      return { ok: c.ok, rows: c.ok && c.data?.earningsCalendar ? c.data.earningsCalendar : [], reason: c.reason || null };
    });
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
    note:
      'Earnings dates are independently scheduled events, not company guidance about delivery. ' +
      'Delivery windows guided by management are held separately in T2C\'s own catalyst records.'
  }, 3600);
}
