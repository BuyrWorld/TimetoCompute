# TimeToCompute Chain Upgrade Package

This package is intended to be dropped into the TimeToCompute repository and handed to Claude Code.

## Contents

- `CLAUDE_CODE_PROMPT.md`
  - Master implementation brief for the 12-stage interactive chain.
- `data/chain-seed.json`
  - Structured 12-stage seed data.
- `assets/raster/`
  - Native production-grade 3D masters for the three new structural stages.
- `assets/responsive/`
  - 1:1 transparent responsive derivatives matching the repository asset-pack convention.
- `ASSET_MANIFEST_CHAIN_UPGRADE.md`
  - Human-readable asset mapping.
- `ASSET_MANIFEST_CHAIN_UPGRADE.json`
  - Machine-readable asset mapping.
- `docs/relationship-rules.md`
  - Relationship/evidence rules.
- `docs/implementation-notes.md`
  - Integration notes.

## Important asset rule

The previous generic SVG placeholders have been removed.

The repository's existing flagship pack uses detailed transparent 3D cutouts and separate vector stage frames. These new assets now follow that same approach. Do not flatten them into icons or bake them into a new hexagon treatment.

## Recommended use

1. Copy this package into the repository, e.g. `docs/t2c-chain-upgrade/`.
2. Open Claude Code at the repository root.
3. Ask it to read `docs/t2c-chain-upgrade/CLAUDE_CODE_PROMPT.md`.
4. Tell it to inspect the existing flagship asset pack before implementation.
5. Copy the new raster/responsive files into the same logical production asset location used by the current stage assets.
6. Review relationship edges before release.

Company membership in a stage is not equivalent to a verified commercial relationship.
