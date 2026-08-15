/**
 * Site-level projects, each with independently evidenced gates.
 *
 * A project is not at "a stage" — it holds a set of gates that advance at different
 * rates. Panther Creek has contracted firm power and zoning while environmental
 * permits remain outstanding; a single stage label would have hidden exactly that.
 *
 * capacityMw is always paired with a basis and a status, because "110 MW" means
 * three different things depending on whether it is gross site capacity, energised
 * utility capacity, or critical IT under construction.
 */
import { gate } from './schema.js';

const V = '2026-08-15';

export const PROJECTS = [
  /* ---------------- IREN ---------------- */
  {
    id: 'iren-childress', companyId: 'iren', name: 'Childress, Texas', country: 'US', flag: '🇺🇸',
    capacityMw: null, powerBasis: 'gross-utility', valueStatus: 'actual', confidence: 'reported',
    sourceIds: ['iren-q3-fy26-results'],
    note:
      'Hosts the Microsoft Horizon tranches and the NVIDIA deployment. The 480 MW previously shown ' +
      'here is IREN\'s wider 2026 gross AI Cloud target across multiple sites, not this site\'s capacity.',
    gates: [
      gate({ id: 'siteControl', status: 'complete', confidence: 'confirmed', sourceIds: ['iren-q3-fy26-results'], verifiedAt: V }),
      gate({ id: 'constructionStarted', status: 'complete', confidence: 'confirmed', sourceIds: ['iren-q3-fy26-results'], verifiedAt: V }),
      gate({ id: 'criticalItEnergised', status: 'complete', effectiveAt: '2026-08-13', confidence: 'confirmed', sourceIds: ['iren-horizon1-delivery'], verifiedAt: V, notes: 'Horizon 1, 50 MW.' }),
      gate({ id: 'customerContracted', status: 'complete', confidence: 'confirmed', sourceIds: ['iren-8k-microsoft'], verifiedAt: V }),
      gate({ id: 'customerAccepted', status: 'complete', effectiveAt: '2026-08-13', confidence: 'confirmed', sourceIds: ['iren-horizon1-delivery'], verifiedAt: V, notes: 'Horizon 1 accepted by Microsoft.' }),
      gate({ id: 'revenueCommenced', status: 'notDisclosed', notes: 'Acceptance confirmed; billing commencement not separately disclosed.' })
    ]
  },
  {
    id: 'iren-horizon-1', companyId: 'iren', name: 'Horizon 1 (Childress)', country: 'US', flag: '🇺🇸',
    capacityMw: 50, powerBasis: 'critical-it', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['iren-horizon1-delivery'], asOf: '2026-08-13',
    note: 'Delivered to and accepted by Microsoft on 13 August 2026.',
    gates: [
      gate({ id: 'constructionStarted', status: 'complete', confidence: 'confirmed', sourceIds: ['iren-8k-microsoft'], verifiedAt: V }),
      gate({ id: 'criticalItEnergised', status: 'complete', effectiveAt: '2026-08-13', confidence: 'confirmed', sourceIds: ['iren-horizon1-delivery'], verifiedAt: V }),
      gate({ id: 'customerContracted', status: 'complete', confidence: 'confirmed', sourceIds: ['iren-8k-microsoft'], verifiedAt: V }),
      gate({ id: 'customerAccepted', status: 'complete', effectiveAt: '2026-08-13', confidence: 'confirmed', sourceIds: ['iren-horizon1-delivery'], verifiedAt: V }),
      gate({ id: 'revenueCommenced', status: 'notDisclosed' })
    ]
  },
  {
    id: 'iren-horizons-2-4', companyId: 'iren', name: 'Horizons 2–4 (Childress)', country: 'US', flag: '🇺🇸',
    capacityMw: 150, powerBasis: 'critical-it', valueStatus: 'target', confidence: 'confirmed',
    sourceIds: ['iren-8k-microsoft'],
    note:
      'Remaining Microsoft tranches — the balance of the 200 MW contract after Horizon 1\'s 50 MW. ' +
      'Planned, not delivered, and held separately from accepted capacity.',
    gates: [
      gate({ id: 'customerContracted', status: 'complete', confidence: 'confirmed', sourceIds: ['iren-8k-microsoft'], verifiedAt: V }),
      gate({ id: 'constructionStarted', status: 'inProgress', confidence: 'reported', sourceIds: ['iren-q3-fy26-results'], verifiedAt: V }),
      gate({ id: 'customerAccepted', status: 'notStarted' })
    ]
  },
  { id: 'iren-bc', companyId: 'iren', name: 'British Columbia sites', country: 'CA', flag: '🇨🇦',
    capacityMw: null, powerBasis: 'gross-utility', valueStatus: 'actual', confidence: 'reported',
    sourceIds: ['iren-10q-20260331'], note: 'Legacy capacity converting to GPU use.',
    gates: [gate({ id: 'siteControl', status: 'complete', confidence: 'reported', sourceIds: ['iren-10q-20260331'], verifiedAt: V })] },
  { id: 'iren-spain', companyId: 'iren', name: 'Spain', country: 'ES', flag: '🇪🇸',
    capacityMw: null, powerBasis: 'gross-utility', valueStatus: 'pipeline', confidence: 'reported',
    sourceIds: ['iren-10q-20260331'], note: 'Part of the 5 GW secured portfolio.',
    gates: [gate({ id: 'siteControl', status: 'complete', confidence: 'reported', sourceIds: ['iren-10q-20260331'], verifiedAt: V })] },
  { id: 'iren-bundey', companyId: 'iren', name: 'Bundey, South Australia', country: 'AU', flag: '🇦🇺',
    capacityMw: null, powerBasis: 'gross-utility', valueStatus: 'pipeline', confidence: 'reported',
    sourceIds: ['iren-10q-20260331'], note: 'Part of the 5 GW secured portfolio.',
    gates: [gate({ id: 'siteControl', status: 'complete', confidence: 'reported', sourceIds: ['iren-10q-20260331'], verifiedAt: V })] },

  /* ---------------- CoreWeave ---------------- */
  {
    id: 'crwv-fleet', companyId: 'coreweave', name: 'US data centre estate', country: 'US', flag: '🇺🇸',
    capacityMw: 1500, powerBasis: 'critical-it', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['crwv-q2-2026-release'], asOf: '2026-06-30',
    note: 'CoreWeave reports fleet-wide rather than per site; the site-level split is not disclosed.',
    gates: [
      gate({ id: 'utilityEnergised', status: 'complete', effectiveAt: '2026-06-30', confidence: 'confirmed', sourceIds: ['crwv-q2-2026-release'], verifiedAt: V }),
      gate({ id: 'criticalItEnergised', status: 'complete', effectiveAt: '2026-06-30', confidence: 'confirmed', sourceIds: ['crwv-q2-2026-release'], verifiedAt: V, notes: '1.5 GW active power.' }),
      gate({ id: 'customerContracted', status: 'complete', confidence: 'confirmed', sourceIds: ['crwv-q2-2026-release'], verifiedAt: V, notes: 'Disclosed in dollars of backlog, not megawatts.' })
    ]
  },

  /* ---------------- Nebius ---------------- */
  {
    id: 'nbis-mantsala', companyId: 'nebius', name: 'Mäntsälä, Finland', country: 'FI', flag: '🇫🇮',
    capacityMw: 310, powerBasis: 'critical-it', valueStatus: 'target', confidence: 'confirmed',
    sourceIds: ['nbis-q2-2026-ex992'],
    note:
      'CORRECTION: 310 MW is the capacity this facility is expected to reach when fully deployed — ' +
      'planned project capacity, not capacity energised today. It was previously counted as current ' +
      'energised critical IT.',
    gates: [
      gate({ id: 'siteControl', status: 'complete', confidence: 'confirmed', sourceIds: ['nbis-q1-2026-ex991'], verifiedAt: V }),
      gate({ id: 'constructionStarted', status: 'complete', confidence: 'confirmed', sourceIds: ['nbis-q2-2026-ex992'], verifiedAt: V }),
      gate({ id: 'criticalItEnergised', status: 'inProgress', confidence: 'reported', sourceIds: ['nbis-q2-2026-ex992'], verifiedAt: V, notes: 'Partially energised; exact current MW not disclosed.' })
    ]
  },
  {
    id: 'nbis-kansas', companyId: 'nebius', name: 'Kansas City, Missouri', country: 'US', flag: '🇺🇸',
    capacityMw: null, powerBasis: 'gross-utility', valueStatus: 'pipeline', confidence: 'reported',
    sourceIds: ['nbis-q2-2026-ex992'], note: 'US campus build-out. Comparable MW basis not disclosed.',
    gates: [
      gate({ id: 'siteControl', status: 'complete', confidence: 'reported', sourceIds: ['nbis-q2-2026-ex992'], verifiedAt: V }),
      gate({ id: 'constructionStarted', status: 'inProgress', confidence: 'reported', sourceIds: ['nbis-q2-2026-ex992'], verifiedAt: V })
    ]
  },

  /* ---------------- TeraWulf ---------------- */
  {
    id: 'wulf-lake-mariner', companyId: 'terawulf', name: 'Lake Mariner, New York', country: 'US', flag: '🇺🇸',
    capacityMw: 438, powerBasis: 'critical-it', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['wulf-q2-2026-results'], asOf: '2026-06-30',
    note: '102 MW revenue-generating critical IT plus 336 MW additional critical IT under construction.',
    gates: [
      gate({ id: 'utilityEnergised', status: 'complete', confidence: 'confirmed', sourceIds: ['wulf-q2-2026-results'], verifiedAt: V }),
      gate({ id: 'criticalItEnergised', status: 'complete', effectiveAt: '2026-06-30', confidence: 'confirmed', sourceIds: ['wulf-q2-2026-results'], verifiedAt: V, notes: '102 MW.' }),
      gate({ id: 'constructionStarted', status: 'inProgress', confidence: 'confirmed', sourceIds: ['wulf-q2-2026-results'], verifiedAt: V, notes: '336 MW additional critical IT.' }),
      gate({ id: 'customerContracted', status: 'complete', confidence: 'confirmed', sourceIds: ['wulf-q2-2026-results'], verifiedAt: V }),
      gate({ id: 'revenueCommenced', status: 'complete', effectiveAt: '2026-06-30', confidence: 'confirmed', sourceIds: ['wulf-q2-2026-results'], verifiedAt: V, notes: 'Explicitly revenue-generating.' })
    ]
  },
  {
    id: 'wulf-justified', companyId: 'terawulf', name: 'Justified Data Campus (Anthropic)', country: 'US', flag: '🇺🇸',
    capacityMw: 401, powerBasis: 'critical-it', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['wulf-anthropic-lease'], asOf: '2026-08-04',
    note:
      'Approximately 401 MW critical IT on a 20-year initial lease, approximately $19bn contracted ' +
      'revenue over the initial term. Initial capacity expected H2 2027, full delivery early 2028.',
    gates: [
      gate({ id: 'customerContracted', status: 'complete', effectiveAt: '2026-08-04', confidence: 'confirmed', sourceIds: ['wulf-anthropic-lease'], verifiedAt: V }),
      gate({ id: 'constructionStarted', status: 'notDisclosed' }),
      gate({ id: 'criticalItEnergised', status: 'notStarted', notes: 'Initial capacity expected H2 2027.' }),
      gate({ id: 'customerAccepted', status: 'notStarted' }),
      gate({ id: 'revenueCommenced', status: 'notStarted', notes: 'Full delivery expected early 2028.' })
    ]
  },
  {
    id: 'wulf-muskie', companyId: 'terawulf', name: 'Muskie (Kentucky)', country: 'US', flag: '🇺🇸',
    capacityMw: 1000, powerBasis: 'gross-utility', valueStatus: 'potential', confidence: 'confirmed',
    sourceIds: ['wulf-kentucky-maryland'],
    note:
      'Up to 1 GW of contracted electric service. This is power availability at the utility, not ' +
      'customer-contracted critical IT, and is excluded from contracted-capacity totals.',
    gates: [
      gate({ id: 'siteControl', status: 'complete', confidence: 'confirmed', sourceIds: ['wulf-kentucky-maryland'], verifiedAt: V }),
      gate({ id: 'utilityAgreement', status: 'complete', confidence: 'confirmed', sourceIds: ['wulf-kentucky-maryland'], verifiedAt: V, notes: 'Up to 1 GW contracted electric service.' }),
      gate({ id: 'constructionStarted', status: 'notStarted' })
    ]
  },
  {
    id: 'wulf-chesapeake', companyId: 'terawulf', name: 'Chesapeake (Maryland)', country: 'US', flag: '🇺🇸',
    capacityMw: 210, powerBasis: 'gross-utility', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['wulf-kentucky-maryland'],
    note:
      'Approximately 210 MW operational generation. A further campus scale of up to 1 GW is potential ' +
      'only and is not current critical IT.',
    gates: [
      gate({ id: 'siteControl', status: 'complete', confidence: 'confirmed', sourceIds: ['wulf-kentucky-maryland'], verifiedAt: V }),
      gate({ id: 'utilityEnergised', status: 'complete', confidence: 'confirmed', sourceIds: ['wulf-kentucky-maryland'], verifiedAt: V, notes: '~210 MW operational generation.' }),
      gate({ id: 'criticalItEnergised', status: 'notStarted' })
    ]
  },

  /* ---------------- Keel ---------------- */
  {
    id: 'keel-sharon', companyId: 'keel', name: 'Sharon, Pennsylvania', country: 'US', flag: '🇺🇸',
    capacityMw: 110, powerBasis: 'gross-utility', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['keel-investor-deck'],
    note:
      '110 MW gross total site capacity: 30 MW existing energised utility capacity plus 80 MW under ' +
      'an energy-services agreement with associated substation work. Not 110 MW of critical IT under construction.',
    gates: [
      gate({ id: 'siteControl', status: 'complete', confidence: 'confirmed', sourceIds: ['keel-investor-deck'], verifiedAt: V }),
      gate({ id: 'utilityAgreement', status: 'complete', confidence: 'confirmed', sourceIds: ['keel-investor-deck'], verifiedAt: V, notes: '80 MW energy-services agreement.' }),
      gate({ id: 'utilityEnergised', status: 'inProgress', confidence: 'confirmed', sourceIds: ['keel-investor-deck'], verifiedAt: V, notes: '30 MW existing energised utility capacity.' }),
      gate({ id: 'zoning', status: 'complete', effectiveAt: '2026-05-01', confidence: 'reported', sourceIds: ['keel-10q'], verifiedAt: V }),
      gate({ id: 'environmental', status: 'notDisclosed' }),
      gate({ id: 'buildingPermits', status: 'inProgress', confidence: 'reported', sourceIds: ['keel-10q'], verifiedAt: V, notes: 'Full permitting outstanding.' }),
      gate({ id: 'criticalItEnergised', status: 'notStarted' }),
      gate({ id: 'customerContracted', status: 'notStarted', notes: 'No announced lease.' })
    ]
  },
  {
    id: 'keel-panther-creek', companyId: 'keel', name: 'Panther Creek, Pennsylvania', country: 'US', flag: '🇺🇸',
    capacityMw: 350, powerBasis: 'gross-utility', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['keel-investor-deck'],
    note:
      '350 MW contracted firm power. Zoning, conditional land development and environmental permits ' +
      'are tracked separately — the data centre itself is not evidenced as under construction.',
    gates: [
      gate({ id: 'siteControl', status: 'complete', confidence: 'confirmed', sourceIds: ['keel-investor-deck'], verifiedAt: V }),
      gate({ id: 'utilityAgreement', status: 'complete', confidence: 'confirmed', sourceIds: ['keel-investor-deck'], verifiedAt: V, notes: '350 MW contracted firm power.' }),
      gate({ id: 'zoning', status: 'conditional', confidence: 'reported', sourceIds: ['keel-10q'], verifiedAt: V, notes: 'Conditional land development approval.' }),
      gate({ id: 'environmental', status: 'inProgress', confidence: 'reported', sourceIds: ['keel-10q'], verifiedAt: V, notes: 'Environmental permits outstanding.' }),
      gate({ id: 'constructionStarted', status: 'notStarted', notes: 'No evidence the data centre itself is under construction.' })
    ]
  },
  {
    id: 'keel-scrubgrass', companyId: 'keel', name: 'Scrubgrass, Pennsylvania', country: 'US', flag: '🇺🇸',
    capacityMw: 1300, powerBasis: 'gross-utility', valueStatus: 'potential', confidence: 'reported',
    sourceIds: ['keel-10q'],
    note:
      'CORRECTION: previously shown as 1.3 GW of secured capacity. Load studies and behind-the-meter ' +
      'feasibility work are pipeline and potential, not secured power.',
    gates: [
      gate({ id: 'siteControl', status: 'complete', confidence: 'reported', sourceIds: ['keel-10q'], verifiedAt: V }),
      gate({ id: 'interconnection', status: 'inProgress', confidence: 'reported', sourceIds: ['keel-10q'], verifiedAt: V, notes: 'Load studies under way.' }),
      gate({ id: 'constructionStarted', status: 'notStarted' })
    ]
  },
  {
    id: 'keel-moses-lake', companyId: 'keel', name: 'Moses Lake, Washington', country: 'US', flag: '🇺🇸',
    capacityMw: 18, powerBasis: 'gross-utility', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['keel-investor-deck'], note: '18 MW gross project capacity.',
    gates: [
      gate({ id: 'siteControl', status: 'complete', confidence: 'confirmed', sourceIds: ['keel-investor-deck'], verifiedAt: V }),
      gate({ id: 'utilityEnergised', status: 'complete', confidence: 'reported', sourceIds: ['keel-investor-deck'], verifiedAt: V }),
      gate({ id: 'customerContracted', status: 'notStarted', notes: 'No announced lease.' })
    ]
  },
  {
    id: 'keel-sherbrooke', companyId: 'keel', name: 'Sherbrooke, Québec', country: 'CA', flag: '🇨🇦',
    capacityMw: 96, powerBasis: 'gross-utility', valueStatus: 'potential', confidence: 'confirmed',
    sourceIds: ['keel-investor-deck'],
    note: '96 MW under a conditional transfer and operation agreement. The conditions are not yet satisfied.',
    gates: [
      gate({ id: 'siteControl', status: 'conditional', confidence: 'confirmed', sourceIds: ['keel-investor-deck'], verifiedAt: V, notes: 'Conditional transfer/operation agreement.' }),
      gate({ id: 'utilityAgreement', status: 'conditional', confidence: 'confirmed', sourceIds: ['keel-investor-deck'], verifiedAt: V })
    ]
  },

  /* ---------------- Applied Digital: five campuses ---------------- */
  {
    id: 'apld-polaris-1', companyId: 'applied-digital', name: 'Polaris Forge 1', country: 'US', flag: '🇺🇸',
    capacityMw: 400, powerBasis: 'critical-it', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['apld-10k-20260531'], asOf: '2026-05-31',
    note: '400 MW leased to CoreWeave, approximately $11bn over a 15-year initial term.',
    gates: [
      gate({ id: 'customerContracted', status: 'complete', confidence: 'confirmed', sourceIds: ['apld-10k-20260531'], verifiedAt: V }),
      gate({ id: 'constructionStarted', status: 'complete', confidence: 'confirmed', sourceIds: ['apld-10k-20260531'], verifiedAt: V }),
      gate({ id: 'criticalItEnergised', status: 'inProgress', confidence: 'confirmed', sourceIds: ['apld-10k-20260531'], verifiedAt: V, notes: 'Approximately 100 MW operational across the portfolio.' }),
      gate({ id: 'revenueCommenced', status: 'complete', confidence: 'confirmed', sourceIds: ['apld-10k-20260531'], verifiedAt: V })
    ]
  },
  {
    id: 'apld-polaris-2', companyId: 'applied-digital', name: 'Polaris Forge 2', country: 'US', flag: '🇺🇸',
    capacityMw: 200, powerBasis: 'critical-it', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['apld-10k-20260531'], asOf: '2026-05-31',
    note: '200 MW leased to an investment-grade hyperscaler, approximately $5bn over a 15-year initial term.',
    gates: [
      gate({ id: 'customerContracted', status: 'complete', confidence: 'confirmed', sourceIds: ['apld-10k-20260531'], verifiedAt: V }),
      gate({ id: 'constructionStarted', status: 'inProgress', confidence: 'confirmed', sourceIds: ['apld-10k-20260531'], verifiedAt: V })
    ]
  },
  {
    id: 'apld-polaris-3', companyId: 'applied-digital', name: 'Polaris Forge 3', country: 'US', flag: '🇺🇸',
    capacityMw: 300, powerBasis: 'critical-it', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['apld-10k-20260531'], asOf: '2026-05-31',
    note: '300 MW leased to a high investment-grade hyperscaler, approximately $7.5bn over a 15-year initial term.',
    gates: [
      gate({ id: 'customerContracted', status: 'complete', confidence: 'confirmed', sourceIds: ['apld-10k-20260531'], verifiedAt: V }),
      gate({ id: 'constructionStarted', status: 'inProgress', confidence: 'confirmed', sourceIds: ['apld-10k-20260531'], verifiedAt: V })
    ]
  },
  {
    id: 'apld-delta-1', companyId: 'applied-digital', name: 'Delta Forge 1', country: 'US', flag: '🇺🇸',
    capacityMw: 300, powerBasis: 'critical-it', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['apld-10k-20260531'], asOf: '2026-05-31',
    note: '300 MW leased to a high investment-grade hyperscaler, approximately $7.5bn over a 15-year initial term.',
    gates: [
      gate({ id: 'customerContracted', status: 'complete', confidence: 'confirmed', sourceIds: ['apld-10k-20260531'], verifiedAt: V }),
      gate({ id: 'constructionStarted', status: 'inProgress', confidence: 'confirmed', sourceIds: ['apld-10k-20260531'], verifiedAt: V })
    ]
  },
  {
    id: 'apld-delta-2', companyId: 'applied-digital', name: 'Delta Forge 2', country: 'US', flag: '🇺🇸',
    capacityMw: 210, powerBasis: 'critical-it', valueStatus: 'actual', confidence: 'confirmed',
    sourceIds: ['apld-delta-forge-2'], asOf: '2026-08-05',
    note:
      '210 MW leased to a high investment-grade hyperscaler, approximately $5.2bn over a 15-year ' +
      'initial term. Under construction with expected delivery in H1 2028.',
    gates: [
      gate({ id: 'customerContracted', status: 'complete', effectiveAt: '2026-08-05', confidence: 'confirmed', sourceIds: ['apld-delta-forge-2'], verifiedAt: V }),
      gate({ id: 'constructionStarted', status: 'complete', confidence: 'confirmed', sourceIds: ['apld-delta-forge-2'], verifiedAt: V }),
      gate({ id: 'criticalItEnergised', status: 'notStarted', notes: 'Expected delivery H1 2028.' }),
      gate({ id: 'customerAccepted', status: 'notStarted' })
    ]
  }
];

export const COUNTRY_NAMES = { US: 'United States', CA: 'Canada', ES: 'Spain', AU: 'Australia', FI: 'Finland' };

/**
 * Customer contracts. Dollar values are commitments, never converted to megawatts.
 * `conditional` marks a maximum that depends on events that have not occurred.
 */
export const CONTRACTS = [
  { id: 'iren-msft', companyId: 'iren', customer: 'Microsoft', mw: 200, basis: 'critical-it', years: 5,
    valueBn: 9.7, deliveredMw: 50, confidence: 'confirmed', sourceIds: ['iren-8k-microsoft', 'iren-horizon1-delivery'],
    terms: 'Five-year average term. Horizon 1 (50 MW) delivered and accepted 13 Aug 2026.' },
  { id: 'iren-nvda', companyId: 'iren', customer: 'NVIDIA', mw: 60, basis: 'critical-it', years: 5,
    valueBn: 3.4, deliveredMw: null, confidence: 'confirmed', sourceIds: ['iren-ex991-nvidia'],
    terms: 'Five-year term.' },
  { id: 'iren-developers', companyId: 'iren', customer: 'Other AI developer contracts', mw: null, basis: 'not-applicable',
    years: null, valueBn: 2.8, deliveredMw: null, confidence: 'confirmed', sourceIds: ['iren-ex991-nvidia'],
    terms: 'Approximately $2.8bn total contract value. Megawatts not disclosed.' },

  { id: 'crwv-backlog', companyId: 'coreweave', customer: 'Aggregate revenue backlog', mw: null, basis: 'not-applicable',
    years: null, valueBn: 104.2, deliveredMw: null, confidence: 'confirmed', sourceIds: ['crwv-q2-2026-release'],
    terms:
      'Approximately $104.2bn as at 30 Jun 2026. A further $25bn+ of net new customer commitments was ' +
      'added in early Q3 and sits outside this quarter-end figure.' },

  { id: 'nbis-meta', companyId: 'nebius', customer: 'Meta Platforms', mw: null, basis: 'not-applicable',
    years: 5, valueBn: 12, valueMaxBn: 27, conditional: true, deliveredMw: null, confidence: 'confirmed',
    sourceIds: ['nbis-meta-agreement'],
    terms:
      '$12bn dedicated-capacity commitment over five years, plus up to a further $15bn relating to ' +
      'additional or otherwise unsold capacity. The $27bn maximum is conditional and is not committed revenue.' },

  { id: 'wulf-anthropic', companyId: 'terawulf', customer: 'Anthropic (Justified Data Campus)', mw: 401,
    basis: 'critical-it', years: 20, valueBn: 19, deliveredMw: null, confidence: 'confirmed',
    sourceIds: ['wulf-anthropic-lease'],
    terms:
      '20-year initial lease term. Initial capacity expected H2 2027, full delivery expected early 2028.' },

  { id: 'apld-polaris-1', companyId: 'applied-digital', customer: 'CoreWeave (Polaris Forge 1)', mw: 400,
    basis: 'critical-it', years: 15, valueBn: 11, deliveredMw: null, confidence: 'confirmed',
    sourceIds: ['apld-10k-20260531'], terms: '15-year initial term.' },
  { id: 'apld-polaris-2', companyId: 'applied-digital', customer: 'Investment-grade hyperscaler (Polaris Forge 2)',
    mw: 200, basis: 'critical-it', years: 15, valueBn: 5, deliveredMw: null, confidence: 'confirmed',
    sourceIds: ['apld-10k-20260531'], terms: '15-year initial term. Customer not named by the company.' },
  { id: 'apld-polaris-3', companyId: 'applied-digital', customer: 'High investment-grade hyperscaler (Polaris Forge 3)',
    mw: 300, basis: 'critical-it', years: 15, valueBn: 7.5, deliveredMw: null, confidence: 'confirmed',
    sourceIds: ['apld-10k-20260531'], terms: '15-year initial term. Customer not named by the company.' },
  { id: 'apld-delta-1', companyId: 'applied-digital', customer: 'High investment-grade hyperscaler (Delta Forge 1)',
    mw: 300, basis: 'critical-it', years: 15, valueBn: 7.5, deliveredMw: null, confidence: 'confirmed',
    sourceIds: ['apld-10k-20260531'], terms: '15-year initial term. Customer not named by the company.' },
  { id: 'apld-delta-2', companyId: 'applied-digital', customer: 'High investment-grade hyperscaler (Delta Forge 2)',
    mw: 210, basis: 'critical-it', years: 15, valueBn: 5.2, deliveredMw: null, confidence: 'confirmed',
    sourceIds: ['apld-delta-forge-2'], terms: '15-year initial term. Under construction, expected delivery H1 2028.' }
];

export const PROJECTS_BY_COMPANY = PROJECTS.reduce((a, p) => { (a[p.companyId] ||= []).push(p); return a; }, {});
export const CONTRACTS_BY_COMPANY = CONTRACTS.reduce((a, c) => { (a[c.companyId] ||= []).push(c); return a; }, {});
