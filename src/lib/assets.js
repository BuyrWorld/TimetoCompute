/**
 * Illustrative image registry.
 *
 * Mirrors ASSET_MANIFEST.json from the asset pack. Every entry carries the alt
 * text and the disclosure the manifest specifies, so a component cannot render
 * one of these pictures without also having the words that say what it is.
 *
 * These are generated illustrations. None of them is a photograph of a named
 * project, and none is evidence of anything. The manifest's own rules —
 * no baked-in text, no baked-in logos, primary figures from live data only —
 * are the reason every claim on the page is HTML rather than pixels.
 */
export const ASSETS = [
  {
    id: 'hero-ai-campus-dusk',
    role: 'homepage lead story',
    intrinsic: { width: 1672, height: 941 },
    objectPosition: '64% 50%',
    alt: 'Illustrative aerial view of a large modern data-centre campus at dusk',
    disclosure: 'Illustrative image; not a photograph of the named project.'
  },
  {
    id: 'project-operational-campus',
    role: 'accepted, energised or billing project card',
    intrinsic: { width: 1672, height: 941 },
    objectPosition: '62% 54%',
    alt: 'Illustrative completed data-centre campus with electrical infrastructure at blue hour',
    disclosure: 'Illustrative image; not site evidence.'
  },
  {
    id: 'project-construction-campus',
    role: 'construction-stage project card',
    intrinsic: { width: 1672, height: 941 },
    objectPosition: '55% 52%',
    alt: 'Illustrative aerial view of a large data-centre campus under construction',
    disclosure: 'Illustrative image; not construction evidence for a named project.'
  },
  {
    id: 'project-power-community',
    role: 'power and communities editorial card',
    intrinsic: { width: 1672, height: 941 },
    objectPosition: '50% 50%',
    alt: 'Illustrative data-centre campus, electrical grid, renewable generation and nearby community',
    disclosure: 'Illustrative context image; do not infer a named project\'s energy mix or local impact.'
  },
  {
    id: 'explainer-ai-datacentre-cutaway',
    role: '60-second explainer',
    intrinsic: { width: 1672, height: 941 },
    objectPosition: '50% 50%',
    alt: 'Illustrative cutaway showing electricity, cooling, servers, networking and customer delivery in an AI data centre',
    disclosure: 'Educational illustration; stages and architecture vary by project.'
  }
];

export const ASSET = Object.fromEntries(ASSETS.map(a => [a.id, a]));
/** Convenience alias for the one image the homepage loads eagerly. */
ASSET.hero = ASSET['hero-ai-campus-dusk'];

/**
 * The responsive widths shipped for every image.
 *
 * 800/1200/1600 come from the pack. 1672 is the art's own native width, added
 * because the largest supplied derivative was smaller than the hero's CSS box on
 * any display at 1366px or wider on a 2x screen — the source was being enlarged
 * 1.7x at 1440 and 2.4x at 1920, which is what made it look soft.
 *
 * 1672 is the ceiling: it is the native resolution of the supplied art, so a
 * full-bleed hero is still upscaled above roughly 1670 device pixels. That is a
 * limit of the source image, not of the pipeline, and no derivative can invent
 * detail that was never rendered.
 */
export const ASSET_WIDTHS = [800, 1200, 1600];
export const ASSET_NATIVE_WIDTH = 1672;
export const ALL_ASSET_WIDTHS = [...ASSET_WIDTHS, ASSET_NATIVE_WIDTH];
