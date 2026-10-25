/**
 * What the compute is being used for: the current models from each provider.
 *
 * Read from each provider's own model documentation on 25 October 2026. The
 * quoted line is the provider's own description; `uses` is T2C's plain-
 * English summary of what people build with it, written from that line and
 * marked as ours on the page. Where a provider gives no description, `note`
 * says what the page shows and is never rendered as a quotation.
 *
 * Most providers publish no release date on these pages. Where none is given,
 * the page says "listed as current on" the access date instead of inventing
 * one. `chainId` ties a provider to the supply-chain map, so a reader can see
 * whose data centres it has signed for — never which model runs where.
 */
export const MODELS_ACCESSED = '2026-10-25';

const P = (id, o) => ({ id, sourceType: 'company-profile', isPrimary: true, accessedAt: MODELS_ACCESSED,
  publishedAt: MODELS_ACCESSED, effectiveAt: MODELS_ACCESSED, ...o });

/** The provider pages, registered in data/sources.js like every other document. */
export const MODEL_SOURCES = [
  P('models-openai', { title: 'OpenAI API — Models', url: 'https://developers.openai.com/api/docs/models', publisher: 'OpenAI' }),
  P('models-anthropic', { title: 'Claude — Models overview', url: 'https://platform.claude.com/docs/en/about-claude/models/overview', publisher: 'Anthropic' }),
  P('models-google', { title: 'Gemini API — Models', url: 'https://ai.google.dev/gemini-api/docs/models', publisher: 'Google' }),
  P('models-meta', { title: 'Meta AI developer platform — models', url: 'https://dev.meta.ai/', publisher: 'Meta' }),
  P('models-microsoft', { title: 'Microsoft AI — Models', url: 'https://microsoft.ai/models/', publisher: 'Microsoft' }),
  P('models-xai', { title: 'xAI — Models and pricing', url: 'https://docs.x.ai/docs/models', publisher: 'xAI' }),
  P('models-deepseek', { title: 'DeepSeek API — Models and pricing', url: 'https://api-docs.deepseek.com/quick_start/pricing', publisher: 'DeepSeek' }),
  P('models-deepseek-v41', { title: 'DeepSeek-V4.1-Flash-1017 release note', url: 'https://api-docs.deepseek.com/news/news261017',
    publisher: 'DeepSeek', publishedAt: '2026-10-17', effectiveAt: '2026-10-17' }),
  P('models-mistral', { title: 'Mistral AI — Models overview', url: 'https://docs.mistral.ai/getting-started/models/models_overview/', publisher: 'Mistral AI' }),
  P('models-qwen', { title: 'Alibaba Cloud Model Studio — Models', url: 'https://www.alibabacloud.com/help/en/model-studio/models', publisher: 'Alibaba Cloud',
    publishedAt: '2026-10-11', effectiveAt: '2026-10-11' }),
  P('models-nvidia', { title: 'NVIDIA Nemotron', url: 'https://www.nvidia.com/en-us/ai-data-science/foundation-models/nemotron/', publisher: 'NVIDIA' })
];

/** What a model does, for the filter chips. */
export const MODEL_KINDS = {
  frontier: 'Frontier reasoning',
  fast: 'Fast and cheap',
  code: 'Coding and agents',
  image: 'Images',
  video: 'Video',
  voice: 'Voice and audio',
  open: 'Open weights'
};

const M = (name, o) => ({ name, ...o });

export const PROVIDERS = [
  {
    id: 'openai', name: 'OpenAI', chainId: 'openai', sourceId: 'models-openai',
    models: [
      M('GPT-6 Astra', { kind: 'frontier', quote: 'Our most capable model for the most demanding work.',
        uses: ['Hard analysis and research', 'Complex multi-step agents'] }),
      M('GPT-6.1 Sol', { kind: 'frontier', quote: 'Near-Astra performance for complex work at a lower cost.',
        uses: ['Everyday professional work at scale', 'Coding assistants'] }),
      M('GPT-6 Luna', { kind: 'fast', quote: 'Our most efficient model for focused, high-volume tasks.',
        uses: ['Customer support', 'Classification and extraction'] }),
      M('GPT-Image-2.5 Sunburst', { kind: 'image', quote: 'Our most capable model for image generation and editing.',
        uses: ['Marketing and product imagery', 'Photo editing'] }),
      M('GPT-Live 1', { kind: 'voice', quote: 'Our premier model for natural, expressive voice conversations with smooth interruption handling.',
        uses: ['Voice assistants', 'Phone agents'] })
    ]
  },
  {
    id: 'anthropic', name: 'Anthropic', chainId: 'anthropic', sourceId: 'models-anthropic',
    models: [
      M('Claude Fable 5.1', { kind: 'frontier', quote: 'For demanding reasoning and long-horizon agentic work',
        uses: ['Long-running autonomous agents', 'Deep research and analysis'] }),
      M('Claude Opus 5.5', { kind: 'code', quote: 'For long-running agentic coding and knowledge work',
        uses: ['Software engineering agents', 'Knowledge work across documents'] }),
      M('Claude Sonnet 5.5', { kind: 'frontier', quote: 'The best combination of speed and intelligence',
        uses: ['Production chat and assistants', 'Coding at speed'] }),
      M('Claude Haiku 5.5', { kind: 'fast', quote: 'For high-volume, latency-sensitive tasks such as classification, extraction, and routing',
        uses: ['Routing and triage', 'Bulk extraction'] })
    ]
  },
  {
    id: 'google', name: 'Google', chainId: 'google', sourceId: 'models-google',
    models: [
      M('Gemini 4 Argon', { kind: 'frontier', quote: 'Our flagship reasoning model with a unified 1M context window and long decodes up to 1M tokens.',
        uses: ['Reasoning over very long documents', 'Large codebases'] }),
      M('Gemini 3.8 Flash', { kind: 'code', quote: 'Our most intelligent Flash model, engineered for long-horizon software engineering, autonomous agents…',
        uses: ['Coding agents', 'Fast autonomous agents'] }),
      M('Nano Banana 2.1', { kind: 'image', quote: 'High-efficiency image generation and editing model with improved visual quality, typography, and multi-turn consistency.',
        uses: ['Design and typography', 'Iterative image editing'] }),
      M('Gemini Omni Flash', { kind: 'video', quote: 'Fast video generation, editing, keyframe interpolation, and extension with native audio.',
        uses: ['Short-form video', 'Video editing'] }),
      M('Lyria 3.5', { kind: 'voice', quote: 'Our flagship music generation model, optimized for full-length songs with complex structural coherence.',
        uses: ['Music for video and games'] })
    ]
  },
  {
    id: 'meta', name: 'Meta', chainId: 'meta', sourceId: 'models-meta',
    models: [
      M('Muse Wonder', { kind: 'code', quote: 'Frontier coding, long-running agents, and advanced computer use.',
        uses: ['Computer-use agents', 'Coding'] }),
      M('Muse Spark 1.3', { kind: 'code', quote: 'Built for long-horizon coding and agentic work.',
        uses: ['Long coding sessions', 'Agent workflows'] }),
      M('Muse Spark Open', { kind: 'open', quote: 'The most capable US open-weight model to date.',
        uses: ['Self-hosted custom models', 'Fine-tuning on private data'] }),
      M('SAM 3.1', { kind: 'video', quote: 'Detect, segment, and track objects from a text prompt, across image and video.',
        uses: ['Video analytics', 'Photo and video editing tools'] })
    ]
  },
  {
    id: 'microsoft', name: 'Microsoft', chainId: 'microsoft', sourceId: 'models-microsoft',
    models: [
      M('MAI-Thinking-1', { kind: 'frontier', quote: 'Competitive reasoning and top SWE-Bench Pro results at a mid-weight price.',
        uses: ['Reasoning at lower cost', 'Software fixes'] }),
      M('MAI-Code-1.1-Flash', { kind: 'code', quote: 'A lightweight, agentic model built into GitHub Copilot and VS Code.',
        uses: ['In-editor coding help'] }),
      M('MAI-Voice-2.1', { kind: 'voice', quote: 'Holds up across long generations.',
        uses: ['Narration', 'Voice products'] }),
      M('MAI-Image-2.6', { kind: 'image', quote: 'Design-ready images from any text or photo prompt.',
        uses: ['Design assets'] })
    ]
  },
  {
    id: 'xai', name: 'xAI', chainId: null, sourceId: 'models-xai',
    models: [
      M('Grok 4.7', { kind: 'frontier', quote: 'For everything else, including code, use Grok 4.7. It is the most capable model we\'ve built.',
        uses: ['Chat', 'Coding'] }),
      M('Grok Imagine Video 1.5', { kind: 'video', note: 'xAI recommends it for video.', uses: ['Video generation'] }),
      M('Grok Voice 3.0', { kind: 'voice', note: 'Speech-to-speech model in the Grok Voice API.', uses: ['Voice assistants'] })
    ]
  },
  {
    id: 'deepseek', name: 'DeepSeek', chainId: null, sourceId: 'models-deepseek',
    models: [
      M('DeepSeek-V4.1-Flash', { kind: 'code', released: '2026-10-17', sourceId: 'models-deepseek-v41',
        quote: 'Stronger benchmark performance, faster task completion, and shorter outputs.',
        uses: ['Building whole projects end to end', 'Low-cost coding agents'] }),
      M('DeepSeek-V4 Pro', { kind: 'frontier', note: 'Listed as a current API model; DeepSeek gives no description.', uses: ['General reasoning'] })
    ]
  },
  {
    id: 'mistral', name: 'Mistral AI', chainId: null, sourceId: 'models-mistral',
    models: [
      M('Mistral Large 4', { kind: 'open', released: '2026-10', quote: 'A state-of-the-art, open-weight, general-purpose multimodal model.',
        uses: ['Self-hosted assistants', 'European data residency'] }),
      M('Voxtral TTS 3', { kind: 'voice', quote: 'State-of-the-art TTS with zero-shot and professional voice cloning, 9 languages, and streaming.',
        uses: ['Multilingual voice'] }),
      M('OCR 4.1', { kind: 'fast', quote: 'Our latest OCR service with paragraph-level bounding boxes, structural block labels, and block-level confidence scores.',
        uses: ['Reading scanned documents'] })
    ]
  },
  {
    id: 'qwen', name: 'Alibaba Qwen', chainId: null, sourceId: 'models-qwen',
    models: [
      M('Qwen3.8-Max', { kind: 'frontier', note: 'Listed first among Model Studio\'s text and vision models.', uses: ['Chat', 'Image understanding'] }),
      M('Qwen3.8-Omni-Flash', { kind: 'voice', note: 'Model Studio\'s real-time audio and video conversation model.', uses: ['Live voice and video assistants'] })
    ]
  },
  {
    id: 'nvidia', name: 'NVIDIA', chainId: 'nvidia', sourceId: 'models-nvidia',
    models: [
      M('Nemotron 3.5 Super VL', { kind: 'open', quote: 'Combines text and visual understanding to help AI agents extract information from webpages, PDFs, tables, and charts.',
        uses: ['Document agents', 'Reading charts and tables'] })
    ]
  }
];
