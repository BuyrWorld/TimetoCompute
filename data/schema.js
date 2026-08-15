/**
 * T2C data schema.
 *
 * The whole site answers one question: how long does secured power take to become
 * accepted, invoicing compute? That journey has distinct stages, and the previous
 * version of this site collapsed several of them into one word ("contracted"),
 * which made two very different things look identical:
 *
 *   - power contracted FROM a utility or landlord   (securedPowerMw)
 *   - compute capacity contracted TO a customer     (customerContractedMw)
 *
 * A company can hold gigawatts of the first and nothing of the second. Keeping
 * them apart is the point of this file.
 */

/** Ordered stages of the delivery journey. Index = position in the pipeline. */
export const STAGES = [
  {
    id: 'secured',
    order: 0,
    label: 'Power secured',
    short: 'Secured',
    metric: 'securedPowerMw',
    glyph: '○',
    definition:
      'Grid capacity contracted from a utility, or a powered site secured from a landlord. ' +
      'This is an agreement about electricity, not about customers. Nothing is built and no ' +
      'customer has signed.'
  },
  {
    id: 'permitted',
    order: 1,
    label: 'Permitted',
    short: 'Permitted',
    metric: 'permittedPowerMw',
    glyph: '◔',
    definition:
      'Planning, zoning and interconnection approvals granted for the capacity. Permits are ' +
      'the most common place a project silently slips by quarters.'
  },
  {
    id: 'construction',
    order: 2,
    label: 'In construction',
    short: 'Building',
    metric: 'constructionMw',
    glyph: '◑',
    definition:
      'Physical build under way — shell, substation, cooling and power distribution. Capital is ' +
      'going out; nothing is coming in.'
  },
  {
    id: 'energised',
    order: 3,
    label: 'Energised (critical IT)',
    short: 'Energised',
    metric: 'energisedCriticalItMw',
    glyph: '◕',
    definition:
      'Critical IT load is live and drawing power. The building works. This is the figure most ' +
      'often quoted as "active" or "operational" capacity, and it does not by itself mean any ' +
      'customer is paying for it.'
  },
  {
    id: 'gpuReady',
    order: 4,
    label: 'GPU-ready',
    short: 'GPU-ready',
    metric: 'gpuReadyMw',
    glyph: '◕',
    definition:
      'Racks populated with accelerators and the fabric commissioned. Relevant to full-stack ' +
      'operators who own the chips; not applicable to powered-shell landlords, whose tenants ' +
      'bring their own.'
  },
  {
    id: 'accepted',
    order: 5,
    label: 'Customer accepted',
    short: 'Accepted',
    metric: 'customerAcceptedMw',
    glyph: '◉',
    definition:
      'The customer has formally accepted the capacity against the contract\'s acceptance ' +
      'criteria. Acceptance is the milestone that starts the revenue clock, and it is usually ' +
      'disclosed weeks before the revenue itself appears.'
  },
  {
    id: 'revenueLive',
    order: 6,
    label: 'Revenue live',
    short: 'Invoicing',
    metric: 'revenueLiveMw',
    glyph: '●',
    definition:
      'Capacity that is accepted and invoicing. The only number on this site that corresponds ' +
      'to money actually arriving.'
  }
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]));

/**
 * Every metric the site can display. `family` separates the two contract types so
 * they can never be summed together by accident.
 */
export const METRICS = {
  securedPowerMw: {
    label: 'Secured power',
    unit: 'MW',
    family: 'power',
    stage: 'secured',
    definition: STAGE_BY_ID.secured.definition
  },
  permittedPowerMw: {
    label: 'Permitted power',
    unit: 'MW',
    family: 'power',
    stage: 'permitted',
    definition: STAGE_BY_ID.permitted.definition
  },
  constructionMw: {
    label: 'In construction',
    unit: 'MW',
    family: 'power',
    stage: 'construction',
    definition: STAGE_BY_ID.construction.definition
  },
  energisedCriticalItMw: {
    label: 'Energised critical IT',
    unit: 'MW',
    family: 'power',
    stage: 'energised',
    definition: STAGE_BY_ID.energised.definition
  },
  gpuReadyMw: {
    label: 'GPU-ready',
    unit: 'MW',
    family: 'compute',
    stage: 'gpuReady',
    definition: STAGE_BY_ID.gpuReady.definition
  },
  customerContractedMw: {
    label: 'Customer-contracted',
    unit: 'MW',
    family: 'customer',
    stage: null,
    definition:
      'Compute capacity a paying customer has committed to under a signed contract. This is ' +
      'not the same as secured power: it is demand, not supply.'
  },
  customerAcceptedMw: {
    label: 'Customer-accepted',
    unit: 'MW',
    family: 'customer',
    stage: 'accepted',
    definition: STAGE_BY_ID.accepted.definition
  },
  revenueLiveMw: {
    label: 'Revenue live',
    unit: 'MW',
    family: 'customer',
    stage: 'revenueLive',
    definition: STAGE_BY_ID.revenueLive.definition
  }
};

/**
 * Confidence is about the evidence, not about our opinion of the company.
 * `countsAsVerified` gates which records may appear in a "confirmed" aggregate.
 */
export const CONFIDENCE = {
  confirmed: {
    label: 'Confirmed',
    short: 'CONF',
    glyph: '●',
    rank: 3,
    countsAsVerified: true,
    definition:
      'Stated by the company in a primary document — an SEC filing, an earnings release or an ' +
      'investor presentation — and the source is linked.'
  },
  reported: {
    label: 'Reported',
    short: 'REP',
    glyph: '◐',
    rank: 2,
    countsAsVerified: false,
    definition:
      'Attributed to the company but read second-hand, or carried over from an earlier compile ' +
      'whose original document is not yet linked. Treat as indicative until a source is attached.'
  },
  estimated: {
    label: 'Estimated',
    short: 'EST',
    glyph: '◌',
    rank: 1,
    countsAsVerified: false,
    definition:
      'Derived rather than disclosed. Always shown separately from confirmed figures and never ' +
      'included in a confirmed total.'
  },
  unknown: {
    label: 'Not disclosed',
    short: 'N/D',
    glyph: '—',
    rank: 0,
    countsAsVerified: false,
    definition:
      'The company has not published this figure. It is shown as not disclosed and is never ' +
      'treated as zero.'
  }
};

/** Business models differ enough that per-MW economics are not comparable across them. */
export const MODELS = {
  fullStack: {
    id: 'fullStack',
    label: 'Full stack',
    definition:
      'Owns the accelerators and sells finished compute by the hour. Captures far more revenue ' +
      'per megawatt, and carries the chip capex and obsolescence risk to match.'
  },
  poweredShell: {
    id: 'poweredShell',
    label: 'Powered shell',
    definition:
      'Leases powered, cooled space; the tenant brings their own accelerators. Earns a few ' +
      'million per megawatt per year rather than tens, with correspondingly lower capex.'
  }
};

export const EVENT_TYPES = {
  powerSecured: { label: 'Power secured', stage: 'secured' },
  permitAchieved: { label: 'Permit achieved', stage: 'permitted' },
  constructionStarted: { label: 'Construction started', stage: 'construction' },
  constructionProgress: { label: 'Construction progress', stage: 'construction' },
  energised: { label: 'Energised', stage: 'energised' },
  gpuInstallation: { label: 'GPU installation', stage: 'gpuReady' },
  customerContractSigned: { label: 'Customer contract signed', stage: null },
  customerAcceptance: { label: 'Customer acceptance', stage: 'accepted' },
  revenueLive: { label: 'Revenue live', stage: 'revenueLive' },
  targetDelayed: { label: 'Target delayed', stage: null, negative: true },
  targetAchieved: { label: 'Target achieved', stage: null },
  guidanceChanged: { label: 'Guidance changed', stage: null }
};

/**
 * Build a measure. Passing `value: null` yields an explicitly unknown record —
 * this is the only supported way to express "not disclosed", so that a missing
 * figure can never be coerced to 0 by a caller.
 */
export function measure({
  metric,
  value = null,
  effectiveDate = null,
  verifiedAt = null,
  confidence = 'unknown',
  source = null,
  note = null
}) {
  if (!METRICS[metric]) throw new Error(`Unknown metric: ${metric}`);
  const known = value !== null && value !== undefined;
  return {
    metric,
    value: known ? value : null,
    unit: METRICS[metric].unit,
    definition: METRICS[metric].definition,
    family: METRICS[metric].family,
    effectiveDate,
    verifiedAt,
    confidence: known ? confidence : 'unknown',
    source,
    note,
    /** true when the figure exists but nobody has linked the document it came from */
    sourceRequired: known && !source
  };
}

export const source = (title, url, publishedDate) => ({ title, url, publishedDate });
