/**
 * Chain Mapping components.
 *
 * The map is a server-rendered SVG graph: hexagonal nodes over curved links,
 * positioned by `chainGeometry()` so the arithmetic can be tested rather than
 * only looked at. It is in the document at first paint, every node is a
 * focusable `role="button"` carrying its own `<desc>`, and the list view beside
 * it carries the same records as ordinary HTML. Nothing is drawn on a canvas —
 * a canvas map would be invisible to search, to a screen reader and to print.
 *
 * THE CENTRING CONTRACT still holds, in SVG terms: a node's label stack is
 * placed from the node's own centre point and is NEVER nudged per node. The
 * single-maker ring is a separate, larger polygon around the body rather than a
 * change to the body, so a flag appearing cannot resize or reposition the hex.
 */
import { esc, date } from './lib/format.js';
import { RELATIONSHIPS, CONFIDENCES, MATURITIES } from '../data/chainmap.js';
import { STAGE_BY_ID } from '../data/chainmap.js';
import { TIERS } from '../data/chainreference.js';
import { sourcesFor, hexPoints } from './lib/chainmap.js';

const ICON = '/assets/t2c/chain-mapping/chain-mapping-icons.svg';
export const icon = (name, size = 20) =>
  `<svg class="cm-icon" width="${size}" height="${size}" aria-hidden="true">` +
  `<use href="${ICON}#icon-${esc(name)}"></use></svg>`;

/* --------------------------------------------------------------- toolbar ---- */

export function workspaceHeader({ architecture, architectures, projects, projectId }) {
  return `<header class="cm-head">
    <div class="cm-headtitle">
      <p class="cm-eyebrow">Time to Compute</p>
      <h1 class="cm-h1">Chain mapping</h1>
    </div>

    <!-- This was a "Project / product" dropdown listing every operator. It
         filtered nothing: choosing IREN changed no pixel, and the only
         acknowledgement was a screen-reader message sighted readers never got.
         A control that looks like a filter and is not one teaches a reader that
         either the tool is broken or every operator's chain is identical.

         The gap is a missing capability, not a missing control, so it is
         stated the way the two untracked pillars in the rail are stated
         rather than dressed up as a working filter. -->
    <div class="cm-headproject">
      <p class="cm-helper">Trace every dependency. Verify every commercial step.</p>
      <p class="cm-scope">
        <span class="cm-scopetag">Whole map</span>
        Showing all ${projects.length} tracked operators. Filtering to one project needs
        project-level supplier records, which T2C does not hold.
        <a class="press" href="/methodology/#chain">What it would take</a>
      </p>
    </div>

    <div class="cm-headarch">
      <p class="cm-archlabel" id="cm-arch-h">${icon('compare', 15)} Architecture view</p>
      <div class="cm-seg" role="group" aria-labelledby="cm-arch-h">
        ${architectures.map(a => `<button type="button" class="cm-segbtn${
          a.id === architecture ? ' is-on' : ''}" data-arch="${esc(a.id)}"
          aria-pressed="${a.id === architecture}">
          ${esc(a.label)}${a.qualifier ? `<span class="cm-segq">${esc(a.qualifier)}</span>` : ''}
        </button>`).join('')}
      </div>
      <p class="cm-archsummary" id="cmArchSummary">
        ${esc(architectures.find(a => a.id === architecture).summary)}</p>
    </div>
  </header>`;
}

/* ------------------------------------------------------------------ rail ---- */

/**
 * Trace modes, pillar filters, display toggles and the legend.
 *
 * A `<details>` rather than an `<aside>`, so it is a permanent rail on a desktop
 * and a collapsed bottom sheet on a phone. At 390px this stack ran 400–500px
 * before any chain content appeared, which on an 844px viewport meant scrolling
 * past every control to reach the thing the controls act on.
 *
 * IT SHIPS OPEN, and the script closes it on a narrow viewport. The tempting
 * version — ship it closed and re-open it with CSS above 640px — does not work,
 * and fails silently: a closed <details> gives its non-summary children a ZERO
 * SIZE box whatever `display` they are given, so the desktop rail rendered with
 * every control at 0×0. Scripted clicks still hit it, which is why only a real
 * pointer-driven check caught it.
 *
 * Shipping open means a reader with no JavaScript gets the expanded rail on a
 * phone — exactly what they get today, so nothing regresses; they simply do not
 * gain the sheet.
 *
 * The a11y trade is deliberate and worth naming: `<aside>` was an implicit
 * landmark. `<details>` is not, but it exposes open/closed state instead, which
 * is what a disclosure widget should announce. Nothing inside changes.
 */
export function filterRail({ traceModes, traceMode, pillars, pillar, showInferred }) {
  return `<details class="cm-rail" open>
    <summary class="cm-railsummary">Trace &amp; filters</summary>
    <div class="cm-railinner">
    <section class="cm-railblock" aria-labelledby="cm-trace-h">
      <h2 class="cm-railh" id="cm-trace-h">Trace by</h2>
      <div class="cm-tracelist" role="group" aria-labelledby="cm-trace-h">
        ${traceModes.map(t => `<button type="button" class="cm-trace${
          t.id === traceMode ? ' is-on' : ''}" data-trace="${esc(t.id)}"
          aria-pressed="${t.id === traceMode}" title="${esc(t.definition)}">
          ${icon(t.id, 17)} ${esc(t.label)}</button>`).join('')}
      </div>
    </section>

    <section class="cm-railblock" aria-labelledby="cm-pillar-h">
      <h2 class="cm-railh" id="cm-pillar-h">Filter pillars</h2>
      <div class="cm-pillarlist" role="group" aria-labelledby="cm-pillar-h">
        ${pillars.map(p => `<button type="button" class="cm-pillar${
          p.id === pillar ? ' is-on' : ''}${p.tracked ? '' : ' is-untracked'}"
          data-pillar="${esc(p.id)}" aria-pressed="${p.id === pillar}"
          ${p.tracked ? '' : 'disabled aria-disabled="true"'}
          title="${esc(p.tracked ? p.definition : p.definition + ' — ' + p.needs)}">
          ${icon(p.id === 'photonics' ? 'photonics' : p.id === 'hbm-packaging' ? 'hbm' : 'power', 16)}
          <span>${esc(p.label)}</span>
          ${p.tracked ? '' : '<span class="cm-pillarnote">Not tracked</span>'}
        </button>`).join('')}
      </div>
      <p class="cm-railnote">Two pillars carry no sourced supplier record, so they are shown as
        untracked rather than hidden. <a class="press" href="/methodology/#chain">Why</a></p>
    </section>

    <section class="cm-railblock" aria-labelledby="cm-inf-h">
      <h2 class="cm-railh" id="cm-inf-h">Display</h2>
      <label class="cm-switch">
        <input type="checkbox" id="cmInferred"${showInferred ? ' checked' : ''} />
        <span class="cm-switchtrack" aria-hidden="true"></span>
        <span class="cm-switchlabel">Structural links</span>
      </label>
      <label class="cm-switch">
        <input type="checkbox" id="cmFlow" checked />
        <span class="cm-switchtrack" aria-hidden="true"></span>
        <span class="cm-switchlabel">Animate flow</span>
      </label>

      <!-- The legend is the contract between the drawing and the reader. It
           names the two TIERS a node can have and the two kinds of link, because
           those four things are the only vocabulary the map uses. -->
      <ul class="cm-legend" role="list">
        <li><i class="cm-swatch cm-swatch--evidenced" aria-hidden="true"></i>
          <b>T2C record</b><span>A sourced maker, with its document</span></li>
        <li><i class="cm-swatch cm-swatch--reference" aria-hidden="true"></i>
          <b>Reference</b><span>Industry structure, example companies</span></li>
        <li><i class="cm-line cm-line--direct" aria-hidden="true"></i>
          <b>Agreement</b><span>Two named companies, named and dated</span></li>
        <li><i class="cm-line cm-line--structural" aria-hidden="true"></i>
          <b>Dependency</b><span>This feeds that. Not who sells to whom</span></li>
      </ul>
    </section>

    <button type="button" class="cm-reset" id="cmReset">${icon('reset', 15)} Reset view</button>
    </div>
  </details>`;
}

/* ------------------------------------------------------------------- map ---- */

/**
 * The graph.
 *
 * An SVG of hexagonal nodes over curved links, rendered on the server so it is
 * in the document at first paint — searchable, printable and visible without a
 * script. Only zoom, pan, tracing and the drawer need JavaScript.
 *
 * TWO LINK SHAPES, BECAUSE THEY CLAIM TWO DIFFERENT THINGS. A thin curve between
 * two hexes is a named agreement between those two companies; T2C holds one. A
 * wide faint band between two columns is structural — this column feeds the next
 * — and it deliberately stops short of every node so it can never be read as a
 * line arriving at a particular box. The legend says which is which, and the
 * shapes are different enough that they cannot be confused at a glance.
 */
export function chainMapCanvas(graph, geo, flags = {}) {
  const { singleMakers = [], mode = graph.architecture } = flags;
  const single = new Set(singleMakers);
  const ns = `cm-${mode}`;

  const bands = geo.links.filter(l => l.kind === 'band');
  const fans = geo.links.filter(l => l.kind === 'fan');
  const edges = geo.links.filter(l => l.kind === 'edge');

  /* The column headings live INSIDE the scroller, beside the map they label.
     Left outside it they stayed put while the map scrolled under them, so at
     narrow widths the map's third column sat under the heading for its first. */
  return `<div class="cm-canvas">
    <div class="cm-zoomwrap" data-pan>
      <div class="cm-colhead" aria-hidden="true">
        ${graph.columns.map(c => `<div class="cm-ch${c.empty ? ' is-empty' : ''}">
          <span>${esc(c.label)}</span><b>${esc(c.definition)}</b></div>`).join('')}
      </div>

      <svg class="cm-svg" data-map viewBox="0 0 ${geo.width} ${geo.height}"
        preserveAspectRatio="xMidYMin meet" role="group"
        aria-label="Dependency map: ${graph.nodes.length} nodes across five columns">

        <defs>
          <marker id="${ns}-flow" viewBox="0 0 10 10" refX="8" refY="5"
            markerUnits="userSpaceOnUse" markerWidth="15" markerHeight="15"
            orient="auto-start-reverse">
            <path class="cm-bandhead" d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
          <marker id="${ns}-flowbreak" viewBox="0 0 10 10" refX="8" refY="5"
            markerUnits="userSpaceOnUse" markerWidth="15" markerHeight="15"
            orient="auto-start-reverse">
            <path class="cm-bandhead is-broken" d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>

        <g class="cm-guides" aria-hidden="true">
          ${geo.columnBox.slice(1).map(c =>
            `<line x1="${c.x0}" y1="0" x2="${c.x0}" y2="${geo.height}" />`).join('')}
        </g>

        <g class="cm-bands" aria-hidden="true">
          ${bands.map(b => `<path class="cm-band${b.broken ? ' is-broken' : ''}"
            d="${b.d}" data-from-col="${esc(b.fromColumn)}" data-to-col="${esc(b.toColumn)}"
            marker-end="url(#${ns}-${b.broken ? 'flowbreak' : 'flow'})">
            <title>${esc(b.label)}</title></path>`).join('')}
        </g>

        <g class="cm-fans" aria-hidden="true">
          ${fans.map((f, i) => `<g class="cm-edge is-structural is-fan"
            data-edge="${esc(f.id)}" data-a="${esc(f.from)}" data-to-col="${esc(f.toColumn)}">
            <path id="${ns}-${esc(f.id)}" class="cm-edgeline" d="${f.d}"
              marker-end="url(#${ns}-flow)" />
            ${flowDot(`${ns}-${esc(f.id)}`, i + 40, true)}
            <title>${esc(f.label)}</title>
          </g>`).join('')}
        </g>

        <g class="cm-edges">
          ${edges.map((e, i) => `<g class="cm-edge${e.structural ? ' is-structural' : ''}"
            data-edge="${esc(e.id)}" data-a="${esc(e.from)}" data-b="${esc(e.to)}"
            data-rel="${esc(e.relationship)}">
            <path id="${ns}-${esc(e.id)}" class="cm-edgeline" d="${e.d}" />
            <circle class="cm-edgedot" cx="${e.x2}" cy="${e.y2}" r="2.6" />
            ${flowDot(`${ns}-${esc(e.id)}`, i, e.structural)}
            <title>${esc(e.label)}</title>
          </g>`).join('')}
        </g>

        ${graph.columns.filter(c => c.empty).map(c => {
          const box = geo.columnBox.find(b => b.id === c.id);
          return emptyColumnPlate(box, c.emptyReason, geo.height);
        }).join('')}

        <g class="cm-hexes">
          ${graph.nodes.map((n, i) => hexNode(n, geo.pos[n.id], i, mode, single.has(n.id))).join('')}
        </g>
      </svg>
    </div>

    <div class="cm-hud" data-hud aria-live="off"></div>
  </div>`;
}

/**
 * The travelling dot that shows which way a dependency runs.
 *
 * `animateMotion` along the edge's own path, so the dot follows the curve
 * exactly rather than approximating it, and the duration is derived from the
 * edge's index so the whole map does not pulse in lockstep.
 *
 * This is the ONE piece of ambient motion on the page and it is switched off
 * entirely under `prefers-reduced-motion` and by the flow toggle — the animation
 * conveys direction, which the arrowheads and the drawer also state, so nothing
 * is lost when it stops.
 */
function flowDot(pathId, index, structural) {
  const dur = (2.8 + (index % 5) * 0.42).toFixed(2);
  const begin = ((index % 7) * 0.38).toFixed(2);
  return `<circle class="cm-flow${structural ? ' is-structural' : ''}" r="2.6">
    <animateMotion dur="${dur}s" repeatCount="indefinite" begin="${begin}s">
      <mpath href="#${pathId}" />
    </animateMotion>
  </circle>`;
}

/** An empty column, drawn as a dashed plate that states why it is empty. */
function emptyColumnPlate(box, reason, height) {
  const words = String(reason).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 30) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w;
  }
  lines.push(cur.trim());
  const h = lines.length * 15 + 38;
  const top = height / 2 - h / 2;
  /* NOT aria-hidden. Why a column is empty is the most important sentence on
     this map, and hiding it from assistive technology would leave a screen
     reader with a column that simply has no nodes — indistinguishable from a
     rendering fault. `aria-label` carries the unwrapped sentence, because SVG
     has no text wrapping and the visible version is split across <text> lines. */
  return `<g class="cm-emptyplate" role="note" aria-label="${esc(reason)}">
    <rect x="${box.cx - 104}" y="${top}" width="208" height="${h}" rx="4" aria-hidden="true" />
    <text class="cm-emptymark" x="${box.cx}" y="${top + 23}" text-anchor="middle"
      aria-hidden="true">—</text>
    ${lines.map((l, i) =>
      /* The trailing space keeps the words apart when the lines are copied or
         concatenated — without it the text reads "accelerator,switch". */
      `<text class="cm-emptyline" x="${box.cx}" y="${top + 42 + i * 15}"
        text-anchor="middle" aria-hidden="true">${esc(l)} </text>`).join('')}
  </g>`;
}

/**
 * One hexagonal node.
 *
 * The label wraps to two lines when it has to, measured on character count
 * rather than nudged by hand — SVG has no text wrapping, so the alternative is
 * a label that silently overflows its hex on the longest name in the set.
 */
function hexNode(n, p, index, mode, isSingle) {
  if (!p) return '';
  const rel = RELATIONSHIPS[n.relationship] || RELATIONSHIPS.unknown;
  const conf = CONFIDENCES[n.confidence] || CONFIDENCES.unverified;
  const mat = MATURITIES[n.maturity] || MATURITIES.unknown;
  const stage = n.commercialStage ? STAGE_BY_ID[n.commercialStage] : null;
  const descId = `cm-nodedesc-${esc(mode)}-${esc(n.id)}`;
  /* An operator's node title IS its company name, so printing both stacked
     "IREN Limited / IREN Limited" — two lines saying one thing. The second line
     earns its space only when it adds a fact the first does not. */
  const org = n.org && n.org !== n.title ? n.org : '';

  /* THE CENTRING CONTRACT, in SVG. Rows are collected first, then laid out from
     the node's own centre using their own heights. Nothing is nudged per node,
     and a node that drops its org line recentres instead of leaving a hole
     where the line would have been. */
  const words = String(n.title).split(' ');
  const half = Math.ceil(words.length / 2);
  const rows = [];
  if (n.title.length > 17 && words.length > 1) {
    rows.push({ cls: 'cm-hexlabel', text: words.slice(0, half).join(' '), h: 12 });
    rows.push({ cls: 'cm-hexlabel', text: words.slice(half).join(' '), h: 12 });
  } else {
    rows.push({ cls: 'cm-hexlabel', text: n.title, h: 12 });
  }
  if (org) rows.push({ cls: 'cm-hexorg', text: org, h: 11 });
  /* A reference node says REFERENCE, not its relationship grade. Showing
     "ECOSYSTEM" there would put it in the same vocabulary as a node T2C actually
     holds a record for, and the whole point of the tier is that they are not
     the same kind of claim. */
  rows.push(n.tier === 'reference'
    ? { cls: 'cm-hextier', text: TIERS.reference.short, h: 11 }
    : { cls: 'cm-hexrel', text: rel.label.toUpperCase(), h: 11, rel: n.relationship });

  const stackH = rows.reduce((a, r) => a + r.h, 0);
  let cursor = p.y - stackH / 2;
  const label = rows.map(r => {
    cursor += r.h;
    return `<text class="${r.cls}" x="${p.x}" y="${cursor - 2}" text-anchor="middle"${
      r.rel ? ` data-rel="${esc(r.rel)}"` : ''}>${esc(r.text)}</text>`;
  }).join('');

  return `<g class="cm-hexg" data-node="${esc(n.id)}" data-column="${esc(n.column)}"
      data-pillar="${esc(n.pillar)}" data-rel="${esc(n.relationship)}"
      data-maturity="${esc(n.maturity)}" data-single="${isSingle}"
      data-org="${n.org ? 'yes' : 'no'}" data-tier="${esc(n.tier)}"
      tabindex="0" role="button" aria-describedby="${descId}"
      aria-label="${esc(n.title)}${n.org ? ', ' + esc(n.org) : ''}"
      style="--cm-hex-delay:${index * 26}ms">
    ${isSingle
      ? `<polygon class="cm-hexsingle" points="${hexPoints(p.x, p.y, 160, 70)}" />`
      : ''}
    <polygon class="cm-hexhalo" points="${hexPoints(p.x, p.y, 157, 67)}" />
    <polygon class="cm-hexbody" points="${hexPoints(p.x, p.y)}" />
    ${label}
    <desc id="${descId}">${esc(TIERS[n.tier].label)}. ${esc(n.simple || n.technical)}.${
      n.tier === 'reference'
        ? ` Example companies: ${esc((n.examples || []).join(', '))}. ${esc(TIERS.reference.definition)}`
        : ` Relationship ${esc(rel.label)}, evidence ${esc(conf.label)}, maturity ${esc(mat.label)}${
            stage ? `, commercial stage ${esc(stage.label)}` : ', no commercial stage on record'}${
            isSingle ? '. One maker on file' : ''}.`}</desc>
  </g>`;
}

/**
 * The view controls.
 *
 * These sit OUTSIDE the canvas, not inside it. When they lived inside, switching
 * to the list view hid the canvas and took the list toggle with it — leaving no
 * way back to the map. A control that can disable itself is a trap.
 */
export function mapControls() {
  return `<div class="cm-controls" role="group" aria-label="Map view controls">
    <button type="button" class="cm-ctl" data-ctl="zoomin" aria-label="Zoom in">${icon('plus', 16)}</button>
    <button type="button" class="cm-ctl" data-ctl="zoomout" aria-label="Zoom out">${icon('minus', 16)}</button>
    <button type="button" class="cm-ctl" data-ctl="fit" aria-label="Fit and reset zoom">${icon('fit', 16)}</button>
    <button type="button" class="cm-ctl" data-ctl="list" aria-label="Switch to list view"
      aria-pressed="false">${icon('list', 16)}</button>
  </div>
  <p class="cm-live" aria-live="polite"></p>`;
}

/**
 * The list alternative.
 *
 * Not a fallback — the same information as a table, which is the only form some
 * readers can use at all, and the only form that survives a text-only export.
 */
/**
 * The list view — a table on a desktop, cards on a phone.
 *
 * BOTH ARE SERVER-RENDERED and CSS picks one at 640px, following the shell's
 * own `.mainnav` / `.bottomnav` convention. Building the cards in JavaScript
 * would break this page's stated contract that every node is real HTML a reader
 * can reach without a script — and on mobile the cards are now the DEFAULT
 * surface, so that reader would get nothing at all.
 *
 * THE TIER COLUMN IS NOT DECORATION. Without it a REFERENCE row — industry
 * structure naming example companies — is indistinguishable from a row T2C
 * holds a document for. The graph has carried that badge since the tier system
 * landed; the list never did, which made it the one surface where the
 * distinction silently vanished. It is also the surface a text-only export or a
 * screen reader is most likely to use.
 */
export function chainMapList(graph) {
  const rows = graph.columns.flatMap(c => c.nodes.map(n => ({
    c, n,
    rel: RELATIONSHIPS[n.relationship] || RELATIONSHIPS.unknown,
    conf: CONFIDENCES[n.confidence] || CONFIDENCES.unverified,
    mat: MATURITIES[n.maturity] || MATURITIES.unknown,
    stage: n.commercialStage ? STAGE_BY_ID[n.commercialStage] : null,
    tierShort: n.tier === 'reference' ? TIERS.reference.short : 'T2C RECORD'
  })));

  return `<div class="cm-listview" hidden>
    <div class="tw cm-listtable">
      <table class="cm-table">
        <caption class="vh">Every node in the chain map, with the tier it belongs to, its
          evidence and its commercial stage</caption>
        <thead><tr>
          <th scope="col">Column</th><th scope="col">Node</th><th scope="col">Tier</th>
          <th scope="col">Organisation</th>
          <th scope="col">Relationship</th><th scope="col">Evidence</th>
          <th scope="col">Maturity</th><th scope="col">Commercial stage</th>
        </tr></thead>
        <tbody>
          ${rows.map(({ c, n, rel, conf, mat, stage, tierShort }) => `
            <tr data-row-node="${esc(graph.architecture)}-${esc(n.id)}">
              <td>${esc(c.label)}</td>
              <th scope="row" class="tleft">
                <button type="button" class="cm-rowbtn" data-node="${esc(n.id)}">${esc(n.title)}</button>
              </th>
              <td><span class="cm-tiertag" data-tier="${esc(n.tier)}">${esc(tierShort)}</span></td>
              <td class="tleft">${esc(n.org || '—')}</td>
              <td><span class="cm-tag" data-rel="${esc(n.relationship)}">${esc(rel.label)}</span></td>
              <td>${esc(conf.label)}</td>
              <td>${esc(mat.label)}</td>
              <td>${stage ? esc(stage.label) : '<span class="cm-none">None on record</span>'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    ${/* The card list. Identifier first, then the tier, then the qualifiers —
          every field the table carries, none dropped for space. */''}
    <ul class="cm-cards" role="list">
      ${rows.map(({ c, n, rel, conf, mat, stage, tierShort }) => `
        <li>
          <button type="button" class="cm-cardbtn" data-node="${esc(n.id)}"
            data-column="${esc(n.column)}" data-pillar="${esc(n.pillar)}"
            data-rel="${esc(n.relationship)}" data-tier="${esc(n.tier)}"
            data-org="${n.org ? 'yes' : 'no'}">
            <span class="cm-cardtop">
              <span class="cm-cardcol">${esc(c.label)}</span>
              <span class="cm-tiertag" data-tier="${esc(n.tier)}">${esc(tierShort)}</span>
            </span>
            <span class="cm-cardid">${esc(n.title)}</span>
            ${n.org && n.org !== n.title ? `<span class="cm-cardorg">${esc(n.org)}</span>` : ''}
            <span class="cm-cardmeta">
              <span class="cm-tag" data-rel="${esc(n.relationship)}">${esc(rel.label)}</span>
              <span>${esc(conf.label)} evidence</span>
              <span>${esc(mat.label)}</span>
            </span>
            <span class="cm-cardstage">${stage
              ? `Commercial stage: ${esc(stage.label)}`
              : '<span class="cm-none">No commercial stage on record</span>'}</span>
          </button>
        </li>`).join('')}
    </ul>

    ${graph.columns.filter(c => c.empty).map(c => `<p class="cm-listempty">
      <b>${esc(c.label)}:</b> ${esc(c.emptyReason)}</p>`).join('')}
  </div>`;
}

/* ---------------------------------------------------------------- drawer ---- */

export function nodeDrawer() {
  return `<aside class="cm-drawer" id="cmDrawer" aria-labelledby="cm-drawer-h" hidden>
    <div class="cm-drawerhead">
      <div>
        <p class="cm-drawerkicker" id="cmDrawerKicker"></p>
        <h2 class="cm-drawerh" id="cm-drawer-h" tabindex="-1"></h2>
        <p class="cm-drawerorg" id="cmDrawerOrg"></p>
      </div>
      <button type="button" class="cm-drawerclose" id="cmDrawerClose" aria-label="Close details">&times;</button>
    </div>
    <div class="cm-drawerbody" id="cmDrawerBody"></div>
  </aside>`;
}

/**
 * Drawer contents, rendered server-side into a JSON island so the client has no
 * second copy of the copy rules to drift from.
 */
export function drawerPayload(graph) {
  return graph.nodes.map(n => {
    const rel = RELATIONSHIPS[n.relationship] || RELATIONSHIPS.unknown;
    const conf = CONFIDENCES[n.confidence] || CONFIDENCES.unverified;
    const mat = MATURITIES[n.maturity] || MATURITIES.unknown;
    const stage = n.commercialStage ? STAGE_BY_ID[n.commercialStage] : null;
    return {
      id: n.id, title: n.title, org: n.org, ticker: n.orgTicker, exchange: n.orgExchange,
      column: n.column, simple: n.simple, technical: n.technical,
      /* The tier travels with the payload so the drawer cannot render an
         industry-reference node with an evidenced node's authority. */
      tier: n.tier, tierLabel: TIERS[n.tier].label, tierNote: TIERS[n.tier].definition,
      examples: n.examples || null,
      why: n.whyItMatters, inputs: n.inputs, outputs: n.outputs,
      relationship: n.relationship, relationshipLabel: rel.label, relationshipDef: rel.definition,
      confidence: n.confidence, confidenceLabel: conf.label,
      maturity: n.maturity, maturityLabel: mat.label,
      stage: stage ? { label: stage.label, definition: stage.definition, notYet: stage.notYet } : null,
      evidenceSummary: n.evidenceSummary || null,
      asOf: n.asOf ? date(n.asOf) : null,
      explainerHref: n.explainerHref,
      companySlug: n.companySlug || null,
      contractedMw: n.contractedMw ?? null,
      withheld: n.withheldDescriptions || null,
      suppliers: (n.suppliers || []).map(s => ({
        company: s.company, ticker: s.ticker, exchange: s.exchange,
        role: s.roleLabel, grade: s.gradeLabel, confirmed: s.confirmed,
        evidence: s.evidence, counterparty: s.counterparty, asOf: date(s.asOf),
        sources: sourcesFor(s.sourceIds).map(x => ({
          title: x.title, url: x.url, publisher: x.publisher,
          publishedAt: date(x.publishedAt), primary: !!x.isPrimary,
          excerpt: x.supportingExcerpt || null
        }))
      })),
      sources: sourcesFor(n.evidenceIds).map(x => ({
        title: x.title, url: x.url, publisher: x.publisher,
        publishedAt: date(x.publishedAt), primary: !!x.isPrimary,
        excerpt: x.supportingExcerpt || null
      }))
    };
  });
}

/* -------------------------------------------------------------- timeline ---- */

export function commercialTimelineView(stages) {
  return `<section class="cm-timeline" aria-labelledby="cm-tl-h">
    <div class="cm-tlhead">
      <div>
        <h2 class="cm-tlh" id="cm-tl-h">Order to revenue</h2>
        <p class="cm-tlsub">Six stages, and the distance between them is the point. Announced
          capacity is not an order; an order is not a shipment; acceptance is not revenue.</p>
      </div>
      <div class="cm-tlctl">
        <button type="button" class="cm-play" id="cmPlay" aria-pressed="false">
          ${icon('play', 16)} <span id="cmPlayLabel">Follow this chain</span></button>
        <button type="button" class="cm-ctl" id="cmTlReset" aria-label="Reset the timeline">
          ${icon('reset', 15)}</button>
      </div>
    </div>

    <ol class="cm-stages" role="list">
      ${stages.map(s => `<li class="cm-stage is-${esc(s.state)}" data-stage="${esc(s.id)}">
        <span class="cm-stagen" aria-hidden="true">${s.order}</span>
        <span class="cm-stagebody">
          <span class="cm-stagelabel">${esc(s.label)}</span>
          <span class="cm-stagedef">${esc(s.definition)}</span>
          <span class="cm-stagecount">${s.count} record${s.count === 1 ? '' : 's'}
            &middot; ${s.sourceCount} source${s.sourceCount === 1 ? '' : 's'}</span>
          ${s.emptyNote ? `<span class="cm-stageempty">${esc(s.emptyNote)}</span>` : ''}
          <span class="cm-stagenot">${esc(s.notYet)}</span>
        </span>
      </li>`).join('')}
    </ol>
  </section>`;
}

/* ------------------------------------------------------- the boundary ---- */

/**
 * The interconnect boundary explainer.
 *
 * This is the surface that has to prevent the whole feature being read as
 * "copper is dying", so the teaching line is not a footnote — it is the heading.
 */
export function boundaryPanel({ bands, statement, support, architecture }) {
  return `<section class="cm-boundary" aria-labelledby="cm-bd-h">
    <div class="cm-bdcopy">
      ${/* No eyebrow here. `cm-eyebrow` is the page-title grammar — the thing
            above the h1 — and repeating it further down made this section read
            as a second landing page bolted onto the workspace rather than as a
            part of it. The heading alone carries it. */''}
      <h2 class="cm-bdh" id="cm-bd-h">${esc(statement)}</h2>
      <p class="cm-bdsupport">${esc(support)}</p>
    </div>

    <div class="cm-ladder">
      <div class="cm-ladderhead" aria-hidden="true">
        ${bands.map(b => `<span>${esc(b.label)}</span>`).join('')}
      </div>
      ${['deployed', 'next'].map(mode => `<div class="cm-ladderrow${
        mode === architecture ? ' is-current' : ''}" data-mode="${mode}">
        <span class="cm-ladderlabel">${mode === 'deployed' ? 'Today' : 'Next'}</span>
        <div class="cm-ladderbands">
          ${bands.map(b => `<span class="cm-band" data-medium="${esc(b[mode].medium)}"
            title="${esc(b.distance)} — ${esc(b[mode].text)}">
            <span class="vh">${esc(b.label)}, ${esc(b.distance)}: ${esc(b[mode].text)}</span>
            <span class="cm-bandtext" aria-hidden="true">${esc(
              b[mode].medium === 'electrical' ? 'Copper'
                : b[mode].medium === 'optical' ? 'Optical' : 'Both')}</span>
          </span>`).join('')}
        </div>
      </div>`).join('')}
      <p class="cm-laddernote">Copper is present in both rows. What changes is where the handover to
        light happens &mdash; not whether copper is still used.</p>
    </div>
  </section>`;
}
