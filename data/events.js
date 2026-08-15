/**
 * The Delivery Ledger.
 *
 * This is the file that makes T2C measure *time* rather than show a snapshot.
 * Every change to a capacity figure should land here as an event, so a reader can
 * see when a number moved, what it moved from, and which document said so.
 *
 * HARD RULE: no event may be invented. History that was never recorded is absent,
 * not reconstructed. The ledger is deliberately near-empty at launch — the only
 * entries are ones backed by a document that exists. An honest empty ledger is
 * worth more than a plausible fabricated one, and it fills up as filings land.
 *
 * To add an event, append a record. Never edit or delete an existing one; if a
 * figure was wrong, add a correcting event referencing it.
 */
export const EVENTS = [
  {
    eventId: 'crwv-2026-q2-active-power',
    companyId: 'coreweave',
    projectId: 'crwv-fleet',
    eventType: 'energised',
    previousStage: 'construction',
    newStage: 'energised',
    previousValue: 1000,
    newValue: 1500,
    unit: 'MW',
    effectiveDate: '2026-06-30',
    announcedDate: '2026-08-11',
    targetDate: null,
    actualDate: '2026-06-30',
    sourceUrl:
      'https://investors.coreweave.com/news/news-details/2026/CoreWeave-Reports-Strong-Second-Quarter-2026-Results/default.aspx',
    sourceTitle: 'CoreWeave Reports Strong Second Quarter 2026 Results',
    confidence: 'confirmed',
    summary: 'Active power expanded by nearly 500 MW to reach 1.5 GW.',
    implication:
      'Roughly 500 MW moved from building to drawing power in a single quarter — the largest ' +
      'single-quarter energisation step on the board. Previous value is derived from the ' +
      'company\'s own "expanded by nearly 500 MWs" wording rather than a separately published Q1 figure.'
  },
  {
    eventId: 'crwv-2026-q2-contracted-power',
    companyId: 'coreweave',
    projectId: 'crwv-fleet',
    eventType: 'powerSecured',
    previousStage: null,
    newStage: 'secured',
    previousValue: null,
    newValue: 3700,
    unit: 'MW',
    effectiveDate: '2026-06-30',
    announcedDate: '2026-08-11',
    targetDate: null,
    actualDate: '2026-06-30',
    sourceUrl:
      'https://investors.coreweave.com/news/news-details/2026/CoreWeave-Reports-Strong-Second-Quarter-2026-Results/default.aspx',
    sourceTitle: 'CoreWeave Reports Strong Second Quarter 2026 Results',
    confidence: 'confirmed',
    summary: 'Total contracted power grew to approximately 3.7 GW.',
    implication:
      'Supply, not demand. 2.2 GW of the 3.7 GW is secured but not yet energised, which is the ' +
      'gap the delivery clock runs against.'
  },
  {
    eventId: 'crwv-2026-q2-backlog',
    companyId: 'coreweave',
    projectId: null,
    eventType: 'guidanceChanged',
    previousStage: null,
    newStage: null,
    previousValue: null,
    newValue: 104,
    unit: '$bn',
    effectiveDate: '2026-06-30',
    announcedDate: '2026-08-11',
    targetDate: null,
    actualDate: null,
    sourceUrl:
      'https://investors.coreweave.com/news/news-details/2026/CoreWeave-Reports-Strong-Second-Quarter-2026-Results/default.aspx',
    sourceTitle: 'CoreWeave Reports Strong Second Quarter 2026 Results',
    confidence: 'confirmed',
    summary: 'Revenue backlog of approximately $104bn as of 30 June 2026.',
    implication:
      'Excludes more than $25bn of net new commitments added in early Q3, so the disclosed figure ' +
      'understates committed demand at the time of reading.'
  }
];

/**
 * Correction log. Shown on /methodology so changes to the site\'s own figures are
 * public rather than silent.
 */
export const CORRECTIONS = [
  {
    id: 'corr-2026-08-15-crwv',
    date: '2026-08-15',
    companyId: 'coreweave',
    summary:
      'CoreWeave previously showed 3.5 GW under a single "pipeline" column with active capacity ' +
      'blank, which read as a current figure but matched no disclosure.',
    change:
      'Replaced with the Q2 2026 disclosure: 3.7 GW total contracted power and 1.5 GW active ' +
      'power, both sourced to the 11 Aug 2026 results release.',
    sourceUrl:
      'https://investors.coreweave.com/news/news-details/2026/CoreWeave-Reports-Strong-Second-Quarter-2026-Results/default.aspx'
  },
  {
    id: 'corr-2026-08-15-contracted-split',
    date: '2026-08-15',
    companyId: null,
    summary:
      'A single "contracted" column mixed power secured from utilities with compute contracted to ' +
      'customers. The two are not comparable and were being added together in site totals.',
    change:
      'Split into securedPowerMw and customerContractedMw across every company. Totals are now ' +
      'computed per family and never summed across them.',
    sourceUrl: null
  },
  {
    id: 'corr-2026-08-15-checked-date',
    date: '2026-08-15',
    companyId: null,
    summary:
      'Every capacity row displayed a "checked" date of the current compile date, implying each ' +
      'figure had been re-verified when it had not.',
    change:
      'Replaced with verifiedAt, which is only set when a human actually reviewed the underlying ' +
      'document. Figures without one now display "source required".',
    sourceUrl: null
  }
];
