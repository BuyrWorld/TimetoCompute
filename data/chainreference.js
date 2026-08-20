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
 * How well T2C knows a node — the three coverage states.
 *
 * Kept as data rather than a boolean so the label and the caveat travel with the
 * state everywhere it is rendered, and a new surface cannot forget them.
 *
 * This was `TIERS`, with two states named `evidenced` and `reference`. It became
 * `COVERAGE` because a two-state field could only say "T2C holds a record" or
 * "T2C does not", and those two answers were carrying a third meaning between
 * them. A node can be genuinely part of the chain with no supplier record — that
 * is `structural`, and it is a complete and correct node, not a gap. A node whose
 * shape T2C cannot yet confirm is something else again, and had nowhere to live.
 *
 * THE DISTINCTION THAT MATTERS MOST: `structural` is not a failure state. A
 * structural node has a real description and real edges. It is missing a supplier
 * record, and nothing else. Rendering it as an absence, an error or an empty slot
 * would misrepresent the chain — the industry does not stop existing where T2C's
 * records do.
 */
export const COVERAGE = {
  sourced: {
    id: 'sourced',
    label: 'T2C record',
    short: 'SOURCED',
    definition: 'A primary document names the makers on this node, and T2C holds it.'
  },
  structural: {
    id: 'structural',
    label: 'Structural',
    short: 'STRUCTURAL',
    definition:
      'Genuinely part of the chain, with example companies. T2C holds no supplier record here, ' +
      'and naming a company is not a claim that it supplies any tracked operator.'
  },
  unknown: {
    id: 'unknown',
    label: 'Shape unconfirmed',
    short: 'UNKNOWN',
    definition:
      'T2C cannot yet confirm the shape of this link. It is drawn dashed so the uncertainty is ' +
      'visible rather than implied by an empty space.'
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
    id: 'ref-silicon-wafer', stage: 1, column: 'inputs', pillar: 'hbm-packaging',
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
    id: 'ref-hbm-die', stage: 2, column: 'inputs', pillar: 'hbm-packaging',
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
    id: 'ref-electrical-steel', stage: 1, column: 'inputs', pillar: 'power-cooling',
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
    id: 'ref-copper', stage: 1, column: 'inputs', pillar: 'power-cooling',
    title: 'Refined copper',
    examples: ['Aurubis', 'Mitsui Mining & Smelting', 'Furukawa Electric'],
    simple: 'the metal that carries both power and short-reach data',
    technical: 'Cathode copper and rolled foil, drawn into busbar, winding and high-speed cable.',
    whyItMatters: 'Every watt into the hall and every bit across a rack travels through it. Demand ' +
      'competes directly with grid buildout everywhere else in the economy.',
    inputs: 'Mining, smelting, refining.',
    outputs: 'Busbar, windings, cable, board foil.'
  },
  {
    id: 'ref-rare-earths', stage: 1, column: 'inputs', pillar: 'power-cooling',
    title: 'Rare earth magnets',
    examples: [],
    simple: 'the magnets inside anything that spins',
    technical: 'Neodymium and dysprosium alloys drawn into permanent magnets for generator ' +
      'alternators, pump motors and fan drives.',
    whyItMatters: 'Supply is concentrated in few hands, and the demand competes with every other ' +
      'electrified industry at once. It reaches a data centre through the generating plant and ' +
      'the pumps, which is a quieter path than the chips and easy to miss.',
    inputs: 'Mining, separation, alloying.',
    outputs: 'Permanent magnets for motors and alternators.'
  },
  {
    id: 'ref-helium', stage: 1, column: 'inputs', pillar: null,
    title: 'Helium',
    examples: [],
    simple: 'the gas that carries other gases through a growth chamber',
    technical: 'Process-grade helium used as a carrier and purge gas in epitaxial growth and in ' +
      'deposition steps.',
    whyItMatters: 'It is recovered as a by-product of natural gas extraction, so its supply ' +
      'answers to a market that has nothing to do with semiconductors. A shortage upstream of the ' +
      'fab is not a shortage anyone in this chain can fix.',
    inputs: 'Natural gas extraction and separation.',
    outputs: 'Process-grade helium for growth and deposition.'
  },
  {
    id: 'ref-ultrapure-water', stage: 1, column: 'inputs', pillar: null,
    title: 'Ultrapure water',
    examples: [],
    simple: 'water cleaned far past drinking standard, for rinsing wafers',
    technical: 'Water treated to remove ions, organics and particles, used to rinse wafers ' +
      'between lithography, etch and deposition steps.',
    whyItMatters: 'Not the same water as the cooling plant uses, and worth keeping apart from it. ' +
      'This is a fab input measured against contamination limits; facility water is a site input ' +
      'measured against a permit.',
    inputs: 'Municipal or ground water, and a treatment plant.',
    outputs: 'Ultrapure water for wafer rinsing.'
  },
  {
    id: 'ref-dielectric-fluid', stage: 1, column: 'inputs', pillar: 'power-cooling',
    title: 'Dielectric fluid',
    examples: [],
    simple: 'liquid that carries heat but will not carry electricity',
    technical: 'Engineered single-phase and two-phase fluids that servers can be submerged in ' +
      'without shorting.',
    whyItMatters: 'The fluid decides the immersion approach as much as the tank does, and ' +
      'two-phase fluids carry regulatory exposure of their own. It was previously a word inside ' +
      'the immersion node rather than a product with its own supply.',
    inputs: 'Base chemical stock, and qualification testing.',
    outputs: 'A qualified fluid for immersion cooling.'
  },

  /* ------------------------------------------------------------ components -- */
  {
    id: 'ref-hbm-stack', stage: 2, column: 'components', pillar: 'hbm-packaging',
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
    id: 'ref-advanced-packaging', stage: 2, column: 'components', pillar: 'hbm-packaging',
    title: 'Advanced packaging',
    examples: ['TSMC', 'Amkor Technology', 'ASE Technology'],
    simple: 'bonding the processor and its memory onto one substrate',
    technical: 'Silicon-interposer and substrate-level integration — CoWoS and its equivalents — ' +
      'placing logic and HBM close enough to talk at full bandwidth.',
    whyItMatters: 'Packaging capacity rather than wafer capacity has been the binding accelerator ' +
      'constraint through this cycle. It is slow and expensive to add.',
    inputs: 'Logic dies, HBM stacks, interposers, substrates.',
    /* This read "A complete accelerator package", which implied it ships. Test
       and burn-in sits between packaging and a shippable part, and has its own
       capacity — worth being exact about, given packaging is named on this same
       node as the binding constraint. */
    outputs: 'A packaged part, not yet tested.'
  },
  {
    id: 'ref-test-burn-in', stage: 2, column: 'components', pillar: 'hbm-packaging',
    title: 'Test and burn-in',
    examples: [],
    simple: 'running every part hard for hours to find the ones that will fail early',
    technical: 'Automated test cells and burn-in ovens that exercise a packaged part under ' +
      'temperature and voltage before it is allowed to ship.',
    whyItMatters: 'A second capacity pool sitting immediately after the one already named as the ' +
      'accelerator bottleneck. A packaged part is not a shippable part, and the step between them ' +
      'is neither instant nor a formality.',
    inputs: 'Packaged parts, test cells, burn-in ovens.',
    outputs: 'Qualified accelerators and switch ASICs, cleared to ship.'
  },
  {
    id: 'ref-epitaxy', stage: 2, column: 'components', pillar: null,
    title: 'Epitaxy',
    examples: [],
    simple: 'growing the working layers of a chip onto a bare wafer, one atom at a time',
    technical: 'Crystal layers deposited on a substrate before any device is fabricated, by ' +
      'metal-organic vapour phase or molecular beam growth.',
    whyItMatters: 'It sits upstream of two different chains at once. The same step that grows a ' +
      'laser\'s active layers grows the silicon carbide and gallium nitride that power devices ' +
      'are built on, so a constraint here reaches both optics and power.',
    inputs: 'Substrates, process gases, growth reactors.',
    outputs: 'An epitaxial wafer ready for device fabrication.'
  },
  {
    id: 'ref-litho-tools', stage: 2, column: 'components', pillar: 'hbm-packaging',
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
    id: 'ref-power-semis', stage: 5, column: 'components', pillar: 'power-cooling',
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
    id: 'ref-transformers', stage: 5, column: 'components', pillar: 'power-cooling',
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
    id: 'ref-accelerator', stage: 4, column: 'systems', pillar: null,
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
    id: 'ref-switch-silicon', stage: 3, column: 'systems', pillar: 'photonics',
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
    id: 'ref-network-fabric', stage: 3, column: 'systems', pillar: 'photonics',
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
    id: 'ref-optical-modulator', stage: 3, column: 'components', pillar: 'photonics',
    title: 'Optical modulator',
    examples: [],
    simple: 'the part that turns a steady beam of light into data',
    technical: 'A discrete external modulator, typically a Mach-Zehnder built in silicon ' +
      'photonics, imposing a signal on light from a separate continuous-wave source.',
    whyItMatters: 'An EML does this inside the laser package; a co-packaged design does it with ' +
      'a separate modulator beside the switch. Same function, different product, different ' +
      'suppliers — so an architecture shift moves the demand rather than growing it.',
    inputs: 'Continuous-wave laser light, silicon photonics fabrication.',
    outputs: 'A modulated optical signal ready for the fibre.'
  },
  {
    id: 'ref-optical-dsp', stage: 3, column: 'components', pillar: 'photonics',
    title: 'Optical DSP and drivers',
    examples: [],
    simple: 'the chips that clean the signal up at each end of the link',
    technical: 'Digital signal processors, retimers and the analogue driver stages that ' +
      'condition a high-rate signal before it is launched and recover it on arrival.',
    whyItMatters: 'As signalling rates rise this is what keeps a link usable, and it is where a ' +
      'growing share of an optical module\'s cost and power now sits. It has been visible on the ' +
      'site only through the modules it enables, never as a part in its own right.',
    inputs: 'An electrical signal from the switch or host.',
    outputs: 'A signal clean enough to survive the reach it is asked for.'
  },
  {
    id: 'ref-optical-circuit-switch', stage: 3, column: 'systems', pillar: 'photonics',
    title: 'Optical circuit switching',
    examples: [],
    simple: 'steering the light itself instead of reading the packets',
    technical: 'A switch that reconfigures physical light paths between ports, typically with ' +
      'steerable mirrors, without converting the signal to electrical form.',
    whyItMatters: 'A different way to build a fabric, with different economics and a different ' +
      'supplier set from packet switching. It changes topology rather than speed, so comparing it ' +
      'to switch silicon on bandwidth alone misses what it is for.',
    inputs: 'Fibre, steerable switching elements.',
    outputs: 'A reconfigured path between two points in the fabric.'
  },
  {
    id: 'ref-host-cpu', stage: 4, column: 'systems', pillar: null,
    title: 'Host CPU',
    examples: [],
    simple: 'the ordinary processor that runs the machine around the accelerators',
    technical: 'Server-class processors handling orchestration, data movement and storage for ' +
      'the accelerators sharing their tray.',
    whyItMatters: 'A rack shortage gets attributed to the accelerator almost automatically. The ' +
      'host processor is a separate market with separate constraints, and a tray cannot be built ' +
      'without one either.',
    inputs: 'Advanced packaging, silicon wafers.',
    outputs: 'A host processor for the compute tray.'
  },
  {
    id: 'ref-scale-up-fabric', stage: 4, column: 'systems', pillar: null,
    title: 'Scale-up fabric',
    examples: [],
    simple: 'the very fast wiring that makes a rack of chips behave as one chip',
    technical: 'The memory-coherent interconnect joining accelerators inside a tray or pod, ' +
      'distinct from the Ethernet or InfiniBand fabric that joins racks to each other.',
    whyItMatters: 'The network fabric node on this map is scale-out — between racks. This is ' +
      'scale-up, inside them, on different silicon from different vendors. A bottleneck here ' +
      'would be misread as a switch silicon problem.',
    inputs: 'Accelerators, the interconnect silicon that joins them.',
    outputs: 'A pod that behaves as one memory-coherent machine.'
  },
  {
    id: 'ref-rack-integration', stage: 4, column: 'systems', pillar: null,
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
    id: 'ref-cooling-direct', stage: 6, column: 'systems', pillar: 'power-cooling',
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
    id: 'ref-cooling-immersion', stage: 6, column: 'systems', pillar: 'power-cooling',
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
    id: 'ref-cooling-rear-door', stage: 6, column: 'systems', pillar: 'power-cooling',
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
  {
    id: 'ref-air-cooling', stage: 6, column: 'systems', pillar: 'power-cooling',
    title: 'Air cooling',
    examples: [],
    simple: 'moving cold air through the hall, the way data centres always did',
    technical: 'Hall-level air handling — computer-room air conditioning and air handling units, ' +
      'containment, and the raised floor or overhead paths that feed it.',
    whyItMatters: 'The other three cooling nodes are all liquid, which makes liquid look ' +
      'universal. It is not. Deployed fleet capacity and anything below the density threshold is ' +
      'still cooled by air, and a hall built for air is a different building from one built for ' +
      'liquid.',
    inputs: 'Hall air handling units, containment, facility chilled water.',
    outputs: 'Cooled air delivered to the rack face.'
  },
  {
    id: 'ref-cdu', stage: 6, column: 'systems', pillar: 'power-cooling',
    title: 'Coolant distribution units',
    examples: [],
    simple: 'the box that keeps the rack\'s water separate from the building\'s water',
    technical: 'A pumped heat exchanger between the facility loop and the rack loop, holding the ' +
      'rack side at its own temperature, pressure and cleanliness.',
    whyItMatters: 'A manufactured product with its own vendors and its own lead time, and it was ' +
      'previously only a word inside the direct-to-chip node\'s inputs. Its capacity constrains ' +
      'how many racks a loop can carry, separately from the cold plates it feeds.',
    inputs: 'Facility coolant supply, pumps, heat exchangers.',
    outputs: 'Conditioned coolant at the rack manifolds.'
  },
  {
    id: 'ref-heat-rejection-plant', stage: 6, column: 'infrastructure', pillar: 'power-cooling',
    title: 'Heat rejection plant',
    examples: [],
    simple: 'where the heat finally leaves the building',
    technical: 'Chillers, cooling towers, dry coolers and evaporative plant — the facility-side ' +
      'equipment that moves gathered heat to the outside air or to water.',
    whyItMatters: 'Every cooling approach on this map ends at "the facility loop", and until now ' +
      'nothing said what that loop terminates in. It terminates in long-lead equipment that can ' +
      'set a schedule the way a transformer does, and in a water decision that carries its own ' +
      'permitting.',
    inputs: 'Facility coolant loops, refrigerant, water or outside air.',
    outputs: 'Heat rejected to atmosphere, or recovered for reuse.'
  },

  /* -------------------------------------------------------- infrastructure -- */
  {
    /* Queue position used to live inside this node, alongside the agreement and
       the substation work — three things at one maturity, so a reader could not
       tell an early study from an energised connection. It is its own node now,
       and this one narrows to what happens after the study returns. */
    id: 'ref-grid', stage: 5, column: 'infrastructure', pillar: 'power-cooling',
    title: 'Grid interconnection',
    examples: ['Vistra', 'Constellation Energy', 'Talen Energy'],
    simple: 'getting the utility to actually deliver the power',
    technical: 'The interconnection agreement itself, and the substation and protection work ' +
      'between the network and the campus.',
    whyItMatters: 'Secured power is not energised power. Queue position and utility schedules ' +
      'govern dates far more than construction does.',
    inputs: 'A completed queue study, transmission capacity, regulatory approval.',
    outputs: 'Energised megawatts at the fence.'
  },
  {
    id: 'ref-interconnection-queue', stage: 5, column: 'infrastructure', pillar: 'power-cooling',
    title: 'Interconnection queue',
    examples: [],
    simple: 'waiting in line for the utility to study whether the grid can take you',
    technical: 'A request enters the grid operator\'s queue and moves through feasibility, ' +
      'system-impact and facilities studies. Each one names the network upgrades the connection ' +
      'would require.',
    whyItMatters: 'A queue position is not secured power and it is not a date. Two sites ' +
      'announcing the same capacity can be years apart, depending on where they sit in the queue ' +
      'and what their studies come back asking for.',
    inputs: 'A request to the grid operator, and transmission capacity to study.',
    outputs: 'A queue position, and any network upgrade the connection is obliged to fund.'
  },
  {
    id: 'ref-behind-the-meter-generation', stage: 5, column: 'infrastructure', pillar: 'power-cooling',
    title: 'Behind-the-meter generation',
    examples: [],
    simple: 'making the power on site instead of waiting for the grid',
    technical: 'Gas turbines, reciprocating engines or fuel cells sited on the campus, supplying ' +
      'the load directly rather than through the utility connection.',
    whyItMatters: 'This is the route around the queue, and it trades one permitting exposure for ' +
      'another. Air permits and fuel supply replace the interconnection study, and neither is quick.',
    inputs: 'Fuel supply, air and environmental permits, generating plant.',
    outputs: 'Power at the fence without a grid queue position.'
  },
  {
    id: 'ref-demand-response', stage: 5, column: 'infrastructure', pillar: 'power-cooling',
    title: 'Curtailment and demand response',
    examples: [],
    simple: 'agreeing to draw less when the grid is short',
    technical: 'Curtailment clauses inside an interconnection agreement, and enrolment in ' +
      'demand-response programmes that pay a site to cut load when instructed.',
    whyItMatters: 'Interruptible power and firm power are different products. A megawatt a site ' +
      'can be told to give back is not the same as one it may always draw.',
    inputs: 'Grid conditions, and the terms of the connection agreement.',
    outputs: 'A curtailment instruction, and the load reduction that answers it.'
  },
  {
    /* This node used to output "a commissioned hall", which quietly claimed
       commissioning as part of construction. Commissioning is its own gate and
       fails for its own reasons, so it is its own node and this one now ends
       where the fit-out ends. */
    id: 'ref-construction', stage: 7, column: 'infrastructure', pillar: null,
    title: 'Build & fit-out',
    examples: ['Turner Construction', 'DPR Construction', 'Holder Construction'],
    simple: 'the shell, the halls and everything bolted into them',
    technical: 'Site works, structure, and the mechanical and electrical fit-out of the data ' +
      'hall itself.',
    whyItMatters: 'Concrete is the predictable part. It is the electrical and mechanical fit-out ' +
      'that decides whether a date holds.',
    inputs: 'An entitled site, power, equipment, labour.',
    outputs: 'A fitted-out hall, ready for commissioning.'
  },
  {
    id: 'ref-land-permitting', stage: 7, column: 'infrastructure', pillar: null,
    title: 'Land and permitting',
    examples: [],
    simple: 'securing the ground, and the right to build on it',
    technical: 'Site selection, land purchase or option, zoning and rezoning, environmental ' +
      'review, and the public process where objections are heard.',
    whyItMatters: 'Projects stall and die here, before any concrete is poured. It is a schedule ' +
      'risk that construction stops carrying once it has started.',
    inputs: 'A candidate site, local planning law, environmental review.',
    outputs: 'An entitled, permitted parcel that can break ground.'
  },
  {
    id: 'ref-construction-labour', stage: 7, column: 'infrastructure', pillar: null,
    title: 'Construction and fit-out labour',
    examples: [],
    simple: 'the electricians and trades who actually install it',
    technical: 'Licensed electrical and mechanical trades for the fit-out, and the general ' +
      'construction workforce for the shell.',
    whyItMatters: 'A site can have its concrete poured and its equipment delivered and still ' +
      'wait on licensed electricians. Labour is a constraint of its own, separate from materials.',
    inputs: 'Trained trades, and a regional labour market with them free.',
    outputs: 'A hall fitted out and ready to be proved.'
  },
  {
    id: 'ref-commissioning', stage: 7, column: 'infrastructure', pillar: null,
    title: 'Commissioning',
    examples: [],
    simple: 'proving the whole hall works together before anyone trusts it',
    technical: 'Integrated systems testing, where power, cooling and controls are run together ' +
      'under load and checked against the design intent.',
    whyItMatters: 'A separate gate from construction, and it fails for separate reasons. ' +
      'Concrete arriving on time says nothing about whether the systems prove out.',
    inputs: 'A fitted-out hall, and a commissioning agent.',
    outputs: 'An energised, proven hall ready for racks.'
  },

  /* --------------------------------------------------------- monetisation -- */
  /* Buyers. T2C holds evidenced records for five named customers, all of them
     frontier labs, platforms, a reseller and a chipmaker. Those five are not the
     whole demand side, and a reader seeing only them would reasonably conclude
     the market is a handful of mega-buyers. These three name the categories that
     exist without a T2C record behind any of them. */
  {
    id: 'ref-buyer-enterprise', stage: 9, column: 'monetisation', pillar: null,
    title: 'Enterprise buyers',
    examples: [],
    simple: 'ordinary companies buying compute to run models, not to build them',
    technical: 'Businesses contracting for inference capacity to serve vendor or fine-tuned ' +
      'models, usually in smaller and more numerous agreements than a frontier lab signs.',
    whyItMatters: 'Demand looks more concentrated than it is when only the largest buyers are ' +
      'visible. The contract sizes, terms and credit here are a different shape from a ' +
      'hyperscaler\'s, and they move for different reasons.',
    inputs: 'Accepted capacity.',
    outputs: 'Contracted demand, at smaller unit size.'
  },
  {
    id: 'ref-buyer-government', stage: 9, column: 'monetisation', pillar: null,
    title: 'Public-sector buyers',
    examples: [],
    simple: 'governments buying compute, usually for research or sovereignty',
    technical: 'National programmes and public bodies procuring capacity through tender, often ' +
      'tied to scientific computing or to keeping workloads inside a jurisdiction.',
    whyItMatters: 'Procurement runs on public rules and appropriation cycles rather than ' +
      'commercial ones, so both the timing and the credit behave unlike any other buyer here.',
    inputs: 'Accepted capacity, and a public procurement process.',
    outputs: 'Publicly funded contracted demand.'
  },
  {
    id: 'ref-buyer-ai-native', stage: 9, column: 'monetisation', pillar: null,
    title: 'AI-native buyers',
    examples: [],
    simple: 'young companies whose whole business is training or serving a model',
    technical: 'Compute-first companies contracting for training or serving capacity, often on ' +
      'shorter terms and against a funding round rather than a balance sheet.',
    whyItMatters: 'Counterparty credit is the least examined risk in this sector, and it is ' +
      'sharpest here. A contract is only worth what the counterparty can pay for its full term.',
    inputs: 'Accepted capacity, and the funding to commit to it.',
    outputs: 'Contracted demand, carrying the most credit risk on the page.'
  },

  /* Applications. This stage had no node of any tier — the only one on the map
     where even industry structure was absent, while every other unevidenced area
     at least described its shape. Training and inference are the split the
     domain map names twice; the rest is deliberately not modelled yet. */
  {
    id: 'ref-training-workload', stage: 10, column: 'monetisation', pillar: null,
    title: 'Training',
    examples: [],
    simple: 'building a model, which needs a lot of machines held together for a long time',
    technical: 'Large contiguous runs across a tightly coupled cluster, reserved ahead and held ' +
      'at high utilisation for the duration.',
    whyItMatters: 'It is why scale-up fabric and memory bandwidth matter at all — a training run ' +
      'wants one enormous machine rather than many small ones. It buys capacity as a reservation, ' +
      'which is a different commercial shape from serving.',
    inputs: 'A cluster behaving as one machine, held for the run.',
    outputs: 'A trained model.'
  },
  {
    id: 'ref-inference-serving', stage: 10, column: 'monetisation', pillar: null,
    title: 'Inference serving',
    examples: [],
    simple: 'running a finished model for whoever is asking it something',
    technical: 'Latency-sensitive serving of a deployed model, with demand that varies by the ' +
      'hour and capacity often bought on demand rather than reserved.',
    whyItMatters: 'The economics invert against training. Utilisation is variable, the memory and ' +
      'network shape is different, and applying training assumptions to it is one of the errors ' +
      'this site exists to avoid.',
    inputs: 'A deployed model, and capacity available when asked.',
    outputs: 'Served requests.'
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
  /* Packaging no longer points straight at the finished parts. A packaged part
     is not a shippable one until it has been tested and burned in, and routing
     the edges through that step is the whole reason the node exists — leaving
     the direct edges in place would have let a reader skip it. */
  ['ref-advanced-packaging', 'ref-test-burn-in', 'packaged parts are tested and burned in before they ship'],
  ['ref-test-burn-in', 'ref-accelerator', 'only a part that passes test ships as an accelerator'],
  ['ref-test-burn-in', 'ref-switch-silicon', 'high-radix switch ASICs are packaged and tested the same way'],
  ['ref-silicon-wafer', 'ref-epitaxy', 'epitaxial layers are grown on a polished substrate'],
  ['ref-helium', 'ref-epitaxy', 'helium is the carrier gas in the growth chamber'],
  ['ref-ultrapure-water', 'ref-litho-tools', 'wafers are rinsed in ultrapure water between lithography and etch'],
  ['ref-rare-earths', 'ref-behind-the-meter-generation', 'permanent magnets are wound into turbine and generator alternators'],
  ['ref-dielectric-fluid', 'ref-cooling-immersion', 'the fluid the servers are submerged in'],
  ['ref-epitaxy', 'ref-power-semis', 'silicon carbide and gallium nitride devices are grown before they are fabricated'],
  ['ref-switch-silicon', 'ref-network-fabric', 'the ASIC is the switch'],

  ['ref-accelerator', 'ref-rack-integration', 'accelerators are built into compute trays'],
  ['ref-host-cpu', 'ref-rack-integration', 'the host processor is built into the same tray'],
  ['ref-accelerator', 'ref-scale-up-fabric', 'accelerators are wired into a scale-up domain before any traffic reaches a switch'],
  ['ref-scale-up-fabric', 'ref-rack-integration', 'the scale-up fabric is assembled into the same pod'],
  ['ref-test-burn-in', 'ref-host-cpu', 'host processors are packaged and tested the same way'],
  ['ref-optical-modulator', 'ref-switch-silicon', 'a discrete modulator sits in the optical engine beside the switch'],
  ['ref-optical-dsp', 'ref-network-fabric', 'the DSP conditions and recovers the signal at each end of the link'],
  ['ref-optical-circuit-switch', 'ref-network-fabric', 'an alternative topology, steering light instead of switching packets'],
  ['ref-network-fabric', 'ref-rack-integration', 'fabric is cabled and tested with the rack'],
  ['ref-power-semis', 'ref-rack-integration', 'power shelves convert facility power at the rack'],
  ['ref-cooling-direct', 'ref-rack-integration', 'cold plates and manifolds are fitted in the rack'],
  ['ref-air-cooling', 'ref-rack-integration', 'racks below the liquid threshold are still cooled by hall air'],
  ['ref-cdu', 'ref-cooling-direct', 'the unit isolates the rack loop and pumps it to the manifolds'],

  /* Every cooling approach ends at the facility loop, and the facility loop ends
     here. Without this the three liquid nodes and the air node all dead-ended. */
  ['ref-cooling-direct', 'ref-heat-rejection-plant', 'the facility loop carries the heat out to chillers or dry coolers'],
  ['ref-cooling-immersion', 'ref-heat-rejection-plant', 'the tank loop rejects into the same facility plant'],
  ['ref-cooling-rear-door', 'ref-heat-rejection-plant', 'the door coil feeds the same facility loop'],
  ['ref-air-cooling', 'ref-heat-rejection-plant', 'hall air is cooled by the same plant that serves the liquid loops'],
  ['ref-cooling-immersion', 'ref-rack-integration', 'servers are built without fans and sealed for the tank'],
  ['ref-cooling-rear-door', 'ref-rack-integration', 'a heat exchanger is hung on the back of the rack'],

  ['ref-transformers', 'ref-grid', 'the substation is what the interconnection terminates into'],

  /* Power. The queue comes before the agreement, on-site generation goes around
     it, and curtailment is a condition attached to it. */
  ['ref-interconnection-queue', 'ref-grid',
    'a completed study and any network-upgrade obligation come before the agreement is signed'],
  ['ref-behind-the-meter-generation', 'ref-transformers',
    'on-site generation is stepped down and synchronised through the same switchgear as grid power'],
  ['ref-grid', 'ref-demand-response',
    'an interconnection agreement often carries curtailment as a condition of service'],

  /* Facility. Permitting gates the ground, labour does the fit-out, and
     commissioning proves the result against the power delivered.

     The last edge here used to point at construction and read "a hall is
     commissioned against delivered power" — it was describing commissioning
     while pointing at the node before it. Now that commissioning is its own
     node, it points where it always meant to. */
  ['ref-land-permitting', 'ref-construction',
    'a hall cannot break ground before the land is secured and the permits are granted'],
  ['ref-construction-labour', 'ref-construction',
    'licensed trades perform the electrical and mechanical fit-out'],
  ['ref-construction', 'ref-commissioning',
    'the fitted-out hall is proved by integrated systems testing before it is energised'],
  ['ref-grid', 'ref-commissioning', 'a hall is proved against the power actually delivered'],

  /* What each kind of buyer contracts for. Government demand for scientific
     computing is real and is deliberately not drawn: there is no node for it
     yet, and inventing an edge to a node that does not exist would be worse
     than the gap. */
  ['ref-buyer-ai-native', 'ref-training-workload', 'compute-first companies buy capacity to train their own models'],
  ['ref-buyer-government', 'ref-training-workload', 'sovereign and research programmes fund training capacity directly'],
  ['ref-buyer-enterprise', 'ref-inference-serving', 'enterprises mostly buy capacity to run models rather than build them'],
  ['ref-scale-up-fabric', 'ref-training-workload', 'a training run needs the pod to behave as one machine']
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
  { from: 'ref-network-fabric', toColumn: 'infrastructure', via: 'the fabric is deployed inside the operator\'s halls' },
  /* Without this the buyer nodes have nothing pointing at them and sit as
     orphans in the monetisation column. There is no reference node for an
     operator — operators are evidenced records — so the handoff comes from the
     last structural step before capacity is sellable. */
  { from: 'ref-commissioning', toColumn: 'monetisation', via: 'a proven hall is capacity a customer can accept and pay for' }
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
