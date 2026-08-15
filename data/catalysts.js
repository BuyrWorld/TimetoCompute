/**
 * Upcoming catalysts — dated events that may change an operational metric.
 *
 * Every record distinguishes a confirmed date from a company-guided window from an
 * estimate. A rumour is not a catalyst; if no source states timing, there is no
 * record here. Earnings dates arrive separately from the provider's earnings
 * calendar at request time and are merged in the UI, never hard-coded.
 */
export const CATALYST_CATEGORIES = {
  earnings: { label: 'Earnings' },
  contract: { label: 'Contract' },
  'customer-acceptance': { label: 'Customer acceptance' },
  'capacity-delivery': { label: 'Capacity delivery' },
  energisation: { label: 'Energisation' },
  'revenue-commencement': { label: 'Revenue commencement' },
  financing: { label: 'Financing' },
  'capital-raise': { label: 'Capital raise' },
  'debt-maturity': { label: 'Debt maturity' },
  regulatory: { label: 'Regulatory' },
  permitting: { label: 'Permitting' },
  'investor-day': { label: 'Investor day' },
  'product-launch': { label: 'Product launch' },
  'lockup-expiry': { label: 'Lock-up expiry' },
  other: { label: 'Other' }
};

export const CATALYST_STATUS = {
  'confirmed-date': { label: 'Confirmed date', tone: 'ok', glyph: '●',
    definition: 'An exact date published by the company or an independently scheduled event.' },
  'guided-window': { label: 'Guided window', tone: 'warn', glyph: '◐',
    definition: 'The company has guided to a period — a half, a quarter — but not an exact date.' },
  'estimated-date': { label: 'Estimated date', tone: 'unknown', glyph: '◌',
    definition: 'T2C\'s estimate from a stated cadence. Not company guidance.' },
  completed: { label: 'Completed', tone: 'ok', glyph: '✓', definition: 'The event has occurred.' },
  delayed: { label: 'Delayed', tone: 'bad', glyph: '▲', definition: 'The company has moved the date later.' },
  cancelled: { label: 'Cancelled', tone: 'bad', glyph: '✕', definition: 'No longer expected.' }
};

/**
 * Only events whose timing a cited source actually states. Windows use
 * expectedWindowStart/End with expectedAt null — the UI must not print a false
 * exact date for a guided half-year.
 */
export const CATALYSTS = [
  {
    id: 'wulf-justified-initial-capacity', ticker: 'WULF', companyId: 'terawulf', projectId: 'wulf-justified',
    title: 'Anthropic / Justified — initial capacity delivery',
    category: 'capacity-delivery', status: 'guided-window',
    expectedAt: null, expectedWindowStart: '2027-07-01', expectedWindowEnd: '2027-12-31',
    timezone: null, sourceIds: ['wulf-anthropic-lease'], confidence: 'confirmed',
    affectsMetric: 'energisedCriticalItMw',
    isCompanyGuidance: true,
    description:
      'First tranche of the approximately 401 MW Anthropic lease. Company guidance is H2 2027 — a ' +
      'half-year window, not a date. Would be the first energisation at the Justified campus.'
  },
  {
    id: 'wulf-justified-full-delivery', ticker: 'WULF', companyId: 'terawulf', projectId: 'wulf-justified',
    title: 'Anthropic / Justified — full delivery',
    category: 'capacity-delivery', status: 'guided-window',
    expectedAt: null, expectedWindowStart: '2028-01-01', expectedWindowEnd: '2028-06-30',
    timezone: null, sourceIds: ['wulf-anthropic-lease'], confidence: 'confirmed',
    affectsMetric: 'customerAcceptedMw',
    isCompanyGuidance: true,
    description:
      'Completion of the approximately 401 MW lease. Guided to early 2028. Full delivery would take ' +
      'TeraWulf\'s contracted capacity toward acceptance and, contract terms permitting, revenue.'
  },
  {
    id: 'apld-delta-2-delivery', ticker: 'APLD', companyId: 'applied-digital', projectId: 'apld-delta-2',
    title: 'Delta Forge 2 — expected delivery',
    category: 'capacity-delivery', status: 'guided-window',
    expectedAt: null, expectedWindowStart: '2028-01-01', expectedWindowEnd: '2028-06-30',
    timezone: null, sourceIds: ['apld-delta-forge-2'], confidence: 'confirmed',
    affectsMetric: 'energisedCriticalItMw',
    isCompanyGuidance: true,
    description:
      '210 MW under construction for a high investment-grade hyperscaler, approximately $5.2bn over ' +
      '15 years. Guided to H1 2028.'
  },
  {
    id: 'nbis-2026-power-target', ticker: 'NBIS', companyId: 'nebius', projectId: null,
    title: 'Nebius year-end 5 GW contracted-power target',
    category: 'capacity-delivery', status: 'guided-window',
    expectedAt: null, expectedWindowStart: '2026-10-01', expectedWindowEnd: '2026-12-31',
    timezone: null, sourceIds: ['nbis-q2-2026-shareholder-letter'], confidence: 'confirmed',
    affectsMetric: 'securedPowerMw',
    isCompanyGuidance: true,
    description:
      'Management target to reach 5 GW of contracted power by year end, raised from a measured ' +
      '"more than 3.5 GW". A target date for a target figure — it is not a scheduled event and its ' +
      'achievement is not assured.'
  },
  {
    id: 'iren-horizons-2-4', ticker: 'IREN', companyId: 'iren', projectId: 'iren-horizons-2-4',
    title: 'Microsoft Horizons 2–4 — remaining tranches',
    category: 'customer-acceptance', status: 'estimated-date',
    expectedAt: null, expectedWindowStart: null, expectedWindowEnd: null,
    timezone: null, sourceIds: ['iren-8k-microsoft'], confidence: 'reported',
    affectsMetric: 'customerAcceptedMw',
    isCompanyGuidance: false,
    description:
      'The balance of the 200 MW Microsoft contract after Horizon 1\'s 50 MW. No delivery date has ' +
      'been published for the remaining tranches, so no date is shown — the timing is genuinely unknown.'
  }
];

export const CATALYSTS_BY_COMPANY = CATALYSTS.reduce((a, c) => { (a[c.companyId] ||= []).push(c); return a; }, {});
