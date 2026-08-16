/**
 * Explainer derivation.
 *
 * Everything a page needs that is not written in data/explainers.js: where the
 * stage sits in the chain, what it depends on, which suppliers the evidence
 * covers, which glossary terms appear in the prose, and which real signals
 * touch it.
 *
 * Nothing here invents a relationship. `relatedSignals` in particular returns
 * only signals whose company is genuinely tracked and whose stage genuinely
 * matches; an explainer with no matching signal shows an empty state rather
 * than borrowing one from elsewhere.
 */
import {
  STAGE_EXPLAINERS, COMPONENT_EXPLAINERS, EXPLAINER_BY_SLUG, STAGE_BY_ID, explainerHref
} from '../../data/explainers.js';
import { suppliersFor, SUPPLIER_ROLES, EVIDENCE_GRADES } from '../../data/suppliers.js';
import { GLOSSARY_BY_ID, GLOSSARY_TERMS } from '../../data/glossary.js';
import { SOURCE_BY_ID } from '../../data/sources.js';
import { chainState } from './chain.js';
import { signals } from './signals.js';

/**
 * The chain, annotated for one explainer.
 *
 * Reuses chainState() rather than re-deriving, so a stage's evidenced/implied
 * status is the same fact here as on the homepage. Drifting copies of that
 * mapping is a bug this codebase has already had once.
 */
export function chainContext(slug) {
  const e = EXPLAINER_BY_SLUG[slug];
  if (!e) return null;
  const anchor = e.kind === 'stage' ? e : EXPLAINER_BY_SLUG[e.parent];

  return chainState().map(s => {
    const ex = STAGE_BY_ID[s.id];
    return {
      id: s.id,
      label: s.label,
      /* The explainer's art id, not the chain's filename stem — the strip renders
         through the same manifest-driven cutout as everything else. */
      asset: ex ? ex.asset : null,
      happened: s.happened,
      tracked: s.tracked,
      here: !!ex && ex.slug === anchor.slug,
      href: ex ? explainerHref(ex) : null
    };
  });
}

/** The stage before and after, for "where it sits in the chain". */
export function neighbours(slug) {
  const e = EXPLAINER_BY_SLUG[slug];
  if (!e) return { previous: null, next: null };
  const anchor = e.kind === 'stage' ? e : EXPLAINER_BY_SLUG[e.parent];
  const i = STAGE_EXPLAINERS.findIndex(s => s.slug === anchor.slug);
  return {
    previous: i > 0 ? STAGE_EXPLAINERS[i - 1] : null,
    next: i > -1 && i < STAGE_EXPLAINERS.length - 1 ? STAGE_EXPLAINERS[i + 1] : null
  };
}

/** Child components of a stage, resolved to full records. */
export const childrenOf = e =>
  (e.components || []).map(slug => EXPLAINER_BY_SLUG[slug]).filter(Boolean);

/**
 * Suppliers for an explainer, with their roles, grades and documents resolved.
 *
 * A stage aggregates the suppliers of all its components; a component shows only
 * its own. Both are sorted by evidence strength, so the row with a named
 * agreement leads and the capability rows follow — the order itself carries the
 * distinction before a reader has read a single label.
 */
export function supplierRows(slug) {
  const e = EXPLAINER_BY_SLUG[slug];
  if (!e) return [];

  const ids = e.kind === 'component' ? [e.slug] : (e.components || []);
  const seen = new Map();
  for (const id of ids) {
    for (const s of suppliersFor(id)) {
      // A company covering several components appears once, with the strongest
      // grade it holds and every component it covers listed.
      const prior = seen.get(s.id);
      if (!prior || EVIDENCE_GRADES[s.grade].rank > EVIDENCE_GRADES[prior.grade].rank) {
        seen.set(s.id, s);
      }
    }
  }

  return [...seen.values()]
    .sort((a, b) => EVIDENCE_GRADES[b.grade].rank - EVIDENCE_GRADES[a.grade].rank)
    .map(s => ({
      ...s,
      roleLabel: SUPPLIER_ROLES[s.role].label,
      roleDefinition: SUPPLIER_ROLES[s.role].definition,
      gradeLabel: EVIDENCE_GRADES[s.grade].label,
      gradeDefinition: EVIDENCE_GRADES[s.grade].definition,
      gradeTone: EVIDENCE_GRADES[s.grade].tone,
      confirmed: EVIDENCE_GRADES[s.grade].confirmed,
      coversHere: (e.kind === 'component' ? [e.slug] : s.components.filter(c => ids.includes(c)))
        .map(c => EXPLAINER_BY_SLUG[c]?.name || c),
      sources: (s.sourceIds || []).map(id => SOURCE_BY_ID[id]).filter(Boolean)
    }));
}

/**
 * Glossary terms that genuinely appear in this explainer's prose.
 *
 * Listing the whole glossary on every page would be padding. A term earns its
 * place by being used, and the count of uses decides whether it is worth a
 * trigger at all — a term appearing once already has its bracketed translation
 * beside it.
 */
export function glossaryFor(slug) {
  const e = EXPLAINER_BY_SLUG[slug];
  if (!e) return [];
  const prose = [
    e.definition, e.whyAi, e.madeOf, e.inputs, e.outputs, e.bottleneck,
    ...(e.howItWorks || [])
  ].join(' ').toLowerCase();

  const hits = new Map();
  for (const { text, id } of GLOSSARY_TERMS) {
    if (hits.has(id)) continue;
    if (prose.includes(text.toLowerCase())) hits.set(id, GLOSSARY_BY_ID[id]);
  }
  return [...hits.values()];
}

/**
 * Real signals touching this stage.
 *
 * Signals carry a company, not a chain stage, so the join is deliberately
 * narrow: only the three stages T2C actually tracks can match a signal, because
 * only those have records behind them. An upstream explainer returns nothing
 * and says so, which is accurate — there are no photonics signals on file.
 */
const SIGNAL_STAGES = {
  factory: ['capacity-change', 'stage-change', 'financing', 'delay', 'new-disclosure', 'target-change'],
  accepted: ['customer-accepted', 'contract-signed'],
  revenue: ['revenue-commenced']
};

export function relatedSignals(slug, limit = 4) {
  const e = EXPLAINER_BY_SLUG[slug];
  if (!e || e.kind !== 'stage') return [];
  const types = SIGNAL_STAGES[e.stageId];
  if (!types) return [];
  return signals().filter(s => types.includes(s.eventType)).slice(0, limit);
}

/** Every route this phase adds, for the build and the sitemap. */
export const explainerRoutes = () =>
  [...STAGE_EXPLAINERS, ...COMPONENT_EXPLAINERS].map(e => ({ explainer: e, href: explainerHref(e) }));

export { explainerHref, EXPLAINER_BY_SLUG, STAGE_EXPLAINERS, COMPONENT_EXPLAINERS };
