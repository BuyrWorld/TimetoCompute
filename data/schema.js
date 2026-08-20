/**
 * T2C data schema.
 *
 * Three distinctions carry the whole product, and conflating any of them produces
 * a number that looks authoritative and means nothing:
 *
 *   1. WHAT IS BEING MEASURED — gross utility power at the fence, critical IT load
 *      in the hall, and GPU load are different quantities. They are never summed.
 *   2. WHAT KIND OF NUMBER IT IS — an actual operating figure, a disclosed minimum,
 *      a management target, a development pipeline, and a theoretical potential are
 *      different data types. Only actuals enter a current-capacity aggregate.
 *   3. HOW WELL IT IS EVIDENCED — confirmed against a primary document, reported,
 *      estimated, or not disclosed.
 */

/** How well evidenced a value is. */
export const CONFIDENCE = {
  confirmed: {
    label: 'Confirmed', short: 'CONF', glyph: '●', rank: 3, countsAsVerified: true,
    definition:
      'Stated in a primary document — an SEC filing, an official investor-relations release, a ' +
      'shareholder letter, or a regulator/utility record — and that document is linked.'
  },
  reported: {
    label: 'Reported', short: 'REP', glyph: '◐', rank: 2, countsAsVerified: false,
    definition:
      'Attributed to the company but read second-hand, or carried over from an earlier compile ' +
      'whose original document is not linked. News can put a figure here; it can never make one confirmed.'
  },
  estimated: {
    label: 'Estimated', short: 'EST', glyph: '◌', rank: 1, countsAsVerified: false,
    definition:
      'Derived rather than disclosed. Shown separately from confirmed figures, with the derivation ' +
      'stated, and never included in a confirmed total.'
  },
  unknown: {
    label: 'Not disclosed', short: 'N/D', glyph: '—', rank: 0, countsAsVerified: false,
    definition:
      'The company has not published this figure. It is stored as null and is never treated as zero.'
  }
};

/**
 * What kind of quantity the number is. This is the distinction that stops a 5 GW
 * ambition being added to a 1.5 GW operating figure.
 */
export const VALUE_STATUS = {
  actual: {
    label: 'Actual', short: 'ACTUAL', glyph: '●', aggregatable: true,
    definition: 'A current, operating figure as at the stated date.'
  },
  minimum: {
    label: 'Disclosed minimum', short: 'MIN', glyph: '≥', aggregatable: true,
    definition:
      'At least this much, from the components the company has itemised. The company has not ' +
      'published an exhaustive total, so the real figure may be higher.'
  },
  target: {
    label: 'Target', short: 'TARGET', glyph: '◇', aggregatable: false,
    definition:
      'A management goal for a future date. An intention, not a capability that exists today, and ' +
      'never counted in a current-capacity total.'
  },
  pipeline: {
    label: 'Pipeline', short: 'PIPE', glyph: '◇', aggregatable: false,
    definition:
      'Identified development opportunity — sites under study, options held, applications lodged. ' +
      'Not secured and not built.'
  },
  potential: {
    label: 'Potential', short: 'POT', glyph: '◇', aggregatable: false,
    definition:
      'A theoretical ceiling, typically phrased "up to". Conditional on approvals, financing and ' +
      'demand that do not yet exist.'
  }
};

/** What the megawatts actually measure. Different bases are never added. */
export const POWER_BASIS = {
  'gross-utility': {
    label: 'Gross utility power', short: 'Gross', glyph: '⌁',
    definition:
      'Power contracted at the utility connection, before conversion, cooling and distribution ' +
      'losses. The largest number a company can quote, and the least indicative of compute delivered.'
  },
  'critical-it': {
    label: 'Critical IT load', short: 'Critical IT', glyph: '▣',
    definition:
      'Power available to IT equipment inside the hall. The industry\'s comparable measure of usable ' +
      'data-centre capacity, and typically well below the gross utility figure for the same site.'
  },
  'gpu-load': {
    label: 'GPU load', short: 'GPU', glyph: '◈',
    definition: 'Power drawn by accelerators specifically, excluding other IT and infrastructure load.'
  },
  'not-applicable': {
    label: 'Not applicable', short: 'N/A', glyph: '·',
    definition: 'The figure is not a power measurement — a contract value or a count, for example.'
  }
};

/**
 * Project gates, tracked independently. A single "stage" hid the common real case:
 * zoning granted while interconnection, environmental approval and financing all
 * remain outstanding. Order is the usual sequence, not a required one.
 */
export const GATES = [
  { id: 'siteControl', order: 0, label: 'Site control', definition: 'Ownership, lease or option over the land secured.' },
  { id: 'utilityAgreement', order: 1, label: 'Utility agreement', definition: 'Executed electric service or energy-services agreement with the supplier.' },
  { id: 'interconnection', order: 2, label: 'Interconnection approved', definition: 'Grid interconnection study complete and connection approved.' },
  { id: 'zoning', order: 3, label: 'Zoning approved', definition: 'Local land-use consent granted for data-centre use.' },
  {
    id: 'regulatoryApproval', order: 4, label: 'Regulatory approval',
    definition:
      'Federal or state authorisation for the transaction or the asset — a FERC order, a state utility ' +
      'commission approval. Distinct from zoning and from environmental permits, and frequently narrower ' +
      'than it appears: approval to acquire a power plant is not approval to build a data centre on it.'
  },
  { id: 'environmental', order: 5, label: 'Environmental approval', definition: 'Environmental permits and assessments granted.' },
  { id: 'buildingPermits', order: 6, label: 'Building permits', definition: 'Construction permits issued.' },
  { id: 'financing', order: 7, label: 'Financing committed', definition: 'Capital committed and available to build.' },
  { id: 'longLeadOrdered', order: 8, label: 'Long-lead equipment ordered', definition: 'Transformers, switchgear, generators and chillers on order.' },
  { id: 'constructionStarted', order: 9, label: 'Construction started', definition: 'Physical construction under way on site.' },
  { id: 'utilityEnergised', order: 10, label: 'Utility energised', definition: 'Grid power delivered to the site.' },
  { id: 'criticalItEnergised', order: 11, label: 'Critical IT energised', definition: 'IT load live and drawing power in the hall.' },
  { id: 'customerContracted', order: 12, label: 'Customer contracted', definition: 'A paying customer has signed for the capacity.' },
  { id: 'customerAccepted', order: 13, label: 'Customer accepted', definition: 'Capacity formally accepted under the customer agreement.' },
  { id: 'revenueCommenced', order: 14, label: 'Billing / revenue commenced', definition: 'The company has disclosed that billing or revenue generation has begun.' }
];

export const GATE_BY_ID = Object.fromEntries(GATES.map(g => [g.id, g]));

export const GATE_STATUS = {
  complete: { label: 'Complete', glyph: '●', tone: 'ok' },
  inProgress: { label: 'In progress', glyph: '◐', tone: 'warn' },
  conditional: { label: 'Conditional', glyph: '◑', tone: 'warn' },
  notStarted: { label: 'Not started', glyph: '○', tone: 'unknown' },
  notDisclosed: { label: 'Not disclosed', glyph: '—', tone: 'unknown' },
  notApplicable: { label: 'Not applicable', glyph: '·', tone: 'unknown' }
};

/** Metrics. `basis` fixes the measurement; `family` stops supply and demand mixing. */
export const METRICS = {
  securedPowerMw: {
    label: 'Secured power', unit: 'MW', family: 'power',
    definition:
      'Power capacity controlled through executed utility, interconnection, energy-service, lease or ' +
      'comparable arrangements. It may include capacity already operating as well as capacity awaiting ' +
      'development. Secured power indicates supply control, not customer demand or completed compute capacity.'
  },
  pipelinePowerMw: {
    label: 'Development pipeline', unit: 'MW', family: 'power',
    definition:
      'Identified development opportunity that is not yet secured — sites under study, options, and ' +
      'applications lodged. Reported separately from secured power and never added to it.'
  },
  constructionMw: {
    label: 'Under construction', unit: 'MW', family: 'power',
    definition: 'Capacity with physical construction under way. Capital committed, no revenue from it yet.'
  },
  energisedGrossMw: {
    label: 'Energised gross power', unit: 'MW', family: 'power',
    definition:
      'Gross power capacity from the utility that is live and in use at the sites. Measured at the ' +
      'connection, before conversion and cooling losses, so it is materially larger than the critical ' +
      'IT load it can support and is never compared with a critical-IT figure.'
  },
  energisedCriticalItMw: {
    label: 'Energised critical IT', unit: 'MW', family: 'power',
    definition:
      'Critical IT load live and drawing power. Often described by companies as "active" or ' +
      '"operational" capacity. It does not by itself mean a customer is paying for it.'
  },
  gpuReadyMw: {
    label: 'GPU-ready', unit: 'MW', family: 'compute',
    definition:
      'Accelerators racked and fabric commissioned. Applies to operators that own the chips; not ' +
      'applicable to landlords whose tenants bring their own.'
  },
  customerContractedMw: {
    label: 'Customer-contracted', unit: 'MW', family: 'customer',
    definition:
      'Compute or capacity a paying customer has committed to under a signed contract. Demand, not ' +
      'supply. Frequently disclosed only for individual named contracts, in which case the site total ' +
      'is a disclosed minimum rather than an exhaustive figure.'
  },
  customerAcceptedMw: {
    label: 'Customer-accepted', unit: 'MW', family: 'customer',
    definition:
      'Capacity formally accepted under the relevant customer agreement. Acceptance may trigger billing ' +
      'or revenue recognition, but the commercial effect is contract-specific and must be separately evidenced.'
  },
  revenueLiveMw: {
    label: 'Revenue live', unit: 'MW', family: 'customer',
    definition:
      'Capacity for which the company has explicitly disclosed that billing, rent commencement or ' +
      'revenue generation has begun. Billing, GAAP revenue recognition and cash receipt are not assumed ' +
      'to occur simultaneously.'
  }
};

export const MODELS = {
  fullStack: {
    id: 'fullStack', label: 'Full stack',
    definition:
      'Owns the accelerators and sells finished compute. Captures far more revenue per megawatt, and ' +
      'carries the chip capital cost and obsolescence risk to match.'
  },
  poweredShell: {
    id: 'poweredShell', label: 'Powered shell',
    definition:
      'Leases powered, cooled space; the tenant supplies its own accelerators where the lease says so. ' +
      'Earns a few million per megawatt per year rather than tens, with correspondingly lower capital cost.'
  }
};

export const EVENT_TYPES = {
  'new-disclosure': { label: 'New disclosure' },
  'capacity-change': { label: 'Capacity change' },
  'stage-change': { label: 'Stage change' },
  'target-change': { label: 'Target change' },
  'contract-signed': { label: 'Contract signed' },
  'customer-accepted': { label: 'Customer accepted' },
  'revenue-commenced': { label: 'Revenue commenced' },
  delay: { label: 'Delay', negative: true },
  financing: { label: 'Financing' },
  correction: { label: 'Correction' },
  disposal: { label: 'Disposal' }
};

export const SIGNIFICANCE = { high: { label: 'High' }, medium: { label: 'Medium' }, low: { label: 'Low' } };

/**
 * Build a metric record. `valueMw: null` is the only supported way to express
 * "not disclosed", so a missing figure can never be coerced to 0 by a caller.
 */
export function metric({
  metric: name,
  valueMw = null,
  confidence = 'unknown',
  valueStatus = 'actual',
  powerBasis = 'not-applicable',
  asOf = null,
  verifiedAt = null,
  sourceIds = [],
  isExhaustive = false,
  notes = null
}) {
  if (!METRICS[name]) throw new Error(`Unknown metric: ${name}`);
  if (!CONFIDENCE[confidence]) throw new Error(`Unknown confidence: ${confidence}`);
  if (!VALUE_STATUS[valueStatus]) throw new Error(`Unknown valueStatus: ${valueStatus}`);
  if (!POWER_BASIS[powerBasis]) throw new Error(`Unknown powerBasis: ${powerBasis}`);

  const known = valueMw !== null && valueMw !== undefined;
  return {
    metric: name,
    valueMw: known ? valueMw : null,
    unit: METRICS[name].unit,
    family: METRICS[name].family,
    definition: METRICS[name].definition,
    confidence: known ? confidence : 'unknown',
    valueStatus,
    powerBasis,
    asOf,
    verifiedAt,
    sourceIds,
    isExhaustive: known ? isExhaustive : false,
    notes,
    /** a known value with no cited document */
    sourceRequired: known && sourceIds.length === 0
  };
}

/** Build a project gate record. */
export function gate({ id, status = 'notDisclosed', effectiveAt = null, sourceIds = [], confidence = 'unknown', verifiedAt = null, notes = null }) {
  if (!GATE_BY_ID[id]) throw new Error(`Unknown gate: ${id}`);
  if (!GATE_STATUS[status]) throw new Error(`Unknown gate status: ${status}`);
  return { id, status, effectiveAt, sourceIds, confidence, verifiedAt, notes };
}

/**
 * A scheduled milestone: when a company says a gate will be reached.
 *
 * Almost all delivery guidance is a WINDOW — "second half of 2027", "Q1 2028" —
 * not a date. Storing "H2 2027" as 2027-12-31 would manufacture precision the
 * company never gave, so a window is stored as a window and rendered as one.
 *
 * Schedules are append-only per gate. Two entries for the same gate with
 * different announcedAt dates ARE the target-change history: the earliest is the
 * original target, the latest is the current one, and the difference is a slip.
 */
export const SCHEDULE_KIND = {
  exact: { label: 'Confirmed date' },
  window: { label: 'Guided window' },
  notDisclosed: { label: 'Not disclosed' }
};

/** Common guidance windows, so "H2 2027" maps to real bounds in one place. */
export function windowFor(label) {
  const m = String(label).trim().match(/^(H[12]|Q[1-4]|FY)?\s*(\d{4})$/i);
  if (!m) return null;
  const [, period, year] = m;
  const y = Number(year);
  const p = (period || '').toUpperCase();
  const range = {
    H1: ['01-01', '06-30'], H2: ['07-01', '12-31'],
    Q1: ['01-01', '03-31'], Q2: ['04-01', '06-30'],
    Q3: ['07-01', '09-30'], Q4: ['10-01', '12-31'],
    '': ['01-01', '12-31'], FY: ['01-01', '12-31']
  }[p];
  if (!range) return null;
  return { start: `${y}-${range[0]}`, end: `${y}-${range[1]}` };
}

export function schedule({
  gate: gateId,
  label = null,
  exact = null,
  start = null,
  end = null,
  announcedAt,
  sourceIds = [],
  confidence = 'unknown',
  verifiedAt = null,
  notes = null,
  /**
   * Names a sub-unit of the project — an individual building, phase or tranche.
   * A scoped schedule must NEVER be scored against the project-level gate: Lake
   * Mariner's CB-4 rent-commencement guidance measured against the pre-existing
   * 102 MW produced "early by 1 day", which is an artifact, not a finding. Scoped
   * milestones are displayed but only score once that sub-unit has its own actual.
   */
  scope = null
}) {
  if (!GATE_BY_ID[gateId]) throw new Error(`Unknown gate in schedule: ${gateId}`);
  if (!announcedAt) throw new Error(`Schedule for ${gateId} needs announcedAt — a target with no stated date is not a target`);

  // A label like "H2 2027" resolves to bounds; an explicit start/end wins.
  const derived = !start && !end && label ? windowFor(label) : null;
  const s = start || derived?.start || null;
  const e = end || derived?.end || null;

  const kind = exact ? 'exact' : (s && e) ? 'window' : 'notDisclosed';
  return {
    gate: gateId, kind, exact, start: s, end: e,
    label: label || (exact ? exact : null),
    announcedAt, sourceIds, confidence, verifiedAt, notes, scope
  };
}

/**
 * A PHASE of a site — one block of capacity with its own progress.
 *
 * WHY THIS EXISTS. A site record held one linear run of gates, and real builds
 * do not work that way. An operator energises a block, starts billing it, and
 * begins the next block, so two parts of one site sit at different stages at
 * once. Forced onto one track that renders as a contradiction: Lake Mariner
 * showed construction IN PROGRESS positioned before energised COMPLETE, which
 * is incoherent — you cannot energise a hall you have not built.
 *
 * The record was not wrong. Both facts were true of different blocks. The
 * schema had nowhere to say which block each belonged to.
 *
 * `scope` on a schedule was the first half of this fix, and its comment above
 * describes the same bug from the other end: a CB-4 guidance date measured
 * against the pre-existing 102 MW produced "early by 1 day", an artifact of
 * comparing one block's target to another block's actual. Gates now carry the
 * same idea, properly.
 *
 * THE RULES THAT KEEP THIS HONEST:
 *
 *   A phase's capacity is disclosed or it is null. Never the remainder after
 *   subtracting the phases that are disclosed — that arithmetic looks like a
 *   figure and is an inference.
 *
 *   Site capacity is the sum of its phases ONLY when every phase carries a
 *   capacity on the same basis. Otherwise the site keeps its own disclosed
 *   figure and the phases are a breakdown of it, not a computation of it.
 *
 *   Two blocks whose split is not disclosed stay one phase. Lake Mariner
 *   discloses 336 MW "across CB-4 and CB-5" and does not say how it divides, so
 *   CB-4 and CB-5 are one phase here. Splitting them evenly would invent two
 *   figures where the source gives one.
 */
export function phase({
  id,
  name,
  capacityMw = null,
  powerBasis = null,
  status = 'notDisclosed',
  gates = [],
  sourceIds = [],
  note = null
}) {
  if (!id) throw new Error('A phase needs an id');
  if (!name) throw new Error(`Phase ${id} needs a name a reader would recognise`);
  if (capacityMw !== null && !(capacityMw > 0)) throw new Error(`Phase ${id} has a non-positive capacity`);
  if (capacityMw !== null && !POWER_BASIS[powerBasis]) {
    throw new Error(`Phase ${id} states a capacity with no valid basis — two blocks quoting the same number may be measuring different things`);
  }
  if (!GATE_STATUS[status]) throw new Error(`Phase ${id} has an unknown status: ${status}`);
  return { id, name, capacityMw, powerBasis, status, gates, sourceIds, note };
}

/**
 * Site capacity from phases, or null when the phases cannot honestly be summed.
 *
 * Returns null rather than a partial total if any phase lacks a capacity or
 * states a different basis. A partial sum presented as a site total is the
 * error this whole model exists to prevent — it would look like a disclosure.
 */
export function phaseCapacity(phases) {
  if (!Array.isArray(phases) || !phases.length) return null;
  if (phases.some(p => p.capacityMw === null)) return null;
  const bases = new Set(phases.map(p => p.powerBasis));
  if (bases.size !== 1) return null;
  return { mw: phases.reduce((n, p) => n + p.capacityMw, 0), basis: [...bases][0] };
}
