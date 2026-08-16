/**
 * Edge Lab engine — "what must go right?"
 *
 * Turns physical delivery (megawatts, gates, dates) into revenue, funding need,
 * dilution and per-share value, then runs the calculation backwards to ask what a
 * given valuation would require.
 *
 * Design rules, all load-bearing:
 *  - Pure functions. No DOM, no fetch, no clock. Every result is reproducible.
 *  - Unknown never becomes zero. A missing input yields `null` and an explicit
 *    `unavailable` reason, never a silent 0 that flows into a valuation.
 *  - Nothing here asserts a price. Outputs are distributions and requirements.
 *  - Every assumption is returned alongside the result so the interface can show
 *    what was held constant.
 */

/* ================= small helpers ================= */

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const round = (x, dp = 2) => (Number.isFinite(x) ? +x.toFixed(dp) : null);

/** Quarter key helpers. Dates are date-only and UTC throughout. */
export function quarterOf(iso) {
  const [y, m] = String(iso).slice(0, 10).split('-').map(Number);
  return { year: y, q: Math.floor((m - 1) / 3) + 1 };
}
export const quarterLabel = ({ year, q }) => `Q${q} ${year}`;
export function addQuarters({ year, q }, n) {
  const total = (year * 4 + (q - 1)) + n;
  return { year: Math.floor(total / 4), q: (total % 4) + 1 };
}
export const quarterIndex = ({ year, q }) => year * 4 + (q - 1);
/** Last day of a quarter, so a window end is a real date. */
export function quarterEnd({ year, q }) {
  const m = q * 3;
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${year}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

/* ================= deterministic randomness ================= */

/** Mulberry32. Seeded so a simulation is reproducible for a given scenario. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Box–Muller, using a supplied uniform generator. */
export function normalFrom(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ================= tranche model ================= */

/**
 * A tranche is a block of capacity with its own delivery date and commercial
 * terms. Projects decompose into tranches so partial delivery is representable.
 *
 * `cancelled` removes all future delivery — a cancelled tranche must never
 * contribute revenue, which is one of the engine's invariants.
 */
export function normaliseTranche(t) {
  return {
    id: t.id,
    label: t.label,
    capacityMw: t.capacityMw ?? null,
    ownershipPct: t.ownershipPct ?? 1,
    energisedAt: t.energisedAt ?? null,
    acceptedAt: t.acceptedAt ?? null,
    revenueFrom: t.revenueFrom ?? t.acceptedAt ?? null,
    contracted: t.contracted ?? false,
    revenuePerMwYearM: t.revenuePerMwYearM ?? null,
    remainingCapexM: t.remainingCapexM ?? null,
    cancelled: !!t.cancelled,
    sourceIds: t.sourceIds || []
  };
}

/**
 * Billable megawatts for a tranche in a given quarter.
 *
 * The gate chain is enforced here rather than trusted from the caller:
 * revenue requires acceptance, acceptance requires energisation, and none of it
 * survives cancellation.
 */
export function billableMwAt(tranche, qi) {
  if (tranche.cancelled) return 0;
  if (!tranche.capacityMw) return 0;
  if (!tranche.revenueFrom) return 0;
  const from = quarterIndex(quarterOf(tranche.revenueFrom));
  if (qi < from) return 0;
  // acceptance cannot precede energisation
  if (tranche.energisedAt && tranche.acceptedAt &&
      quarterIndex(quarterOf(tranche.acceptedAt)) < quarterIndex(quarterOf(tranche.energisedAt))) {
    return 0;
  }
  return tranche.capacityMw * clamp(tranche.ownershipPct, 0, 1);
}

/* ================= projection ================= */

/**
 * Quarterly projection of capacity, revenue, EBITDA, capex and funding.
 * Returns `unavailable` rather than zeros when a required input is missing.
 */
export function project({ tranches, assumptions, startQuarter, quarters = 16 }) {
  const missing = [];
  if (!tranches?.length) missing.push('no capacity tranches');
  const withRate = (tranches || []).filter(t => t.revenuePerMwYearM !== null);
  if (!withRate.length) missing.push('no tranche has a derivable revenue rate');
  if (missing.length) return { available: false, missing, rows: [] };

  const a = assumptions;
  const rows = [];
  let cumulativeFunding = 0;

  for (let i = 0; i < quarters; i++) {
    const q = addQuarters(startQuarter, i);
    const qi = quarterIndex(q);

    let operationalMw = 0, contractedMw = 0, billableMw = 0, revenueM = 0, capexM = 0;

    for (const t of tranches) {
      if (t.cancelled) continue;
      if (t.capacityMw && t.energisedAt && qi >= quarterIndex(quarterOf(t.energisedAt))) {
        operationalMw += t.capacityMw * clamp(t.ownershipPct, 0, 1);
      }
      if (t.capacityMw && t.contracted) contractedMw += t.capacityMw * clamp(t.ownershipPct, 0, 1);

      const b = billableMwAt(t, qi);
      billableMw += b;
      if (b > 0 && t.revenuePerMwYearM !== null) {
        revenueM += (b * t.revenuePerMwYearM * a.utilisation) / 4;   // quarterly
      }

      // Remaining capex is spread evenly across the quarters until energisation.
      if (t.remainingCapexM && t.energisedAt) {
        const target = quarterIndex(quarterOf(t.energisedAt));
        const startIdx = quarterIndex(startQuarter);
        const span = Math.max(1, target - startIdx);
        if (qi < target) capexM += (t.remainingCapexM * (1 + a.capexOverrun)) / span;
      }
    }

    const ebitdaM = revenueM * a.ebitdaMargin;
    const maintenanceM = revenueM * a.maintenanceCapexPctOfRevenue;
    const freeCashM = ebitdaM - maintenanceM - capexM;
    cumulativeFunding += Math.min(0, freeCashM);

    rows.push({
      quarter: q, label: quarterLabel(q),
      operationalMw: round(operationalMw, 1),
      contractedMw: round(contractedMw, 1),
      billableMw: round(billableMw, 1),
      revenueM: round(revenueM),
      ebitdaM: round(ebitdaM),
      capexM: round(capexM),
      freeCashM: round(freeCashM),
      cumulativeFundingM: round(cumulativeFunding)
    });
  }

  return { available: true, rows, missing: [] };
}

/* ================= funding and dilution ================= */

/**
 * Funding gap → debt/equity split → new shares → dilution.
 * Per-share outputs require a share count and balance sheet the user supplies;
 * without them this returns `perShareAvailable: false` rather than guessing.
 */
export function funding({ projection, assumptions, balance }) {
  if (!projection.available) return { available: false, missing: projection.missing };

  const peakDeficitM = Math.abs(Math.min(0, ...projection.rows.map(r => r.cumulativeFundingM)));
  const existingCashM = balance?.cashM ?? null;
  const gapM = existingCashM === null ? peakDeficitM : Math.max(0, peakDeficitM - existingCashM);

  const debtM = gapM * assumptions.debtShareOfCapex;
  const equityM = gapM - debtM;

  const issuePrice = balance?.equityIssuePrice ?? null;
  const sharesM = balance?.sharesOutstandingM ?? null;

  let newSharesM = null, dilutionPct = null, dilutedSharesM = null;
  if (issuePrice && issuePrice > 0 && sharesM && sharesM > 0) {
    newSharesM = equityM / issuePrice;
    dilutedSharesM = sharesM + newSharesM;
    dilutionPct = newSharesM / dilutedSharesM;
  }

  return {
    available: true,
    peakDeficitM: round(peakDeficitM),
    existingCashM,
    fundingGapM: round(gapM),
    debtM: round(debtM),
    equityM: round(equityM),
    newSharesM: round(newSharesM, 3),
    dilutedSharesM: round(dilutedSharesM, 3),
    dilutionPct: dilutionPct === null ? null : round(dilutionPct, 4),
    perShareAvailable: dilutedSharesM !== null,
    perShareMissing: dilutedSharesM === null
      ? ['share count and equity issue price are user inputs — T2C does not source them']
      : []
  };
}

/* ================= valuation ================= */

/** Run-rate EBITDA at the end of the projection, annualised from the last quarter. */
export function terminalRunRate(projection) {
  if (!projection.available || !projection.rows.length) return null;
  const last = projection.rows[projection.rows.length - 1];
  return { revenueM: round(last.revenueM * 4), ebitdaM: round(last.ebitdaM * 4) };
}

export const VALUATION_METHODS = {
  evEbitda: { label: 'EV / EBITDA', needs: 'evEbitdaMultiple' },
  evRevenue: { label: 'EV / Revenue', needs: 'evRevenueMultiple' },
  dcf: { label: 'Discounted contracted cash flow', needs: 'discountRate' }
};

/**
 * Enterprise value, then the explicit bridge to equity value.
 * Methods are never blended — the caller picks one and it is named in the output.
 */
export function valuation({ projection, assumptions, balance, fundingResult = null }) {
  const rr = terminalRunRate(projection);
  if (!rr) return { available: false, missing: ['no projection'] };

  const method = assumptions.valuationMethod;
  let evM = null;

  if (method === 'evEbitda') evM = rr.ebitdaM * assumptions.evEbitdaMultiple;
  else if (method === 'evRevenue') evM = rr.revenueM * assumptions.evRevenueMultiple;
  else if (method === 'dcf') {
    // Discount the modelled quarterly free cash at the stated rate. Deliberately
    // no terminal value: an infinite tail would dominate a 4-year projection.
    const rq = assumptions.discountRate / 4;
    evM = projection.rows.reduce((sum, r, i) => sum + r.freeCashM / Math.pow(1 + rq, i + 1), 0);
  } else return { available: false, missing: [`unknown valuation method ${method}`] };

  const cashM = balance?.cashM ?? 0;
  const debtM = balance?.debtM ?? 0;
  const preferredM = balance?.preferredM ?? 0;
  const otherM = balance?.otherAdjustmentsM ?? 0;

  /*
   * The build has to be paid for, and the bridge is where that lands.
   *
   * New DEBT raised to close the funding gap is a prior claim on the same terminal
   * EBITDA, so it comes off equity value. New EQUITY does not: the cash raised is
   * spent on the capacity that produces the EBITDA, so it is value-neutral in
   * aggregate and its whole cost falls on existing holders as dilution — which
   * perShare() applies through the diluted share count.
   *
   * Without this, capex overruns and delivery delays changed nothing at all, because
   * a terminal run-rate multiple cannot see either one.
   */
  const newDebtM = fundingResult && fundingResult.available ? (fundingResult.debtM || 0) : 0;
  const equityValueM = evM + cashM - debtM - preferredM + otherM - newDebtM;

  return {
    available: true,
    method, methodLabel: VALUATION_METHODS[method].label,
    runRate: rr,
    enterpriseValueM: round(evM),
    newDebtM: round(newDebtM),
    bridge: [
      { label: 'Enterprise value', valueM: round(evM) },
      { label: 'Add: cash', valueM: round(cashM) },
      { label: 'Less: debt', valueM: round(-debtM) },
      { label: 'Less: new debt raised to fund the build', valueM: round(-newDebtM) },
      { label: 'Less: preferred claims', valueM: round(-preferredM) },
      { label: 'Other adjustments', valueM: round(otherM) }
    ],
    equityValueM: round(equityValueM),
    balanceSheetSupplied: balance?.cashM !== undefined && balance?.debtM !== undefined
  };
}

export function perShare({ valuationResult, fundingResult }) {
  if (!valuationResult.available) return { available: false, missing: valuationResult.missing };
  if (!fundingResult.perShareAvailable) {
    return { available: false, missing: fundingResult.perShareMissing };
  }
  const value = valuationResult.equityValueM / fundingResult.dilutedSharesM;
  return { available: true, perShare: round(value, 2), dilutedSharesM: fundingResult.dilutedSharesM };
}

/* ================= full scenario ================= */

export function runScenario({ tranches, assumptions, balance, startQuarter, quarters = 16 }) {
  const t = (tranches || []).map(normaliseTranche);
  const projection = project({ tranches: t, assumptions, startQuarter, quarters });
  if (!projection.available) {
    return { available: false, missing: projection.missing, projection, assumptions };
  }
  const fundingResult = funding({ projection, assumptions, balance });
  const valuationResult = valuation({ projection, assumptions, balance, fundingResult });
  const share = perShare({ valuationResult, fundingResult });

  return {
    available: true,
    projection, funding: fundingResult, valuation: valuationResult, perShare: share,
    assumptions, balance,
    heldConstant: Object.keys(assumptions)
  };
}

/* ================= reverse solver ================= */

/**
 * "What would need to be true?"
 *
 * Solves ONE variable so the modelled equity value matches a target, holding
 * everything else constant. Bisection over a bounded range, because the objective
 * is monotonic in each supported variable and a bounded search cannot run away.
 *
 * Returns `solved: false` with a reason when no value in range produces the
 * target — which is itself a finding worth showing.
 */
export const SOLVABLE = {
  billableMwMultiplier: { label: 'Delivered capacity', min: 0.1, max: 10, unit: '×' },
  ebitdaMargin: { label: 'EBITDA margin', min: 0.05, max: 0.95, unit: '' },
  evEbitdaMultiple: { label: 'EV/EBITDA multiple', min: 1, max: 60, unit: '×' },
  utilisation: { label: 'Utilisation', min: 0.1, max: 1, unit: '' },
  revenueRateMultiplier: { label: 'Revenue rate', min: 0.1, max: 5, unit: '×' }
};

export function solveFor({
  variable, targetEquityValueM, tranches, assumptions, balance,
  startQuarter, quarters = 16, tolerance = 0.5, maxIterations = 60
}) {
  const spec = SOLVABLE[variable];
  if (!spec) return { solved: false, reason: `${variable} is not solvable` };

  const evaluate = x => {
    const a = { ...assumptions };
    let t = (tranches || []).map(normaliseTranche);
    if (variable === 'billableMwMultiplier') {
      t = t.map(tr => ({ ...tr, capacityMw: tr.capacityMw === null ? null : tr.capacityMw * x }));
    } else if (variable === 'revenueRateMultiplier') {
      t = t.map(tr => ({ ...tr, revenuePerMwYearM: tr.revenuePerMwYearM === null ? null : tr.revenuePerMwYearM * x }));
    } else {
      a[variable] = x;
    }
    const r = runScenario({ tranches: t, assumptions: a, balance, startQuarter, quarters });
    return r.available ? r.valuation.equityValueM : null;
  };

  let lo = spec.min, hi = spec.max;
  const fLo = evaluate(lo), fHi = evaluate(hi);
  if (fLo === null || fHi === null) return { solved: false, reason: 'scenario could not be evaluated' };

  // Monotonic increasing in every supported variable, so the target must sit inside.
  if (targetEquityValueM < Math.min(fLo, fHi) || targetEquityValueM > Math.max(fLo, fHi)) {
    return {
      solved: false,
      reason: targetEquityValueM > Math.max(fLo, fHi)
        ? `No value of ${spec.label} within the searched range reaches this valuation`
        : `This valuation is below what the modelled business produces even at the floor of ${spec.label}`,
      range: { min: round(Math.min(fLo, fHi)), max: round(Math.max(fLo, fHi)) },
      searched: { min: spec.min, max: spec.max }
    };
  }

  let mid = lo, fMid = fLo, iterations = 0;
  while (iterations < maxIterations) {
    mid = (lo + hi) / 2;
    fMid = evaluate(mid);
    if (fMid === null) return { solved: false, reason: 'scenario could not be evaluated' };
    if (Math.abs(fMid - targetEquityValueM) <= tolerance) break;
    if ((fMid < targetEquityValueM) === (fLo < fHi)) lo = mid; else hi = mid;
    iterations++;
  }

  return {
    solved: true,
    variable, label: spec.label, unit: spec.unit,
    value: round(mid, 4),
    achievedEquityValueM: round(fMid),
    targetEquityValueM: round(targetEquityValueM),
    iterations,
    heldConstant: { ...assumptions }
  };
}

/**
 * Classify a solved requirement against what the evidence already supports.
 * This is the "what must go right" verdict, and it deliberately refuses to say
 * what the market believes — only what would have to be true.
 */
export const REQUIREMENT_VERDICT = {
  evidenced: { label: 'Already evidenced', tone: 'ok' },
  plausible: { label: 'Plausible but unconfirmed', tone: 'warn' },
  modelDependent: { label: 'Model-dependent', tone: 'warn' },
  unsupported: { label: 'Unsupported by current evidence', tone: 'bad' },
  contradicted: { label: 'Contradicted by current evidence', tone: 'bad' }
};

export function classifyRequirement({ requiredMw, evidencedMw, contractedMw }) {
  if (requiredMw === null || requiredMw === undefined) return 'modelDependent';
  if (evidencedMw !== null && requiredMw <= evidencedMw) return 'evidenced';
  if (contractedMw !== null && requiredMw <= contractedMw) return 'plausible';
  if (contractedMw !== null && requiredMw > contractedMw * 3) return 'unsupported';
  return 'modelDependent';
}

/* ================= Monte Carlo ================= */

export const UNCERTAIN = {
  delayQuarters: { label: 'Construction delay', kind: 'discrete', values: [0, 1, 2, 3, 4], weights: [0.35, 0.3, 0.2, 0.1, 0.05] },
  capexOverrun: { label: 'Capex overrun', kind: 'normal', mean: 0.08, sd: 0.10, min: -0.05, max: 0.6 },
  utilisation: { label: 'Utilisation', kind: 'normal', mean: 0.93, sd: 0.05, min: 0.5, max: 1 },
  ebitdaMargin: { label: 'EBITDA margin', kind: 'normal', mean: 0, sd: 0.06, min: -0.25, max: 0.25, relative: true },
  evEbitdaMultiple: { label: 'Valuation multiple', kind: 'normal', mean: 0, sd: 3, min: -8, max: 12, relative: true }
};

function drawFrom(spec, rng) {
  if (spec.kind === 'discrete') {
    const r = rng();
    let acc = 0;
    for (let i = 0; i < spec.values.length; i++) {
      acc += spec.weights[i];
      if (r <= acc) return spec.values[i];
    }
    return spec.values[spec.values.length - 1];
  }
  return clamp(spec.mean + normalFrom(rng) * spec.sd, spec.min, spec.max);
}

export function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = clamp((sorted.length - 1) * p, 0, sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Seeded simulation over the uncertain inputs. Identical seeds give identical
 * results, which is what makes a shared scenario meaningful.
 *
 * A company-level shock is drawn once per path and applied to every tranche, so
 * delays are correlated rather than independently averaging away.
 */
export function simulate({
  tranches, assumptions, balance, startQuarter, quarters = 16,
  paths = 10000, seed = 20260815, currentPrice = null
}) {
  const base = (tranches || []).map(normaliseTranche);
  const rng = makeRng(seed);
  const equityValues = [], perShareValues = [];
  let fundingShortfalls = 0;

  for (let p = 0; p < paths; p++) {
    const companyDelay = drawFrom(UNCERTAIN.delayQuarters, rng);
    const a = {
      ...assumptions,
      capexOverrun: drawFrom(UNCERTAIN.capexOverrun, rng),
      utilisation: drawFrom(UNCERTAIN.utilisation, rng),
      ebitdaMargin: clamp(assumptions.ebitdaMargin + drawFrom(UNCERTAIN.ebitdaMargin, rng), 0.05, 0.95),
      evEbitdaMultiple: clamp(assumptions.evEbitdaMultiple + drawFrom(UNCERTAIN.evEbitdaMultiple, rng), 2, 40)
    };

    const t = base.map(tr => {
      if (tr.cancelled || !tr.revenueFrom) return tr;
      const shifted = addQuarters(quarterOf(tr.revenueFrom), companyDelay);
      return { ...tr, revenueFrom: quarterEnd(shifted) };
    });

    const r = runScenario({ tranches: t, assumptions: a, balance, startQuarter, quarters });
    if (!r.available) continue;
    equityValues.push(r.valuation.equityValueM);
    if (r.perShare.available) perShareValues.push(r.perShare.perShare);
    if (r.funding.fundingGapM > 0) fundingShortfalls++;
  }

  const sortedEq = equityValues.slice().sort((x, y) => x - y);
  const sortedPs = perShareValues.slice().sort((x, y) => x - y);
  const band = arr => ({
    p10: round(percentile(arr, 0.10)), p25: round(percentile(arr, 0.25)),
    p50: round(percentile(arr, 0.50)), p75: round(percentile(arr, 0.75)),
    p90: round(percentile(arr, 0.90))
  });

  return {
    available: sortedEq.length > 0,
    paths: sortedEq.length,
    seed,
    equityValueM: band(sortedEq),
    perShare: sortedPs.length ? band(sortedPs) : null,
    perShareAvailable: sortedPs.length > 0,
    /*
     * A shortfall is only meaningful against a cash balance. With no balance
     * supplied every path shows a gap and the figure reads 100%, which is an
     * artefact of the missing input rather than a finding about the company.
     * It is reported as unavailable instead, the same as every other output that
     * depends on a number T2C does not source.
     */
    fundingShortfallAvailable: (balance?.cashM ?? null) !== null,
    probabilityFundingShortfall: (balance?.cashM ?? null) === null
      ? null : round(fundingShortfalls / Math.max(1, paths), 3),
    probabilityAbovePrice: currentPrice && sortedPs.length
      ? round(sortedPs.filter(v => v > currentPrice).length / sortedPs.length, 3)
      : null,
    caution:
      'A distribution of modelled outcomes under your assumptions. It is not a forecast, ' +
      'not a probability that the market is wrong, and not investment advice.'
  };
}

/* ================= stress tests ================= */

export const STRESS_TESTS = {
  delay6m: { label: '6-month delay', apply: s => ({ ...s, delayQuarters: 2 }) },
  delay12m: { label: '12-month delay', apply: s => ({ ...s, delayQuarters: 4 }) },
  capex10: { label: '10% capex overrun', apply: s => ({ ...s, assumptions: { ...s.assumptions, capexOverrun: 0.10 } }) },
  capex20: { label: '20% capex overrun', apply: s => ({ ...s, assumptions: { ...s.assumptions, capexOverrun: 0.20 } }) },
  noNewContract: { label: 'No new contract', apply: s => ({ ...s, dropUncontracted: true }) },
  lowerUtilisation: { label: 'Utilisation to 80%', apply: s => ({ ...s, assumptions: { ...s.assumptions, utilisation: 0.80 } }) },
  multipleCompression: { label: 'Multiple compression', apply: s => ({ ...s, assumptions: { ...s.assumptions, evEbitdaMultiple: Math.max(4, s.assumptions.evEbitdaMultiple * 0.6) } }) }
};

/** Apply a named stress test and return the delta against the base scenario. */
export function stress({ test, tranches, assumptions, balance, startQuarter, quarters = 16 }) {
  const spec = STRESS_TESTS[test];
  if (!spec) return { available: false, reason: `unknown stress test ${test}` };

  const baseRun = runScenario({ tranches, assumptions, balance, startQuarter, quarters });
  let t = (tranches || []).map(normaliseTranche);
  let a = { ...assumptions };

  const shaped = spec.apply({ assumptions: a, delayQuarters: 0, dropUncontracted: false });
  a = shaped.assumptions || a;
  if (shaped.delayQuarters) {
    t = t.map(tr => tr.revenueFrom
      ? { ...tr, revenueFrom: quarterEnd(addQuarters(quarterOf(tr.revenueFrom), shaped.delayQuarters)) }
      : tr);
  }
  if (shaped.dropUncontracted) t = t.map(tr => (tr.contracted ? tr : { ...tr, cancelled: true }));

  const stressed = runScenario({ tranches: t, assumptions: a, balance, startQuarter, quarters });
  if (!baseRun.available || !stressed.available) return { available: false, reason: 'scenario unavailable' };

  return {
    available: true,
    test, label: spec.label,
    baseEquityValueM: baseRun.valuation.equityValueM,
    stressedEquityValueM: stressed.valuation.equityValueM,
    deltaM: round(stressed.valuation.equityValueM - baseRun.valuation.equityValueM),
    deltaPct: baseRun.valuation.equityValueM
      ? round((stressed.valuation.equityValueM - baseRun.valuation.equityValueM) / Math.abs(baseRun.valuation.equityValueM), 4)
      : null
  };
}

/** Two-variable sensitivity grid, for the matrix view. */
export function sensitivityGrid({ xVar, xValues, yVar, yValues, tranches, assumptions, balance, startQuarter, quarters = 16 }) {
  const cells = [];
  for (const y of yValues) {
    const row = [];
    for (const x of xValues) {
      const a = { ...assumptions, [xVar]: x, [yVar]: y };
      const r = runScenario({ tranches, assumptions: a, balance, startQuarter, quarters });
      row.push(r.available ? r.valuation.equityValueM : null);
    }
    cells.push(row);
  }
  return { xVar, yVar, xValues, yValues, cells, heldConstant: { ...assumptions } };
}
