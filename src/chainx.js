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
import { CHAIN_COMPANIES, CHAIN_LINKS, LINK_KINDS, USE_CAVEAT } from '../data/chain.js';
import { SOURCE_BY_ID } from '../data/sources.js';
import { esc } from './lib/format.js';
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
    stages: CHAIN_STAGES.map(s => ({ id: s.id, n: s.n, label: s.label, plain: s.plain })),
    companies: CHAIN_COMPANIES.map(c => ({
      id: c.id, name: c.name, ticker: c.ticker, stage: c.stage, makes: c.makes,
      excerpt: c.excerpt || null, src: c.sourceId, href: c.href || null
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
  { stages: ['materials'], art: 'materials', frame: 'lime' },
  { stages: ['processes'], art: 'wafer', frame: 'lime' },
  { stages: ['photonics'], art: 'photonics', frame: 'cyan' },
  { stages: ['compute'], art: 'chips-hbm', frame: 'lime' },
  { stages: ['power', 'cooling'], art: 'power-cooling', frame: 'amber', label: 'Power and cooling',
    plain: 'getting electricity in and taking the heat back out' },
  { stages: ['facility'], art: 'ai-factory', frame: 'lime' },
  { stages: ['operators'], art: 'server-rack', frame: 'cyan' },
  { stages: ['buyers'], art: 'accepted', frame: 'lime' },
  { stages: ['applications'], art: 'revenue', frame: 'lime' }
];

export function chainExplorer() {
  const byStage = id => CHAIN_COMPANIES.filter(c => c.stage === id);
  const degree = id => CHAIN_LINKS.filter(l => l.from === id || l.to === id).length;
  const stage = id => CHAIN_STAGES.find(s => s.id === id);

  return `<section class="cx" aria-labelledby="cx-h">
  <div class="cxhead">
    <h2 class="cxh" id="cx-h">The AI supply chain</h2>
    <p class="cxhint" id="cxHint">Tap any company to light up who supplies it and who it sells to.</p>
  </div>
  <div class="cxtrack cn-track" role="list" style="--cn-count:${CX_COLUMNS.length}">
    ${CX_COLUMNS.map((col, i) => {
      const first = stage(col.stages[0]);
      const label = col.label || first.label;
      const plain = col.plain || first.plain;
      const cos = col.stages.flatMap(byStage);
      return `<div class="cxcol cn-node" role="listitem" data-stage="${esc(col.stages.join(' '))}"
        style="--i:${i};${opticsStyle(col.art)}">
      <div class="cxstage">
        <span class="cn-art cxart" data-frame="${esc(col.frame)}">
          ${FRAME}
          <span class="cn-cut">${cutout(col.art, { alt: '', sizes: '(min-width: 1200px) 120px, 160px' })}</span>
        </span>
        <span class="cxn">${i + 1}</span>
        <h3 class="cxlabel">${esc(label)}</h3>
        <p class="cxplain">${esc(plain)}</p>
      </div>
      <ul class="cxlist">
        ${cos.map(c => `<li><button type="button" class="cxco press" data-co="${esc(c.id)}"
            aria-label="${esc(`${c.name}. ${c.makes} ${degree(c.id)} disclosed links. Open details.`)}">
          <span class="cxname">${esc(c.name)}</span>
          ${c.ticker ? `<span class="cxtick">${esc(c.ticker)}</span>` : ''}
        </button></li>`).join('')}
      </ul>
    </div>`;
    }).join('')}
  </div>
  <p class="cxnote">Every line between two companies quotes the filing that discloses it. Companies in
    neighbouring stages are not linked unless a document says so. ${esc(USE_CAVEAT)}</p>
</section>

<dialog class="cxdrawer" id="cxDrawer" aria-labelledby="cxdName">
  <div class="cxdin">
    <button type="button" class="cxdclose press" id="cxdClose" aria-label="Close">✕</button>
    <div id="cxdBody"></div>
  </div>
</dialog>`;
}
