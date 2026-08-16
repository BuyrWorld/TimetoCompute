/**
 * Today / Mission Control derivations.
 *
 * The homepage leads with one number. That number is the easiest thing on the
 * whole site to get dishonestly wrong, so two rules bind it:
 *
 *   1. Megawatts are only ever summed within a single metric. Adding secured
 *      gross power to accepted critical IT would produce a large, meaningless
 *      headline — exactly the conflation the rest of the product exists to
 *      refuse. Same metric implies same basis and same family.
 *   2. If the latest set carries no capacity movement at all, the headline says
 *      what actually happened instead of manufacturing a figure.
 */
import { METRICS } from '../../data/schema.js';
import { COMPANIES } from '../../data/companies.js';
import { signals, todaySet, CATEGORIES } from './signals.js';
import { mw } from './format.js';

/** Confidence of a set of signals: the share resting on a primary document. */
export function setConfidence(rows) {
  if (!rows.length) return null;
  const confirmed = rows.filter(s => s.confidence === 'confirmed').length;
  const share = confirmed / rows.length;
  return {
    share, confirmed, total: rows.length,
    level: share >= 0.75 ? 'high' : share >= 0.4 ? 'medium' : 'low',
    label: share >= 0.75 ? 'High' : share >= 0.4 ? 'Medium' : 'Low'
  };
}

/**
 * The largest comparable capacity movement in a set.
 *
 * Groups by metric — never across metrics — and returns the biggest group. The
 * result names the metric it measured, so the headline can say what moved
 * rather than implying every megawatt on the site moved together.
 */
export function largestMovement(rows) {
  const groups = new Map();
  for (const s of rows) {
    if (s.category !== 'advanced') continue;
    if (!s.metric || s.unit !== 'MW') continue;
    const delta = s.previousValue === null
      ? s.newValue
      : s.newValue - s.previousValue;
    if (!Number.isFinite(delta) || delta <= 0) continue;
    const g = groups.get(s.metric) || { metric: s.metric, totalMw: 0, signals: [] };
    g.totalMw += delta;
    g.signals.push(s);
    groups.set(s.metric, g);
  }
  if (!groups.size) return null;
  const best = [...groups.values()].sort((a, b) => b.totalMw - a.totalMw)[0];
  return {
    ...best,
    label: METRICS[best.metric]?.label || best.metric,
    companies: [...new Set(best.signals.map(s => s.ticker || s.companyId))]
  };
}

/** Plural-safe count phrase, so no sentence ever reads "1 sites". */
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * The headline for the day.
 *
 * `available: false` is a real outcome, not a failure — a ledger with nothing in
 * it must say so rather than print a zero.
 */
export function todaySignal() {
  const set = todaySet();
  const rows = set.signals;

  if (!rows.length) {
    return {
      available: false, at: null, signals: [],
      headline: null, sentence: 'The delivery ledger carries no entries yet.',
      confidence: null
    };
  }

  const movement = largestMovement(rows);
  const confidence = setConfidence(rows);
  const sites = new Set(rows.map(s => s.projectId).filter(Boolean));
  const companies = new Set(rows.map(s => s.companyId));

  // A capacity movement gives a number; otherwise the headline counts what
  // actually happened rather than inventing a megawatt figure.
  const headline = movement
    ? { value: mw(movement.totalMw), rest: 'moved closer to billing', metric: movement.metric }
    : { value: String(rows.length), rest: count(rows.length, 'change', 'changes') + ' recorded', metric: null };

  const where = sites.size
    ? count(sites.size, 'site', 'sites')
    : count(companies.size, 'company', 'companies');

  const sentence = movement
    ? `${where.charAt(0).toUpperCase() + where.slice(1)} strengthened delivery evidence, measured as ${(METRICS[movement.metric]?.label || '').toLowerCase()}.`
    : `${where.charAt(0).toUpperCase() + where.slice(1)} published a sourced change.`;

  return { available: true, at: set.at, signals: rows, headline, sentence, confidence, movement };
}

/**
 * Category counts for "since last visit", computed for every category at once.
 *
 * The server cannot know when a reader last visited — that lives in their
 * browser. So the whole ledger ships as a compact index and the client counts
 * against its own timestamp. Shipping counts computed at build time would show
 * every reader the same "new since your last visit", which would be a lie.
 */
export function signalIndex() {
  return signals({}).map(s => ({ id: s.id, c: s.category, at: s.announcedAt }));
}

/** The categories the rows can fall into, for the client to label its counts. */
export const sinceCategories = () =>
  CATEGORIES.map(c => ({ id: c.id, label: c.label, glyph: c.glyph, tone: c.tone }));

/**
 * Watchlist candidates. Everything tracked, with what the row needs to render
 * before any client state is known — so the panel is useful on a first visit
 * rather than being an empty box.
 */
export function watchCandidates() {
  return COMPANIES.map(c => ({
    id: c.id, ticker: c.ticker, name: c.name, slug: c.slug
  }));
}
