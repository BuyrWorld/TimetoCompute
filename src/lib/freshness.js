/**
 * Build-time staleness check: which filings has the record not caught up with?
 *
 * Reads each tracked company's EDGAR submissions and lists every material
 * filing made after its REVIEWED_THROUGH date (data/review.js). The result is
 * shown on the site as "new filing, not yet reviewed", written to
 * /freshness.json, and read by the daily GitHub Action, which opens an issue
 * listing what needs reviewing.
 *
 * EDGAR asks for a User-Agent naming a contact (SEC_UA, already set on Vercel).
 * Without one the check is skipped and the site says nothing either way — it
 * never claims to be up to date when it could not look.
 */
import { REVIEWED_THROUGH, SEC_CIK } from '../../data/review.js';
import { COMPANIES } from '../../data/companies.js';

/** Material forms: results, current reports, annual reports, offerings. Insider and ownership forms are not. */
const FORMS = ['8-K', '8-K/A', '6-K', '10-Q', '10-K', '10-K/A', '20-F', '40-F', 'S-1', 'S-3', '424B5'];

const ITEM_MEANING = {
  '1.01': 'Material agreement', '1.02': 'Agreement terminated', '2.01': 'Acquisition or disposal completed',
  '2.02': 'Results of operations', '2.03': 'New financial obligation', '3.02': 'Unregistered share sale',
  '5.02': 'Director or officer change', '7.01': 'Regulation FD disclosure', '8.01': 'Other events'
};
const FORM_MEANING = {
  '10-Q': 'Quarterly report', '10-K': 'Annual report', '20-F': 'Annual report', '40-F': 'Annual report',
  '6-K': 'Foreign issuer report', 'S-1': 'Registration statement', 'S-3': 'Shelf registration', '424B5': 'Offering prospectus'
};

function describe(rec, i) {
  const items = String(rec.items?.[i] || '').split(/[,;]\s*/).map(c => ITEM_MEANING[c.trim()]).filter(Boolean);
  if (items.length) return items.join(' · ');
  const d = String(rec.primaryDocDescription?.[i] || '').trim();
  if (d && d.toUpperCase() !== String(rec.form[i]).toUpperCase() && !/^form /i.test(d)) return d;
  return FORM_MEANING[String(rec.form[i]).replace('/A', '')] || rec.form[i];
}

export async function checkFreshness({ log = () => {}, ua = process.env.SEC_UA } = {}) {
  if (!ua) { log('  freshness: skipped (no SEC_UA at build time)'); return null; }
  const out = [];
  for (const c of COMPANIES) {
    const cik = SEC_CIK[c.id];
    const through = REVIEWED_THROUGH[c.id];
    if (!cik || !through) continue;
    try {
      const r = await fetch(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, '0')}.json`,
        { headers: { 'User-Agent': ua, 'Accept-Encoding': 'gzip, deflate' } });
      if (!r.ok) { log(`  freshness: ${c.ticker} EDGAR answered ${r.status}`); continue; }
      const rec = (await r.json()).filings?.recent;
      const unreviewed = [];
      for (let i = 0; i < (rec?.form?.length || 0); i++) {
        if (rec.filingDate[i] <= through) break;          // newest first; stop at the line
        if (!FORMS.includes(rec.form[i])) continue;
        const acc = rec.accessionNumber[i].replace(/-/g, '');
        unreviewed.push({
          form: rec.form[i], filed: rec.filingDate[i], description: describe(rec, i),
          accession: rec.accessionNumber[i],
          url: `https://www.sec.gov/Archives/edgar/data/${cik}/${acc}/${rec.primaryDocument[i]}`,
          index: `https://www.sec.gov/Archives/edgar/data/${cik}/${acc}/`
        });
      }
      out.push({ id: c.id, ticker: c.ticker, name: c.name, slug: c.slug, reviewedThrough: through, unreviewed });
    } catch (e) {
      log(`  freshness: ${c.ticker} skipped (${e.message})`);
    }
    await new Promise(r => setTimeout(r, 150));     // EDGAR's fair-access limit is 10 requests a second
  }
  const n = out.reduce((a, c) => a + c.unreviewed.length, 0);
  log(`  freshness: ${out.length} companies checked, ${n} filing${n === 1 ? '' : 's'} not yet reviewed`);
  return { checkedAt: new Date().toISOString(), companies: out };
}
