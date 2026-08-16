#!/usr/bin/env bash
set -euo pipefail

pack_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
failed=0

if command -v jq >/dev/null 2>&1; then
  jq empty "$pack_dir/ASSET_MANIFEST_V2.json"
else
  echo "WARN: jq is unavailable; JSON syntax was not checked"
fi

for image_path in "$pack_dir"/assets/raster/photonics/*.png; do
  dimensions="$(identify -format '%wx%h' "$image_path")"
  channels="$(identify -format '%[channels]' "$image_path")"
  corner="$(identify -format '%[pixel:p{0,0}]' "$image_path")"
  if [[ "$dimensions" != "1254x1254" ]]; then
    echo "FAIL dimensions: $image_path ($dimensions)"
    failed=1
  fi
  if [[ "$channels" != *a* ]]; then
    echo "FAIL alpha channel: $image_path ($channels)"
    failed=1
  fi
  if [[ "$corner" != *",0)"* && "$corner" != *",0.0)"* ]]; then
    echo "FAIL transparent corner: $image_path ($corner)"
    failed=1
  fi
done

required_refs=(
  "reference-mockups/v2/01-homepage-centered-clickable.png"
  "reference-mockups/v2/02-what-is-photonics.png"
  "reference-mockups/v2/03-ai-news.png"
  "reference-mockups/v2/04-financials.png"
  "reference-mockups/current-site/2026-08-16-homepage.png"
  "reference-mockups/earlier-concepts/01-original-homepage-concept.png"
  "reference-mockups/earlier-concepts/02-original-chain-explorer.png"
  "reference-mockups/earlier-concepts/03-original-company-passport.png"
  "reference-mockups/earlier-concepts/04-original-mobile-concept.png"
)

for relative_path in "${required_refs[@]}"; do
  if [[ ! -s "$pack_dir/$relative_path" ]]; then
    echo "FAIL missing reference: $relative_path"
    failed=1
  fi
done

if rg -n "reference-mockups" "$pack_dir/components" "$pack_dir/data" "$pack_dir/styles" >/dev/null; then
  echo "FAIL production example imports a reference mockup"
  failed=1
fi

if [[ "$failed" -ne 0 ]]; then
  exit 1
fi

echo "PASS: manifest, alpha cutouts and visual references validated"

