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
    category: 'customer-acceptance', status: 'guided-window',
    expectedAt: null, expectedWindowStart: '2026-10-01', expectedWindowEnd: '2026-12-31',
    timezone: null, sourceIds: ['iren-10k-fy26', 'iren-fy26-results'], confidence: 'confirmed',
    affectsMetric: 'customerAcceptedMw',
    isCompanyGuidance: true,
    description:
      'The remaining 150 MW of the 200 MW Microsoft contract. Targeted for delivery in phases in ' +
      'Q4 2026; Horizon 2 was commissioning at the FY26 results. Contractual grace periods run from ' +
      'mid-Q4 2026 to the beginning of Q2 2027, so a Q1 2027 delivery would not be a breach.'
  },
  {
    id: 'apld-polaris-2-initial', ticker: 'APLD', companyId: 'applied-digital', projectId: 'apld-polaris-2',
    title: 'Polaris Forge 2 — initial operations',
    category: 'capacity-delivery', status: 'guided-window',
    expectedAt: null, expectedWindowStart: '2026-07-01', expectedWindowEnd: '2026-12-31',
    timezone: null, sourceIds: ['apld-10q-20260831', 'apld-q1-fy27-results'], confidence: 'confirmed',
    affectsMetric: 'energisedCriticalItMw',
    isCompanyGuidance: true,
    description:
      'Initial ready for service guided for H2 2026, which the company says would take delivered ' +
      'critical IT across its North Dakota campuses to 300 MW by year end. Full capacity early 2027.'
  },
  {
    id: 'apld-delta-1-initial', ticker: 'APLD', companyId: 'applied-digital', projectId: 'apld-delta-1',
    title: 'Delta Forge 1 — initial ready for service',
    category: 'capacity-delivery', status: 'guided-window',
    expectedAt: null, expectedWindowStart: '2027-01-01', expectedWindowEnd: '2027-06-30',
    timezone: null, sourceIds: ['apld-10q-20260831'], confidence: 'confirmed',
    affectsMetric: 'energisedCriticalItMw',
    isCompanyGuidance: true,
    description: '300 MW for a high investment-grade hyperscaler. Initial ready for service H1 2027, full capacity early 2028.'
  },
  {
    id: 'apld-polaris-3-initial', ticker: 'APLD', companyId: 'applied-digital', projectId: 'apld-polaris-3',
    title: 'Polaris Forge 3 — initial ready for service',
    category: 'capacity-delivery', status: 'guided-window',
    expectedAt: null, expectedWindowStart: '2027-07-01', expectedWindowEnd: '2027-12-31',
    timezone: null, sourceIds: ['apld-10q-20260831'], confidence: 'confirmed',
    affectsMetric: 'energisedCriticalItMw',
    isCompanyGuidance: true,
    description: '300 MW for a high investment-grade hyperscaler. Initial ready for service H2 2027, full capacity H2 2028.'
  },
  {
    id: 'wulf-muskie-first-phase', ticker: 'WULF', companyId: 'terawulf', projectId: 'wulf-muskie',
    title: 'Muskie — first 500 MW begins ramping',
    category: 'capacity-delivery', status: 'guided-window',
    expectedAt: null, expectedWindowStart: '2028-01-01', expectedWindowEnd: '2028-12-31',
    timezone: null, sourceIds: ['wulf-muskie-1gw'], confidence: 'confirmed',
    affectsMetric: 'energisedGrossMw',
    isCompanyGuidance: true,
    description:
      'Utility power, not a customer delivery: no tenant has been announced for Muskie. The second ' +
      '500 MW phase is guided for 2029, subject to Kentucky PSC approval.'
  }
];

export const CATALYSTS_BY_COMPANY = CATALYSTS.reduce((a, c) => { (a[c.companyId] ||= []).push(c); return a; }, {});
