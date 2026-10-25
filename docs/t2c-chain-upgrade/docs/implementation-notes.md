# Implementation notes

## Priority order

If scope needs to be constrained, prioritise:

1. 12-stage data-driven structure
2. horizontal responsive navigation
3. selectable entities
4. dependency highlighting
5. detail drawer
6. deep links
7. command-search integration
8. bottleneck metadata

## Keep the chain readable

Several stages contain more names than should be shown at once.

Recommended behaviour:
- show the most representative 5–7 cards
- include a compact `+ N more` control
- expanding should not permanently distort every column
- preserve scroll position

## Existing company pages

If TimeToCompute already has company records:
- map chain entity IDs to existing company IDs
- do not create duplicate company records
- use the existing company route from the detail drawer

## Existing market data

If the repository already exposes:
- prices
- tickers
- market cap
- news
- catalysts

reuse those selectors/services/components.

Do not introduce a second API path just for the Chain.

## Mobile

Dependency diagrams are easy to make unusable on mobile.

Prefer:
- horizontally swipeable stage cards
- selected entity stays visible
- related entities become highlighted as the user swipes
- small upstream/downstream list inside the drawer

Avoid rendering dozens of long crossing SVG edges on a phone.

## New stage illustrations

The included SVGs are deliberately simple reference assets.
If the current T2C implementation uses rendered/isometric imagery, match that system instead of inserting visibly flat icons.


## Production artwork update

The original lightweight SVG placeholders for the three added stages are obsolete and have been removed.

Use the supplied raster masters and responsive derivatives. They deliberately mirror the repository's existing production convention: transparent 3D cutout, 1:1 normalized canvas, separate stage frame, 1280 PNG plus 768/384/192 WebP.

Do not create a second visual language for stages 5, 8, or 11.
