/**
 * Lognormal scenario maths. Pure functions, no DOM, so they can be tested against
 * hand-computed reference cases.
 *
 * This is a probability exercise on user-chosen inputs. It is not options-implied
 * probability, not a forecast, and not advice.
 */

const SQ2PI = Math.sqrt(2 * Math.PI);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** Abramowitz–Stegun 26.2.17. Absolute error < 7.5e-8. */
export function normCdf(x) {
  if (!Number.isFinite(x)) return x > 0 ? 1 : 0;
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = Math.exp(-x * x / 2) / SQ2PI;
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}
export const normPdf = x => Math.exp(-x * x / 2) / SQ2PI;

/** Trading-day count is irrelevant here: volatility is annualised on calendar time. */
export const YEAR_DAYS = 365.25;

/**
 * Whole days between two YYYY-MM-DD strings, computed in UTC.
 *
 * Date-only arithmetic must not go through local time: parsing "2026-11-13" as a
 * local Date and differencing against `new Date()` produced an off-by-one that
 * displayed a 13 November deadline as "before 12 Nov" for anyone behind UTC.
 */
export function daysBetweenUtc(fromIso, toIso) {
  const a = Date.parse(`${String(fromIso).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${String(toIso).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

/** Today in UTC as YYYY-MM-DD. */
export const todayUtc = (now = new Date()) => now.toISOString().slice(0, 10);

/** Format a date-only string for display without a timezone shift. */
export function formatDateUtc(iso, { day = 'numeric', month = 'short', year = undefined } = {}) {
  const t = Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(t)) return 'Not disclosed';
  return new Intl.DateTimeFormat('en-GB', { day, month, year, timeZone: 'UTC' }).format(new Date(t));
}

/**
 * Probability the price finishes above K at T.
 * P = N(d2), d2 = [ln(S0/K) + (mu - sigma^2/2)T] / (sigma*sqrt(T))
 */
export function probFinishAbove(S0, K, sigma, T, mu = 0) {
  if (T <= 0) return S0 > K ? 1 : 0;
  if (!(S0 > 0) || !(K > 0) || !(sigma > 0)) return 0;
  const m = mu - 0.5 * sigma * sigma;
  return normCdf((Math.log(S0 / K) + m * T) / (sigma * Math.sqrt(T)));
}

/**
 * Probability the price touches barrier B at any time before T.
 *
 * Uses the reflection principle for Brownian motion with drift: for a barrier
 * above the current price, paths that cross and fall back are recovered by
 * reflecting the portion after the first crossing, which is why the touch
 * probability exceeds the finish-above probability.
 */
export function probTouch(S0, B, sigma, T, mu = 0) {
  if (T <= 0 || !(sigma > 0) || !(S0 > 0) || !(B > 0)) return 0;
  const m = mu - 0.5 * sigma * sigma;
  const b = Math.log(B / S0);
  const sT = sigma * Math.sqrt(T);
  const p = B > S0
    ? normCdf((m * T - b) / sT) + Math.exp(2 * m * b / (sigma * sigma)) * normCdf((-b - m * T) / sT)
    : normCdf((b - m * T) / sT) + Math.exp(2 * m * b / (sigma * sigma)) * normCdf((b + m * T) / sT);
  return clamp(p, 0, 1);
}

/** Price at percentile z (in standard deviations) of the terminal distribution. */
export const quantile = (S0, sigma, T, mu, z) =>
  S0 * Math.exp((mu - 0.5 * sigma * sigma) * T + z * sigma * Math.sqrt(T));

/** Price at a cumulative probability p (0–1). */
export function percentile(S0, sigma, T, mu, p) {
  return quantile(S0, sigma, T, mu, inverseNorm(p));
}

/** Acklam's inverse normal CDF. Accurate to ~1.15e-9. */
export function inverseNorm(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425;
  let q, r;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pl) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * Full scenario. `days` is calendar days to the deadline, computed UTC-safe by the
 * caller so the displayed deadline always matches the date the user picked.
 */
export function scenario({ spot, target, days, volPct, driftPct = 0 }) {
  const S0 = Number(spot), B = Number(target);
  const sigma = Number(volPct) / 100, mu = Number(driftPct) / 100;
  const T = Number(days) / YEAR_DAYS;

  if (!(S0 > 0) || !(B > 0) || !(days > 0) || !(sigma > 0)) {
    return { valid: false, reason: 'Enter a positive price, target, volatility and a future date.' };
  }

  const finishAbove = probFinishAbove(S0, B, sigma, T, mu);
  const touch = probTouch(S0, B, sigma, T, mu);
  const median = quantile(S0, sigma, T, mu, 0);
  const lo = quantile(S0, sigma, T, mu, -1);
  const hi = quantile(S0, sigma, T, mu, 1);
  const halve = 1 - probFinishAbove(S0, S0 * 0.5, sigma, T, mu);
  const requiredMovePct = (B / S0 - 1) * 100;
  const windowVol = sigma * Math.sqrt(T);

  return {
    valid: true,
    spot: S0, target: B, days, T, sigma, mu,
    finishAbove, touch, median, lo, hi, halve,
    requiredMovePct,
    windowVolPct: windowVol * 100,
    /** how many window-sized moves away the target sits */
    sigmasAway: Math.log(B / S0) / windowVol
  };
}

/** Percentile bands over time, for the fan chart. Modelled distribution, not a path. */
export function fanBands(scn, steps = 40) {
  if (!scn.valid) return [];
  const ps = [0.10, 0.25, 0.50, 0.75, 0.90];
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = (scn.T * i) / steps;
    const day = Math.round((scn.days * i) / steps);
    const band = { t, day, values: {} };
    for (const p of ps) {
      band.values[p] = t === 0 ? scn.spot : percentile(scn.spot, scn.sigma, t, scn.mu, p);
    }
    out.push(band);
  }
  return out;
}

/**
 * Annualised realised volatility from a close series.
 * Uses log returns and sqrt(252) trading-day annualisation.
 */
export function realisedVolPct(closes, lookback = 90) {
  if (!Array.isArray(closes) || closes.length < 3) return null;
  const series = closes.slice(-(lookback + 1));
  const rets = [];
  for (let i = 1; i < series.length; i++) {
    if (!(series[i] > 0) || !(series[i - 1] > 0)) continue;
    rets.push(Math.log(series[i] / series[i - 1]));
  }
  if (rets.length < 2) return null;
  const mean = rets.reduce((a, r) => a + r, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export const VOL_LOOKBACKS = [30, 60, 90, 252];

/** Documented so the default volatility is never an unexplained number. */
export const VOL_METHODOLOGY = {
  estimator: 'Close-to-close log-return standard deviation',
  annualisation: 'sqrt(252) trading days',
  priceBasis: 'Adjusted daily closes',
  lookbacks: VOL_LOOKBACKS,
  note:
    'When historical closes are unavailable from the data provider, the calculator falls back to a ' +
    'per-ticker typical volatility and says so beside the input. A fallback is never presented as a ' +
    'measured figure.'
};
