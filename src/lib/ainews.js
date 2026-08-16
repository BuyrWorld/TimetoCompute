/**
 * AI News — the finite signal product.
 *
 * The pack's positioning is "only what changes the chain", and the thing that
 * makes that true is not a filter bar. It is that this page has a LAST ITEM. A
 * feed that never ends cannot claim to have removed noise, because the reader
 * has no way to know when they have seen everything.
 *
 * WHAT IS DERIVED AND WHAT IS NOT:
 *
 *   happened / matters / next   Reused from `storyFor()`, the same function the
 *                               homepage lead story uses. Not a second copy.
 *   materiality                 The event's own `significance` field. Not scored
 *                               here, not invented.
 *   grouping                    Signals resting on exactly the SAME document are
 *                               one disclosure. That is the only grouping rule
 *                               applied, because it is the only one that is
 *                               defensible without matching headlines by text.
 *   affected stages             Only the three stages T2C tracks can match a
 *                               signal, because only those have records.
 *
 * The mockup shows "27 stories grouped into 8 material signals". T2C cannot
 * honestly produce that number: it would require matching external wire
 * headlines to sourced records, which is unsolved here. So the noise figure
 * reported is the real one — how many records rest on how many documents.
 */
import { signals, availableCategories, CATEGORIES } from './signals.js';
import { storyFor } from './leadstory.js';
import { COMPANY_BY_ID, COMPANIES } from '../../data/companies.js';
import { SOURCE_BY_ID } from '../../data/sources.js';
import { CATALYSTS } from '../../data/catalysts.js';
import { STAGE_EXPLAINERS } from '../../data/explainers.js';

/** Materiality is the record's own significance. Renamed, never recomputed. */
export const MATERIALITY = {
  high: { id: 'high', label: 'High', rank: 3, definition: 'Moves a gate, a customer or a capacity figure.' },
  medium: { id: 'medium', label: 'Medium', rank: 2, definition: 'Changes the picture without moving a gate.' },
  low: { id: 'low', label: 'Low', rank: 1, definition: 'On the record, but consequential only in aggregate.' }
};

/**
 * Which chain stages a signal touches.
 *
 * Deliberately narrow. A contract signed is a customer event; an acceptance is
 * the acceptance stage; billing is revenue. Nothing maps to the four upstream
 * stages, because T2C holds no upstream records — and inventing a mapping would
 * put photonics badges on stories that say nothing about photonics.
 */
const STAGE_FOR_EVENT = {
  'contract-signed': ['factory'],
  'customer-accepted': ['accepted'],
  'revenue-commenced': ['revenue'],
  'capacity-change': ['factory'],
  'stage-change': ['factory'],
  'new-disclosure': ['factory'],
  'target-change': ['factory'],
  delay: ['factory'],
  financing: ['factory'],
  disposal: ['factory'],
  correction: []
};

const STAGE_META = Object.fromEntries(
  STAGE_EXPLAINERS.map(e => [e.stageId, { label: e.name, href: `/explainers/${e.slug}/`, asset: e.asset }])
);

/** Document type, for the source-quality panel. */
const SOURCE_TIER = {
  'sec-filing': { id: 'filing', label: 'SEC filing', rank: 3 },
  'company-ir': { id: 'company', label: 'Company release', rank: 2 },
  regulator: { id: 'regulator', label: 'Regulator record', rank: 3 },
  'company-profile': { id: 'company', label: 'Company page', rank: 1 }
};

/**
 * One signal, enriched.
 *
 * Everything here is either copied from the record or derived by a named rule
 * that is stated in this file. There is no field a reader could not trace back.
 */
export function newsSignal(s) {
  const story = storyFor(s);
  const co = COMPANY_BY_ID[s.companyId];
  const sources = (s.sourceIds || []).map(id => SOURCE_BY_ID[id]).filter(Boolean);

  return {
    id: s.id,
    signal: s,
    title: story.headline,
    happened: story.whatHappened,
    matters: story.whyItMatters,
    next: story.whatHappensNext,
    blockers: story.blockers,
    changed: story.whatChanged,

    materiality: s.significance || 'medium',
    materialityLabel: MATERIALITY[s.significance || 'medium'].label,
    confidence: s.confidence,

    category: s.category,
    categoryLabel: s.categoryLabel,
    eventType: s.eventType,
    eventTypeLabel: s.eventTypeLabel,

    company: co || null,
    companyName: s.companyName,
    ticker: s.ticker,
    companySlug: s.companySlug,
    projectId: s.projectId,
    projectName: s.projectName,

    stages: (STAGE_FOR_EVENT[s.eventType] || [])
      .map(id => ({ id, ...STAGE_META[id] })).filter(x => x.label),

    announcedAt: s.announcedAt,
    effectiveAt: s.effectiveAt,
    sources,
    sourceCount: sources.length,
    /* The strongest document behind the claim, which is what the source-quality
       panel counts. A record with a filing behind it is not the same as one
       resting on a company page. */
    bestSource: sources
      .map(x => SOURCE_TIER[x.sourceType])
      .filter(Boolean)
      .sort((a, b) => b.rank - a.rank)[0] || null
  };
}

/** Every signal, newest first, most material first within a day. */
export function newsSignals() {
  return signals({})
    .map(newsSignal)
    .sort((a, b) =>
      String(b.announcedAt).localeCompare(String(a.announcedAt)) ||
      MATERIALITY[b.materiality].rank - MATERIALITY[a.materiality].rank ||
      String(a.id).localeCompare(String(b.id)));
}

/**
 * Grouped coverage.
 *
 * Two records extracted from the same document are one disclosure, and showing
 * them as two signals overstates how much happened. This is the only grouping
 * rule applied: no headline matching, no fuzzy dates, no judgement about whether
 * two announcements are "really" the same story.
 */
export function signalGroups() {
  const rows = newsSignals();
  const byDoc = new Map();

  for (const r of rows) {
    const key = r.signal.sourceIds?.length
      ? [...r.signal.sourceIds].sort().join('+')
      : `solo:${r.id}`;
    if (!byDoc.has(key)) byDoc.set(key, []);
    byDoc.get(key).push(r);
  }

  const groups = [...byDoc.entries()].map(([key, members]) => ({
    key,
    lead: members[0],
    members,
    grouped: members.length,
    document: members[0].sources[0] || null
  })).sort((a, b) =>
    String(b.lead.announcedAt).localeCompare(String(a.lead.announcedAt)) ||
    MATERIALITY[b.lead.materiality].rank - MATERIALITY[a.lead.materiality].rank);

  return {
    groups,
    records: rows.length,
    disclosures: groups.length,
    combined: groups.filter(g => g.grouped > 1).length
  };
}

/** The featured signal: the most material of the newest day, confirmed only. */
export function featuredSignal() {
  const rows = newsSignals().filter(r => r.confidence === 'confirmed');
  return rows[0] || null;
}

/**
 * The finite set.
 *
 * "Everything on the latest date the record moved" — not "today", because the
 * record does not move every day and a page claiming eight signals today when
 * nothing happened would be inventing activity.
 */
export function dailySet() {
  const rows = newsSignals();
  if (!rows.length) return { at: null, rows: [], total: 0 };
  const at = rows[0].announcedAt;
  return { at, rows: rows.filter(r => r.announcedAt === at), total: rows.length };
}

/**
 * Source quality across the set.
 *
 * Counts the strongest document behind each signal, so a record supported by a
 * filing is not counted the same as one resting on a company page.
 */
export function sourceQuality() {
  const rows = newsSignals();
  const tally = new Map();
  for (const r of rows) {
    const t = r.bestSource;
    if (!t) continue;
    tally.set(t.id, { ...t, count: (tally.get(t.id)?.count || 0) + 1 });
  }
  return {
    rows: [...tally.values()].sort((a, b) => b.rank - a.rank || b.count - a.count),
    total: rows.length,
    /* Every record on file is confirmed against a primary document today. Stated
       as a computed fact rather than a claim, so it stops being true the moment
       a weaker record is added. */
    allPrimary: rows.every(r => r.confidence === 'confirmed')
  };
}

/**
 * Which companies a signal set touches, for watchlist impact.
 *
 * The server cannot know what a reader watches — that is local state — so it
 * ships per-company counts and the browser filters them. Nothing about the
 * reader leaves the device.
 */
export function companyImpact() {
  const rows = newsSignals();
  const byCompany = new Map();
  for (const r of rows) {
    if (!r.ticker) continue;
    const e = byCompany.get(r.ticker) || {
      ticker: r.ticker, name: r.companyName, slug: r.companySlug, count: 0, high: 0, latest: null
    };
    e.count++;
    if (r.materiality === 'high') e.high++;
    if (!e.latest || r.announcedAt > e.latest) e.latest = r.announcedAt;
    byCompany.set(r.ticker, e);
  }
  return [...byCompany.values()].sort((a, b) => b.count - a.count || a.ticker.localeCompare(b.ticker));
}

/**
 * Upcoming catalysts.
 *
 * Real dated events from the catalyst register, forward-looking only. A window
 * stays a window — "H2 2027" is never printed as a date, which is the same rule
 * the rest of the site follows.
 */
export function upcomingCatalysts(from, limit = 5) {
  const today = from || new Date().toISOString().slice(0, 10);
  return CATALYSTS
    .map(c => ({
      ...c,
      when: c.expectedAt || c.expectedWindowStart || null,
      isWindow: !c.expectedAt && !!c.expectedWindowStart,
      company: COMPANIES.find(x => x.id === c.companyId) || null
    }))
    .filter(c => c.when && c.when >= today)
    .sort((a, b) => String(a.when).localeCompare(String(b.when)))
    .slice(0, limit);
}

/** Filter options, derived from the set so no filter can return nothing. */
export function filterOptions() {
  const rows = newsSignals();
  const cats = availableCategories();
  return {
    categories: cats.map(c => ({ ...c, count: rows.filter(r => r.category === c.id).length }))
      .filter(c => c.count > 0),
    materialities: Object.values(MATERIALITY)
      .map(m => ({ ...m, count: rows.filter(r => r.materiality === m.id).length }))
      .filter(m => m.count > 0)
      .sort((a, b) => b.rank - a.rank),
    companies: companyImpact()
  };
}

export { CATEGORIES };
