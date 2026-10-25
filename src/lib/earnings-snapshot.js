/**
 * Build-time earnings snapshot.
 *
 * The live calendar (/api/catalysts) asks the provider for ~38 companies, and
 * the free plan's per-minute quota is shared with the news feed. Right after a
 * deploy — when every in-memory cache is cold — that burst could leave whole
 * groups of the calendar empty. So the build fetches the same dates slowly,
 * one company at a time inside the quota, and bakes them into the page. The
 * page shows the snapshot instantly; the live lookup only refreshes it.
 *
 * Needs FINNHUB_KEY at build time. Without it (local builds, or a key scoped
 * to runtime only) the snapshot is skipped and the page behaves as before.
 * Never fails the build: a provider problem just means a thinner snapshot.
 */
import fs from 'node:fs';
import { finnhub } from '../../api/_provider.js';

const SPACING_MS = 1100;   // ~55 calls a minute, under the free plan's 60
const pause = ms => new Promise(r => setTimeout(r, ms));

export async function earningsSnapshot(tickers, { days = 200, log = () => {} } = {}) {
  // QA hook: a fixture file stands in for the provider, so the merge can be tested offline.
  if (process.env.T2C_EARNINGS_FIXTURE) {
    return JSON.parse(fs.readFileSync(process.env.T2C_EARNINGS_FIXTURE, 'utf8'));
  }
  if (!process.env.FINNHUB_KEY) { log('  earnings snapshot: skipped (no FINNHUB_KEY at build time)'); return null; }

  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const events = [];
  let ok = 0, failed = 0;
  for (const sym of tickers) {
    let c = await finnhub('/calendar/earnings', { from, to, symbol: sym });
    if (!c.ok && c.reason === 'rate-limited') { await pause(8000); c = await finnhub('/calendar/earnings', { from, to, symbol: sym }); }
    if (c.ok) {
      ok += 1;
      for (const e of c.data?.earningsCalendar || []) {
        if (e.date) events.push({ ticker: sym, category: 'earnings', expectedAt: e.date, session: e.hour || null,
          quarter: e.quarter || null, year: e.year || null });
      }
    } else failed += 1;
    await pause(SPACING_MS);
  }
  events.sort((a, b) => a.expectedAt.localeCompare(b.expectedAt));
  log(`  earnings snapshot: ${ok}/${tickers.length} companies, ${events.length} dates${failed ? `, ${failed} unavailable` : ''}`);
  return ok ? { asOf: new Date().toISOString(), events } : null;
}
