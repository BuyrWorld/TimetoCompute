# Claude Code Master Prompt — TimeToCompute Flagship Redesign

You are a senior product engineer, design-systems engineer, data-visualisation specialist and accessibility reviewer working directly inside the existing TimeToCompute repository.

Your task is to implement the supplied **T2C Flagship Asset Pack v1** faithfully across the live product. The goal is not a superficial reskin. The result must evolve TimeToCompute into a credible, evidence-backed AI supply-chain research platform suitable for sophisticated researchers, professional investors and knowledgeable commentators such as Serenity, while remaining understandable to intelligent newcomers.

The approved product character is:

> **Formula 1 timing screen × institutional infrastructure intelligence × restrained strategy-game interactivity.**

The primary proposition is:

> **Follow AI from atoms to revenue.**

Do not finish after planning. Continue until the agreed implementation phase is complete, tested and visually verified.

---

## 1. Source of truth

You have been given a folder named `t2c-flagship-asset-pack-v1` containing:

- Production raster assets with real transparency.
- Responsive PNG and WebP derivatives.
- SVG logos, stage frames, icon sprites and technical backgrounds.
- SVG/CSS animation assets.
- React component examples.
- `README.md`.
- `DESIGN_SYSTEM.md`.
- `ASSET_MANIFEST.md`.
- `IMPLEMENTATION_GUIDE.md`.
- `docs/ANIMATION_SPEC.md`.
- Four visual reference mockups.

Read all of those files before editing the application.

The reference mockups establish hierarchy, style and interaction intent. They are not production assets. Do not ship them, crop them into the interface or stretch them as backgrounds. Reconstruct the design with real components and the individual supplied assets.

The production assets and token values in the pack take precedence over visual guesses.

---

## 2. Inspect before changing code

Before implementing:

1. Read all repository-level and directory-level instructions.
2. Inspect the complete project structure.
3. Identify the framework, routing, styling system, component conventions, state management, graph/chart libraries, image pipeline, authentication and testing setup.
4. Run the existing application locally.
5. Run the current typecheck, lint, unit tests and production build.
6. List existing routes and major components.
7. Locate the current homepage and every usage of its stretched or blurry image.
8. Record that image’s intrinsic dimensions, displayed dimensions, aspect ratio and CSS rules.
9. Determine whether the defect is caused by `object-fit`, arbitrary width/height, missing aspect ratio, low native resolution, scaling beyond intrinsic dimensions or reuse of one crop at incompatible breakpoints.
10. Record the baseline result before replacing it.

Do not replatform the application or replace its styling approach unless the repository is demonstrably incomplete and the change is necessary. Adapt the supplied design system to the current architecture.

If the working tree contains unrelated user changes, preserve them.

---

## 3. Preserve the real product

Preserve all currently working:

- Routes and deep links.
- Company, site, project and contract data.
- Source citations and evidence.
- APIs and data-loading behaviour.
- Search and filters.
- Authentication and accounts.
- Watchlists and saved preferences.
- Analytics and consent handling.
- SEO, metadata and structured data.
- Error boundaries.
- Existing accessibility behaviour.
- Production configuration.

Do not replace real production data with the example copy shown in the mockups or `preview.html`.

Do not invent supplier relationships, customer awards, capacities, scores, sources, dates, order statuses or revenue recognition.

---

## 4. Data-integrity rules

The redesigned UI must preserve these distinctions:

- Announced capacity is not installed capacity.
- Installed capacity is not sold capacity.
- Product qualification is not a volume order.
- A volume order is not a shipment.
- A shipment is not customer acceptance.
- Customer acceptance is not automatically recognised revenue.
- An ecosystem relationship is not proof of a production award.
- General AI exposure is not proof of a named customer relationship.

Relationship types must be explicit:

```ts
type RelationshipType = "confirmed" | "ecosystem" | "inferred";
```

Commercial state should be explicit rather than inferred from presentation:

```ts
type CommercialStage =
  | "announced"
  | "capacity-installed"
  | "qualified"
  | "volume-order"
  | "shipping"
  | "customer-accepted"
  | "revenue-recognised";
```

Every material graph edge or commercial-stage claim should be able to expose:

- Source.
- Source date.
- Evidence type.
- Confidence.
- Relationship classification.
- Relevant product generation.
- First seen.
- Last verified.

When the data does not provide one of these fields, show an honest unknown state. Do not fabricate it.

---

## 5. Integrate the supplied assets

Copy the pack’s `assets/` contents into the project’s public/static asset location under a stable path such as:

```text
/assets/t2c/
```

Preserve the supplied filenames during the first implementation.

Do not copy `reference-mockups/` into production.

### Raster handling

Use `assets/responsive/` for stage nodes and normal cards. Use `assets/raster/` masters only for genuinely large detail views.

Implement or adapt one reusable responsive asset component with:

- WebP `srcset` at 192w, 384w and 768w.
- PNG 1280 fallback.
- Correct `sizes` per usage.
- Required alt text.
- Explicit intrinsic width and height.
- `decoding="async"`.
- Lazy loading except for the actual LCP image.
- Controlled `fetchPriority`.
- `object-fit: contain` for every isolated stage cutout.
- An aspect-ratio container.

Never use `object-fit: fill`.

Never set an arbitrary width and height that changes the asset’s aspect ratio.

Never use the full homepage mockup as a background image.

Never display a stage asset above the maximum recommended CSS sizes in `ASSET_MANIFEST.md`.

### Vector handling

- Use the static frame SVGs for simple external-image use.
- Inline `stage-frame-template.svg` only when dynamic `currentColor` is required.
- Inline the stage/UI symbol sprites once and reuse with `<use>`.
- Keep technical backgrounds as SVG/CSS rather than rasterising them.
- Generate favicon/PWA derivatives from the supplied vector mark through the existing project pipeline.

### Animation handling

- Import or port `assets/animated/t2c-motion.css`.
- Follow `docs/ANIMATION_SPEC.md` exactly.
- Prefer SVG, CSS or the existing motion library.
- Do not create GIFs.
- Do not animate raster geometry with frame-by-frame images.
- Respect `prefers-reduced-motion` everywhere.
- Live mode may run one principal chain animation.
- Focus mode removes ambient motion and dims unrelated information.

---

## 6. Implement the design foundation first

Before redesigning pages, implement reusable foundations:

1. Colour, typography, spacing, radius, border, motion and layout tokens based on `styles/t2c-tokens.css`.
2. Display/body typography using Barlow Condensed and Inter through the framework’s recommended font loader. Preserve licensing and prevent layout shift.
3. Responsive page shell and sticky navigation.
4. Buttons with primary, secondary, quiet and destructive variants.
5. Panels/cards.
6. Evidence, confidence, relationship and commercial-stage badges.
7. Stage node.
8. Responsive stage asset.
9. Progress track.
10. Source/evidence drawer.
11. Loading, empty, error and caught-up states.
12. Simple/Expert and Live/Focus segmented controls.

Components must include default, hover, active, selected, focus-visible, disabled, loading and empty states.

Use the current component system where possible. Avoid duplicate one-off page components.

---

## 7. Homepage implementation

The homepage must answer within five seconds:

- What is TimeToCompute?
- What is different about it?
- What can the visitor do first?
- Why should they return?

Use this exact hero copy:

### Headline

`Follow AI from atoms to revenue.`

### Supporting copy

`See who supplies what, where the bottlenecks are, what has actually shipped—and when infrastructure starts earning.`

### Primary actions

- `EXPLORE THE CHAIN`
- `SEE WHAT CHANGED`

Build the interactive hero chain with:

1. Materials.
2. Wafers.
3. Chips + HBM.
4. Photonics.
5. AI Factory.
6. Accepted.
7. Revenue.

Use the supplied transparent stage assets inside the supplied vector frames. Photonics uses cyan. Completed/revenue uses lime. Materials or active bottlenecks may use amber. Neutral stages remain white/grey.

The chain must be functional:

- Keyboard-selectable nodes.
- Visible focus state.
- Hover and selected states.
- Plain-English stage explanation.
- Link to the relevant supply-chain corridor.
- Current data state where available.
- No decorative control without an action.

Also implement:

- Today’s Chain Reaction.
- A finite set of material changes.
- Daily review progress.
- What happened.
- Why it matters.
- Evidence and confidence.
- What happens next.
- Live/Focus mode.
- Returning-user state when account/session data exists.

On mobile, do not shrink the seven-node desktop chain. Present the finite daily set first and provide a focused or horizontally scrollable chain with clear next/previous cues.

---

## 8. AI Supply Chain Explorer

Create or redesign the supply-chain route as the product’s signature research experience.

Users must be able to trace by:

- Product.
- Company.
- Bottleneck.
- Project.
- Supply-chain corridor.

Initial corridor filters:

- Photonics.
- HBM + advanced packaging.
- Power + cooling.
- AI-factory delivery.

Graph requirements:

- Maximum five major grouped columns visible without horizontal confusion.
- Solid line for confirmed relationships.
- Dotted line for ecosystem relationships.
- Faint dashed line for inferred exposure.
- A visible legend.
- Selected-path highlighting.
- Unrelated-path dimming.
- Zoom/pan only when necessary.
- Keyboard-accessible alternative list/table.
- Simple/Expert mode.
- Evidence drawer.
- Why-this-matters explanation.
- Who-gets-paid-next explanation.
- Follow-chain action.
- Order-to-revenue timeline.

Do not hardcode a static graph from the mockup. Render from existing or extended typed data structures.

If the data model cannot yet support a full graph, implement an honest first corridor with real data and reusable architecture. Do not fill missing relationships with invented demo data on production routes.

---

## 9. Supplier Passport

Create a reusable Supplier Passport template for company pages.

The first screen should communicate in under ten seconds:

- What the company supplies.
- Where it sits in the chain.
- Current commercial stage.
- Evidence confidence.
- The most important bottleneck or dependency.

Modules:

- Plain-English company summary.
- Chain position.
- Commercial momentum.
- Evidence confidence.
- Where It Sits.
- Order to Revenue.
- Capacity + Catalysts.
- Bottleneck Radar.
- Dependency Risk.
- Geographic exposure.
- Latest Verified Signals.
- Overview, Products, Relationships, Capacity and Evidence tabs.
- New Since Last Visit.

Radar charts must use real, defined dimensions and explain their scoring. Do not create arbitrary proprietary-looking numbers.

The source drawer must link to the original evidence where permitted and display date, type and verification status.

---

## 10. Returning-user and mobile loop

Implement the finite research loop:

```text
Changes since last visit
→ review one material change
→ understand why it matters
→ inspect evidence
→ follow the chain reaction
→ update/follow watchlist
→ caught up
```

Required states:

- Changes since last visit.
- Review progress.
- Continue where you left off.
- Watchlist changes.
- Chain Reaction.
- You’re Caught Up.
- No material changes.

Do not build an infinite social feed.

Use the supplied animated completion ring only when the user finishes a finite set. Do not play it on every visit.

Mobile bottom navigation should prioritise:

- Today.
- Chain.
- Watchlist.
- Search.

Use safe-area insets and 44px minimum targets.

---

## 11. Remaining routes

Bring these routes into the same design system without forcing identical layouts:

- Companies directory.
- Individual company pages.
- Projects/sites directory.
- Individual project/site pages.
- Photonics corridor.
- Bottleneck Radar.
- Intelligence/signals.
- Search.
- Watchlist.
- Methodology and sources.
- Login/account states.
- Error, loading and empty states.

Each route must have a clear purpose, primary action and logical next action.

Project/site pages should preserve the original T2C delivery chain:

```text
announced → power secured → construction → energised → equipment installed → customer accepted → revenue recognised
```

Do not hide evidence under decorative visuals.

---

## 12. Accessibility

Meet WCAG 2.2 AA where applicable.

Required:

- Semantic headings and landmarks.
- Keyboard operation for graphs, drawers, tabs, filters and stage nodes.
- Visible focus rings.
- Logical focus order.
- Escape closes modal drawers.
- Focus returns to the opener.
- Accessible names for icon-only controls.
- Non-colour relationship indicators.
- Sufficient text/background contrast.
- Reduced-motion support.
- Touch targets of at least 44×44px.
- Screen-reader alternative for visual supply-chain graphs.
- Charts include text summaries or tables.

Do not place essential text inside raster assets.

---

## 13. Performance

Set and enforce a reasonable performance budget.

- Preload only the actual LCP asset.
- Lazy-load below-the-fold imagery.
- Use the responsive WebP derivatives.
- Preserve intrinsic image dimensions to prevent CLS.
- Subset or framework-load fonts.
- Avoid heavyweight animation libraries if the current stack does not already use one.
- Code-split graph-heavy routes where appropriate.
- Do not download every company or stage asset on the homepage.
- Do not autoplay video.
- Keep decorative SVGs as external cached files where they do not need inline state.

The redesign is not accepted if it substantially worsens LCP, CLS or interaction responsiveness without a documented reason.

---

## 14. Testing and visual verification

Run the repository’s existing checks and add appropriate tests for the redesign.

Required checks:

- Typecheck.
- Lint.
- Unit tests.
- Component/integration tests.
- Route smoke tests.
- Production build.
- Accessibility checks.
- Broken asset/link checks.
- Image-dimension and missing-alt checks.

Add a validation script or test that flags:

- Raster images without explicit dimensions or an aspect-ratio container.
- Use of `object-fit: fill` on T2C assets.
- Missing responsive derivatives.
- Missing alt text.
- Production references to `reference-mockups`.
- Missing asset paths.
- Unexpectedly oversized image payloads.

Visually verify at:

- 390×844.
- 430×932.
- 768×1024.
- 1366×768.
- 1440×900.
- 1920×1080.
- 2560×1440.
- 3840×2160.

At every size verify:

- No stretching.
- No visible checkerboard or matte background.
- No pixelation at intended display sizes.
- No unintended cropping.
- No label collisions.
- Correct responsive art direction.
- Drawer and graph usability.
- Keyboard focus.
- Reduced-motion behaviour.
- No horizontal page overflow, except a deliberately contained chain scroller.

Capture before/after screenshots for the major redesigned routes.

---

## 15. Delivery sequence

Use this sequence unless repository dependencies require a small adjustment:

1. Baseline audit and stretched-image diagnosis.
2. Asset integration and validation.
3. Design tokens and typography.
4. Shared components and responsive-image wrapper.
5. Homepage.
6. Today/returning-user state.
7. Supply Chain Explorer foundation and photonics corridor.
8. Supplier Passport template.
9. Mobile navigation and responsive layouts.
10. Remaining route consistency.
11. Accessibility and performance pass.
12. Full test and visual-regression pass.

Keep changes reviewable and avoid mixing unrelated refactors into the redesign.

---

## 16. Completion criteria

The implementation is complete only when:

- A new visitor understands TimeToCompute within five seconds.
- The homepage visibly follows AI from materials to recognised revenue.
- Photonics is prominent and understandable.
- The supplied production assets appear sharp on standard, Retina and 4K displays.
- The previous stretched-image defect is gone and its root cause is documented.
- No complete mockup screenshot is being used as interface artwork.
- Every stage asset preserves its aspect ratio.
- Important claims reveal evidence.
- Confirmed, ecosystem and inferred relationships cannot be confused.
- Returning users can see what changed and reach a caught-up state.
- Mobile is a designed experience, not a compressed desktop page.
- Keyboard and reduced-motion users can complete the main journeys.
- Existing production functionality and real data remain intact.
- Tests, build and visual checks pass.

---

## 17. Final report

At completion, report:

1. Baseline findings.
2. Exact root cause of the stretched image.
3. Files changed.
4. Components created or reused.
5. Routes redesigned.
6. Assets integrated.
7. Data-model changes.
8. Accessibility work.
9. Performance impact.
10. Tests run and results.
11. Visual verification sizes completed.
12. Before/after screenshot locations.
13. Remaining risks.
14. Deliberately deferred work.

Do not claim completion if tests fail, the production build fails, assets are missing, real data was replaced with placeholders, or the interface still stretches raster imagery.
