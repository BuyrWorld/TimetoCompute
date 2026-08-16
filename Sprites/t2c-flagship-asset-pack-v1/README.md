# TimeToCompute Flagship Asset Pack v1

This pack translates the four approved T2C mockups into reusable production assets and implementation rules. The reference mockups establish art direction only. They must never be stretched across the live site or embedded as a replacement for real HTML.

## What is included

- Nine transparent, high-detail 3D stage-object masters.
- Normalised 1280px PNGs and 768/384/192 WebP derivatives.
- Vector T2C logo, favicon, node frames, icon sprites and backgrounds.
- SVG/CSS animated chain flow, optical pulses, completion and loading states.
- Responsive React component examples.
- A standalone interactive `preview.html`.
- Design-system, animation, asset-manifest and implementation documentation.
- A comprehensive `CLAUDE_CODE_PROMPT.md` for the existing repository.

## Start here

1. Open `preview.html` to inspect the production assets in context.
2. Read `DESIGN_SYSTEM.md` and `IMPLEMENTATION_GUIDE.md`.
3. Give Claude Code the repository, this entire folder and `CLAUDE_CODE_PROMPT.md`.
4. Instruct Claude to retain the relative contents of `assets/` when copying them into the application public directory.

## Non-negotiable image rule

The PNG masters must be rendered with `object-fit: contain`, explicit dimensions and an aspect-ratio container. Never force both width and height to arbitrary values. The 3D cutouts are deliberately separate from the vector frames so the frames remain perfectly sharp and the objects never stretch.

Recommended stage-object maximums:

- Homepage node: 180 CSS px.
- Large supplier-position diagram: 320 CSS px.
- AI-factory feature: 560 CSS px.
- Server-rack feature: 420 CSS px.

At larger sizes, use the master PNG and do not upscale beyond its useful native detail.

## Font recommendation

- Display and timing labels: **Barlow Condensed**, weights 600–800.
- Body and UI: **Inter**, weights 400–700.
- Use tabular numerals for dates, capacity and progress.

If the repository already uses an equivalent licensed pair, preserve it only if the result remains visually faithful.

## Production warning

The example signal copy in `preview.html` is illustrative. Do not replace production information with it. Relationship states must remain evidence-backed: confirmed, ecosystem and inferred are distinct.
