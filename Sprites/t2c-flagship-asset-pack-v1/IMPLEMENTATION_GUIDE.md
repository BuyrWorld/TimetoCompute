# Implementation Guide

## 1. Copy assets without changing their identity

Copy `assets/` into an application path such as `public/assets/t2c/`. Preserve filenames. If the project uses a CDN or image pipeline, map the same logical paths rather than renaming assets during the first implementation.

Do not copy `reference-mockups/` into the production public directory.

## 2. Import the visual system

Import `styles/t2c-tokens.css`, then adapt `styles/t2c-components.css` into the project’s existing styling approach. Do not introduce Tailwind, CSS modules or another framework solely because the example CSS uses plain classes.

The existing application architecture wins; the asset pack provides tokens and behaviour.

## 3. Use responsive cutouts correctly

Recommended React pattern is in `components/ResponsiveStageAsset.tsx`.

Required rules:

```css
.asset-box {
  position: relative;
  aspect-ratio: 1;
}
.asset-box picture,
.asset-box img {
  width: 100%;
  height: 100%;
}
.asset-box img {
  object-fit: contain;
  object-position: center;
}
```

Never use the reference homepage screenshot as a background. Never apply `object-fit: fill`. Never set unrelated fixed width and height values on a production asset.

## 4. Art direction by viewport

- Desktop homepage: seven-node horizontal chain.
- Tablet: horizontally scrollable chain with visible next-node cue.
- Mobile Today: finite change cards and vertical Chain Reaction.
- Mobile Supply Chain: one selected stage plus upstream/downstream neighbours. Open the full graph as a dedicated landscape/focus experience.

Do not shrink the desktop screenshot or graph to fit mobile.

## 5. Vector frames and icons

- Use static coloured stage frames as external image backgrounds.
- Use `stage-frame-template.svg` inline through the project’s SVG loader when dynamic colour is required.
- Inline the sprite files once and render icons with `<svg><use href="#icon-id" /></svg>`.
- Do not import the whole sprite repeatedly per card.

## 6. Animation

Import `assets/animated/t2c-motion.css`. Use the standalone SVG animations where a self-contained asset is sufficient. If recreating them in Motion or the project animation library, preserve the durations and reduced-motion behaviour in `docs/ANIMATION_SPEC.md`.

Do not ship GIF versions.

## 7. Evidence graph

Relationship edges must be data driven:

- `confirmed`: solid edge, evidence count and source drawer.
- `ecosystem`: dotted edge, partner/ecosystem wording.
- `inferred`: dashed faint edge and unconfirmed label.
- `risk`: amber overlay; not a relationship type.

Selecting a node must expose its evidence and commercial stage. It must not silently imply that the selected company is a supplier to every downstream company shown.

## 8. Performance

- Preload only the real above-the-fold LCP asset.
- Load 192/384 WebP nodes by default; larger derivatives only when layout demands them.
- Lazy-load assets below the fold.
- Set intrinsic `width` and `height` to prevent CLS.
- SVG backgrounds should not be duplicated as base64 data URIs.
- Use the PNG master only for large features or when transparent WebP is unsupported by the project’s target browsers.

## 9. Verification sizes

Check at 390×844, 430×932, 768×1024, 1366×768, 1440×900, 1920×1080, 2560×1440 and 3840×2160.

At every size verify:

- No object distortion.
- No unintended crop.
- No low-resolution source enlarged beyond its useful size.
- No text baked into a raster stage asset.
- Graph labels remain readable.
- Drawers and cards fit the viewport.
- Keyboard focus and reduced motion work.
