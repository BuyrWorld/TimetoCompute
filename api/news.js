// api/news.js — live AI infrastructure news
// Env var: FINNHUB_KEY
// Call: /api/news?symbols=IREN,CRWV,NBIS

const DAYS_BACK = 5;

export default async function handler(req, res) {
  const key = process.env.FINNHUB_KEY;
  if (!key) return res.status(500).json({ error: 'FINNHUB_KEY not set' });

  const symbols = String(req.query.symbols || 'IREN')
    .toUpperCase()
    .split(',')
    .map(s => s.trim())
    .filter(s => /^[A-Z.\-]{1,8}$/.test(s))
    .slice(0, 15);

  const iso = d => d.toISOString().slice(0, 10);
  const to = new Date();
  const from = new Date(Date.now() - DAYS_BACK * 86400000);

  const byUrl = new Map();

  // 1. Per-company news
  await Promise.all(symbols.map(async sym => {
    try {
      const r = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${sym}&from=${iso(from)}&to=${iso(to)}&token=${key}`
      );
      if (!r.ok) return;
      const arr = await r.json();
      if (!Array.isArray(arr)) return;
      for (const a of arr.slice(0, 25)) {
        if (!a.url || !a.headline) continue;
        const existing = byUrl.get(a.url);
        if (existing) {
          // Same story tagged to more than one company — merge the tickers.
          if (!existing.symbols.includes(sym)) existing.symbols.push(sym);
        } else {
          byUrl.set(a.url, {
            headline: a.headline,
            url: a.url,
            source: a.source,
            datetime: a.datetime,
            symbols: [sym]
          });
        }
      }
    } catch (_) { /* skip this symbol */ }
  }));

  // 2. Sector-wide technology headlines, so the feed isn't purely ticker-bound
  try {
    const r = await fetch(`https://finnhub.io/api/v1/news?category=technology&token=${key}`);
    if (r.ok) {
      const arr = await r.json();
      if (Array.isArray(arr)) {
        const KEYWORDS = /\b(ai|data cent|datacent|gpu|nvidia|neocloud|hyperscal|megawatt|compute|inference|openai|anthropic)\b/i;
        for (const a of arr.slice(0, 60)) {
          if (!a.url || !a.headline || byUrl.has(a.url)) continue;
          if (!KEYWORDS.test(a.headline + ' ' + (a.summary || ''))) continue;
          byUrl.set(a.url, {
            headline: a.headline,
            url: a.url,
            source: a.source,
            datetime: a.datetime,
            symbols: []
          });
        }
      }
    }
  } catch (_) { /* sector feed is a bonus, not required */ }

  const items = [...byUrl.values()].sort((a, b) => (b.datetime || 0) - (a.datetime || 0));

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  return res.status(200).json({ items, count: items.length, asOf: new Date().toISOString() });
}
