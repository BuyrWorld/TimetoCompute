/**
 * Lead story adapter.
 *
 * Turns the newest eligible signal into plain English for the homepage. It is a
 * PRESENTATION layer: it reads existing records and rephrases them. It never
 * introduces a fact, never runs a model, and never writes a sentence the
 * underlying record does not already support.
 *
 * The rule that shapes the whole file: A GATE MUST NEVER BE OVERSTATED.
 * Acceptance is not billing. A contract is not energisation. A raised target is
 * not delivery. Each consequence sentence below is therefore chosen by looking
 * at what the company has ACTUALLY disclosed about the *next* gate, not by
 * assuming what usually follows.
 *
 * Selection is deterministic — newest announcement date, then highest
 * significance, then id — so the same data always produces the same homepage.
 */
import { GATE_BY_ID } from '../../data/schema.js';
import { COMPANIES } from '../../data/companies.js';
import { CONTRACTS, PROJECTS } from '../../data/projects.js';
import { signals } from './signals.js';
import { companyPath, path as projectPath, nextMilestone } from './sites.js';
import { getMeasure, isKnown } from './compute.js';
import { mw, date, windowLabel } from './format.js';

const COMPANY_BY_ID = Object.fromEntries(COMPANIES.map(c => [c.id, c]));
const PROJECT_BY_ID = Object.fromEntries(PROJECTS.map(p => [p.id, p]));

const SIGNIFICANCE_RANK = { high: 3, medium: 2, low: 1 };

/** Simple and detailed labels for the delivery journey, per the copy deck. */
export const JOURNEY = [
  { id: 'announced', simple: 'Promised', detailed: 'Announced' },
  { id: 'power', simple: 'Power secured', detailed: 'Power secured' },
  { id: 'construction', simple: 'Being built', detailed: 'Construction' },
  { id: 'energised', simple: 'Switched on', detailed: 'Energised' },
  { id: 'contracted', simple: 'Customer signed', detailed: 'Customer contracted' },
  { id: 'acceptance', simple: 'Customer accepted', detailed: 'Customer accepted' },
  { id: 'billing', simple: 'Earning money', detailed: 'Billing' }
];

const JOURNEY_BY_ID = Object.fromEntries(JOURNEY.map(j => [j.id, j]));

/** The customer a project's own contracts name, where the company named one. */
function customerFor(projectId) {
  if (!projectId) return null;
  const named = CONTRACTS.filter(c =>
    Array.isArray(c.projectIds) && c.projectIds.includes(projectId));
  // Only a single unambiguous customer is used in a headline. Two customers on
  // one site is a sentence the headline cannot make without choosing between
  // them, so the operator leads instead.
  const names = [...new Set(named.map(c => c.customer))];
  return names.length === 1 ? names[0] : null;
}

/**
 * The headline, built from structured fields rather than from prose.
 *
 * Every branch states only the action the event type records. There is no
 * template that promotes an event to a later gate than it evidences.
 */
export function headlineFor(s) {
  const co = COMPANY_BY_ID[s.companyId];
  const ticker = co?.ticker || s.companyId;
  const name = co?.name || s.companyId;
  const customer = customerFor(s.projectId);
  const size = s.unit === 'MW' && typeof s.newValue === 'number' ? mw(s.newValue) : null;
  const delta = s.unit === 'MW' && typeof s.newValue === 'number' && typeof s.previousValue === 'number'
    ? mw(s.newValue - s.previousValue) : null;

  switch (s.eventType) {
    case 'customer-accepted':
      return customer && size
        ? `${customer} accepts ${ticker}'s first ${size} AI deployment`
        : size ? `${name}'s ${size} deployment is accepted by its customer`
          : `${name} reports a customer acceptance`;

    case 'revenue-commenced':
      return size
        ? `${name} begins earning on ${size} of critical IT`
        : `${name} reports revenue has begun`;

    case 'contract-signed':
      return customer && size ? `${ticker} signs ${customer} for ${size}`
        : size ? `${name} signs a customer for ${size}`
          : `${name} signs a new customer contract`;

    case 'capacity-change':
      return delta && s.newValue > s.previousValue
        ? `${name} adds ${delta} of ${(s.metricLabel || 'capacity').toLowerCase()}`
        : `${name} restates its capacity`;

    case 'target-change':
      // A target is an ambition. The verb must never suggest delivery.
      return size ? `${name} raises its target to ${size}` : `${name} changes a target`;

    case 'stage-change':
      return `${name} passes a delivery milestone`;

    case 'disposal':
      return `${name} disposes of capacity`;

    case 'new-disclosure':
    default:
      return `${name} publishes a new disclosure`;
  }
}

/**
 * The consequence sentence.
 *
 * This is where overstating a gate would be easiest, so each branch checks what
 * the company has disclosed about the NEXT gate before saying anything about it.
 */
export function consequenceFor(s) {
  const co = COMPANY_BY_ID[s.companyId];
  const billingKnown = co ? isKnown(getMeasure(co, 'revenueLiveMw')) : false;

  switch (s.eventType) {
    case 'customer-accepted':
      return billingKnown
        ? 'One major delivery risk has been removed, and this operator has separately disclosed billing capacity.'
        : 'One major delivery risk has been removed. Billing has not yet been disclosed.';

    case 'revenue-commenced':
      return 'Capacity has moved from delivered to earning. This is the last gate on the delivery path.';

    case 'contract-signed':
      return 'Demand is now contracted. Contracted capacity is not built capacity, and no delivery date follows from a signature.';

    case 'capacity-change':
      return typeof s.previousValue === 'number' && s.newValue > s.previousValue
        ? 'Supply controlled has grown. Power controlled on paper is not compute a customer is paying for.'
        : 'A published capacity figure has been restated.';

    case 'target-change':
      return 'This is a management goal for a future date, not capacity that exists today. It is excluded from every current-capacity total.';

    case 'disposal':
      return 'Capacity has left the portfolio and is removed from current totals.';

    case 'stage-change':
      return 'An independently evidenced gate has advanced. Gates move at different rates and one does not imply the next.';

    default:
      return 'A new figure has been published and added to the record.';
  }
}

/**
 * Map a set of path stages onto the two-layer journey vocabulary.
 *
 * "Promised" and "Announced" are the same gate said two ways: one for a reader
 * who has never bought a megawatt, one for a reader who has. Both ship, so
 * neither audience is patronised or lost.
 */
export function journeyRail(stages) {
  const lastComplete = stages.reduce((acc, st, i) => (st.status === 'complete' ? i : acc), -1);
  return stages.map((st, i) => {
    const j = JOURNEY_BY_ID[st.id] || { simple: st.label, detailed: st.label };
    const state = st.status === 'complete' ? 'complete'
      // Implied is its own state, never folded into complete: it means the
      // stage must have happened, not that a document says it did.
      : st.status === 'implied' ? 'implied'
        : i === lastComplete + 1 && st.status !== 'notDisclosed' ? 'current'
          : st.status === 'notDisclosed' ? 'unknown' : 'pending';
    return {
      id: st.id, simple: j.simple, detailed: j.detailed, state,
      statusLabel: st.statusLabel, effectiveAt: st.effectiveAt,
      sourceIds: st.sourceIds, gates: st.gates,
      /* THE GATE NOTE TRAVELS WITH THE STAGE.
         This mapping dropped `notes`, which was survivable only while the
         status ladder also rendered and carried them. It no longer does, and
         the omission silently took 23 qualifiers off the site pages — including
         the FERC note saying in terms that a federal approval is NOT approval
         to build a data centre. A note attached to a gate exists precisely to
         stop the gate being read as more than it is. */
      notes: st.notes || null,
      impliedBy: st.impliedBy || null
    };
  });
}

/**
 * The journey rail for whichever subject the story is about.
 *
 * One mapping, shared with the site pages. There used to be two — this one and
 * journeyRail — and they drifted the moment `implied` was added: the same stage
 * came back labelled "Implied" but in state "pending", so it drew as a stage
 * still to come. Anything status-to-state goes through journeyRail now.
 */
function railFor(s) {
  const stages = s.projectId && PROJECT_BY_ID[s.projectId]
    ? projectPath(PROJECT_BY_ID[s.projectId])
    : companyPath(s.companyId);
  return journeyRail(stages);
}

/**
 * What happens next, and what could stop it — both read off the record rather
 * than reasoned about. Where nothing is disclosed, that is what it says.
 */
function nextAndBlockers(s) {
  const project = s.projectId ? PROJECT_BY_ID[s.projectId] : null;
  const next = project ? nextMilestone(project) : null;

  let whatNext;
  if (!next) {
    whatNext = 'Every tracked stage on this record is complete.';
  } else if (next.schedule && next.schedule.kind === 'exact') {
    whatNext = `${next.label} is the next gate, guided for ${date(next.schedule.exact)}.`;
  } else if (next.schedule && next.schedule.kind === 'window') {
    whatNext = `${next.label} is the next gate, guided for ${windowLabel(next.schedule.start, next.schedule.end)}. ` +
      'A guided window is not a date.';
  } else {
    whatNext = `${next.label} is the next gate. No date or window has been guided for it.`;
  }

  const blockers = [];
  if (next && next.status === 'notDisclosed') {
    blockers.push(`${next.label} has no gate on record — the company has not published its status.`);
  }
  if (project) {
    const undisclosed = projectPath(project)
      .filter(st => st.status === 'notDisclosed')
      .map(st => st.label);
    if (undisclosed.length) {
      blockers.push(`${undisclosed.length} of the seven stages carry no disclosure: ${undisclosed.join(', ')}.`);
    }
  }
  const co = COMPANY_BY_ID[s.companyId];
  if (co && !isKnown(getMeasure(co, 'revenueLiveMw'))) {
    blockers.push('This operator has not disclosed any billing capacity, so revenue timing cannot be evidenced.');
  }
  if (!blockers.length) {
    blockers.push('No outstanding gate is recorded against this milestone.');
  }
  return { whatNext, blockers };
}

/**
 * What investors are watching. Up to three real items, each carrying a state
 * from the copy deck's fixed vocabulary. Nothing is invented: an item only
 * appears when a record supports it.
 */
function watchItems(s) {
  const items = [];
  const co = COMPANY_BY_ID[s.companyId];
  const project = s.projectId ? PROJECT_BY_ID[s.projectId] : null;

  // 1. Remaining contracted capacity not yet accepted.
  if (co) {
    const contracted = getMeasure(co, 'customerContractedMw');
    const accepted = getMeasure(co, 'customerAcceptedMw');
    if (isKnown(contracted) && isKnown(accepted) && contracted.valueMw > accepted.valueMw) {
      items.push({
        title: `Remaining contracted capacity`,
        detail: `${mw(contracted.valueMw - accepted.valueMw)} contracted and not yet accepted`,
        state: 'Unresolved',
        href: `/companies/${co.slug}/#capacity`
      });
    }
  }

  // 2. Billing, where acceptance exists but billing does not.
  if (co && isKnown(getMeasure(co, 'customerAcceptedMw')) && !isKnown(getMeasure(co, 'revenueLiveMw'))) {
    items.push({
      title: 'Billing confirmation',
      detail: 'Acceptance is confirmed; billing commencement is not disclosed',
      state: 'Pending evidence',
      href: `/companies/${co.slug}/#path`
    });
  }

  // 3. The next gate on the affected project — unless an item above already
  //    covers it. "Billing confirmation" and "next gate: Billing" are the same
  //    row twice, and a panel capped at three cannot afford to repeat itself.
  if (project) {
    const next = nextMilestone(project);
    const alreadyCovered = next && items.some(i => i.title.toLowerCase().includes(next.label.toLowerCase()));
    if (next && !alreadyCovered) {
      const s2 = next.schedule;
      items.push({
        title: next.label,
        detail: s2 && s2.kind === 'exact' ? `Guided for ${date(s2.exact)}`
          : s2 && s2.kind === 'window' ? `Guided for ${windowLabel(s2.start, s2.end)}`
            : 'No date or window guided',
        state: s2 ? 'On track' : 'Date unknown',
        href: `/sites/${project.id}/`
      });
    }
  }

  return items.slice(0, 3);
}

/**
 * The homepage lead story.
 *
 * Eligibility: confirmed confidence only. The homepage headline is the loudest
 * claim on the site and it may only rest on a primary document. If nothing
 * qualifies, the caller gets `available: false` and shows the honest fallback
 * rather than promoting a weaker record into the hero.
 */
export function leadStory() {
  const eligible = signals({})
    .filter(s => s.confidence === 'confirmed')
    .sort((a, b) =>
      String(b.announcedAt).localeCompare(String(a.announcedAt)) ||
      (SIGNIFICANCE_RANK[b.significance] || 0) - (SIGNIFICANCE_RANK[a.significance] || 0) ||
      String(a.id).localeCompare(String(b.id)));

  if (!eligible.length) {
    return { available: false, reason: 'No confirmed record is on file yet.' };
  }
  return storyFor(eligible[0]);
}

/**
 * The full story for any one signal.
 *
 * This was the body of `leadStory()`, which built the what-happened /
 * why-it-matters / what-next triad for the single record it had chosen. AI News
 * needs the same triad for every signal it shows, and the only wrong way to get
 * it is a second implementation that drifts from this one — the site has already
 * shipped a bug caused by exactly that. So the logic moved out here and
 * `leadStory()` became a selection rule with a call.
 *
 * Nothing about the output changed.
 */
export function storyFor(s) {
  const co = COMPANY_BY_ID[s.companyId];
  const project = s.projectId ? PROJECT_BY_ID[s.projectId] : null;
  const { whatNext, blockers } = nextAndBlockers(s);

  return {
    available: true,
    signal: s,
    id: s.id,
    company: co || null,
    companyName: co?.name || s.companyId,
    ticker: co?.ticker || null,
    companySlug: co?.slug || null,
    project,
    projectSlug: project ? project.id : null,
    projectName: project ? project.name : null,
    customer: customerFor(s.projectId),

    headline: headlineFor(s),
    consequence: consequenceFor(s),

    // The drawer. Two of these come straight from curated fields in the record;
    // the rest are assembled from structured facts.
    whatHappened: s.summary,
    whyItMatters: s.implication || consequenceFor(s),
    whatChanged: s.previousValue !== null && s.newValue !== null && s.unit
      ? `${s.metricLabel || 'Value'}: ${s.previousValue} → ${s.newValue} ${s.unit}.`
      : s.newValue !== null && s.unit
        ? `${s.metricLabel || 'Value'} recorded at ${s.newValue} ${s.unit}, with no previously published figure.`
        : 'A gate advanced; no megawatt figure changed with it.',
    whatHappensNext: whatNext,
    blockers,

    announcedAt: s.announcedAt,
    effectiveAt: s.effectiveAt,
    confidence: s.confidence,
    sourceIds: s.sourceIds,
    rail: railFor(s),
    watching: watchItems(s)
  };
}
