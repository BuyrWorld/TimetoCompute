/**
 * Chain Mapping — the editorial scaffolding.
 *
 * WHAT IS AUTHORED HERE AND WHAT IS NOT.
 *
 * The five columns, the pillars, the two architecture modes and the interconnect
 * boundary are editorial structure: they describe how an AI deployment is built,
 * which is true independently of who supplies whom. They are authored here.
 *
 * Every FACT about a company — that it makes a component, that it signed an
 * agreement, that it operates a site, that a customer accepted capacity — is
 * derived in src/lib/chainmap.js from the records that already carry it, with
 * the same evidence grades those records already have. Nothing about a company
 * is typed into this file, so the map cannot drift from the ledger.
 *
 * THE ARCHITECTURE RULE, which the pack is emphatic about and which is easy to
 * get subtly wrong: this is NOT copper versus photonics, and photonics is NOT a
 * future technology. Pluggable optics and fibre are deployed today, at scale.
 * What changes in the next architecture is WHERE THE BOUNDARY SITS — the
 * electrical reach gets shorter and the optical engine moves closer to the
 * switch or accelerator. Copper is present in both modes and is never drawn as
 * obsolete.
 */

/** The five semantic columns, left to right. */
export const COLUMNS = [
  {
    id: 'inputs', label: 'Inputs', order: 1,
    definition: 'Raw and refined materials, and the substrates components are grown on.'
  },
  {
    id: 'components', label: 'Components', order: 2,
    definition: 'The finished parts — lasers, modules, memory, packaging — sold to system builders.'
  },
  {
    id: 'systems', label: 'Systems', order: 3,
    definition: 'Accelerators, switches and the fabric that turns components into a machine.'
  },
  {
    id: 'infrastructure', label: 'Infrastructure', order: 4,
    definition: 'The building itself: power secured, halls energised, equipment installed.'
  },
  {
    id: 'monetisation', label: 'Monetisation', order: 5,
    definition: 'A customer accepts the capacity, and the operator is finally paid for it.'
  }
];

export const COLUMN_BY_ID = Object.fromEntries(COLUMNS.map(c => [c.id, c]));

/**
 * Filter pillars.
 *
 * The pack's preview shows three. T2C can evidence one of them. The other two
 * are declared rather than hidden, because a filter bar showing only Photonics
 * would imply T2C had decided the other two do not matter — when the truth is
 * that it holds no sourced supplier record for either.
 */
export const PILLARS = [
  {
    id: 'photonics', label: 'Photonics', tracked: true,
    definition: 'Lasers, modulators, transceivers and fibre — everything that moves data as light.'
  },
  {
    id: 'hbm-packaging', label: 'HBM + Packaging', tracked: false,
    definition: 'Stacked memory and the advanced packaging that puts it beside the processor.',
    needs: 'Supplier, qualification and volume-order records naming a memory maker or a packaging house.'
  },
  {
    id: 'power-cooling', label: 'Power + Cooling', tracked: false,
    definition: 'Grid connection, transformers, switchgear and the cooling plant.',
    needs: 'Equipment supplier records. T2C tracks each site\'s power GATES, but no named transformer, ' +
      'switchgear or cooling supplier sits behind them.'
  }
];

export const PILLAR_BY_ID = Object.fromEntries(PILLARS.map(p => [p.id, p]));

/** Trace modes. Each answers a different question of the same graph. */
export const TRACE_MODES = [
  { id: 'product', label: 'Product', definition: 'Follow one component through everything that depends on it.' },
  { id: 'company', label: 'Company', definition: 'Highlight every position a single company holds.' },
  { id: 'bottleneck', label: 'Bottleneck', definition: 'Emphasise the stages that constrain delivery.' },
  { id: 'project', label: 'Project', definition: 'Follow one named build from its inputs to its billing.' }
];

/**
 * The two architecture modes.
 *
 * `EMERGING` qualifies next architecture because some of it already ships in
 * early deployments — "future" would be wrong, and so would "current".
 */
export const ARCHITECTURES = [
  {
    id: 'deployed', label: 'Deployed today', qualifier: null,
    summary: 'Copper nearby. Pluggable optics and fibre farther out.',
    detail: 'Short electrical links move data inside the package and across the board. Pluggable ' +
      'optical modules and fibre carry the longer, higher-bandwidth reaches between racks and halls.'
  },
  {
    id: 'next', label: 'Next architecture', qualifier: 'Emerging',
    summary: 'Shorter electrical paths. CPO and optical I/O move light closer to the chip.',
    detail: 'The electrical segment shortens and optical engines move onto the switch or accelerator ' +
      'package. Fibre takes more of the distance and bandwidth. Copper still carries the shortest links.'
  }
];

/**
 * The persistent teaching line.
 *
 * Required verbatim by the pack, and it is the sentence that stops the whole
 * feature being read as "copper is dying".
 */
export const BOUNDARY_STATEMENT = 'Copper does not disappear. Light moves closer to the chip.';
export const BOUNDARY_SUPPORT =
  'Copper remains useful for the shortest links. Optics takes more of the distance and bandwidth ' +
  'burden as systems scale.';

/**
 * The interconnect reach ladder — the thing the architecture toggle actually
 * changes. Each band says which medium carries that distance in each mode.
 *
 * This is physics and industry practice, not a claim about any company, which is
 * why it can be authored here without a source per row.
 */
export const REACH_BANDS = [
  {
    id: 'chip', label: 'Chip', distance: 'Millimetres',
    deployed: { medium: 'electrical', text: 'Electrical traces inside the package.' },
    next: { medium: 'electrical', text: 'Still electrical — the shortest links stay copper.' }
  },
  {
    id: 'board', label: 'Board', distance: 'Centimetres',
    deployed: { medium: 'electrical', text: 'Copper traces across the board remain efficient.' },
    next: { medium: 'optical', text: 'An optical engine on the package can take over here.' }
  },
  {
    id: 'rack', label: 'Rack', distance: 'Under 3 metres',
    deployed: { medium: 'mixed', text: 'Direct-attach copper and pluggable optics coexist.' },
    next: { medium: 'optical', text: 'Optical I/O carries more of this reach.' }
  },
  {
    id: 'row', label: 'Row', distance: 'Tens of metres',
    deployed: { medium: 'optical', text: 'Pluggable optical modules over fibre.' },
    next: { medium: 'optical', text: 'Fibre, driven from closer to the silicon.' }
  },
  {
    id: 'building', label: 'Building', distance: 'Hundreds of metres',
    deployed: { medium: 'optical', text: 'Fibre carries the whole distance.' },
    next: { medium: 'optical', text: 'Fibre, unchanged — this reach was always optical.' }
  }
];

/**
 * The interconnect node, which is the one node that genuinely differs between
 * modes. Both halves are real technologies; only the boundary moves.
 *
 * `explainer` points at the component pages built earlier, so a reader who wants
 * the full account leaves the map rather than reading a second, drifting copy.
 */
export const INTERCONNECT = {
  deployed: {
    id: 'interconnect-deployed',
    title: '1.6T pluggable optics',
    slug: 'optical-transceiver',
    maturity: 'deployed',
    simple: 'a removable module that turns electrical data into light',
    technical: 'A pluggable optical transceiver converting electrical signalling to light at the ' +
      'faceplate, over fibre to the next switch.',
    whyItMatters: 'It moves far more data between racks than copper can carry at that distance, ' +
      'and it can be swapped in seconds when one fails.',
    art: 'interconnect-deployed-today'
  },
  next: {
    id: 'interconnect-next',
    title: 'CPO + optical I/O',
    slug: 'co-packaged-optics',
    maturity: 'sampling',
    simple: 'optical engines placed beside the switch or processor itself',
    technical: 'Co-packaged optics and optical I/O place the optical engine on the same package as ' +
      'the switch or accelerator, shortening the electrical path to millimetres.',
    whyItMatters: 'At 1.6T and beyond, driving electrical signals to a faceplate costs more power ' +
      'than the optics. Shortening that path is one of the few remaining ways to hold switch power ' +
      'down as bandwidth doubles.',
    art: 'interconnect-next-architecture'
  },
  /* Copper is a node in BOTH modes. Drawing it only in `deployed` is the single
     easiest way to imply it goes away, which is the misreading the pack exists
     to prevent. */
  copper: {
    id: 'interconnect-copper',
    title: 'Copper + cable',
    maturity: 'deployed',
    simple: 'the short electrical links that never left',
    technical: 'Electrical traces and direct-attach copper carrying the shortest reaches inside the ' +
      'package, across the board and within a rack.',
    whyItMatters: 'Over centimetres, copper is cheaper, simpler and lower-power than any optical ' +
      'alternative. It shortens as bandwidth rises; it does not disappear.'
  }
};

/**
 * The order-to-revenue ladder.
 *
 * Six stages, and the distinctions between them are the whole point of this
 * site: capacity is not an order, an order is not a shipment, acceptance is not
 * recognised revenue. Each definition says what the stage does NOT mean.
 */
export const COMMERCIAL_STAGES = [
  {
    id: 'capacity', order: 1, label: 'Capacity',
    definition: 'Capacity announced or expanded.',
    notYet: 'Nothing has been ordered, and no customer is committed.'
  },
  {
    id: 'qualified', order: 2, label: 'Qualified',
    definition: 'A customer has tested the part and permitted it to be bought.',
    notYet: 'Qualification is permission to order, not an order.'
  },
  {
    id: 'ordered', order: 3, label: 'Ordered',
    definition: 'A volume order has been placed.',
    notYet: 'The parts have been ordered, not delivered.'
  },
  {
    id: 'shipping', order: 4, label: 'Shipping',
    definition: 'Product is shipping to the customer.',
    notYet: 'Shipped is not accepted — the customer has not signed off.'
  },
  {
    id: 'accepted', order: 5, label: 'Accepted',
    definition: 'The customer formally accepted the delivered system.',
    notYet: 'Acceptance normally starts the revenue clock. It is not revenue.'
  },
  {
    id: 'recognised', order: 6, label: 'Recognised',
    definition: 'Revenue is recognised under the contract.',
    notYet: 'Billing, recognition and cash receipt are three separate events.'
  }
];

export const STAGE_BY_ID = Object.fromEntries(COMMERCIAL_STAGES.map(s => [s.id, s]));

/** Relationship classifications, from the pack's data model. */
export const RELATIONSHIPS = {
  direct: { label: 'Direct', rank: 5, line: 'solid', definition: 'A named, dated agreement between two named companies.' },
  reported: { label: 'Reported', rank: 4, line: 'solid', definition: 'Disclosed by one party, read second-hand.' },
  ecosystem: { label: 'Ecosystem', rank: 2, line: 'dotted', definition: 'Operates in this area. No award or order is evidenced.' },
  inferred: { label: 'Inferred', rank: 1, line: 'dashed', definition: 'Derived by T2C from structure, not from a document.' },
  potential: { label: 'Potential', rank: 1, line: 'dashed', definition: 'Plausible exposure only. Nothing is evidenced.' },
  unknown: { label: 'Unknown', rank: 0, line: 'dashed', definition: 'Not classified.' }
};

/** Evidence confidence — deliberately a separate axis from relationship. */
export const CONFIDENCES = {
  high: { label: 'High', rank: 3 },
  medium: { label: 'Medium', rank: 2 },
  low: { label: 'Low', rank: 1 },
  unverified: { label: 'Unverified', rank: 0 }
};

/** Technology maturity — a third separate axis. */
export const MATURITIES = {
  deployed: { label: 'Deployed', rank: 5 },
  shipping: { label: 'Shipping', rank: 4 },
  sampling: { label: 'Sampling', rank: 3 },
  announced: { label: 'Announced', rank: 2 },
  research: { label: 'Research', rank: 1 },
  unknown: { label: 'Unknown', rank: 0 }
};
