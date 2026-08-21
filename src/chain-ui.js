/**
 * Supply-chain components.
 *
 * Two rules from the asset pack, enforced here rather than remembered:
 *   - A stage cutout is `object-fit: contain` inside an aspect-ratio box. It is
 *     never stretched, never given an arbitrary width and height, and never
 *     displayed above the manifest's maximum recommended size.
 *   - No claim, figure or label lives inside a raster. Every word is HTML.
 *
 * And one from the data: a stage T2C cannot evidence is drawn as a declared gap,
 * not as a picture standing in for a record.
 */
import { esc } from './lib/format.js';
import { ART_BY_ID } from '../data/artpack.js';

/**
 * Responsive cutout asset — the one place a pack raster becomes an `<img>`.
 *
 * Everything it needs comes from the manifest (data/artpack.js): the widths that
 * actually exist on disk, the intrinsic dimensions that stop the layout shifting,
 * the alt text, and the ceiling above which the raster would upscale. Callers
 * pass only `sizes`, because only the caller knows how large its own box is.
 *
 * Passing an unknown id throws rather than emitting a broken `<img>` — a missing
 * asset should fail the build, not ship as a hole in the page.
 */
export function cutout(id, { sizes = '192px', eager = false, className = '', alt = null } = {}) {
  const a = ART_BY_ID[id];
  if (!a) throw new Error(`Unknown art asset: ${id}`);

  const srcset = a.widths.map(w => `${a.base}-${w}.webp ${w}w`).join(', ');
  // Cutouts ship a PNG fallback for the alpha; the editorial raster has none, so
  // its largest WebP is also its src.
  const fallback = a.fallbackWidth
    ? `${a.base}-${a.fallbackWidth}.png`
    : `${a.base}-${a.widths[a.widths.length - 1]}.webp`;

  return `<img class="cn-asset ${esc(className)}"
    src="${esc(fallback)}"
    srcset="${esc(srcset)}"
    sizes="${esc(sizes)}"
    width="${a.intrinsic[0]}" height="${a.intrinsic[1]}"
    alt="${esc(alt === null ? a.alt : alt)}"
    ${eager ? 'fetchpriority="high"' : 'loading="lazy" fetchpriority="low"'}
    decoding="async" />`;
}

/**
 * The optical correction, emitted as custom properties.
 *
 * Kept as an inline style rather than a class per stage: these are seven
 * different numbers from a data table, not seven design decisions, and a
 * stylesheet listing `.cn-node[data-stage="wafers"] { --asset-scale: .92 }`
 * seven times is the scattered per-asset CSS the pack forbids.
 */
export function opticsStyle(id) {
  const o = (ART_BY_ID[id] || {}).optics || { scale: 1, x: '0%', y: '0%' };
  return `--asset-scale:${o.scale};--asset-x:${o.x};--asset-y:${o.y}`;
}

/** Back-compat shim for callers that still pass a bare filename stem. */
const STEM_TO_ID = {
  'stage-materials': 'materials', 'stage-wafer': 'wafer', 'stage-chips-hbm': 'chips-hbm',
  'stage-photonics': 'photonics', 'stage-ai-factory': 'ai-factory',
  'stage-accepted': 'accepted', 'stage-revenue': 'revenue'
};

export function stageAsset(asset, alt, opts = {}) {
  return cutout(STEM_TO_ID[asset] || asset, { ...opts, alt: alt || '' });
}

/** The stage frame, as a themeable inline SVG so `currentColor` follows the state. */
const FRAME = `<svg class="cn-frame" viewBox="0 0 220 240" aria-hidden="true" focusable="false">
  <path d="M110 8 194 56v96l-84 48-84-48V56z" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M110 18 185 61v86l-75 43-75-43V61z" fill="none" stroke="currentColor" stroke-opacity=".22"/>
  <circle cx="110" cy="8" r="3.5" fill="currentColor"/>
</svg>`;

/**
 * One node in the chain.
 *
 * ALL SEVEN ARE NOW LINKS. They previously split: three linked to records, and
 * four were buttons opening an inline panel, on the reasoning that an untracked
 * stage had nowhere honest to lead. That reasoning was right about RECORDS and
 * wrong about the reader. There is always somewhere honest to lead — an
 * explanation of what the stage is — and a newcomer meeting this chain wants
 * that far more than a list of sites.
 *
 * So every node routes to its explainer, and the records link moves into the
 * node as a second, explicit action on the stages that have them. Keyboard order
 * still matches visual order, and no node leads to a page that does not exist.
 */
export function chainNode(stage, index = 0) {
  /* Three states, not two. A stage is evidenced (T2C holds records), implied
     (it certainly happened, because a later stage is evidenced, but T2C does
     not track who did it), or unknown. Implied stages are illuminated — they
     happened — while still saying plainly that nobody is tracked behind them. */
  /* Two classes, because these are two facts. `happened` says whether the stage
     occurred; `coverage` says how well T2C knows it. They were conflated, so a
     stage that certainly happened but has no supplier record was drawn dashed
     and captioned in amber — the visual language of a warning, for what is
     simply the site's stated scope. */
  const cls = (stage.happened === 'evidenced' ? 'is-evidenced'
    : stage.happened === 'implied' ? 'is-implied' : 'is-gap')
    + ` cov-${esc(stage.coverage || 'structural')}`;

  const mark = stage.happened === 'implied'
    ? `<span class="cn-impliedmark" aria-hidden="true" title="Must have happened">&#10003;</span>`
    : stage.happened === 'unknown'
      ? `<span class="cn-gapmark" aria-hidden="true">?</span>` : '';

  const inner = `
    <span class="cn-art" data-frame="${esc(stage.frame)}">
      ${FRAME}
      <span class="cn-cut">
        ${stageAsset(stage.asset, '', { sizes: '(min-width: 900px) 172px, (min-width: 640px) 148px, 132px' })}
      </span>
      ${mark}
    </span>
    <span class="cn-label">${esc(stage.label)}</span>
    <span class="cn-simple">${esc(stage.simple)}</span>
    <span class="cn-count">${esc(stage.count.primary)}</span>
    <span class="cn-sub">${esc(stage.count.secondary)}</span>
    ${/* WHAT A COMPRESSED HEXAGON CONTAINS. Five hexagons stand for ten
         canonical stages, and "AI Factory" alone covers power, cooling,
         construction and operators. Unnamed, those four read as absent from the
         site entirely — they were not, they were folded. Named here, the
         compression is visible instead of silent. */''}
    ${/* Always emitted, even when empty. The desktop layout is a subgrid and
         every node must contribute the same number of rows — a node that skips
         this element pushes its own affordance up a track and the row of seven
         stops aligning. Empty is invisible; absent is a broken grid. */''}
    <span class="cn-covers">${(stage.covers || []).length > 1
      ? esc(stage.covers.join(' · ')) : ''}</span>
    <span class="cn-what">What is this? <span aria-hidden="true">&rarr;</span></span>`;

  const covers = (stage.covers || []).length > 1
    ? ` Covers ${stage.covers.join(', ')}.` : '';
  const aria = stage.coverage === 'structural'
    ? `${stage.label}. ${stage.simple}.${covers} ${stage.count.primary} mapped here, with no ` +
      `sourced supplier record behind them yet. Read the explainer.`
    : `${stage.label}. ${stage.simple}.${covers} ${stage.count.primary}, ${stage.count.secondary}. ` +
      `Read the explainer.`;

  /* `--i` is the node's place in the sweep. The pulse that travels the chain is
     one animation staggered by index rather than seven hand-timed ones, so
     adding or reordering a stage cannot desync it. */
  return `<li class="cn-node ${cls}" data-stage="${esc(stage.id)}" style="--i:${index};${
    esc(opticsStyle(STEM_TO_ID[stage.asset] || stage.asset))}">
    <a class="cn-hit press" href="${esc(stage.explainerHref)}"
       aria-label="${esc(aria)}">${inner}</a>
    ${stage.tracked ? `<a class="cn-records press" href="${esc(stage.href)}">
      ${esc(stage.count.primary)} on file <span aria-hidden="true">&rarr;</span></a>` : ''}
  </li>`;
}

/**
 * The chain.
 *
 * On a phone this scrolls horizontally inside its own container rather than
 * shrinking seven nodes into illegibility — the one place the site allows a
 * sideways scroller, and it is labelled as such.
 */
export function chainTrack(stages) {
  return `<div class="cn-wrap">
    <ol class="cn-track" aria-label="The AI supply chain, from materials to recognised revenue"
      style="--cn-count:${stages.length}">
      ${stages.map((s, i) => chainNode(s, i)).join('')}
    </ol>
  </div>`;
}

/**
 * The flagship hero.
 *
 * Fixed proposition copy above the chain, then the day's real signal beside it
 * as Today's Chain Reaction. The headline is the product's argument; the card is
 * the evidence that the argument is being tracked.
 */
export function flagshipHero(stages, coverage, story) {
  return `<section class="fl-hero" aria-labelledby="fl-h1">
    <div class="fl-herotop">
      <div>
        <p class="ed-eyebrow">The physical race behind AI</p>
        <h1 class="fl-h1" id="fl-h1">Follow AI from atoms to revenue<span class="dot">.</span></h1>
        <p class="fl-lede">See who supplies what, where the bottlenecks are, what has actually
          shipped&mdash;and when infrastructure starts earning.</p>
        <div class="fl-acts">
          <a class="ed-cta primary press" href="/chain/">Explore the chain <span aria-hidden="true">&rarr;</span></a>
          <a class="ed-cta secondary press" href="/intelligence/?view=since-last-visit">
            See what changed <span aria-hidden="true">&rarr;</span></a>
        </div>

        <!-- The game is a way into the same subject for a reader who would
             bounce off a research page. It sits below the two primary actions
             rather than competing with them, and says plainly that it is a
             simulation so nobody mistakes it for the tracked record. -->
        <p class="fl-play">
          <a class="fl-playlink press" href="/time-machine/">
            <span class="fl-playglyph" aria-hidden="true">&#9654;</span>
            Play the AI Time Machine
          </a>
          <span class="fl-playnote">Five campaigns, 34 real turning points, fictional capital.
            Educational only.</span>
        </p>
      </div>

      ${story.available ? `<aside class="fl-reaction" aria-labelledby="fl-react-h">
        <p class="fl-reactkicker" id="fl-react-h">Today's chain reaction</p>
        <h2 class="fl-reacth">${esc(story.headline)}</h2>
        <p class="fl-reactsent">${esc(story.consequence)}</p>
        <div class="fl-reactfoot">
          <button type="button" class="ed-cta secondary press" id="whyBtn"
            aria-haspopup="dialog" aria-controls="whyDrawer">Why this matters</button>
          <span class="ed-badge" data-evidence="${esc(story.confidence)}">
            <span class="ed-icon" data-icon="verified-shield" aria-hidden="true"></span>
            High confidence &middot; Primary source
          </span>
        </div>
      </aside>` : ''}
    </div>

    ${chainTrack(stages)}
    ${chainCoverageNote(coverage)}
    ${chainStageGuide(stages)}
  </section>`;
}

/**
 * What actually happens at each stage.
 *
 * The chain is only an argument if a reader can follow it, and a row of labelled
 * hexagons explains nothing on its own. Each stage gets a sentence on what
 * happens there and a sentence on who sells to whom — which is what turns seven
 * icons into a supply chain.
 */
export function chainStageGuide(stages) {
  return `<div class="cn-guide">
    <h2 class="cn-guideh">What happens at each stage</h2>
    <ol class="cn-guidelist">
      ${stages.map((s, i) => `<li class="cn-guideitem ${s.happened === 'evidenced' ? 'is-evidenced'
        : s.happened === 'implied' ? 'is-implied' : 'is-gap'}">
        <span class="cn-guiden" aria-hidden="true">${i + 1}</span>
        <div class="cn-guidebody">
          <h3 class="cn-guidename">${esc(s.label)}
            <span class="cn-guidetag">${s.tracked ? 'Tracked by T2C' : 'Not tracked'}</span>
          </h3>
          <p class="cn-guideplain">${esc(s.plain)}</p>
          <p class="cn-guiderole">${esc(s.role)}</p>
        </div>
      </li>`).join('')}
    </ol>
  </div>`;
}

/**
 * The coverage line.
 *
 * It has to hold two ideas at once: the whole chain certainly happened, and T2C
 * only tracks the end of it. Saying only the second implies the first is in
 * doubt, which is false.
 */
export function chainCoverageNote(cov) {
  /* THIS LINE WAS AN APOLOGY, AND IT HAD ALSO GONE FALSE.
     It read "the other 3 are shown as completed but untracked: no supplier,
     order or shipment record sits behind them", which told a first-time reader
     the site covered a fraction of its own subject. It stopped being true when
     the canonical model landed 43 node types across those stages, each with a
     description and real dependencies — "nothing sits behind them" describes a
     chain that no longer exists.

     The accurate framing is a scope, stated plainly: the whole chain is mapped,
     and the sourced detail is at the delivery end. Both counts are derived, so
     neither can drift from the data the way the sentence they replace did. */
  return `<p class="cn-coverage">
    Every megawatt now billing depended on materials, wafers, chips and optics that were
    <b>certainly made</b> — you cannot bill for compute that was never built. T2C maps the
    whole chain, <span class="cn-covfig">${cov.nodeTypes} node types</span> across
    ${cov.stages} stages, and holds sourced supplier records at the delivery end: the
    optics, the operators, the sites and the billing. Upstream is mapped and described
    without a supplier record, and says so rather than claiming one.
    <a class="press" href="/methodology/#chain">How the chain is tracked</a>
  </p>`;
}
