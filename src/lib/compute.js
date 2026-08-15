/**
 * Derived figures.
 *
 * The central rule: an aggregate may only combine records that share a power basis
 * and are actual/minimum. Targets, pipeline and potential never enter a
 * current-capacity total, and an undisclosed value is excluded rather than zeroed.
 * Every aggregate reports its contributors and its exclusions so the coverage of a
 * number is visible at the same moment as the number.
 */
import { CONFIDENCE, METRICS, VALUE_STATUS, GATES, GATE_BY_ID } from '../../data/schema.js';
import { COMPANIES } from '../../data/companies.js';
import { PROJECTS, PROJECTS_BY_COMPANY } from '../../data/projects.js';
import { EVENTS } from '../../data/events.js';
import { CATALYSTS } from '../../data/catalysts.js';

export const isKnown = m => m && m.valueMw !== null && m.valueMw !== undefined;

/** All records for a metric on a company: current, plus targets and historical. */
export function allRecords(company) {
  return [...(company.measures || []), ...(company.targets || []), ...(company.historical || [])];
}

export function getMeasure(company, name) {
  return (company.measures || []).find(m => m.metric === name) || {
    metric: name, valueMw: null, unit: METRICS[name]?.unit ?? 'MW', family: METRICS[name]?.family,
    confidence: 'unknown', valueStatus: 'actual', powerBasis: 'not-applicable',
    asOf: null, verifiedAt: null, sourceIds: [], isExhaustive: false, notes: null, sourceRequired: false
  };
}

export const getTarget = (company, name) => (company.targets || []).find(m => m.metric === name) || null;

/**
 * Aggregate one metric across companies, restricted to a single power basis.
 *
 * Returns an explicit breakdown rather than a bare number: what is included, what
 * is excluded and why, and whether the result is exact or a floor. If any included
 * record is a disclosed minimum, the whole aggregate is a minimum.
 */
export function aggregate(name, { basis = null, companies = COMPANIES } = {}) {
  const included = [], excluded = [], missing = [];
  let total = 0, confirmedTotal = 0, anyMinimum = false, allExhaustive = true;
  const bases = new Set();

  for (const c of companies) {
    const m = getMeasure(c, name);

    if (!isKnown(m)) {
      missing.push({ ticker: c.ticker, name: c.name, reason: m.notes || 'Not disclosed' });
      continue;
    }
    if (!VALUE_STATUS[m.valueStatus].aggregatable) {
      excluded.push({ ticker: c.ticker, value: m.valueMw, reason: `${VALUE_STATUS[m.valueStatus].label} — not a current figure` });
      continue;
    }
    if (basis && m.powerBasis !== basis) {
      excluded.push({ ticker: c.ticker, value: m.valueMw, reason: `Measured as ${m.powerBasis}, not ${basis}` });
      continue;
    }

    bases.add(m.powerBasis);
    total += m.valueMw;
    if (CONFIDENCE[m.confidence].countsAsVerified) confirmedTotal += m.valueMw;
    if (m.valueStatus === 'minimum') anyMinimum = true;
    if (!m.isExhaustive) allExhaustive = false;
    included.push({
      ticker: c.ticker, name: c.name, slug: c.slug, value: m.valueMw,
      confidence: m.confidence, valueStatus: m.valueStatus, powerBasis: m.powerBasis,
      asOf: m.asOf, sourceIds: m.sourceIds
    });
  }

  if (bases.size > 1) {
    throw new Error(`aggregate(${name}) mixed power bases: ${[...bases].join(', ')}`);
  }

  const asOfDates = included.map(i => i.asOf).filter(Boolean).sort();
  return {
    metric: name,
    label: METRICS[name].label,
    unit: METRICS[name].unit,
    family: METRICS[name].family,
    basis: basis || [...bases][0] || null,
    total,
    confirmedTotal,
    /** true when the real figure may be higher than the total shown */
    isMinimum: anyMinimum || !allExhaustive,
    verifiedShare: total > 0 ? confirmedTotal / total : 0,
    included, excluded, missing,
    contributorCount: included.length,
    missingCount: missing.length,
    excludedCount: excluded.length,
    companyCount: companies.length,
    asOfEarliest: asOfDates[0] || null,
    asOfLatest: asOfDates[asOfDates.length - 1] || null,
    /** an aggregate with no contributors must not be printed as "0" */
    sufficient: included.length > 0
  };
}

/**
 * Headline KPIs. Each is basis-restricted so nothing incomparable is summed.
 * Secured power is deliberately reported on the gross-utility basis only, and the
 * UI states that it is supply control rather than delivered compute.
 */
export function headlineKpis() {
  return [
    aggregate('securedPowerMw', { basis: 'gross-utility' }),
    aggregate('customerContractedMw', { basis: 'critical-it' }),
    aggregate('energisedCriticalItMw', { basis: 'critical-it' }),
    aggregate('customerAcceptedMw', { basis: 'critical-it' })
  ];
}

/** Delivery conversion within one basis. null when either side is undisclosed. */
export function deliveryConversion(company) {
  const secured = getMeasure(company, 'securedPowerMw');
  const energised = getMeasure(company, 'energisedCriticalItMw');
  if (!isKnown(secured) || !isKnown(energised) || secured.valueMw === 0) return null;
  // Bases differ (gross vs critical IT), so this is a ratio across bases and the UI
  // must say so — it is a rough conversion indicator, not a like-for-like efficiency.
  return {
    ratio: energised.valueMw / secured.valueMw,
    crossBasis: secured.powerBasis !== energised.powerBasis,
    numeratorBasis: energised.powerBasis,
    denominatorBasis: secured.powerBasis
  };
}

/** Gate rollup for a project: how many are complete, and what is next. */
export function gateSummary(project) {
  const byId = Object.fromEntries((project.gates || []).map(g => [g.id, g]));
  const rows = GATES.map(def => byId[def.id] || { id: def.id, status: 'notDisclosed', sourceIds: [], confidence: 'unknown' });
  const complete = rows.filter(r => r.status === 'complete');
  const outstanding = rows.filter(r => r.status === 'inProgress' || r.status === 'conditional');
  const furthest = complete.length ? GATE_BY_ID[complete[complete.length - 1].id] : null;
  return {
    rows, complete, outstanding,
    completeCount: complete.length,
    trackedCount: rows.filter(r => r.status !== 'notDisclosed').length,
    furthest,
    next: GATES.find(g => (byId[g.id]?.status ?? 'notStarted') !== 'complete') || null
  };
}

/* ================= delivery schedule ================= */

const days = (a, b) => Math.round(
  (Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`)) / 86400000
);

/** All schedules for one gate, oldest first — this IS the target-change history. */
export function schedulesForGate(project, gateId) {
  return (project.schedules || [])
    .filter(s => s.gate === gateId)
    .sort((a, b) => String(a.announcedAt).localeCompare(String(b.announcedAt)));
}

/**
 * Compare what was promised against what happened.
 *
 * A guided window is not a date. When the actual lands inside the window the
 * company hit its guidance and the answer is "within the guided window" — not a
 * spurious "43 days early" measured against an arbitrary window edge. Only a
 * miss produces a number, measured from the edge that was missed.
 */
export function slip(project, gateId) {
  const history = schedulesForGate(project, gateId);
  if (!history.length) return null;

  const original = history[0];
  const current = history[history.length - 1];
  const g = (project.gates || []).find(x => x.id === gateId);
  const actual = g && g.status === 'complete' ? g.effectiveAt : null;

  // A target that moved between announcements is itself the finding.
  let targetMoved = null;
  if (history.length > 1) {
    const from = original.exact || original.end;
    const to = current.exact || current.end;
    if (from && to && from !== to) {
      targetMoved = { fromLabel: original.label, toLabel: current.label, days: days(from, to) };
    }
  }

  // A schedule naming a sub-unit (a building, a tranche) cannot be scored against
  // the project-level gate — the gate's actual belongs to a different sub-unit.
  if (current.scope) {
    return { original, current, actual: null, targetMoved, outcome: 'pending', days: null, scoped: true };
  }
  if (!actual) {
    return { original, current, actual: null, targetMoved, outcome: 'pending', days: null };
  }

  if (current.kind === 'exact') {
    const d = days(current.exact, actual);
    return {
      original, current, actual, targetMoved,
      outcome: d === 0 ? 'onTarget' : d > 0 ? 'late' : 'early', days: Math.abs(d)
    };
  }
  if (current.kind === 'window') {
    if (actual < current.start) return { original, current, actual, targetMoved, outcome: 'early', days: days(actual, current.start) };
    if (actual > current.end) return { original, current, actual, targetMoved, outcome: 'late', days: days(current.end, actual) };
    return { original, current, actual, targetMoved, outcome: 'withinWindow', days: null };
  }
  return { original, current, actual, targetMoved, outcome: 'pending', days: null };
}

/** Every scheduled milestone on a project, with its outcome. */
export function timeline(project) {
  const gateIds = [...new Set((project.schedules || []).map(s => s.gate))];
  return gateIds
    .map(id => ({ gate: id, ...slip(project, id) }))
    .sort((a, b) => (GATE_BY_ID[a.gate]?.order ?? 0) - (GATE_BY_ID[b.gate]?.order ?? 0));
}

/**
 * Portfolio-wide delivery performance. This is the number the whole product is
 * for — and it stays honest about how few completed milestones exist to measure.
 */
export function deliveryRecord() {
  const rows = [];
  for (const p of PROJECTS) {
    for (const t of timeline(p)) {
      if (t.outcome === 'pending') continue;
      rows.push({ project: p.id, projectName: p.name, companyId: p.companyId, ...t });
    }
  }
  const scheduled = PROJECTS.flatMap(p => (p.schedules || []).map(s => ({ project: p.id, ...s })));
  return {
    completed: rows,
    completedCount: rows.length,
    scheduledCount: scheduled.length,
    pendingCount: scheduled.length - rows.length,
    onTimeOrEarly: rows.filter(r => r.outcome !== 'late').length,
    late: rows.filter(r => r.outcome === 'late').length,
    /** A hit rate on fewer than three outcomes is noise, so it is withheld. */
    sufficient: rows.length >= 3,
    minimumSample: 3,
    projectsWithSchedule: PROJECTS.filter(p => (p.schedules || []).length).length,
    projectsTotal: PROJECTS.length
  };
}

/**
 * Furthest delivery stage a company has evidence for.
 *
 * Derived from two independent kinds of evidence: a completed project gate, or a
 * company-wide metric with a value. Using gates alone would under-report a company
 * that discloses fleet-wide rather than per site; using metrics alone would miss a
 * site that has passed a gate without a published megawatt figure.
 */
/** The metric that independently demonstrates a gate, where one exists. */
const METRIC_FOR_GATE = {
  utilityAgreement: 'securedPowerMw',
  constructionStarted: 'constructionMw',
  criticalItEnergised: 'energisedCriticalItMw',
  customerContracted: 'customerContractedMw',
  customerAccepted: 'customerAcceptedMw',
  revenueCommenced: 'revenueLiveMw'
};

/** Short, plain-English labels for the stages a reader actually cares about. */
const STAGE_SHORT = {
  utilityAgreement: 'Power secured',
  zoning: 'Permitted',
  constructionStarted: 'Building',
  utilityEnergised: 'Grid live',
  criticalItEnergised: 'Switched on',
  customerContracted: 'Customer signed',
  customerAccepted: 'Accepted',
  revenueCommenced: 'Invoicing'
};

export function currentStage(company, projects = PROJECTS_BY_COMPANY[company.id] || []) {
  const done = new Set(
    projects.flatMap(p => (p.gates || []).filter(g => g.status === 'complete').map(g => g.id))
  );
  let best = null;
  for (const g of GATES) {
    const metric = METRIC_FOR_GATE[g.id];
    const m = metric ? getMeasure(company, metric) : null;
    const byMetric = m && isKnown(m) && m.valueMw > 0;
    if (byMetric || done.has(g.id)) {
      best = { id: g.id, order: g.order, label: g.label, short: STAGE_SHORT[g.id] || g.label };
    }
  }
  return best;
}

export function nextStage(company) {
  const cur = currentStage(company);
  const idx = cur ? cur.order : -1;
  const g = GATES.find(x => x.order > idx && STAGE_SHORT[x.id]);
  return g ? { id: g.id, order: g.order, label: g.label, short: STAGE_SHORT[g.id] } : null;
}

/** Company rollup used by the capacity table and company pages. */
export function companyView(company) {
  const measures = Object.fromEntries(Object.keys(METRICS).map(k => [k, getMeasure(company, k)]));
  const events = EVENTS.filter(e => e.companyId === company.id)
    .sort((a, b) => (b.announcedAt || '').localeCompare(a.announcedAt || ''));
  const projects = PROJECTS_BY_COMPANY[company.id] || [];

  const sourceIds = new Set();
  for (const m of allRecords(company)) for (const id of m.sourceIds || []) sourceIds.add(id);
  for (const p of projects) for (const id of p.sourceIds || []) sourceIds.add(id);

  const verified = allRecords(company).map(m => m.verifiedAt).filter(Boolean).sort();

  return {
    company, measures, projects, events,
    targets: company.targets || [],
    historical: company.historical || [],
    sourceIds: [...sourceIds],
    stage: currentStage(company),
    next: nextStage(company),
    conversion: deliveryConversion(company),
    catalysts: CATALYSTS.filter(c => c.companyId === company.id),
    lastVerifiedAt: verified.length ? verified[verified.length - 1] : null,
    needsSource: allRecords(company).some(m => m.sourceRequired)
  };
}

/**
 * Country rollup, split by power basis and stage so incompatible measures are
 * never added. Each column is its own total.
 */
export function byCountry() {
  const acc = {};
  for (const p of PROJECTS) {
    const k = p.country;
    acc[k] ||= {
      country: k, flag: p.flag, projects: [],
      grossUtility: 0, criticalIt: 0, energised: 0, construction: 0, plannedPotential: 0,
      unspecified: 0, undisclosedCount: 0
    };
    const row = acc[k];
    row.projects.push(p);

    if (p.capacityMw === null) { row.undisclosedCount++; continue; }

    const planned = p.valueStatus === 'target' || p.valueStatus === 'pipeline' || p.valueStatus === 'potential';
    if (planned) { row.plannedPotential += p.capacityMw; continue; }

    if (p.powerBasis === 'gross-utility') row.grossUtility += p.capacityMw;
    else if (p.powerBasis === 'critical-it') row.criticalIt += p.capacityMw;
    else row.unspecified += p.capacityMw;

    const gs = gateSummary(p);
    const energised = gs.rows.find(r => r.id === 'criticalItEnergised');
    const building = gs.rows.find(r => r.id === 'constructionStarted');
    if (energised?.status === 'complete') row.energised += p.capacityMw;
    else if (building?.status === 'complete' || building?.status === 'inProgress') row.construction += p.capacityMw;
  }
  const rows = Object.values(acc).sort((a, b) => (b.grossUtility + b.criticalIt) - (a.grossUtility + a.criticalIt));
  return {
    rows,
    totals: rows.reduce((t, r) => ({
      grossUtility: t.grossUtility + r.grossUtility,
      criticalIt: t.criticalIt + r.criticalIt,
      energised: t.energised + r.energised,
      construction: t.construction + r.construction,
      plannedPotential: t.plannedPotential + r.plannedPotential,
      unspecified: t.unspecified + r.unspecified
    }), { grossUtility: 0, criticalIt: 0, energised: 0, construction: 0, plannedPotential: 0, unspecified: 0 }),
    undisclosedCount: PROJECTS.filter(p => p.capacityMw === null).length
  };
}

/** Ledger, newest first, with optional filters. */
export function ledger({ companyId = null, eventType = null, confidence = null, since = null, limit = null } = {}) {
  let rows = [...EVENTS].sort((a, b) =>
    (b.announcedAt || '').localeCompare(a.announcedAt || ''));
  if (companyId) rows = rows.filter(e => e.companyId === companyId);
  if (eventType) rows = rows.filter(e => e.eventType === eventType);
  if (confidence) rows = rows.filter(e => e.confidence === confidence);
  if (since) rows = rows.filter(e => (e.announcedAt || '') >= since);
  return limit ? rows.slice(0, limit) : rows;
}

/** Data-health snapshot for the trust panel. */
export function dataHealth() {
  const all = COMPANIES.flatMap(allRecords);
  const known = all.filter(isKnown);
  return {
    totalRecords: all.length,
    knownRecords: known.length,
    confirmed: known.filter(m => m.confidence === 'confirmed').length,
    reported: known.filter(m => m.confidence === 'reported').length,
    estimated: known.filter(m => m.confidence === 'estimated').length,
    notDisclosed: all.length - known.length,
    unsourced: known.filter(m => m.sourceRequired).length,
    unverified: known.filter(m => !m.verifiedAt).length,
    projects: PROJECTS.length,
    gatesEvidenced: PROJECTS.flatMap(p => p.gates || []).filter(g => g.sourceIds?.length).length,
    events: EVENTS.length,
    catalysts: CATALYSTS.length
  };
}

/* ================= homepage briefing ================= */

/**
 * The four things an ordinary visitor should learn in ten seconds. Every card is
 * derived from the records — nothing here is written by hand — and any card whose
 * data does not exist returns `available: false` so the UI can say so plainly.
 */
export function briefing({ now = new Date() } = {}) {
  const cards = [];

  // 1. Latest major delivery — the most recent high-significance delivery event.
  const delivery = ledger({})
    .filter(e => ['customer-accepted', 'revenue-commenced', 'capacity-change'].includes(e.eventType))
    .filter(e => e.significance === 'high')[0];
  if (delivery) {
    const c = COMPANIES.find(x => x.id === delivery.companyId);
    cards.push({
      id: 'delivery', kicker: 'Latest major delivery', available: true,
      company: c?.name, ticker: c?.ticker, slug: c?.slug,
      figure: delivery.newValue !== null && delivery.newValue !== undefined
        ? (delivery.unit === '$bn' ? `$${delivery.newValue}bn` : `${delivery.newValue} MW`) : null,
      sentence: delivery.summary,
      dateLabel: delivery.effectiveAt || delivery.announcedAt,
      sourceIds: delivery.sourceIds,
      actionLabel: 'See the ledger', actionHref: '#research'
    });
  } else cards.push({ id: 'delivery', kicker: 'Latest major delivery', available: false });

  // 2. Next catalyst — soonest dated event still ahead of us.
  const today = now.toISOString().slice(0, 10);
  const upcoming = CATALYSTS
    .filter(c => c.status !== 'completed' && c.status !== 'cancelled')
    .map(c => ({ c, when: c.expectedAt || c.expectedWindowStart }))
    .filter(x => x.when && x.when >= today)
    .sort((a, b) => a.when.localeCompare(b.when))[0];
  if (upcoming) {
    const co = COMPANIES.find(x => x.id === upcoming.c.companyId);
    cards.push({
      id: 'catalyst', kicker: 'Next tracked catalyst', available: true,
      company: co?.name, ticker: upcoming.c.ticker, slug: co?.slug,
      figure: null,
      sentence: upcoming.c.title,
      dateLabel: upcoming.when,
      isWindow: !upcoming.c.expectedAt,
      sourceIds: upcoming.c.sourceIds,
      actionLabel: 'See all catalysts', actionHref: '#catalysts'
    });
  } else cards.push({ id: 'catalyst', kicker: 'Next tracked catalyst', available: false });

  // 3. Analyst upside — genuinely unavailable on the current data plan.
  cards.push({
    id: 'analyst', kicker: 'Highest median analyst upside', available: false,
    unavailableReason:
      'Analyst price targets are not available on the connected data plan, so no upside ranking is shown. ' +
      'T2C does not publish an unattributed target.',
    actionLabel: 'How analyst data works', actionHref: '/methodology/#analysts'
  });

  // 4. Largest confirmed operational footprint, on a single comparable basis.
  const energised = aggregate('energisedCriticalItMw', { basis: 'critical-it' });
  const top = [...energised.included].sort((a, b) => b.value - a.value)[0];
  if (top) {
    const c = COMPANIES.find(x => x.ticker === top.ticker);
    cards.push({
      id: 'footprint', kicker: 'Largest confirmed operating capacity', available: true,
      company: c?.name, ticker: top.ticker, slug: c?.slug,
      figure: top.value >= 1000 ? `${(top.value / 1000).toFixed(1)} GW` : `${top.value} MW`,
      sentence:
        `Data-centre capacity switched on and drawing power, measured as critical IT load. ` +
        `${energised.contributorCount} of ${energised.companyCount} tracked companies disclose this on a comparable basis.`,
      dateLabel: top.asOf,
      sourceIds: top.sourceIds,
      actionLabel: 'Compare companies', actionHref: '#compare'
    });
  } else cards.push({ id: 'footprint', kicker: 'Largest confirmed operating capacity', available: false });

  return cards;
}

/** One readable snapshot per tracked company, for the homepage cards. */
export function companySnapshots() {
  return COMPANIES.map(c => {
    const v = companyView(c);
    const energised = getMeasure(c, 'energisedCriticalItMw');
    const contracted = getMeasure(c, 'customerContractedMw');
    const next = v.catalysts
      .filter(x => x.status !== 'completed')
      .sort((a, b) => String(a.expectedAt || a.expectedWindowStart || '')
        .localeCompare(String(b.expectedAt || b.expectedWindowStart || '')))[0] || null;
    const records = allRecords(c);
    const known = records.filter(isKnown);
    return {
      company: c,
      stage: v.stage,
      energised,
      contracted,
      nextCatalyst: next,
      evidence: {
        confirmed: known.filter(m => m.confidence === 'confirmed').length,
        total: known.length,
        notDisclosed: records.length - known.length,
        lastVerifiedAt: v.lastVerifiedAt
      }
    };
  });
}
