/**
 * The canonical stage list — Milestone 1 of the chain build.
 *
 * Ten stages, atoms to end users. This is the single answer to "where does this
 * sit in the chain", replacing five separate answers: STAGES in src/lib/chain.js,
 * COLUMNS and COMMERCIAL_STAGES in data/chainmap.js, CORRIDORS in
 * src/lib/corridor.js, and the column field on every reference node.
 *
 * ── A STAGE IS A DOMAIN, NOT A POSITION IN A QUEUE ──────────────────────────
 *
 * The obvious reading of "atoms to end users" is that stage numbers increase
 * along every edge. They do not, and building on that assumption would bake in a
 * wrong model. Four edges run backward against it:
 *
 *   ref-power-semis      (5 power)   -> ref-rack-integration (4 compute)
 *   ref-cooling-direct   (6 cooling) -> ref-rack-integration (4 compute)
 *   ref-cooling-immersion(6 cooling) -> ref-rack-integration (4 compute)
 *   ref-cooling-rear-door(6 cooling) -> ref-rack-integration (4 compute)
 *
 * That is not a numbering mistake to fix by renumbering. Power and cooling are
 * not a later step than compute — they are parallel tracks that converge on the
 * rack. A transformer and an accelerator are built by different industries on
 * different lead times and meet at the hall.
 *
 * So: STAGE ANSWERS "WHAT KIND OF THING IS THIS", AND EDGES CARRY THE FLOW. Any
 * layout that needs a left-to-right order derives it from the edges, never from
 * the stage number. `flow` below records the convergence explicitly so a view
 * can lay the chain out without re-deriving it.
 *
 * ── WHAT A STAGE IS NOT ─────────────────────────────────────────────────────
 *
 * Not commercial maturity. `capacity -> qualified -> ordered -> shipping ->
 * accepted -> recognised` describes how far one delivery has progressed and
 * belongs to a record, never to a node. A product class is never "accepted";
 * a specific operator's site is. This is why `accepted` and `revenue` are absent
 * here despite being stages on the homepage today.
 *
 * Not coverage. `sourced | structural | unknown` describes how well T2C knows a
 * link, and is a separate field on the node.
 */

/**
 * The ten stages.
 *
 * `flow` groups stages into the tracks that run in parallel before converging,
 * so a view can lay them out without inferring order from the numbers:
 *   `silicon`  atoms through to a finished rack
 *   `site`     power, cooling and the building, which converge on that rack
 *   `demand`   who runs it, who buys it, what it is used for
 */
export const STAGES = [
  {
    n: 1, id: 'materials', label: 'Raw materials', flow: 'silicon',
    plain: 'the mined and refined stuff everything else is made from',
    scope: 'Substrates, polysilicon, copper, electrical steel, rare earths, helium, ultrapure ' +
      'water, refrigerants and dielectric fluids.'
  },
  {
    n: 2, id: 'processes', label: 'Specialty processes', flow: 'silicon',
    plain: 'turning those materials into finished chips and packages',
    scope: 'Wafer growth and slicing, epitaxy, lithography, etch and deposition, advanced ' +
      'packaging, substrate manufacture, test and burn-in.'
  },
  {
    n: 3, id: 'photonics', label: 'Photonics and interconnect', flow: 'silicon',
    plain: 'moving data between chips, increasingly with light',
    scope: 'Lasers, modulators, drivers, DSPs and retimers, pluggable and co-packaged optics, ' +
      'fibre, copper DAC and AEC, switch silicon.'
  },
  {
    n: 4, id: 'compute', label: 'Compute silicon and systems', flow: 'silicon',
    plain: 'the accelerators, and the racks they are built into',
    scope: 'Accelerators, CPUs, HBM, rack-scale systems and the network fabric that ties them ' +
      'together.'
  },
  {
    n: 5, id: 'power', label: 'Power', flow: 'site',
    plain: 'getting electricity to the building, which is usually the real gate',
    scope: 'Interconnection, transformers and switchgear, power semiconductors, behind-the-meter ' +
      'generation, curtailment and demand response.'
  },
  {
    n: 6, id: 'cooling', label: 'Cooling and thermal', flow: 'site',
    plain: 'taking the heat back out once the power is in',
    scope: 'Air, rear-door heat exchangers, direct-to-chip liquid, immersion, coolant ' +
      'distribution, facility water and heat reuse.'
  },
  {
    n: 7, id: 'facility', label: 'Facility and construction', flow: 'site',
    plain: 'the building itself, and the years it takes to commission',
    scope: 'Land, zoning and permitting, shell and fit-out, construction labour, commissioning ' +
      'and integrated systems testing.'
  },
  {
    n: 8, id: 'operators', label: 'Operators', flow: 'demand',
    plain: 'whoever runs the halls and signs for the power',
    scope: 'Hyperscalers, neoclouds, colocation providers and converted miners. Powered shell ' +
      'and full stack are different businesses and are marked as such.'
  },
  {
    n: 9, id: 'buyers', label: 'Compute buyers', flow: 'demand',
    plain: 'whoever pays for the megawatts',
    scope: 'Frontier labs, hyperscaler internal demand, enterprises, governments. What they ' +
      'contract for, and whose credit stands behind it.'
  },
  {
    n: 10, id: 'applications', label: 'End applications', flow: 'demand',
    plain: 'what the capacity actually gets used for',
    scope: 'Training, inference, fine-tuning, agents, generation and scientific computing. ' +
      'Rarely disclosed per contract, so mostly unknown rather than absent.'
  }
];

export const STAGE_BY_N = Object.fromEntries(STAGES.map(s => [s.n, s]));
export const CHAIN_STAGE_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]));

/**
 * Where each reference node sits.
 *
 * Kept as a map rather than a field on the node so this commit adds a stage
 * without rewriting data/chainreference.js underneath the views that still read
 * its `column` field. The field moves onto the node when the views are
 * refactored; until then both must agree, and a test asserts they do.
 */
export const NODE_STAGE = {
  'ref-silicon-wafer': 1,
  'ref-copper': 1,
  'ref-electrical-steel': 1,

  'ref-hbm-die': 2,
  'ref-hbm-stack': 2,
  'ref-advanced-packaging': 2,
  'ref-litho-tools': 2,

  'ref-switch-silicon': 3,
  'ref-network-fabric': 3,

  'ref-accelerator': 4,
  'ref-rack-integration': 4,

  'ref-power-semis': 5,
  'ref-transformers': 5,
  'ref-grid': 5,

  'ref-cooling-direct': 6,
  'ref-cooling-immersion': 6,
  'ref-cooling-rear-door': 6,

  'ref-construction': 7
};

/**
 * Evidenced nodes are derived from records rather than declared, so they are
 * matched by the prefix their generator uses. `input-` and `component-` are
 * photonics parts today; they take the stage the part belongs to, not the stage
 * the supplier happens to occupy.
 */
const EVIDENCED_PREFIX_STAGE = [
  ['input-', 1],
  ['component-', 3],
  ['interconnect-', 3],
  ['operator-', 8],
  ['customer-', 9]
];

/** The stage a node id belongs to, or null if nothing claims it. */
export function stageOfNode(id) {
  if (Object.prototype.hasOwnProperty.call(NODE_STAGE, id)) return NODE_STAGE[id];
  for (const [prefix, n] of EVIDENCED_PREFIX_STAGE) if (id.startsWith(prefix)) return n;
  return null;
}

/**
 * ── COLUMN IS NOT DERIVABLE FROM STAGE, AND MUST STAY ON THE NODE ───────────
 *
 * This file first tried to express the map's five columns as groups of stages,
 * so that `column` could stop being a fact about a node and become a view over
 * one. It does not work, and the five nodes that break it say why:
 *
 *   ref-transformers    column components, stage 5 power
 *   ref-power-semis     column components, stage 5 power
 *   ref-switch-silicon  column systems,    stage 3 photonics
 *   ref-network-fabric  column systems,    stage 3 photonics
 *   ref-hbm-die         column inputs,     stage 2 processes
 *
 * A transformer is a component by where it sits in the flow and a power thing by
 * what it is. Both are true, and neither is recoverable from the other. This is
 * the same fact as the four backward edges at the top of this file: WHAT KIND OF
 * THING SOMETHING IS and WHERE IT SITS IN THE FLOW are independent axes.
 *
 * So the canonical node carries both — `stage` for the domain, `column` for the
 * flow position — and no mapping between them is attempted. That is not the
 * disagreement this milestone exists to remove: a disagreement is the same fact
 * asserted differently in two files. Two different facts on one node in one file
 * is just a node with two attributes.
 *
 * The homepage's seven stages remain a genuine duplicate, because they assert
 * the same fact as `column` and disagree with it. Those go.
 */
