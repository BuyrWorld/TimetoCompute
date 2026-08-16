# Claude Code implementation prompt

Copy everything below this line into Claude Code.

---

You are Claude Code working inside my existing TimeToCompute project.

PROJECT PATH:
`C:\Users\joshu\OneDrive\Desktop\T2C`

REFERENCE PACK:
`C:\Users\joshu\OneDrive\Desktop\T2C\T2C_UI_Mission_Control_Pack`

Read these files before changing code:

- `T2C_UI_Mission_Control_Pack/README.md`
- `T2C_UI_Mission_Control_Pack/DESIGN_SYSTEM.md`
- `T2C_UI_Mission_Control_Pack/INTERACTION_MAP.md`

Inspect these visual references carefully:

- `T2C_UI_Mission_Control_Pack/references/01-home-mission-control.png`
- `T2C_UI_Mission_Control_Pack/references/02-company-intelligence.png`
- `T2C_UI_Mission_Control_Pack/references/03-site-intelligence.png`

## Mission

Restyle and refine the existing TimeToCompute website into the premium “Mission Control for AI infrastructure” product shown in the references.

The result should feel like:

**Formula 1 timing screen × institutional infrastructure underwriting × restrained strategy-game feedback.**

It must be visually exciting and rewarding for a user with ADHD, while remaining calm, highly legible and easy to re-enter after distraction. Use instant feedback, finite progress, strong hierarchy and progressive disclosure. Do not create a chaotic animated dashboard.

Implement the homepage and the connected company, site and intelligence experiences. Every homepage control which looks pressable must perform a real action or navigate to a real page. Every interactive control must give a restrained lime glow when clicked or keyboard-activated.

## Phase 1 — inspect before editing

First inspect the existing project and report a concise implementation plan before making changes:

1. Identify the framework, router, styling approach, component system and state/data layer.
2. Locate the existing homepage, company pages, site pages, intelligence/news pages, logo, image assets and data models.
3. List current canonical routes and reuse them. Do not create duplicate routes simply to match the fallback paths in `INTERACTION_MAP.md`.
4. Identify which homepage controls already work and which are currently decorative.
5. Find existing tests, lint/build commands and responsive conventions.
6. Check for existing uncommitted work and preserve it.

Do not replace the framework, router or data layer. Do not rewrite the entire application. Build on the existing codebase and extract reusable components where helpful.

## Product and visual rules

- Preserve the existing T2C brand, logo and product purpose.
- Use the reference screenshots as the authoritative visual target.
- Use near-black and charcoal-green panels with sharp lime used sparingly for action, progress and selected state.
- Use Archivo for headings and IBM Plex Mono for data labels/numerals if these fonts are already present; otherwise load them efficiently through the project's established font method.
- Use subtle borders, deep black shadows and 12–16px rounded panels.
- Maintain accessible contrast and comfortable text size.
- Give each screen one dominant focal point and no more than three major visual regions.
- No moving market ticker.
- No crypto/neon aesthetic.
- No generic admin-template appearance.
- No giant marketing hero image.
- No endless feed on Today. The daily signal set must be finite and show reviewed/remaining progress.
- Use existing real data. Never hard-code the example figures from the mockups as if they were live facts.
- If real data is unavailable, show a truthful `—`, “Unavailable” or a clearly labelled demo/development state.

## Required shared shell

Create or refine a reusable application shell containing:

- T2C logo linked to the homepage.
- Navigation: Today, Companies, Sites and Intelligence.
- Active-route underline and `aria-current="page"`.
- Search/command-palette trigger with a keyboard shortcut hint.
- User/preferences menu if account functionality exists.
- Persistent Live / Focus toggle.
- Responsive mobile navigation using the existing project pattern.

Use semantic links for navigation and semantic buttons for local actions.

## Homepage — Today / Mission Control

Match `01-home-mission-control.png` closely while adapting it to the real project.

Required modules:

1. **Today's Signal**
   - One large daily number or headline.
   - One plain-English explanation.
   - Evidence confidence.
   - One primary CTA: “Show Me What Changed”.
   - CTA opens the real since-last-visit view or the intelligence feed filtered to those changes.

2. **Since Last Visit**
   - Finite rows for advanced milestones, slipped deadlines, new contracts or the closest real categories supported by current data.
   - Each row is pressable and routes to the correctly filtered intelligence view.
   - Store the last successful visit timestamp only after the current session has rendered, so the comparison window is not accidentally erased.

3. **Infrastructure Map**
   - Use the user's existing data-centre and vehicle assets where available.
   - Keep animation inside the map.
   - Site hotspots open the corresponding site intelligence page.
   - Vehicle/event clicks open a concise popover with a real next action.
   - Map zoom and focus controls must work.
   - The full map surface can navigate to the Sites explorer without stealing clicks from hotspots.

4. **Your Watchlist**
   - Each company row opens the canonical company intelligence page.
   - Watch/unwatch actions update immediately and handle failure safely.
   - Include a real “View all watchlist” destination.

5. **Daily Signal Progress**
   - Show a finite reviewed/remaining count.
   - Each progress node opens its signal without losing the user's position.
   - “View All Signals” opens the complete daily signal set.
   - When complete, show a calm “You're caught up” state instead of manufacturing more content.

6. **Live / Focus**
   - Live mode enables restrained map/event movement.
   - Focus mode pauses decorative movement and hides secondary metrics while preserving the current investigation.
   - Persist the preference locally.

## Company pages

Use `02-company-intelligence.png` as the visual target for the company template and connect directory cards to it.

Required company-page modules, using only supported real data:

- Company identity and watch state.
- T2C Reality Score or a clearly labelled unavailable/methodology state if not yet implemented.
- Horizontal Path to Billing: announced → power secured → construction → energised → GPU install → acceptance → billing.
- Capacity Truth: announced, verified, energised and billing.
- What Changed: finite concise events with source access.
- Reality Score breakdown: promise delivery, evidence quality, timeline stability and financing.
- Contract X-Ray: firm versus optional value, prepayment, acceptance requirements and material risk factors.

Each milestone, changed event, score factor and contract section must be expandable or navigable. Do not leave visual affordances inert.

## Site pages

Use `03-site-intelligence.png` as the visual target for individual sites and connect map hotspots/site-directory entries to this template.

Required site modules:

- Site identity, location, owner/operator, customer where confirmed, capacity and evidence confidence.
- Interactive site visual using existing data-centre assets.
- Site Status milestone ladder.
- Clear next milestone/action.
- Latest Evidence with working source link.
- Dependencies: power/grid, cooling, networking, customer and other supported constraints.
- Site Replay showing the site's documented progression over time.
- Live / Focus behaviour consistent with the homepage.

Do not imply literal real-time telemetry unless the underlying data is actually real-time. Use “latest verified status” when that is more accurate.

## Companies, Sites and Intelligence directory pages

The top navigation must never lead to empty placeholders.

- **Companies:** searchable, filterable cards with Reality Score, delivery-stage summary and watch state where supported.
- **Sites:** searchable/filterable map and list; cards open individual site pages.
- **Intelligence:** finite daily signals with filters for advanced, slipped, contract and evidence changes; reviewed state must persist.

If an equivalent page already exists, restyle and connect it rather than creating a second version.

## Click-glow interaction system

Create one reusable interaction primitive or utility and apply it consistently to:

- Navigation links.
- Primary and secondary buttons.
- Pressable rows.
- Pressable cards.
- Map hotspots and map controls.
- Watchlist entries.
- Signal progress nodes.
- Tabs and Live / Focus controls.

Required behaviour:

- Hover: subtle lime border and small bloom over 160–200ms.
- Pointer or keyboard press: scale to approximately `0.985`, show a bright but controlled lime border/bloom, then settle over approximately 340ms.
- Selected/active state: retain a subtle lime inner border or underline, not a large permanent glow.
- Use `:focus-visible` for an obvious keyboard focus ring.
- Enter and Space must receive the same feedback as pointer clicks.
- Navigation must happen immediately; never delay routing just to finish the glow.
- Prevent glow animation from causing layout shift.
- Prevent double activation.
- For `prefers-reduced-motion: reduce`, remove scale and travelling animation but keep a static high-contrast pressed/selected state.

Prefer CSS pseudo-classes/keyframes and the project's existing motion library. Do not add a heavy animation dependency solely for this effect.

Suggested visual values are provided in `DESIGN_SYSTEM.md`; adapt them to the existing token system instead of creating a competing theme architecture.

## Interaction correctness

- Every visible arrow, chevron, row, card, tab, hotspot and CTA must be audited.
- If it looks interactive, make it interactive.
- If no valid action exists, remove the affordance or render a clearly disabled state with a reason.
- Nested buttons inside linked cards must not trigger both actions.
- Back navigation must restore the previous scroll/filter context.
- Loading and error states must be designed, not left as raw text.
- External evidence links must be identifiable and safe.
- Do not use `div` click handlers where a link or button is appropriate.

## ADHD-friendly behaviour

- Preserve the user's place and investigation trail.
- Provide a “Continue where you left off” entry when the current data model supports it.
- Use short labels, visible section purpose and clear next actions.
- Reveal secondary detail inline or in a stable drawer rather than unexpectedly replacing the whole context.
- Avoid autoplay outside the map.
- Avoid infinite scrolling on primary workflows.
- Do not use streak punishment, artificial urgency or attention-grabbing notification spam.

## Responsive and performance requirements

- Desktop should closely match the supplied 16:9 references.
- Tablet stacks hero/summary modules without shrinking text.
- Mobile uses a single column, compact sticky navigation and 44px minimum touch targets.
- Keep the map responsive with a fixed aspect ratio and usable controls.
- Avoid cumulative layout shift.
- Lazy-load heavy map imagery below the initial viewport when appropriate.
- Keep animations transform/opacity based and smooth.
- Preserve or improve the existing performance budget.

## Accessibility requirements

- Maintain accessible contrast.
- All controls have accessible names.
- Status is never communicated by colour alone.
- Keyboard navigation and logical focus order work throughout.
- Dialogs trap and restore focus correctly.
- Honour `prefers-reduced-motion`.
- Use visible focus indicators.
- Ensure zoom to 200% remains usable.

## Verification

After implementation:

1. Run the existing formatter, typecheck, lint, unit tests and production build.
2. Fix errors introduced by this work; do not hide them with broad disables.
3. Test every route and every homepage control listed in `INTERACTION_MAP.md`.
4. Test pointer, Enter and Space activation and confirm the glow works consistently.
5. Test reduced-motion behaviour.
6. Test desktop, tablet and mobile layouts.
7. Check for console errors, broken source links, nested-click bugs and layout shifts.
8. Compare screenshots against all three references and refine spacing, hierarchy, typography and lime usage.
9. Report exactly which files changed, which routes were connected, what tests passed and any honest limitations caused by missing data/assets.

## Definition of done

The task is complete only when:

- The homepage visually matches the Mission Control direction.
- Companies, Sites and Intelligence navigation lead to useful working pages.
- Company cards/watchlist entries lead to functioning company pages.
- Site hotspots/cards lead to functioning site pages.
- Every pressable-looking homepage element works.
- Click and keyboard activation produce the controlled lime glow.
- Live / Focus works and persists.
- Real data and existing business logic are preserved.
- The site is responsive, accessible and builds successfully.

Proceed carefully, preserve existing functionality and make the finished product feel cohesive, premium and unmistakably TimeToCompute.

