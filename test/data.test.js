import test from 'node:test';
import assert from 'node:assert/strict';

import { runChecks } from '../src/lib/validate.js';
import { COMPANIES } from '../data/companies.js';
import { PROJECTS, CONTRACTS } from '../data/projects.js';
import { EVENTS } from '../data/events.js';
import { CATALYSTS } from '../data/catalysts.js';
import { windowFor, GATE_BY_ID } from '../data/schema.js';
import { SOURCE_BY_ID } from '../data/sources.js';
import { getMeasure, isKnown, aggregate, headlineKpis, byCountry, gateSummary, dataHealth, slip, timeline, deliveryRecord } from '../src/lib/compute.js';

const co = id => COMPANIES.find(c => c.id === id);

test('all data integrity rules pass', () => {
  const { errors } = runChecks();
  assert.deepEqual(errors, [], `validation errors:\n${errors.join('\n')}`);
});

/* ---------------- Phase 2: company corrections ---------------- */

test('CoreWeave carries both Q2 figures and the 4.2 GW subsequent event', () => {
  const c = co('coreweave');
  const secured = getMeasure(c, 'securedPowerMw');
  const active = getMeasure(c, 'energisedCriticalItMw');

  assert.equal(secured.valueMw, 4200, 'contracted power should be the 11 Aug 4.2 GW figure');
  assert.equal(secured.asOf, '2026-08-11');
  assert.equal(active.valueMw, 1500);
  assert.equal(active.asOf, '2026-06-30');
  assert.equal(active.powerBasis, 'critical-it');
  assert.equal(secured.powerBasis, 'gross-utility');

  // the 3.7 -> 4.2 change must be preserved in the ledger
  const ev = EVENTS.find(e => e.id === 'crwv-2026-08-11-contracted-4200');
  assert.ok(ev, 'ledger must preserve the 3.7 GW to 4.2 GW change');
  assert.equal(ev.previousValue, 3700);
  assert.equal(ev.newValue, 4200);

  // backlog is a dollar figure and must never be a MW measure
  const backlog = CONTRACTS.find(k => k.id === 'crwv-backlog');
  assert.equal(backlog.valueBn, 104.2);
  assert.equal(backlog.mw, null);
});

test('IREN: 260 MW is a minimum, 50 MW accepted, no revenue-live, no GPU count', () => {
  const c = co('iren');
  const contracted = getMeasure(c, 'customerContractedMw');
  assert.equal(contracted.valueMw, 260);
  assert.equal(contracted.valueStatus, 'minimum');
  assert.equal(contracted.isExhaustive, false, 'must not claim to be an exhaustive company total');

  const accepted = getMeasure(c, 'customerAcceptedMw');
  assert.equal(accepted.valueMw, 50);
  assert.equal(accepted.confidence, 'confirmed');

  // acceptance must not imply revenue
  assert.equal(getMeasure(c, 'revenueLiveMw').valueMw, null);

  // 480 MW is a target, not construction
  assert.equal(getMeasure(c, 'constructionMw').valueMw, null);
  const target = (c.targets || []).find(t => t.metric === 'constructionMw');
  assert.equal(target.valueMw, 480);
  assert.equal(target.valueStatus, 'target');

  // the GPU claim is gone
  assert.equal(getMeasure(c, 'gpuReadyMw').valueMw, null);
  const text = JSON.stringify(CONTRACTS.filter(k => k.companyId === 'iren'));
  assert.ok(!/76,?000/.test(text), '76,000 GPU claim must not appear in contract terms');
});

test('Nebius: 310 MW is planned capacity, not energised; 5 GW is a target', () => {
  const c = co('nebius');
  assert.equal(getMeasure(c, 'energisedCriticalItMw').valueMw, null,
    '310 MW must no longer be recorded as energised critical IT');

  const secured = getMeasure(c, 'securedPowerMw');
  assert.equal(secured.valueMw, 3500);
  assert.equal(secured.valueStatus, 'minimum', '"more than 3.5 GW" is a floor');

  const target = (c.targets || []).find(t => t.metric === 'securedPowerMw');
  assert.equal(target.valueMw, 5000);
  assert.equal(target.valueStatus, 'target');

  // Finland now sits in projects as planned capacity
  const fin = PROJECTS.find(p => p.id === 'nbis-mantsala');
  assert.equal(fin.capacityMw, 310);
  assert.equal(fin.valueStatus, 'target');

  // Meta maximum must be conditional, never committed
  const meta = CONTRACTS.find(k => k.id === 'nbis-meta');
  assert.equal(meta.valueBn, 12);
  assert.equal(meta.valueMaxBn, 27);
  assert.equal(meta.conditional, true);
});

test('TeraWulf: 839 MW minimum, 102 MW revenue-live, stale figures kept as history', () => {
  const c = co('terawulf');
  const contracted = getMeasure(c, 'customerContractedMw');
  assert.equal(contracted.valueMw, 839, '438 Lake Mariner + 401 Anthropic');
  assert.equal(contracted.valueStatus, 'minimum');

  assert.equal(getMeasure(c, 'revenueLiveMw').valueMw, 102);
  assert.equal(getMeasure(c, 'constructionMw').valueMw, 336);

  // February figures retained, dated, and out of current measures
  const hist = c.historical || [];
  assert.ok(hist.find(h => h.valueMw === 2200 && h.asOf === '2026-02-01'));
  assert.ok(hist.find(h => h.valueMw === 642.5 && h.asOf === '2026-02-01'));
  assert.equal(getMeasure(c, 'securedPowerMw').valueMw, null);

  // Muskie is power availability, not contracted critical IT
  const muskie = PROJECTS.find(p => p.id === 'wulf-muskie');
  assert.equal(muskie.valueStatus, 'potential');
  assert.equal(muskie.powerBasis, 'gross-utility');

  // Abernathy disposal recorded
  assert.ok(EVENTS.find(e => e.id === 'wulf-2026-08-04-abernathy'));

  // Anthropic contract present with the right terms
  const anth = CONTRACTS.find(k => k.id === 'wulf-anthropic');
  assert.equal(anth.mw, 401);
  assert.equal(anth.years, 20);
  assert.equal(anth.valueBn, 19);

  // unsupported accelerator wording removed
  const text = JSON.stringify(CONTRACTS);
  assert.ok(!/tenant-supplied/i.test(text), '"tenant-supplied accelerators" must be gone');
});

test('Keel: 648 MW secured, 1,513 MW pipeline, contracted is null not zero', () => {
  const c = co('keel');
  assert.equal(getMeasure(c, 'securedPowerMw').valueMw, 648);
  assert.equal(getMeasure(c, 'pipelinePowerMw').valueMw, 1513);
  assert.equal(getMeasure(c, 'pipelinePowerMw').valueStatus, 'pipeline');

  const contracted = getMeasure(c, 'customerContractedMw');
  assert.equal(contracted.valueMw, null, 'must be null, never numeric zero');
  assert.equal(contracted.confidence, 'unknown');
  assert.equal(c.contractedLabel, 'No announced lease');

  // Sharon is gross site capacity, not 110 MW of critical IT under construction
  const sharon = PROJECTS.find(p => p.id === 'keel-sharon');
  assert.equal(sharon.capacityMw, 110);
  assert.equal(sharon.powerBasis, 'gross-utility');

  // Scrubgrass is potential, not secured
  assert.equal(PROJECTS.find(p => p.id === 'keel-scrubgrass').valueStatus, 'potential');
  // Sherbrooke conditional status visible
  assert.equal(PROJECTS.find(p => p.id === 'keel-sherbrooke').valueStatus, 'potential');
  // Moses Lake 18 MW
  assert.equal(PROJECTS.find(p => p.id === 'keel-moses-lake').capacityMw, 18);
});

test('Applied Digital: 1,410 MW across five itemised campuses', () => {
  const c = co('applied-digital');
  assert.equal(getMeasure(c, 'customerContractedMw').valueMw, 1410);
  assert.equal(getMeasure(c, 'customerContractedMw').isExhaustive, true);
  assert.equal(getMeasure(c, 'securedPowerMw').valueMw, 2150);
  assert.equal(getMeasure(c, 'energisedCriticalItMw').valueMw, 100);
  assert.equal(getMeasure(c, 'revenueLiveMw').valueMw, 100);

  const campuses = PROJECTS.filter(p => p.companyId === 'applied-digital');
  assert.equal(campuses.length, 5, 'all five campuses must be present');
  const mws = campuses.map(p => p.capacityMw).sort((a, b) => a - b);
  assert.deepEqual(mws, [200, 210, 300, 300, 400]);
  // the five leases sum to the disclosed contracted total
  assert.equal(mws.reduce((a, b) => a + b, 0), 1410);
});

/* ---------------- Phase 3: KPI logic ---------------- */

test('customer-contracted confirmed minimum is >= 2.51 GW on one basis', () => {
  const k = aggregate('customerContractedMw', { basis: 'critical-it' });
  assert.equal(k.total, 260 + 839 + 1410);
  assert.ok(k.total >= 2509, `expected >= 2.51 GW, got ${k.total}`);
  assert.equal(k.isMinimum, true, 'IREN and TeraWulf are minimums, so the aggregate is a minimum');
  assert.equal(k.contributorCount, 3);
  // CoreWeave, Nebius and Keel do not disclose MW
  assert.equal(k.missingCount, 3);
  assert.deepEqual(k.included.map(i => i.ticker).sort(), ['APLD', 'IREN', 'WULF']);
});

test('energised critical IT confirmed minimum is >= 1.75 GW', () => {
  const k = aggregate('energisedCriticalItMw', { basis: 'critical-it' });
  assert.equal(k.total, 1500 + 102 + 100 + 50, 'CRWV 1500 + WULF 102 + APLD 100 + IREN Horizon 1 50');
  assert.ok(k.total >= 1750, `expected >= 1.75 GW, got ${k.total}`);
});

test('customer accepted is 50 MW sourced to IREN Horizon 1', () => {
  const k = aggregate('customerAcceptedMw', { basis: 'critical-it' });
  assert.equal(k.total, 50);
  assert.equal(k.contributorCount, 1);
  assert.equal(k.included[0].ticker, 'IREN');
  const src = k.included[0].sourceIds.map(id => SOURCE_BY_ID[id]);
  assert.ok(src.some(s => /horizon/i.test(s.title)));
});

test('aggregates never mix power bases and never include targets', () => {
  for (const kpi of headlineKpis()) {
    const bases = new Set(kpi.included.map(i => i.powerBasis));
    assert.ok(bases.size <= 1, `${kpi.metric} mixed bases`);
    for (const i of kpi.included) {
      assert.ok(['actual', 'minimum'].includes(i.valueStatus), `${kpi.metric} included a ${i.valueStatus}`);
    }
  }
  // Nebius must contribute its measured 3.5 GW floor, never its 5 GW year-end target.
  // (IREN's genuine secured portfolio is also 5,000 MW, so this checks the ticker.)
  const secured = aggregate('securedPowerMw', { basis: 'gross-utility' });
  const nbis = secured.included.find(i => i.ticker === 'NBIS');
  assert.equal(nbis.value, 3500, 'Nebius should contribute its measured figure, not its target');
  assert.ok(!secured.included.some(i => i.valueStatus === 'target'), 'a target reached the aggregate');
});

test('unknown values are excluded, never zeroed, and are counted', () => {
  const k = aggregate('customerAcceptedMw', { basis: 'critical-it' });
  assert.equal(k.contributorCount + k.missingCount + k.excludedCount, k.companyCount);
  assert.ok(k.missingCount > 0);
  for (const c of COMPANIES) {
    for (const m of c.measures) if (m.valueMw === null) assert.equal(m.confidence, 'unknown');
  }
});

test('every confirmed value has a primary source, verifiedAt and an as-of date', () => {
  for (const c of COMPANIES) {
    for (const m of [...(c.measures || []), ...(c.targets || []), ...(c.historical || [])]) {
      if (m.confidence !== 'confirmed') continue;
      assert.ok(m.sourceIds.length, `${c.ticker}/${m.metric} has no source`);
      assert.ok(m.sourceIds.map(id => SOURCE_BY_ID[id]).some(s => s.isPrimary),
        `${c.ticker}/${m.metric} has no primary source`);
      assert.ok(m.verifiedAt, `${c.ticker}/${m.metric} has no verifiedAt`);
      assert.ok(m.asOf, `${c.ticker}/${m.metric} has no as-of date`);
    }
  }
});

/* ---------------- Phase 4: country split ---------------- */

test('country rollup keeps power bases in separate columns', () => {
  const { rows, totals } = byCountry();
  assert.ok(rows.length > 0);
  // no single column may contain both bases: gross and critical IT are tracked apart
  for (const r of rows) {
    assert.ok(typeof r.grossUtility === 'number' && typeof r.criticalIt === 'number');
  }
  // planned/potential is its own column and is not inside the actual columns
  assert.ok(totals.plannedPotential > 0, 'planned capacity should be tracked separately');
});

/* ---------------- gates ---------------- */

test('gates advance independently — Panther Creek proves the case', () => {
  const p = PROJECTS.find(x => x.id === 'keel-panther-creek');
  const byId = Object.fromEntries(gateSummary(p).rows.map(r => [r.id, r]));
  // Power and zoning are done; environment is not; the building has not started.
  assert.equal(byId.utilityAgreement.status, 'complete');
  assert.equal(byId.zoning.status, 'complete');
  assert.equal(byId.environmental.status, 'inProgress');
  assert.equal(byId.constructionStarted.status, 'notStarted',
    'the data centre itself must not be marked under construction');
});

test('a regulatory approval is not scored wider than it is', () => {
  // FERC authorised TeraWulf to BUY the Morgantown plant. That is not permission
  // to build a data centre on it, and the gates must not imply otherwise.
  const p = PROJECTS.find(x => x.id === 'wulf-chesapeake');
  const byId = Object.fromEntries(gateSummary(p).rows.map(r => [r.id, r]));

  assert.equal(byId.regulatoryApproval.status, 'inProgress',
    'a narrow federal approval must not read as fully approved');
  assert.equal(byId.regulatoryApproval.confidence, 'confirmed');
  assert.equal(byId.regulatoryApproval.effectiveAt, '2026-07-29');
  assert.match(byId.regulatoryApproval.notes, /separate review/i);
  assert.equal(byId.criticalItEnergised.status, 'notStarted');

  // and it is evidenced by the regulator itself, not only the company
  const src = byId.regulatoryApproval.sourceIds.map(id => SOURCE_BY_ID[id]);
  assert.ok(src.some(s => s.sourceType === 'regulator'), 'must cite the regulator');
  assert.ok(src.every(s => s.isPrimary));
});

test('the source register now includes non-company primary sources', () => {
  const types = new Set(Object.values(SOURCE_BY_ID).map(s => s.sourceType));
  assert.ok(types.has('regulator'), 'a regulator source should be registered');
  const ferc = SOURCE_BY_ID['ferc-ec26-58-morgantown'];
  assert.equal(ferc.isPrimary, true);
  assert.equal(ferc.publishedAt, '2026-07-29');
  assert.match(ferc.url, /ferc\.gov/, 'should link the regulator, not a news copy');
});

test('customer acceptance always carries an acceptance source', () => {
  for (const p of PROJECTS) {
    const a = (p.gates || []).find(g => g.id === 'customerAccepted');
    if (a?.status === 'complete') assert.ok(a.sourceIds.length, `${p.id} accepted without a source`);
  }
});

/* ---------------- catalysts ---------------- */

test('guided windows never carry a false exact date', () => {
  for (const c of CATALYSTS) {
    if (c.status === 'guided-window') {
      assert.equal(c.expectedAt, null, `${c.id} must not have an exact date`);
      assert.ok(c.expectedWindowStart && c.expectedWindowEnd);
    }
    if (c.status === 'confirmed-date') assert.ok(c.expectedAt);
    assert.ok(c.sourceIds.length, `${c.id} has no source`);
  }
});

test('data health reports coverage honestly', () => {
  const h = dataHealth();
  assert.ok(h.confirmed > 0);
  assert.equal(h.unsourced, 0, 'no unsourced values should remain after the audit');
  assert.ok(h.notDisclosed > 0, 'undisclosed figures must be counted, not hidden');
});

/* ---------------- delivery schedules ---------------- */

test('guided windows are stored as windows, never as false exact dates', () => {
  for (const p of PROJECTS) {
    for (const s of p.schedules || []) {
      if (s.kind === 'window') {
        assert.ok(s.start && s.end, `${p.id}/${s.gate} window without bounds`);
        assert.equal(s.exact, null, `${p.id}/${s.gate} window must not carry an exact date`);
        assert.ok(s.end > s.start);
      }
      assert.ok(s.announcedAt, `${p.id}/${s.gate} has no announcedAt`);
      assert.ok(s.sourceIds.length, `${p.id}/${s.gate} has no source`);
    }
  }
});

test('window labels resolve to the right bounds', () => {
  assert.deepEqual(windowFor('H2 2027'), { start: '2027-07-01', end: '2027-12-31' });
  assert.deepEqual(windowFor('Q1 2028'), { start: '2028-01-01', end: '2028-03-31' });
  assert.deepEqual(windowFor('2026'), { start: '2026-01-01', end: '2026-12-31' });
  assert.equal(windowFor('early 2027'), null, 'vague wording must not resolve silently');
});

test('hitting a guided window reads as hit, not as a spurious day count', () => {
  // IREN guided "Horizon 1-4 by year-end" and delivered Horizon 1 on 13 Aug 2026.
  const p = PROJECTS.find(x => x.id === 'iren-horizon-1');
  const s = slip(p, 'customerAccepted');
  assert.equal(s.outcome, 'withinWindow');
  assert.equal(s.days, null, 'a met window produces no day count');
  assert.equal(s.actual, '2026-08-13');
});

test('a sub-unit schedule is never scored against the project-level gate', () => {
  // Lake Mariner's CB-4 rent-commencement guidance measured against the
  // pre-existing 102 MW produced "early by 1 day" — an artifact, not a finding.
  const p = PROJECTS.find(x => x.id === 'wulf-lake-mariner');
  for (const t of timeline(p)) {
    assert.ok(t.current.scope, 'every Lake Mariner schedule names its building');
    assert.equal(t.outcome, 'pending');
    assert.equal(t.days, null);
    assert.equal(t.scoped, true);
  }
});

test('delivery hit rate is withheld below the minimum sample', () => {
  const r = deliveryRecord();
  assert.ok(r.scheduledCount > 0, 'schedules should exist');
  assert.equal(r.completedCount, 1, 'only IREN Horizon 1 is currently scoreable');
  assert.equal(r.sufficient, false, 'one outcome must not produce a published hit rate');
  assert.equal(r.completedCount + r.pendingCount, r.scheduledCount);
});

test('every scheduled gate exists in the gate model', () => {
  for (const p of PROJECTS) {
    for (const s of p.schedules || []) {
      assert.ok(GATE_BY_ID[s.gate], `${p.id} schedules unknown gate ${s.gate}`);
    }
  }
});
