# TimeToCompute Audience-Led Homepage Pack

This pack implements the editorial direction shown in `reference/homepage-visual-concept.png`:

> **The physical race behind AI — major companies, megaprojects, money, verified progress, upcoming catalysts and what each development means.**

The design is aimed primarily at retail investors following AI-infrastructure companies, then technology followers and intelligent newcomers. It leads with a recognisable consequence and places T2C's technical evidence underneath.

## Start here

1. Copy `public/assets/t2c/` into the website's public/static asset directory without changing filenames.
2. Give `CLAUDE_CODE_PROMPT.md` to Claude Code with the real T2C repository open.
3. Tell Claude to inspect the repository and adapt the prompt to the existing framework instead of rebuilding the site from scratch.
4. Use `COPY_DECK.md`, `COMPONENT_SPEC.md`, `design-tokens.css` and `ASSET_MANIFEST.json` as implementation sources.
5. Treat every generated image as illustrative. Project claims, customer names, dates, amounts and evidence states must remain live HTML sourced from T2C's existing records.

## Pack contents

```text
TimeToCompute_Audience_Led_Asset_Pack/
├── ASSET_MANIFEST.json
├── CLAUDE_CODE_PROMPT.md
├── COMPONENT_SPEC.md
├── COPY_DECK.md
├── DATA_CONTRACT.ts
├── IMPLEMENTATION_CHECKLIST.md
├── README.md
├── design-tokens.css
├── public/assets/t2c/
│   ├── icons/
│   └── images/
└── reference/
    └── homepage-visual-concept.png
```

## Image usage

Each image has an original PNG and 800/1200/1600-pixel WebP variants. Prefer a semantic `<picture>` or framework image component. Only the hero should load eagerly.

Suggested mapping:

| Asset | Placement |
|---|---|
| `hero-ai-campus-dusk` | Lead story/hero |
| `project-operational-campus` | Accepted, energised or billing project card |
| `project-construction-campus` | Building-stage project card |
| `project-power-community` | Power/community editorial lens |
| `explainer-ai-datacentre-cutaway` | 60-second newcomer explainer |

Never describe a generated illustration as a photograph of a named site. Use the disclosure strings in `ASSET_MANIFEST.json`.

## Fonts

The design tokens prefer Barlow Condensed, Inter and IBM Plex Mono, but no font binaries are included because font licensing and repository conventions must be checked first. Reuse compatible fonts already in the project or self-host properly licensed files.

## Non-negotiable product rule

This pack changes presentation—not research truth. Do not alter figures, source links, measurement bases, stage definitions, corrections, calculations or unknown values merely to fit the design.
