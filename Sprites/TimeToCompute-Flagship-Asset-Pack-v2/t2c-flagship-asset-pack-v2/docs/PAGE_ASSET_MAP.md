# Page-by-page asset map

## 1. Homepage / Today

Visual reference: `reference-mockups/v2/01-homepage-centered-clickable.png`

Production assets:

- `assets/responsive/stage-materials-*`
- `assets/responsive/stage-wafer-*`
- `assets/responsive/stage-chips-hbm-*`
- `assets/responsive/stage-photonics-*`
- `assets/responsive/stage-ai-factory-*`
- `assets/responsive/stage-accepted-*`
- `assets/responsive/stage-revenue-*`
- `assets/svg/stages/stage-frame-*.svg`
- `assets/svg/backgrounds/t2c-grid.svg`
- `assets/svg/backgrounds/t2c-circuit-map.svg`
- `assets/animated/chain-flow.svg`
- `assets/animated/completion-ring.svg`

Required interactions:

- Whole node is a link with hover, focus-visible, pressed and selected states.
- Every asset is highlighted; inactive means lower glow, not illegible/dimmed artwork.
- Each node shows stage name, status, simple description and `WHAT IS THIS?` action.
- Desktop: seven equal nodes. Tablet: scroll-snap rail. Mobile: one selected node plus adjacent context.
- Links lead to the corresponding explainer hub.

Routes:

- `/explainers/materials`
- `/explainers/wafers`
- `/explainers/chips-hbm`
- `/explainers/photonics`
- `/explainers/ai-factory`
- `/explainers/customer-acceptance`
- `/explainers/revenue-recognition`

## 2. What is Photonics?

Visual reference: `reference-mockups/v2/02-what-is-photonics.png`

Production assets:

- `assets/responsive/stage-photonics-*`
- `assets/responsive/photonics/inp-substrate-*`
- `assets/responsive/photonics/cw-laser-*`
- `assets/responsive/photonics/eml-*`
- `assets/responsive/photonics/transceiver-1-6t-*`
- `assets/responsive/photonics/cpo-*`
- `assets/responsive/photonics/optical-fibre-*`
- `assets/animated/optical-pulse.svg`
- `assets/svg/ui/t2c-v2-icons.svg`

Required modules:

- What it is.
- One plain-English bracket translation.
- Why AI needs it.
- What it is made of.
- How data moves through it.
- Why it matters.
- Where it sits in the chain.
- Public suppliers with relationship type, ticker and dynamic quote state.
- Glossary.
- Related evidence, news and bottlenecks.

Nested routes:

- `/what-is/inp-substrate`
- `/what-is/cw-laser`
- `/what-is/eml`
- `/what-is/optical-transceiver`
- `/what-is/co-packaged-optics`
- `/what-is/optical-fibre`

Each nested page reuses the canonical Explainer template. Do not create six unrelated layouts.

## 3. AI News

Visual reference: `reference-mockups/v2/03-ai-news.png`

Production assets:

- `assets/responsive/news/optical-network-signal-*`
- stage assets for affected-stage diagrams;
- `assets/svg/ui/t2c-v2-icons.svg`;
- `assets/animated/chain-flow.svg` and `t2c-v2-motion.css`.

Required modules:

- Finite material-signal count and review progress.
- Category, materiality, watchlist, source and time filters.
- Featured signal with What happened / Why it matters / What may happen next.
- Affected stages and tickers.
- Evidence count and confidence.
- Watchlist impact.
- Upcoming catalysts.
- Source quality.
- Grouped-coverage/noise-removed explanation.
- Bookmark and mark-reviewed actions.

News is organised by supply-chain consequence, not article volume. Repeated coverage should group into one signal where the data supports it.

## 4. Financials

Visual reference: `reference-mockups/v2/04-financials.png`

Production assets:

- `assets/svg/ui/t2c-v2-icons.svg`;
- CSS/SVG charts from application data;
- no raster chart screenshots.

Required modules:

- Company and period selector.
- Market quote state with exchange, currency, delay and timestamp.
- Six plain-English KPIs.
- What it owns vs what it owes.
- How cash moved.
- Deployment-to-revenue chain.
- What changed since the previous filing.
- Questions the filing answers.
- Financial glossary.
- Links to SEC filing, earnings release and investor presentation.
- Research-context disclaimer.

Every value must expose its reporting period, unit, source and whether it is reported, calculated or estimated.

