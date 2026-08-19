/**
 * The reference chain — how AI infrastructure is actually built.
 *
 * WHY THIS FILE EXISTS. The map used to draw only what T2C could evidence, and
 * the honest consequence was a workspace with an empty Systems column and three
 * links. That is a true picture of T2C's records and a useless picture of the
 * industry: a reader who wants to understand what depends on what learned
 * nothing, and the emptiness read as a bug rather than as a finding.
 *
 * THE DISTINCTION THAT KEEPS THIS HONEST, and it is the whole design:
 *
 *   A NODE HERE IS A PRODUCT CLASS, NEVER A COMPANY. "Advanced packaging" is a
 *   node. TSMC is an example of who does it. The companies named on a node are
 *   role assertions — "this firm makes this class of thing" — which are publicly
 *   documented and checkable.
 *
 *   AN EDGE HERE JOINS TWO PRODUCT CLASSES, NEVER TWO COMPANIES. "HBM stacks
 *   feed advanced packaging" is a statement about the technology and is true
 *   whoever happens to be doing it this quarter. It asserts nothing about who
 *   sells to whom.
 *
 * That is the line the supplier rules draw, and it is not weakened here:
 *
 *   "Do not infer that a company is a direct supplier merely because it operates
 *    in the same market."
 *
 * Nothing in this file claims a company-to-company relationship. T2C holds
 * exactly one of those — AXT to Lumentum — it lives in data/suppliers.js with
 * its document, and the map still draws it as the only link of its kind.
 *
 * WHAT A READER MUST BE ABLE TO TELL APART, at a glance and in the drawer:
 *
 *   evidenced  T2C holds the record. A named maker, a dated source, a grade.
 *   reference  Industry structure. Example companies, no T2C supplier record,
 *              and the node says so rather than borrowing the other's authority.
 *
 * The `examples` on a reference node are illustrative and explicitly incomplete.
 * They are the firms most commonly documented at that stage; they are not a
 * ranking, not a market share, not exhaustive, and not a claim that any of them
 * supplies any T2C-tracked operator.
 */

/**
 * The two tiers a node can belong to.
 *
 * Kept as data rather than a boolean so the label and the caveat travel with
 * the tier everywhere it is rendered, and a new surface cannot forget them.
 */
export const TIERS = {
  evidenced: {
    id: 'evidenced',
    label: 'T2C record',
    short: 'EVIDENCED',
    definition: 'T2C holds a sourced record for the makers named on this node.'
  },
  reference: {
    id: 'reference',
    label: 'Industry reference',
    short: 'REFERENCE',
    definition:
      'Structure of the chain, with example companies. T2C holds no supplier record here, and ' +
      'naming a company is not a claim that it supplies any tracked operator.'
  }
};

/**
 * The reference nodes.
 *
 * `id` is prefixed `ref-` so it can never collide with an evidenced node, and
 * `supersededBy` lets an evidenced node take a reference node's place when T2C
 * does hold the record — the reference version is then dropped rather than
 * drawn twice.
 *
 * `examples` names companies publicly documented as operating at that stage.
 * `note` is where a stage's real constraint goes, in plain English.
 */
export const REFERENCE_NODES = [
  /* ---------------------------------------------------------------- inputs -- */
  {
    id: 'ref-silicon-wafer', column: 'inputs', pillar: 'hbm-packaging',
    title: 'Silicon wafer',
    examples: ['Shin-Etsu Chemical', 'SUMCO', 'GlobalWafers'],
    simple: 'the polished disc every logic and memory chip is built on',
    technical: 'Prime-grade monocrystalline silicon wafers, mostly 300mm, cut and polished to the ' +
      'flatness leading-edge lithography needs.',
    whyItMatters: 'Called a commodity, supplied by a handful of firms. Leading-edge wafer capacity ' +
      'is booked years ahead and cannot be added quickly.',
    inputs: 'Polysilicon, crystal pulling, precision polishing.',
    outputs: 'Blank wafers for logic, memory and power devices.'
  },
  {
    id: 'ref-hbm-die', column: 'inputs', pillar: 'hbm-packaging',
    title: 'DRAM die',
    examples: ['SK hynix', 'Samsung Electronics', 'Micron Technology'],
    simple: 'the memory chips that get stacked into a high-bandwidth package',
    technical: 'DRAM dies fabricated for stacking, thinned and through-silicon-via drilled before ' +
      'assembly into an HBM cube.',
    whyItMatters: 'Three companies in the world make these at volume. HBM supply, not accelerator ' +
      'wafer supply, has repeatedly been the number that caps shipments.',
    inputs: 'Silicon wafers, DRAM process capacity.',
    outputs: 'Thinned, testable dies ready to stack.'
  },
  {
    id: 'ref-electrical-steel', column: 'inputs', pillar: 'power-cooling',
    title: 'Grain-oriented steel',
    examples: ['Nippon Steel', 'JFE Steel', 'ArcelorMittal'],
    simple: 'the specialised steel a transformer core is wound from',
    technical: 'Grain-oriented electrical steel, rolled so its magnetic domains align and core ' +
      'losses stay low.',
    whyItMatters: 'Transformer lead times are among the longest items on any build, and this is ' +
      'why. A hall with no transformer cannot energise whatever else has arrived.',
    inputs: 'Steel making, precision rolling, annealing.',
    outputs: 'Laminations for transformer and switchgear cores.'
  },
  {
    id: 'ref-copper', column: 'inputs', pillar: 'power-cooling',
    title: 'Refined copper',
    examples: ['Aurubis', 'Mitsui Mining & Smelting', 'Furukawa Electric'],
    simple: 'the metal that carries both power and short-reach data',
    technical: 'Cathode copper and rolled foil, drawn into busbar, winding and high-speed cable.',
    whyItMatters: 'Every watt into the hall and every bit across a rack travels through it. Demand ' +
      'competes directly with grid buildout everywhere else in the economy.',
    inputs: 'Mining, smelting, refining.',
    outputs: 'Busbar, windings, cable, board foil.'
  },

  /* ------------------------------------------------------------ components -- */
  {
    id: 'ref-hbm-stack', column: 'components', pillar: 'hbm-packaging',
    title: 'HBM stack',
    examples: ['SK hynix', 'Samsung Electronics', 'Micron Technology'],
    simple: 'a tower of memory chips bonded into one very fast package',
    technical: 'Eight to twelve DRAM dies stacked on a base die and interconnected by through-silicon ' +
      'vias, presenting a very wide, very short path to the accelerator.',
    whyItMatters: 'An accelerator waiting on memory is expensive idle silicon. Bandwidth per watt ' +
      'from this package sets how much of the compute is usable.',
    inputs: 'DRAM dies, base die, stacking and bonding capacity.',
    outputs: 'A finished memory cube for co-packaging with logic.'
  },
  {
    id: 'ref-advanced-packaging', column: 'components', pillar: 'hbm-packaging',
    title: 'Advanced packaging',
    examples: ['TSMC', 'Amkor Technology', 'ASE Technology'],
    simple: 'bonding the processor and its memory onto one substrate',
    technical: 'Silicon-interposer and substrate-level integration — CoWoS and its equivalents — ' +
      'placing logic and HBM close enough to talk at full bandwidth.',
    whyItMatters: 'Packaging capacity rather than wafer capacity has been the binding accelerator ' +
      'constraint through this cycle. It is slow and expensive to add.',
    inputs: 'Logic dies, HBM stacks, interposers, substrates.',
    outputs: 'A complete accelerator package.'
  },
  {
    id: 'ref-litho-tools', column: 'components', pillar: 'hbm-packaging',
    title: 'Lithography tools',
    examples: ['ASML', 'Applied Materials', 'Tokyo Electron'],
    simple: 'the machines that print the circuits in the first place',
    technical: 'EUV and DUV scanners plus deposition and etch, the capital equipment every ' +
      'leading-edge fab is built around.',
    whyItMatters: 'One company makes EUV. Tool delivery schedules set the ceiling on how fast any ' +
      'new leading-edge capacity can exist at all.',
    inputs: 'Precision optics, lasers, decades of process development.',
    outputs: 'Installed fab capacity.'
  },
  {
    id: 'ref-power-semis', column: 'components', pillar: 'power-cooling',
    title: 'Power semiconductors',
    examples: ['onsemi', 'Infineon Technologies', 'Navitas Semiconductor'],
    simple: 'the devices that step facility power down to what a chip can drink',
    technical: 'Silicon and silicon-carbide switches converting medium-voltage AC to the low-voltage ' +
      'DC a rack distributes.',
    whyItMatters: 'Every conversion loses energy as heat. Efficiency here decides how much compute ' +
      'fits inside a fixed power envelope.',
    inputs: 'Silicon and SiC wafers, packaging.',
    outputs: 'Rack and shelf power conversion.'
  },
  {
    id: 'ref-transformers', column: 'components', pillar: 'power-cooling',
    title: 'Transformers & switchgear',
    examples: ['Eaton', 'Schneider Electric', 'Hitachi Energy'],
    simple: 'the kit that turns grid voltage into hall voltage safely',
    technical: 'Medium-voltage transformers, switchgear and protection between the utility ' +
      'connection and the data hall.',
    whyItMatters: 'The longest-lead item on most builds and the one that most often slips. ' +
      'Announced capacity waits here more than anywhere else.',
    inputs: 'Grain-oriented steel, copper windings, protection electronics.',
    outputs: 'An energisable electrical system.'
  },

  /* --------------------------------------------------------------- systems -- */
  {
    id: 'ref-accelerator', column: 'systems', pillar: null,
    title: 'AI accelerator',
    examples: ['NVIDIA', 'AMD', 'Broadcom (custom silicon)'],
    simple: 'the processor everything else in this chain exists to feed',
    technical: 'GPUs and purpose-built accelerators packaged with HBM, sold as modules or full ' +
      'boards to system integrators.',
    whyItMatters: 'The unit of account for the whole industry. It is also the part most often ' +
      'mistaken for the constraint, when packaging, power and delivery bind first.',
    inputs: 'Advanced packaging, HBM stacks, substrates.',
    outputs: 'Compute modules for rack integration.'
  },
  {
    id: 'ref-switch-silicon', column: 'systems', pillar: 'photonics',
    title: 'Switch silicon',
    examples: ['Broadcom', 'Marvell Technology', 'Cisco Systems'],
    simple: 'the chip inside a switch that moves the traffic',
    technical: 'High-radix switch ASICs — 51.2Tbps and beyond — driving either pluggable optics at ' +
      'the faceplate or a co-packaged optical engine.',
    whyItMatters: 'Where the industry decides whether light stays at the faceplate or moves onto ' +
      'the package. That decision reshapes the optics supply chain.',
    inputs: 'Advanced packaging, leading-edge logic.',
    outputs: 'The switching layer of the fabric.'
  },
  {
    id: 'ref-network-fabric', column: 'systems', pillar: 'photonics',
    title: 'Network fabric',
    examples: ['Arista Networks', 'Cisco Systems', 'NVIDIA (networking)'],
    simple: 'the switches and cabling that make thousands of chips act as one machine',
    technical: 'Ethernet and InfiniBand fabrics, the switches, optics and topology binding ' +
      'accelerators into a single training cluster.',
    whyItMatters: 'A cluster is only as fast as the fabric joining it. Beyond a certain size, ' +
      'moving the data costs more power than the arithmetic.',
    inputs: 'Switch silicon, optics, fibre, copper.',
    outputs: 'A cluster that behaves as one computer.'
  },
  {
    id: 'ref-rack-integration', column: 'systems', pillar: null,
    title: 'Server & rack integration',
    examples: ['Dell Technologies', 'Super Micro Computer', 'Hon Hai (Foxconn)', 'Quanta Computer'],
    simple: 'assembling chips, memory, power and plumbing into a rack that ships',
    technical: 'Rack-scale integration and test — compute trays, power shelves, manifolds and ' +
      'cabling built and burned in before delivery.',
    whyItMatters: 'The point where component shortages become visible as slipped delivery dates, ' +
      'because everything must arrive before anything ships.',
    inputs: 'Accelerators, network fabric, power conversion, cooling.',
    outputs: 'A tested rack, ready to install and energise.'
  },
  {
    /* Three nodes, not one. "Liquid cooled" is used across the sector as though it
       named a single thing; it names three approaches with different costs,
       different retrofit difficulty and different vendors. A reader who sees one
       node cannot tell whether a hall was re-plumbed, re-doored or rebuilt.

       The four example companies here are the four that were on the single node
       before the split, redistributed. None was added: assigning a vendor to a
       cooling type is a factual claim, and the ones kept are the associations
       that define those companies rather than a reading of a current market. */
    id: 'ref-cooling-direct', column: 'systems', pillar: 'power-cooling',
    title: 'Direct-to-chip cooling',
    examples: ['CoolIT Systems', 'Boyd'],
    simple: 'fluid piped to a metal plate sitting on the hot chip',
    technical: 'Cold plates clamped to the processor, fed by manifolds and a coolant distribution ' +
      'unit that keeps the rack loop separate from the facility water.',
    whyItMatters: 'Above roughly 40kW a rack, air stops working. This is the approach most ' +
      'operators reach for first, because the hall keeps its air handling and only the rack changes.',
    inputs: 'Cold plates, pumps, manifolds, coolant distribution units.',
    outputs: 'Heat moved off the processor and into the facility loop.'
  },
  {
    id: 'ref-cooling-immersion', column: 'systems', pillar: 'power-cooling',
    title: 'Immersion cooling',
    examples: ['LiquidStack'],
    simple: 'the whole server sits in a bath of fluid that does not conduct electricity',
    technical: 'Single-phase or two-phase immersion in a dielectric fluid. Servers are built ' +
      'without fans and sealed for the tank.',
    whyItMatters: 'Needs a hall designed around tanks rather than racks, so it is rarely a ' +
      'retrofit. Choosing it is a decision about the building, not about the rack.',
    inputs: 'Dielectric fluid, tanks, servers built for immersion.',
    outputs: 'Thermal headroom without a fan in the server.'
  },
  {
    id: 'ref-cooling-rear-door', column: 'systems', pillar: 'power-cooling',
    title: 'Rear-door heat exchangers',
    examples: ['Vertiv'],
    simple: 'a radiator bolted to the back of the rack',
    technical: 'A water-cooled coil in the rack door, taking heat out of the exhaust air before ' +
      'it reaches the hall.',
    whyItMatters: 'Lets a hall that already exists carry denser racks without re-plumbing the ' +
      'servers inside them.',
    inputs: 'Facility water, door-mounted coils.',
    outputs: 'Exhaust air cooled before it reaches the room.'
  },

  /* -------------------------------------------------------- infrastructure -- */
  {
    id: 'ref-grid', column: 'infrastructure', pillar: 'power-cooling',
    title: 'Grid interconnection',
    examples: ['Vistra', 'Constellation Energy', 'Talen Energy'],
    simple: 'getting the utility to actually deliver the power',
    technical: 'Interconnection agreements, generation contracts and the substation work between ' +
      'the network and the campus.',
    whyItMatters: 'Secured power is not energised power. Queue position and utility schedules ' +
      'govern dates far more than construction does.',
    inputs: 'Generation, transmission capacity, regulatory approval.',
    outputs: 'Energised megawatts at the fence.'
  },
  {
    id: 'ref-construction', column: 'infrastructure', pillar: null,
    title: 'Build & fit-out',
    examples: ['Turner Construction', 'DPR Construction', 'Holder Construction'],
    simple: 'the shell, the halls and everything bolted into them',
    technical: 'Site works, structure, mechanical and electrical fit-out, commissioning and ' +
      'handover of the data hall itself.',
    whyItMatters: 'Concrete is the predictable part. It is the electrical and mechanical fit-out ' +
      'that decides whether a date holds.',
    inputs: 'Land, power, equipment, labour.',
    outputs: 'A commissioned hall waiting for racks.'
  }
];

/**
 * Structural dependencies between product classes.
 *
 * Each entry says "this class of thing feeds that class of thing". It is a claim
 * about how the technology fits together — true whoever is doing it — and it is
 * deliberately NOT a claim that any named company sells to any other. The map
 * draws these differently from the one evidenced company-to-company agreement
 * for exactly that reason.
 *
 * `via` names the mechanism, so a reader can check the reasoning rather than
 * take the arrow on trust.
 */
export const REFERENCE_EDGES = [
  ['ref-silicon-wafer', 'ref-hbm-die', 'DRAM is fabricated on silicon wafers'],
  ['ref-silicon-wafer', 'ref-advanced-packaging', 'interposers and substrates start as silicon'],
  ['ref-silicon-wafer', 'ref-power-semis', 'power devices are fabricated on silicon and SiC'],
  ['ref-hbm-die', 'ref-hbm-stack', 'dies are thinned and stacked into the cube'],
  ['ref-electrical-steel', 'ref-transformers', 'cores are wound from grain-oriented steel'],
  ['ref-copper', 'ref-transformers', 'windings and busbar are copper'],

  ['ref-hbm-stack', 'ref-advanced-packaging', 'the cube is co-packaged with the logic die'],
  ['ref-litho-tools', 'ref-advanced-packaging', 'tools create the capacity packaging consumes'],
  ['ref-advanced-packaging', 'ref-accelerator', 'the packaged part is the accelerator'],
  ['ref-advanced-packaging', 'ref-switch-silicon', 'high-radix switch ASICs are packaged the same way'],
  ['ref-switch-silicon', 'ref-network-fabric', 'the ASIC is the switch'],

  ['ref-accelerator', 'ref-rack-integration', 'accelerators are built into compute trays'],
  ['ref-network-fabric', 'ref-rack-integration', 'fabric is cabled and tested with the rack'],
  ['ref-power-semis', 'ref-rack-integration', 'power shelves convert facility power at the rack'],
  ['ref-cooling-direct', 'ref-rack-integration', 'cold plates and manifolds are fitted in the rack'],
  ['ref-cooling-immersion', 'ref-rack-integration', 'servers are built without fans and sealed for the tank'],
  ['ref-cooling-rear-door', 'ref-rack-integration', 'a heat exchanger is hung on the back of the rack'],

  ['ref-transformers', 'ref-grid', 'the substation is what the interconnection terminates into'],
  ['ref-grid', 'ref-construction', 'a hall is commissioned against delivered power']
];

/**
 * Where the reference chain hands over to what T2C actually tracks.
 *
 * These join a reference product class to the evidenced records already on the
 * map. They remain structural: "tested racks are installed by operators" is true
 * of the industry, and says nothing about which integrator any named operator
 * bought from.
 */
export const REFERENCE_HANDOFFS = [
  { from: 'ref-rack-integration', toColumn: 'infrastructure', via: 'tested racks are installed and energised by operators' },
  { from: 'ref-construction', toColumn: 'infrastructure', via: 'the commissioned hall is the operator\'s site' },
  { from: 'ref-network-fabric', toColumn: 'infrastructure', via: 'the fabric is deployed inside the operator\'s halls' }
];

/**
 * Where evidenced component nodes feed the reference systems column.
 *
 * The optics T2C does track do not stop at the component column in reality —
 * they plug into switches. Drawing that is what closes the gap the empty Systems
 * column used to leave, and it is structural in the same way as everything else
 * here.
 */
export const EVIDENCED_TO_REFERENCE = [
  { fromNodeId: 'interconnect-deployed', to: 'ref-network-fabric', via: 'pluggable optics terminate in switch faceplates' },
  { fromNodeId: 'interconnect-next', to: 'ref-switch-silicon', via: 'co-packaged optics sit on the switch package itself' },
  { fromNodeId: 'interconnect-copper', to: 'ref-rack-integration', via: 'copper carries short-reach links inside the rack' },
  { fromNodeId: 'component-optical-fibre', to: 'ref-network-fabric', via: 'fibre is the medium between switches' }
];

/** A reference node that an evidenced node already covers is not drawn twice. */
export const SUPERSEDED_BY_EVIDENCE = {
  'ref-cw-laser': 'component-cw-laser',
  'ref-optical-fibre': 'component-optical-fibre'
};
