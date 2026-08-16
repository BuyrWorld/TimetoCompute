/**
 * Explainer content — the seven chain stages and the six photonics components.
 *
 * One shape for both, because the pack is explicit that a component page is the
 * same template as a stage page rather than six unrelated layouts. A stage has
 * children; a component has a parent. Everything else is identical, which is why
 * one renderer can serve thirteen routes.
 *
 * WRITING RULES, from DATA_AND_TRUST.md and enforced by test/explainers.test.js:
 *
 *   - `simple` is one bracketed plain-English translation, used ONCE, after the
 *     first technical use. Everywhere after that the term becomes a glossary
 *     trigger. Parentheses after every technical word make prose unreadable,
 *     which defeats the purpose of having them at all.
 *   - Nothing here asserts a commercial fact. Capacities, awards, orders and
 *     revenue live in the sourced data and are rendered from it. This file
 *     explains what a thing IS and why it matters — claims that are true
 *     independently of who bought what.
 *   - `bottleneck` says why the stage constrains delivery. It is a general
 *     statement about the technology, never a claim about a named project.
 */

const E = o => ({ kind: 'stage', ...o });
const C = o => ({ kind: 'component', ...o });

/* ============================================================
   Seven chain stages
   ============================================================ */

export const STAGE_EXPLAINERS = [
  E({
    slug: 'materials', stageId: 'materials', order: 1,
    name: 'Materials', title: 'What are the materials?',
    asset: 'materials',
    definition:
      'The mined and refined inputs every component downstream is built from — copper, silicon, ' +
      'rare earths, specialist substrates and structural steel.',
    simple: 'the physical ingredients everything else is made of',
    whyAi:
      'An AI data centre is an enormous quantity of ordinary matter. Before anything computes, ' +
      'somebody has to dig up copper for the busbars, refine silicon for the wafers, and pour ' +
      'concrete for a building that can carry the weight and heat of the racks inside it.',
    howItWorks: [
      'Ore is mined and concentrated close to where it is found.',
      'Refiners purify it to the grade electronics need, which is far higher than construction grade.',
      'Specialist producers grow or cast the substrates that chips and lasers are later built on.',
      'The refined output is sold on to component makers, rarely to the data-centre operator itself.'
    ],
    madeOf: 'Copper, silicon, gallium, indium, rare-earth elements, steel, aluminium and concrete.',
    inputs: 'Ore bodies, energy and refining capacity.',
    outputs: 'Refined metals and electronic-grade substrates.',
    role: 'Miners and refiners sell to component makers.',
    bottleneck:
      'Refining capacity for the specialist substrates is concentrated in very few plants, and new ' +
      'capacity takes years to permit and commission. A shortage here reaches the data centre ' +
      'through several intermediaries, so it shows up late and is hard to attribute.',
    components: []
  }),
  E({
    slug: 'wafers', stageId: 'wafers', order: 2,
    name: 'Wafers', title: 'What are wafers?',
    asset: 'wafer',
    definition:
      'Thin discs of ultra-pure crystalline silicon, onto which the circuits of a processor are ' +
      'printed before the disc is cut into individual chips.',
    simple: 'the discs that chips are printed on and then cut out of',
    whyAi:
      'Every accelerator in an AI cluster begins as a rectangle on a wafer. How many usable ' +
      'rectangles a foundry can print per disc, and how many discs it can start per month, sets a ' +
      'hard ceiling on how many accelerators can exist — one that no amount of demand can lift ' +
      'quickly.',
    howItWorks: [
      'A seed crystal is drawn slowly from molten silicon into a single cylindrical ingot.',
      'The ingot is sliced into wafers and polished to near-atomic flatness.',
      'A foundry prints circuit layers onto the wafer, one mask at a time, in a cleanroom.',
      'The finished wafer is tested and cut into individual dies.'
    ],
    madeOf: 'Electronic-grade silicon, plus the photoresists, gases and masks used to pattern it.',
    inputs: 'Refined silicon and foundry capacity.',
    outputs: 'Patterned wafers, then individual dies.',
    role: 'Foundries sell fabrication capacity to chip designers.',
    bottleneck:
      'Leading-edge foundry capacity is booked years ahead and cannot be added quickly: a new ' +
      'fab is a multi-year, multi-billion project. Allocation, rather than price, decides who gets ' +
      'chips.',
    components: []
  }),
  E({
    slug: 'chips-hbm', stageId: 'chips', order: 3,
    name: 'Chips + HBM', title: 'What are chips and HBM?',
    asset: 'chips-hbm',
    definition:
      'The accelerator die packaged together with high-bandwidth memory — stacks of DRAM mounted ' +
      'beside the processor on the same substrate — and assembled into a finished board.',
    simple: 'the compute engine, with its fast memory bolted alongside it',
    whyAi:
      'An accelerator is only as fast as the data it can be fed. Training a large model moves ' +
      'enormous quantities of numbers between memory and processor, so memory bandwidth, not raw ' +
      'arithmetic, is frequently the real limit. HBM exists to shorten that distance.',
    howItWorks: [
      'DRAM dies are stacked vertically and wired through with vertical connections.',
      'The stacks are placed beside the processor die on a shared interposer.',
      'The assembly is packaged, tested and mounted onto an accelerator board.',
      'Boards are integrated into servers and then into racks.'
    ],
    madeOf: 'Logic dies, stacked DRAM, silicon interposers, substrates and packaging.',
    inputs: 'Tested dies from the foundry and DRAM from the memory makers.',
    outputs: 'Packaged accelerators and finished server boards.',
    role: 'Chip designers and memory makers sell accelerators to server builders.',
    bottleneck:
      'Advanced packaging — the step that puts memory and logic on one substrate — is the industry\'s ' +
      'most quoted constraint. Both packaging capacity and HBM supply have repeatedly been tighter ' +
      'than the logic dies they serve.',
    components: []
  }),
  E({
    slug: 'photonics', stageId: 'photonics', order: 4,
    name: 'Photonics', title: 'What is photonics?',
    asset: 'photonics',
    definition:
      'The use of light rather than electrical current to move information, so that thousands of ' +
      'accelerators spread across a building can behave as one machine.',
    simple: 'it replaces electrical data movement with beams of light',
    whyAi:
      'A frontier model does not fit on one accelerator, so it is split across thousands, and every ' +
      'training step requires them to exchange results. Copper cannot carry that much data far ' +
      'enough without unacceptable loss and heat. AI clusters have become communication systems as ' +
      'much as computing ones, and light is what makes the communication possible.',
    howItWorks: [
      'A laser produces a steady beam of light at a precise wavelength.',
      'A modulator switches that beam on and off billions of times a second, encoding the data.',
      'The light travels down a glass fibre to a switch, losing very little energy on the way.',
      'A receiver at the far end converts the light back into an electrical signal for the next GPU.'
    ],
    madeOf: 'Indium-phosphide substrates, lasers, modulators, optical engines, glass fibre and the ' +
      'signal processors that drive them.',
    inputs: 'Compound-semiconductor substrates, lasers and signal processors.',
    outputs: 'Optical transceivers and the fabric that links accelerators together.',
    role: 'Optics makers sell transceivers to network and server builders.',
    bottleneck:
      'Each generation doubles the data rate while the power budget barely moves, so optics move ' +
      'closer to the switch chip with every step. Laser supply and advanced optical packaging are ' +
      'both narrow, and a cluster cannot be commissioned until its fabric is complete.',
    components: ['inp-substrate', 'cw-laser', 'eml', 'optical-transceiver', 'co-packaged-optics',
      'optical-fibre'],
    /* The one place the editorial raster is permitted, because this is the page
       it depicts. */
    editorialAsset: 'optical-network-signal'
  }),
  E({
    slug: 'ai-factory', stageId: 'factory', order: 5,
    name: 'AI Factory', title: 'What is an AI factory?',
    asset: 'ai-factory',
    definition:
      'The building itself: secured land and power, halls constructed and energised, cooling ' +
      'installed and the computing equipment racked and commissioned.',
    simple: 'the data centre, from empty field to running machines',
    whyAi:
      'This is where announcements meet physics. Securing a grid connection, getting planning ' +
      'consent, building the halls and energising them are separate gates that each take months or ' +
      'years, and a project can stall at any one of them while still being described as "announced ' +
      'capacity".',
    howItWorks: [
      'The operator secures land and a grid connection, which are separate agreements.',
      'Planning, environmental and regulatory approvals are obtained.',
      'The shell is built, then power, cooling and network are installed and commissioned.',
      'Equipment is racked, the fabric is tested, and the hall is handed to a customer.'
    ],
    madeOf: 'Land, grid capacity, transformers and switchgear, cooling plant, halls and racks.',
    inputs: 'Accelerators, optics, power and years of construction.',
    outputs: 'Live, cooled, connected compute capacity.',
    role: 'Operators sell capacity to the companies training and running models.',
    bottleneck:
      'Power is the binding constraint for most projects, and it is a queue rather than a purchase: ' +
      'interconnection studies and utility upgrades run on the grid operator\'s timetable, not the ' +
      'developer\'s. Gross utility power is also always larger than the critical IT load it ' +
      'supports, so the headline megawatt figure overstates usable compute.',
    components: []
  }),
  E({
    slug: 'customer-acceptance', stageId: 'accepted', order: 6,
    name: 'Accepted', title: 'What is customer acceptance?',
    asset: 'accepted',
    definition:
      'The point at which the customer has tested delivered capacity against the contract and ' +
      'formally signed it off.',
    simple: 'the customer has checked it works and agreed to take it',
    whyAi:
      'Acceptance is the moment a construction project becomes a delivered product. Until it ' +
      'happens, capacity that is built, energised and full of equipment is still the operator\'s ' +
      'problem. It is the single most under-reported milestone in this sector, and the one that ' +
      'most reliably separates a project that is working from one that merely looks finished.',
    howItWorks: [
      'The operator declares a tranche of capacity ready for handover.',
      'The customer runs acceptance testing against the criteria written into the contract.',
      'Defects are remedied and re-tested until the criteria are met.',
      'The customer issues formal acceptance for that tranche.'
    ],
    madeOf: 'Contractual acceptance criteria, test results and a signature.',
    inputs: 'Commissioned capacity and a contract that defines "working".',
    outputs: 'Formally accepted capacity, and usually the start of the revenue clock.',
    role: 'The customer signs off; the operator has delivered.',
    bottleneck:
      'Acceptance criteria are commercially sensitive and rarely published, so the gap between ' +
      '"energised" and "accepted" is often invisible from outside. T2C records acceptance only ' +
      'where a company has disclosed it.',
    components: []
  }),
  E({
    slug: 'revenue-recognition', stageId: 'revenue', order: 7,
    name: 'Revenue', title: 'What is revenue recognition?',
    asset: 'revenue',
    definition:
      'The point at which the operator may record income from the capacity — which happens once the ' +
      'contract\'s conditions are met, and which the company must disclose before it can be treated ' +
      'as fact.',
    simple: 'the operator can finally record the money',
    whyAi:
      'This is the end of the chain and the only stage that pays for all the others. It is also the ' +
      'stage most frequently assumed rather than evidenced: a signed contract is read as revenue, ' +
      'and acceptance is read as billing. Neither follows.',
    howItWorks: [
      'Capacity is accepted under the customer agreement.',
      'The contract\'s conditions for billing are met, which may lag acceptance.',
      'The operator begins billing and discloses that it has done so.',
      'Revenue is recognised in the accounts under the applicable standard, which may differ again ' +
        'from both billing and cash receipt.'
    ],
    madeOf: 'A contract, delivered capacity, and an accounting policy.',
    inputs: 'Accepted capacity and satisfied contractual conditions.',
    outputs: 'Disclosed billing, and eventually recognised revenue and cash.',
    role: 'The operator is finally paid for the megawatts.',
    bottleneck:
      'Billing, GAAP recognition and cash receipt are three different events that companies disclose ' +
      'with varying precision, and T2C never assumes one from another. A contract does not imply ' +
      'acceptance, and acceptance does not imply billing.',
    components: []
  })
];

/* ============================================================
   Six photonics components
   ============================================================ */

export const COMPONENT_EXPLAINERS = [
  C({
    slug: 'inp-substrate', parent: 'photonics', order: 1,
    name: 'InP substrate', title: 'What is an indium phosphide substrate?',
    asset: 'inp-substrate',
    definition:
      'A wafer of indium phosphide, a compound semiconductor, on which data-centre lasers are grown.',
    simple: 'the specialist disc that optical lasers are built on',
    whyAi:
      'Silicon cannot efficiently emit light, so the lasers that carry data between racks cannot be ' +
      'made from it. Indium phosphide can, which makes it the starting material for almost every ' +
      'laser in an AI cluster — and a very narrow base for the whole optical layer to rest on.',
    howItWorks: [
      'Indium and phosphorus are combined and grown into a single crystal ingot.',
      'The ingot is sliced into wafers and polished.',
      'Laser structures are grown epitaxially on the wafer surface, layer by layer.',
      'The wafer is cut into individual laser dies.'
    ],
    madeOf: 'Indium and phosphorus, grown as a single crystal.',
    inputs: 'Refined indium, which is produced as a by-product of zinc refining.',
    outputs: 'Polished InP wafers ready for laser epitaxy.',
    bottleneck:
      'Indium is a by-product metal, so its supply responds to zinc demand rather than to optics ' +
      'demand. Very few companies grow InP substrates at data-centre volume and quality.'
  }),
  C({
    slug: 'cw-laser', parent: 'photonics', order: 2,
    name: 'CW laser', title: 'What is a continuous-wave laser?',
    asset: 'cw-laser',
    definition:
      'A laser that emits a steady, unmodulated beam of light at a fixed wavelength, used as the ' +
      'light source that data is later imprinted onto.',
    simple: 'a steady light source, switched into data further down the line',
    whyAi:
      'Separating the light source from the switching lets each be optimised independently, and lets ' +
      'one laser feed several channels. In co-packaged optics the lasers often sit outside the ' +
      'package entirely, where they can be cooled and replaced more easily.',
    howItWorks: [
      'Current is driven through a laser structure grown on an InP wafer.',
      'The structure emits light at a wavelength fixed by its design.',
      'The beam is stabilised in power and wavelength, and held steady.',
      'It is delivered to a modulator, or to several, to be switched into data.'
    ],
    madeOf: 'An InP laser die, a wavelength-selective structure, and thermal control.',
    inputs: 'InP substrates and precision packaging.',
    outputs: 'A stable optical carrier for modulation.',
    bottleneck:
      'Laser output must stay stable across temperature and over years of continuous operation. ' +
      'Yield at the required stability is the practical limit on volume.'
  }),
  C({
    slug: 'eml', parent: 'photonics', order: 3,
    name: 'EML', title: 'What is an EML?',
    asset: 'eml',
    definition:
      'An electro-absorption modulated laser: a laser and a modulator built on the same chip, so ' +
      'that the device both makes the light and encodes data onto it.',
    simple: 'a laser that writes the data onto its own beam',
    whyAi:
      'Integrating the modulator with the laser removes a coupling step, which saves power and space ' +
      '— both scarce inside a transceiver. EMLs are the workhorse light source for high-speed ' +
      'data-centre links.',
    howItWorks: [
      'A laser section generates a continuous beam.',
      'An adjacent absorber section is switched electrically.',
      'When the absorber is on it blocks the beam; when off it passes it.',
      'The result is a stream of light pulses carrying the data.'
    ],
    madeOf: 'An InP die carrying both the laser and the electro-absorption section.',
    inputs: 'InP substrates and high-speed driver electronics.',
    outputs: 'A modulated optical signal ready for a fibre.',
    bottleneck:
      'Each speed generation demands a faster absorber without more power or heat. Fabrication ' +
      'tolerances tighten with every step, and yield falls with them.'
  }),
  C({
    slug: 'optical-transceiver', parent: 'photonics', order: 4,
    name: '1.6T transceiver', title: 'What is an optical transceiver?',
    asset: 'transceiver-1-6t',
    definition:
      'A pluggable module that converts electrical data into light for transmission and back again ' +
      'on receipt. A 1.6T module moves 1.6 terabits per second in each direction.',
    simple: 'the plug that turns electricity into light and back',
    whyAi:
      'Transceivers are how a rack talks to the rest of the cluster. A large training run can be ' +
      'held up by the network as easily as by the accelerators, and a cluster cannot be commissioned ' +
      'until enough modules exist to complete its fabric.',
    howItWorks: [
      'A signal processor conditions the incoming electrical data.',
      'Lasers and modulators convert it into light across several parallel wavelengths.',
      'The combined signal is launched into a fibre pair.',
      'At the far end the process runs in reverse, back to electrical signals.'
    ],
    madeOf: 'Lasers, modulators, a PAM4 signal processor, optics and a pluggable housing.',
    inputs: 'EMLs or CW lasers, DSPs, and precision optical packaging.',
    outputs: 'A completed high-speed link between two switches or servers.',
    bottleneck:
      'Volume ramps for each new generation are slow: qualification by a hyperscale customer takes ' +
      'months, and a qualification is not yet a volume order. Packaging capacity is the usual limit.'
  }),
  C({
    slug: 'co-packaged-optics', parent: 'photonics', order: 5,
    name: 'Co-packaged optics', title: 'What are co-packaged optics?',
    asset: 'cpo',
    definition:
      'An arrangement that moves the optical engines out of a pluggable module and onto the same ' +
      'package as the switch chip, so electrical signals travel millimetres instead of centimetres.',
    simple: 'the optics moved right next to the switch chip, to save power',
    whyAi:
      'At 1.6T and beyond, pushing electrical signals from a switch chip to a faceplate module ' +
      'starts to cost more power than the optics themselves. Shortening that path is one of the few ' +
      'remaining ways to keep switch power growth under control as bandwidth doubles.',
    howItWorks: [
      'Optical engines are mounted on the same substrate as the switch chip.',
      'Light is supplied by external lasers, so the heat source sits outside the package.',
      'Electrical paths shrink from centimetres to millimetres, cutting drive power.',
      'Fibre attaches directly to the package rather than to a faceplate cage.'
    ],
    madeOf: 'A switch chip, optical engines, an external laser source and advanced packaging.',
    inputs: 'CW lasers, switch silicon and co-packaging capacity.',
    outputs: 'A switch with substantially lower interconnect power per bit.',
    bottleneck:
      'Serviceability is the open question: a pluggable module can be swapped in seconds, and a ' +
      'co-packaged engine cannot. Deployment depends on packaging yield and on operators accepting ' +
      'the maintenance trade.'
  }),
  C({
    slug: 'optical-fibre', parent: 'photonics', order: 6,
    name: 'Optical fibre', title: 'What is optical fibre?',
    asset: 'optical-fibre',
    definition:
      'A hair-thin strand of ultra-pure glass that guides light along its length with very little ' +
      'loss, together with the cable and connectors that make it deployable.',
    simple: 'the glass pathway the light actually travels down',
    whyAi:
      'Fibre is what makes the distance affordable. A modern AI campus contains an enormous quantity ' +
      'of it, and how densely it can be routed and connected sets how large a single cluster can ' +
      'physically be.',
    howItWorks: [
      'Ultra-pure glass is drawn into a fibre with a core and a lower-index cladding.',
      'Light entering the core reflects internally and stays inside it.',
      'Fibres are bundled into cables and terminated with precision connectors.',
      'Cables are routed between racks, halls and buildings.'
    ],
    madeOf: 'Ultra-pure silica glass, protective coatings, cable structure and connectors.',
    inputs: 'High-purity glass preforms and drawing capacity.',
    outputs: 'The physical network linking every accelerator in a cluster.',
    bottleneck:
      'The glass itself is rarely the constraint. Connector density, installation labour and the ' +
      'physical routes through a building usually are.'
  })
];

export const EXPLAINERS = [...STAGE_EXPLAINERS, ...COMPONENT_EXPLAINERS];
export const EXPLAINER_BY_SLUG = Object.fromEntries(EXPLAINERS.map(e => [e.slug, e]));
export const STAGE_BY_ID = Object.fromEntries(STAGE_EXPLAINERS.map(e => [e.stageId, e]));

/** Where an explainer lives. Stages hub at /explainers/, components at /what-is/. */
export const explainerHref = e =>
  e.kind === 'stage' ? `/explainers/${e.slug}/` : `/what-is/${e.slug}/`;
