/**
 * Unit economics for the Edge Lab.
 *
 * PROVENANCE RULE, and it is the whole point of this file:
 *
 *   Every revenue rate below is DERIVED by arithmetic from a contract value and
 *   term the company itself disclosed. Nothing is a market estimate, a comparable
 *   or a guess. The derivation is stored alongside the number so a reader can
 *   redo it, and each carries `derivation` text that appears in the interface.
 *
 *   Where a company has NOT disclosed enough to derive a rate, the entry is null
 *   and the Lab says so rather than substituting a sector average.
 *
 * Balance-sheet inputs (shares, cash, debt) are deliberately NOT populated. T2C's
 * source registry does not carry them, and inventing them would put a fabricated
 * number at the centre of a per-share valuation. They are user inputs, clearly
 * labelled as not sourced by T2C.
 */

/** $m per MW per year, from disclosed contract value ÷ MW ÷ term. */
function fromContract({ valueBn, mw, years }) {
  if (!valueBn || !mw || !years) return null;
  const perMwYear = (valueBn * 1000) / mw / years;          // $m per MW per year
  const perKwMonth = (perMwYear * 1e6) / 1000 / 12;          // $ per kW per month
  return {
    // Kept at full precision: rounding here would push a small error through every
    // downstream valuation. Rounding belongs in the display layer only.
    revenuePerMwYearM: perMwYear,
    revenuePerKwMonth: perKwMonth,
    displayPerMwYearM: +perMwYear.toFixed(2),
    displayPerKwMonth: Math.round(perKwMonth),
    inputs: { valueBn, mw, years },
    derivation: `$${valueBn}bn ÷ ${mw} MW ÷ ${years} years = $${perMwYear.toFixed(2)}m per MW per year ` +
      `($${Math.round(perKwMonth)} per kW per month)`
  };
}

export const CONTRACT_ECONOMICS = {
  'iren-msft': { ...fromContract({ valueBn: 9.7, mw: 200, years: 5 }), sourceIds: ['iren-8k-microsoft'] },
  'iren-nvda': { ...fromContract({ valueBn: 3.4, mw: 60, years: 5 }), sourceIds: ['iren-ex991-nvidia'] },
  'wulf-anthropic': { ...fromContract({ valueBn: 19, mw: 401, years: 20 }), sourceIds: ['wulf-anthropic-lease'] },
  'apld-polaris-1': { ...fromContract({ valueBn: 11, mw: 400, years: 15 }), sourceIds: ['apld-10k-20260531'] },
  'apld-polaris-2': { ...fromContract({ valueBn: 5, mw: 200, years: 15 }), sourceIds: ['apld-10k-20260531'] },
  'apld-polaris-3': { ...fromContract({ valueBn: 7.5, mw: 300, years: 15 }), sourceIds: ['apld-10k-20260531'] },
  'apld-delta-1': { ...fromContract({ valueBn: 7.5, mw: 300, years: 15 }), sourceIds: ['apld-10k-20260531'] },
  'apld-delta-2': { ...fromContract({ valueBn: 5.2, mw: 210, years: 15 }), sourceIds: ['apld-delta-forge-2'] }
};

/**
 * Capital cost per MW of critical IT.
 * TeraWulf published a range in its Q2 2026 results; it is the only sourced capex
 * figure in the registry, so it is offered as a reference and never silently
 * applied to another company.
 */
export const CAPEX_REFERENCE = {
  wulfPerMwM: { low: 8, high: 10, midpoint: 9, sourceIds: ['wulf-q2-2026-results'],
    note: 'TeraWulf guided construction cost of $8–10m per critical IT MW. Applied to other ' +
      'companies only as an explicitly user-selected reference, never as their own figure.' }
};

/**
 * Per-company Lab readiness. `revenueBasis` names where the rate comes from; a
 * company with no disclosed contract value cannot be modelled on contract terms
 * and the Lab must say so instead of borrowing a peer's number.
 */
export const LAB_COVERAGE = {
  iren: {
    ready: true,
    contracts: ['iren-msft', 'iren-nvda'],
    revenueBasis: 'contract',
    note: 'Two contracts disclose both value and term, so revenue per MW is derived rather than assumed.'
  },
  terawulf: {
    ready: true,
    contracts: ['wulf-anthropic'],
    revenueBasis: 'contract',
    note: 'The Anthropic lease discloses value, megawatts and a 20-year initial term.'
  },
  'applied-digital': {
    ready: true,
    contracts: ['apld-polaris-1', 'apld-polaris-2', 'apld-polaris-3', 'apld-delta-1', 'apld-delta-2'],
    revenueBasis: 'contract',
    note: 'All five campus leases disclose value, megawatts and a 15-year initial term.'
  },
  coreweave: {
    ready: false,
    contracts: [],
    revenueBasis: null,
    note: 'CoreWeave reports customer commitments as a dollar backlog with no megawatt or term ' +
      'breakdown, so a per-MW revenue rate cannot be derived from disclosure.'
  },
  nebius: {
    ready: false,
    contracts: [],
    revenueBasis: null,
    note: 'The Meta agreement discloses dollars but not megawatts, and part of the headline value ' +
      'is conditional. No rate can be derived.'
  },
  keel: {
    ready: false,
    contracts: [],
    revenueBasis: null,
    note: 'Keel has no announced customer lease, so there is no contract from which to derive a rate.'
  }
};

/**
 * Defaults for genuinely modelled assumptions. These are NOT sourced facts and the
 * interface labels them as model inputs. They are conventional planning values,
 * chosen to be unflattering rather than optimistic.
 */
export const MODEL_DEFAULTS = {
  utilisation: 0.95,
  ebitdaMargin: { poweredShell: 0.72, fullStack: 0.55 },
  maintenanceCapexPctOfRevenue: 0.03,
  interestRate: 0.085,
  debtShareOfCapex: 0.60,
  valuationMethod: 'evEbitda',
  evEbitdaMultiple: 14,
  evRevenueMultiple: 6,
  discountRate: 0.11,
  capexOverrun: 0,
  taxRate: 0
};

export const ASSUMPTION_PROVENANCE = {
  utilisation: 'Model input. Not disclosed by any tracked company.',
  ebitdaMargin: 'Model input, defaulted lower for full-stack operators because they carry chip cost.',
  interestRate: 'Model input. Not company-specific.',
  debtShareOfCapex: 'Model input describing how the funding gap is assumed to be split.',
  evEbitdaMultiple: 'Model input. Valuation multiples are an opinion, not a disclosure.',
  discountRate: 'Model input.',
  revenuePerMwYearM: 'Derived by arithmetic from a disclosed contract value, megawatts and term.',
  capexPerMwM: 'Reference figure from TeraWulf guidance. Applies to other companies only if you choose it.'
};
