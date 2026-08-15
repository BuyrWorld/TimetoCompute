/**
 * Derived figures. Nothing in here invents a number: every total is a sum over the
 * records in /data, and every total reports how much of itself is unverified so the
 * UI can say so.
 */
import { CONFIDENCE, METRICS, STAGES } from '../../data/schema.js';
import { COMPANIES } from '../../data/companies.js';
import { PROJECTS, PROJECTS_BY_COMPANY } from '../../data/projects.js';
import { EVENTS } from '../../data/events.js';

/** Find one measure on a company. Always returns a record, never undefined. */
export function getMeasure(company, metric) {
  return (
    company.measures.find(m => m.metric === metric) || {
      metric, value: null, unit: METRICS[metric]?.unit ?? 'MW',
      confidence: 'unknown', source: null, sourceRequired: false,
      effectiveDate: null, verifiedAt: null, note: null
    }
  );
}

export const isKnown = m => m && m.value !== null && m.value !== undefined;

/**
 * Sum one metric across companies.
 *
 * Unknown values are skipped, never coerced to 0 — so `total` is explicitly "the
 * total of what has been disclosed", and `missing` says how many companies are
 * absent from it. Presenting the total without `missing` would overstate coverage.
 */
export function totalFor(metric, companies = COMPANIES) {
  let total = 0, confirmedTotal = 0;
  const contributing = [], missing = [], unverified = [];

  for (const c of companies) {
    const m = getMeasure(c, metric);
    if (!isKnown(m)) { missing.push(c.ticker); continue; }
    total += m.value;
    contributing.push({ ticker: c.ticker, value: m.value, confidence: m.confidence });
    if (CONFIDENCE[m.confidence]?.countsAsVerified) confirmedTotal += m.value;
    else unverified.push(c.ticker);
  }

  return {
    metric,
    label: METRICS[metric].label,
    unit: METRICS[metric].unit,
    family: METRICS[metric].family,
    total,
    confirmedTotal,
    /** portion of the total backed by a linked primary document, 0–1 */
    verifiedShare: total > 0 ? confirmedTotal / total : 0,
    contributing, missing, unverified,
    disclosedCount: contributing.length,
    companyCount: companies.length
  };
}

/**
 * Delivery conversion: how much secured power has actually reached energised.
 * Returns null rather than 0 when either side is undisclosed — a company that has
 * published no active figure has an unknown conversion, not a 0% one.
 */
export function deliveryConversion(company) {
  const secured = getMeasure(company, 'securedPowerMw');
  const energised = getMeasure(company, 'energisedCriticalItMw');
  if (!isKnown(secured) || !isKnown(energised) || secured.value === 0) return null;
  return energised.value / secured.value;
}

/** The furthest stage a company has evidence for. */
export function currentStage(company) {
  let best = null;
  for (const s of STAGES) {
    if (!s.metric) continue;
    const m = getMeasure(company, s.metric);
    if (isKnown(m) && m.value > 0) best = s;
  }
  return best;
}

/** The next stage after the current one, for "what happens next" copy. */
export function nextStage(company) {
  const cur = currentStage(company);
  const idx = cur ? cur.order : -1;
  return STAGES.find(s => s.order > idx && s.metric) || null;
}

/** Company-level rollup used by both the capacity table and the company pages. */
export function companyView(company) {
  const measures = Object.fromEntries(
    Object.keys(METRICS).map(k => [k, getMeasure(company, k)])
  );
  const events = EVENTS
    .filter(e => e.companyId === company.id)
    .sort((a, b) => (b.effectiveDate || '').localeCompare(a.effectiveDate || ''));

  const sources = [];
  const seen = new Set();
  for (const m of company.measures) {
    if (m.source?.url && !seen.has(m.source.url)) { seen.add(m.source.url); sources.push(m.source); }
  }

  const verifiedDates = company.measures.map(m => m.verifiedAt).filter(Boolean).sort();

  return {
    company,
    measures,
    projects: PROJECTS_BY_COMPANY[company.id] || [],
    events,
    sources,
    conversion: deliveryConversion(company),
    stage: currentStage(company),
    next: nextStage(company),
    lastVerifiedAt: verifiedDates.length ? verifiedDates[verifiedDates.length - 1] : null,
    needsSource: company.measures.some(m => m.sourceRequired)
  };
}

/** Headline KPIs. Every one is a totalFor() over the same records. */
export function headlineKpis() {
  return [
    totalFor('securedPowerMw'),
    totalFor('customerContractedMw'),
    totalFor('energisedCriticalItMw'),
    totalFor('customerAcceptedMw')
  ];
}

/** Country rollup for the map/list panel. Undisclosed sites are counted, not summed. */
export function byCountry() {
  const acc = {};
  for (const p of PROJECTS) {
    const k = p.country;
    acc[k] ||= { country: k, flag: p.flag, mw: 0, projects: [], undisclosed: 0, byStage: {} };
    acc[k].projects.push(p);
    if (p.capacityMw === null) acc[k].undisclosed++;
    else {
      acc[k].mw += p.capacityMw;
      acc[k].byStage[p.stage] = (acc[k].byStage[p.stage] || 0) + p.capacityMw;
    }
  }
  const rows = Object.values(acc).sort((a, b) => b.mw - a.mw);
  const disclosedTotal = rows.reduce((a, r) => a + r.mw, 0);
  return { rows, disclosedTotal, undisclosedCount: PROJECTS.filter(p => p.capacityMw === null).length };
}

/** Ledger entries newest first, for the "Latest verified changes" panel. */
export function ledger(limit = null) {
  const sorted = [...EVENTS].sort((a, b) =>
    (b.effectiveDate || b.announcedDate || '').localeCompare(a.effectiveDate || a.announcedDate || '')
  );
  return limit ? sorted.slice(0, limit) : sorted;
}

/** Days early (negative) or late (positive) against a target. null when unknowable. */
export function slip(project) {
  const target = project.currentTarget || project.originalTarget;
  if (!target || !project.actual) return null;
  return Math.round((new Date(project.actual) - new Date(target)) / 86400000);
}
