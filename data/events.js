/**
 * The Delivery Ledger — the central product.
 *
 * Every entry is backed by a document in data/sources.js. Nothing is reconstructed
 * from memory. Where a previous value was never published, previousValue is null and
 * the UI shows "Not disclosed" rather than an assumed figure.
 *
 * Append only. If a figure was wrong, add a `correction` event referencing it.
 */
export const EVENTS = [
  /* ---------------- CoreWeave ---------------- */
  {
    id: 'crwv-2026-08-11-contracted-4200', companyId: 'coreweave', projectId: 'crwv-fleet',
    metric: 'securedPowerMw', eventType: 'capacity-change',
    previousValue: 3700, newValue: 4200, unit: 'MW',
    announcedAt: '2026-08-11', effectiveAt: '2026-08-11',
    sourceIds: ['crwv-q2-2026-call', 'crwv-q2-2026-release'], confidence: 'confirmed', significance: 'high',
    summary: 'Contracted power reached approximately 4.2 GW, up from 3.7 GW at quarter end.',
    implication:
      'A further 500 MW of supply secured within six weeks of the quarter close. Contracted power is ' +
      'a total that already includes active capacity, so this widens the gap between power controlled ' +
      'and power energised rather than closing it.'
  },
  {
    id: 'crwv-2026-q2-active-1500', companyId: 'coreweave', projectId: 'crwv-fleet',
    metric: 'energisedCriticalItMw', eventType: 'capacity-change',
    previousValue: 1000, newValue: 1500, unit: 'MW',
    announcedAt: '2026-08-11', effectiveAt: '2026-06-30',
    sourceIds: ['crwv-q2-2026-release'], confidence: 'confirmed', significance: 'high',
    summary: 'Active power expanded by nearly 500 MW to reach 1.5 GW.',
    implication:
      'The largest single-quarter energisation step on the board. The previous value is derived from ' +
      'the company\'s own "expanded by nearly 500 MWs" wording rather than a separately published Q1 figure.'
  },
  {
    id: 'crwv-2026-q2-backlog', companyId: 'coreweave', projectId: null,
    metric: null, eventType: 'new-disclosure',
    previousValue: null, newValue: 104.2, unit: '$bn',
    announcedAt: '2026-08-11', effectiveAt: '2026-06-30',
    sourceIds: ['crwv-q2-2026-release'], confidence: 'confirmed', significance: 'high',
    summary: 'Revenue backlog of approximately $104.2bn as at 30 June 2026.',
    implication:
      'Excludes more than $25bn of net new customer commitments added in early Q3, so the quarter-end ' +
      'figure understates committed demand at the time of reading.'
  },

  /* ---------------- IREN ---------------- */
  {
    id: 'iren-2026-08-13-horizon1', companyId: 'iren', projectId: 'iren-horizon-1',
    metric: 'customerAcceptedMw', eventType: 'customer-accepted',
    previousValue: null, newValue: 50, unit: 'MW',
    announcedAt: '2026-08-13', effectiveAt: '2026-08-13',
    sourceIds: ['iren-horizon1-delivery'], confidence: 'confirmed', significance: 'high',
    summary: 'Horizon 1 — 50 MW of critical IT — delivered to and accepted by Microsoft.',
    implication:
      'The only formally accepted hyperscaler capacity across every company tracked here. Acceptance ' +
      'is the milestone that normally starts the revenue clock, but IREN has not separately disclosed ' +
      'that billing has commenced, so it is not recorded as revenue-live.'
  },
  {
    id: 'iren-2026-06-nvidia', companyId: 'iren', projectId: null,
    metric: 'customerContractedMw', eventType: 'contract-signed',
    previousValue: 200, newValue: 260, unit: 'MW',
    announcedAt: '2026-06-01', effectiveAt: '2026-06-01',
    sourceIds: ['iren-ex991-nvidia'], confidence: 'confirmed', significance: 'high',
    summary: 'NVIDIA agreement for 60 MW, approximately $3.4bn over a five-year term.',
    implication:
      'Takes disclosed customer-contracted capacity to a minimum of 260 MW alongside the 200 MW ' +
      'Microsoft contract. Still a minimum — other contracts do not disclose megawatts.'
  },
  {
    id: 'iren-2026-06-developers', companyId: 'iren', projectId: null,
    metric: null, eventType: 'contract-signed',
    previousValue: null, newValue: 2.8, unit: '$bn',
    announcedAt: '2026-06-01', effectiveAt: '2026-06-01',
    sourceIds: ['iren-ex991-nvidia'], confidence: 'confirmed', significance: 'medium',
    summary: 'Additional AI developer contracts totalling approximately $2.8bn.',
    implication:
      'Megawatts not disclosed, which is precisely why the company\'s customer-contracted figure is ' +
      'carried as a disclosed minimum rather than an exhaustive total.'
  },

  /* ---------------- Nebius ---------------- */
  {
    id: 'nbis-2026-q2-target-5gw', companyId: 'nebius', projectId: null,
    metric: 'securedPowerMw', eventType: 'target-change',
    previousValue: 3500, newValue: 5000, unit: 'MW',
    announcedAt: '2026-08-07', effectiveAt: '2026-12-31',
    sourceIds: ['nbis-q2-2026-shareholder-letter', 'nbis-q1-2026-ex991'], confidence: 'confirmed', significance: 'high',
    summary: 'Year-end contracted-power target raised to 5 GW, from a measured "more than 3.5 GW".',
    implication:
      'A target, not delivered capacity. The 3.5 GW is the last explicitly measured figure; the 5 GW ' +
      'is an ambition for 31 December 2026 and is excluded from every current-capacity total.'
  },
  {
    id: 'nbis-2026-06-meta', companyId: 'nebius', projectId: null,
    metric: null, eventType: 'contract-signed',
    previousValue: null, newValue: 12, unit: '$bn',
    announcedAt: '2026-06-01', effectiveAt: '2026-06-01',
    sourceIds: ['nbis-meta-agreement'], confidence: 'confirmed', significance: 'high',
    summary: 'Meta agreement: $12bn dedicated-capacity commitment over five years.',
    implication:
      'A further $15bn may follow, relating to additional or otherwise unsold capacity, for a maximum ' +
      'of approximately $27bn. Only the $12bn is a commitment; the balance is conditional and is not ' +
      'displayed as committed revenue.'
  },

  /* ---------------- TeraWulf ---------------- */
  {
    id: 'wulf-2026-08-04-anthropic', companyId: 'terawulf', projectId: 'wulf-justified',
    metric: 'customerContractedMw', eventType: 'contract-signed',
    previousValue: 438, newValue: 839, unit: 'MW',
    announcedAt: '2026-08-04', effectiveAt: '2026-08-04',
    sourceIds: ['wulf-anthropic-lease'], confidence: 'confirmed', significance: 'high',
    summary: 'Anthropic lease at the Justified Data Campus — approximately 401 MW critical IT, 20-year initial term, approximately $19bn.',
    implication:
      'Nearly doubles disclosed contracted capacity, but initial capacity is not expected until H2 2027 ' +
      'and full delivery not until early 2028. Contracted is not delivered.'
  },
  {
    id: 'wulf-2026-q2-102mw', companyId: 'terawulf', projectId: 'wulf-lake-mariner',
    metric: 'revenueLiveMw', eventType: 'revenue-commenced',
    previousValue: null, newValue: 102, unit: 'MW',
    announcedAt: '2026-08-11', effectiveAt: '2026-06-30',
    sourceIds: ['wulf-q2-2026-results'], confidence: 'confirmed', significance: 'high',
    summary: 'Lake Mariner reports 102 MW of revenue-generating critical IT, with 336 MW more under construction.',
    implication:
      'One of only two revenue-generating critical IT figures disclosed by any tracked company. The ' +
      'company\'s explicit "revenue-generating" wording is what allows this to be recorded as revenue-live.'
  },
  {
    id: 'wulf-2026-08-04-abernathy', companyId: 'terawulf', projectId: null,
    metric: null, eventType: 'disposal',
    previousValue: null, newValue: null, unit: null,
    announcedAt: '2026-08-04', effectiveAt: '2026-08-04',
    sourceIds: ['wulf-anthropic-lease'], confidence: 'confirmed', significance: 'medium',
    summary: 'Sale of TeraWulf\'s 50.1% interest in the Abernathy joint venture to Fluidstack.',
    implication:
      'Capacity disposed of must leave current owned totals. This is one reason the February 2.2 GW ' +
      'pipeline figure is retained as historical rather than carried forward as a current value.'
  },

  {
    id: 'wulf-2026-07-29-ferc-morgantown', companyId: 'terawulf', projectId: 'wulf-chesapeake',
    metric: null, eventType: 'stage-change',
    previousValue: null, newValue: null, unit: null,
    announcedAt: '2026-07-29', effectiveAt: '2026-07-29',
    sourceIds: ['ferc-ec26-58-morgantown'], confidence: 'confirmed', significance: 'medium',
    summary: 'FERC authorised the acquisition of Morgantown Power LLC (Docket EC26-58-000).',
    implication:
      'The first regulator-sourced record on the site, and a useful warning about headline approvals: ' +
      'FERC states the order covers the ownership transfer only. Data centre development, new generation, ' +
      'gas infrastructure, battery storage and any change to PJM participation each require separate ' +
      'review. Company guidance still contemplates data centre operations only in 2030.'
  },

  /* ---------------- Keel ---------------- */
  {
    id: 'keel-2026-q2-split', companyId: 'keel', projectId: null,
    metric: 'securedPowerMw', eventType: 'new-disclosure',
    previousValue: null, newValue: 648, unit: 'MW',
    announcedAt: '2026-08-11', effectiveAt: '2026-06-30',
    sourceIds: ['keel-q2-2026-results'], confidence: 'confirmed', significance: 'high',
    summary: 'Portfolio split disclosed: 648 MW secured, 1,513 MW planned or in development, approximately 2.2 GW total pipeline.',
    implication:
      'The 2.2 GW previously carried as secured power is a development pipeline. Secured capacity is ' +
      '648 MW — under a third of the headline figure.'
  },
  {
    id: 'keel-2026-permitting', companyId: 'keel', projectId: 'keel-panther-creek',
    metric: null, eventType: 'stage-change',
    previousValue: null, newValue: null, unit: null,
    announcedAt: '2026-08-11', effectiveAt: '2026-06-30',
    sourceIds: ['keel-10q'], confidence: 'confirmed', significance: 'medium',
    summary: 'Panther Creek holds 350 MW of contracted firm power with conditional land development approval; environmental permits outstanding.',
    implication:
      'A worked example of why gates are tracked independently — power and zoning have advanced while ' +
      'environmental approval has not, and the data centre itself is not evidenced as under construction.'
  },

  /* ---------------- Applied Digital ---------------- */
  {
    id: 'apld-2026-05-31-1410', companyId: 'applied-digital', projectId: null,
    metric: 'customerContractedMw', eventType: 'new-disclosure',
    previousValue: 600, newValue: 1410, unit: 'MW',
    announcedAt: '2026-07-15', effectiveAt: '2026-05-31',
    sourceIds: ['apld-10k-20260531'], confidence: 'confirmed', significance: 'high',
    summary: '1,410 MW of contracted critical IT across five campuses, approximately $36.2bn of contracted revenue.',
    implication:
      'The largest disclosed customer-contracted figure of any tracked company, and an exhaustive one — ' +
      'unlike IREN\'s and TeraWulf\'s, which are minimums. Replaces a stale 600 MW record.'
  },
  {
    id: 'apld-2026-08-05-delta2', companyId: 'applied-digital', projectId: 'apld-delta-2',
    metric: 'customerContractedMw', eventType: 'contract-signed',
    previousValue: 1200, newValue: 1410, unit: 'MW',
    announcedAt: '2026-08-05', effectiveAt: '2026-08-05',
    sourceIds: ['apld-delta-forge-2'], confidence: 'confirmed', significance: 'high',
    summary: 'Delta Forge 2: 210 MW leased to a high investment-grade hyperscaler, approximately $5.2bn over 15 years.',
    implication:
      'Under construction with expected delivery in H1 2028 — contracted revenue that does not begin ' +
      'for roughly eighteen months.'
  }
];

/** Public correction log. Changes to T2C's own figures are published, not silent. */
export const CORRECTIONS = [
  {
    id: 'corr-2026-08-15-nbis-310', date: '2026-08-15', companyId: 'nebius',
    summary: 'Nebius showed 310 MW as current energised critical IT.',
    change:
      'That figure is the capacity the Finland facility is expected to reach when fully deployed, not ' +
      'capacity energised today. Moved to planned project capacity; current energised MW is now not ' +
      'disclosed. This was a material misclassification.',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1513845/000110465926059872/tm2614392d1_ex99-2.htm'
  },
  {
    id: 'corr-2026-08-15-keel-2200', date: '2026-08-15', companyId: 'keel',
    summary: 'Keel showed 2.2 GW as secured power.',
    change:
      '2.2 GW is the total development pipeline. The company splits it into 648 MW secured and ' +
      '1,513 MW planned or in development. Secured power corrected to 648 MW.',
    sourceUrl: 'https://investor.bitfarms.com/news-releases/news-release-details/keel-infrastructure-reports-second-quarter-2026-results'
  },
  {
    id: 'corr-2026-08-15-keel-attribution', date: '2026-08-15', companyId: 'keel',
    summary:
      'Keel\'s 648 MW secured and 1,513 MW pipeline figures were attributed to the Q2 2026 press ' +
      'release, which does not contain them.',
    change:
      'Both figures come from the Form 10-Q capacity table, which the record now cites alone. The ' +
      'values themselves were correct and are unchanged. The 10-Q also supplied better definitions and ' +
      'three figures previously missing: 341 MW currently energised (gross), 430 MW secured growth ' +
      'capacity, and a total pipeline of 2,161 MW rather than the rounded 2.2 GW. Panther Creek (60 MW) ' +
      'and Scrubgrass (63 MW) are energised but sit under no energy service agreement, and Keel ' +
      'therefore excludes them from its own secured total.',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1812477/000121390026054166/ea0288134-10q_keel.htm'
  },
  {
    id: 'corr-2026-08-15-keel-zero', date: '2026-08-15', companyId: 'keel',
    summary: 'Keel customer-contracted capacity was stored as numeric zero.',
    change:
      'No filing reports zero megawatts — the company simply has no announced lease. Changed to not ' +
      'disclosed with the label "No announced lease", because a zero implies a measured figure.',
    sourceUrl: null
  },
  {
    id: 'corr-2026-08-15-apld-600', date: '2026-08-15', companyId: 'applied-digital',
    summary: 'Applied Digital showed a stale 600 MW contracted figure.',
    change:
      'Replaced with 1,410 MW of contracted critical IT across five named campuses as at 31 May 2026, ' +
      'with all five campus leases itemised.',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1144879/000114487926000048/apld-20260531.htm'
  },
  {
    id: 'corr-2026-08-15-iren-480', date: '2026-08-15', companyId: 'iren',
    summary: 'IREN showed 480 MW as construction capacity attributed to Childress.',
    change:
      '480 MW is IREN\'s wider 2026 gross AI Cloud capacity target across multiple sites. Reclassified ' +
      'as a target; company construction MW set to not disclosed pending a comparable official total.',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1878848/000187884826000025/irenreportsq3fy26results.htm'
  },
  {
    id: 'corr-2026-08-15-iren-gpus', date: '2026-08-15', companyId: 'iren',
    summary: 'IREN contract terms cited "76,000+ GB300 NVL72" GPUs.',
    change:
      'Removed. No primary source in the audit set states an exact fleet count, and a GPU count is not ' +
      'a megawatt measure in any case.',
    sourceUrl: null
  },
  {
    id: 'corr-2026-08-15-wulf-stale', date: '2026-08-15', companyId: 'terawulf',
    summary: 'TeraWulf showed February 2026 figures (2.2 GW pipeline, 642.5 MW contracted) as current.',
    change:
      'Both retained as dated historical disclosures. Current figures are 839 MW contracted minimum, ' +
      '102 MW revenue-generating and 336 MW under construction. The Abernathy disposal is recorded ' +
      'so sold capacity does not remain in owned totals.',
    sourceUrl: 'https://investors.terawulf.com/news-events/press-releases/detail/144/terawulf-reports-second-quarter-2026-results'
  },
  {
    id: 'corr-2026-08-15-tenant-accelerators', date: '2026-08-15', companyId: null,
    summary: 'TeraWulf and Applied Digital contract rows stated "tenant-supplied accelerators".',
    change: 'Removed from both. The claim is not explicitly supported by the cited primary sources.',
    sourceUrl: null
  },
  {
    id: 'corr-2026-08-15-basis-split', date: '2026-08-15', companyId: null,
    summary: 'Gross utility power, critical IT load and target capacity were being added into single totals.',
    change:
      'Every figure now carries a power basis and a value status. Aggregates only combine matching ' +
      'bases and actual/minimum values; targets, pipeline and potential are excluded and reported separately.',
    sourceUrl: null
  },
  {
    id: 'corr-2026-08-15-crwv-3500', date: '2026-08-15', companyId: 'coreweave',
    summary: 'CoreWeave previously showed 3.5 GW with active capacity blank.',
    change:
      'Corrected to the Q2 2026 disclosure — 3.7 GW contracted and 1.5 GW active at 30 June — then ' +
      'updated to approximately 4.2 GW contracted per the 11 August earnings call. Both steps are in the ledger.',
    sourceUrl: 'https://investors.coreweave.com/news/news-details/2026/CoreWeave-Reports-Strong-Second-Quarter-2026-Results/default.aspx'
  }
];
