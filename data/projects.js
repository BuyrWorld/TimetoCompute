/**
 * Site-level project records.
 *
 * `stage` is the furthest stage the project has demonstrably reached. Where a
 * megawatt figure was never published, capacityMw stays null — it is rendered as
 * "Not disclosed" and excluded from every total, never coerced to zero.
 *
 * Target dates are only present where a company has actually given one. Absent
 * dates render as "Not disclosed"; they are never inferred.
 */
export const PROJECTS = [
  // ---- IREN -------------------------------------------------------------
  { id: 'iren-childress', companyId: 'iren', name: 'Childress, Texas',
    country: 'US', flag: '🇺🇸', capacityMw: 480, stage: 'construction',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: 'Horizons 1–4 for Microsoft plus the NVIDIA deployment. 50MW accepted.' },
  { id: 'iren-sweetwater', companyId: 'iren', name: 'Sweetwater, Texas',
    country: 'US', flag: '🇺🇸', capacityMw: 2000, stage: 'construction',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: '2GW hub, construction under way.' },
  { id: 'iren-bc', companyId: 'iren', name: 'British Columbia sites',
    country: 'CA', flag: '🇨🇦', capacityMw: null, stage: 'energised',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: 'Legacy mining capacity converting to GPU.' },
  { id: 'iren-spain', companyId: 'iren', name: 'Spain',
    country: 'ES', flag: '🇪🇸', capacityMw: null, stage: 'secured',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: 'Part of the 5GW secured pipeline.' },
  { id: 'iren-bundey', companyId: 'iren', name: 'Bundey, South Australia',
    country: 'AU', flag: '🇦🇺', capacityMw: null, stage: 'secured',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: 'Part of the 5GW secured pipeline.' },

  // ---- Nebius -----------------------------------------------------------
  { id: 'nbis-kansas', companyId: 'nebius', name: 'Kansas City, Missouri',
    country: 'US', flag: '🇺🇸', capacityMw: 1000, stage: 'construction',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: '1GW campus anchoring the US buildout.' },
  { id: 'nbis-mantsala', companyId: 'nebius', name: 'Mäntsälä, Finland',
    country: 'FI', flag: '🇫🇮', capacityMw: 310, stage: 'energised',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: '310MW AI factory, the original European site.' },

  // ---- TeraWulf ---------------------------------------------------------
  { id: 'wulf-lake-mariner', companyId: 'terawulf', name: 'Lake Mariner, New York',
    country: 'US', flag: '🇺🇸', capacityMw: 102, stage: 'energised',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: '102MW critical IT energised for HPC leasing.' },
  { id: 'wulf-kentucky', companyId: 'terawulf', name: 'Kentucky',
    country: 'US', flag: '🇺🇸', capacityMw: null, stage: 'secured',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: 'Acquired to diversify grid exposure.' },
  { id: 'wulf-maryland', companyId: 'terawulf', name: 'Maryland',
    country: 'US', flag: '🇺🇸', capacityMw: null, stage: 'secured',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: 'Acquired to diversify grid exposure.' },

  // ---- Keel -------------------------------------------------------------
  { id: 'keel-scrubgrass', companyId: 'keel', name: 'Scrubgrass, Pennsylvania',
    country: 'US', flag: '🇺🇸', capacityMw: 1300, stage: 'secured',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: 'Up to 1.3GW, still under application.' },
  { id: 'keel-sharon', companyId: 'keel', name: 'Sharon, Pennsylvania',
    country: 'US', flag: '🇺🇸', capacityMw: 110, stage: 'construction',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: 'Zoning approved May 2026, full permitting outstanding.' },
  { id: 'keel-panther-creek', companyId: 'keel', name: 'Panther Creek, Pennsylvania',
    country: 'US', flag: '🇺🇸', capacityMw: null, stage: 'construction',
    confidence: 'reported', originalTarget: null, currentTarget: '2026-12-31', actual: null,
    note: 'Full power allocation expected late 2026.' },
  { id: 'keel-moses-lake', companyId: 'keel', name: 'Moses Lake, Washington',
    country: 'US', flag: '🇺🇸', capacityMw: null, stage: 'secured',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: 'Active go-to-market site.' },
  { id: 'keel-sherbrooke', companyId: 'keel', name: 'Sherbrooke, Québec',
    country: 'CA', flag: '🇨🇦', capacityMw: null, stage: 'secured',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: 'Canadian campus in the listed portfolio.' },

  // ---- CoreWeave --------------------------------------------------------
  { id: 'crwv-fleet', companyId: 'coreweave', name: 'US data centre estate',
    country: 'US', flag: '🇺🇸', capacityMw: null, stage: 'energised',
    confidence: 'confirmed', originalTarget: null, currentTarget: null, actual: null,
    note:
      'CoreWeave reports fleet-wide rather than per-site. 3.7GW contracted power and 1.5GW ' +
      'active as of 30 Jun 2026; the site-level split is not disclosed.' },

  // ---- Applied Digital --------------------------------------------------
  { id: 'apld-nd', companyId: 'applied-digital', name: 'North Dakota',
    country: 'US', flag: '🇺🇸', capacityMw: null, stage: 'construction',
    confidence: 'reported', originalTarget: null, currentTarget: null, actual: null,
    note: '600MW under contract; site split not disclosed.' }
];

export const COUNTRY_NAMES = {
  US: 'United States', CA: 'Canada', ES: 'Spain', AU: 'Australia', FI: 'Finland'
};

/**
 * Customer contracts. `valueBn` is a dollar commitment and is deliberately kept
 * apart from megawatt measures — the two are never summed.
 */
export const CONTRACTS = [
  { id: 'iren-msft', companyId: 'iren', customer: 'Microsoft', mw: 200, years: 5,
    valueBn: 9.7, deliveredMw: 50, confidence: 'reported', source: null,
    terms: '76,000+ GB300 NVL72, liquid-cooled' },
  { id: 'iren-nvda', companyId: 'iren', customer: 'NVIDIA', mw: 60, years: 5,
    valueBn: 3.4, deliveredMw: 0, confidence: 'reported', source: null,
    terms: 'Air-cooled Blackwell, existing capacity' },
  { id: 'iren-eight', companyId: 'iren', customer: 'Eight AI developers', mw: null,
    years: null, valueBn: 2.8, deliveredMw: null, confidence: 'reported', source: null,
    terms: 'Not disclosed' },
  { id: 'nbis-meta', companyId: 'nebius', customer: 'Meta Platforms', mw: null,
    years: null, valueBn: 27, deliveredMw: null, confidence: 'reported', source: null,
    terms: '$12bn committed over first five years' },
  { id: 'crwv-backlog', companyId: 'coreweave', customer: 'Aggregate revenue backlog',
    mw: null, years: null, valueBn: 104, deliveredMw: null, confidence: 'confirmed',
    source: {
      title: 'CoreWeave Reports Strong Second Quarter 2026 Results',
      url: 'https://investors.coreweave.com/news/news-details/2026/CoreWeave-Reports-Strong-Second-Quarter-2026-Results/default.aspx',
      publishedDate: '2026-08-11'
    },
    terms:
      'Revenue backlog of approximately $104bn as of 30 Jun 2026. Excludes more than $25bn of ' +
      'net new customer commitments added in early Q3.' },
  { id: 'wulf-anthropic', companyId: 'terawulf', customer: 'Anthropic', mw: null,
    years: null, valueBn: null, deliveredMw: null, confidence: 'reported', source: null,
    terms: 'Tenant-supplied accelerators.' },
  { id: 'apld-delta-forge', companyId: 'applied-digital', customer: 'Delta Forge 2',
    mw: null, years: null, valueBn: null, deliveredMw: null, confidence: 'reported',
    source: null, terms: 'Tenant-supplied accelerators.' }
];

export const PROJECTS_BY_COMPANY = PROJECTS.reduce((acc, p) => {
  (acc[p.companyId] ||= []).push(p);
  return acc;
}, {});

export const CONTRACTS_BY_COMPANY = CONTRACTS.reduce((acc, c) => {
  (acc[c.companyId] ||= []).push(c);
  return acc;
}, {});
