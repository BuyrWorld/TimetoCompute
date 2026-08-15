/**
 * Company records.
 *
 * Provenance rule: a figure is only `confirmed` when a primary document is linked.
 * The capacity numbers inherited from the previous hard-coded table were compiled
 * from filings, but the compile did not record which filing — so they are carried
 * forward as `reported` with sourceRequired, not promoted to confirmed. They are
 * visibly flagged in the UI and excluded from confirmed totals.
 *
 * Do not edit a value in place. Change it here AND append an event to
 * data/events.js so the change is auditable.
 */
import { measure, source } from './schema.js';

const CW_Q2 = source(
  'CoreWeave Reports Strong Second Quarter 2026 Results',
  'https://investors.coreweave.com/news/news-details/2026/CoreWeave-Reports-Strong-Second-Quarter-2026-Results/default.aspx',
  '2026-08-11'
);

/** Date on which a human actually read the underlying document. Not "today". */
const VERIFIED_CW = '2026-08-15';

export const COMPANIES = [
  {
    id: 'iren',
    ticker: 'IREN',
    name: 'IREN Limited',
    slug: 'iren',
    model: 'fullStack',
    summary:
      'Australian-listed operator converting a large secured power bank into GPU capacity, and ' +
      'the only tracked company with a hyperscaler site formally accepted.',
    measures: [
      measure({
        metric: 'securedPowerMw', value: 5000, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null,
        note: 'Quoted as a 5GW secured pipeline. Carried over from the previous compile without a linked filing.'
      }),
      measure({
        metric: 'constructionMw', value: 430, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null
      }),
      measure({
        metric: 'customerContractedMw', value: 260, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null,
        note: 'Microsoft 200MW plus NVIDIA 60MW. Customer demand, not secured power.'
      }),
      measure({
        metric: 'customerAcceptedMw', value: 50, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null,
        note: 'First tranche of the Microsoft contract formally accepted.'
      }),
      measure({ metric: 'energisedCriticalItMw', value: null }),
      measure({ metric: 'revenueLiveMw', value: null })
    ]
  },

  {
    id: 'coreweave',
    ticker: 'CRWV',
    name: 'CoreWeave',
    slug: 'coreweave',
    model: 'fullStack',
    summary:
      'The largest tracked operator by contracted power and the only one publishing both an ' +
      'active-power and a contracted-power figure in the same release.',
    measures: [
      measure({
        metric: 'securedPowerMw', value: 3700, effectiveDate: '2026-06-30',
        verifiedAt: VERIFIED_CW, confidence: 'confirmed', source: CW_Q2,
        note:
          'CoreWeave\'s wording is "grew total contracted power to approximately 3.7 GW". This is ' +
          'power contracted from utilities and landlords — supply, not customer demand — so it is ' +
          'recorded as secured power. It is a total, and already includes the 1.5 GW active.'
      }),
      measure({
        metric: 'energisedCriticalItMw', value: 1500, effectiveDate: '2026-06-30',
        verifiedAt: VERIFIED_CW, confidence: 'confirmed', source: CW_Q2,
        note:
          'CoreWeave\'s wording is "expanded active power by nearly 500 MWs to reach 1.5 GW". ' +
          '"Active power" is their term; it maps to energised critical IT, and does not by itself ' +
          'establish how much is customer-accepted.'
      }),
      // Backlog is a dollar commitment, not a megawatt figure — it is not a capacity measure
      // and deliberately does not appear as one. It is carried on the contracts table instead.
      measure({ metric: 'customerContractedMw', value: null,
        note: 'Not disclosed in MW. CoreWeave reports customer commitments in dollars of backlog.' }),
      measure({ metric: 'customerAcceptedMw', value: null }),
      measure({ metric: 'revenueLiveMw', value: null,
        note: 'Not disclosed in MW. Q2 2026 revenue was $2,575m across the whole fleet.' })
    ]
  },

  {
    id: 'nebius',
    ticker: 'NBIS',
    name: 'Nebius Group',
    slug: 'nebius',
    model: 'fullStack',
    summary: 'European full-stack operator scaling a US campus alongside its original Finnish site.',
    measures: [
      measure({
        metric: 'securedPowerMw', value: 3500, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null
      }),
      measure({
        metric: 'energisedCriticalItMw', value: 310, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null,
        note: 'Mäntsälä, Finland. Site-level figure carried over without a linked filing.'
      }),
      measure({ metric: 'customerContractedMw', value: null }),
      measure({ metric: 'customerAcceptedMw', value: null }),
      measure({ metric: 'revenueLiveMw', value: null })
    ]
  },

  {
    id: 'terawulf',
    ticker: 'WULF',
    name: 'TeraWulf',
    slug: 'terawulf',
    model: 'poweredShell',
    summary: 'Powered-shell landlord converting legacy mining sites to HPC leasing.',
    measures: [
      measure({
        metric: 'securedPowerMw', value: 2200, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null
      }),
      measure({
        metric: 'customerContractedMw', value: 642.5, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null,
        note:
          'Previously filed under a single "contracted" column that mixed power and customer ' +
          'contracts. Recorded here as customer-contracted; needs a filing to confirm.'
      }),
      measure({
        metric: 'energisedCriticalItMw', value: 102, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null,
        note: 'Lake Mariner critical IT energised for HPC leasing.'
      }),
      measure({ metric: 'customerAcceptedMw', value: null }),
      measure({ metric: 'revenueLiveMw', value: null })
    ]
  },

  {
    id: 'keel',
    ticker: 'KEEL',
    name: 'Keel Infrastructure',
    slug: 'keel',
    model: 'poweredShell',
    summary: 'Ex-Bitfarms portfolio with a large secured pipeline and no signed customer lease yet.',
    measures: [
      measure({
        metric: 'securedPowerMw', value: 2200, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null
      }),
      measure({
        metric: 'constructionMw', value: 110, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null, note: 'Sharon, Pennsylvania.'
      }),
      measure({
        metric: 'customerContractedMw', value: 0, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null,
        note:
          'A genuine zero, not a missing value: the company states no customer lease has been ' +
          'signed. This is the one case on the site where 0 is the real figure.'
      }),
      measure({ metric: 'energisedCriticalItMw', value: null }),
      measure({ metric: 'customerAcceptedMw', value: null }),
      measure({ metric: 'revenueLiveMw', value: null })
    ]
  },

  {
    id: 'applied-digital',
    ticker: 'APLD',
    name: 'Applied Digital',
    slug: 'applied-digital',
    model: 'poweredShell',
    summary: 'Powered-shell developer with contracted capacity in North Dakota.',
    measures: [
      measure({
        metric: 'customerContractedMw', value: 600, effectiveDate: '2026-08-15',
        confidence: 'reported', verifiedAt: null,
        note: 'Described as 600MW contracted with prospective lease revenue of roughly $16bn.'
      }),
      measure({ metric: 'securedPowerMw', value: null }),
      measure({ metric: 'energisedCriticalItMw', value: null }),
      measure({ metric: 'customerAcceptedMw', value: null }),
      measure({ metric: 'revenueLiveMw', value: null })
    ]
  }
];

/** Tickers quoted on the watchlist but not tracked as capacity operators. */
export const WATCH_ONLY = [
  { ticker: 'CIFR', name: 'Cipher Mining' },
  { ticker: 'NVDA', name: 'NVIDIA' }
];

export const COMPANY_BY_ID = Object.fromEntries(COMPANIES.map(c => [c.id, c]));
export const COMPANY_BY_TICKER = Object.fromEntries(COMPANIES.map(c => [c.ticker, c]));

/** Every ticker the live feeds should query. */
export const WATCH_TICKERS = [
  ...COMPANIES.map(c => c.ticker),
  ...WATCH_ONLY.map(w => w.ticker)
];

export const TICKER_NAMES = Object.fromEntries([
  ...COMPANIES.map(c => [c.ticker, c.name]),
  ...WATCH_ONLY.map(w => [w.ticker, w.name])
]);
