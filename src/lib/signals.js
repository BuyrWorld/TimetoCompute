/**
 * Signals — the delivery ledger, classified for reading.
 *
 * The ledger records what changed; a signal says what KIND of change it was, so a
 * reader can filter to the ones they care about. Classification is derived from
 * the event's own type and values. Nothing is scored, ranked or editorialised
 * here, and no category is ever inferred from wording.
 *
 * Two distinctions the categories exist to protect:
 *
 *   - A raised target is not delivery. Nebius lifting a year-end ambition from
 *     3.5 GW to 5 GW is `outlook`, never `advanced` — no megawatt moved.
 *   - A later date is a slip; a smaller portfolio is a reduction. They are
 *     different failures and are never pooled.
 */
import { EVENTS } from '../../data/events.js';
import { EVENT_TYPES, METRICS } from '../../data/schema.js';
import { COMPANIES } from '../../data/companies.js';
import { PROJECTS } from '../../data/projects.js';

const COMPANY_BY_ID = Object.fromEntries(COMPANIES.map(c => [c.id, c]));
const PROJECT_BY_ID = Object.fromEntries(PROJECTS.map(p => [p.id, p]));

export const CATEGORIES = [
  {
    id: 'advanced', label: 'Advanced', short: 'advanced', tone: 'ok', glyph: '↗',
    definition: 'Evidenced delivery moved forward — a gate passed, capacity energised, accepted or billing.'
  },
  {
    id: 'contract', label: 'New contract', short: 'contract', tone: 'ok', glyph: '§',
    definition: 'A customer commitment was signed or expanded.'
  },
  {
    id: 'slipped', label: 'Slipped', short: 'slipped', tone: 'bad', glyph: '↘',
    definition: 'A delivery date moved later, or a delay was disclosed.'
  },
  {
    id: 'outlook', label: 'Outlook', short: 'outlook', tone: 'warn', glyph: '◇',
    definition: 'A management target changed. Guidance about the future, not capacity delivered.'
  },
  {
    id: 'reduced', label: 'Reduced', short: 'reduced', tone: 'bad', glyph: '−',
    definition: 'Capacity left the portfolio through disposal or a downward revision.'
  },
  {
    id: 'evidence', label: 'Evidence', short: 'evidence', tone: 'unknown', glyph: '◐',
    definition: 'A new disclosure or a correction to something previously published here.'
  }
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const rose = e =>
  typeof e.previousValue === 'number' && typeof e.newValue === 'number' && e.newValue > e.previousValue;
const fell = e =>
  typeof e.previousValue === 'number' && typeof e.newValue === 'number' && e.newValue < e.previousValue;

/**
 * One event, one category. Returns `evidence` for anything the rules do not
 * recognise — an unclassified event still has to be readable, and silently
 * dropping it would hide a disclosure.
 */
export function classify(event) {
  switch (event.eventType) {
    case 'contract-signed':
      return 'contract';
    case 'delay':
      return 'slipped';
    case 'disposal':
      return 'reduced';
    case 'stage-change':
    case 'customer-accepted':
    case 'revenue-commenced':
      return 'advanced';
    case 'capacity-change':
      return fell(event) ? 'reduced' : 'advanced';
    case 'target-change':
      return 'outlook';
    case 'new-disclosure':
    case 'correction':
      return 'evidence';
    default:
      return 'evidence';
  }
}

/** Direction, where the numbers support one. Never guessed from the summary. */
export function direction(event) {
  if (rose(event)) return 'up';
  if (fell(event)) return 'down';
  return null;
}

/** A signal is a ledger event plus what a reader needs to place and open it. */
export function toSignal(event) {
  const category = classify(event);
  const company = COMPANY_BY_ID[event.companyId] || null;
  const project = event.projectId ? PROJECT_BY_ID[event.projectId] || null : null;
  return {
    id: event.id,
    category,
    categoryLabel: CATEGORY_BY_ID[category].label,
    tone: CATEGORY_BY_ID[category].tone,
    glyph: CATEGORY_BY_ID[category].glyph,
    eventType: event.eventType,
    eventTypeLabel: EVENT_TYPES[event.eventType]?.label || event.eventType,
    direction: direction(event),
    companyId: event.companyId,
    companyName: company?.name || event.companyId,
    ticker: company?.ticker || null,
    companySlug: company?.slug || null,
    projectId: event.projectId || null,
    projectName: project?.name || null,
    announcedAt: event.announcedAt,
    effectiveAt: event.effectiveAt || null,
    previousValue: event.previousValue ?? null,
    newValue: event.newValue ?? null,
    unit: event.unit || null,
    metric: event.metric || null,
    metricLabel: event.metric ? (METRICS[event.metric]?.label || null) : null,
    confidence: event.confidence,
    significance: event.significance,
    summary: event.summary,
    implication: event.implication || null,
    sourceIds: event.sourceIds || []
  };
}

/**
 * The signal set, newest first.
 *
 * `since` is exclusive of nothing and inclusive of the date given — a reader
 * returning on the day of an announcement should still see it.
 */
export function signals({ since = null, category = null, companyId = null, limit = null } = {}) {
  let rows = EVENTS.map(toSignal);
  if (category) rows = rows.filter(s => s.category === category);
  if (companyId) rows = rows.filter(s => s.companyId === companyId);
  if (since) rows = rows.filter(s => String(s.announcedAt) >= String(since).slice(0, 10));
  rows.sort((a, b) =>
    String(b.announcedAt).localeCompare(String(a.announcedAt)) || String(a.id).localeCompare(String(b.id)));
  return limit ? rows.slice(0, limit) : rows;
}

/**
 * Category counts, used by "since last visit" and by the filter chips.
 * Categories with no matching record are omitted — an option that matches
 * nothing is a dead end the reader has to discover by selecting it.
 */
export function countsByCategory({ since = null } = {}) {
  const rows = signals({ since });
  return CATEGORIES
    .map(c => ({ ...c, count: rows.filter(s => s.category === c.id).length }))
    .filter(c => c.count > 0);
}

/** Every category that matches at least one record overall, for the filter UI. */
export const availableCategories = () => countsByCategory({});

/** The most recent announcement date on record — the ledger's own "today". */
export function latestAnnouncement() {
  const rows = signals({});
  return rows.length ? rows[0].announcedAt : null;
}

/**
 * The finite daily set. The brief forbids an endless feed, so the day's signals
 * are exactly the events announced on the most recent date the ledger carries —
 * a real, closed set, not the first N of an infinite scroll.
 */
export function todaySet() {
  const at = latestAnnouncement();
  if (!at) return { at: null, signals: [] };
  return { at, signals: signals({}).filter(s => s.announcedAt === at) };
}
