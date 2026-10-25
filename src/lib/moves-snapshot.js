/**
 * Build-time share-move snapshot for the homepage chain's heat map.
 *
 * The daily rebuild runs at 10:00 UTC, before the US open, so each quote's
 * change is the last full session's move: close against the close before.
 * Fetched one ticker at a time inside the free plan's per-minute quota (it
 * is shared with the news feed and the earnings snapshot), and baked into
 * the page, so the heat map costs no live calls at all.
 *
 * Needs FINNHUB_KEY at build time; without it the heat map is not offered.
 * Never fails the build.
 */
import fs from 'node:fs';
import { finnhub } from '../../api/_provider.js';

const SPACING_MS = 1100;
const pause = ms => new Promise(r => setTimeout(r, ms));
const etDate = sec => new Date(sec * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

export async function movesSnapshot(tickers, { log = () => {} } = {}) {
  if (process.env.T2C_MOVES_FIXTURE) return JSON.parse(fs.readFileSync(process.env.T2C_MOVES_FIXTURE, 'utf8'));
  if (!process.env.FINNHUB_KEY) { log('  share moves: skipped (no FINNHUB_KEY at build time)'); return null; }

  const moves = {}, sessions = {};
  for (const sym of tickers) {
    let q = await finnhub('/quote', { symbol: sym });
    if (!q.ok && q.reason === 'rate-limited') { await pause(8000); q = await finnhub('/quote', { symbol: sym }); }
    // A quote with no timestamp or no prior close is an unknown symbol, not a flat day.
    if (q.ok && q.data?.t && q.data.pc && Number.isFinite(q.data.dp)) {
      const d = etDate(q.data.t);
      moves[sym] = { dp: Math.round(q.data.dp * 100) / 100, c: q.data.c, d };
      sessions[d] = (sessions[d] || 0) + 1;
    }
    await pause(SPACING_MS);
  }
  if (!Object.keys(moves).length) { log('  share moves: none available'); return null; }
  // The session most quotes belong to; a symbol that has not traded since
  // (halted, or a foreign listing on a holiday) is left out, not shown stale.
  const session = Object.entries(sessions).sort((a, b) => b[1] - a[1])[0][0];
  for (const [sym, m] of Object.entries(moves)) { if (m.d !== session) delete moves[sym]; else delete m.d; }
  log(`  share moves: ${Object.keys(moves).length}/${tickers.length} tickers, session ${session}`);
  return { asOf: new Date().toISOString(), session, moves };
}

/** The middle move of a stage's quoted companies, or null when none is quoted. */
export function medianMove(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) * 50) / 100;
}
