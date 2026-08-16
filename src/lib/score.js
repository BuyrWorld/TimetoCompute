/**
 * T2C Reality Score.
 *
 * This is the one number on the site that is CONSTRUCTED rather than disclosed,
 * so it carries more obligations than any other figure:
 *
 *   1. Every input is derived from sourced records — slip outcomes, confidence
 *      levels, schedule revisions and gate states. Nothing is hand-assigned.
 *   2. Every factor reports its own sample, and a factor with no sample is
 *      `available: false` rather than a zero. A zero would read as "this company
 *      scored badly" when it means "nobody has published anything to score".
 *   3. The composite is withheld unless the available factors carry enough of
 *      the total weight to mean something. A score built on one factor out of
 *      four is noise wearing a number's clothes.
 *   4. It is labelled "Derived", never "measured", and the formula is published.
 *
 * The weights are a judgement, and stating them is the honest way to hold one:
 * delivering what you promised matters most, and how well evidenced the record
 * is matters next, because an unevidenced record cannot be checked at all.
 */
import { PROJECTS_BY_COMPANY } from '../../data/projects.js';
import { CONFIDENCE } from '../../data/schema.js';
import { timeline, allRecords, isKnown } from './compute.js';

export const FACTORS = [
  {
    id: 'promise', label: 'Promise delivery', weight: 0.35,
    definition:
      'Of the delivery milestones this company both guided and reached, the share that landed on ' +
      'target, early, or inside the guided window. Missing a window is the only outcome scored as a miss.'
  },
  {
    id: 'evidence', label: 'Evidence quality', weight: 0.30,
    definition:
      'The share of this company\'s published figures and passed gates that rest on a primary ' +
      'document rather than a second-hand report. It measures how checkable the record is, not how good it is.'
  },
  {
    id: 'timeline', label: 'Timeline stability', weight: 0.20,
    definition:
      'The share of guided milestones whose target has not moved since it was first announced. A ' +
      'target that shifts is not a missed deadline, but it is a weaker promise than one that holds.'
  },
  {
    id: 'financing', label: 'Financing', weight: 0.15,
    definition:
      'Whether capital is committed and available across the company\'s tracked projects. Not ' +
      'disclosed by most operators at project level, in which case this factor is withheld rather than assumed.'
  }
];

export const FACTOR_BY_ID = Object.fromEntries(FACTORS.map(f => [f.id, f]));

/** Composite needs this share of the total factor weight to be meaningful. */
export const MIN_WEIGHT_COVERAGE = 0.6;

/** Below this many observations, a factor is flagged as a thin sample. */
export const THIN_SAMPLE = 3;

const unavailable = (id, reason) => ({
  id, label: FACTOR_BY_ID[id].label, weight: FACTOR_BY_ID[id].weight,
  available: false, value: null, reason, sample: 0, detail: null
});

/** Promise delivery: guided milestones that were actually reached. */
function promiseFactor(projects) {
  const outcomes = projects.flatMap(p => timeline(p)).filter(t => t.outcome !== 'pending');
  if (!outcomes.length) {
    return unavailable('promise', 'No guided milestone has been reached yet, so there is nothing to score.');
  }
  const met = outcomes.filter(o => o.outcome !== 'late').length;
  return {
    id: 'promise', label: FACTOR_BY_ID.promise.label, weight: FACTOR_BY_ID.promise.weight,
    available: true, value: met / outcomes.length, sample: outcomes.length,
    detail: `${met} of ${outcomes.length} met`, reason: null
  };
}

/** Evidence quality: the share of the record backed by a primary document. */
function evidenceFactor(company, projects) {
  const records = allRecords(company).filter(isKnown);
  const gates = projects.flatMap(p => p.gates || []).filter(g => g.status !== 'notDisclosed');
  const all = [...records, ...gates];
  if (all.length < 3) {
    return unavailable('evidence', 'Too few published figures or gates to characterise.');
  }
  const confirmed = all.filter(r => CONFIDENCE[r.confidence]?.countsAsVerified).length;
  return {
    id: 'evidence', label: FACTOR_BY_ID.evidence.label, weight: FACTOR_BY_ID.evidence.weight,
    available: true, value: confirmed / all.length, sample: all.length,
    detail: `${confirmed} of ${all.length} confirmed`, reason: null
  };
}

/** Timeline stability: guided targets that have not moved. */
function timelineFactor(projects) {
  const guided = projects.flatMap(p => timeline(p));
  if (!guided.length) {
    return unavailable('timeline', 'This company has guided no dated milestone.');
  }
  const moved = guided.filter(t => t.targetMoved).length;
  return {
    id: 'timeline', label: FACTOR_BY_ID.timeline.label, weight: FACTOR_BY_ID.timeline.weight,
    available: true, value: (guided.length - moved) / guided.length, sample: guided.length,
    detail: moved
      ? `${moved} of ${guided.length} revised`
      : `${guided.length} held`,
    reason: null
  };
}

/** Financing: committed capital, where the company discloses it at project level. */
function financingFactor(projects) {
  const gates = projects
    .map(p => (p.gates || []).find(g => g.id === 'financing'))
    .filter(g => g && g.status !== 'notDisclosed');
  if (!gates.length) {
    return unavailable('financing', 'Financing is not disclosed as a project milestone.');
  }
  const scoreOf = s => (s === 'complete' ? 1 : s === 'inProgress' || s === 'conditional' ? 0.5 : 0);
  const total = gates.reduce((a, g) => a + scoreOf(g.status), 0);
  const complete = gates.filter(g => g.status === 'complete').length;
  return {
    id: 'financing', label: FACTOR_BY_ID.financing.label, weight: FACTOR_BY_ID.financing.weight,
    available: true, value: total / gates.length, sample: gates.length,
    detail: `${complete} of ${gates.length} committed`, reason: null
  };
}

/**
 * The score for one company.
 *
 * The composite is a weighted mean over the AVAILABLE factors only, and the
 * result states what share of the intended weight it actually covers. That is
 * the difference between "74, computed from three of four factors" and a bare
 * 74 that quietly treats a missing factor as a passing one.
 */
export function realityScore(company) {
  const projects = PROJECTS_BY_COMPANY[company.id] || [];
  const factors = [
    promiseFactor(projects),
    evidenceFactor(company, projects),
    timelineFactor(projects),
    financingFactor(projects)
  ];

  const got = factors.filter(f => f.available);
  const coverage = got.reduce((a, f) => a + f.weight, 0);

  if (coverage < MIN_WEIGHT_COVERAGE) {
    return {
      available: false,
      score: null,
      band: null,
      coverage,
      factors,
      reason:
        `Only ${got.length} of ${factors.length} factors can be computed from what this company has ` +
        `published, covering ${Math.round(coverage * 100)}% of the score's weight. A composite below ` +
        `${Math.round(MIN_WEIGHT_COVERAGE * 100)}% coverage is withheld rather than shown with the gaps treated as passes.`
    };
  }

  const weighted = got.reduce((a, f) => a + f.value * f.weight, 0) / coverage;
  const score = Math.round(weighted * 100);

  // A factor resting on one or two observations still moves the composite by its
  // full weight. That is not wrong, but the reader has to be told: "100%" from
  // "1 of 1 met" is a very different claim from "100%" from twenty.
  const thin = got.filter(f => f.sample < THIN_SAMPLE);

  return {
    available: true,
    score,
    band: score >= 75 ? 'strong' : score >= 50 ? 'mixed' : 'weak',
    bandLabel: score >= 75 ? 'Strong delivery record'
      : score >= 50 ? 'Mixed delivery record' : 'Weak delivery record',
    coverage,
    factors,
    missing: factors.filter(f => !f.available).map(f => f.label),
    thin,
    thinNote: thin.length
      ? `${thin.map(f => `${f.label.toLowerCase()} rests on ${f.detail}`).join('; ')}. A small sample ` +
        'moves this score as much as a large one.'
      : null,
    reason: null
  };
}
