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
 * A tracked stage is a link to real records. An untracked stage is a button that
 * explains the gap — it is not inert, but it does not pretend to lead anywhere
 * either, because there is nowhere honest for it to go.
 */
export function chainNode(stage) {
  /* Three states, not two. A stage is evidenced (T2C holds records), implied
     (it certainly happened, because a later stage is evidenced, but T2C does
     not track who did it), or unknown. Implied stages are illuminated — they
     happened — while still saying plainly that nobody is tracked behind them. */
  const cls = stage.happened === 'evidenced' ? 'is-evidenced'
    : stage.happened === 'implied' ? 'is-implied' : 'is-gap';

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
    <span class="cn-count">${esc(stage.count.primary)}</span>
    <span class="cn-sub">${esc(stage.count.secondary)}</span>`;

  const aria = stage.happened === 'implied'
    ? `${stage.label}. This stage must have happened, because ${stage.impliedBy} is evidenced. ` +
      `T2C does not track who supplies it. ${stage.role}`
    : `${stage.label}. ${stage.count.primary}, ${stage.count.secondary}. ${stage.role}`;

  return `<li class="cn-node ${cls}" data-stage="${esc(stage.id)}"
    style="${esc(opticsStyle(STEM_TO_ID[stage.asset] || stage.asset))}">
    ${stage.tracked
      ? `<a class="cn-hit press" href="${esc(stage.href)}" aria-label="${esc(aria)} Open the records.">${inner}</a>`
      : `<button type="button" class="cn-hit press" aria-expanded="false"
           aria-controls="cn-why-${esc(stage.id)}" aria-label="${esc(aria)} Explain this stage.">${inner}</button>`}
    <div class="cn-why" id="cn-why-${esc(stage.id)}" hidden>
      <p class="cn-plain">${esc(stage.plain)}</p>
      <p class="cn-role"><b>Who sells to whom.</b> ${esc(stage.role)}</p>
      ${stage.happened === 'implied'
        ? `<p class="cn-implied"><b>This happened.</b> Capacity cannot be billing unless this stage was
             completed — ${esc(stage.impliedBy)} is evidenced, so this is certain.
             <b>T2C does not track it:</b> ${esc(stage.needs)}</p>`
        : stage.needs
          ? `<p class="cn-needs"><b>Not tracked.</b> ${esc(stage.needs)}</p>`
          : `<p class="cn-tracked"><b>${esc(stage.count.primary)}</b> — ${esc(stage.count.secondary)}.</p>`}
    </div>
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
    <ol class="cn-track" aria-label="The AI supply chain, from materials to recognised revenue">
      ${stages.map(chainNode).join('')}
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
  return `<p class="cn-coverage">
    Every megawatt now billing depended on materials, wafers, chips and optics that were
    <b>certainly made</b> — you cannot bill for compute that was never built. T2C tracks
    <span class="cn-covfig">${cov.tracked} of ${cov.total}</span> stages, the delivery end,
    where it holds sourced records naming who did what. The upstream stages are shown as
    completed but untracked: no supplier, order or shipment record sits behind them.
    <a class="press" href="/methodology/#chain">What it would take to track them</a>
  </p>`;
}
