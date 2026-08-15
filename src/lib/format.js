/** Centralised formatting and terminology. One place to change how a figure reads. */
import { VALUE_STATUS, POWER_BASIS, CONFIDENCE } from '../../data/schema.js';

export const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const NOT_DISCLOSED = 'Not disclosed';

export function mw(value) {
  if (value === null || value === undefined) return NOT_DISCLOSED;
  if (value === 0) return '0 MW';
  if (value >= 1000) {
    const gw = value / 1000;
    return `${gw % 1 === 0 ? gw.toFixed(0) : gw.toFixed(gw < 10 ? 2 : 1)} GW`;
  }
  return `${value % 1 === 0 ? value : value.toFixed(1)} MW`;
}

/** A minimum always reads with its ≥ so it can never be mistaken for a total. */
export const mwWithStatus = (value, valueStatus) =>
  value === null || value === undefined
    ? NOT_DISCLOSED
    : `${valueStatus === 'minimum' ? '≥' : ''}${mw(value)}`;

export function pct(fraction, digits = 0) {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return NOT_DISCLOSED;
  return `${(fraction * 100).toFixed(digits)}%`;
}
export function pctValue(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return NOT_DISCLOSED;
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;
}
export function usdBn(v) {
  if (v === null || v === undefined) return NOT_DISCLOSED;
  return `$${v}bn`;
}
export const money = (v, dp = 2) =>
  v === null || v === undefined || !Number.isFinite(v) ? NOT_DISCLOSED : `$${Number(v).toFixed(dp)}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Dates render UTC-safe from a YYYY-MM-DD string. Never a relative "today". */
export function date(iso) {
  if (!iso) return NOT_DISCLOSED;
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return NOT_DISCLOSED;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** A guided window prints as a range, never as a false exact date. */
export function windowLabel(start, end) {
  if (!start || !end) return NOT_DISCLOSED;
  const s = String(start).slice(0, 10), e = String(end).slice(0, 10);
  const [sy, sm] = s.split('-').map(Number);
  const [ey, em] = e.split('-').map(Number);
  if (sy === ey) {
    if (sm === 1 && em === 6) return `H1 ${sy}`;
    if (sm === 7 && em === 12) return `H2 ${sy}`;
    if (sm === ey && em === sm) return `${MONTHS[sm - 1]} ${sy}`;
    if (sm === 10 && em === 12) return `Q4 ${sy}`;
    return `${MONTHS[sm - 1]}–${MONTHS[em - 1]} ${sy}`;
  }
  return `${date(s)} – ${date(e)}`;
}

export const statusLabel = s => VALUE_STATUS[s]?.label ?? s;
export const basisLabel = b => POWER_BASIS[b]?.short ?? b;
export const confidenceLabel = c => CONFIDENCE[c]?.label ?? c;

export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'source'; }
}

/** Days from today (UTC) to an ISO date. Negative means past. */
export function daysUntil(iso, now = new Date()) {
  if (!iso) return null;
  const t = Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((t - today) / 86400000);
}

export function countdown(iso, now = new Date()) {
  const d = daysUntil(iso, now);
  if (d === null) return null;
  if (d === 0) return 'Today';
  if (d < 0) return `${Math.abs(d)} days ago`;
  if (d === 1) return 'Tomorrow';
  if (d < 60) return `In ${d} days`;
  const months = Math.round(d / 30.44);
  return `In about ${months} month${months === 1 ? '' : 's'}`;
}
