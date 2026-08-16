/**
 * Supplier Passport.
 *
 * What a company supplies, where it sits in the chain, how far its commerce has
 * actually got, and what could break the thesis — in under ten seconds.
 *
 * THE RADAR RULE. The brief allows a radar chart only if its dimensions are real
 * and its scoring is explained. Every axis below is therefore derived from
 * something already published and already tested: four come straight from the
 * Reality Score's factors, and the fifth from disclosed contracts. Each carries
 * the sentence that describes how it was computed, and any axis that cannot be
 * computed is drawn as absent rather than as zero — a zero on a radar reads as
 * "bad", and "not disclosed" is not bad.
 */
import { COMPANIES } from '../../data/companies.js';
import { PROJECTS_BY_COMPANY, CONTRACTS_BY_COMPANY, COUNTRY_NAMES } from '../../data/projects.js';
import { realityScore } from './score.js';
import { companyPath } from './sites.js';
import { signals } from './signals.js';
import { STAGES } from './chain.js';
import { getMeasure, isKnown } from './compute.js';

/**
 * Where the company sits in the seven-stage chain.
 *
 * Every tracked company is an AI-factory operator; none supplies materials,
 * wafers, chips or photonics. That is stated rather than implied by a blank.
 */
export function chainPosition(company) {
  const path = companyPath(company.id);
  const furthestIndex = path.reduce((acc, s, i) => (s.status === 'complete' ? i : acc), -1);
  const furthest = furthestIndex > -1 ? path[furthestIndex] : null;

  return {
    stage: STAGES.find(s => s.id === 'factory'),
    label: 'AI factory',
    plain: `${company.name} builds and operates the data centres themselves. T2C holds no record of ` +
      'it supplying materials, wafers, chips or photonics.',
    furthest: furthest ? furthest.label : null,
    furthestIndex,
    path
  };
}

/**
 * Commercial momentum: the furthest gate this company has reached anywhere, said
 * as a state rather than a score.
 */
export function commercialMomentum(company) {
  const path = companyPath(company.id);
  const reached = id => path.find(s => s.id === id)?.status === 'complete';

  if (reached('billing')) return { label: 'Billing', tone: 'ok', plain: 'Has disclosed capacity that is billing.' };
  if (reached('acceptance')) return { label: 'Customer accepted', tone: 'ok', plain: 'Has capacity a customer has formally accepted.' };
  if (reached('contracted')) return { label: 'Contracted', tone: 'warn', plain: 'Has signed customers, with delivery still ahead.' };
  if (reached('energised')) return { label: 'Energised', tone: 'warn', plain: 'Has capacity switched on, with no customer disclosed against it.' };
  if (reached('construction')) return { label: 'Building', tone: 'warn', plain: 'Has construction under way.' };
  if (reached('power')) return { label: 'Power secured', tone: 'warn', plain: 'Has secured power, with construction not evidenced.' };
  return { label: 'Announced', tone: 'dim', plain: 'Has announced projects with no later gate evidenced.' };
}

/**
 * Customer concentration.
 *
 * Computed only from contracts that disclose megawatts. Where a company
 * discloses value but not megawatts, that contract is excluded and the count of
 * exclusions is reported — a concentration figure over a partial denominator is
 * worse than none.
 */
export function customerConcentration(company) {
  const all = CONTRACTS_BY_COMPANY[company.id] || [];
  const sized = all.filter(c => typeof c.mw === 'number' && c.mw > 0);
  if (!sized.length) {
    return {
      available: false,
      reason: all.length
        ? `${all.length} disclosed contract${all.length === 1 ? '' : 's'}, none stating megawatts.`
        : 'No contract discloses megawatts.',
      customers: all.length
    };
  }

  const byCustomer = new Map();
  for (const c of sized) byCustomer.set(c.customer, (byCustomer.get(c.customer) || 0) + c.mw);
  const totals = [...byCustomer.entries()].sort((a, b) => b[1] - a[1]);
  const total = totals.reduce((a, [, mw]) => a + mw, 0);

  return {
    available: true,
    customers: byCustomer.size,
    totalMw: total,
    largest: { name: totals[0][0], mw: totals[0][1], share: totals[0][1] / total },
    excluded: all.length - sized.length,
    rows: totals.map(([name, mw]) => ({ name, mw, share: mw / total }))
  };
}

/** Sites by country — real exposure, counted, never mapped onto coordinates T2C lacks. */
export function geographicExposure(company) {
  const owned = PROJECTS_BY_COMPANY[company.id] || [];
  const byCountry = new Map();
  for (const p of owned) byCountry.set(p.country, (byCountry.get(p.country) || 0) + 1);
  const rows = [...byCountry.entries()]
    .map(([code, count]) => ({
      code, country: COUNTRY_NAMES[code] || code, count, share: count / owned.length
    }))
    .sort((a, b) => b.count - a.count);
  return { total: owned.length, countries: rows.length, rows };
}

/**
 * The radar.
 *
 * Five axes, each 0–1, each derived and each explained. An axis that cannot be
 * computed is `available: false` and is drawn as a gap in the shape, never as a
 * zero — the difference between "scored badly" and "nothing published" is the
 * whole point.
 */
export function bottleneckRadar(company) {
  const score = realityScore(company);
  const conc = customerConcentration(company);
  const factor = id => score.factors.find(f => f.id === id);

  const axes = [
    {
      id: 'promise', label: 'Promise delivery',
      ...pick(factor('promise')),
      how: 'Share of guided milestones this company both reached and landed on target, early, or inside the guided window.'
    },
    {
      id: 'evidence', label: 'Evidence quality',
      ...pick(factor('evidence')),
      how: 'Share of published figures and passed gates resting on a primary document rather than a second-hand report.'
    },
    {
      id: 'timeline', label: 'Timeline stability',
      ...pick(factor('timeline')),
      how: 'Share of guided milestones whose target has not moved since it was first announced.'
    },
    {
      id: 'financing', label: 'Financing',
      ...pick(factor('financing')),
      how: 'Whether capital is committed across tracked projects. Most operators do not disclose this per project.'
    },
    {
      id: 'diversity', label: 'Customer diversity',
      value: conc.available ? 1 - conc.largest.share : null,
      available: conc.available,
      detail: conc.available
        ? `${conc.customers} customer${conc.customers === 1 ? '' : 's'}; largest holds ${Math.round(conc.largest.share * 100)}%`
        : null,
      reason: conc.available ? null : conc.reason,
      how: 'One minus the share of disclosed contracted megawatts held by the single largest customer. ' +
        'A company with one customer scores zero; concentration is a risk, not a failing.'
    }
  ];

  return {
    axes,
    available: axes.filter(a => a.available).length,
    total: axes.length
  };
}

const pick = f => ({
  value: f && f.available ? f.value : null,
  available: !!(f && f.available),
  detail: f && f.available ? f.detail : null,
  reason: f && !f.available ? f.reason : null
});

/**
 * What could break the thesis.
 *
 * Assembled from records rather than opinion: an unresolved gate, a
 * concentration figure, a missing disclosure. Each names what it rests on.
 */
export function thesisRisks(company) {
  const risks = [];
  const conc = customerConcentration(company);
  const path = companyPath(company.id);

  if (conc.available && conc.largest.share >= 0.5) {
    risks.push(`${Math.round(conc.largest.share * 100)}% of disclosed contracted capacity sits with ` +
      `${conc.largest.name}.`);
  }
  if (conc.excluded) {
    risks.push(conc.excluded === 1
      ? '1 disclosed contract states no megawatts, so concentration is measured over part of the book.'
      : `${conc.excluded} disclosed contracts state no megawatts, so concentration is measured over ` +
        'part of the book.');
  }
  if (!isKnown(getMeasure(company, 'revenueLiveMw'))) {
    risks.push('No billing capacity is disclosed, so revenue timing cannot be evidenced.');
  }
  const undisclosed = path.filter(s => s.status === 'notDisclosed').map(s => s.label);
  if (undisclosed.length) {
    risks.push(undisclosed.length === 1
      ? `1 of seven delivery stages carries no disclosure: ${undisclosed[0]}.`
      : `${undisclosed.length} of seven delivery stages carry no disclosure: ${undisclosed.join(', ')}.`);
  }
  const score = realityScore(company);
  if (!score.available) {
    risks.push(`A Reality Score cannot be computed: ${score.reason.split('.')[0]}.`);
  }
  return risks;
}

/** New since the reader's last visit is a browser fact; this is the whole set. */
export const companySignals = companyId => signals({ companyId });

export const passport = company => ({
  company,
  position: chainPosition(company),
  momentum: commercialMomentum(company),
  concentration: customerConcentration(company),
  geography: geographicExposure(company),
  radar: bottleneckRadar(company),
  risks: thesisRisks(company),
  score: realityScore(company)
});

export const allPassports = () => COMPANIES.map(passport);
