/**
 * The review helper's reading: from a filing's text, the sentences that can
 * change the record, sorted into the record's own sections.
 *
 * This finds and quotes; it never decides. Every sentence comes out word for
 * word with the filing it came from, and the reviewer chooses what changes
 * in data/companies.js, projects.js, events.js and sources.js. A sentence
 * that names a megawatt figure is shown next to what the record currently
 * says, so a change stands out.
 */

/** What each section listens for. A sentence can land in more than one. */
export const SECTIONS = [
  { id: 'capacity', label: 'Capacity', re: /\b\d[\d,.]*\s*(?:MW|GW|megawatts?|gigawatts?)\b|\benergi[sz]ed\b|\bcommissioned\b|\bonline\b|\bcritical IT\b|\bGPUs?\b|\bdata cent(?:er|re)s?\b/i },
  { id: 'customers', label: 'Customers and contracts', re: /\bcontract(?:s|ed)?\b|\bcustomers?\b|\bagreements?\b|\blease[sd]?\b|\bsigned\b|\bhyperscaler\b|\bARR\b|\bprepayments?\b|\bcolocation\b/i },
  { id: 'financing', label: 'Financing', re: /\bnotes?\b(?! to )|\bfinancing\b|\bfacility\b|\bloan\b|\bdebt\b|\bconvertible\b|\bequity offering\b|\bat-the-market\b|\bproceeds\b|\bcapital raise\b/i },
  { id: 'timing', label: 'Guidance and timing', re: /\bexpect(?:s|ed)?\b|\btarget(?:s|ed)?\b|\bguidance\b|\bon track\b|\bby (?:the )?end of\b|\b(?:Q[1-4]|H[12]|first half|second half)\b[ -]?(?:of )?(?:20\d\d|FY\d\d)|\bdelay(?:s|ed)?\b/i },
  { id: 'results', label: 'Results', re: /\brevenue\b|\bnet (?:income|loss)\b|\bEBITDA\b|\bgross margin\b|\bcash and cash equivalents\b/i }
];

/** Boilerplate that matches the patterns but never changes the record. */
const NOISE = new RegExp([
  'forward-looking statements?', 'safe harbor', 'undue reliance', 'risk factors', 'Private Securities Litigation Reform Act',
  'incorporated (?:herein )?by reference', 'pursuant to the requirements of the Securities Exchange Act', 'check the appropriate box',
  'emerging growth company', 'Commission File Number', 'IRS Employer', 'Indicate by check mark', '^\\s*Exhibit \\d', 'SIGNATURES?',
  'duly authorized', '\\bis (?:defined|calculated) as\\b', 'words such as', 'non-GAAP', 'not a substitute for',
  'webcast', 'Dial-In', 'Participant Registration', '\\bContacts\\b', 'Investor Relations', 'press release',
  'reconciliation', 'should not be considered',
  '\s\d{1,2}\.$', '^(?:Payback|Customer prepayments|GPU capex|ARR) (?:period )?(?:is |are |represent |excludes |estimated )'
].join('|'), 'i');

/** Text to sentences, keeping figures like "1.5 GW" and "U.S." whole. */
export function sentences(text) {
  return String(text)
    // Press releases run their highlights together as bullets: split them out.
    .replace(/\s[•▪●◦]\s+/g, '\n• ').replace(/\so\s+(?=[A-Z$\d])/g, '\n• ')
    .replace(/\s*\n+\s*/g, ' \n ')
    .split(/(?<=[.!?])\s+(?=[A-Z“"(•])|\s\n\s(?=[A-Z•o])/)
    .map(s => s.replace(/\s+/g, ' ').replace(/^[•o]\s+/, '').trim())
    .filter(s => s.length >= 40 && s.length <= 700 && /[a-z]/.test(s));
}

/** Every megawatt figure in a sentence, as megawatts. */
export function mwFigures(s) {
  return [...String(s).matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(MW|GW|megawatts?|gigawatts?)\b/gi)]
    .map(m => Number(m[1].replace(/,/g, '')) * (/^g/i.test(m[2]) ? 1000 : 1));
}

/** How likely a sentence is to change a figure: hard numbers and dates first. */
export function weight(s) {
  return (mwFigures(s).length ? 3 : 0) + (/\$\s?\d|\d\s?(?:bn|billion|million|m)\b/i.test(s) ? 2 : 0) +
    (/\b(?:20\d\d|Q[1-4]|H[12]|January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(s) ? 1 : 0);
}

/** The sentences worth a reviewer's eyes, by section: weightiest first, then in the filing's order. */
export function extract(text, { max = 12 } = {}) {
  const seen = new Set();
  const pool = Object.fromEntries(SECTIONS.map(s => [s.id, []]));
  sentences(text).forEach((s, i) => {
    if (NOISE.test(s)) return;
    const key = s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 120);
    if (seen.has(key)) return;
    seen.add(key);
    for (const sec of SECTIONS) if (sec.re.test(s)) pool[sec.id].push({ s, i, w: weight(s) });
  });
  return Object.fromEntries(Object.entries(pool).map(([k, v]) =>
    [k, v.sort((a, b) => b.w - a.w || a.i - b.i).slice(0, max).sort((a, b) => a.i - b.i).map(x => x.s)]));
}

/** What the record says now, for the MW figures to be read against. */
export function recordSummary(company, metricLabels = {}, projects = []) {
  return [
    ...[...(company?.measures || []), ...(company?.targets || [])].filter(m => m.valueMw != null).map(m => ({
      metric: m.metric, label: metricLabels[m.metric] || m.metric, mw: m.valueMw, status: m.valueStatus, asOf: m.asOf })),
    ...projects.filter(p => p.capacityMw != null).map(p => ({
      metric: 'site', label: `Site: ${p.name}`, mw: p.capacityMw, status: p.valueStatus, asOf: p.asOf }))
  ];
}

/** Figures in the filing that the record does not carry at all — the likeliest changes. */
export function newFigures(found, summary) {
  const known = new Set(summary.map(r => r.mw));
  const all = [...new Set(Object.values(found).flat().flatMap(mwFigures))];
  return all.filter(v => !known.has(v)).sort((a, b) => b - a);
}
