/** Centralised formatting and terminology. One place to change how a figure reads. */

export const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** The phrase used everywhere a company has not published a figure. */
export const NOT_DISCLOSED = 'Not disclosed';

export function mw(value, { long = false } = {}) {
  if (value === null || value === undefined) return NOT_DISCLOSED;
  if (value === 0) return '0 MW';
  if (value >= 1000) {
    const gw = value / 1000;
    return `${gw % 1 === 0 ? gw.toFixed(0) : gw.toFixed(gw < 10 ? 2 : 1)} GW${long ? '' : ''}`;
  }
  return `${value % 1 === 0 ? value : value.toFixed(1)} MW`;
}

export function pct(fraction, digits = 0) {
  if (fraction === null || fraction === undefined) return NOT_DISCLOSED;
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function usdBn(v) {
  if (v === null || v === undefined) return NOT_DISCLOSED;
  return `$${v}bn`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Dates render as "30 Jun 2026". Never as a relative "today". */
export function date(iso) {
  if (!iso) return NOT_DISCLOSED;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return NOT_DISCLOSED;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Whole days between two ISO dates, or null when either is missing. */
export function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export function slipLabel(days) {
  if (days === null) return NOT_DISCLOSED;
  if (days === 0) return 'On target';
  return days > 0 ? `${days} days late` : `${Math.abs(days)} days early`;
}

/** Domain shown on a source chip, e.g. "investors.coreweave.com". */
export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'source'; }
}
