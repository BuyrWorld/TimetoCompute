/**
 * The facts behind the models page: when each model came out, what it
 * takes in, how much it can read, and what the API charges.
 *
 * Read 25 October 2026. Every figure names its source and its basis:
 *   provider  the model's maker says so (docs, changelog, newsroom, pricing)
 *   listing   OpenRouter, the largest marketplace reselling model APIs, lists
 *             it — used only where the maker publishes nothing. Its prices
 *             match the maker's exactly where both exist (Claude Opus 5.5,
 *             GPT-6 Astra, Gemini 4 Argon, Grok 4.7) but can run higher
 *             (Gemini 3.8 Flash: $0.825 there, $0.75 from Google). Its date is
 *             the day OpenRouter added the model, not a launch date.
 * A field with no source is left out, and the page says "not published".
 * Notes and the full reading are in docs/models-research-2026-10-25.md.
 */
export const FACTS_ACCESSED = '2026-10-25';

const S = (id, o) => ({ id, accessedAt: FACTS_ACCESSED, publishedAt: o.publishedAt || FACTS_ACCESSED,
  effectiveAt: o.publishedAt || FACTS_ACCESSED, sourceType: 'company-profile', isPrimary: true, ...o });

export const MODELFACT_SOURCES = [
  S('openai-changelog', { title: 'OpenAI API — Changelog', url: 'https://developers.openai.com/api/docs/changelog', publisher: 'OpenAI' }),
  S('openai-pricing', { title: 'OpenAI API — Pricing', url: 'https://developers.openai.com/api/docs/pricing', publisher: 'OpenAI' }),
  S('anthropic-fable-5-1', { title: 'Introducing Claude Mythos and Fable 5.1', url: 'https://www.anthropic.com/news/claude-fable-and-mythos-5-1', publisher: 'Anthropic', publishedAt: '2026-09-15' }),
  S('anthropic-opus-5-5', { title: 'Introducing Claude Opus 5.5', url: 'https://www.anthropic.com/news/claude-opus-5-5', publisher: 'Anthropic', publishedAt: '2026-09-22' }),
  S('anthropic-sonnet-5-5', { title: 'Introducing Claude Sonnet 5.5', url: 'https://www.anthropic.com/news/claude-sonnet-5-5', publisher: 'Anthropic', publishedAt: '2026-09-28' }),
  S('anthropic-haiku-5-5', { title: 'Introducing Claude Haiku 5.5', url: 'https://www.anthropic.com/news/claude-haiku-5-5', publisher: 'Anthropic', publishedAt: '2026-10-07' }),
  S('anthropic-barclays', { title: 'Barclays scales Claude to upgrade operations and improve client experience', url: 'https://www.anthropic.com/news/barclays-scales-claude', publisher: 'Anthropic', publishedAt: '2026-10-01' }),
  S('claude-pricing', { title: 'Claude — Plans and pricing', url: 'https://claude.com/pricing', publisher: 'Anthropic' }),
  S('google-changelog', { title: 'Gemini API — Release notes', url: 'https://ai.google.dev/gemini-api/docs/changelog', publisher: 'Google' }),
  S('google-pricing', { title: 'Gemini API — Pricing', url: 'https://ai.google.dev/gemini-api/docs/pricing', publisher: 'Google' }),
  S('google-argon', { title: 'Gemini 4 Argon: Built to solve your hardest problems', url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon/', publisher: 'Google', publishedAt: '2026-10-13' }),
  S('google-plans', { title: 'Google AI plans', url: 'https://gemini.google/subscriptions/', publisher: 'Google' }),
  S('xai-news', { title: 'xAI — News', url: 'https://x.ai/news', publisher: 'xAI' }),
  S('chatgpt-pricing', { title: 'ChatGPT — Pricing', url: 'https://chatgpt.com/pricing', publisher: 'OpenAI' }),
  S('chatgpt-plus-help', { title: 'What is ChatGPT Plus?', url: 'https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus', publisher: 'OpenAI' }),
  S('mistral-pricing', { title: 'Mistral AI — Pricing', url: 'https://mistral.ai/pricing', publisher: 'Mistral AI' }),
  S('microsoft-365-plans', { title: 'Microsoft 365 with Copilot — plans for individuals', url: 'https://www.microsoft.com/en-us/microsoft-copilot/for-individuals', publisher: 'Microsoft' }),
  S('azure-mai-pricing', { title: 'Microsoft Foundry Models pricing — Microsoft models', url: 'https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/microsoft/', publisher: 'Microsoft' }),
  S('deepseek-v4-pro', { title: 'DeepSeek API news (its release list dates DeepSeek-V4-Pro GA to 13 Aug 2026)', url: 'https://api-docs.deepseek.com/news/news261017', publisher: 'DeepSeek', publishedAt: '2026-10-17' }),
  S('openrouter-models', { title: 'OpenRouter — model list with prices', url: 'https://openrouter.ai/api/v1/models', publisher: 'OpenRouter',
    sourceType: 'marketplace', isPrimary: false }),
  S('appstore', { title: 'Apple App Store — In-App Purchases on each AI app\'s listing', url: 'https://apps.apple.com/us/app/id6448311069', publisher: 'Apple App Store',
    sourceType: 'marketplace', isPrimary: false }),
  S('ecb-fx', { title: 'Euro foreign exchange reference rates', url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html', publisher: 'European Central Bank',
    sourceType: 'official-statistics', isPrimary: false })
];

const P = 'provider', L = 'listing';
/** One API price. `unit` defaults to per million tokens, with in and out. */
const api = (inp, out, src, basis = P, extra = {}) => ({ in: inp, out, src, basis, ...extra });

/** Keyed by the model's display name in data/models.js. */
export const MODEL_FACTS = {
  // ---- OpenAI: dates from the developer changelog, prices from the pricing page
  'GPT-6 Astra': { released: '2026-09-03', basis: P, src: 'openai-changelog', context: 1050000, maxOut: 128000, reasoning: true,
    inputs: ['text', 'image'], api: api(10, 50, 'openai-pricing', P, { note: 'Up to 272K tokens of input' }) },
  'GPT-6.1 Sol': { released: '2026-09-29', basis: P, src: 'openai-changelog', context: 1050000, maxOut: 128000, reasoning: true,
    inputs: ['text', 'image'], api: api(2, 10, 'openai-pricing') },
  'GPT-6 Luna': { released: '2026-09-22', basis: P, src: 'openai-changelog', context: 1050000, maxOut: 128000, reasoning: true,
    inputs: ['text', 'image'], api: api(0.10, 0.50, 'openai-pricing') },
  'GPT-Image-2.5 Sunburst': { released: '2026-09-08', basis: P, src: 'openai-changelog',
    api: api(8, 30, 'openai-pricing', P, { note: 'Per million image tokens' }) },
  'GPT-Live 1': { released: '2026-09-10', basis: P, src: 'openai-changelog', api: { per: 0.05, unit: 'minute', src: 'openai-pricing', basis: P } },

  // ---- Anthropic: dates from each launch post, specs and prices from the models overview
  'Claude Fable 5.1': { released: '2026-09-15', basis: P, src: 'anthropic-fable-5-1', context: 1000000, maxOut: 128000, reasoning: true,
    inputs: ['text', 'image'], api: api(10, 50, 'models-anthropic') },
  'Claude Opus 5.5': { released: '2026-09-22', basis: P, src: 'anthropic-opus-5-5', context: 1000000, maxOut: 128000, reasoning: true,
    inputs: ['text', 'image'], api: api(4, 20, 'models-anthropic') },
  'Claude Sonnet 5.5': { released: '2026-09-28', basis: P, src: 'anthropic-sonnet-5-5', context: 1000000, maxOut: 128000, reasoning: true,
    inputs: ['text', 'image'], api: api(2, 10, 'models-anthropic') },
  'Claude Haiku 5.5': { released: '2026-10-07', basis: P, src: 'anthropic-haiku-5-5', context: 1000000, maxOut: 128000, reasoning: true,
    inputs: ['text', 'image'], api: api(0.10, 0.50, 'models-anthropic', P, { from: true }) },

  // ---- Google: dates from the API release notes (general availability), prices from the pricing page
  'Gemini 4 Argon': { released: '2026-10-13', basis: P, src: 'google-changelog', announced: '2026-09-30', context: 1048576, maxOut: 1000000, reasoning: true,
    api: api(2, 10, 'google-pricing', P, { note: 'Introductory until 30 Nov 2026, then $4 / $20' }) },
  'Gemini 3.8 Flash': { released: '2026-09-02', basis: P, src: 'google-changelog',
    api: api(0.75, 3.75, 'google-pricing', P, { note: 'Until 31 Dec 2026, then $1.50 / $7.50' }) },
  'Nano Banana 2.1': { released: '2026-10-06', basis: P, src: 'google-changelog', api: { per: 0.0336, unit: 'image', note: '1K resolution', src: 'google-pricing', basis: P } },
  'Gemini Omni Flash': { released: '2026-08-27', basis: P, src: 'google-changelog', api: { per: 0.10, unit: 'second', note: '720p video, Google\'s estimate', src: 'google-pricing', basis: P } },
  'Lyria 3.5': { released: '2026-09-03', basis: P, src: 'google-changelog', api: { per: 0.08, unit: 'song', src: 'google-pricing', basis: P } },

  // ---- Meta: the developer site gives no dates or prices, so these are OpenRouter's
  'Muse Wonder': { released: '2026-10-12', basis: L, src: 'openrouter-models', context: 1048576, inputs: ['text', 'image', 'video', 'audio'],
    api: api(4, 20, 'openrouter-models', L) },
  'Muse Spark 1.3': { released: '2026-09-02', basis: L, src: 'openrouter-models', context: 1048576, api: api(1.25, 4.25, 'openrouter-models', L) },
  'Muse Spark Open': { released: '2026-10-15', basis: L, src: 'openrouter-models', context: 1048576, openWeights: true,
    api: api(1.25, 4.25, 'openrouter-models', L) },

  // ---- Microsoft: price from its own Foundry pricing page; no dates published
  'MAI-Thinking-1': { reasoning: true, api: api(2, 8, 'azure-mai-pricing') },

  // ---- xAI: dates from its newsroom, prices and context from the API docs
  'Grok 4.7': { released: '2026-09-22', basis: P, src: 'xai-news', context: 500000, api: api(2, 6, 'models-xai', P, { note: 'Prompts under 200K tokens' }) },
  'Grok Imagine Video 1.5': { released: '2026-08-07', basis: P, src: 'xai-news', api: { per: 0.08, unit: 'second', src: 'models-xai', basis: P } },
  'Grok Voice 3.0': { released: '2026-10-14', basis: P, src: 'xai-news', api: { per: 0.08, unit: 'minute', src: 'models-xai', basis: P } },

  // ---- DeepSeek: dates and open weights from its own release notes; price and context from OpenRouter
  'DeepSeek-V4.1-Flash': { released: '2026-10-17', basis: P, src: 'models-deepseek-v41', openWeights: true, context: 1048576,
    api: api(0.15, 0.60, 'openrouter-models', L) },
  'DeepSeek-V4 Pro': { released: '2026-08-13', basis: P, src: 'deepseek-v4-pro', context: 1048576, api: api(0.66, 1.98, 'openrouter-models', L) },

  // ---- Mistral: open weights from its docs; date, context and price from OpenRouter
  'Mistral Large 4': { released: '2026-10-06', basis: L, src: 'openrouter-models', openWeights: true, context: 1048576,
    api: api(1.36, 4.18, 'openrouter-models', L) },

  // ---- Qwen and NVIDIA: OpenRouter only
  'Qwen3.8-Max': { released: '2026-09-03', basis: L, src: 'openrouter-models', context: 1000000, api: api(2, 6, 'openrouter-models', L) },
  'Qwen3.8-Omni-Flash': { released: '2026-09-21', basis: L, src: 'openrouter-models', context: 1000000, api: api(0.15, 0.47, 'openrouter-models', L) },
  'Nemotron 3.5 Super VL': { released: '2026-10-15', basis: L, src: 'openrouter-models', context: 1048576, openWeights: true,
    api: api(0.15, 0.50, 'openrouter-models', L) }
};

/**
 * Who builds with each provider's models — only what the provider itself
 * says, or what the supply-chain map already quotes from a filing.
 */
export const BUILT_WITH = {
  openai: [{ what: 'ChatGPT', how: 'GPT-6 Luna on every plan; GPT-6 Astra and 6.1 Sol from Plus', src: 'chatgpt-pricing' }],
  anthropic: [
    { what: 'Barclays', how: 'Scaling Claude across its global operations', src: 'anthropic-barclays' },
    { what: 'Claude Code', how: 'Anthropic\'s coding agent, in every paid plan', src: 'claude-pricing' }
  ],
  google: [
    { what: 'Gemini app and AI Mode in Search', how: 'Gemini 4 Argon for AI Pro and Ultra subscribers', src: 'google-argon' },
    { what: 'Wiz', how: 'Using Gemini 4 Argon for its “Scan for Good” security work', src: 'google-argon' },
    { what: 'Isomorphic Labs', how: 'Gemini 4 Argon in drug discovery and design research', src: 'google-argon' },
    { what: 'Gamow Labs', how: 'Gemini 4 Argon to analyse de-identified genomes', src: 'google-argon' },
    { what: 'Apptronik', how: 'A Gemini 4 Argon test on its Apollo humanoid robot', src: 'google-argon' },
    { what: 'Chrome', how: 'Gemini 4 Argon untangling browser feature code', src: 'google-argon' }
  ],
  microsoft: [{ what: 'GitHub Copilot and VS Code', how: 'MAI-Code-1.1-Flash is built in', src: 'models-microsoft' }],
  xai: [
    { what: 'GitHub Copilot', how: 'Grok 4.6 available inside it', src: 'xai-news' },
    { what: 'Cursor and SpaceXSI support', how: 'Customer support rebuilt around Grok Bot', src: 'xai-news' }
  ]
};
