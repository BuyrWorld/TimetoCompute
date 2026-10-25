/**
 * The review helper: read every filing the record has not caught up with,
 * and lay out the sentences that can change it, beside what the record says.
 *
 *   npm run review                      every tracked company
 *   npm run review -- iren              one company (id or ticker)
 *   npm run review -- iren --since 2026-08-20   look further back than the review line
 *   npm run review -- --out review.md   also write the report to a file
 *
 * Needs SEC_UA (EDGAR requires a User-Agent naming a contact), e.g.
 *   SEC_UA="T2C research you@example.com" npm run review
 *
 * It finds and quotes; it never edits. The report ends with the checklist
 * for updating the record and moving the company's line in data/review.js.
 */
import fs from 'node:fs';
import { checkFreshness } from '../src/lib/freshness.js';
import { COMPANIES } from '../data/companies.js';
import { PROJECTS_BY_COMPANY } from '../data/projects.js';
import { METRICS } from '../data/schema.js';
import { REVIEWED_THROUGH } from '../data/review.js';
import { htmlToText, pickExhibits, indexUrl, parseFilingUrl } from '../api/_digest.js';
import { SEC_CIK } from '../data/review.js';
import { SECTIONS, extract, recordSummary, newFigures, mwFigures } from '../src/lib/review.js';

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const since = flag('--since'), out = flag('--out');
const who = args.find((a, i) => !a.startsWith('--') && !['--since', '--out'].includes(args[i - 1]));
const ua = process.env.SEC_UA;
if (!ua) { console.error('Set SEC_UA first, e.g. SEC_UA="T2C research you@example.com" npm run review'); process.exit(1); }

const company = who && COMPANIES.find(c => c.id === who.toLowerCase() || c.ticker.toLowerCase() === who.toLowerCase());
if (who && !company) { console.error(`No tracked company "${who}". Try: ${COMPANIES.map(c => c.ticker).join(', ')}`); process.exit(1); }

const get = async url => {
  const r = await fetch(url, { headers: { 'User-Agent': ua, 'Accept-Encoding': 'gzip, deflate' } });
  if (!r.ok) throw new Error(`EDGAR ${r.status} for ${url}`);
  await new Promise(res => setTimeout(res, 150));        // EDGAR's fair-access limit
  return r.text();
};

const report = await checkFreshness({ ua, since, only: company?.id, log: m => console.error(m) });
if (!report) process.exit(1);
const labels = Object.fromEntries(Object.entries(METRICS).map(([k, v]) => [k, v.label]));
const lines = [`# Filings to review`, '', `_Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC${since ? `, looking back to ${since}` : ''}._`, ''];
let total = 0;

for (const co of report.companies) {
  if (!co.unreviewed.length) continue;
  const c = COMPANIES.find(x => x.id === co.id);
  const summary = recordSummary(c, labels, PROJECTS_BY_COMPANY[co.id] || []);
  lines.push(`## ${co.name} (${co.ticker})`, '', `Record reviewed through **${REVIEWED_THROUGH[co.id]}**. What it says now:`, '',
    '| Measure | MW | Basis | As of |', '|---|---|---|---|',
    ...summary.map(r => `| ${r.label} | ${r.mw.toLocaleString('en-GB')} | ${r.status} | ${r.asOf || '—'} |`), '');

  for (const u of [...co.unreviewed].reverse()) {             // oldest first: read them in the order they happened
    total++;
    const f = parseFilingUrl(u.url, Object.values(SEC_CIK));
    let text = '';
    const read = [];
    try {
      text = htmlToText(await get(u.url)); read.push(f?.doc || 'primary document');
      const exhibits = f ? pickExhibits(await get(indexUrl(f)).catch(() => ''), f.doc) : [];
      for (const n of exhibits) { text += '\n\n' + htmlToText(await get(f.dir + n)); read.push(n); }
    } catch (e) { lines.push(`### ${u.filed} · ${u.form} · ${u.description}`, '', `Could not read it: ${e.message}. [EDGAR](${u.url})`, ''); continue; }

    const found = extract(text);
    const fresh = newFigures(found, summary);
    const n = Object.values(found).reduce((a, v) => a + v.length, 0);
    lines.push(`### ${u.filed} · ${u.form} · ${u.description}`, '', `[Filing on EDGAR](${u.url}) · read: ${read.join(', ')} · accession ${u.accession}`, '');
    if (fresh.length) lines.push(`**Megawatt figures not in the record:** ${fresh.map(v => `${v.toLocaleString('en-GB')} MW`).join(', ')}`, '');
    if (!n) { lines.push('_Nothing in this filing matched capacity, contracts, financing, timing or results. Likely administrative; check the link._', ''); continue; }
    for (const sec of SECTIONS) {
      if (!found[sec.id].length) continue;
      lines.push(`**${sec.label}**`, '', ...found[sec.id].map(s => `- ${mwFigures(s).some(v => fresh.includes(v)) ? '🆕 ' : ''}“${s}”`), '');
    }
  }
  lines.push('**To clear it:** update `data/companies.js` (measures), `data/projects.js` (sites), `data/events.js` (what changed) and',
    `\`data/sources.js\` (one entry per document), then move \`${co.id}\` in \`data/review.js\` to the newest filing date you read. Run \`npm run verify\`.`, '');
}

if (!total) lines.push(company ? `Nothing to review for ${company.name}: every filing is reviewed through ${REVIEWED_THROUGH[company.id]}.`
  : 'Nothing to review: every tracked company is up to date.');
const md = lines.join('\n');
console.log(md);
if (out) { fs.writeFileSync(out, md); console.error(`\nwritten to ${out}`); }
