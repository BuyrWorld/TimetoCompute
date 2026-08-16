/**
 * Shares outstanding, for the revenue calculator's per-share output.
 *
 * T2C's data files deliberately carry no balance-sheet figures — inventing one
 * would put a fabricated number at the centre of a per-share valuation. A
 * provider-supplied count is a different thing from an invented one: it is
 * attributed, dated and overridable, and the calculator says where it came from.
 *
 * If the plan does not cover the company-profile endpoint, this returns
 * `available: false` with a reason and the interface asks the reader for the
 * number instead. It never guesses.
 *
 * Call: /api/shares?symbols=IREN,WULF
 */
import { finnhub, cached, json, TRADING_TICKERS } from './_provider.js';

const TTL = 24 * 60 * 60 * 1000;   // share counts move on corporate actions, not intraday

export default async function handler(req, res) {
  const symbols = String(req.query.symbols || TRADING_TICKERS.join(','))
    .toUpperCase().split(',').map(s => s.trim())
    .filter(s => /^[A-Z.\-]{1,8}$/.test(s)).slice(0, 12);

  const out = {};
  let available = false;
  let reason = null;

  await Promise.all(symbols.map(async sym => {
    const r = await cached(`shares:${sym}`, TTL, async () => {
      const c = await finnhub('/stock/profile2', { symbol: sym });
      return { ok: c.ok, data: c.ok ? c.data : null, reason: c.reason || null };
    });

    if (!r.ok || !r.data) { reason = reason || r.reason || 'no-data'; return; }

    // Finnhub reports shareOutstanding in millions.
    const m = Number(r.data.shareOutstanding);
    if (!Number.isFinite(m) || m <= 0) { reason = reason || 'no-share-count'; return; }

    available = true;
    out[sym] = {
      sharesOutstandingM: m,
      currency: r.data.currency || null,
      name: r.data.name || null,
      exchange: r.data.exchange || null,
      source: 'finnhub:stock/profile2'
    };
  }));

  return json(res, 200, {
    provider: 'finnhub',
    asOf: new Date().toISOString(),
    shares: out,
    available,
    reason: available ? null : (reason || 'no-data'),
    note:
      'Share counts are supplied by the market data provider, not compiled by T2C from filings. ' +
      'They exclude the effect of any issuance announced since the provider last refreshed, and are ' +
      'an input the reader can override.'
  }, 6 * 3600);
}
