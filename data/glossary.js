/**
 * Glossary.
 *
 * The pack's rule about technical vocabulary is a writing rule, not a component
 * rule: use one bracketed plain-English translation after a term's FIRST
 * technical use, then make every later occurrence a dotted-underlined trigger.
 * Parentheses after every technical word produce prose nobody can read, which
 * defeats the point of having them.
 *
 * So the bracket lives in the explainer copy (`simple`), and this table is what
 * the triggers open. Terms are matched case-insensitively on `term` and its
 * `aliases`, and a term is only ever linked on its second and later appearances
 * within a page.
 */

const G = (id, o) => ({ id, aliases: [], ...o });

export const GLOSSARY = [
  G('bandwidth', {
    term: 'bandwidth',
    short: 'How much data can move at once.',
    long:
      'The volume of data a link can carry per second. Distinct from latency, which is how long a ' +
      'single message takes to arrive. A cluster can have ample bandwidth and still be slowed by ' +
      'latency, and the reverse.'
  }),
  G('latency', {
    term: 'latency',
    short: 'The delay before data arrives.',
    long:
      'The time between sending data and it being received. In distributed training every ' +
      'accelerator waits for the slowest exchange, so latency compounds across thousands of devices.'
  }),
  G('qualification', {
    term: 'qualification', aliases: ['qualified'],
    short: 'Customer testing, before any production order.',
    long:
      'The process by which a buyer tests a supplier\'s part against its own requirements. Passing ' +
      'qualification means the part is permitted to be bought. It is not an order, not a shipment ' +
      'and not revenue — a distinction this site keeps deliberately.'
  }),
  G('volume-order', {
    term: 'volume order',
    short: 'A production-scale order, once qualification has passed.',
    long:
      'An order at production quantity rather than for samples or evaluation. It is a genuine ' +
      'commercial milestone and still not a shipment: the parts have been ordered, not delivered, ' +
      'and revenue is recognised later again.'
  }),
  G('hbm', {
    term: 'HBM', aliases: ['high-bandwidth memory'],
    short: 'Memory stacked beside the processor to feed it faster.',
    long:
      'High-bandwidth memory: DRAM dies stacked vertically and placed on the same package as the ' +
      'processor. Shortening the distance between memory and compute is what allows an accelerator ' +
      'to be fed quickly enough to stay busy.'
  }),
  G('pam4', {
    term: 'PAM4',
    short: 'A way of packing two bits into one light pulse.',
    long:
      'Four-level pulse-amplitude modulation. Instead of light being simply on or off, four ' +
      'brightness levels each encode two bits, doubling the data rate without doubling the ' +
      'switching speed — at the cost of far tighter tolerance to noise.'
  }),
  G('dsp', {
    term: 'DSP', aliases: ['signal processor', 'optical DSP'],
    short: 'The chip that cleans up the signal at each end.',
    long:
      'A digital signal processor. In an optical module it conditions the electrical signal before ' +
      'transmission and reconstructs it on receipt, correcting the distortion the link introduces. ' +
      'Without it the higher-order modulation formats would not survive the fibre.'
  }),
  G('cpo', {
    term: 'co-packaged optics', aliases: ['CPO'],
    short: 'Optics moved onto the switch chip\'s own package.',
    long:
      'Placing the optical engines on the same package as the switch chip, so electrical signals ' +
      'travel millimetres rather than centimetres. It saves substantial power and makes the optics ' +
      'much harder to service.'
  }),
  G('eml', {
    term: 'EML', aliases: ['electro-absorption modulated laser'],
    short: 'A laser that encodes data onto its own beam.',
    long:
      'An electro-absorption modulated laser: a laser section and an electrically switched absorber ' +
      'built on one chip. Integrating them removes a coupling step and saves power and space.'
  }),
  G('inp', {
    term: 'indium phosphide', aliases: ['InP'],
    short: 'The compound semiconductor optical lasers are grown on.',
    long:
      'A compound of indium and phosphorus. Unlike silicon it emits light efficiently, which makes ' +
      'it the base material for the lasers carrying data inside AI clusters.'
  }),
  G('epitaxy', {
    term: 'epitaxy', aliases: ['epitaxially'],
    short: 'Growing crystal layers on a wafer, one at a time.',
    long:
      'Depositing successive crystalline layers onto a substrate so that each continues the crystal ' +
      'structure beneath it. Laser structures are built this way, layer by layer.'
  }),
  G('interposer', {
    term: 'interposer',
    short: 'The shared base that links chips sitting side by side.',
    long:
      'A silicon layer carrying dense wiring between dies mounted on it. It is what allows an ' +
      'accelerator and its memory stacks to be connected as though they were one chip.'
  }),
  G('critical-it', {
    term: 'critical IT load', aliases: ['critical IT'],
    short: 'The power that actually reaches the computers.',
    long:
      'Power available to IT equipment inside the hall, after conversion, cooling and distribution ' +
      'losses. Always materially smaller than the gross utility figure quoted at the fence, and the ' +
      'reason this site never adds the two.'
  }),
  G('interconnection', {
    term: 'interconnection',
    short: 'Permission and capacity to connect to the grid.',
    long:
      'The process of getting a project connected to the electricity network, including studies and ' +
      'any upgrades the connection requires. It runs on the grid operator\'s timetable rather than ' +
      'the developer\'s, and it is the most common reason announced capacity slips.'
  }),
  G('vcsel', {
    term: 'VCSEL',
    short: 'A laser that emits from the surface of its chip.',
    long:
      'Vertical-cavity surface-emitting laser. It emits perpendicular to the wafer, which makes it ' +
      'cheap to test and array in large numbers, though historically over shorter distances than ' +
      'edge-emitting lasers.'
  }),
  G('revenue-recognition', {
    term: 'revenue recognition',
    short: 'The accounting point at which a sale is recorded.',
    long:
      'When a company may record income in its accounts under the applicable standard. Billing, ' +
      'revenue recognition and cash receipt are three separate events, and this site never assumes ' +
      'one from another.'
  })
];

export const GLOSSARY_BY_ID = Object.fromEntries(GLOSSARY.map(g => [g.id, g]));

/**
 * Every term and alias, longest first.
 *
 * Longest-first matters: "co-packaged optics" must be matched before "optics"
 * would be, and "high-bandwidth memory" before "HBM". Sorting once here means
 * the linker does not have to think about it.
 */
export const GLOSSARY_TERMS = GLOSSARY
  .flatMap(g => [g.term, ...g.aliases].map(t => ({ text: t, id: g.id })))
  .sort((a, b) => b.text.length - a.text.length);
