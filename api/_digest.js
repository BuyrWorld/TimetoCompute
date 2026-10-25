/**
 * The pure half of /api/digest: turning a filing into text, and checking
 * every point Claude returns against that text before it is shown.
 *
 * A point survives only if its supporting quote is found, word for word
 * (whitespace and curly quotes aside), in the filing it claims to come from.
 * No document, no line — the same rule the chain links follow.
 */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', bull: '•' };

/** EDGAR HTML (often inline XBRL) to readable text: hidden XBRL headers, scripts and styles dropped. */
export function htmlToText(html) {
  return String(html)
    .replace(/<ix:header[\s\S]*?<\/ix:header>/gi, ' ')
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<div[^>]*display:\s*none[\s\S]*?<\/div>/gi, ' ')
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>|<br\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' \t ')
    .replace(/<[^>]+>/g, '')            // inline tags (spans, XBRL facts) sit inside words and sentences
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n[ \n]*/g, '\n')
    .trim();
}

/** Normalise for matching: one space, straight quotes, one dash, no case. */
export function norm(s) {
  return String(s).toLowerCase()
    .replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ').replace(/ ([.,;:)%])/g, '$1').replace(/([($]) /g, '$1').trim();
}

/** Keep the points whose quote really is in the filing; report how many were dropped. */
export function verifyPoints(points, text) {
  const hay = norm(text);
  const kept = [], dropped = [];
  for (const p of points || []) {
    const q = norm(p.quote || '').replace(/^["']|["']$/g, '').replace(/\.{3}|…/g, '…');
    // An elided quote ("a … b") must match each of its pieces, in order.
    const parts = q.split('…').map(x => x.trim()).filter(x => x.length >= 12);
    let at = 0, ok = parts.length > 0;
    for (const part of parts) {
      const i = hay.indexOf(part, at);
      if (i < 0) { ok = false; break; }
      at = i + part.length;
    }
    (ok ? kept : dropped).push(p);
  }
  return { kept, dropped: dropped.length };
}

/** For a current report the press release lives in an exhibit. Reads the
 *  filing index page (the only listing that names each document's type) and
 *  returns the EX-99 documents, press releases first. */
export function pickExhibits(indexHtml, primary) {
  const rows = [...String(indexHtml || '').matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m =>
    [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => c[1]));
  return rows.filter(c => c.length >= 4 && /^EX-99/i.test(c[3].trim()))
    .map(c => (c[2].match(/>([A-Za-z0-9._-]+\.htm)</) || [])[1])
    .filter(n => n && n !== primary)
    .slice(0, 2);
}

/** The index page's address: the accession number, dashed 10-2-6. */
export const indexUrl = f => `${f.dir}${f.acc.slice(0, 10)}-${f.acc.slice(10, 12)}-${f.acc.slice(12)}-index.html`;

/** Only EDGAR archive documents of companies the site tracks. */
export function parseFilingUrl(u, ciks) {
  let url;
  try { url = new URL(u); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'www.sec.gov') return null;
  const m = url.pathname.match(/^\/Archives\/edgar\/data\/(\d{1,10})\/(\d{18})\/([A-Za-z0-9._-]+\.htm)$/);
  if (!m) return null;
  if (!ciks.map(Number).includes(Number(m[1]))) return null;
  return { cik: m[1], acc: m[2], doc: m[3], dir: `https://www.sec.gov/Archives/edgar/data/${m[1]}/${m[2]}/` };
}

export const DIGEST_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'One plain sentence: what this filing says, for someone who has never read one.' },
    points: {
      type: 'array',
      description: 'Up to five points that matter for AI data-centre capacity, money or timing, most important first.',
      items: {
        type: 'object',
        properties: {
          point: { type: 'string', description: 'The point in plain English, at most 30 words. Figures as the filing gives them.' },
          quote: { type: 'string', description: 'A sentence copied exactly from the filing that supports the point. Verbatim, no paraphrase.' }
        },
        required: ['point', 'quote'],
        additionalProperties: false
      }
    }
  },
  required: ['headline', 'points'],
  additionalProperties: false
};

export const DIGEST_SYSTEM = `You summarise SEC filings for TimeToCompute, a site that tracks AI data-centre capacity: megawatts energised, contracted and billing, GPU deliveries, customer contracts, financing and construction timing.

Write for a reader who has never opened a filing. Plain words, no jargon, no investment advice, no opinions, no predictions.

Every point must be supported by a sentence copied exactly from the filing text — character for character, as it appears. The quote will be checked against the filing and the point discarded if it is not found, so never paraphrase, merge or tidy a quote. If you need to skip words inside a quote, use "…".

Prefer facts about capacity, customers, contracts, financing, guidance and timing over boilerplate (risk factors, forward-looking statement disclaimers, signatures). If the filing has nothing material — for example an administrative notice — say so in the headline and return fewer points. Never invent a figure.`;
