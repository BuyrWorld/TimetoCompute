/**
 * Chain Mapping components.
 *
 * THE CENTRING CONTRACT, which the pack states three separate times and which is
 * the thing most likely to be quietly broken by a later edit:
 *
 *   Every node is three layers — a bounding button, a decorative hex shell, and
 *   a content stage that is `position:absolute; inset:0; display:grid;
 *   place-items:center`. The label stack is mathematically centred and is NEVER
 *   nudged with per-node margins. A status badge must not change the node's
 *   bounding box, which is why the badge lives inside the same stage rather than
 *   being appended after it.
 *
 * The map is real HTML nodes over a semantic SVG connector layer, so it is
 * searchable, keyboard-navigable and readable by a screen reader. Nothing here
 * is drawn on a canvas.
 */
import { esc, date } from './lib/format.js';
import { RELATIONSHIPS, CONFIDENCES, MATURITIES } from '../data/chainmap.js';
import { STAGE_BY_ID } from '../data/chainmap.js';
import { sourcesFor } from './lib/chainmap.js';

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

    <div class="cm-headproject">
      <label class="cm-field">
        <span>Project / product</span>
        <select id="cmProject">
          <option value="">All tracked operators</option>
          ${projects.map(p => `<option value="${esc(p.id)}"${p.id === projectId ? ' selected' : ''}>
            ${esc(p.label)}</option>`).join('')}
        </select>
      </label>
      <p class="cm-helper">Trace every dependency. Verify every commercial step.</p>
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

export function filterRail({ traceModes, traceMode, pillars, pillar, showInferred }) {
  return `<aside class="cm-rail" aria-label="Trace and filters">
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
      <h2 class="cm-railh" id="cm-inf-h">Inferred links</h2>
      <label class="cm-switch">
        <input type="checkbox" id="cmInferred"${showInferred ? ' checked' : ''} />
        <span class="cm-switchtrack" aria-hidden="true"></span>
        <span class="cm-switchlabel">Show inferred links</span>
      </label>
      <ul class="cm-legend" role="list">
        <li><i class="cm-line cm-line--direct" aria-hidden="true"></i>
          <b>Direct</b><span>A named, dated agreement</span></li>
        <li><i class="cm-line cm-line--ecosystem" aria-hidden="true"></i>
          <b>Ecosystem</b><span>Operates here. No award evidenced</span></li>
        <li><i class="cm-line cm-line--inferred" aria-hidden="true"></i>
          <b>Inferred</b><span>T2C's framing, not a disclosure</span></li>
      </ul>
    </section>

    <button type="button" class="cm-reset" id="cmReset">${icon('reset', 15)} Reset view</button>
  </aside>`;
}

/* ------------------------------------------------------------------- map ---- */

/**
 * One node.
 *
 * The hex shell is a decorative layer; the content stage sits absolutely inside
 * the same box, so a badge appearing or disappearing cannot resize the node.
 */
export function mapNode(n, index, mode) {
  const rel = RELATIONSHIPS[n.relationship] || RELATIONSHIPS.unknown;
  const conf = CONFIDENCES[n.confidence] || CONFIDENCES.unverified;
  const mat = MATURITIES[n.maturity] || MATURITIES.unknown;
  const stage = n.commercialStage ? STAGE_BY_ID[n.commercialStage] : null;

  return `<li class="cm-nodewrap">
    <button type="button" class="cm-node" data-node="${esc(n.id)}"
      data-column="${esc(n.column)}" data-pillar="${esc(n.pillar)}"
      data-rel="${esc(n.relationship)}" data-maturity="${esc(n.maturity)}"
      data-index="${index}"
      aria-describedby="cm-nodedesc-${esc(mode)}-${esc(n.id)}">
      <span class="cm-node__hex" aria-hidden="true"></span>
      <span class="cm-node__content">
        <span class="cm-node__title">${esc(n.title)}</span>
        ${n.org ? `<span class="cm-node__org">${esc(n.org)}</span>` : ''}
        <span class="cm-node__badge" data-rel="${esc(n.relationship)}">${esc(rel.label)}</span>
      </span>
    </button>
    <span class="vh" id="cm-nodedesc-${esc(mode)}-${esc(n.id)}">
      ${esc(n.simple || n.technical)}. Relationship ${esc(rel.label)},
      evidence ${esc(conf.label)}, maturity ${esc(mat.label)}${
        stage ? `, commercial stage ${esc(stage.label)}` : ', no commercial stage on record'}.
    </span>
  </li>`;
}

/** The five columns, with the empty one declared rather than dropped. */
export function chainMapCanvas(graph) {
  return `<div class="cm-canvas">
    <div class="cm-zoomwrap">
      <ol class="cm-columns" role="list">
        ${graph.columns.map((c, ci) => `<li class="cm-column${c.empty ? ' is-empty' : ''}"
          data-column="${esc(c.id)}">
          <h3 class="cm-columnh">
            <span class="cm-columnn" aria-hidden="true">${c.order}</span>
            ${esc(c.label)}
            <span class="cm-columncount">${c.nodes.length}</span>
          </h3>
          <p class="cm-columndef">${esc(c.definition)}</p>
          ${c.empty
            ? `<div class="cm-emptycol">
                 <span class="cm-emptymark" aria-hidden="true">—</span>
                 <p>${esc(c.emptyReason)}</p>
               </div>`
            : `<ul class="cm-nodes" role="list">
                 ${c.nodes.map((n, i) => mapNode(n, ci * 100 + i, graph.architecture)).join('')}
               </ul>`}
        </li>`).join('')}
      </ol>
    </div>
  </div>`;
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
export function chainMapList(graph) {
  return `<div class="cm-listview" hidden>
    <div class="tw">
      <table class="cm-table">
        <caption class="vh">Every node in the chain map, with its column, evidence and commercial stage</caption>
        <thead><tr>
          <th scope="col">Column</th><th scope="col">Node</th><th scope="col">Organisation</th>
          <th scope="col">Relationship</th><th scope="col">Evidence</th>
          <th scope="col">Maturity</th><th scope="col">Commercial stage</th>
        </tr></thead>
        <tbody>
          ${graph.columns.flatMap(c => c.nodes.map(n => {
            const rel = RELATIONSHIPS[n.relationship] || RELATIONSHIPS.unknown;
            const stage = n.commercialStage ? STAGE_BY_ID[n.commercialStage] : null;
            return `<tr data-row-node="${esc(graph.architecture)}-${esc(n.id)}">
              <td>${esc(c.label)}</td>
              <th scope="row" class="tleft">
                <button type="button" class="cm-rowbtn" data-node="${esc(n.id)}">${esc(n.title)}</button>
              </th>
              <td class="tleft">${esc(n.org || '—')}</td>
              <td><span class="cm-tag" data-rel="${esc(n.relationship)}">${esc(rel.label)}</span></td>
              <td>${esc((CONFIDENCES[n.confidence] || CONFIDENCES.unverified).label)}</td>
              <td>${esc((MATURITIES[n.maturity] || MATURITIES.unknown).label)}</td>
              <td>${stage ? esc(stage.label) : '<span class="cm-none">None on record</span>'}</td>
            </tr>`;
          })).join('')}
        </tbody>
      </table>
    </div>
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
      <p class="cm-eyebrow">How the interconnect changes</p>
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
