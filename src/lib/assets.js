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

/** The responsive widths shipped for every image. */
export const ASSET_WIDTHS = [800, 1200, 1600];
