# TimeToCompute Flagship Research Product Asset Pack v2

This bundle turns the approved T2C homepage, explainer, AI News and Financials mockups into an implementation-ready system.

The pack is deliberately split into:

- production artwork that can ship;
- code-native SVG, CSS and component examples;
- reference mockups that must never be shipped as page backgrounds;
- content and data contracts;
- an interactive centring, responsive and motion preview;
- a staged implementation plan;
- one master Claude Code prompt.

## Give Claude this first

Ask Claude Code to read `00_READ_FIRST.md` before inspecting or changing application code. It defines the authoritative reading order, safety rules and implementation gates.

## Preview

Open `preview.html` locally. It provides:

- every homepage and Photonics cutout on the real dark UI background;
- a hexagon centring lab with scale and glow controls;
- responsive-size comparisons;
- live SVG/CSS motion demonstrations;
- the current website, earlier concepts and approved v2 references;
- per-page asset lists and copyable paths.

## Included production assets

- Seven homepage chain-stage cutouts, plus server-rack and power/cooling supporting assets.
- Six Photonics component cutouts: InP substrate, CW laser, EML, 1.6T transceiver, CPO and optical fibre.
- One wide AI News optical-network feature image.
- Responsive WebP derivatives.
- T2C brand marks, hexagon frames, technical backgrounds and UI icon sprites.
- CSS/SVG motion for chain flow, optical pulses, loading, progress, quote freshness and financial charts.

## Reference hierarchy

1. `reference-mockups/v2/` — target hierarchy and visual direction.
2. `reference-mockups/current-site/` — existing content and defects to preserve/fix.
3. `reference-mockups/earlier-concepts/` — broader product language and prior decisions.

## Non-negotiable image rule

Never stretch a mockup or stage cutout. Every isolated object uses a square art stage, `object-fit: contain`, `object-position: 50% 50%` and a small data-driven optical offset only when required.

## Data warning

Mockup stories, prices and financial figures are examples. Production routes must use real sourced data or an honest unavailable/loading state. Never hard-code a changing share price into explainer copy.

## Main files

- `00_READ_FIRST.md`
- `CLAUDE_CODE_PROMPT.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/PAGE_ASSET_MAP.md`
- `docs/CENTERING_AND_RESPONSIVE.md`
- `docs/DATA_AND_TRUST.md`
- `docs/MOTION_AND_INTERACTION.md`
- `ASSET_MANIFEST_V2.json`
- `preview.html`
