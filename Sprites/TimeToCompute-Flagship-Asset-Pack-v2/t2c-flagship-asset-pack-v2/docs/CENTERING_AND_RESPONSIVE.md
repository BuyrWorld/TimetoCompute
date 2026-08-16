# Perfect centring and responsive asset rules

The current misalignment is caused by treating objects with different silhouettes and transparent bounds as though their `<img>` boxes were comparable.

## Required DOM

```tsx
<Link className="chain-node" href={stage.href}>
  <span className="chain-node__hex" aria-hidden="true" />
  <span className="chain-node__asset-stage">
    <ResponsiveCutout asset={stage.asset} alt="" />
  </span>
  <span className="chain-node__copy">…</span>
</Link>
```

## Required CSS

```css
.chain-node {
  --asset-scale: 1;
  --asset-x: 0%;
  --asset-y: 0%;
  --asset-glow: rgba(199, 255, 0, .36);
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(5rem, auto);
  justify-items: center;
  min-width: 0;
  text-decoration: none;
}

.chain-node__hex {
  grid-area: 1 / 1;
  width: 100%;
  max-width: 10.75rem;
  aspect-ratio: 1;
  background: url('/assets/t2c/svg/stages/stage-frame-lime.svg') center / contain no-repeat;
}

.chain-node__asset-stage {
  grid-area: 1 / 1;
  align-self: center;
  justify-self: center;
  width: min(72%, 8rem);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  overflow: visible;
  pointer-events: none;
}

.chain-node__asset-stage picture,
.chain-node__asset-stage img {
  width: 100%;
  height: 100%;
}

.chain-node__asset-stage img {
  display: block;
  object-fit: contain;
  object-position: 50% 50%;
  transform: translate(var(--asset-x), var(--asset-y)) scale(var(--asset-scale));
  transform-origin: center;
  filter: brightness(1.08) contrast(1.06) drop-shadow(0 0 12px var(--asset-glow));
}
```

## Data-driven optical correction

Only use these values after placing the normalised assets in the common square stage:

```ts
export const stageOptics = {
  materials: { scale: .88, x: '0%', y: '2%' },
  wafers: { scale: .92, x: '0%', y: '0%' },
  'chips-hbm': { scale: .86, x: '0%', y: '1%' },
  photonics: { scale: .88, x: '0%', y: '0%' },
  'ai-factory': { scale: .82, x: '0%', y: '3%' },
  accepted: { scale: .84, x: '0%', y: '0%' },
  revenue: { scale: .84, x: '0%', y: '0%' },
} as const;
```

Do not fix individual assets with arbitrary margins scattered through CSS.

## Brightness rule

Every node image remains readable. State is communicated by frame colour, glow, border and label—not by reducing an inactive asset below `opacity: .72`. Hover/focus may increase brightness by at most 12%.

## Responsive image pattern

```tsx
<picture>
  <source
    type="image/webp"
    srcSet={`${base}-192.webp 192w, ${base}-384.webp 384w, ${base}-768.webp 768w`}
    sizes="(max-width: 640px) 132px, (max-width: 1100px) 148px, 172px"
  />
  <img
    src={`${base}-1280.png`}
    width={1280}
    height={1280}
    alt={alt}
    loading={priority ? 'eager' : 'lazy'}
    decoding="async"
    fetchPriority={priority ? 'high' : 'auto'}
  />
</picture>
```

Only the real LCP image is eager. All other stage and explainer images are lazy.

## Breakpoints

- `>= 1280px`: seven equal desktop nodes.
- `768–1279px`: horizontal scroll-snap rail with an obvious next item.
- `< 768px`: focused node carousel or vertical stage list; never shrink seven nodes into unreadable miniatures.

## QA

At 390, 430, 768, 1024, 1366, 1440, 1920, 2560 and 3840 widths verify:

- identical visual centres;
- no crop or stretch;
- no checkerboard or white rectangle;
- no raster upscale beyond the manifest limit;
- labels wrap consistently;
- 44px minimum interactive targets;
- keyboard focus remains visible.

