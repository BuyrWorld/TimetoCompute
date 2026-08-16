# Implementation plan

This sequence minimises regression risk and produces useful reviewable checkpoints.

## Phase 0 — audit and baseline

1. Read repository instructions and the complete pack.
2. Run the current site, lint, typecheck, tests and production build.
3. Inventory routes, components, data sources, APIs, analytics and authentication.
4. Find every use of the current homepage node assets and any stretched screenshot.
5. Record intrinsic dimensions, rendered dimensions, aspect ratio, `object-fit`, opacity/filter and container geometry.
6. Capture desktop/mobile baseline screenshots.

Deliverable: short audit note with existing failures separated from new work.

## Phase 1 — design and asset foundation

1. Copy production `assets/` to the app's stable public/static path.
2. Integrate tokens into the existing styling architecture.
3. Add responsive `CutoutAsset`, `HexStageNode`, icon, badge, evidence and glossary primitives.
4. Add loading, unavailable, stale, empty and error states.
5. Add reduced-motion and focus-visible behaviour.
6. Add visual regression stories/tests if the repository supports them.

Acceptance:

- no distorted asset at target breakpoints;
- all nodes pass centring review in the preview lab;
- no production import from `reference-mockups`;
- baseline tests remain green or pre-existing failures are documented.

## Phase 2 — homepage chain and navigation

1. Add AI News and Financials navigation destinations.
2. Replace the current hex row with one data-driven seven-node component.
3. Make each node a real route link with `WHAT IS THIS?` affordance.
4. Add desktop, tablet scroll-snap and mobile focused layouts.
5. Preserve Today's Chain Reaction and real existing signal data.
6. Add hover, focus, selected and reduced-motion states.

Acceptance:

- first-time user can name the seven stages and open any explanation;
- all objects are optically centered and highlighted;
- keyboard order matches visual order;
- no CLS or image stretching.

## Phase 3 — reusable explainer system

1. Implement typed stage/component content.
2. Build the canonical `ExplainerPage` template.
3. Build `/explainers/photonics` completely using supplied assets.
4. Build the six nested Photonics component pages.
5. Build the remaining stage hubs using existing data and honest placeholders only where explicitly labelled.
6. Add glossary, evidence drawer, supplier table and related news.

Acceptance:

- each technical term has one simple translation and a reusable glossary entry;
- supplier role and evidence are visible;
- quote failures do not block content;
- pages have metadata, breadcrumbs and working next actions.

## Phase 4 — market-data adapter

1. Select/configure the existing authorised quote provider.
2. Implement a server-side batched quote adapter and cache.
3. Add exchange, currency, market-state, delayed/stale and timestamp labels.
4. Add unavailable/error telemetry.

Acceptance:

- no provider secret reaches the browser;
- no hard-coded prices;
- stale quotes are never labelled live;
- financial and supplier pages share one adapter.

## Phase 5 — AI News

1. Add `/ai-news` route and navigation state.
2. Map existing articles/signals into the typed signal model without fabricating fields.
3. Implement finite daily set, filters, featured signal and material-signal rows.
4. Add watchlist impact, catalysts, source quality and grouped coverage.
5. Store reviewed/bookmarked state per user when authenticated; use a privacy-respecting local fallback when not.

Acceptance:

- each signal answers happened/matters/next;
- every material claim opens evidence;
- finite progress and caught-up state work;
- filters are URL-addressable and keyboard accessible.

## Phase 6 — Financials

1. Add `/financials` and `/companies/:slug/financials` according to existing routing conventions.
2. Build server-normalised financial data with period/unit/source metadata.
3. Implement KPI cards, balance view, cash waterfall, deployment-to-revenue and changes table.
4. Add questions-answered and glossary modules.
5. Link original filings and distinguish reported/calculated/estimated values.

Acceptance:

- no sample values ship;
- period comparisons use like-for-like data;
- calculations expose formulas and sources;
- interface remains useful when a metric is unavailable.

## Phase 7 — analytics, SEO and trust

Track at minimum:

- first meaningful action;
- homepage stage opened;
- explainer depth and glossary use;
- supplier evidence opened;
- quote state failures;
- signal opened/reviewed/bookmarked/completed;
- financial period changed;
- original filing opened;
- watchlist additions;
- return within 1, 7 and 30 days where consent permits.

Add route metadata, canonical URLs, Open Graph imagery, structured data where truthful, sitemap entries and correction/report-error actions.

## Phase 8 — final QA and launch

1. Test 390×844, 430×932, 768×1024, 1366×768, 1440×900, 1920×1080, 2560×1440 and 3840×2160.
2. Test keyboard, screen reader landmarks, zoom to 200%, reduced motion and forced-colour resilience.
3. Test slow, failed and stale data.
4. Run lint, typecheck, tests and production build.
5. Check LCP, CLS and unnecessary image transfer.
6. Capture final screenshots for all four reference pages.

## Recommended release order

Release 1: foundation + homepage + Photonics explainer.

Release 2: AI News.

Release 3: Financials and remaining explainer depth.

This gives users a coherent improvement early while keeping financial and market-data correctness behind explicit verification gates.

