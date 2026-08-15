// api/quote.js — live prices for the watchlist
// Env var: FINNHUB_KEY   (server-side only; never sent to the browser)
// Call: /api/quote?symbols=IREN,CRWV,NBIS
//
// Returns the market session alongside the prices so the interface can distinguish
// "the feed is working" from "the market is open". Claiming prices are live at
// 9pm on a Sunday is the fastest way to lose a reader's trust in every other number.
import { finnhub, cached, json, marketSession, TRADING_TICKERS } from './_provider.js';

const TTL = 45 * 1000;

export default async function handler(req, res) {
  const symbols = String(req.query.symbols || TRADING_TICKERS.join(','))
    .toUpperCase().split(',').map(s => s.trim())
    .filter(s => /^[A-Z.\-]{1,8}$/.test(s)).slice(0, 20);

  const session = marketSession();
  const quotes = {};
  let stale = false;
  let anyOk = false;

  await Promise.all(symbols.map(async sym => {
    try {
      const r = await cached(`q:${sym}`, TTL, async () => {
        const c = await finnhub('/quote', { symbol: sym });
        if (!c.ok) throw new Error(c.reason || 'upstream');
        return { data: c.data };
      });
      const j = r.data;
      if (j && typeof j.c === 'number' && j.c > 0) {
        anyOk = true;
        if (r.stale) stale = true;
        quotes[sym] = {
          price: j.c,
          change: j.d,
          changePct: j.dp,
          high: j.h,
          low: j.l,
          prevClose: j.pc,
          // Finnhub's `t` is the last-trade epoch. Surfacing it lets the UI show
          // "last trade" rather than implying continuous live pricing.
          lastTradeAt: j.t ? new Date(j.t * 1000).toISOString() : null,
          cache: r.cache
        };
      }
    } catch (_) { /* one bad symbol must not take down the rest */ }
  }));

  return json(res, 200, {
    quotes,
    asOf: new Date().toISOString(),
    session,
    feed: {
      online: anyOk,
      provider: 'Finnhub',
      attribution: 'Prices supplied by Finnhub',
      /** Free-tier US equity data is not guaranteed real-time. */
      realtime: false,
      delayNote: 'Quotes may be delayed. Not for trading use.',
      stale
    }
  }, 30);
}
