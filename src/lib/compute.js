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
