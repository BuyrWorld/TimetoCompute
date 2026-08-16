# Asset Manifest

## Detailed raster masters

| Asset | Native size | Alpha | Intended use | Maximum recommended display |
|---|---:|:---:|---|---:|
| `stage-materials-master-1254.png` | 1254×1254 | Yes | Materials stage/detail | 520px |
| `stage-wafer-master-1536x1024.png` | 1536×1024 | Yes | Wafer detail | 600px wide |
| `stage-chips-hbm-master-1254.png` | 1254×1254 | Yes | Chips/HBM stage/detail | 520px |
| `stage-photonics-master-1254.png` | 1254×1254 | Yes | Photonics stage/detail | 520px |
| `stage-ai-factory-master-1254.png` | 1254×1254 | Yes | AI factory hero/detail | 560px |
| `stage-accepted-master-1254.png` | 1254×1254 | Yes | Acceptance stage | 420px |
| `stage-revenue-master-1254.png` | 1254×1254 | Yes | Revenue-recognised stage | 420px |
| `stage-server-rack-master-1024x1536.png` | 1024×1536 | Yes | Rack/system detail | 420px wide |
| `stage-power-cooling-master-1254.png` | 1254×1254 | Yes | Power/cooling stage | 520px |

Every master has clean alpha transparency. The normalised `assets/responsive/*-1280.png` versions share a 1:1 canvas and are designed for interchangeable stage-node placement.

## Responsive derivatives

Each stage has:

- `*-1280.png`: transparent lossless fallback and high-density source.
- `*-768.webp`: large card/feature image.
- `*-384.webp`: standard node/card image.
- `*-192.webp`: mobile/compact node image.

Use `srcset` and `sizes`; do not load 1280px PNGs into every small node.

## Vector assets

| Asset | Purpose | Integration |
|---|---|---|
| `t2c-logo-horizontal.svg` | Primary header logo | `<img>` or inline |
| `t2c-mark.svg` | Compact header/mobile mark | `<img>` or inline |
| `t2c-favicon.svg` | Browser/PWA icon source | Favicon pipeline |
| `stage-frame-neutral.svg` | Neutral stage frame | Background or inline |
| `stage-frame-cyan.svg` | Photonics/active frame | Background or inline |
| `stage-frame-lime.svg` | Confirmed/completed frame | Background or inline |
| `stage-frame-amber.svg` | Bottleneck/risk frame | Background or inline |
| `stage-frame-template.svg` | Themeable frame | Import inline/SVGR so `currentColor` works |
| `stage-icons.svg` | Compact stage icon sprite | Inline sprite `<use>` |
| `t2c-icons.svg` | UI icon sprite | Inline sprite `<use>` |
| `t2c-grid.svg` | Work-area grid texture | CSS background |
| `t2c-circuit-map.svg` | Hero ambient texture | CSS background |
| `t2c-optical-waves.svg` | Supplier-page photonics header | CSS background |
| `t2c-og-template.svg` | 1200×630 share template | Export through existing metadata pipeline |

## Animated assets

| Asset | Purpose | Trigger |
|---|---|---|
| `chain-flow.svg` | Supply-chain travel pulse | Hero/live mode |
| `optical-pulse.svg` | Photonics link | Active photonics route |
| `completion-ring.svg` | Caught-up state | User completes daily set |
| `loading-chain.svg` | Evidence/graph loading | Async route/data load |
| `t2c-motion.css` | Reusable CSS motion classes | Imported once |

Do not convert these animations to GIF. SVG/CSS keeps them crisp and enables reduced-motion support.

## Reference mockups

The files in `reference-mockups/` are art-direction references only. They contain example data and should never be shipped as interface imagery.
