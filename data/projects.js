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
import { gate, schedule, phase } from './schema.js';

const V = '2026-08-15';

const PROJECT_RECORDS = [
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
    schedules: [
      schedule({
        gate: 'customerAccepted', label: '2026', announcedAt: '2026-03-31',
        sourceIds: ['iren-q3-fy26-results'], confidence: 'confirmed', verifiedAt: '2026-08-15',
        notes: '"Horizon 1-4 on track for delivery by year-end" — a window covering all four tranches, not a date for Horizon 1 alone.'
      })
    ],
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
    schedules: [
      schedule({
        gate: 'customerAccepted', label: '2026', announcedAt: '2026-03-31',
        sourceIds: ['iren-q3-fy26-results'], confidence: 'confirmed', verifiedAt: '2026-08-15',
        notes: '"Horizon 1-4 on track for delivery by year-end."'
      })
    ],
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
    note:
      '102 MW revenue-generating critical IT plus 336 MW additional critical IT under construction ' +
      'across CB-4 and CB-5. CB-3 delivery completed in early July 2026.',
    schedules: [
      schedule({
        gate: 'revenueCommenced', scope: 'CB-4', label: 'H2 2026', announcedAt: '2026-08-11',
        sourceIds: ['wulf-q2-2026-results'], confidence: 'confirmed', verifiedAt: '2026-08-15',
        notes: 'CB-4: "phased delivery and rent commencement expected during the second half of 2026".'
      }),
      schedule({
        gate: 'criticalItEnergised', scope: 'CB-5', label: 'Q1 2027', announcedAt: '2026-08-11',
        sourceIds: ['wulf-q2-2026-results'], confidence: 'confirmed', verifiedAt: '2026-08-15',
        notes: 'CB-5: "targeted to begin phased delivery in early 2027". Recorded as Q1 as the narrowest defensible reading of "early".'
      }),
      schedule({
        gate: 'customerAccepted', scope: 'CB-3', exact: '2026-07-31', label: 'Early July 2026',
        announcedAt: '2026-08-11', sourceIds: ['wulf-q2-2026-results'], confidence: 'confirmed', verifiedAt: '2026-08-15',
        notes: '"Completed delivery of CB-3 in early July" 2026. Already delivered; recorded for the record, not as an outstanding target.'
      })
    ],
    /* PHASED. Two blocks at different stages, which is why the single track read
       as a contradiction: construction IN PROGRESS sat before energised COMPLETE.
       Both were true of different blocks and the record could not say so.

       The split is the source's own, taken from the gate notes that already
       carried it: 102 MW revenue-generating, 336 MW under construction. 102 + 336
       is 438, which is the published site total, so nothing is recomputed.

       CB-4 AND CB-5 ARE ONE PHASE, deliberately. The filing gives 336 MW "across
       CB-4 and CB-5" and does not divide it. Two phases of 168 MW would be an
       invention dressed as a breakdown. They separate when a filing separates
       them, and their differing schedules are already recorded per scope above.

       WHERE CB-3 LANDS IS NOT DISCLOSED. The 102 MW is measured at 30 June 2026;
       CB-3 was delivered in early July, after that date. Whether its capacity is
       inside the 102, inside the 336, or additional to both, the filing does not
       say — so it is recorded as the scoped schedule it is and assigned to
       neither phase. */
    phases: [
      phase({
        id: 'in-service', name: 'Energised capacity',
        capacityMw: 102, powerBasis: 'critical-it', status: 'complete',
        sourceIds: ['wulf-q2-2026-results'],
        note: 'Revenue-generating critical IT as of 30 June 2026.',
        gates: [
          /* utilityEnergised belongs to this phase, not to the site. Grid power
             reaching the campus is what brought THIS block online; the blocks
             still being built will be energised when they are finished. Left
             site-wide it made CB-4 and CB-5 read as energised — a hall under
             construction shown as live, which is the very error the phase split
             exists to remove. */
          gate({ id: 'utilityEnergised', status: 'complete', confidence: 'confirmed', sourceIds: ['wulf-q2-2026-results'], verifiedAt: V }),
          gate({ id: 'criticalItEnergised', status: 'complete', effectiveAt: '2026-06-30', confidence: 'confirmed', sourceIds: ['wulf-q2-2026-results'], verifiedAt: V, notes: '102 MW.' }),
          gate({ id: 'revenueCommenced', status: 'complete', effectiveAt: '2026-06-30', confidence: 'confirmed', sourceIds: ['wulf-q2-2026-results'], verifiedAt: V, notes: 'Explicitly revenue-generating.' })
        ]
      }),
      phase({
        id: 'cb-4-cb-5', name: 'CB-4 and CB-5',
        capacityMw: 336, powerBasis: 'critical-it', status: 'inProgress',
        sourceIds: ['wulf-q2-2026-results'],
        note: 'Additional critical IT under construction. The filing does not divide this between the two buildings.',
        gates: [
          gate({ id: 'constructionStarted', status: 'inProgress', confidence: 'confirmed', sourceIds: ['wulf-q2-2026-results'], verifiedAt: V, notes: '336 MW additional critical IT.' })
        ]
      })
    ],
    /* Site-wide gates only. The customer agreement covers the campus rather than
       any one block, so it belongs here. Everything that differs by block — and
       that includes energisation, which happens block by block — moved to the
       phase it belongs to. */
    gates: [
      gate({ id: 'customerContracted', status: 'complete', confidence: 'confirmed', sourceIds: ['wulf-q2-2026-results'], verifiedAt: V })
    ]
  },
  {
    id: 'wulf-justified', companyId: 'terawulf', name: 'Justified Data Campus (Anthropic)', country: 'US', flag: '🇺🇸',
    /* RETAGGED from `actual` to `target`. The schema defines actual as "a current,
       operating figure as at the stated date" and marks it aggregatable, so 401 MW
       of unbuilt capacity was being summed into the site's current-capacity total.
       Nothing here is energised, construction is not disclosed, and first delivery
       is guided to H2 2027 — this is not a current operating figure.

       `target` understates the firmness: a signed 20-year lease is a contractual
       commitment, not a management intention. But the property that matters is
       whether it counts as capacity that exists today, and it does not. The
       contracted quantity is not lost by this change — it is separately recorded
       as the `wulf-anthropic` contract, which is where a signed 401 MW belongs. */
    capacityMw: 401, powerBasis: 'critical-it', valueStatus: 'target', confidence: 'confirmed',
    sourceIds: ['wulf-anthropic-lease'], asOf: '2026-08-04',
    note:
      'Approximately 401 MW critical IT on a 20-year initial lease, approximately $19bn contracted ' +
      'revenue over the initial term. Initial capacity expected H2 2027, full delivery early 2028.',
    schedules: [
      schedule({
        gate: 'criticalItEnergised', label: 'H2 2027', announcedAt: '2026-08-04',
        sourceIds: ['wulf-anthropic-lease', 'wulf-q2-2026-results'], confidence: 'confirmed', verifiedAt: '2026-08-15',
        notes: '"Initial delivery expected in the second half of 2027".'
      }),
      schedule({
        gate: 'customerAccepted', label: 'H1 2028', announcedAt: '2026-08-04',
        sourceIds: ['wulf-anthropic-lease', 'wulf-q2-2026-results'], confidence: 'confirmed', verifiedAt: '2026-08-15',
        notes: '"Full delivery expected in early 2028". Recorded as H1 2028 — "early" is not a quarter.'
      })
    ],
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
      'Up to 1 GW of contracted electric service via Kentucky Power Company. This is power ' +
      'availability at the utility, not customer-contracted critical IT, and is excluded from ' +
      'contracted-capacity totals.',
    schedules: [
      schedule({
        gate: 'criticalItEnergised', label: 'Q4 2028', announcedAt: '2026-08-11',
        sourceIds: ['wulf-q2-2026-results'], confidence: 'confirmed', verifiedAt: '2026-08-15',
        notes: '"Initial service expected in the fourth quarter of 2028".'
      })
    ],
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
      'Approximately 210 MW operational generation at the Morgantown Generating Station. A further ' +
      'campus scale of up to 1 GW is potential only and is not current critical IT.',
    schedules: [
      schedule({
        gate: 'criticalItEnergised', label: '2030', announcedAt: '2026-08-11',
        sourceIds: ['wulf-q2-2026-results'], confidence: 'confirmed', verifiedAt: '2026-08-15',
        notes: '"Initial data center operations currently contemplated for 2030" — contemplated, not committed, and four years out.'
      })
    ],
    gates: [
      gate({
        id: 'siteControl', status: 'conditional', effectiveAt: '2026-07-29', confidence: 'confirmed',
        sourceIds: ['ferc-ec26-58-morgantown', 'wulf-kentucky-maryland'], verifiedAt: V,
        notes:
          'FERC authorised the acquisition of Morgantown Power LLC on 29 Jul 2026 (Docket EC26-58-000). ' +
          'The order covers the ownership transfer only.'
      }),
      gate({
        id: 'regulatoryApproval', status: 'inProgress', effectiveAt: '2026-07-29', confidence: 'confirmed',
        sourceIds: ['ferc-ec26-58-morgantown'], verifiedAt: V,
        notes:
          'FERC states explicitly that data centre development, new generation, gas infrastructure, ' +
          'battery storage and any change to PJM participation each require separate review. The federal ' +
          'approval obtained is NOT approval to build a data centre.'
      }),
      gate({
        id: 'utilityEnergised', status: 'complete', confidence: 'confirmed',
        sourceIds: ['wulf-kentucky-maryland', 'ferc-ec26-58-morgantown'], verifiedAt: V,
        notes:
          'TeraWulf states approximately 210 MW of operational generation; the FERC order describes four ' +
          'oil-fired units totalling approximately 216 MW. Both figures are recorded as published — the ' +
          'small difference is not reconciled by either document.'
      }),
      gate({ id: 'criticalItEnergised', status: 'notStarted', notes: 'Data centre operations contemplated for 2030.' })
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
    sourceIds: ['keel-investor-deck', 'keel-10q'], asOf: '2026-03-31',
    energisedGrossMw: 60,
    note:
      '350 MW contracted firm power, of which 60 MW is currently energised. The 10-Q states that ' +
      'Panther Creek\'s energised capacity sits under NO energy service agreement and is therefore ' +
      'excluded from the company\'s own secured total — live power is not the same as secured power. ' +
      'The data centre itself is not evidenced as under construction.',
    gates: [
      gate({ id: 'siteControl', status: 'complete', confidence: 'confirmed', sourceIds: ['keel-investor-deck'], verifiedAt: V }),
      gate({ id: 'utilityAgreement', status: 'complete', confidence: 'confirmed', sourceIds: ['keel-investor-deck'], verifiedAt: V, notes: '350 MW contracted firm power.' }),
      gate({
        id: 'zoning', status: 'complete', confidence: 'confirmed', sourceIds: ['keel-q2-2026-results'], verifiedAt: V,
        notes: '"Secured zoning and land development approvals", with land development held conditionally.'
      }),
      gate({
        id: 'environmental', status: 'inProgress', confidence: 'confirmed', sourceIds: ['keel-q2-2026-results'], verifiedAt: V,
        notes: 'Environmental permit applications "progressing well"; the site is described as "nearing full permitting", which is not the same as permitted.'
      }),
      gate({ id: 'constructionStarted', status: 'notStarted', notes: 'No evidence the data centre itself is under construction.' })
    ]
  },
  {
    id: 'keel-scrubgrass', companyId: 'keel', name: 'Scrubgrass, Pennsylvania', country: 'US', flag: '🇺🇸',
    capacityMw: 1300, powerBasis: 'gross-utility', valueStatus: 'potential', confidence: 'reported',
    sourceIds: ['keel-10q'], asOf: '2026-03-31',
    energisedGrossMw: 63,
    note:
      'CORRECTION: previously shown as 1.3 GW of secured capacity. Load studies and behind-the-meter ' +
      'feasibility work are pipeline and potential, not secured power. 63 MW is currently energised, ' +
      'and the 10-Q states this sits under no energy service agreement — so it is excluded from the ' +
      'company\'s own secured total.',
    gates: [
      gate({ id: 'siteControl', status: 'complete', confidence: 'confirmed', sourceIds: ['keel-10q'], verifiedAt: V }),
      gate({
        id: 'interconnection', status: 'complete', confidence: 'confirmed',
        sourceIds: ['keel-10q', 'bitfarms-6k-2026'], verifiedAt: V,
        notes:
          'An executed PJM Interconnection Service Agreement exists for the site — ISA No. 1795, named ' +
          'in Bitfarms\' filings in connection with a 2021 PJM notice of breach over unnotified plant ' +
          'modifications. The interconnection is established; it is the additional load that is under study.'
      }),
      gate({
        id: 'utilityEnergised', status: 'complete', confidence: 'confirmed',
        sourceIds: ['keel-10q'], verifiedAt: V, notes: '63 MW currently energised, outside any energy service agreement.'
      }),
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
      gate({
        id: 'longLeadOrdered', status: 'inProgress', confidence: 'confirmed',
        sourceIds: ['keel-q2-2026-results'], verifiedAt: V,
        notes: 'Accepted delivery of the first Vertiv modules, plus several additional long-lead-time items.'
      }),
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
      'initial term. Under construction, with initial operations anticipated in Q1 2028.',
    schedules: [
      schedule({
        gate: 'criticalItEnergised', label: 'Q1 2028', announcedAt: '2026-08-05',
        sourceIds: ['apld-delta-forge-2'], confidence: 'confirmed', verifiedAt: '2026-08-15',
        notes: '"Initial operations are anticipated to commence in Q1 2028." The release is more precise than the H1 2028 previously recorded here.'
      })
    ],
    gates: [
      gate({ id: 'customerContracted', status: 'complete', effectiveAt: '2026-08-05', confidence: 'confirmed', sourceIds: ['apld-delta-forge-2'], verifiedAt: V }),
      gate({ id: 'constructionStarted', status: 'complete', confidence: 'confirmed', sourceIds: ['apld-delta-forge-2'], verifiedAt: V }),
      gate({ id: 'criticalItEnergised', status: 'notStarted', notes: 'Expected delivery H1 2028.' }),
      gate({ id: 'customerAccepted', status: 'notStarted' })
    ]
  }
];

/**
 * Phase gates are folded back into the flat `gates` array.
 *
 * Twelve places read `project.gates` — the evidence score, the score model, the
 * illustration picker, the validator. A phased site would have gone quiet in all
 * of them at once if its gates had moved out of reach: Lake Mariner would have
 * stopped reporting that it is billing, which is worse than the rendering bug
 * this milestone exists to fix.
 *
 * So `gates` keeps meaning what it has always meant — every gate on this site —
 * and `siteGates` holds the site-wide ones for anything that needs the
 * distinction. The phase a gate belongs to travels on the gate as `phaseId`,
 * which is what the path rebuild in the next milestone reads.
 */
export const PROJECTS = PROJECT_RECORDS.map(p => {
  if (!p.phases || !p.phases.length) return { ...p, siteGates: p.gates || [], phases: [] };
  const phaseGates = p.phases.flatMap(f => (f.gates || []).map(g => ({ ...g, phaseId: f.id })));
  return { ...p, siteGates: p.gates || [], gates: [...(p.gates || []), ...phaseGates] };
});

export const COUNTRY_NAMES = { US: 'United States', CA: 'Canada', ES: 'Spain', AU: 'Australia', FI: 'Finland' };

/**
 * Customer contracts. Dollar values are commitments, never converted to megawatts.
 * `conditional` marks a maximum that depends on events that have not occurred.
 *
 * `projectIds` links a contract to the sites that serve it, and only where the
 * company itself has named the site — in the contract announcement, the campus name
 * the company uses for the customer, or the delivery release. It is null where the
 * disclosure names a customer but no location, because guessing the site would put
 * a fabricated delivery date into every model downstream.
 */
export const CONTRACTS = [
  { id: 'iren-msft', companyId: 'iren', customer: 'Microsoft', mw: 200, basis: 'critical-it', years: 5,
    valueBn: 9.7, deliveredMw: 50, confidence: 'confirmed', sourceIds: ['iren-8k-microsoft', 'iren-horizon1-delivery'],
    projectIds: ['iren-horizon-1', 'iren-horizons-2-4'],
    terms: 'Five-year average term. Horizon 1 (50 MW) delivered and accepted 13 Aug 2026.' },
  { id: 'iren-nvda', companyId: 'iren', customer: 'NVIDIA', mw: 60, basis: 'critical-it', years: 5,
    valueBn: 3.4, deliveredMw: null, confidence: 'confirmed', sourceIds: ['iren-ex991-nvidia'],
    projectIds: null,
    terms: 'Five-year term. IREN has not named the site that will serve this agreement.' },
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
    sourceIds: ['wulf-anthropic-lease'], projectIds: ['wulf-justified'],
    terms:
      '20-year initial lease term. Initial capacity expected H2 2027, full delivery expected early 2028.' },

  { id: 'apld-polaris-1', companyId: 'applied-digital', customer: 'CoreWeave (Polaris Forge 1)', mw: 400,
    basis: 'critical-it', years: 15, valueBn: 11, deliveredMw: null, confidence: 'confirmed',
    sourceIds: ['apld-10k-20260531'], projectIds: ['apld-polaris-1'], terms: '15-year initial term.' },
  { id: 'apld-polaris-2', companyId: 'applied-digital', customer: 'Investment-grade hyperscaler (Polaris Forge 2)',
    mw: 200, basis: 'critical-it', years: 15, valueBn: 5, deliveredMw: null, confidence: 'confirmed',
    sourceIds: ['apld-10k-20260531'], projectIds: ['apld-polaris-2'],
    terms: '15-year initial term. Customer not named by the company.' },
  { id: 'apld-polaris-3', companyId: 'applied-digital', customer: 'High investment-grade hyperscaler (Polaris Forge 3)',
    mw: 300, basis: 'critical-it', years: 15, valueBn: 7.5, deliveredMw: null, confidence: 'confirmed',
    sourceIds: ['apld-10k-20260531'], projectIds: ['apld-polaris-3'],
    terms: '15-year initial term. Customer not named by the company.' },
  { id: 'apld-delta-1', companyId: 'applied-digital', customer: 'High investment-grade hyperscaler (Delta Forge 1)',
    mw: 300, basis: 'critical-it', years: 15, valueBn: 7.5, deliveredMw: null, confidence: 'confirmed',
    sourceIds: ['apld-10k-20260531'], projectIds: ['apld-delta-1'],
    terms: '15-year initial term. Customer not named by the company.' },
  { id: 'apld-delta-2', companyId: 'applied-digital', customer: 'High investment-grade hyperscaler (Delta Forge 2)',
    mw: 210, basis: 'critical-it', years: 15, valueBn: 5.2, deliveredMw: null, confidence: 'confirmed',
    sourceIds: ['apld-delta-forge-2'], projectIds: ['apld-delta-2'],
    terms: '15-year initial term. Under construction, expected delivery H1 2028.' }
];

export const PROJECTS_BY_COMPANY = PROJECTS.reduce((a, p) => { (a[p.companyId] ||= []).push(p); return a; }, {});
export const CONTRACTS_BY_COMPANY = CONTRACTS.reduce((a, c) => { (a[c.companyId] ||= []).push(c); return a; }, {});
