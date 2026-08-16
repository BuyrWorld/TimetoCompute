# Claude Code Prompt — TimeToCompute Audience-Led Editorial Homepage

Copy everything below the divider into Claude Code with the real TimeToCompute repository open. Place the `TimeToCompute_Audience_Led_Asset_Pack` folder in the repository root first, or replace the pack path in the prompt with its actual location.

---

You are implementing an audience-led editorial redesign of the TimeToCompute homepage.

## Outcome

Transform the homepage from a dense infrastructure dashboard into a cinematic, evidence-led story about the physical race behind AI.

The primary audience is retail investors following AI-infrastructure companies. The secondary audience is technology followers. Intelligent newcomers are the third audience. The page must answer, in this order:

1. What major thing just happened?
2. Why should I care?
3. Which companies are actually delivering?
4. What happens next?
5. What is genuine versus hype?
6. Can I verify the claim?

This is not a game, trading terminal, generic SaaS dashboard or data-centre operations simulator.

## Source pack

Locate this folder in or beside the repository:

`TimeToCompute_Audience_Led_Asset_Pack`

Read these files before changing code:

- `README.md`
- `ASSET_MANIFEST.json`
- `COPY_DECK.md`
- `COMPONENT_SPEC.md`
- `DATA_CONTRACT.ts`
- `design-tokens.css`
- `IMPLEMENTATION_CHECKLIST.md`
- `reference/homepage-visual-concept.png`

The reference image is a visual target, not a data source. Its figures, dates, logos and project images are illustrative. Never copy a placeholder claim into production.

## Phase 0 — inspect and report before editing

1. Inspect the repository structure and identify:
   - framework/build system
   - homepage route/template
   - shared header/footer
   - data sources and schema
   - signal/intelligence model
   - company, site/project, catalyst and evidence models
   - watchlist and reviewed-state persistence
   - existing test commands
   - image handling and public/static directory
   - existing design tokens and fonts
2. Read repository instructions such as `AGENTS.md`, `CLAUDE.md`, contribution notes and package scripts.
3. Run the existing lint, typecheck, tests and production build before editing. Record baseline failures without “fixing” unrelated issues.
4. Capture baseline screenshots at 375 × 812, 768 × 1024, 1366 × 768 and 1440 × 900.
5. Identify exactly where the horizontal overflow originates. The live site previously overflowed at approximately 1363 px; do not assume the cause.
6. Summarise the implementation plan and affected files before starting. Then proceed without asking for stylistic confirmation unless the asset pack is missing or repository instructions conflict.

## Non-negotiable research integrity

T2C's canonical delivery model is:

`announced → power secured → construction → energised → customer contracted → customer accepted → billing`

Preserve all distinctions between:

- gross utility power
- critical-IT power
- GPU load
- actual/minimum values
- targets
- pipeline
- potential
- unknown
- zero

Rules:

- Do not alter research records, figures, units, bases, dates, corrections, source URLs, source excerpts, confidence classifications, scoring formulas or scenario calculations to fit the design.
- Never convert unknown/null into zero, failure or an empty string that looks like zero.
- Never assume customer acceptance proves billing.
- Never assume a customer contract proves energisation.
- Never subtract or calculate a percentage between two measures unless their units, measurement bases, scopes and as-of dates are explicitly comparable in the existing research model.
- If figures are shown side by side but are not comparable, display their bases and the exact caveat from `COPY_DECK.md`.
- The generated imagery is illustrative. Add the supplied disclosure and never label it as a photograph of a named project.
- Do not fabricate “live” telemetry, map coordinates, real-time operational status, community impacts, energy sources, jobs or construction progress.
- If the current data cannot populate a module honestly, render a designed unknown/empty state or omit the module. Do not invent content.

## Asset installation

Copy the contents of:

`TimeToCompute_Audience_Led_Asset_Pack/public/assets/t2c/`

into the repository's public/static path so the runtime URLs remain:

`/assets/t2c/images/...`

and:

`/assets/t2c/icons/...`

Do not overwrite an existing T2C logo. Reuse the repository's current logo asset.

Use the generated assets according to `ASSET_MANIFEST.json`:

- `hero-ai-campus-dusk` — homepage lead story
- `project-operational-campus` — accepted/energised/billing category card
- `project-construction-campus` — construction category card
- `project-power-community` — power/community editorial lens
- `explainer-ai-datacentre-cutaway` — newcomer explainer

Implementation requirements:

- Use a framework image component or `<picture>` with the supplied 800/1200/1600 WebP variants and PNG fallback.
- Hero: eager load, `fetchpriority="high"`, fixed intrinsic dimensions/aspect ratio and no layout shift.
- All other imagery: lazy load and async decode.
- Use manifest alt text and disclosures.
- Never place text, data or customer/operator logos inside a raster image.
- Keep all overlay copy as selectable semantic HTML.

## Design system

Integrate the values from `design-tokens.css` into the existing token system rather than creating a parallel styling architecture. Preserve existing variables when they already express the same role.

Visual principles:

- near-black canvas
- large white condensed editorial headline
- electric lime only for verified progress and primary actions
- amber only for unresolved/reported/estimated states
- generous spacing
- one dominant story
- thin structural borders
- imagery with restrained gradients
- technical detail subordinate to consequence

Font guidance:

- Prefer existing licensed/self-hosted project fonts.
- If permitted and absent, use a licensed condensed display face similar to Barlow Condensed and a highly readable body face similar to Inter.
- Do not hotlink an unapproved font or silently introduce a new tracking request.

Avoid:

- generic glassmorphism
- F1 timing boards dominating the homepage
- neon cyberpunk styling
- fake charts
- ticker tape
- infinite feeds
- coins, streaks, points or badges
- autoplay
- tiny monospace labels
- multiple simultaneous primary CTAs

## Homepage structure

Implement these sections in this order.

### 1. Responsive global header

Desktop labels:

- Today
- Companies
- Megaprojects
- Catalysts
- Explainers
- Search
- My watchlist

Requirements:

- Preserve existing URLs and deep links. “Megaprojects” may point to `/sites/`.
- Search retains existing `Ctrl/Cmd+K` and Escape behavior.
- Keep current watchlist behavior and accurately label browser-local persistence.
- If Focus mode remains, rename its counterpart from “Live” to “Standard” or another non-telemetry label.
- At narrow widths, use an accessible disclosure menu.
- Zero page-level horizontal scrolling from 320 through 1600 px and at 200% zoom.

### 2. LeadStoryHero

Use the newest eligible verified/high-confidence signal already selected by the product's data logic. Do not create a separate hard-coded homepage story.

Layout:

- Eyebrow: `THE PHYSICAL RACE BEHIND AI`
- Plain-English lead story headline
- One-sentence consequence
- Primary CTA: `WHY THIS MATTERS`
- Secondary CTA: `VIEW THE EVIDENCE`
- Evidence confidence/source badge
- Delivery-stage rail
- Up to three “What investors are watching” items
- Illustrative disclosure

Plain-English rendering:

- Reuse curated summary fields if they exist.
- Otherwise create a deterministic presentation adapter using existing structured facts.
- Do not use runtime generative AI to write claims.
- Never overstate the gate. “Accepted” must not become “earning revenue.”

`WHY THIS MATTERS` opens an accessible drawer/sheet with:

1. What happened
2. Why it matters
3. What changed
4. What happens next
5. What could block it
6. View the evidence

Desktop: right-side drawer. Mobile: bottom sheet or full-screen dialog. Trap focus, close with Escape, restore focus to the trigger and use an accessible name.

The stage rail must expose both simple and detailed labels. Use HTML text and icons; completed/current/pending/unknown cannot rely on color alone.

### 3. ReturningUserSummary

Reuse the existing checkpoint/review model.

When changes exist:

- `[N] VERIFIED CHANGES WHILE YOU WERE AWAY`
- `[N] moved forward · [N] moved back · [N] changed evidence only`

When no changes exist:

- `YOU'RE CAUGHT UP`
- `No verified delivery records have changed since your last review.`

Do not fake a return state on first visit. Preserve the current honest first-visit fallback.

### 4. The AI Buildout Today

Create a four-card responsive grid.

#### Who is delivering?

- Show three companies by furthest evidenced delivery stage.
- Tie handling must be stable and transparent.
- Do not rank using share price or announced capacity.
- Include an accessible text equivalent for the progress visualization.

#### Next big catalyst

- Use the earliest relevant future catalyst.
- Display exact date, guided window or date unknown with visibly different certainty.
- Do not transform a guided window into an exact date.

#### Promise vs reality

- Use only a pair already allowed by the data model, or show them as independent evidence stages with bases and caveat.
- Never calculate a ratio unless comparability is explicit.
- Display unit, basis, qualifier and as-of date.

#### Why should I care?

Tabs:

- My investments
- The AI race
- Power & communities

Tabs change only the explanation. They do not change or filter research facts unless the product already supports that behavior.

Suggested content:

- My investments: delivery, contracts, financing, catalysts and unresolved risks.
- The AI race: customers, capacity becoming usable and major bottlenecks.
- Power & communities: grid, land, water, jobs or community impacts only where existing sourced data supports the claim; otherwise explain the topic generally without assigning it to a named project.

### 5. Megaprojects to watch

Show three projects selected by a deterministic rule such as latest verified change, closest upcoming gate and highest user relevance/watch status.

Each card shows:

- operator
- disclosed customer or `Not disclosed`
- current verified stage
- next gate/window
- evidence state
- `OPEN PROJECT RECORD`
- illustrative-image disclosure

Choose imagery by stage category, never by pretending the illustration is the physical site.

### 6. 60-second explainer

Use `explainer-ai-datacentre-cutaway`.

Title:

`HOW AN AI DATA CENTRE MAKES MONEY`

Build an accessible five-step explainer:

1. Electricity reaches the site.
2. Cooling and power systems support the computing equipment.
3. Servers run customer workloads.
4. The customer tests and accepts the contracted deployment.
5. Revenue begins when the contract's billing conditions are met and disclosed.

Final statement:

`Acceptance and billing are different stages. T2C does not assume one proves the other.`

No autoplay. Start only after a button press. Reduced-motion mode changes states instantly.

### 7. Evidence/trust footer

Keep methodology, sources, corrections, data health, privacy, terms and contact easy to reach.

Fix internal fragment destinations so they land on a unique ID on the correct route. Add an automated test for every footer link.

## Editorial briefing/news

The current raw news feed must not dominate the redesigned homepage.

On the homepage, include at most three strongly relevant briefing items. Each must show:

- headline
- affected company/project
- why T2C included it
- verified by T2C / unverified report / opinion
- link to the original publisher

Do not imply T2C verified a wire headline.

If the current feed cannot reliably exclude unrelated stories, do not surface it on the homepage. Leave the route intact, label it clearly as a third-party wire and create an engineering issue for relevance filtering/deduplication.

## Shared technical fixes required during this work

Because the new homepage uses the shared shell, also resolve:

1. Header/document horizontal overflow at common desktop widths.
2. Branded T2C 404 with navigation, search and useful recovery routes.
3. Broken/inconsistent Research/Data Health/Scenario fragment links.
4. Duplicate visible Research headings and duplicate IDs where confirmed.

Do not redesign Edge Lab as part of this homepage task, but do not place an incomplete Market Odds experience in the homepage. If its company selector remains empty or output cannot be produced, hide/de-emphasise the link or place a transparent “in development” label according to existing product conventions. Do not fabricate results.

## Interaction and motion

Motion must communicate state:

- verified event: one restrained lime pulse
- stage change: a marker moves once between two stages
- drawer/card open: 160–260 ms transition
- caught-up completion: one restrained sweep

No continuous animations. No autoplay. No fake loading. No motion required to understand content.

Honor `prefers-reduced-motion` and preserve the existing Focus behavior.

## Accessibility

- One H1.
- Correct header/nav/main/footer landmarks.
- Skip-to-content remains functional.
- Complete keyboard operation for menu, search, drawers, tabs, watchlist, stage rail and evidence links.
- Visible focus on every interactive element.
- Minimum target size 44 × 44 CSS pixels.
- Body copy at least 16 px; essential metadata at least 12 px.
- Color is never the only representation of confidence, stage or direction.
- Decorative imagery has empty alt text; meaningful illustrative imagery uses manifest alt text plus disclosure.
- Screen-reader text describes delivery progress.
- Layout remains usable at 200% zoom.
- No keyboard trap except correctly managed modal focus containment.

## Performance and SEO

- Do not preload every image.
- Preload/high-priority only the active hero image.
- Set width/height or aspect ratio on every image.
- Use supplied responsive WebP assets and PNG fallback.
- Avoid client-rendering the entire hero if the framework supports server/static rendering.
- Do not introduce a heavy animation library solely for simple transitions.
- Preserve or improve metadata, canonical URL, Open Graph and structured data.
- The H1 and lead consequence must exist as crawlable HTML.
- Performance targets: LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1 at the 75th percentile when field data is available.

## Analytics

Use the existing analytics abstraction if present. Do not introduce a vendor without approval.

Instrument once per intentional action:

- `lead_story_why_it_matters_open`
- `lead_story_evidence_open`
- `delivery_stage_interact`
- `audience_lens_select`
- `project_card_open`
- `project_watch_toggle`
- `explainer_start`
- `explainer_complete`
- `briefing_item_open`
- `daily_set_complete`

Use stable entity/document IDs. Do not send raw notes, unrestricted search strings or personal information.

## Testing

Add or update tests for:

- lead story selection and honest fallback
- plain-English adapter does not overstate gates
- unknown/null display
- measurement-comparison guardrails
- exact/guided/unknown catalyst rendering
- image disclosures
- drawer focus management and Escape
- keyboard navigation and visible focus
- watchlist/review persistence
- all internal routes and fragments
- 404 recovery
- no horizontal overflow at 320, 375, 390, 768, 1024, 1280, 1366, 1440 and 1600 px
- reduced motion
- source links and safe new-tab behavior
- production build

Run:

- formatter
- lint
- typecheck
- unit tests
- integration/end-to-end tests
- production build

Do not suppress errors or weaken existing assertions merely to make the suite pass.

## Acceptance criteria

The work is complete only when:

1. A newcomer can explain T2C after reading the first screen: it tracks which AI-infrastructure promises become real delivery and revenue, with evidence.
2. One major story dominates the visual hierarchy.
3. The story explains consequence before technical detail.
4. Every visible project fact comes from existing T2C data.
5. Generated images are correctly disclosed as illustrative.
6. No page-level horizontal overflow exists at the tested sizes.
7. Keyboard and reduced-motion flows work.
8. The existing watchlist, reviewed state, search, filters, company/site pages, intelligence ledger, methodology, corrections and source links still work.
9. Research figures, source records and calculations are unchanged unless a separately documented, evidence-backed bug fix was required.
10. The production build and relevant tests pass.

## Final handoff

Provide:

- concise summary of the delivered experience
- changed-file list
- data adapters introduced
- confirmation of whether any research data or formulas changed
- commands run and exact results
- before/after screenshots at the four baseline viewports
- accessibility checks completed
- performance observations
- known limitations and follow-up issues

If you discover a conflict between the reference design and research integrity, preserve research integrity and document the visual compromise.
