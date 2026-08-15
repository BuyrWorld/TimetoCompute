// api/quote.js — live prices for the watchlist
// Env var: FINNHUB_KEY   (free tier at finnhub.io/register)
// Call: /api/quote?symbols=IREN,CRWV,NBIS

export default async function handler(req, res) {
  const key = process.env.FINNHUB_KEY;
  if (!key) return res.status(500).json({ error: 'FINNHUB_KEY not set' });

  const symbols = String(req.query.symbols || 'IREN')
    .toUpperCase()
    .split(',')
    .map(s => s.trim())
    .filter(s => /^[A-Z.\-]{1,8}$/.test(s))
    .slice(0, 20);

  const quotes = {};

  // Finnhub free tier is 60 calls/min — fetch in parallel, it's well within budget.
  await Promise.all(symbols.map(async sym => {
    try {
      const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`);
      if (!r.ok) return;
      const j = await r.json();
      // Finnhub returns c=current, d=change, dp=change %, h=high, l=low, pc=prev close
      if (j && typeof j.c === 'number' && j.c > 0) {
        quotes[sym] = {
          price: j.c,
          change: j.d,
          changePct: j.dp,
          high: j.h,
          low: j.l,
          prevClose: j.pc
        };
      }
    } catch (_) { /* leave symbol out rather than returning a fake price */ }
  }));

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
  return res.status(200).json({ quotes, asOf: new Date().toISOString() });
}
