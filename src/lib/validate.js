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
import { PROFILES } from '../../data/profiles.js';
import { CUSTOMERS, CUSTOMER_KINDS, CUSTOMER_BY_NAME, isUndisclosedCustomer } from '../../data/customers.js';
import { ART, ART_BY_ID } from '../../data/artpack.js';
import { EXPLAINERS, EXPLAINER_BY_SLUG, STAGE_BY_ID } from '../../data/explainers.js';
import { PHOTONICS_SUPPLIERS, SUPPLIER_ROLES, EVIDENCE_GRADES } from '../../data/suppliers.js';
import { allRecords, getMeasure, isKnown, aggregate, headlineKpis } from './compute.js';
import { MAX_TICKERS, normaliseSelection } from './compare.js';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
// A company-controlled page (leadership, about, official site) is primary evidence
// for WHO runs the company and WHICH accounts are official — but never for a
// capacity figure, which still requires a filing or a regulator record.
const PRIMARY_TYPES = [
  'sec-filing', 'company-ir', 'customer-announcement', 'utility', 'regulator',
  'planning-record', 'company-profile'
];

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

  /* ---------- company profiles, leadership and socials ---------- */
  const profileIds = new Set();
  for (const p of PROFILES) {
    const where = p.ticker;
    if (profileIds.has(p.id)) fail(`Duplicate profile id ${p.id}`);
    profileIds.add(p.id);

    if (!p.legalName || !p.ticker || !p.websiteUrl) fail(`${where}: profile missing legalName/ticker/websiteUrl`);
    for (const u of [p.websiteUrl, p.investorRelationsUrl, p.secFilingsUrl].filter(Boolean)) {
      try { new URL(u); } catch { fail(`${where}: malformed profile URL ${u}`); }
    }
    for (const id of p.sourceIds || []) if (!known(id)) fail(`${where}: profile cites unknown source ${id}`);
    if (!ISO.test(p.verifiedAt)) fail(`${where}: profile verifiedAt must be YYYY-MM-DD`);

    // A description must not smuggle in unsourced numeric claims.
    const numeric = /\b\d[\d,.]*\s*(MW|GW|bn|billion|million|%)\b/i;
    for (const field of ['shortDescription', 'longDescription']) {
      if (numeric.test(p[field] || '')) {
        fail(`${where}: ${field} contains a numeric claim — figures belong in sourced capacity records`);
      }
    }

    // Customers may only be named where a source already discloses the relationship.
    if ((p.disclosedKeyCustomers || []).length && !(p.sourceIds || []).length) {
      fail(`${where}: names customers with no source`);
    }

    /* ---- leadership ---- */
    const current = (p.leadership || []).filter(e => e.isCurrent);
    for (const e of p.leadership || []) {
      const w = `${where}/${e.name}`;
      if (!e.name || !e.title || !e.roleType) fail(`${w}: executive missing name/title/roleType`);
      if (!['ceo', 'co-ceo', 'executive-chair', 'cfo', 'founder', 'other'].includes(e.roleType)) {
        fail(`${w}: unknown roleType ${e.roleType}`);
      }
      // an expired record can never remain current
      if (e.roleEndedAt && e.isCurrent) fail(`${w}: has roleEndedAt but is still marked current`);
      if (e.roleStartedAt && !ISO.test(e.roleStartedAt)) fail(`${w}: bad roleStartedAt`);
      if (e.isCurrent) {
        if (!(e.sourceIds || []).length) fail(`${w}: current executive with no official source`);
        if (!e.verifiedAt) fail(`${w}: current executive without verifiedAt`);
        const official = (e.sourceIds || []).map(id => SOURCE_BY_ID[id]).filter(Boolean);
        if (!official.some(s => s.isPrimary)) fail(`${w}: current executive not sourced to an official document`);
      }
      for (const id of e.sourceIds || []) if (!known(id)) fail(`${w}: cites unknown source ${id}`);
    }

    // Two chief executives are legal only as an explicit co-CEO structure.
    const chiefs = current.filter(e => ['ceo', 'co-ceo'].includes(e.roleType));
    const soleCeos = chiefs.filter(e => e.roleType === 'ceo');
    if (soleCeos.length > 1) {
      fail(`${where}: ${soleCeos.length} records claim sole CEO — use roleType "co-ceo" for a shared structure`);
    }
    if (chiefs.length > 1 && chiefs.some(e => e.roleType === 'ceo')) {
      fail(`${where}: mixes a sole CEO with another chief executive`);
    }

    /* ---- socials ---- */
    for (const s of p.socials || []) {
      const w = `${where}/${s.platform}`;
      if (!s.url) fail(`${w}: social with no URL`);
      try { new URL(s.url); } catch { fail(`${w}: malformed social URL ${s.url}`); }
      if (!s.verifiedThroughOfficialSite) {
        fail(`${w}: social account not verified through an official site — it must not be displayed`);
      }
      if (!s.sourceId || !known(s.sourceId)) fail(`${w}: social missing a valid source`);
      if (!ISO.test(s.lastCheckedAt || '')) fail(`${w}: social missing lastCheckedAt`);
      if (!s.label) fail(`${w}: social missing an accessible label`);
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

  /* ---------- customers ----------
     The customer map is the one place where a fact about the buyer sits next to a
     fact about the operator's contract. These rules keep the two from merging:
     a model family must cite the customer's own publication, and every contract
     counterparty must be either mapped or explicitly recorded as withheld — an
     unmapped name would render as a silent omission. */
  const customerIds = new Set();
  for (const c of CUSTOMERS) {
    if (customerIds.has(c.id)) fail(`Duplicate customer id ${c.id}`);
    customerIds.add(c.id);
    if (!CUSTOMER_KINDS[c.kind]) fail(`Customer ${c.id}: unknown kind ${c.kind}`);
    if (isUndisclosedCustomer(c.name)) {
      fail(`Customer ${c.id} is named but matches an undisclosed-counterparty pattern`);
    }
    if (!c.models?.length && !c.noModelsReason) {
      fail(`Customer ${c.id} publishes no models and does not say why`);
    }
    for (const m of c.models || []) {
      if (!known(m.sourceId)) fail(`Customer ${c.id}/${m.family}: cites unknown source ${m.sourceId}`);
      else if (!SOURCE_BY_ID[m.sourceId].isPrimary) {
        fail(`Customer ${c.id}/${m.family}: a model family must cite the developer's own publication`);
      }
    }
  }
  for (const name of new Set(CONTRACTS.map(k => k.customer))) {
    if (!CUSTOMER_BY_NAME[name] && !isUndisclosedCustomer(name)) {
      fail(`Contract counterparty "${name}" is neither mapped nor recorded as withheld`);
    }
  }

  /* ---------- explainers and suppliers ----------
     The supplier table is the surface on this site most likely to mislead by
     accident: a reader scanning "public companies in this area" assumes somebody
     bought something. These rules keep the two axes apart — what a company DOES
     (role) and what its document actually PROVES (grade) — and stop a capability
     row from ever acquiring the marks of a confirmed award. */
  const slugs = new Set();
  for (const e of EXPLAINERS) {
    if (slugs.has(e.slug)) fail(`Duplicate explainer slug ${e.slug}`);
    slugs.add(e.slug);
    for (const k of ['definition', 'simple', 'whyAi', 'madeOf', 'inputs', 'outputs', 'bottleneck']) {
      if (!e[k] || e[k].length < 20) fail(`Explainer ${e.slug} has no usable ${k}`);
    }
    if (!ART_BY_ID[e.asset]) fail(`Explainer ${e.slug} references unknown art asset ${e.asset}`);
    if (!(e.howItWorks?.length >= 3)) fail(`Explainer ${e.slug} explains fewer than three steps`);
    // The bracketed translation is used once, in the hero. A `simple` that is
    // itself full of jargon defeats the point.
    if (/\b(epitax|modulat|substrate|interconnect|photonic)/i.test(e.simple)) {
      fail(`Explainer ${e.slug}: the plain-English translation is not plain`);
    }
    if (e.kind === 'stage') {
      if (!STAGE_BY_ID[e.stageId]) fail(`Explainer ${e.slug} claims unknown stage ${e.stageId}`);
      for (const c of e.components || []) {
        if (!EXPLAINER_BY_SLUG[c]) fail(`Explainer ${e.slug} lists unknown component ${c}`);
      }
    } else if (!EXPLAINER_BY_SLUG[e.parent]) {
      fail(`Component ${e.slug} claims unknown parent ${e.parent}`);
    }
  }

  const supplierIds = new Set();
  for (const s of PHOTONICS_SUPPLIERS) {
    if (supplierIds.has(s.id)) fail(`Duplicate supplier id ${s.id}`);
    supplierIds.add(s.id);
    if (!SUPPLIER_ROLES[s.role]) fail(`Supplier ${s.id}: unknown role ${s.role}`);
    if (!EVIDENCE_GRADES[s.grade]) fail(`Supplier ${s.id}: unknown evidence grade ${s.grade}`);
    if (!s.sourceIds?.length) fail(`Supplier ${s.id} cites no document`);
    for (const id of s.sourceIds || []) {
      if (!known(id)) fail(`Supplier ${s.id}: cites unknown source ${id}`);
      else if (!SOURCE_BY_ID[id].isPrimary) {
        fail(`Supplier ${s.id}: a relationship must rest on a primary document`);
      }
    }
    if (!s.components?.length) fail(`Supplier ${s.id} covers no component`);
    for (const c of s.components || []) {
      if (!EXPLAINER_BY_SLUG[c]) fail(`Supplier ${s.id} covers unknown component ${c}`);
    }
    if (!ISO.test(s.asOf)) fail(`Supplier ${s.id}: asOf must be YYYY-MM-DD`);
    if (!s.evidence || s.evidence.length < 40) {
      fail(`Supplier ${s.id} does not state what its document establishes`);
    }
    /* The rule the ingested seed broke. A grade that claims a counterparty must
       name one; a capability row must not, because its document names nobody. */
    if (s.grade === 'supply-agreement' && !s.counterparty) {
      fail(`Supplier ${s.id} claims a named agreement but names no counterparty`);
    }
    if (s.grade === 'capability' && s.counterparty) {
      fail(`Supplier ${s.id} is a capability row yet names a counterparty — grade it higher or drop it`);
    }
  }

  /* ---------- art pack ----------
     Two failure modes worth failing the build over. A declared asset whose file
     is missing ships as a hole in the page, and the reader sees an alt string
     where an object should be. And an asset displayed above its manifest ceiling
     is an upscaled raster — the exact softness defect the pack was assembled to
     remove — which is invisible in code review and obvious on screen. */
  const artIds = new Set();
  for (const a of ART) {
    if (artIds.has(a.id)) fail(`Duplicate art asset id ${a.id}`);
    artIds.add(a.id);
    if (!a.widths?.length) fail(`Art asset ${a.id} declares no responsive widths`);
    if (!a.alt || a.alt.length < 8) fail(`Art asset ${a.id} has no usable alt text`);
    if (!Array.isArray(a.intrinsic) || a.intrinsic.length !== 2) {
      fail(`Art asset ${a.id} declares no intrinsic dimensions, so it will shift the layout`);
    }
    if (!(a.maxCssWidth > 0)) fail(`Art asset ${a.id} declares no maxCssWidth ceiling`);
    // The largest derivative must reach the ceiling, or displaying at the
    // ceiling upscales it.
    const largest = Math.max(...a.widths);
    if (largest < a.maxCssWidth && !a.fallbackWidth) {
      fail(`Art asset ${a.id}: largest derivative ${largest}px is below its ${a.maxCssWidth}px ceiling`);
    }
    const o = a.optics || {};
    if (!(o.scale > 0 && o.scale <= 1.2)) fail(`Art asset ${a.id}: implausible optics scale ${o.scale}`);
    for (const k of ['x', 'y']) {
      if (!/^-?\d+(\.\d+)?%$/.test(String(o[k]))) {
        fail(`Art asset ${a.id}: optics ${k} must be a percentage, got ${o[k]}`);
      }
    }
    /* Reference mockups are design context, never page artwork. A path that
       points at one has escaped the pack folder and must not reach a build. */
    if (/reference-mockups/i.test(a.base)) {
      fail(`Art asset ${a.id} points at a reference mockup, which may never ship as artwork`);
    }
  }

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
      ...CATALYSTS.flatMap(c => c.sourceIds || []),
      ...PROFILES.flatMap(p => [
        ...(p.sourceIds || []),
        ...(p.leadership || []).flatMap(e => e.sourceIds || []),
        ...(p.socials || []).map(x => x.sourceId)
      ]),
      ...CUSTOMERS.flatMap(c => (c.models || []).map(m => m.sourceId)),
      ...PHOTONICS_SUPPLIERS.flatMap(s => s.sourceIds || [])
    ];
    return !used.includes(s.id);
  });
  for (const s of unusedSources) warn(`Source ${s.id} is registered but not cited by any record`);

  return { errors, warnings, ok: errors.length === 0 };
}
