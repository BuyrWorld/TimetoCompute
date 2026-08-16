# Claude Code master prompt — TimeToCompute flagship research product v2

You are the senior product engineer, design-systems engineer, data-visualisation specialist and accessibility reviewer responsible for implementing the supplied TimeToCompute v2 asset pack inside the existing live repository.

The objective is to evolve TimeToCompute into an evidence-led AI supply-chain research product that sophisticated researchers and commentators would use, while remaining understandable and enjoyable for an intelligent newcomer who knows little about data centres.

The product character is:

> Formula 1 timing screen × institutional infrastructure intelligence × restrained strategy-game interactivity.

The proposition is:

> Follow AI from atoms to revenue.

This is not a superficial reskin. Implement the information architecture, interactions, explainers, data states and responsive behaviour demonstrated by the supplied references.

Do not stop after producing a plan. Inspect, implement, test and visually verify the agreed scope. Ask only when a missing decision would materially change real product data, require credentials that are not configured, or cause a destructive migration.

---

## 1. Read before editing

The asset-pack folder is named `t2c-flagship-asset-pack-v2`.

Read `t2c-flagship-asset-pack-v2/00_READ_FIRST.md` first and then follow its complete reading order. Open `preview.html` and inspect every tab. Inspect the v2 mockups at full size.

After reading the pack:

1. Read all repository-level and directory-level instruction files.
2. Inspect the full project structure.
3. Identify the framework, router, styling system, component library, state management, data-access layer, APIs, authentication, analytics, test tools and deployment configuration.
4. Run the current site locally.
5. Run the existing lint, typecheck, unit/integration tests and production build.
6. Record pre-existing failures separately.
7. Inspect the working tree and preserve unrelated user changes.

Do not introduce a new framework or styling system merely because an example component uses React, Next.js or plain CSS. Adapt the supplied patterns to the repository's architecture.

---

## 2. Sources of truth

Use this priority:

1. Existing real product data, sources, APIs and working behaviour.
2. Pack data-integrity rules and production asset manifest.
3. `reference-mockups/v2/` for target hierarchy and visual design.
4. Current-site screenshot for existing content/defect context.
5. Earlier concepts for broader product patterns.

Reference screenshots are not production artwork. Never ship, crop, tile or stretch them as a page background. Reconstruct them from real components and supplied production assets.

Mockup headlines, signal events, supplier examples, quote values and financial values are illustrative unless the repository independently contains sourced production data. Do not copy examples into production as facts.

---

## 3. Preserve the existing product

Preserve all working:

- routes and deep links;
- company, project, site, contract and source data;
- search and filters;
- authentication and account behaviour;
- watchlists and saved preferences;
- analytics and consent;
- metadata, structured data and sitemap behaviour;
- APIs, caching and error handling;
- deployment configuration;
- accessibility behaviour that is already correct.

Do not rewrite functioning areas that are outside the requested pages. Do not erase or rename production data fields without a safe migration.

---

## 4. Diagnose the current image defect

Before replacement, locate the homepage chain implementation and record:

- source asset dimensions and alpha;
- rendered width/height and aspect ratio;
- `object-fit` and `object-position`;
- container dimensions and overflow;
- opacity, brightness and filters;
- transparent padding differences;
- whether low-resolution assets are enlarged;
- whether a whole screenshot is being used instead of individual assets.

Implement the common square art-stage technique in `docs/CENTERING_AND_RESPONSIVE.md`.

Rules:

- one identical square asset stage inside every hexagon;
- `object-fit: contain` and `object-position: 50% 50%`;
- manifest/data-driven scale and x/y optical correction;
- no arbitrary per-page margins;
- no `object-fit: fill`;
- no asset below 72% opacity merely to indicate inactivity;
- explicit intrinsic dimensions and responsive sources;
- never upscale beyond manifest limits.

---

## 5. Integrate production assets

Copy only production `assets/` into a stable application path such as:

```text
public/assets/t2c/
```

Do not copy `reference-mockups/` into public/static production directories.

Preserve supplied filenames during the first implementation. Integrate:

- responsive homepage stage cutouts;
- responsive Photonics component cutouts;
- AI News editorial image;
- T2C brand SVGs;
- stage frames;
- technical grid/circuit backgrounds;
- UI sprite;
- animation SVG/CSS.

Use the project's image component/pipeline where appropriate, but preserve transparent alpha and aspect ratio. Do not optimise away transparency.

Only the actual LCP image may load eagerly. Lazy-load the rest. Provide responsive `srcset`, accurate `sizes`, explicit width/height, async decoding and alt text. Decorative duplicates use empty alt text.

---

## 6. Build shared foundations

Before page-specific work, implement or adapt reusable primitives:

- colour, spacing, typography, border, radius and motion tokens;
- application shell and sticky navigation;
- primary, secondary and quiet buttons;
- panels and cards;
- responsive cutout asset;
- hexagon stage node;
- stage rail/chain;
- icon primitive using the supplied sprite;
- relationship, confidence, source and commercial-stage badges;
- progress/review tracker;
- evidence drawer;
- glossary trigger and accessible popover;
- supplier/quote table;
- loading, stale, unavailable, empty, error and caught-up states;
- Simple/Expert and Standard/Focus controls where the product already supports them.

Every control needs default, hover, active, focus-visible, disabled and loading states. Do not make decorative elements look clickable. Interactive targets are at least 44×44 CSS pixels where practical.

Typography target:

- display and compact timing labels: Barlow Condensed or the repository's established equivalent;
- body/UI: Inter or the established equivalent;
- tabular numerals for prices, dates, capacity and progress.

Use acid lime for progress/action/verified completion, cyan for photonics/information/in-progress and amber for bottleneck/exposure/warning. Do not make all three colours compete simultaneously in every card.

---

## 7. Homepage / Today

Target reference: `reference-mockups/v2/01-homepage-centered-clickable.png`.

Preserve this hero copy unless the repository already contains an approved newer version:

```text
Follow AI from atoms to revenue.
See who supplies what, where the bottlenecks are, what has actually shipped—and when infrastructure starts earning.
```

Primary actions:

- `EXPLORE THE CHAIN`
- `SEE WHAT CHANGED`

Build one data-driven seven-stage chain:

1. Materials.
2. Wafers.
3. Chips + HBM.
4. Photonics.
5. AI Factory.
6. Accepted.
7. Revenue.

Every node must:

- display a bright, optically centred supplied asset;
- show stage name;
- show a short simple description;
- display `WHAT IS THIS?` or an equivalent explicit educational affordance;
- be a real keyboard-accessible link;
- expose hover, focus-visible, selected and pressed feedback;
- route to its explainer page.

Desktop uses seven equal nodes. Tablet uses a scroll-snap rail with a visible next-item cue. Mobile shows a focused node with adjacent context or a readable vertical sequence. Do not shrink the full desktop row into seven tiny icons.

Preserve the real Today's Chain Reaction, material changes and evidence data. Improve their hierarchy using the v2 design. Implement finite review progress and a caught-up state where the user/session model supports it.

---

## 8. Explainer information architecture

Create a reusable stage/component explainer system, not one-off pages.

Top-level routes:

- `/explainers/materials`
- `/explainers/wafers`
- `/explainers/chips-hbm`
- `/explainers/photonics`
- `/explainers/ai-factory`
- `/explainers/customer-acceptance`
- `/explainers/revenue-recognition`

Each template contains:

1. Breadcrumb and chain-stage number.
2. One large highlighted asset.
3. `WHAT IS …?` definition.
4. One bracketed plain-English translation.
5. Why AI needs it.
6. How it works.
7. What it is made of.
8. Why it matters technically and commercially.
9. Inputs and outputs.
10. Where it sits in the chain.
11. Related bottlenecks.
12. Public suppliers with exact relationship type.
13. Ticker and quote state.
14. Glossary.
15. Related AI News signals.
16. Evidence, last reviewed, methodology and report-error controls.

Use the bracket translation after the first technical term in each section. After that, use a dotted-underlined glossary trigger with an accessible popover. Avoid placing parentheses after every technical word.

---

## 9. Photonics explainer and nested pages

Target reference: `reference-mockups/v2/02-what-is-photonics.png`.

Implement `/explainers/photonics` fully using the six supplied component assets:

- InP substrate.
- CW laser.
- EML.
- 1.6T optical transceiver.
- Co-packaged optics.
- Optical fibre.

Create nested reusable routes:

- `/what-is/inp-substrate`
- `/what-is/cw-laser`
- `/what-is/eml`
- `/what-is/optical-transceiver`
- `/what-is/co-packaged-optics`
- `/what-is/optical-fibre`

Each component card is a link, not a modal-only dead end. Each nested page uses the same canonical template with component-specific definition, simple translation, mechanism, significance, chain position, dependencies, suppliers, glossary, evidence and news.

Implement the `GPU → optical engine → fibre → switch → GPU` explanatory path with semantic HTML/SVG, not baked raster text. Provide a list/table alternative.

Supplier table requirements:

- company;
- precise role;
- relationship classification;
- ticker and exchange;
- dynamic price state;
- source/evidence action.

Do not infer a direct customer award from sector participation.

---

## 10. Market quote adapter

Use one authorised server-side quote adapter shared by explainer supplier tables, company pages and Financials.

First inspect whether the repository already has a provider. Reuse it if correct.

If no provider is configured:

1. Implement the typed adapter interface and UI states.
2. Add documented environment variables without adding secrets.
3. Return `unavailable` safely until configured.
4. Do not scrape a public finance website.
5. Do not block the page or invent a price.

Each quote displays:

- ticker and exchange;
- currency;
- price or honest unavailable state;
- change and percentage when available;
- market open/closed/pre/after state;
- live/delayed/stale status;
- `as of` timestamp;
- delay disclosure where applicable.

Batch requests, cache server-side under provider rights/rate limits and protect provider credentials.

---

## 11. AI News

Add `AI NEWS` to the global navigation and implement `/ai-news`.

Target reference: `reference-mockups/v2/03-ai-news.png`.

The positioning is:

```text
AI NEWS — ONLY WHAT CHANGES THE CHAIN.
T2C filters the noise into supply-chain signals.
(In simple terms: what happened, why it matters, who is affected, and what may happen next.)
```

Adapt the word `investable` only if it fits the site's compliance/editorial policy; do not imply regulated advice.

Required features:

- finite material-signal count;
- reviewed progress and caught-up state;
- category filters for Chips + HBM, Photonics, Power, Megaprojects, Earnings and Policy;
- materiality, watchlist, source-quality and time filters;
- featured signal using the supplied optical-network image where relevant;
- What happened / Why it matters / What may happen next;
- affected stages, companies, projects and tickers;
- evidence count and confidence;
- compact material-signal feed;
- watchlist impact;
- upcoming catalysts;
- source-quality summary;
- grouped-coverage/noise-removed explanation;
- bookmark and mark-reviewed actions;
- URL-addressable filter state.

Do not build an infinite generic news feed. Group repeated reporting into a single research signal when the underlying event is genuinely the same. Keep contradictory evidence and corrections visible.

Persist reviewed/bookmarked state to the existing user account system. For unauthenticated users, use a privacy-respecting local state only if consistent with the product's consent model.

---

## 12. Financials

Add `FINANCIALS` to the global navigation. Implement a reusable company Financials template and route it according to existing conventions, preferably:

- `/financials` for a searchable/company-selected landing state;
- `/companies/:slug/financials` for a company-specific deep link.

Use IREN as the selected visual example only when real IREN data already exists or has been sourced. Do not ship sample IREN figures from the mockup.

Target reference: `reference-mockups/v2/04-financials.png`.

Required modules:

1. Company, exchange, ticker and period selectors.
2. Quote status and original-filing action.
3. Cash — money available.
4. Debt — money owed.
5. Revenue — sales recognised.
6. Capex — money spent building long-lived assets.
7. Operating cash flow — cash generated or used by operations.
8. Shares outstanding — how many ownership units exist.
9. What it owns vs what it owes.
10. How cash moved.
11. Deployment-to-revenue chain.
12. What changed since the previous comparable report.
13. Questions the filing answers.
14. Financial glossary.
15. SEC filing, earnings release and investor-presentation sources.
16. Research-context/not-investment-advice note.

Render charts in semantic HTML/SVG/canvas using data. Do not use screenshot charts.

Every financial value must expose:

- reporting period;
- unit and currency;
- reported/calculated/estimated basis;
- source ID/document;
- formula for calculated values;
- timestamp.

Do not mix quarterly and year-to-date cash flows. Do not treat market capitalisation as a filing value. Do not treat customer acceptance as automatically recognised revenue.

---

## 13. Data integrity and evidence

Implement the types and rules in `docs/DATA_AND_TRUST.md`.

Maintain these distinctions:

- announced is not installed;
- installed is not contracted;
- qualified is not a volume order;
- volume order is not shipped;
- shipped is not accepted;
- accepted is not automatically revenue recognised;
- ecosystem relationship is not a production award;
- sector exposure is not a named supplier/customer relationship.

Every material claim must be able to open an evidence drawer containing source, source date, source type, confidence, relationship classification, last verified and report-error/correction controls.

Unknown fields remain unknown. Do not convert missing data into a green check.

---

## 14. Motion and ADHD-friendly interaction

Follow `docs/MOTION_AND_INTERACTION.md`.

Motion must explain state:

- one selected chain pulse;
- one affected-path reveal;
- short review-completion check;
- financial chart reveal after real data resolves;
- two pulses for new-since-last-visit, then stop.

Do not use permanent object bobbing, spinning assets, auto-scrolling ticker tape, multiple simultaneous glows or decorative motion on every card.

Use progressive disclosure. Always show where the user is, what changed and the next useful action. Provide finite completion moments and continue-where-you-left-off where the existing user model permits it.

Respect `prefers-reduced-motion`; the no-motion state must remain fully understandable.

---

## 15. Responsive and accessibility requirements

Verify at:

- 390×844;
- 430×932;
- 768×1024;
- 1366×768;
- 1440×900;
- 1920×1080;
- 2560×1440;
- 3840×2160.

Requirements:

- no distortion, crop, white/checkerboard rectangle or blurry upscale;
- landmarks and heading hierarchy;
- skip link;
- visible focus;
- logical keyboard order;
- accessible tables and overflow regions;
- labels independent of colour;
- minimum AA contrast for normal text;
- 200% zoom without loss of content;
- popover/drawer focus management and Escape behaviour;
- screen-reader names for icon-only controls;
- reduced motion;
- mobile navigation that does not hide AI News or Financials.

For complex SVG diagrams, provide a semantic list/table alternative.

---

## 16. Performance

- Preload only the real LCP asset.
- Use WebP responsive derivatives for normal cards/nodes.
- Use masters only for large detail views.
- Preserve intrinsic dimensions to prevent CLS.
- Lazy-load below-the-fold imagery.
- Do not inline large raster data URLs.
- Do not duplicate full SVG sprites per component.
- Route-split heavy chart/graph code where supported.
- Keep filters responsive while data loads.
- Abort obsolete requests and prevent race-condition flashes.

Measure before and after. Do not claim an improvement without evidence.

---

## 17. Analytics

Use the existing consent-aware analytics layer. Add events for:

- homepage CTA;
- stage node opened;
- explainer component opened;
- glossary opened;
- supplier evidence opened;
- quote unavailable/stale;
- signal opened/reviewed/bookmarked;
- daily set completed;
- AI News filter changed;
- financial company/period changed;
- original filing opened;
- watchlist added;
- first meaningful action;
- return within 1, 7 and 30 days where permitted.

Do not send source excerpts, sensitive account data or full search text without reviewing privacy implications.

---

## 18. Testing and verification

Add tests appropriate to the repository for:

- route availability and active navigation;
- stage-node route mapping;
- responsive image attributes;
- centring CSS variables;
- keyboard activation and focus-visible state;
- glossary popover semantics;
- supplier relationship labels;
- quote loading/live/delayed/stale/unavailable states;
- signal filtering, reviewed progress and caught-up state;
- financial period/unit/source display;
- reduced motion;
- empty/error data states;
- no imports from `reference-mockups` in production bundles.

Run lint, typecheck, tests and production build after each phase. Capture final desktop and mobile screenshots of all four page families and compare them with v2 references by hierarchy, not pixel-copying.

---

## 19. Implementation checkpoints

Follow `docs/IMPLEMENTATION_PLAN.md` in order.

At each checkpoint report:

1. Files changed.
2. Product behaviour implemented.
3. Data assumptions and unresolved genuine blockers.
4. Test/build results.
5. Screenshot paths.
6. Any deliberate visual difference from the reference and why.

Recommended release sequence:

1. Foundation + homepage + Photonics explainer.
2. AI News.
3. Financials + remaining explainer depth.

If the user asks for the whole scope in one branch, continue through all phases, but keep commits/checkpoints logically separated if committing is authorised.

---

## 20. Definition of done

The task is complete only when:

- all seven homepage objects are bright, optically centred and clickable;
- every homepage stage opens a real educational destination;
- Photonics and its six component explainers use the supplied assets;
- complex terms have accessible simple translations and glossary support;
- supplier rows state relationship type and expose evidence;
- share prices are dynamic or honestly unavailable, never hard-coded;
- AI News exists as a finite evidence-led signal product;
- Financials exists as a source-backed plain-English company dashboard;
- navigation, mobile, keyboard and reduced-motion behaviour work;
- no reference screenshot ships as page art;
- no fake example data ships;
- lint, typecheck, tests and production build pass, excluding explicitly documented pre-existing failures;
- final screenshots demonstrate the completed desktop and mobile experience.

Begin by reading `00_READ_FIRST.md`, then inspect the repository and run the baseline. Continue autonomously through the first safe implementation phase.

