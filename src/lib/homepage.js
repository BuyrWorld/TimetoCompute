/**
 * Homepage derivations.
 *
 * Each function answers one of the questions the homepage is built around, and
 * each is deterministic: same records in, same homepage out. Where the data
 * cannot answer honestly the function returns null and the page renders a
 * designed empty state rather than inventing content.
 */
import { METRICS, POWER_BASIS, VALUE_STATUS } from '../../data/schema.js';
import { COMPANIES } from '../../data/companies.js';
import { CATALYSTS } from '../../data/catalysts.js';
import { companyPath, allSites, furthestStage } from './sites.js';
import { signals } from './signals.js';
import { getMeasure, isKnown } from './compute.js';
import { date, windowLabel } from './format.js';

/**
 * Who is delivering.
 *
 * Ranked by how many of the seven delivery stages a company has evidenced —
 * never by announced capacity, market value or share price. Ties break on the
 * earliest evidenced date for the furthest stage (getting there sooner ranks
 * higher), then on ticker, so the order is stable and explicable.
 */
export function deliveryLeaders(limit = 3) {
  const rows = COMPANIES.map(c => {
    const path = companyPath(c.id);
    // The rank is the FURTHEST stage reached, not how many were reached. A
    // company that has billed somewhere is further along than one that has
    // completed four early stages and nothing since — and the two are not the
    // same measurement, so the rail draws which stages are complete rather than
    // filling a bar to a count.
    const furthestIndex = path.reduce((acc, s, i) => (s.status === 'complete' ? i : acc), -1);
    const furthest = furthestIndex > -1 ? path[furthestIndex] : null;
    return {
      id: c.id, ticker: c.ticker, name: c.name, slug: c.slug,
      stages: path.map(s => s.status === 'complete'),
      furthestIndex,
      position: furthestIndex + 1,
      completeCount: path.filter(s => s.status === 'complete').length,
      stageLabel: furthest ? furthest.label : 'No stage evidenced',
      since: furthest && furthest.effectiveAt ? furthest.effectiveAt : null
    };
  });

  rows.sort((a, b) =>
    b.furthestIndex - a.furthestIndex ||
    b.completeCount - a.completeCount ||
    String(a.since || '9999').localeCompare(String(b.since || '9999')) ||
    a.ticker.localeCompare(b.ticker));

  return rows.slice(0, limit);
}

/**
 * The next dated catalyst across the tracked set.
 *
 * A guided window keeps its window. Nothing here converts a period a company
 * named into a day it did not.
 */
export function nextCatalyst({ now = new Date() } = {}) {
  const today = now.toISOString().slice(0, 10);
  const co = id => COMPANIES.find(c => c.id === id);

  const dated = CATALYSTS
    .map(c => {
      const company = co(c.companyId);
      if (c.status === 'confirmed-date' && c.expectedAt && c.expectedAt >= today) {
        return {
          id: c.id, ticker: company?.ticker || c.companyId, title: c.title,
          certainty: 'exact', when: date(c.expectedAt), sortKey: c.expectedAt,
          slug: company?.slug || null
        };
      }
      if (c.expectedWindowStart && c.expectedWindowEnd && c.expectedWindowEnd >= today) {
        return {
          id: c.id, ticker: company?.ticker || c.companyId, title: c.title,
          certainty: 'guided_window',
          when: windowLabel(c.expectedWindowStart, c.expectedWindowEnd),
          sortKey: c.expectedWindowStart, slug: company?.slug || null
        };
      }
      return null;
    })
    .filter(Boolean)
    // Exact dates outrank windows starting on the same day: one is a commitment
    // and the other is a period.
    .sort((a, b) =>
      String(a.sortKey).localeCompare(String(b.sortKey)) ||
      (a.certainty === 'exact' ? -1 : 1));

  return dated[0] || null;
}

const measureView = (m, label) => ({
  value: m.valueMw,
  unit: 'MW',
  basis: m.powerBasis,
  basisLabel: POWER_BASIS[m.powerBasis]?.label || 'Basis not stated',
  qualifier: m.valueStatus,
  qualifierLabel: VALUE_STATUS[m.valueStatus]?.label || 'Not stated',
  asOf: m.asOf,
  metricLabel: label,
  sourceIds: m.sourceIds || []
});

/**
 * Promise versus reality, for one company.
 *
 * THE GUARDRAIL: these two figures are shown side by side and are never
 * subtracted, divided or turned into a percentage. They are different
 * quantities — an announced or secured figure measured at the utility
 * connection, against delivered capacity measured as critical IT in the hall —
 * at different evidence stages. `comparable` is true only when unit, basis and
 * qualifier all match, and nothing in the UI computes across the pair either way.
 */
export function promiseReality(companyId) {
  const c = COMPANIES.find(x => x.id === companyId);
  if (!c) return null;

  // The promise: the largest forward-looking or supply-side figure published.
  const promiseCandidates = ['securedPowerMw', 'pipelinePowerMw']
    .map(k => ({ k, m: getMeasure(c, k) }))
    .filter(x => isKnown(x.m));
  const targets = (c.targets || []).filter(m => m.valueMw !== null);

  const promiseSrc = promiseCandidates.length
    ? promiseCandidates.sort((a, b) => b.m.valueMw - a.m.valueMw)[0]
    : null;
  const promise = promiseSrc
    ? measureView(promiseSrc.m, METRICS[promiseSrc.k].label)
    : targets.length
      ? measureView(targets[0], `${METRICS[targets[0].metric].label} target`)
      : null;

  // The reality: the furthest-along figure with an actual value.
  const realitySrc = ['revenueLiveMw', 'customerAcceptedMw', 'energisedCriticalItMw']
    .map(k => ({ k, m: getMeasure(c, k) }))
    .find(x => isKnown(x.m));
  const reality = realitySrc ? measureView(realitySrc.m, METRICS[realitySrc.k].label) : null;

  if (!promise || !reality) return null;

  const comparable = promise.unit === reality.unit
    && promise.basis === reality.basis
    && promise.qualifier === reality.qualifier;

  return {
    companyId, ticker: c.ticker, slug: c.slug,
    promise, reality, comparable,
    caveat: comparable
      ? 'These figures share a measurement basis and qualifier, but remain different evidence stages ' +
        'and are shown side by side rather than subtracted.'
      : 'Different evidence stages or measurement bases. These figures are shown side by side and are not subtracted.'
  };
}

/**
 * Megaprojects to watch.
 *
 * Deterministic: sites carrying the most recently dated verified change first,
 * then the furthest evidenced, then by name. No editorial hand-picking.
 */
export function megaprojects(limit = 3) {
  const latestBySite = new Map();
  for (const s of signals({})) {
    if (!s.projectId) continue;
    const prev = latestBySite.get(s.projectId);
    if (!prev || s.announcedAt > prev) latestBySite.set(s.projectId, s.announcedAt);
  }

  return allSites()
    .map(site => ({ site, lastChange: latestBySite.get(site.slug) || null }))
    .sort((a, b) =>
      String(b.lastChange || '').localeCompare(String(a.lastChange || '')) ||
      b.site.gateSummary.completeCount - a.site.gateSummary.completeCount ||
      a.site.name.localeCompare(b.site.name))
    .slice(0, limit)
    .map(x => x.site);
}

/**
 * Which illustration a project card gets.
 *
 * Chosen from the stage category, never from any claim that the picture shows
 * the site. A site with nothing evidenced gets the context image rather than one
 * implying construction or operation.
 */
export function imageForSite(site) {
  const stage = furthestStage(site);
  if (!stage) return 'project-power-community';
  if (['billing', 'acceptance', 'contracted', 'energised'].includes(stage.id)) {
    return 'project-operational-campus';
  }
  if (['construction', 'power'].includes(stage.id)) return 'project-construction-campus';
  return 'project-power-community';
}

/** The five explainer steps, in the copy deck's wording. */
export const EXPLAINER_STEPS = [
  'Electricity reaches the site.',
  'Cooling and power systems support the computing equipment.',
  'Servers run customer workloads.',
  'The customer tests and accepts the contracted deployment.',
  'Revenue begins when the contract\'s billing conditions are met and disclosed.'
];
