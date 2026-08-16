/**
 * The v2 asset manifest, as data.
 *
 * WHY THIS FILE EXISTS, rather than the numbers living in CSS:
 *
 * Every cutout in the pack is an isolated object photographed against nothing.
 * Their silhouettes differ — a wafer is a wide ellipse, a fibre spool is a tall
 * cylinder, a crystal cluster is a ragged pyramid — and each was exported with
 * different transparent margins. Dropping seven such files into seven identical
 * hexagons and expecting them to look centred is the mistake the pack calls out:
 * it treats the `<img>` box as though it were the object.
 *
 * So each asset carries a `scale` and an optical `x`/`y` nudge, applied as CSS
 * custom properties on the node. That keeps the correction in one reviewable
 * table instead of scattered through stylesheets as one-off margins, which is
 * the thing the pack explicitly forbids. `scripts/centring.js` measures the
 * result against the alpha bounding box and fails the build's visual pass if an
 * object drifts, so these numbers cannot silently rot.
 *
 * Values start from ASSET_MANIFEST_V2.json (pack v2.0.0, 2026-08-16). Where a
 * value below differs from the shipped manifest, it is because the automated
 * lab measured the object still off-centre with the manifest number and the
 * correction is recorded beside it. The manifest supplies the scales; the
 * offsets are measured, because an offset is a fact about where the pixels
 * landed and is not improved by being guessed.
 *
 * `maxCssWidth` is a hard ceiling: displaying above it upscales the raster.
 */

/** Default optics, so an asset without a manifest entry still renders sanely. */
const DEFAULT_OPTICS = { scale: 1, x: '0%', y: '0%' };

const A = (id, o) => ({ id, optics: DEFAULT_OPTICS, kind: 'transparent-cutout', ...o });

/**
 * Seven chain stages. `base` is the responsive filename stem; the widths are the
 * WebP derivatives that exist on disk, with a PNG fallback at `fallbackWidth`.
 */
export const STAGE_ART = [
  A('materials', {
    base: '/assets/t2c/responsive/stage-materials', widths: [192, 384, 768],
    fallbackWidth: 1280, intrinsic: [1280, 1280], maxCssWidth: 180,
    alt: 'Cluster of semiconductor and electronics raw materials',
    optics: { scale: 0.88, x: '-3.3%', y: '4.5%' }  // measured: mass sat right and high
  }),
  A('wafer', {
    base: '/assets/t2c/responsive/stage-wafer', widths: [192, 384, 768],
    fallbackWidth: 1280, intrinsic: [1280, 1280], maxCssWidth: 180,
    alt: 'Patterned semiconductor wafer',
    optics: { scale: 0.92, x: '-3.3%', y: '1%' }    // measured: mass sat right of centre
  }),
  A('chips-hbm', {
    base: '/assets/t2c/responsive/stage-chips-hbm', widths: [192, 384, 768],
    fallbackWidth: 1280, intrinsic: [1280, 1280], maxCssWidth: 180,
    alt: 'AI processor and high-bandwidth-memory package',
    optics: { scale: 0.86, x: '0%', y: '1%' }
  }),
  A('photonics', {
    base: '/assets/t2c/responsive/stage-photonics', widths: [192, 384, 768],
    fallbackWidth: 1280, intrinsic: [1280, 1280], maxCssWidth: 480,
    alt: 'Optical networking engine',
    optics: { scale: 0.88, x: '-5%', y: '3%' }      // measured: worst drift in the row
  }),
  A('ai-factory', {
    base: '/assets/t2c/responsive/stage-ai-factory', widths: [192, 384, 768],
    fallbackWidth: 1280, intrinsic: [1280, 1280], maxCssWidth: 560,
    alt: 'AI data-centre campus',
    optics: { scale: 0.82, x: '0%', y: '3%' }
  }),
  A('accepted', {
    base: '/assets/t2c/responsive/stage-accepted', widths: [192, 384, 768],
    fallbackWidth: 1280, intrinsic: [1280, 1280], maxCssWidth: 180,
    alt: 'Customer acceptance symbol',
    optics: { scale: 0.84, x: '-3.3%', y: '0%' }    // measured: mass sat right of centre
  }),
  A('revenue', {
    base: '/assets/t2c/responsive/stage-revenue', widths: [192, 384, 768],
    fallbackWidth: 1280, intrinsic: [1280, 1280], maxCssWidth: 180,
    alt: 'Revenue recognition growth symbol',
    optics: { scale: 0.84, x: '3.2%', y: '1.5%' }   // measured: mass sat left and high
  })
];

/**
 * Six photonics component cutouts.
 *
 * New in v2 and not yet displayed anywhere: they belong to the Photonics
 * explainer, which is a later phase. They are declared here so the manifest is
 * complete and so the build's asset check can prove they exist on disk before
 * anything references them.
 *
 * The pack ships no optics for these. Rather than invent seven plausible-looking
 * numbers, they inherit the neutral default and will be measured by
 * `scripts/centring.js` when a page first renders them.
 */
export const PHOTONICS_ART = [
  A('inp-substrate', {
    base: '/assets/t2c/responsive/photonics/inp-substrate', widths: [192, 384, 768, 1024],
    intrinsic: [1254, 1254], maxCssWidth: 480,
    alt: 'Indium phosphide semiconductor wafer'
  }),
  A('cw-laser', {
    base: '/assets/t2c/responsive/photonics/cw-laser', widths: [192, 384, 768, 1024],
    intrinsic: [1254, 1254], maxCssWidth: 480,
    alt: 'Continuous-wave semiconductor laser package'
  }),
  A('eml', {
    base: '/assets/t2c/responsive/photonics/eml', widths: [192, 384, 768, 1024],
    intrinsic: [1254, 1254], maxCssWidth: 480,
    alt: 'Electro-absorption modulated laser module'
  }),
  A('transceiver-1-6t', {
    base: '/assets/t2c/responsive/photonics/transceiver-1-6t', widths: [192, 384, 768, 1024],
    intrinsic: [1254, 1254], maxCssWidth: 480,
    alt: '1.6-terabit optical transceiver module'
  }),
  A('cpo', {
    base: '/assets/t2c/responsive/photonics/cpo', widths: [192, 384, 768, 1024],
    intrinsic: [1254, 1254], maxCssWidth: 480,
    alt: 'Co-packaged optics assembly with central switch chip and surrounding optical engines'
  }),
  A('optical-fibre', {
    base: '/assets/t2c/responsive/photonics/optical-fibre', widths: [192, 384, 768, 1024],
    intrinsic: [1254, 1254], maxCssWidth: 480,
    alt: 'Spool of data-centre optical fibre with connectors'
  })
];

/**
 * The one wide editorial raster in the pack.
 *
 * It is a photograph of optical fibre, not of any named project, and the pack is
 * explicit that it must only illustrate genuinely photonics-related material —
 * a generic image reused for an unrelated story is a small dishonesty that the
 * rest of the site's evidence rules would never permit.
 */
export const EDITORIAL_ART = [
  A('optical-network-signal', {
    kind: 'editorial-raster',
    base: '/assets/t2c/responsive/news/optical-network-signal', widths: [400, 640, 1000, 1400],
    /* The manifest states a 1600px ceiling, but the widest derivative shipped is
       1400px and the only larger file is a 1.6 MB PNG master no news page should
       download. Displaying at 1600 would upscale, so the ceiling is the widest
       thing that actually exists. */
    intrinsic: [1672, 941], maxCssWidth: 1400,
    alt: 'Optical fibre connections carrying illuminated data into network transceiver ports',
    restriction: 'Photonics-related material only. Never a generic story image.'
  })
];

export const ART = [...STAGE_ART, ...PHOTONICS_ART, ...EDITORIAL_ART];
export const ART_BY_ID = Object.fromEntries(ART.map(a => [a.id, a]));

/** Aspect ratio, so a caller can reserve the right box before the image loads. */
export const aspectOf = a => a.intrinsic[0] / a.intrinsic[1];
