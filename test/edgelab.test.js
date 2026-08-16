import test from 'node:test';
import assert from 'node:assert/strict';

import {
  quarterOf, quarterLabel, addQuarters, quarterIndex, quarterEnd,
  makeRng, normaliseTranche, billableMwAt, project, funding, valuation, perShare,
  runScenario, solveFor, SOLVABLE, classifyRequirement, simulate, percentile,
  stress, STRESS_TESTS, sensitivityGrid, terminalRunRate
} from '../src/lib/edgelab.js';
import { CONTRACT_ECONOMICS, LAB_COVERAGE, MODEL_DEFAULTS } from '../data/economics.js';

const START = { year: 2026, q: 3 };

const A = {
  utilisation: 0.95, ebitdaMargin: 0.72, maintenanceCapexPctOfRevenue: 0.03,
  interestRate: 0.085, debtShareOfCapex: 0.6, capexOverrun: 0,
  valuationMethod: 'evEbitda', evEbitdaMultiple: 14, evRevenueMultiple: 6, discountRate: 0.11
};

const TRANCHE = (over = {}) => normaliseTranche({
  id: 't1', label: 'Tranche', capacityMw: 100, ownershipPct: 1,
  energisedAt: '2026-12-31', acceptedAt: '2027-03-31', revenueFrom: '2027-03-31',
  contracted: true, revenuePerMwYearM: 2.37, remainingCapexM: 900, ...over
});

const BAL = { cashM: 200, debtM: 500, sharesOutstandingM: 380, equityIssuePrice: 10 };

/* ================= quarter maths ================= */

test('quarter helpers are consistent', () => {
  assert.deepEqual(quarterOf('2026-08-15'), { year: 2026, q: 3 });
  assert.equal(quarterLabel({ year: 2026, q: 3 }), 'Q3 2026');
  assert.deepEqual(addQuarters({ year: 2026, q: 4 }, 1), { year: 2027, q: 1 });
  assert.deepEqual(addQuarters({ year: 2026, q: 1 }, -1), { year: 2025, q: 4 });
  assert.equal(quarterIndex({ year: 2027, q: 1 }) - quarterIndex({ year: 2026, q: 1 }), 4);
  assert.equal(quarterEnd({ year: 2026, q: 4 }), '2026-12-31');
  assert.equal(quarterEnd({ year: 2027, q: 1 }), '2027-03-31');
  assert.equal(quarterEnd({ year: 2028, q: 1 }), '2028-03-31');
});

/* ================= revenue ================= */

test('revenue derives from disclosed contract value, megawatts and term', () => {
  // TeraWulf/Anthropic: $19bn over 401 MW over 20 years.
  const e = CONTRACT_ECONOMICS['wulf-anthropic'];
  assert.ok(Math.abs(e.revenuePerMwYearM - (19 * 1000) / 401 / 20) < 1e-6);
  assert.match(e.derivation, /19bn/);
  assert.ok(e.sourceIds.includes('wulf-anthropic-lease'));

  // IREN/Microsoft: $9.7bn over 200 MW over 5 years = $9.7m per MW per year.
  assert.ok(Math.abs(CONTRACT_ECONOMICS['iren-msft'].revenuePerMwYearM - 9.7) < 1e-6);
});

test('quarterly revenue equals capacity x rate x utilisation / 4', () => {
  const p = project({ tranches: [TRANCHE()], assumptions: A, startQuarter: START, quarters: 8 });
  assert.equal(p.available, true);
  const live = p.rows.find(r => r.billableMw > 0);
  assert.equal(live.billableMw, 100);
  assert.ok(Math.abs(live.revenueM - (100 * 2.37 * 0.95) / 4) < 0.02);
});

test('ownership percentage scales delivered capacity and revenue', () => {
  const full = project({ tranches: [TRANCHE()], assumptions: A, startQuarter: START, quarters: 8 });
  const half = project({ tranches: [TRANCHE({ ownershipPct: 0.5 })], assumptions: A, startQuarter: START, quarters: 8 });
  const f = full.rows.find(r => r.billableMw > 0);
  const h = half.rows.find(r => r.billableMw > 0);
  assert.equal(h.billableMw, f.billableMw / 2);
  assert.ok(Math.abs(h.revenueM - f.revenueM / 2) < 0.01);
});

/* ================= gate invariants ================= */

test('a cancelled tranche produces no future delivery or revenue', () => {
  // The scenario still evaluates — it simply delivers nothing.
  const p = project({ tranches: [TRANCHE({ cancelled: true })], assumptions: A, startQuarter: START, quarters: 12 });
  assert.equal(p.available, true);
  assert.ok(p.rows.every(r => r.billableMw === 0 && r.revenueM === 0 && r.operationalMw === 0),
    'a cancelled tranche must contribute no capacity and no revenue in any quarter');

  const mixed = project({
    tranches: [TRANCHE(), TRANCHE({ id: 't2', cancelled: true })],
    assumptions: A, startQuarter: START, quarters: 12
  });
  const totalBillable = mixed.rows.reduce((a, r) => a + r.billableMw, 0);
  const onlyLive = project({ tranches: [TRANCHE()], assumptions: A, startQuarter: START, quarters: 12 })
    .rows.reduce((a, r) => a + r.billableMw, 0);
  assert.equal(totalBillable, onlyLive, 'the cancelled tranche must contribute nothing');
});

test('acceptance cannot precede energisation', () => {
  const bad = TRANCHE({ energisedAt: '2027-06-30', acceptedAt: '2027-01-01', revenueFrom: '2027-01-01' });
  assert.equal(billableMwAt(bad, quarterIndex({ year: 2027, q: 3 })), 0);
});

test('no revenue before the revenue-commencement quarter', () => {
  const t = TRANCHE({ revenueFrom: '2027-09-30' });
  assert.equal(billableMwAt(t, quarterIndex({ year: 2027, q: 2 })), 0);
  assert.equal(billableMwAt(t, quarterIndex({ year: 2027, q: 3 })), 100);
});

test('revenue defaults to the acceptance date, and is never billable without either', () => {
  // revenueFrom falls back to acceptedAt — acceptance is what starts the clock.
  const fallsBack = TRANCHE({ revenueFrom: null, acceptedAt: '2027-03-31' });
  assert.equal(fallsBack.revenueFrom, '2027-03-31');
  assert.equal(billableMwAt(fallsBack, quarterIndex({ year: 2027, q: 3 })), 100);

  // With neither, there is nothing to bill for.
  const neither = TRANCHE({ revenueFrom: null, acceptedAt: null });
  assert.equal(neither.revenueFrom, null);
  assert.equal(billableMwAt(neither, quarterIndex({ year: 2030, q: 1 })), 0);
});

test('unknown capacity is never treated as zero revenue-bearing capacity', () => {
  const t = TRANCHE({ capacityMw: null });
  assert.equal(billableMwAt(t, quarterIndex({ year: 2028, q: 1 })), 0);
  const p = project({ tranches: [t], assumptions: A, startQuarter: START, quarters: 8 });
  // it still reports as available (it has a rate) but contributes nothing
  assert.equal(p.rows.every(r => r.billableMw === 0), true);
});

/* ================= directional invariants ================= */

test('later delivery never improves value under identical assumptions', () => {
  const early = runScenario({ tranches: [TRANCHE({ revenueFrom: '2026-12-31' })], assumptions: A, balance: BAL, startQuarter: START });
  const late = runScenario({ tranches: [TRANCHE({ revenueFrom: '2028-12-31' })], assumptions: A, balance: BAL, startQuarter: START });
  assert.ok(late.valuation.equityValueM <= early.valuation.equityValueM,
    'delaying revenue must not increase equity value');
});

test('higher capex never improves equity value', () => {
  const base = runScenario({ tranches: [TRANCHE()], assumptions: A, balance: BAL, startQuarter: START });
  const worse = runScenario({ tranches: [TRANCHE()], assumptions: { ...A, capexOverrun: 0.3 }, balance: BAL, startQuarter: START });
  assert.ok(worse.valuation.equityValueM <= base.valuation.equityValueM);
  // Strictly worse, not merely no better. A terminal run-rate multiple cannot see
  // capex on its own, so this only holds because the funded debt reaches the bridge.
  assert.ok(worse.valuation.equityValueM < base.valuation.equityValueM,
    'a 30% capex overrun must reduce equity value, not leave it unchanged');
});

test('new debt raised to fund the build is deducted in the equity bridge', () => {
  const run = runScenario({
    tranches: [TRANCHE()], assumptions: { ...A, capexOverrun: 0.3 },
    balance: BAL, startQuarter: START
  });
  assert.ok(run.funding.debtM > 0, 'the scenario should need funding at all');
  assert.equal(run.valuation.newDebtM, run.funding.debtM);
  const line = run.valuation.bridge.find(b => /new debt/i.test(b.label));
  assert.ok(line, 'the bridge must name the new debt explicitly');
  assert.equal(line.valueM, -run.funding.debtM);
  // The bridge must reconcile to the stated equity value.
  const summed = run.valuation.bridge.reduce((s, b) => s + b.valueM, 0);
  assert.ok(Math.abs(summed - run.valuation.equityValueM) < 0.5,
    `bridge sums to ${summed} but equity value is ${run.valuation.equityValueM}`);
});

test('funding entirely by equity leaves the bridge untouched but dilutes', () => {
  const debtFunded = runScenario({
    tranches: [TRANCHE()], assumptions: { ...A, capexOverrun: 0.3, debtShareOfCapex: 1 },
    balance: { ...BAL, equityIssuePrice: 4 }, startQuarter: START
  });
  const equityFunded = runScenario({
    tranches: [TRANCHE()], assumptions: { ...A, capexOverrun: 0.3, debtShareOfCapex: 0 },
    balance: { ...BAL, equityIssuePrice: 4 }, startQuarter: START
  });
  assert.equal(equityFunded.valuation.newDebtM, 0);
  assert.ok(equityFunded.valuation.equityValueM > debtFunded.valuation.equityValueM,
    'equity funding must not reduce aggregate equity value the way debt does');
  assert.ok(equityFunded.funding.dilutionPct > debtFunded.funding.dilutionPct,
    'but it must cost more dilution');
});

test('a funding shortfall probability is withheld when no cash balance is supplied', () => {
  const withoutCash = simulate({
    tranches: [TRANCHE()], assumptions: A, balance: { ...BAL, cashM: null },
    startQuarter: START, paths: 40, seed: 7
  });
  assert.equal(withoutCash.fundingShortfallAvailable, false);
  assert.equal(withoutCash.probabilityFundingShortfall, null);

  const withCash = simulate({
    tranches: [TRANCHE()], assumptions: A, balance: { ...BAL, cashM: 250 },
    startQuarter: START, paths: 40, seed: 7
  });
  assert.equal(withCash.fundingShortfallAvailable, true);
  assert.equal(typeof withCash.probabilityFundingShortfall, 'number');
});

test('more dilution never improves per-share value', () => {
  const base = runScenario({ tranches: [TRANCHE()], assumptions: A, balance: BAL, startQuarter: START });
  const diluted = runScenario({
    tranches: [TRANCHE()], assumptions: { ...A, capexOverrun: 0.5, debtShareOfCapex: 0 },
    balance: { ...BAL, equityIssuePrice: 4 }, startQuarter: START
  });
  if (base.perShare.available && diluted.perShare.available) {
    assert.ok(diluted.perShare.perShare <= base.perShare.perShare);
    assert.ok(diluted.funding.dilutionPct >= base.funding.dilutionPct);
  }
});

test('lower utilisation never increases revenue', () => {
  const hi = runScenario({ tranches: [TRANCHE()], assumptions: A, balance: BAL, startQuarter: START });
  const lo = runScenario({ tranches: [TRANCHE()], assumptions: { ...A, utilisation: 0.6 }, balance: BAL, startQuarter: START });
  assert.ok(lo.valuation.runRate.revenueM <= hi.valuation.runRate.revenueM);
});

/* ================= funding and the equity bridge ================= */

test('funding gap nets existing cash and splits into debt and equity', () => {
  const p = project({ tranches: [TRANCHE()], assumptions: A, startQuarter: START, quarters: 8 });
  const f = funding({ projection: p, assumptions: A, balance: BAL });
  assert.equal(f.available, true);
  assert.ok(f.peakDeficitM > 0, 'building 100 MW should require funding');
  assert.equal(f.fundingGapM, Math.max(0, +(f.peakDeficitM - BAL.cashM).toFixed(2)));
  assert.ok(Math.abs(f.debtM + f.equityM - f.fundingGapM) < 0.01);
  assert.ok(Math.abs(f.debtM / f.fundingGapM - A.debtShareOfCapex) < 1e-6);
});

test('per-share is unavailable — never guessed — without a share count', () => {
  const p = project({ tranches: [TRANCHE()], assumptions: A, startQuarter: START, quarters: 8 });
  const f = funding({ projection: p, assumptions: A, balance: { cashM: 100 } });
  assert.equal(f.perShareAvailable, false);
  assert.match(f.perShareMissing.join(' '), /share count/i);
  const v = valuation({ projection: p, assumptions: A, balance: { cashM: 100 } });
  assert.equal(perShare({ valuationResult: v, fundingResult: f }).available, false);
});

test('the enterprise-to-equity bridge is explicit and adds up', () => {
  const p = project({ tranches: [TRANCHE()], assumptions: A, startQuarter: START, quarters: 8 });
  const v = valuation({ projection: p, assumptions: A, balance: BAL });
  const sum = v.bridge.reduce((a, b) => a + b.valueM, 0);
  assert.ok(Math.abs(sum - v.equityValueM) < 0.02, 'bridge lines must reconcile to equity value');
  assert.equal(v.equityValueM, +(v.enterpriseValueM + BAL.cashM - BAL.debtM).toFixed(2));
});

test('valuation methods are never silently blended', () => {
  const p = project({ tranches: [TRANCHE()], assumptions: A, startQuarter: START, quarters: 8 });
  const a = valuation({ projection: p, assumptions: A, balance: BAL });
  const b = valuation({ projection: p, assumptions: { ...A, valuationMethod: 'evRevenue' }, balance: BAL });
  assert.equal(a.method, 'evEbitda');
  assert.equal(b.method, 'evRevenue');
  assert.notEqual(a.enterpriseValueM, b.enterpriseValueM);
  assert.equal(valuation({ projection: p, assumptions: { ...A, valuationMethod: 'nope' }, balance: BAL }).available, false);
});

test('EV/EBITDA equals annualised run-rate EBITDA times the multiple', () => {
  const p = project({ tranches: [TRANCHE()], assumptions: A, startQuarter: START, quarters: 12 });
  const rr = terminalRunRate(p);
  const v = valuation({ projection: p, assumptions: A, balance: BAL });
  assert.ok(Math.abs(v.enterpriseValueM - rr.ebitdaM * A.evEbitdaMultiple) < 0.05);
});

/* ================= reverse solver ================= */

test('the solver finds the capacity a valuation would require', () => {
  const base = runScenario({ tranches: [TRANCHE()], assumptions: A, balance: BAL, startQuarter: START });
  const target = base.valuation.equityValueM * 1.6;
  const s = solveFor({
    variable: 'billableMwMultiplier', targetEquityValueM: target,
    tranches: [TRANCHE()], assumptions: A, balance: BAL, startQuarter: START
  });
  assert.equal(s.solved, true);
  assert.ok(s.value > 1, 'a higher valuation needs more capacity');
  assert.ok(Math.abs(s.achievedEquityValueM - target) < 2);
  assert.ok(s.heldConstant, 'the solver must report what it held constant');
});

test('the solver reports honestly when no solution exists', () => {
  const s = solveFor({
    variable: 'ebitdaMargin', targetEquityValueM: 1e9,
    tranches: [TRANCHE()], assumptions: A, balance: BAL, startQuarter: START
  });
  assert.equal(s.solved, false);
  assert.match(s.reason, /No value of|below what/i);
  assert.ok(s.searched, 'it should state the range it searched');
});

test('every solvable variable is bounded and labelled', () => {
  for (const [k, spec] of Object.entries(SOLVABLE)) {
    assert.ok(spec.label, `${k} needs a label`);
    assert.ok(spec.min < spec.max, `${k} needs a sane range`);
  }
});

test('requirement classification separates evidenced from unsupported', () => {
  assert.equal(classifyRequirement({ requiredMw: 40, evidencedMw: 50, contractedMw: 260 }), 'evidenced');
  assert.equal(classifyRequirement({ requiredMw: 200, evidencedMw: 50, contractedMw: 260 }), 'plausible');
  assert.equal(classifyRequirement({ requiredMw: 5000, evidencedMw: 50, contractedMw: 260 }), 'unsupported');
  assert.equal(classifyRequirement({ requiredMw: null, evidencedMw: 50, contractedMw: 260 }), 'modelDependent');
});

/* ================= simulation ================= */

test('seeded simulation is reproducible', () => {
  const args = { tranches: [TRANCHE()], assumptions: A, balance: BAL, startQuarter: START, paths: 400, seed: 42 };
  const a = simulate(args), b = simulate(args);
  assert.deepEqual(a.equityValueM, b.equityValueM);
  assert.equal(a.paths, b.paths);
  const c = simulate({ ...args, seed: 43 });
  assert.notDeepEqual(a.equityValueM, c.equityValueM, 'a different seed must give a different draw');
});

test('percentiles come back in order', () => {
  const r = simulate({ tranches: [TRANCHE()], assumptions: A, balance: BAL, startQuarter: START, paths: 800, seed: 7 });
  const b = r.equityValueM;
  assert.ok(b.p10 <= b.p25 && b.p25 <= b.p50 && b.p50 <= b.p75 && b.p75 <= b.p90);
  if (r.perShareAvailable) {
    const s = r.perShare;
    assert.ok(s.p10 <= s.p25 && s.p25 <= s.p50 && s.p50 <= s.p75 && s.p75 <= s.p90);
  }
});

test('percentile helper interpolates and handles edges', () => {
  const xs = [1, 2, 3, 4, 5];
  assert.equal(percentile(xs, 0), 1);
  assert.equal(percentile(xs, 1), 5);
  assert.equal(percentile(xs, 0.5), 3);
  assert.equal(percentile([], 0.5), null);
});

test('the simulation never presents itself as a forecast', () => {
  const r = simulate({ tranches: [TRANCHE()], assumptions: A, balance: BAL, startQuarter: START, paths: 200, seed: 3 });
  assert.match(r.caution, /not a forecast/i);
  assert.match(r.caution, /not investment advice/i);
});

test('probability above a price is only computed when per-share exists', () => {
  const withShares = simulate({ tranches: [TRANCHE()], assumptions: A, balance: BAL, startQuarter: START, paths: 300, seed: 5, currentPrice: 5 });
  assert.ok(withShares.probabilityAbovePrice !== null);
  const without = simulate({ tranches: [TRANCHE()], assumptions: A, balance: { cashM: 10 }, startQuarter: START, paths: 300, seed: 5, currentPrice: 5 });
  assert.equal(without.probabilityAbovePrice, null);
});

test('the RNG is deterministic for a seed', () => {
  const a = makeRng(1), b = makeRng(1);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
});

/* ================= stress tests ================= */

test('every stress test moves value in the expected direction', () => {
  const args = { tranches: [TRANCHE()], assumptions: A, balance: BAL, startQuarter: START };
  for (const key of Object.keys(STRESS_TESTS)) {
    const r = stress({ test: key, ...args });
    assert.equal(r.available, true, `${key} should evaluate`);
    assert.ok(r.stressedEquityValueM <= r.baseEquityValueM + 0.01,
      `${key} should not improve equity value`);
  }
  assert.equal(stress({ test: 'nope', ...args }).available, false);
});

test('dropping uncontracted capacity removes only uncontracted tranches', () => {
  const tranches = [TRANCHE(), TRANCHE({ id: 't2', contracted: false })];
  const r = stress({ test: 'noNewContract', tranches, assumptions: A, balance: BAL, startQuarter: START });
  assert.ok(r.deltaM <= 0);
});

/* ================= sensitivity ================= */

test('the sensitivity grid varies two axes and reports what was held constant', () => {
  const g = sensitivityGrid({
    xVar: 'ebitdaMargin', xValues: [0.5, 0.7],
    yVar: 'evEbitdaMultiple', yValues: [10, 14, 18],
    tranches: [TRANCHE()], assumptions: A, balance: BAL, startQuarter: START
  });
  assert.equal(g.cells.length, 3);
  assert.equal(g.cells[0].length, 2);
  // monotonic in both directions
  assert.ok(g.cells[0][1] > g.cells[0][0]);
  assert.ok(g.cells[2][0] > g.cells[0][0]);
  assert.ok(g.heldConstant);
});

/* ================= coverage honesty ================= */

test('Lab coverage matches which companies actually disclose contract terms', () => {
  assert.equal(LAB_COVERAGE.iren.ready, true);
  assert.equal(LAB_COVERAGE.terawulf.ready, true);
  assert.equal(LAB_COVERAGE['applied-digital'].ready, true);
  // These three cannot support a derived rate and must say so.
  for (const id of ['coreweave', 'nebius', 'keel']) {
    assert.equal(LAB_COVERAGE[id].ready, false, `${id} should not claim Lab readiness`);
    assert.equal(LAB_COVERAGE[id].revenueBasis, null);
    assert.ok(LAB_COVERAGE[id].note.length > 30, `${id} must explain why`);
  }
});

test('every contract economic cites a source and shows its derivation', () => {
  for (const [id, e] of Object.entries(CONTRACT_ECONOMICS)) {
    assert.ok(e.sourceIds?.length, `${id} has no source`);
    assert.ok(e.derivation, `${id} has no stated derivation`);
    assert.ok(e.revenuePerMwYearM > 0, `${id} has no rate`);
  }
});

test('an unavailable scenario explains itself rather than returning zeros', () => {
  const r = runScenario({ tranches: [], assumptions: A, balance: BAL, startQuarter: START });
  assert.equal(r.available, false);
  assert.ok(r.missing.length);
  assert.equal(r.valuation, undefined, 'no valuation should be produced from nothing');
});
