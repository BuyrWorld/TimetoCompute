/**
 * The supply-chain explorer: ten stages, from raw materials to what the
 * compute gets used for, with the companies at each stage.
 *
 * Rendered as plain HTML so it reads without JavaScript — every company is a
 * button with its one-line description in its label. The client script
 * (chainx-app.js) adds the fun part: pick a company and its whole chain of
 * disclosed suppliers and customers lights up, upstream and downstream.
 */
import { CHAIN_STAGES } from '../data/chainstages.js';
import { CHAIN_COMPANIES, CHAIN_LINKS, LINK_KINDS, USE_CAVEAT, EXTRA_STAGES } from '../data/chain.js';
import { SOURCE_BY_ID } from '../data/sources.js';
import { esc, date } from './lib/format.js';
import { medianMove } from './lib/moves-snapshot.js';
import { cutout, opticsStyle, HEX_FRAME as FRAME } from './chain-ui.js';

/** Everything the client needs, and nothing else: companies, links, the cited documents. */
export function chainExplorerData() {
  const cited = new Set([...CHAIN_COMPANIES.map(c => c.sourceId), ...CHAIN_LINKS.map(l => l.sourceId)]);
  const sources = {};
  for (const id of cited) {
    const s = SOURCE_BY_ID[id];
    if (s) sources[id] = { t: s.title, u: s.url, p: s.publisher, d: s.publishedAt };
  }
  return {
    // Numbered by visual column, so the drawer says "5 · Servers…" to match the map.
    stages: [...new Set(CX_COLUMNS.flatMap(c => c.stages))].map(id => ({
      id, n: CX_COLUMNS.findIndex(c => c.stages.includes(id)) + 1, label: stageInfo(id).label, plain: stageInfo(id).plain })),
    companies: CHAIN_COMPANIES.map(c => ({
      id: c.id, name: c.name, ticker: c.ticker, stage: c.stage, makes: c.makes,
      excerpt: c.excerpt || null, src: c.sourceId, href: c.href || null, kind: c.kind || null
    })),
    links: CHAIN_LINKS.map(l => ({ from: l.from, to: l.to, kind: l.kind, what: l.what, excerpt: l.excerpt, src: l.sourceId })),
    kinds: Object.fromEntries(Object.entries(LINK_KINDS).map(([k, v]) => [k, v.label])),
    sources,
    caveat: USE_CAVEAT
  };
}

/**
 * Nine visual columns over ten data stages: power and cooling share one,
 * because they share one illustration and are usually bought together.
 * Each column carries the pack's hexagon art — the visual the homepage had
 * before the October simplification, kept because readers preferred it.
 */
export const CX_COLUMNS = [
  { stages: ['materials'], art: 'materials', frame: 'lime', label: 'Raw materials',
    plain: 'the mined and refined inputs everything else starts with' },
  { stages: ['processes'], art: 'wafer', frame: 'lime', label: 'Semiconductor equipment and fabrication',
    plain: 'the fabs and tools that turn materials into advanced chips' },
  { stages: ['photonics'], art: 'photonics', frame: 'cyan', label: 'Photonics and interconnect',
    plain: 'moving enormous amounts of data between chips, racks and facilities' },
  { stages: ['compute'], art: 'chips-hbm', frame: 'lime', label: 'Compute silicon and memory',
    plain: 'accelerators, CPUs and memory that perform AI workloads' },
  { stages: ['servers'], art: 'servers-racks-networking', frame: 'cyan', label: 'Servers, racks and networking',
    plain: 'assembling chips into clusters and connecting them into one AI system' },
  { stages: ['power', 'cooling'], art: 'power-cooling', frame: 'amber', label: 'Power and cooling',
    plain: 'bringing electricity into the site and removing the heat' },
  { stages: ['facility'], art: 'ai-factory', frame: 'lime', label: 'Facility and construction',
    plain: 'designing, building and commissioning the physical campus' },
  { stages: ['owners'], art: 'datacentre-owners', frame: 'amber', label: 'Data-centre owners and developers',
    plain: 'owning the land, buildings, substations and long-lived infrastructure' },
  { stages: ['operators'], art: 'server-rack', frame: 'cyan', label: 'GPU clouds and compute operators',
    plain: 'turning physical infrastructure and accelerators into rentable compute' },
  { stages: ['buyers'], art: 'accepted', frame: 'lime', label: 'Compute buyers',
    plain: 'the organisations contracting and consuming large blocks of AI capacity' },
  { stages: ['models'], art: 'models-platforms', frame: 'cyan', label: 'Models and AI platforms',
    plain: 'the intelligence layer trained and served on the underlying compute' },
  { stages: ['applications'], art: 'revenue', frame: 'lime', label: 'End applications',
    plain: 'where compute becomes software, automation and real economic value' }
];

/** Label and plain line for any explorer stage id, homepage-only ones included. */
export function stageInfo(id) {
  const col = CX_COLUMNS.find(c => c.stages.includes(id));
  const base = CHAIN_STAGES.find(s => s.id === id) || EXTRA_STAGES[id] || {};
  return { label: col && col.stages.length === 1 ? col.label : (base.label || col?.label || id), plain: base.plain || col?.plain || '' };
}

const pct = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;
/** Heat attributes for one quoted ticker: direction, and strength saturating at a 6% day. */
const heat = dp => dp == null ? '' : ` data-move="${dp > 0.05 ? 'gain' : dp < -0.05 ? 'loss' : 'flat'}" style="--heat:${Math.min(1, Math.abs(dp) / 6).toFixed(2)}"`;

export function chainExplorer({ moves = null } = {}) {
  const dpOf = c => moves?.moves?.[c.ticker]?.dp ?? null;
  const byStage = id => CHAIN_COMPANIES.filter(c => c.stage === id);
  const degree = id => CHAIN_LINKS.filter(l => l.from === id || l.to === id).length;
  /* Tracked companies first (they have full pages), then the best-connected,
     so the six names a column shows before "+N more" are the useful ones. */
  const order = cos => cos.map((c, i) => ({ c, i })).sort((a, b) =>
    (b.c.href ? 1 : 0) - (a.c.href ? 1 : 0) || degree(b.c.id) - degree(a.c.id) || a.i - b.i).map(x => x.c);
  const SHOWN = 4;
  const KIND = { private: 'PRIVATE', 'non-us': 'NON-US', model: 'MODEL', app: 'APP' };

  return `<section class="cx" aria-labelledby="cx-h">
  <div class="cxhead">
    <h2 class="cxh" id="cx-h">The AI supply chain</h2>
    <p class="cxhint" id="cxHint">Tap any company to light up who supplies it and who it sells to.</p>
    ${moves ? `<div class="cxheatbar">
      <button type="button" class="cxheatbtn press" id="cxHeat" aria-pressed="false">Colour by share move</button>
      <span class="cxheatkey" id="cxHeatKey" hidden><span class="cxkeyloss">fell</span><span class="cxkeyramp" aria-hidden="true"></span><span class="cxkeygain">rose</span>
        <span class="nhmeta">on ${esc(date(moves.session))}, close to close</span></span>
    </div>` : ''}
  </div>
  <div class="cxtrack" id="cxTrack" role="list" style="--cn-count:${CX_COLUMNS.length}">
    <svg class="cxlines" id="cxLines" aria-hidden="true" focusable="false"></svg>
    ${CX_COLUMNS.map((col, i) => {
      const label = col.label;
      const plain = col.plain;
      const cos = order(col.stages.flatMap(byStage));
      const extra = Math.max(0, cos.length - SHOWN);
      const med = moves ? medianMove(cos.map(dpOf)) : null;
      /* A bend after the 4th, 6th and 8th stage carries the flow onto the next
         row; CSS shows only the bends that match the current number of columns. */
      const bend = [4, 6, 8].includes(i) ? `<div class="cxbend cxbend-${i}" aria-hidden="true"></div>` : '';
      return `${bend}<div class="cxcol cn-node${extra ? ' is-collapsed' : ''}" role="listitem" data-n="${i + 1}" data-stage="${esc(col.stages.join(' '))}"
        style="--i:${i};${opticsStyle(col.art)}">
      <div class="cxstage">
        <span class="cn-art cxart" data-frame="${esc(col.frame)}">
          ${FRAME}
          <span class="cn-cut">${cutout(col.art, { alt: '', sizes: '(min-width: 1200px) 120px, 160px' })}</span>
        </span>
        <span class="cxn">${i + 1}</span>
        <h3 class="cxlabel">${esc(label)}</h3>
        <p class="cxplain">${esc(plain)}</p>
        ${med != null ? `<p class="cxcolmove"${heat(med)}>Typical move <b>${pct(med)}</b></p>` : ''}
      </div>
      <ul class="cxlist">
        ${cos.map((c, j) => `<li${j >= SHOWN ? ' class="is-extra"' : ''}><button type="button" class="cxco press${c.href ? ' is-tracked' : ''}" data-co="${esc(c.id)}"${heat(dpOf(c))}
            aria-label="${esc(`${c.name}. ${c.makes} ${degree(c.id)} disclosed links.${dpOf(c) != null ? ` Shares ${pct(dpOf(c)).replace('−', 'down ').replace('+', 'up ')} on ${date(moves.session)}.` : ''} Open details.`)}">
          <span class="cxname">${esc(c.name)}</span>
          ${dpOf(c) != null ? `<span class="cxmove">${pct(dpOf(c))}</span>` : ''}
          ${c.ticker ? `<span class="cxtick">${esc(c.ticker)}</span>`
            : c.kind ? `<span class="cxtick cxkind">${esc(KIND[c.kind] || '')}</span>` : ''}
        </button></li>`).join('')}
      </ul>
      ${extra ? `<button type="button" class="cxmore press" aria-expanded="false">+ ${extra} more</button>` : ''}
    </div>`;
    }).join('')}
  </div>
  <p class="cxnote">Every line between two companies quotes the filing that discloses it. Companies in
    neighbouring stages are not linked unless a document says so. ${esc(USE_CAVEAT)}${moves
      ? ` Share moves are one day's price change at the close of ${esc(date(moves.session))} and say nothing about delivery.` : ''}</p>
</section>

<dialog class="cxdrawer" id="cxDrawer" aria-labelledby="cxdName">
  <div class="cxdin">
    <button type="button" class="cxdclose press" id="cxdClose" aria-label="Close">✕</button>
    <div id="cxdBody"></div>
  </div>
</dialog>`;
}
