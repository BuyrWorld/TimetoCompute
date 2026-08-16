# Read this first — Claude Code handoff

You are working inside the existing TimeToCompute repository. This pack is a design and implementation source, not a replacement application.

## Required reading order

Read these files completely, in order, before editing the application:

1. `00_READ_FIRST.md`
2. `README.md`
3. `CLAUDE_CODE_PROMPT.md`
4. `docs/IMPLEMENTATION_PLAN.md`
5. `docs/CENTERING_AND_RESPONSIVE.md`
6. `docs/PAGE_ASSET_MAP.md`
7. `docs/DATA_AND_TRUST.md`
8. `docs/MOTION_AND_INTERACTION.md`
9. `docs/PHOTONICS_SUPPLIER_SEED.md`
10. `DESIGN_SYSTEM.md`
11. `ASSET_MANIFEST_V2.json`

Then open `preview.html` and inspect all four tabs. Finally inspect the visual references in the priority order documented in `docs/REFERENCE_PRIORITY.md`.

## Before changing code

1. Read every repository and directory instruction file.
2. Inspect the framework, router, styling, data layer, API routes, tests, analytics and authentication.
3. Run the current application, typecheck, lint, tests and production build.
4. Record baseline failures before introducing changes.
5. Locate the current homepage chain and identify the exact cause of its centring, dimness and scaling defects.
6. Preserve unrelated user changes.

## Absolute rules

- Do not ship any file from `reference-mockups/` as page artwork or a background.
- Do not replace real content with example text shown in a mockup.
- Do not invent suppliers, customer relationships, orders, prices, dates or financial figures.
- Do not hard-code live prices in static page data.
- Do not infer that a company is a direct supplier merely because it operates in the same market.
- Do not use `object-fit: fill`.
- Do not replatform the repository without explicit approval.
- Do not stop after planning: implement the agreed phase, verify it and report the evidence.

## First implementation gate

Complete Phase 0 and Phase 1 from `docs/IMPLEMENTATION_PLAN.md`, then show:

- the diagnosed image defect;
- the proposed route/component map;
- the baseline and post-foundation test results;
- screenshots of the real application at desktop and mobile widths.

Continue to the next phase unless a genuine product-data decision or destructive migration requires user approval.
