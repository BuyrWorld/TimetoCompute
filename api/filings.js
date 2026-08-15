// api/filings.js — live SEC filings feed. No API key needed.
//
// SEC requires a User-Agent header identifying you. Set this env var:
//   SEC_UA = "T2C josh@yourdomain.com"
// Requests without it get blocked. This is their stated access policy, not optional.
//
// Call: /api/filings?symbols=IREN,CRWV,NBIS

const FORMS = ['8-K', '10-Q', '10-K', 'S-1', '424B5', 'SC 13D', 'SC 13G'];
let tickerMapCache = null;
let tickerMapAt = 0;

async function getCikMap(ua) {
  // Cached in the function instance for an hour — the file changes rarely.
  if (tickerMapCache && Date.now() - tickerMapAt < 3600000) return tickerMapCache;
  const r = await fetch('https://www.sec.gov/files/company_tickers.json', {
    headers: { 'User-Agent': ua, 'Accept-Encoding': 'gzip, deflate' }
  });
  if (!r.ok) throw new Error('CIK map fetch failed: ' + r.status);
  const j = await r.json();
  const map = {};
  for (const k of Object.keys(j)) {
    const row = j[k];
    map[String(row.ticker).toUpperCase()] = {
      cik: String(row.cik_str).padStart(10, '0'),
      name: row.title
    };
  }
  tickerMapCache = map;
  tickerMapAt = Date.now();
  return map;
}

export default async function handler(req, res) {
  const ua = process.env.SEC_UA;
  if (!ua) return res.status(500).json({ error: 'SEC_UA not set. Use "T2C your@email.com".' });

  const symbols = String(req.query.symbols || 'IREN')
    .toUpperCase()
    .split(',')
    .map(s => s.trim())
    .filter(s => /^[A-Z.\-]{1,8}$/.test(s))
    .slice(0, 15);

  try {
    const map = await getCikMap(ua);
    const items = [];

    await Promise.all(symbols.map(async sym => {
      const entry = map[sym];
      if (!entry) return; // Not US-listed, or ticker not in SEC's map
      try {
        const r = await fetch(
          `https://data.sec.gov/submissions/CIK${entry.cik}.json`,
          { headers: { 'User-Agent': ua, 'Accept-Encoding': 'gzip, deflate' } }
        );
        if (!r.ok) return;
        const j = await r.json();
        const rec = j.filings?.recent;
        if (!rec) return;

        const n = Math.min(rec.form.length, 40);
        for (let i = 0; i < n; i++) {
          if (!FORMS.includes(rec.form[i])) continue;
          const acc = rec.accessionNumber[i].replace(/-/g, '');
          items.push({
            symbol: sym,
            company: entry.name,
            form: rec.form[i],
            filed: rec.filingDate[i],
            description: rec.primaryDocDescription[i] || rec.items?.[i] || '',
            url: `https://www.sec.gov/Archives/edgar/data/${Number(entry.cik)}/${acc}/${rec.primaryDocument[i]}`
          });
        }
      } catch (_) { /* skip this company */ }
    }));

    items.sort((a, b) => (a.filed < b.filed ? 1 : -1));

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    return res.status(200).json({ items: items.slice(0, 80), asOf: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ error: 'EDGAR fetch failed', detail: String(e.message) });
  }
}

/* ------------------------------------------------------------------
   Worth adding next: SEC full-text search, which lets you watch for the
   words that actually matter rather than every filing.

     https://efts.sec.gov/LATEST/search-index?q=%22accepted%22&forms=8-K

   Pair that with a Vercel Cron entry in vercel.json to poll every 10
   minutes during US market hours, and you get alerted to an acceptance
   milestone before it reaches the news:

     { "crons": [{ "path": "/api/filings", "schedule": "*!/10 13-21 * * 1-5" }] }

   (remove the ! from the schedule — it's escaped here to avoid closing
   this comment block early)
   ------------------------------------------------------------------ */
