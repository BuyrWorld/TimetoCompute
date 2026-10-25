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

export function chainExplorer() {
  const byStage = s => CHAIN_COMPANIES.filter(c => c.stage === s.id);
  const degree = id => CHAIN_LINKS.filter(l => l.from === id || l.to === id).length;

  return `<section class="cx" aria-labelledby="cx-h">
  <div class="cxhead">
    <h2 class="cxh" id="cx-h">The AI supply chain</h2>
    <p class="cxhint" id="cxHint">Tap any company to light up who supplies it and who it sells to.</p>
  </div>
  <div class="cxtrack" role="list">
    ${CHAIN_STAGES.map(s => `<div class="cxcol" role="listitem" data-stage="${esc(s.id)}">
      <div class="cxstage">
        <span class="cxn">${s.n}</span>
        <h3 class="cxlabel">${esc(s.label)}</h3>
        <p class="cxplain">${esc(s.plain)}</p>
      </div>
      <ul class="cxlist">
        ${byStage(s).map(c => `<li><button type="button" class="cxco press" data-co="${esc(c.id)}"
            aria-label="${esc(`${c.name}. ${c.makes} ${degree(c.id)} disclosed links. Open details.`)}">
          <span class="cxname">${esc(c.name)}</span>
          ${c.ticker ? `<span class="cxtick">${esc(c.ticker)}</span>` : ''}
        </button></li>`).join('')}
      </ul>
    </div>`).join('')}
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
