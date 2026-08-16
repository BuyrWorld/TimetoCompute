/**
 * Site view model.
 *
 * A "site" here is a project record — the level at which gates are actually
 * evidenced. Everything below is derived from data/projects.js, data/events.js
 * and data/sources.js; nothing is invented, and every stage that has no
 * supporting gate reports itself as not disclosed rather than as not started.
 *
 * On the delivery path: the visual reference shows a GPU-install stage. No such
 * gate exists in the schema and no tracked company discloses one per site, so a
 * permanently-unknown stage would be a decorative affordance. The path below uses
 * `customerContracted` in that position — a real gate, evidenced per site — and
 * the seven stages otherwise follow the reference exactly.
 */
import { GATES, GATE_BY_ID, GATE_STATUS } from '../../data/schema.js';
import { PROJECTS, CONTRACTS, COUNTRY_NAMES } from '../../data/projects.js';
import { COMPANIES } from '../../data/companies.js';
import { EVENTS } from '../../data/events.js';
import { gateSummary, timeline } from './compute.js';

const COMPANY_BY_ID = Object.fromEntries(COMPANIES.map(c => [c.id, c]));

/**
 * The delivery path, in the reference's horizontal form. Each stage names the
 * real gates that evidence it; a stage with no evidenced gate is not disclosed.
 */
export const PATH = [
  { id: 'announced', label: 'Announced', short: 'Announced', gates: ['siteControl'] },
  { id: 'power', label: 'Power secured', short: 'Power', gates: ['utilityAgreement', 'interconnection'] },
  { id: 'construction', label: 'Construction', short: 'Build', gates: ['constructionStarted'] },
  { id: 'energised', label: 'Energised', short: 'Energised', gates: ['utilityEnergised', 'criticalItEnergised'] },
  { id: 'contracted', label: 'Customer contracted', short: 'Contracted', gates: ['customerContracted'] },
  { id: 'acceptance', label: 'Acceptance', short: 'Accepted', gates: ['customerAccepted'] },
  { id: 'billing', label: 'Billing', short: 'Billing', gates: ['revenueCommenced'] }
];

/** Dependencies we can actually evidence, plus the two the reference shows that nobody discloses. */
const DEPENDENCIES = [
  { id: 'grid', label: 'Power / grid', gates: ['utilityAgreement', 'interconnection', 'utilityEnergised'] },
  { id: 'permits', label: 'Permits', gates: ['zoning', 'environmental', 'buildingPermits', 'regulatoryApproval'] },
  { id: 'financing', label: 'Financing', gates: ['financing'] },
  { id: 'equipment', label: 'Long-lead equipment', gates: ['longLeadOrdered'] },
  { id: 'customer', label: 'Customer', gates: ['customerContracted', 'customerAccepted'] },
  /* Cooling and networking appear in the visual reference. No tracked company
     discloses either as a separate site-level milestone, so they are declared
     here and render as "not disclosed" rather than being quietly dropped. */
  { id: 'cooling', label: 'Cooling', gates: [] },
  { id: 'networking', label: 'Networking', gates: [] }
];

/** A project id is already unique and url-safe, so it is the site slug. */
export const siteSlug = project => project.id;

const gatesById = project => Object.fromEntries((project.gates || []).map(g => [g.id, g]));

/**
 * Roll several gates into one stage. Complete beats in-progress beats not-started;
 * a stage nobody has reported on is `notDisclosed`, which is not the same as
 * `notStarted` and must not be drawn as an empty step the site has yet to reach.
 */
function rollup(byId, gateIds) {
  const present = gateIds.map(id => byId[id]).filter(Boolean);
  if (!present.length) return { status: 'notDisclosed', gates: [], effectiveAt: null, sourceIds: [], confidence: 'unknown' };

  const pick = ['complete', 'inProgress', 'conditional', 'notStarted', 'notDisclosed']
    .find(s => present.some(g => g.status === s)) || 'notDisclosed';
  const matching = present.filter(g => g.status === pick);
  const dated = matching.filter(g => g.effectiveAt).sort((a, b) => String(a.effectiveAt).localeCompare(String(b.effectiveAt)));

  return {
    status: pick,
    gates: present,
    effectiveAt: dated.length ? dated[dated.length - 1].effectiveAt : null,
    sourceIds: [...new Set(matching.flatMap(g => g.sourceIds || []))],
    confidence: matching.some(g => g.confidence === 'confirmed') ? 'confirmed'
      : matching.some(g => g.confidence === 'reported') ? 'reported' : 'unknown',
    notes: matching.map(g => g.notes).filter(Boolean).join(' ') || null
  };
}

/**
 * Evidence confidence for a site: the share of its reported gates that rest on a
 * primary document. Sites with fewer than two reported gates return `null` —
 * a confidence bar computed from one gate says nothing and would still look
 * authoritative.
 */
export function evidenceConfidence(project) {
  const reported = (project.gates || []).filter(g => g.status !== 'notDisclosed');
  if (reported.length < 2) return null;
  const confirmed = reported.filter(g => g.confidence === 'confirmed').length;
  const share = confirmed / reported.length;
  return {
    share,
    confirmed,
    total: reported.length,
    level: share >= 0.75 ? 'high' : share >= 0.4 ? 'medium' : 'low',
    label: share >= 0.75 ? 'High' : share >= 0.4 ? 'Medium' : 'Low'
  };
}

/** Contracts the company itself has tied to this site. */
export const contractsForSite = project =>
  CONTRACTS.filter(c => Array.isArray(c.projectIds) && c.projectIds.includes(project.id));

/** Ledger entries recorded against this site. */
export const eventsForSite = project =>
  EVENTS.filter(e => e.projectId === project.id)
    .slice()
    .sort((a, b) => String(b.announcedAt).localeCompare(String(a.announcedAt)));

/**
 * Documented progression — every gate that carries a date, oldest first. This is
 * the site replay, and it only ever replays things that actually happened on a
 * stated date.
 */
export function replay(project) {
  return (project.gates || [])
    .filter(g => g.effectiveAt)
    .map(g => ({
      gate: g.id,
      label: GATE_BY_ID[g.id]?.label || g.id,
      at: g.effectiveAt,
      confidence: g.confidence,
      sourceIds: g.sourceIds || [],
      notes: g.notes || null
    }))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

/** The most recent thing that can be shown with a document behind it. */
export function latestEvidence(project) {
  const events = eventsForSite(project);
  const dated = replay(project);
  const lastGate = dated.length ? dated[dated.length - 1] : null;
  const lastEvent = events.length ? events[0] : null;

  if (lastEvent && (!lastGate || String(lastEvent.announcedAt) >= String(lastGate.at))) {
    return {
      kind: 'event', at: lastEvent.announcedAt, summary: lastEvent.summary,
      confidence: lastEvent.confidence, sourceIds: lastEvent.sourceIds || []
    };
  }
  if (lastGate) {
    return {
      kind: 'gate', at: lastGate.at, summary: `${lastGate.label} confirmed.`,
      confidence: lastGate.confidence, sourceIds: lastGate.sourceIds
    };
  }
  return null;
}

export function dependencies(project) {
  const byId = gatesById(project);
  return DEPENDENCIES.map(d => {
    const r = rollup(byId, d.gates);
    return {
      id: d.id, label: d.label, status: r.status,
      statusLabel: GATE_STATUS[r.status].label,
      tone: GATE_STATUS[r.status].tone,
      sourceIds: r.sourceIds,
      gates: d.gates.map(id => GATE_BY_ID[id]?.label).filter(Boolean)
    };
  });
}

/**
 * Mark stages that must have been passed because a later one was.
 *
 * A site cannot be accepted by a customer without having been energised, and it
 * cannot be energised without having been built. So where a stage carries NO
 * record but a later stage is confirmed complete, the earlier one is `implied`:
 * physically necessary, not separately evidenced.
 *
 * This is a display state and nothing more. An implied stage has no date and no
 * source, is never counted as confirmed, never raises an evidence score, and is
 * always drawn and labelled differently from a stage a document supports. The
 * distinction the whole product rests on — what is evidenced versus what is
 * merely true — survives intact.
 *
 * Only `notDisclosed` stages are ever implied. A gate a company has explicitly
 * reported as not started, sitting before a completed one, is a contradiction in
 * the record; it stays visible as such rather than being quietly overwritten.
 */
function markImplied(stages) {
  const lastComplete = stages.reduce((acc, s, i) => (s.status === 'complete' ? i : acc), -1);
  if (lastComplete < 1) return stages;

  const anchor = stages[lastComplete];
  return stages.map((s, i) => {
    if (i >= lastComplete || s.status !== 'notDisclosed') return s;
    return {
      ...s,
      status: 'implied',
      statusLabel: 'Implied',
      tone: 'ok',
      impliedBy: anchor.label,
      impliedAt: anchor.effectiveAt || null
    };
  });
}

/** The horizontal path to billing, with each stage's own evidence. */
export function path(project) {
  const byId = gatesById(project);
  const stages = PATH.map(stage => {
    const r = rollup(byId, stage.gates);
    return {
      id: stage.id, label: stage.label, short: stage.short,
      status: r.status, statusLabel: GATE_STATUS[r.status].label, tone: GATE_STATUS[r.status].tone,
      effectiveAt: r.effectiveAt, sourceIds: r.sourceIds, confidence: r.confidence, notes: r.notes,
      impliedBy: null, impliedAt: null,
      gates: stage.gates.map(id => GATE_BY_ID[id]?.label).filter(Boolean)
    };
  });
  return markImplied(stages);
}

/**
 * The next thing that has to happen, and whether anyone has guided a date for it.
 *
 * Stages before the furthest completed one are skipped even when they are not
 * disclosed. Horizon 1 has no site-control gate on record but has been accepted
 * by Microsoft; reporting "next: announced" for it would be absurd. An
 * undisclosed early stage is a gap in the paperwork, not outstanding work.
 */
export function nextMilestone(project) {
  const stages = path(project);
  const lastComplete = stages.reduce((acc, s, i) => (s.status === 'complete' ? i : acc), -1);
  const next = stages.slice(lastComplete + 1).find(s => s.status !== 'complete');
  if (!next) return null;
  const guided = (project.schedules || [])
    .filter(s => PATH.find(p => p.id === next.id)?.gates.includes(s.gate))
    .sort((a, b) => String(a.announcedAt).localeCompare(String(b.announcedAt)));
  return { ...next, schedule: guided.length ? guided[guided.length - 1] : null };
}

export function siteView(project) {
  const company = COMPANY_BY_ID[project.companyId] || null;
  const summary = gateSummary(project);
  return {
    project,
    slug: siteSlug(project),
    name: project.name,
    company,
    companyName: company?.name || project.companyId,
    ticker: company?.ticker || null,
    companySlug: company?.slug || null,
    country: project.country,
    countryName: COUNTRY_NAMES[project.country] || project.country,
    flag: project.flag || '',
    capacityMw: project.capacityMw ?? null,
    powerBasis: project.powerBasis,
    valueStatus: project.valueStatus,
    confidence: project.confidence,
    sourceIds: project.sourceIds || [],
    asOf: project.asOf || null,
    note: project.note || null,
    path: path(project),
    gateSummary: summary,
    furthest: summary.furthest,
    next: nextMilestone(project),
    dependencies: dependencies(project),
    contracts: contractsForSite(project),
    events: eventsForSite(project),
    replay: replay(project),
    latestEvidence: latestEvidence(project),
    evidence: evidenceConfidence(project),
    timeline: timeline(project)
  };
}

export const allSites = () =>
  PROJECTS.map(siteView).sort((a, b) =>
    a.companyName.localeCompare(b.companyName) || a.name.localeCompare(b.name));

export const siteBySlug = slug => {
  const p = PROJECTS.find(x => siteSlug(x) === slug);
  return p ? siteView(p) : null;
};

/** Distinct furthest-stage values across the estate, for the directory filter. */
export function stageFilterOptions() {
  const seen = new Map();
  for (const s of allSites()) {
    const stage = [...s.path].reverse().find(p => p.status === 'complete');
    if (stage) seen.set(stage.id, stage.short);
  }
  return PATH.filter(p => seen.has(p.id)).map(p => ({ id: p.id, label: seen.get(p.id) }));
}

/** Furthest completed stage, used by the directory card and the map hotspot. */
export function furthestStage(site) {
  return [...site.path].reverse().find(p => p.status === 'complete') || null;
}

/**
 * A company's path to billing, merged across its projects.
 *
 * A stage counts as complete if ANY project has reached it — this is "the
 * furthest this company has got anywhere", not "every site has got here", and
 * the UI must say so. Each stage names the projects that evidence it, so the
 * distinction is visible rather than merely documented.
 */
export function companyPath(companyId) {
  const owned = PROJECTS.filter(p => p.companyId === companyId);
  const perProject = owned.map(p => ({ project: p, stages: path(p) }));

  const merged = PATH.map((stage, i) => {
    const reached = perProject.filter(x => x.stages[i].status === 'complete');
    const progressing = perProject.filter(x =>
      x.stages[i].status === 'inProgress' || x.stages[i].status === 'conditional');
    const evidencing = reached.length ? reached : progressing;

    const status = reached.length ? 'complete'
      : progressing.length ? 'inProgress'
        : perProject.some(x => x.stages[i].status === 'notStarted') ? 'notStarted'
          : 'notDisclosed';

    const dated = reached
      .map(x => x.stages[i].effectiveAt).filter(Boolean).sort();

    return {
      id: stage.id, label: stage.label, short: stage.short, status,
      statusLabel: GATE_STATUS[status].label, tone: GATE_STATUS[status].tone,
      effectiveAt: dated.length ? dated[0] : null,
      sourceIds: [...new Set(evidencing.flatMap(x => x.stages[i].sourceIds))],
      confidence: evidencing.some(x => x.stages[i].confidence === 'confirmed') ? 'confirmed' : 'reported',
      notes: null,
      gates: stage.gates.map(id => GATE_BY_ID[id]?.label).filter(Boolean),
      projects: evidencing.map(x => ({ slug: siteSlug(x.project), name: x.project.name })),
      reachedCount: reached.length,
      projectCount: owned.length,
      impliedBy: null, impliedAt: null
    };
  });

  return markImplied(merged);
}
