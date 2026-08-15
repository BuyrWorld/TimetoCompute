/**
 * Company records, audited against primary sources on 2026-08-15.
 *
 * Every figure states what it measures (powerBasis), what kind of number it is
 * (valueStatus), how well evidenced it is (confidence) and which document says so.
 *
 * Do not edit a value in place — change it here AND append an event to
 * data/events.js so the change stays auditable.
 */
import { metric } from './schema.js';

const V = '2026-08-15'; // date a human read the underlying documents

export const COMPANIES = [
  /* ==================== IREN ==================== */
  {
    id: 'iren', ticker: 'IREN', name: 'IREN Limited', slug: 'iren', model: 'fullStack',
    summary:
      'Holds a large secured power portfolio and is the only tracked company with a hyperscaler ' +
      'tranche formally delivered and accepted.',
    measures: [
      metric({
        metric: 'securedPowerMw', valueMw: 5000, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'gross-utility', asOf: '2026-03-31', verifiedAt: V,
        sourceIds: ['iren-q3-fy26-results', 'iren-10q-20260331'], isExhaustive: true,
        notes: 'Secured global power portfolio, quoted at the utility connection. Not critical IT and not comparable with a critical-IT figure.'
      }),
      metric({
        metric: 'customerContractedMw', valueMw: 260, confidence: 'confirmed', valueStatus: 'minimum',
        powerBasis: 'critical-it', asOf: '2026-06-01', verifiedAt: V,
        sourceIds: ['iren-8k-microsoft', 'iren-ex991-nvidia'], isExhaustive: false,
        notes:
          'Microsoft 200 MW plus NVIDIA 60 MW. A disclosed minimum: the further AI developer contracts ' +
          'worth approximately $2.8bn do not disclose megawatts, so the true total is higher.'
      }),
      metric({
        metric: 'customerAcceptedMw', valueMw: 50, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'critical-it', asOf: '2026-08-13', verifiedAt: V,
        sourceIds: ['iren-horizon1-delivery'], isExhaustive: true,
        notes: 'Horizon 1 delivered to and accepted by Microsoft on 13 August 2026.'
      }),
      metric({
        metric: 'revenueLiveMw', valueMw: null,
        notes:
          'Acceptance of Horizon 1 is confirmed, but the company has not separately disclosed that ' +
          'billing or revenue has commenced. Acceptance is not assumed to mean revenue-live.'
      }),
      metric({
        metric: 'energisedCriticalItMw', valueMw: 50, confidence: 'confirmed', valueStatus: 'minimum',
        powerBasis: 'critical-it', asOf: '2026-08-13', verifiedAt: V,
        sourceIds: ['iren-horizon1-delivery'], isExhaustive: false,
        notes:
          'Horizon 1 — 50 MW of critical IT delivered and accepted. A disclosed minimum: this is the ' +
          'only tranche with an explicit critical-IT figure, and no company-wide energised total has ' +
          'been published on a comparable basis.'
      }),
      metric({
        metric: 'constructionMw', valueMw: null,
        notes:
          'The 480 MW previously carried here is IREN\'s wider 2026 gross AI Cloud capacity target ' +
          'across multiple sites — a target, not construction, and not attributable to one site. ' +
          'Held as a target below; no comparable company construction total has been located.'
      }),
      metric({
        metric: 'gpuReadyMw', valueMw: null,
        notes:
          'Previously shown as "76,000+ GPUs". Removed: no primary source in the audit set states an ' +
          'exact fleet count, and a GPU count is not a megawatt figure in any case.'
      })
    ],
    targets: [
      metric({
        metric: 'constructionMw', valueMw: 480, confidence: 'confirmed', valueStatus: 'target',
        powerBasis: 'gross-utility', asOf: '2026-12-31', verifiedAt: V,
        sourceIds: ['iren-q3-fy26-results'],
        notes: '2026 gross AI Cloud capacity target across multiple sites. Excluded from every current-capacity total.'
      })
    ]
  },

  /* ==================== CoreWeave ==================== */
  {
    id: 'coreweave', ticker: 'CRWV', name: 'CoreWeave', slug: 'coreweave', model: 'fullStack',
    summary:
      'The largest tracked operator by contracted power, and the only one publishing both an ' +
      'active-power and a contracted-power figure in the same disclosure.',
    measures: [
      metric({
        metric: 'securedPowerMw', valueMw: 4200, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'gross-utility', asOf: '2026-08-11', verifiedAt: V,
        sourceIds: ['crwv-q2-2026-call'], isExhaustive: true,
        notes:
          'Approximately 4.2 GW stated on the 11 August 2026 earnings call, up from the 3.7 GW ' +
          'reported as at the 30 June quarter end. Contracted power is a total that already ' +
          'includes the active figure — the two are not additive.'
      }),
      metric({
        metric: 'energisedCriticalItMw', valueMw: 1500, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'critical-it', asOf: '2026-06-30', verifiedAt: V,
        sourceIds: ['crwv-q2-2026-release'], isExhaustive: true,
        notes:
          'CoreWeave\'s wording is "expanded active power by nearly 500 MWs to reach 1.5 GW". ' +
          '"Active power" is their term for energised capacity; it does not establish how much is ' +
          'customer-accepted.'
      }),
      metric({
        metric: 'customerContractedMw', valueMw: null,
        notes:
          'Not disclosed in megawatts. CoreWeave reports customer commitments in dollars of revenue ' +
          'backlog — approximately $104.2bn as at 30 June 2026 — which cannot be converted to MW.'
      }),
      metric({ metric: 'customerAcceptedMw', valueMw: null }),
      metric({ metric: 'revenueLiveMw', valueMw: null,
        notes: 'Not disclosed in megawatts. Q2 2026 revenue was reported in dollars across the whole fleet.' })
    ]
  },

  /* ==================== Nebius ==================== */
  {
    id: 'nebius', ticker: 'NBIS', name: 'Nebius Group', slug: 'nebius', model: 'fullStack',
    summary:
      'European full-stack operator scaling a US campus alongside its original Finnish site, with a ' +
      'materially raised year-end power target.',
    measures: [
      metric({
        metric: 'securedPowerMw', valueMw: 3500, confidence: 'confirmed', valueStatus: 'minimum',
        powerBasis: 'gross-utility', asOf: '2026-03-31', verifiedAt: V,
        sourceIds: ['nbis-q1-2026-ex991'], isExhaustive: false,
        notes:
          'Stated as "more than 3.5 GW" — the latest explicitly measured contracted-power figure ' +
          'before Q2. Recorded as a minimum because the disclosure is a floor, not a total.'
      }),
      metric({
        metric: 'energisedCriticalItMw', valueMw: null,
        notes:
          'CORRECTION: 310 MW was previously shown here as energised critical IT. That figure is the ' +
          'capacity the Finland facility is expected to reach when fully deployed, not capacity ' +
          'energised today. It is now held as planned project capacity. No comparable current ' +
          'energised figure has been disclosed.'
      }),
      metric({ metric: 'customerContractedMw', valueMw: null,
        notes: 'Not disclosed in megawatts. The Meta agreement is disclosed in dollars.' }),
      metric({ metric: 'customerAcceptedMw', valueMw: null }),
      metric({ metric: 'revenueLiveMw', valueMw: null })
    ],
    targets: [
      metric({
        metric: 'securedPowerMw', valueMw: 5000, confidence: 'confirmed', valueStatus: 'target',
        powerBasis: 'gross-utility', asOf: '2026-12-31', verifiedAt: V,
        sourceIds: ['nbis-q2-2026-shareholder-letter'],
        notes: 'Year-end contracted-power target raised to 5 GW in the Q2 2026 shareholder letter. A goal, not current capacity.'
      })
    ]
  },

  /* ==================== TeraWulf ==================== */
  {
    id: 'terawulf', ticker: 'WULF', name: 'TeraWulf', slug: 'terawulf', model: 'poweredShell',
    summary:
      'Powered-shell landlord converting legacy sites to HPC leasing, with a very large Anthropic ' +
      'lease that does not begin delivering until H2 2027.',
    measures: [
      metric({
        metric: 'customerContractedMw', valueMw: 839, confidence: 'confirmed', valueStatus: 'minimum',
        powerBasis: 'critical-it', asOf: '2026-08-04', verifiedAt: V,
        sourceIds: ['wulf-q2-2026-results', 'wulf-anthropic-lease'], isExhaustive: false,
        notes:
          'Lake Mariner 438 MW (102 MW revenue-generating plus 336 MW under construction) and ' +
          'Anthropic/Justified approximately 401 MW. A disclosed minimum — the company has not ' +
          'published an updated exhaustive contracted total.'
      }),
      metric({
        metric: 'energisedCriticalItMw', valueMw: 102, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'critical-it', asOf: '2026-06-30', verifiedAt: V,
        sourceIds: ['wulf-q2-2026-results'], isExhaustive: true,
        notes: 'Lake Mariner revenue-generating critical IT capacity.'
      }),
      metric({
        metric: 'revenueLiveMw', valueMw: 102, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'critical-it', asOf: '2026-06-30', verifiedAt: V,
        sourceIds: ['wulf-q2-2026-results'], isExhaustive: true,
        notes: 'Explicitly described as revenue-generating, which is the disclosure needed to record revenue-live.'
      }),
      metric({
        metric: 'constructionMw', valueMw: 336, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'critical-it', asOf: '2026-06-30', verifiedAt: V,
        sourceIds: ['wulf-q2-2026-results'], isExhaustive: false,
        notes: 'Additional Lake Mariner critical IT under construction.'
      }),
      metric({
        metric: 'securedPowerMw', valueMw: null,
        notes:
          'The 2.2 GW owned pipeline and 642.5 MW contracted figures were February 2026 disclosures ' +
          'and are retained as historical events rather than current values. No comparable current ' +
          'secured-power total on a single basis has been located.'
      }),
      metric({ metric: 'customerAcceptedMw', valueMw: null })
    ],
    historical: [
      metric({
        metric: 'pipelinePowerMw', valueMw: 2200, confidence: 'reported', valueStatus: 'pipeline',
        powerBasis: 'gross-utility', asOf: '2026-02-01', verifiedAt: V,
        sourceIds: ['wulf-kentucky-maryland'],
        notes: 'February 2026 owned-pipeline disclosure. Retained as historical; superseded by later portfolio changes including the Abernathy disposal.'
      }),
      metric({
        metric: 'customerContractedMw', valueMw: 642.5, confidence: 'reported', valueStatus: 'actual',
        powerBasis: 'critical-it', asOf: '2026-02-01', verifiedAt: V,
        sourceIds: ['wulf-kentucky-maryland'],
        notes: 'February 2026 contracted-capacity disclosure, superseded by the August 2026 figures above.'
      })
    ]
  },

  /* ==================== Keel Infrastructure ==================== */
  {
    id: 'keel', ticker: 'KEEL', name: 'Keel Infrastructure', slug: 'keel', model: 'poweredShell',
    summary:
      'Ex-Bitfarms portfolio with a large development pipeline, a much smaller secured base, and no ' +
      'announced customer lease.',
    measures: [
      metric({
        metric: 'securedPowerMw', valueMw: 648, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'gross-utility', asOf: '2026-03-31', verifiedAt: V,
        sourceIds: ['keel-10q'], isExhaustive: true,
        notes:
          'Keel\'s "Secured Gross Data Center Capacity" — gross power subject to executed electric ' +
          'supply agreements with utilities, covering both capacity available on site today and ' +
          'capacity utilities have agreed to deliver at a future date. It is therefore not all ' +
          'available now. Replaces the 2.2 GW previously recorded as secured, which is the whole pipeline.'
      }),
      metric({
        metric: 'energisedGrossMw', valueMw: 341, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'gross-utility', asOf: '2026-03-31', verifiedAt: V,
        sourceIds: ['keel-10q'], isExhaustive: true,
        notes:
          'Keel\'s "Current Energized Capacity" — gross utility power in use across the US and Québec ' +
          'sites. This is not critical IT: Keel does not publish a critical-IT figure, so the two are ' +
          'held separately and never compared.'
      }),
      metric({
        metric: 'pipelinePowerMw', valueMw: 1513, confidence: 'confirmed', valueStatus: 'pipeline',
        powerBasis: 'gross-utility', asOf: '2026-03-31', verifiedAt: V,
        sourceIds: ['keel-10q', 'keel-10k-bitfarms'], isExhaustive: true,
        notes:
          '"Identified Additional Gross Data Center Capacity" — not yet under an electric supply ' +
          'agreement. Secured 648 plus identified 1,513 gives the 2,161 MW total pipeline the company ' +
          'rounds to 2.2 GW.'
      }),
      metric({
        metric: 'customerContractedMw', valueMw: null,
        notes:
          'CORRECTION: previously stored as numeric 0. No filing reports zero megawatts — the company ' +
          'simply has no announced lease. Stored as not disclosed with the label "No announced lease", ' +
          'because a zero would wrongly imply a measured figure.'
      }),
      metric({ metric: 'energisedCriticalItMw', valueMw: null }),
      metric({ metric: 'customerAcceptedMw', valueMw: null }),
      metric({ metric: 'revenueLiveMw', valueMw: null })
    ],
    contractedLabel: 'No announced lease'
  },

  /* ==================== Applied Digital ==================== */
  {
    id: 'applied-digital', ticker: 'APLD', name: 'Applied Digital', slug: 'applied-digital', model: 'poweredShell',
    summary:
      'Powered-shell developer with the largest disclosed customer-contracted critical IT figure of ' +
      'any tracked company, across five named campuses.',
    measures: [
      metric({
        metric: 'customerContractedMw', valueMw: 1410, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'critical-it', asOf: '2026-05-31', verifiedAt: V,
        sourceIds: ['apld-10k-20260531'], isExhaustive: true,
        notes:
          'Contracted critical IT across five campuses, with approximately $36.2bn of contracted ' +
          'revenue over the initial base terms. Replaces the stale 600 MW record.'
      }),
      metric({
        metric: 'securedPowerMw', valueMw: 2150, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'gross-utility', asOf: '2026-05-31', verifiedAt: V,
        sourceIds: ['apld-10k-20260531'], isExhaustive: true,
        notes: 'Approximately 2.15 GW of gross grid-connected utility power. Gross basis — not comparable with the 1,410 MW critical IT figure.'
      }),
      metric({
        metric: 'energisedCriticalItMw', valueMw: 100, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'critical-it', asOf: '2026-05-31', verifiedAt: V,
        sourceIds: ['apld-10k-20260531'], isExhaustive: true,
        notes: 'Approximately 100 MW operational and revenue-generating.'
      }),
      metric({
        metric: 'revenueLiveMw', valueMw: 100, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'critical-it', asOf: '2026-05-31', verifiedAt: V,
        sourceIds: ['apld-10k-20260531'], isExhaustive: true,
        notes: 'Explicitly described as operational and revenue-generating.'
      }),
      metric({
        metric: 'constructionMw', valueMw: 1500, confidence: 'confirmed', valueStatus: 'actual',
        powerBasis: 'critical-it', asOf: '2026-05-31', verifiedAt: V,
        sourceIds: ['apld-10k-20260531'], isExhaustive: false,
        notes:
          'Approximately 1.5 GW operating OR under construction across the five campuses — the ' +
          'company reports the two together, so this is not a pure construction figure and includes ' +
          'the 100 MW already operational.'
      }),
      metric({ metric: 'customerAcceptedMw', valueMw: null })
    ]
  }
];

/** Quoted on the watchlist but not tracked as capacity operators. */
export const WATCH_ONLY = [
  { ticker: 'CIFR', name: 'Cipher Mining' },
  { ticker: 'NVDA', name: 'NVIDIA' }
];

export const COMPANY_BY_ID = Object.fromEntries(COMPANIES.map(c => [c.id, c]));
export const COMPANY_BY_TICKER = Object.fromEntries(COMPANIES.map(c => [c.ticker, c]));

export const WATCH_TICKERS = [...COMPANIES.map(c => c.ticker), ...WATCH_ONLY.map(w => w.ticker)];

export const TICKER_NAMES = Object.fromEntries([
  ...COMPANIES.map(c => [c.ticker, c.name]),
  ...WATCH_ONLY.map(w => [w.ticker, w.name])
]);
