/**
 * Data integrity rules, run by `npm test` and again by the build so a record that
 * breaks a promise to the reader cannot reach production.
 */
import { CONFIDENCE, METRICS, VALUE_STATUS, POWER_BASIS, GATE_BY_ID, GATE_STATUS } from '../../data/schema.js';
import { SOURCE_BY_ID, SOURCES } from '../../data/sources.js';
import { COMPANIES } from '../../data/companies.js';
import { PROJECTS, CONTRACTS } from '../../data/projects.js';
import { EVENTS, CORRECTIONS } from '../../data/events.js';
import { CATALYSTS, CATALYST_STATUS, CATALYST_CATEGORIES } from '../../data/catalysts.js';
import { allRecords, getMeasure, isKnown, aggregate, headlineKpis } from './compute.js';
import { MAX_TICKERS, normaliseSelection } from './compare.js';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const PRIMARY_TYPES = ['sec-filing', 'company-ir', 'customer-announcement', 'utility', 'regulator', 'planning-record'];

export function runChecks() {
  const errors = [], warnings = [];
  const fail = m => errors.push(m);
  const warn = m => warnings.push(m);

  /* ---------- sources ---------- */
  const sourceIds = new Set();
  for (const s of SOURCES) {
    if (sourceIds.has(s.id)) fail(`Duplicate source id: ${s.id}`);
    sourceIds.add(s.id);
    try {
      const u = new URL(s.url);
      if (!/^https?:$/.test(u.protocol)) fail(`Source ${s.id} has a non-http URL`);
    } catch { fail(`Source ${s.id} has a malformed URL: ${s.url}`); }
    if (!ISO.test(s.publishedAt)) fail(`Source ${s.id} publishedAt must be YYYY-MM-DD`);
    if (!ISO.test(s.accessedAt)) fail(`Source ${s.id} accessedAt must be YYYY-MM-DD`);
    if (!s.publisher) fail(`Source ${s.id} has no publisher`);
    if (s.isPrimary && !PRIMARY_TYPES.includes(s.sourceType)) {
      fail(`Source ${s.id} is marked primary but its type ${s.sourceType} is not a primary type`);
    }
    if (s.sourceType === 'secondary-news' && s.isPrimary) {
      fail(`Source ${s.id}: news can never be a primary source`);
    }
  }
  const known = id => sourceIds.has(id);

  /* ---------- company measures ---------- */
  const companyIds = new Set();
  for (const c of COMPANIES) {
    if (companyIds.has(c.id)) fail(`Duplicate company id ${c.id}`);
    companyIds.add(c.id);

    for (const m of allRecords(c)) {
      const where = `${c.ticker}/${m.metric}`;
      if (!METRICS[m.metric]) fail(`${where}: unknown metric`);
      if (!CONFIDENCE[m.confidence]) fail(`${where}: unknown confidence ${m.confidence}`);
      if (!VALUE_STATUS[m.valueStatus]) fail(`${where}: unknown valueStatus ${m.valueStatus}`);
      if (!POWER_BASIS[m.powerBasis]) fail(`${where}: unknown powerBasis ${m.powerBasis}`);

      for (const id of m.sourceIds || []) if (!known(id)) fail(`${where}: cites unknown source ${id}`);

      // null must stay null
      if (m.valueMw === null && m.confidence !== 'unknown') {
        fail(`${where}: a null value must carry confidence "unknown"`);
      }
      if (m.valueMw === 0 && m.confidence === 'unknown') {
        fail(`${where}: zero recorded with unknown confidence — a real zero needs evidence`);
      }

      if (m.confidence === 'confirmed') {
        if (!(m.sourceIds || []).length) fail(`${where}: confirmed without a source`);
        const primary = (m.sourceIds || []).map(id => SOURCE_BY_ID[id]).filter(Boolean).some(s => s.isPrimary);
        if (!primary) fail(`${where}: confirmed but cites no primary source`);
        if (!m.verifiedAt) fail(`${where}: confirmed without verifiedAt`);
        if (!m.asOf) fail(`${where}: confirmed without an as-of date`);
      }
      if (m.verifiedAt && !ISO.test(m.verifiedAt)) fail(`${where}: verifiedAt must be YYYY-MM-DD`);
      if (m.asOf && !ISO.test(m.asOf)) fail(`${where}: asOf must be YYYY-MM-DD`);
      if (m.verifiedAt && !(m.sourceIds || []).length) {
        fail(`${where}: has verifiedAt but no source to have verified against`);
      }
      if (isKnown(m) && !(m.sourceIds || []).length && !m.sourceRequired) {
        fail(`${where}: value without a source must set sourceRequired`);
      }
      // a power figure must say what it measures
      if (isKnown(m) && METRICS[m.metric].family !== 'customer' && m.powerBasis === 'not-applicable') {
        warn(`${where}: power figure with no measurement basis`);
      }
      // a minimum must not claim to be exhaustive
      if (m.valueStatus === 'minimum' && m.isExhaustive) {
        fail(`${where}: recorded as a disclosed minimum but flagged exhaustive`);
      }
    }

    // targets must never sit in the current measures array
    for (const m of c.measures || []) {
      if (m.valueStatus === 'target' || m.valueStatus === 'pipeline') {
        if (m.metric === 'pipelinePowerMw') continue; // pipeline metric is explicitly separate
        fail(`${c.ticker}/${m.metric}: ${m.valueStatus} value in current measures — move it to targets`);
      }
    }
    for (const m of c.targets || []) {
      if (m.valueStatus !== 'target') fail(`${c.ticker}/${m.metric}: non-target in the targets array`);
    }
  }

  /* ---------- aggregates ---------- */
  for (const kpi of headlineKpis()) {
    // reconcile to records
    const recomputed = kpi.included.reduce((a, x) => a + x.value, 0);
    if (Math.abs(recomputed - kpi.total) > 1e-9) {
      fail(`KPI ${kpi.metric} does not reconcile: ${kpi.total} vs ${recomputed}`);
    }
    // single basis
    const bases = new Set(kpi.included.map(i => i.powerBasis));
    if (bases.size > 1) fail(`KPI ${kpi.metric} mixes power bases: ${[...bases].join(', ')}`);
    // no non-current values
    for (const i of kpi.included) {
      if (!VALUE_STATUS[i.valueStatus].aggregatable) {
        fail(`KPI ${kpi.metric} includes a ${i.valueStatus} value from ${i.ticker}`);
      }
    }
    // contributor / exclusion accounting must be complete
    if (kpi.contributorCount + kpi.missingCount + kpi.excludedCount !== kpi.companyCount) {
      fail(`KPI ${kpi.metric}: contributors + missing + excluded != company count`);
    }
    if (kpi.sufficient && !kpi.asOfLatest) fail(`KPI ${kpi.metric}: no as-of date on any contributor`);
  }

  // a mixed-basis aggregate must throw rather than silently sum
  let threw = false;
  try { aggregate('securedPowerMw', { basis: null }); } catch { threw = true; }
  if (!threw) {
    const a = aggregate('securedPowerMw', { basis: null });
    const bases = new Set(a.included.map(i => i.powerBasis));
    if (bases.size > 1) fail('aggregate() summed multiple power bases without throwing');
  }

  /* ---------- projects and gates ---------- */
  const projectIds = new Set();
  for (const p of PROJECTS) {
    if (projectIds.has(p.id)) fail(`Duplicate project id ${p.id}`);
    projectIds.add(p.id);
    if (!companyIds.has(p.companyId)) fail(`Project ${p.id} references unknown company`);
    if (p.capacityMw !== null && !(p.capacityMw > 0)) fail(`Project ${p.id} has a non-positive capacity`);
    if (p.capacityMw !== null && !POWER_BASIS[p.powerBasis]) fail(`Project ${p.id} has no valid power basis`);
    if (p.capacityMw !== null && !VALUE_STATUS[p.valueStatus]) fail(`Project ${p.id} has no valid value status`);
    for (const id of p.sourceIds || []) if (!known(id)) fail(`Project ${p.id} cites unknown source ${id}`);

    for (const g of p.gates || []) {
      if (!GATE_BY_ID[g.id]) fail(`Project ${p.id}: unknown gate ${g.id}`);
      if (!GATE_STATUS[g.status]) fail(`Project ${p.id}/${g.id}: unknown status ${g.status}`);
      for (const id of g.sourceIds || []) if (!known(id)) fail(`Project ${p.id}/${g.id} cites unknown source ${id}`);
      if (g.status === 'complete' && g.confidence === 'confirmed' && !(g.sourceIds || []).length) {
        fail(`Project ${p.id}/${g.id}: confirmed complete without a source`);
      }
      if (g.effectiveAt && !ISO.test(g.effectiveAt)) fail(`Project ${p.id}/${g.id}: bad effectiveAt`);
    }
    // acceptance needs its own evidence
    const accepted = (p.gates || []).find(g => g.id === 'customerAccepted');
    if (accepted?.status === 'complete' && !(accepted.sourceIds || []).length) {
      fail(`Project ${p.id}: customer acceptance recorded without an acceptance source`);
    }
  }

  // company-level acceptance likewise
  for (const c of COMPANIES) {
    const m = getMeasure(c, 'customerAcceptedMw');
    if (isKnown(m) && !(m.sourceIds || []).length) {
      fail(`${c.ticker}: customer-accepted capacity without an acceptance source`);
    }
  }

  /* ---------- contracts ---------- */
  for (const k of CONTRACTS) {
    if (!companyIds.has(k.companyId)) fail(`Contract ${k.id} references unknown company`);
    for (const id of k.sourceIds || []) if (!known(id)) fail(`Contract ${k.id} cites unknown source ${id}`);
    if (k.confidence === 'confirmed' && !(k.sourceIds || []).length) fail(`Contract ${k.id}: confirmed without a source`);
    // a conditional maximum must be flagged so it is never shown as committed
    if (k.valueMaxBn && !k.conditional) {
      fail(`Contract ${k.id}: has a maximum value but is not flagged conditional`);
    }
    if (k.mw !== null && k.mw !== undefined && !POWER_BASIS[k.basis]) {
      fail(`Contract ${k.id}: MW figure with no measurement basis`);
    }
  }

  /* ---------- ledger ---------- */
  const eventIds = new Set();
  for (const e of EVENTS) {
    if (eventIds.has(e.id)) fail(`Duplicate event id ${e.id}`);
    eventIds.add(e.id);
    if (!companyIds.has(e.companyId)) fail(`Event ${e.id} references unknown company`);
    if (e.projectId && !projectIds.has(e.projectId)) fail(`Event ${e.id} references unknown project ${e.projectId}`);
    for (const id of e.sourceIds || []) if (!known(id)) fail(`Event ${e.id} cites unknown source ${id}`);
    if (e.confidence === 'confirmed' && !(e.sourceIds || []).length) fail(`Event ${e.id}: confirmed without a source`);
    if (!ISO.test(e.announcedAt)) fail(`Event ${e.id}: announcedAt must be YYYY-MM-DD`);
    if (e.effectiveAt && !ISO.test(e.effectiveAt)) fail(`Event ${e.id}: effectiveAt must be YYYY-MM-DD`);
    if (e.metric && !METRICS[e.metric]) fail(`Event ${e.id}: unknown metric ${e.metric}`);
  }

  /* ---------- catalysts ---------- */
  for (const c of CATALYSTS) {
    if (!companyIds.has(c.companyId)) fail(`Catalyst ${c.id} references unknown company`);
    if (!CATALYST_STATUS[c.status]) fail(`Catalyst ${c.id}: unknown status`);
    if (!CATALYST_CATEGORIES[c.category]) fail(`Catalyst ${c.id}: unknown category`);
    for (const id of c.sourceIds || []) if (!known(id)) fail(`Catalyst ${c.id} cites unknown source ${id}`);
    if (!(c.sourceIds || []).length) fail(`Catalyst ${c.id}: no source — a rumour is not a catalyst`);
    if (c.status === 'confirmed-date' && !c.expectedAt) {
      fail(`Catalyst ${c.id}: confirmed-date without an exact date`);
    }
    if (c.status === 'guided-window' && c.expectedAt) {
      fail(`Catalyst ${c.id}: guided window must not carry an exact date`);
    }
    if (c.status === 'guided-window' && !(c.expectedWindowStart && c.expectedWindowEnd)) {
      fail(`Catalyst ${c.id}: guided window without a window`);
    }
    for (const d of [c.expectedAt, c.expectedWindowStart, c.expectedWindowEnd]) {
      if (d && !ISO.test(d)) fail(`Catalyst ${c.id}: dates must be YYYY-MM-DD`);
    }
  }

  /* ---------- comparison ---------- */
  if (normaliseSelection(['IREN', 'CRWV', 'NBIS', 'WULF']).length > MAX_TICKERS) {
    fail(`Comparison allowed more than ${MAX_TICKERS} tickers`);
  }
  if (normaliseSelection(['IREN', 'IREN', 'CRWV']).length !== 2) {
    fail('Comparison did not de-duplicate repeated tickers');
  }

  /* ---------- corrections ---------- */
  for (const c of CORRECTIONS) if (!ISO.test(c.date)) fail(`Correction ${c.id}: bad date`);

  /* ---------- warnings ---------- */
  for (const c of COMPANIES) {
    const n = allRecords(c).filter(m => m.sourceRequired).length;
    if (n) warn(`${c.ticker}: ${n} value(s) awaiting a source`);
  }
  const unusedSources = SOURCES.filter(s => {
    const used = [
      ...COMPANIES.flatMap(c => allRecords(c).flatMap(m => m.sourceIds || [])),
      ...PROJECTS.flatMap(p => [...(p.sourceIds || []), ...(p.gates || []).flatMap(g => g.sourceIds || [])]),
      ...CONTRACTS.flatMap(k => k.sourceIds || []),
      ...EVENTS.flatMap(e => e.sourceIds || []),
      ...CATALYSTS.flatMap(c => c.sourceIds || [])
    ];
    return !used.includes(s.id);
  });
  for (const s of unusedSources) warn(`Source ${s.id} is registered but not cited by any record`);

  return { errors, warnings, ok: errors.length === 0 };
}
