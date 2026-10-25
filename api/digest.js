// api/digest.js — a plain-English digest of one new SEC filing, written by Claude.
//
// Call: /api/digest?url=<EDGAR archive document URL>
//
// Only filings the site itself lists as "not yet reviewed" (/freshness.json)
// can be digested, so the route cannot be used to summarise arbitrary
// documents at our expense. Each point carries a quote that is checked,
// word for word, against the filing; a point whose quote is not found is
// dropped. The digest is labelled as an AI summary everywhere it appears.
//
// Needs ANTHROPIC_API_KEY and SEC_UA. Without the key it answers
// { ok:false, reason:'not-configured' } and the page keeps its EDGAR link.
import Anthropic from '@anthropic-ai/sdk';
import { json } from './_provider.js';
import { SEC_CIK } from '../data/review.js';
import { htmlToText, verifyPoints, pickExhibits, indexUrl, parseFilingUrl, DIGEST_SCHEMA, DIGEST_SYSTEM } from './_digest.js';

const MODEL = 'claude-opus-5-5';
const MAX_CHARS = 90000;          // ~22k tokens: a press release whole, a 10-Q's front half
const done = new Map();           // per warm instance, on top of the CDN cache
let allow = null, allowAt = 0;

async function unreviewedUrls(req) {
  if (allow && Date.now() - allowAt < 600000) return allow;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const r = await fetch(`https://${host}/freshness.json`);
  if (!r.ok) throw new Error('freshness ' + r.status);
  const f = await r.json();
  allow = new Set(f.companies.flatMap(c => c.unreviewed.map(u => u.url)));
  allowAt = Date.now();
  return allow;
}

async function sec(url, ua) {
  const r = await fetch(url, { headers: { 'User-Agent': ua, 'Accept-Encoding': 'gzip, deflate' } });
  if (!r.ok) throw new Error(`EDGAR ${r.status}`);
  return r;
}

export default async function handler(req, res) {
  const ua = process.env.SEC_UA;
  if (!process.env.ANTHROPIC_API_KEY || !ua) return json(res, 200, { ok: false, reason: 'not-configured' });

  const f = parseFilingUrl(String(req.query.url || ''), Object.values(SEC_CIK));
  if (!f) return json(res, 400, { ok: false, reason: 'not-a-tracked-filing' });
  const url = `${f.dir}${f.doc}`;
  if (done.has(url)) return json(res, 200, done.get(url), 2592000);

  try {
    if (!(await unreviewedUrls(req)).has(url)) return json(res, 403, { ok: false, reason: 'not-awaiting-review' });
  } catch {
    return json(res, 503, { ok: false, reason: 'freshness-unavailable' });
  }

  let text;
  try {
    const main = htmlToText(await (await sec(url, ua)).text());
    let exhibits = '';
    const idx = await sec(indexUrl(f), ua).then(r => r.text()).catch(() => '');
    for (const name of pickExhibits(idx, f.doc)) {
      exhibits += `\n\n[Exhibit ${name}]\n` + htmlToText(await (await sec(f.dir + name, ua)).text());
    }
    // A current report's cover page is boilerplate and its exhibit is the
    // news, so the exhibit goes first and survives the length cap.
    text = (exhibits && main.length < 6000 ? exhibits + '\n\n[Cover]\n' + main : main + exhibits).slice(0, MAX_CHARS);
  } catch (e) {
    return json(res, 502, { ok: false, reason: 'filing-unavailable', detail: String(e.message || e) });
  }

  const client = new Anthropic();
  let msg;
  try {
    msg = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: DIGEST_SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: DIGEST_SCHEMA } },
      messages: [{ role: 'user', content: `<filing url="${url}">\n${text}\n</filing>\n\nSummarise this filing.` }]
    });
  } catch (e) {
    const reason = e instanceof Anthropic.RateLimitError ? 'rate-limited'
      : e instanceof Anthropic.AuthenticationError ? 'not-configured'
      : e instanceof Anthropic.APIError ? 'model-error' : 'network';
    return json(res, 502, { ok: false, reason });
  }

  if (msg.stop_reason === 'refusal') return json(res, 200, { ok: false, reason: 'declined' });
  if (msg.stop_reason === 'max_tokens') return json(res, 502, { ok: false, reason: 'model-error' });
  let out;
  try {
    out = JSON.parse(msg.content.find(b => b.type === 'text')?.text || '');
  } catch {
    return json(res, 502, { ok: false, reason: 'model-error' });
  }

  const { kept, dropped } = verifyPoints(out.points, text);
  const payload = {
    ok: true, url, headline: out.headline, points: kept.slice(0, 5), unverifiedDropped: dropped,
    truncated: text.length >= MAX_CHARS, model: msg.model, writtenAt: new Date().toISOString()
  };
  done.set(url, payload);
  return json(res, 200, payload, 2592000);
}
