/**
 * Derived estimates.
 *
 * T2C's default is to print "Not disclosed" and stop. That is correct, and it is
 * also, roughly forty times over, unhelpful: a reader cannot judge scale from a
 * column of blanks. So where a figure can be DERIVED from figures the company
 * itself published, this module derives it — and marks it, loudly, as an
 * assumption rather than a disclosure.
 *
 * The rules that make that safe rather than sloppy:
 *
 *   1. Every estimate comes from a NAMED rule over SOURCED inputs. Nothing is
 *      hand-typed, nothing comes from a peer average, nothing comes from memory.
 *      Change a rule and every estimate on the site moves with it.
 *   2. Every estimate carries `confidence: 'estimated'`, which the schema already
 *      defines as excluded from confirmed totals. An estimate therefore cannot
 *      leak into an aggregate that claims to be sourced.
 *   3. Every estimate states its derivation in the interface, in full, including
 *      the inputs and the assumption applied.
 *   4. An estimate never replaces a disclosure. It only ever fills a gap, and the
 *      reader can switch them off entirely.
 *
 * An estimate is the weakest claim on this site. It is displayed as such.
 */
import { COMPANIES } from '../../data/companies.js';
import { PROJECTS, CONTRACTS, PROJECTS_BY_COMPANY, CONTRACTS_BY_COMPANY } from '../../data/projects.js';
import { getMeasure, isKnown } from './compute.js';

/**
 * Gross utility power measured at the connection is not the critical IT load it
 * can support: conversion, cooling and distribution take a share. 1.4 is the
 * midpoint of the range typical of modern build; it is a T2C assumption, stated
 * as one, and it is the single number that most affects the estimates below.
 */
export const GROSS_TO_CRITICAL_IT = 1.4;

export const RULES = {
  criticalItFromGross: {
    id: 'criticalItFromGross',
    label: 'Critical IT from gross utility power',
    assumption:
      `Critical IT load is taken as gross utility power divided by ${GROSS_TO_CRITICAL_IT}. Gross power ` +
      'is measured at the utility connection, before conversion, cooling and distribution losses. The ' +
      'divisor is a T2C assumption reflecting typical modern data-centre overheads, not a company figure.'
  },
  billingFromAcceptance: {
    id: 'billingFromAcceptance',
    label: 'Billing from customer acceptance',
    assumption:
      'Capacity formally accepted by a customer is taken as billing. Acceptance is normally the ' +
      'milestone that starts the revenue clock, but the commercial effect is contract-specific and the ' +
      'company has not separately confirmed that billing has commenced.'
  },
  siteCapacityFromContract: {
    id: 'siteCapacityFromContract',
    label: 'Site capacity from the contract that names it',
    assumption:
      'Where a company discloses megawatts for a contract and names the site serving it, that figure is ' +
      'attributed to the site. It is the contracted capacity, which may differ from the site\'s ultimate build.'
  },
  rateFromOwnContracts: {
    id: 'rateFromOwnContracts',
    label: 'Revenue rate from the company\'s own contracts',
    assumption:
      'Revenue per MW per year is the capacity-weighted mean of this company\'s own disclosed contracts. ' +
      'Only the company\'s own agreements are used — never a peer average, which would describe a ' +
      'different business.'
  }
};

const est = (rule, valueMw, derivation, inputs, sourceIds) => ({
  valueMw,
  confidence: 'estimated',
  valueStatus: 'actual',
  isEstimate: true,
  rule: RULES[rule].id,
  ruleLabel: RULES[rule].label,
  assumption: RULES[rule].assumption,
  derivation,
  inputs,
  sourceIds
});

const round = (n, dp = 0) => {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
};

/**
 * Critical IT, where the company published gross utility power but not the
 * critical IT load it supports.
 */
export function estimateCriticalIt(company) {
  if (isKnown(getMeasure(company, 'energisedCriticalItMw'))) return null;   // disclosed; never override
  const gross = getMeasure(company, 'energisedGrossMw');
  if (!isKnown(gross)) return null;

  const value = round(gross.valueMw / GROSS_TO_CRITICAL_IT);
  return est('criticalItFromGross', value,
    `${gross.valueMw} MW gross utility ÷ ${GROSS_TO_CRITICAL_IT} = ${value} MW critical IT`,
    { grossMw: gross.valueMw, divisor: GROSS_TO_CRITICAL_IT },
    gross.sourceIds || []);
}

/** Billing, where capacity is accepted but revenue commencement is not disclosed. */
export function estimateBilling(company) {
  if (isKnown(getMeasure(company, 'revenueLiveMw'))) return null;
  const accepted = getMeasure(company, 'customerAcceptedMw');
  if (!isKnown(accepted)) return null;

  return est('billingFromAcceptance', accepted.valueMw,
    `${accepted.valueMw} MW formally accepted by a customer, taken as billing`,
    { acceptedMw: accepted.valueMw },
    accepted.sourceIds || []);
}

/**
 * A site's critical IT load, where it publishes only gross utility power.
 *
 * This is the estimate that does the most work on the Sites directory. Half the
 * estate quotes gross power at the fence and half quotes critical IT in the
 * hall; the two are not comparable, so a reader scanning the list is comparing
 * numbers that mean different things. Converting the gross ones puts every site
 * on one axis — clearly marked, and alongside the disclosed gross figure rather
 * than replacing it.
 */
export function estimateSiteCriticalIt(project) {
  if (project.powerBasis !== 'gross-utility') return null;
  if (project.capacityMw === null || project.capacityMw === undefined) return null;
  // A target or a pipeline figure is not a current capacity; converting it would
  // dress an ambition up as a comparable operating number.
  if (project.valueStatus !== 'actual' && project.valueStatus !== 'minimum') return null;

  const value = round(project.capacityMw / GROSS_TO_CRITICAL_IT);
  return est('criticalItFromGross', value,
    `${project.capacityMw} MW gross utility ÷ ${GROSS_TO_CRITICAL_IT} = ${value} MW critical IT`,
    { grossMw: project.capacityMw, divisor: GROSS_TO_CRITICAL_IT },
    project.sourceIds || []);
}

/** Site capacity, where a contract names the site and discloses its megawatts. */
export function estimateSiteCapacity(project) {
  if (project.capacityMw !== null && project.capacityMw !== undefined) return null;
  const named = CONTRACTS.filter(c =>
    Array.isArray(c.projectIds) && c.projectIds.includes(project.id) && typeof c.mw === 'number');
  if (!named.length) return null;

  // Several contracts can serve one site; they are additive because each names
  // its own megawatts against that site.
  const total = named.reduce((a, c) => a + c.mw, 0);
  return est('siteCapacityFromContract', total,
    named.map(c => `${c.customer}: ${c.mw} MW`).join(' + ') +
      (named.length > 1 ? ` = ${total} MW` : ''),
    { contracts: named.map(c => ({ id: c.id, mw: c.mw })) },
    [...new Set(named.flatMap(c => c.sourceIds || []))]);
}

/**
 * Revenue per MW per year, from this company's own disclosed contracts.
 *
 * Capacity-weighted, so a 400 MW agreement counts for more than a 50 MW one.
 * Returns null where the company has disclosed no contract with value, MW and
 * term together — there is nothing to derive from, and a peer average would
 * describe a different business.
 */
export function estimateRevenueRate(companyId) {
  const rows = (CONTRACTS_BY_COMPANY[companyId] || [])
    .filter(c => typeof c.valueBn === 'number' && typeof c.mw === 'number' && typeof c.years === 'number'
      && c.mw > 0 && c.years > 0);
  if (!rows.length) return null;

  const totalMw = rows.reduce((a, c) => a + c.mw, 0);
  // $m per MW per year for each contract, weighted by its megawatts.
  const weighted = rows.reduce((a, c) => a + ((c.valueBn * 1000) / c.mw / c.years) * c.mw, 0) / totalMw;

  return {
    perMwYearM: weighted,
    displayPerMwYearM: round(weighted, 2),
    contracts: rows.map(c => ({
      id: c.id, customer: c.customer, mw: c.mw, years: c.years, valueBn: c.valueBn,
      perMwYearM: round((c.valueBn * 1000) / c.mw / c.years, 2)
    })),
    isEstimate: rows.length > 1,
    rule: RULES.rateFromOwnContracts.id,
    ruleLabel: RULES.rateFromOwnContracts.label,
    assumption: RULES.rateFromOwnContracts.assumption,
    derivation: rows.length === 1
      ? `${rows[0].customer}: $${rows[0].valueBn}bn ÷ ${rows[0].mw} MW ÷ ${rows[0].years} years ` +
        `= $${round((rows[0].valueBn * 1000) / rows[0].mw / rows[0].years, 2)}m per MW per year`
      : `capacity-weighted mean of ${rows.length} disclosed contracts (${totalMw} MW total) ` +
        `= $${round(weighted, 2)}m per MW per year`,
    sourceIds: [...new Set(rows.flatMap(c => c.sourceIds || []))]
  };
}

/** Every estimate available for one company, keyed by the metric it fills. */
export function companyEstimates(company) {
  const out = {};
  const it = estimateCriticalIt(company);
  if (it) out.energisedCriticalItMw = it;
  const billing = estimateBilling(company);
  if (billing) out.revenueLiveMw = billing;
  return out;
}

/** Count of gaps filled across the tracked set, for the methodology page. */
export function estimateCoverage() {
  let filled = 0;
  for (const c of COMPANIES) filled += Object.keys(companyEstimates(c)).length;
  for (const p of PROJECTS) {
    if (estimateSiteCapacity(p)) filled++;
    if (estimateSiteCriticalIt(p)) filled++;
  }
  return { filled, companies: COMPANIES.length, projects: PROJECTS.length };
}

/** Everything derivable for one site, for the card and the site page. */
export function siteEstimates(project) {
  const out = {};
  const cap = estimateSiteCapacity(project);
  if (cap) out.capacityMw = cap;
  const it = estimateSiteCriticalIt(project);
  if (it) out.criticalItMw = it;
  return out;
}
