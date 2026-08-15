/**
 * Data integrity rules, run by `npm test` and again at build time so a bad record
 * cannot reach production. These encode the promises the site makes to a reader.
 */
import { CONFIDENCE, METRICS, STAGE_BY_ID } from '../../data/schema.js';
import { COMPANIES } from '../../data/companies.js';
import { PROJECTS, CONTRACTS } from '../../data/projects.js';
import { EVENTS, CORRECTIONS } from '../../data/events.js';
import { getMeasure, isKnown, totalFor, headlineKpis } from './compute.js';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function runChecks() {
  const errors = [];
  const warnings = [];
  const fail = m => errors.push(m);
  const warn = m => warnings.push(m);

  // --- structural ------------------------------------------------------
  const ids = new Set();
  for (const c of COMPANIES) {
    if (ids.has(c.id)) fail(`Duplicate company id: ${c.id}`);
    ids.add(c.id);
    if (!c.slug || !c.ticker || !c.name) fail(`Company ${c.id} missing slug/ticker/name`);
    if (!['fullStack', 'poweredShell'].includes(c.model)) fail(`Company ${c.id} has bad model`);
  }

  for (const p of PROJECTS) {
    if (!ids.has(p.companyId)) fail(`Project ${p.id} references unknown company ${p.companyId}`);
    if (p.stage && !STAGE_BY_ID[p.stage]) fail(`Project ${p.id} has unknown stage ${p.stage}`);
    if (p.capacityMw !== null && !(p.capacityMw > 0)) fail(`Project ${p.id} has non-positive capacity`);
  }

  for (const k of CONTRACTS) {
    if (!ids.has(k.companyId)) fail(`Contract ${k.id} references unknown company ${k.companyId}`);
  }

  // --- rule 3: unknown must stay unknown -------------------------------
  for (const c of COMPANIES) {
    for (const m of c.measures) {
      if (m.value === null && m.confidence !== 'unknown') {
        fail(`${c.id}/${m.metric}: null value must carry confidence "unknown", got "${m.confidence}"`);
      }
      if (!METRICS[m.metric]) fail(`${c.id}: unknown metric ${m.metric}`);
      if (m.confidence && !CONFIDENCE[m.confidence]) {
        fail(`${c.id}/${m.metric}: unknown confidence "${m.confidence}"`);
      }
    }
  }

  // --- rules 1 & 2: verifiedAt means evidence was actually reviewed ----
  for (const c of COMPANIES) {
    for (const m of c.measures) {
      if (m.verifiedAt && !ISO.test(m.verifiedAt)) {
        fail(`${c.id}/${m.metric}: verifiedAt must be YYYY-MM-DD`);
      }
      if (m.confidence === 'confirmed') {
        // Rule 8: a confirmed figure must be able to show its source.
        if (!m.source?.url) fail(`${c.id}/${m.metric}: confirmed but has no source URL`);
        if (!m.verifiedAt) fail(`${c.id}/${m.metric}: confirmed but has no verifiedAt`);
      }
      if (m.verifiedAt && !m.source?.url) {
        fail(`${c.id}/${m.metric}: has verifiedAt but no source to have verified against`);
      }
      // Rule 9: a value with no source must be flagged, not quietly shown as fact.
      if (isKnown(m) && !m.source && !m.sourceRequired) {
        fail(`${c.id}/${m.metric}: value without source must set sourceRequired`);
      }
    }
  }

  // --- rule 7: never aggregate across incompatible families ------------
  for (const metric of Object.keys(METRICS)) {
    const t = totalFor(metric);
    const families = new Set(t.contributing.map(() => METRICS[metric].family));
    if (families.size > 1) fail(`Total for ${metric} mixes measurement families`);
  }

  // --- rule 5 & 6: KPIs reconcile to the underlying records ------------
  for (const kpi of headlineKpis()) {
    const recomputed = COMPANIES.reduce((sum, c) => {
      const m = getMeasure(c, kpi.metric);
      return isKnown(m) ? sum + m.value : sum;
    }, 0);
    if (Math.abs(recomputed - kpi.total) > 1e-9) {
      fail(`KPI ${kpi.metric} does not reconcile: panel ${kpi.total} vs records ${recomputed}`);
    }
    if (kpi.disclosedCount + kpi.missing.length !== kpi.companyCount) {
      fail(`KPI ${kpi.metric}: disclosed + missing != company count`);
    }
    const confirmedSum = kpi.contributing
      .filter(x => CONFIDENCE[x.confidence].countsAsVerified)
      .reduce((a, x) => a + x.value, 0);
    if (Math.abs(confirmedSum - kpi.confirmedTotal) > 1e-9) {
      fail(`KPI ${kpi.metric}: confirmed subtotal does not reconcile`);
    }
  }

  // --- CoreWeave: the specific case in the brief ------------------------
  const cw = COMPANIES.find(c => c.id === 'coreweave');
  if (!cw) fail('CoreWeave record missing');
  else {
    const secured = getMeasure(cw, 'securedPowerMw');
    const active = getMeasure(cw, 'energisedCriticalItMw');
    if (secured.value !== 3700) fail(`CoreWeave secured power should be 3700MW, got ${secured.value}`);
    if (active.value !== 1500) fail(`CoreWeave active power should be 1500MW, got ${active.value}`);
    if (secured.confidence !== 'confirmed' || active.confidence !== 'confirmed') {
      fail('CoreWeave Q2 figures must be confirmed — a primary source exists');
    }
    // Contracted power is a total that already contains the active figure.
    if (isKnown(secured) && isKnown(active) && active.value > secured.value) {
      fail('CoreWeave active power exceeds contracted power — one of them is misread');
    }
  }

  // --- ledger ----------------------------------------------------------
  const eventIds = new Set();
  for (const e of EVENTS) {
    if (eventIds.has(e.eventId)) fail(`Duplicate eventId ${e.eventId}`);
    eventIds.add(e.eventId);
    if (!ids.has(e.companyId)) fail(`Event ${e.eventId} references unknown company`);
    if (e.confidence === 'confirmed' && !e.sourceUrl) {
      fail(`Event ${e.eventId} is confirmed but has no sourceUrl`);
    }
    if (e.effectiveDate && !ISO.test(e.effectiveDate)) {
      fail(`Event ${e.eventId} effectiveDate must be YYYY-MM-DD`);
    }
    if (e.newStage && !STAGE_BY_ID[e.newStage]) fail(`Event ${e.eventId} has unknown newStage`);
  }

  for (const c of CORRECTIONS) {
    if (!ISO.test(c.date)) fail(`Correction ${c.id} has a bad date`);
  }

  // --- warnings (not build-breaking) -----------------------------------
  for (const c of COMPANIES) {
    const unsourced = c.measures.filter(m => m.sourceRequired).length;
    if (unsourced) warn(`${c.ticker}: ${unsourced} value(s) awaiting a source`);
  }
  if (!EVENTS.length) warn('Delivery ledger is empty');

  return { errors, warnings, ok: errors.length === 0 };
}
