# Models page research, read 25 Oct 2026

Primary sources only (the provider's own docs, changelog, newsroom or plan page).
"—" means the provider does not state it. Prices in the currency the provider showed.

## OpenAI
Sources: developers.openai.com/api/docs/models, /api/docs/pricing, /api/docs/changelog; chatgpt.com/pricing (rendered, UK: GBP); help.openai.com "What is ChatGPT Plus?"

| Model | Released (changelog) | Context / max out | Reasoning | API in / out per 1M |
|---|---|---|---|---|
| GPT-6 Astra | 3 Sep 2026 | 1.05M / 128K | yes (low–max) | $10 / $50 (≤272K input) |
| GPT-6.1 Sol | 29 Sep 2026 | 1.05M / 128K | yes | $2 / $10 |
| GPT-6 Luna | 22 Sep 2026 | 1.05M / 128K | yes (incl. none) | $0.10 / $0.50 |
| GPT-Image-2.5 Sunburst / Flare | 8 Sep 2026 | — | — | image in $8, out $30; text in $5 |
| GPT-Live 1 | 10 Sep 2026 | — | — | $0.05 / min |
| GPT-Realtime-2.1 (+ Mini) | 6 Jul 2026 | — | reasoning, tools | audio $32/$64; mini $10/$20 |
| GPT-Transcribe | 28 Jul 2026 | — | — | $0.0045 / min |
All latest: text + image in, text out. Knowledge cutoff Astra/Sol 30 Apr 2026, Luna 18 May 2026.

Plans (chatgpt.com/pricing, shown in GBP to a UK visitor): Free £0, Go £7/mo, Plus £20/mo, Pro from £89/mo (3 usage tiers).
USD: Plus $20/mo (help centre); Pro "from $100" (page markup). Go USD not seen.
Plan access: Luna on Free and Go; Sol, 6.1 Sol and Astra from Plus; "Pro reasoning powered by GPT-6 Astra" on Pro.

## Anthropic
Sources: platform.claude.com models overview; claude.com/pricing; anthropic.com/news

| Model | Released (newsroom) | Context / max out | Thinking | API in / out per 1M |
|---|---|---|---|---|
| Claude Fable 5.1 | 15 Sep 2026 | 1M / 128K | adaptive, always on | $10 / $50 |
| Claude Opus 5.5 | 22 Sep 2026 | 1M / 128K | adaptive, always on | $4 / $20 |
| Claude Sonnet 5.5 | 28 Sep 2026 | 1M / 128K | adaptive | $2 / $10 |
| Claude Haiku 5.5 | 7 Oct 2026 | 1M / 128K | adaptive | from $0.10 / $0.50 |
All: text + image in, text out, tools. Knowledge cutoff Jun 2026.

Plans (USD): Free $0 (Sonnet, Haiku); Pro $20/mo or $17/mo annual (adds Opus; Fable via usage credits; Claude Code);
Max from $100/mo (5x and 20x; Fable at 50% of weekly limits); Team Standard $25/seat ($20 annual), Team Premium $125/seat ($100 annual); Enterprise usage at API rates.

## Google
Sources: ai.google.dev/gemini-api/docs/models, /pricing, /changelog; gemini.google/subscriptions (GBP only); blog.google Gemini 4 Argon post

| Model | Released (changelog, GA) | Notes | API in / out per 1M |
|---|---|---|---|
| Gemini 4 Argon | 13 Oct 2026 GA (announced 30 Sep) | 1M unified context, decodes to 1M | $2 / $10 to 30 Nov 2026, then $4 / $20 |
| Gemini 3.8 Flash | 2 Sep 2026 | | $0.75 / $3.75 to 31 Dec 2026, then $1.50 / $7.50 |
| Gemini 3.8 Live (+ Extended Thinking) | 15 Sep 2026 | voice agents | text $0.75 / $4.50; audio $3 / $12 |
| Gemini 3.8 Flash TTS | 22 Sep 2026 | | text in $0.50, audio out $9 (to 31 Dec) |
| Gemini 3.5 Flash-Lite | 21 Jul 2026 | | $0.30 / $2.50 |
| Nano Banana 2.1 | 6 Oct 2026 | images | $0.0336 per 1K image |
| Gemini Omni Flash | 27 Aug 2026 | video | ~$0.10 per second of 720p |
| Lyria 3.5 | 3 Sep 2026 | music | $0.08 per song |
Modalities, cutoffs and per-model limits mostly not stated.

Plans (GBP): Free £0; AI Plus £4.49/mo; AI Pro £18.99/mo (Gemini 4 Argon, Deep Research, 1M context); AI Ultra from £79.99/mo (£189.99 tier). USD not shown for consumer plans.

## xAI (posts now signed "SpaceXSI")
Sources: docs.x.ai/docs/models (prices); x.ai/news (rendered; dates)

| Model | Released | Context | API in / out per 1M |
|---|---|---|---|
| Grok 4.7 | 22 Sep 2026 | 500K | $2 / $6 (<200K prompt) |
| Grok 4.6 | 14 Aug 2026 | 500K | $2 / $6 |
| Grok Imagine Image 2.0 | 11 Aug 2026 | — | $0.04 / image |
| Grok Imagine Video 1.5 | 7 Aug 2026 | — | $0.08 / sec |
| Grok Voice 3.0 | 14 Oct 2026 | — | $0.08 / min |
Grok 4.7 knowledge cutoff May 2026. Plans: SuperGrok named, price not rendered.

## DeepSeek
DeepSeek-V4.1-Flash-1017 released 17 Oct 2026, open weights (Hugging Face, ModelScope); DeepSeek-V4-Pro GA 13 Aug 2026. Prices and context not stated on the pages read.

## Mistral AI
Models page gives version strings (e.g. Mistral Large 4 v26.10, Medium 3.5 v26.04, Small 4 v26.03) and licences, not dates or prices.
Le Chat: Free; Pro $14.99/mo (incl. $15/mo API credits); students $5.99/mo; Team $24.99/user/mo; Enterprise on request.

## Alibaba Qwen
Model Studio lists qwen3.8-max, qwen3.7-plus, qwen3.8-flash, qwen3.8-omni-flash, qwen-image-3.0-pro; no specs, dates or prices on the page read.

## Meta
dev.meta.ai lists Muse Wonder, Muse Wonder Full, Muse Spark 1.3, Muse Spark Open (open weights), Muse Image, Muse Glimmer, SAM 3.1. No dates or prices on the page.

## Microsoft AI
microsoft.ai/models lists MAI-Code-1.1-Flash, MAI-Voice-2.1, MAI-Transcribe-2, MAI-Thinking-1, MAI-Image-2.6. No dates or prices.
Consumer: Microsoft 365 Personal $9.99/mo, Family $12.99/mo, Premium $19.99/mo, Pro $99.99/mo (Copilot features; no models named).

## NVIDIA
Nemotron family, open models; Nemotron 3.5 Super VL named. No dates or prices on the page.

## Built with (provider-stated only)
- MAI-Code-1.1-Flash: "built into GitHub Copilot and VS Code" (microsoft.ai/models).
- Grok 4.6: "now available in GitHub Copilot" (x.ai/news, 19 Aug 2026); Grok Bot runs SpaceXSI and Cursor customer support (x.ai/news).
- Claude: Barclays across global operations (anthropic.com/news, 1 Oct 2026); Claude Code (Anthropic's own product).
- GPT-6: ChatGPT and Codex (OpenAI's own products, chatgpt.com/pricing).
- Gemini 4 Argon: Gemini app, AI Mode in Search, Antigravity (Google's own products).
- Plus the model-to-app links already in data/chain.js, each quoted from a filing.

---
## Round 2: per-country prices and sourced estimates (25 Oct 2026)

### Local subscription prices: Apple App Store, In-App Purchases (official, set by each provider per storefront)
Snapshot: `.qa/appstore-prices.json`, 10 storefronts: us gb de fr ca au in jp br sg.
Apps: ChatGPT 6448311069, Claude 6473753684, Google Gemini 6477489729, Grok 6670324846,
Vibe by Mistral 6740410176, Microsoft Copilot 541164041. Meta AI and DeepSeek list no in-app purchases (free).
App Store prices include local tax and can carry Apple's margin (Claude Max 5x: $100 on the web, $124.99 in-app).
Apple shows at most 10 purchases per app, so some plans can be missing in some countries.

### Exchange rates: ECB euro reference rates, 23 Oct 2026
USD 1.1193, GBP 0.83728, JPY 175.51, INR 106.272, CAD 1.5665, AUD 1.5939, BRL 5.6485, SGD 1.4310 (per EUR).
Used only to convert USD API prices; labelled as conversions.

### Marketplace estimates: OpenRouter /api/v1/models (where the provider publishes nothing)
Cross-check: matches provider prices exactly for Claude Opus 5.5, GPT-6 Astra, Gemini 4 Argon, Grok 4.7;
higher than the provider for Gemini 3.8 Flash ($0.825 vs $0.75). The "listed" date is when OpenRouter added it.
- DeepSeek V4.1 Flash 1017: listed 17 Oct 2026, 1M context, $0.15 / $0.60
- DeepSeek V4 Pro 0813: listed 12 Aug 2026, 1M, $0.66 / $1.98
- Meta Muse Wonder: listed 12 Oct 2026, 1M, $4 / $20, text+image+video+audio in
- Meta Muse Spark 1.3: listed 2 Sep 2026, 1M, $1.25 / $4.25; Muse Spark Open: 15 Oct 2026, $1.25 / $4.25
- Mistral Large 4: listed 6 Oct 2026, 1M, $1.36 / $4.18; Medium 3.5: 30 Apr 2026, 262K, $1.50 / $7.50; Small 4 (2603): 16 Mar 2026, 262K, $0.15 / $0.60
- Qwen3.8 Max (0902): listed 3 Sep 2026, 1M, $2 / $6; Qwen3.8 Flash: 26 Aug 2026, $0.15 / $0.47; Qwen3.7 Plus: 3 Jun 2026, $0.32 / $1.28
- NVIDIA Nemotron 3.5 Super VL: listed 15 Oct 2026, 1M, $0.15 / $0.50 (also free tier)

### Microsoft: azure.microsoft.com Foundry pricing, Microsoft models (rendered, primary)
MAI-Thinking-1 Global $2 in / $0.20 cached / $8 out; MAI-Cyber-1 Flash $0.60 / $3.50; MAI-Image-2.5 text $5, image in $8, out $47.
Release: MAI-Thinking-1 public preview 12 Aug 2026 per secondary coverage only (not on Microsoft's page).

### Press (secondary), used only for a date the provider doesn't state
- Meta Muse Wonder and Wonder Full: 12 Oct 2026 (Euronews, Business Insider Japan); matches the OpenRouter listing date.
