/**
 * Who buys the capacity, and what they build with it.
 *
 * THE LINE THIS FILE MUST NOT CROSS, stated once so it is not re-argued later:
 *
 *   T2C's records say Microsoft contracted 200 MW from IREN. They do NOT say a
 *   single GPT model runs on it. No operator in this dataset has disclosed which
 *   model runs on which megawatt, and no customer has either. The two facts are
 *   sourced separately and must stay separate:
 *
 *     WHO BOUGHT THE CAPACITY — from the operator's filings, already in
 *                               data/projects.js, cited there.
 *     WHAT THEY BUILD         — from the customer's own published model pages,
 *                               cited here.
 *
 *   Putting them side by side is legitimate and is the point of the map. Joining
 *   them into "Claude runs at Lake Mariner" is an invention, so `models` here is
 *   never attributed to a site, a contract or a megawatt figure, and every
 *   surface that renders it repeats the caveat.
 *
 * MODEL FAMILIES, NOT VERSIONS. Frontier versions change monthly; a static site
 * naming "Claude Opus 4.8" is wrong within weeks and looks unmaintained. The
 * family name is the durable fact, and each one links to the developer's own
 * index so a reader gets the current list from the source rather than from us.
 */

/** What the buyer is, which changes what their purchase means. */
export const CUSTOMER_KINDS = {
  'model-developer': {
    label: 'Model developer',
    definition:
      'Trains and operates its own frontier models. Buying capacity to run its own workloads, so ' +
      'demand is tied to its own model roadmap.'
  },
  'platform': {
    label: 'Cloud platform',
    definition:
      'Sells compute to third parties and also publishes models of its own. Demand reflects its ' +
      'customers\' workloads as well as its own.'
  },
  'compute-provider': {
    label: 'Compute provider',
    definition:
      'Resells infrastructure and does not publish frontier models of its own. It is a reseller in ' +
      'this chain, not an end consumer, so its purchase does not identify the workload.'
  },
  'chipmaker': {
    label: 'Chip designer',
    definition:
      'Designs the accelerators the chain is built around, and separately buys capacity of its own. ' +
      'It appears on both sides of this market.'
  },
  'undisclosed': {
    label: 'Not named',
    definition:
      'The operator disclosed the contract but withheld the counterparty, usually describing only its ' +
      'credit quality. Nothing about the workload can be inferred.'
  }
};

const C = (name, o) => ({ name, ...o });

/**
 * Keyed by the exact `customer` string used in data/projects.js, so the map is
 * built by joining on the contract record rather than by re-typing names.
 */
export const CUSTOMERS = [
  C('Anthropic (Justified Data Campus)', {
    id: 'anthropic', display: 'Anthropic', kind: 'model-developer',
    what: 'An AI safety and research company that trains and sells its own frontier models.',
    models: [{
      family: 'Claude',
      note: 'Frontier text and multimodal models, sold directly and through cloud partners.',
      sourceId: 'anthropic-model-index'
    }]
  }),
  C('Microsoft', {
    id: 'microsoft', display: 'Microsoft', kind: 'platform',
    what:
      'Runs Azure, resells frontier models built by others, and publishes model families of its own. ' +
      'Its capacity purchases serve both its own products and its cloud customers.',
    models: [
      {
        family: 'Azure OpenAI models',
        note: 'OpenAI\'s models hosted and operated by Azure, sold under Microsoft\'s own service terms.',
        sourceId: 'msft-azure-openai-models'
      },
      {
        family: 'Phi',
        note: 'Microsoft\'s own open small language models, released under the MIT licence.',
        sourceId: 'msft-phi-models'
      }
    ]
  }),
  C('Meta Platforms', {
    id: 'meta', display: 'Meta Platforms', kind: 'model-developer',
    what: 'Trains its own models, releases the weights openly, and runs them across its own products.',
    models: [{
      family: 'Llama',
      note: 'Open-weight text and multimodal models, published with model cards and downloadable weights.',
      sourceId: 'meta-llama-index'
    }]
  }),
  C('NVIDIA', {
    id: 'nvidia', display: 'NVIDIA', kind: 'chipmaker',
    what:
      'Designs the accelerators nearly everything in this chain runs on, and separately contracts for ' +
      'data-centre capacity of its own.',
    models: [{
      family: 'Nemotron',
      note: 'Open models published with weights and training data, intended for building AI agents.',
      sourceId: 'nvidia-nemotron-models'
    }]
  }),
  C('CoreWeave (Polaris Forge 1)', {
    id: 'coreweave', display: 'CoreWeave', kind: 'compute-provider',
    what:
      'A cloud provider that buys capacity wholesale and resells it as GPU compute. It appears in this ' +
      'dataset as both an operator and a customer.',
    models: [],
    noModelsReason:
      'CoreWeave sells compute rather than models. Its purchase says nothing about which models run on ' +
      'the capacity, because that is decided by its own customers.'
  })
];

export const CUSTOMER_BY_NAME = Object.fromEntries(CUSTOMERS.map(c => [c.name, c]));

/**
 * Contract counterparties the operator declined to name.
 *
 * These are matched by pattern rather than listed, because operators phrase them
 * differently each time ("investment-grade hyperscaler", "high investment-grade
 * hyperscaler"). They are shown as withheld, never guessed at — the credit
 * description is the only thing disclosed and the only thing displayed.
 */
export const UNDISCLOSED_PATTERNS = [
  /hyperscaler/i, /other AI developer/i, /aggregate revenue backlog/i
];

export const isUndisclosedCustomer = name => UNDISCLOSED_PATTERNS.some(re => re.test(name));

/** The caveat, written once so every surface repeats it identically. */
export const MODEL_ATTRIBUTION_CAVEAT =
  'Model families come from each customer\'s own published index. No operator or customer in this ' +
  'dataset has disclosed which model runs on which site, so T2C never attributes a model to a ' +
  'megawatt, a contract or a campus.';
