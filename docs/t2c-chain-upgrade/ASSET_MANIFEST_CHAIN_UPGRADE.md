# Chain Upgrade Asset Manifest

These three assets replace the earlier generic SVG placeholders.

They follow the existing TimeToCompute asset-pack rules:

- production artwork is a transparent 3D cutout;
- the stage/hex frame stays separate;
- the normalized production canvas is 1:1;
- responsive derivatives are `1280 PNG`, `768 WebP`, `384 WebP`, and `192 WebP`;
- render with `object-fit: contain`, never `fill`.

## New stage artwork

| Stage | Master | Responsive prefix |
|---|---|---|
| 5 — Servers, racks & networking | `assets/raster/stage-servers-racks-networking-master-1536x1024.png` | `assets/responsive/stage-servers-racks-networking-*` |
| 8 — Data-centre owners & developers | `assets/raster/stage-datacentre-owners-master-1536x1024.png` | `assets/responsive/stage-datacentre-owners-*` |
| 11 — Models & AI platforms | `assets/raster/stage-models-platforms-master-1254.png` | `assets/responsive/stage-models-platforms-*` |

## Existing repo artwork to preserve

Do not redraw the existing high-quality stages. Reuse the repository's current masters/derivatives where they fit, including:

- `stage-materials-*`
- `stage-wafer-*`
- `stage-photonics-*`
- `stage-chips-hbm-*`
- `stage-power-cooling-*`
- `stage-server-rack-*`
- `stage-ai-factory-*`

The new assets should be integrated beside those assets, not used to replace the established visual system.
