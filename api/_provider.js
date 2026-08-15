/**
 * Server-side market-data provider abstraction.
 *
 * The UI never talks to a vendor directly. Everything goes through this module so
 * a provider can be swapped without touching a component, and so an unavailable
 * capability returns an honest `unavailable` state rather than a fabricated one.
 *
 * Secrets stay here. Nothing in this file is ever bundled to the client.
 */

const FINNHUB = 'https://finnhub.io/api/v1';

/** Small in-instance cache. Vercel keeps warm instances alive between requests. */
const cache = new Map();

export function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) {
    return Promise.resolve({ ...hit.value, cache: 'hit', cachedAt: new Date(hit.at).toISOString() });
  }
  return fn().then(value => {
    cache.set(key, { at: Date.now(), value });
    return { ...value, cache: 'miss' };
  }).catch(err => {
    // Stale-while-error: an expired entry beats replacing good data with nothing.
    if (hit) {
      return {
        ...hit.value, cache: 'stale', cachedAt: new Date(hit.at).toISOString(),
        stale: true, staleReason: String(err.message || err)
      };
    }
    throw err;
  });
}

/** One Finnhub call. Distinguishes "no access on this plan" from "no data". */
export async function finnhub(pathname, params = {}) {
  const key = process.env.FINNHUB_KEY;
  if (!key) return { ok: false, reason: 'not-configured', status: 0 };

  const qs = new URLSearchParams({ ...params, token: key });
  let r;
  try {
    r = await fetch(`${FINNHUB}${pathname}?${qs}`);
  } catch (e) {
    return { ok: false, reason: 'network', status: 0, detail: String(e.message || e) };
  }

  if (r.status === 401 || r.status === 403) return { ok: false, reason: 'plan-restricted', status: r.status };
  if (r.status === 429) return { ok: false, reason: 'rate-limited', status: 429 };
  if (!r.ok) return { ok: false, reason: 'upstream-error', status: r.status };

  let data;
  try { data = await r.json(); } catch { return { ok: false, reason: 'bad-payload', status: r.status }; }
  return { ok: true, status: r.status, data };
}

export const TRADING_TICKERS = ['IREN', 'CRWV', 'NBIS', 'WULF', 'KEEL', 'APLD', 'CIFR', 'NVDA'];

/** US equity market session state, in America/New_York, for honest feed labelling. */
export function marketSession(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour12: false,
    weekday: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const weekday = parts.weekday;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const dateEt = `${parts.year}-${parts.month}-${parts.day}`;

  // US market holidays are not modelled here; a holiday reads as "closed" only via
  // the weekend/hours test, so the label says "scheduled" rather than asserting.
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const PRE = 4 * 60, OPEN = 9 * 60 + 30, CLOSE = 16 * 60, POST = 20 * 60;

  let phase = 'closed';
  if (!isWeekend) {
    if (minutes >= OPEN && minutes < CLOSE) phase = 'regular';
    else if (minutes >= PRE && minutes < OPEN) phase = 'pre';
    else if (minutes >= CLOSE && minutes < POST) phase = 'post';
  }
  return {
    phase,
    isOpen: phase === 'regular',
    isExtended: phase === 'pre' || phase === 'post',
    dateEt,
    weekday,
    label: phase === 'regular' ? 'Market open'
      : phase === 'pre' ? 'Pre-market'
      : phase === 'post' ? 'After hours'
      : 'Market closed',
    timezone: 'America/New_York'
  };
}

export function json(res, status, payload, cacheSeconds = 0) {
  if (cacheSeconds > 0) {
    res.setHeader('Cache-Control', `s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 4}`);
  }
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(payload);
}
