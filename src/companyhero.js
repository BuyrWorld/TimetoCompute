/**
 * The top of a company page: who it is, the five numbers that matter, and —
 * the page's one bold element — where it sits in the supply chain, with the
 * suppliers it names flowing in and the customers it names flowing out.
 *
 * Everything here is read from records the rest of the site already holds:
 * the chain links (each quoting a filing), the capacity measures, the
 * Reality Score, the build-time earnings snapshot and the freshness check.
 */
import { CHAIN_COMPANY_BY_ID, CHAIN_LINKS, LINK_KINDS } from '../data/chain.js';
import { ART_BY_ID } from '../data/artpack.js';
import { CX_COLUMNS, stageInfo } from './chainx.js';
import { cutout, HEX_FRAME } from './chain-ui.js';
import { chainIdFor } from './lib/impact.js';
import { siteStatus } from './lib/sites.js';
import { isKnown } from './lib/compute.js';
import { esc, mw, date } from './lib/format.js';
import { digestControl } from './newshub.js';

const fmtMw = m => isKnown(m) ? `${m.valueStatus === 'minimum' ? '≥' : ''}${mw(m.valueMw)}` : null;

function fact(label, value, note) {
  return `<div class="cofact"><dt>${esc(label)}</dt><dd>${value ?? '<span class="nd">Not disclosed</span>'}${
    note ? `<span class="cofactnote">${esc(note)}</span>` : ''}</dd></div>`;
}

/** Reality Score as a ring: the one constructed number on the site, so it is drawn as a gauge, not a fact. */
function scoreRing(score) {
  if (!score || score.score == null) {
    return `<a class="coscore is-withheld press" href="#record" data-tab="record">
      <span class="coscoreval">—</span><span class="coscorelab">Reality Score withheld<br><small>not enough record yet</small></span></a>`;
  }
  const r = 26, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, score.score / 100));
  return `<a class="coscore press" href="#record" data-tab="record" aria-label="Reality Score ${score.score} out of 100. See how it is built.">
    <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="ring-bg"/>
      <circle cx="32" cy="32" r="${r}" class="ring-fg" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 32 32)"/></svg>
    <span class="coscoreval">${score.score}</span><span class="coscorelab">Reality Score<br><small>how it is built</small></span></a>`;
}

export function companyHero(c, v, { score, earnings, sites }) {
  const id = chainIdFor(c.id);
  const col = CX_COLUMNS.find(k => k.stages.includes('operators'));
  const art = col.art;
  const next = (earnings || []).filter(e => e.ticker === c.ticker && e.expectedAt >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.expectedAt.localeCompare(b.expectedAt))[0];
  const SESSION = { bmo: 'before the open', amc: 'after the close' };
  const live = sites.filter(s => ['live', 'billing'].includes(siteStatus(s).id)).length;

  return `<section class="cohero" aria-labelledby="co-h">
  <div class="coid">
    <span class="cn-art cohex" data-frame="${esc(col.frame)}">${HEX_FRAME}<span class="cn-cut">${cutout(art, { alt: '', sizes: '96px', eager: true })}</span></span>
    <div class="coidtext">
      <p class="coeyebrow">${esc(stageInfo('operators').label)}</p>
      <h1 id="co-h">${esc(c.name)} <span class="cotick">${esc(c.ticker)}</span></h1>
      <p class="colede">${esc((CHAIN_COMPANY_BY_ID[id] || {}).makes || c.summary || '')}</p>
      <button class="cowatch press watchbtn" type="button" data-watch="${esc(c.ticker)}" aria-pressed="false"
        aria-label="Watch ${esc(c.name)}"><span class="watchglyph" aria-hidden="true">☆</span> <span class="watchtext">Watch</span></button>
      <a class="cofeed press" href="/companies/${esc(c.slug)}/feed.xml" title="New filings, record changes and corrections for ${esc(c.name)}, in any feed reader">Follow by RSS</a>
    </div>
    ${scoreRing(score)}
  </div>
  <dl class="cofacts">
    ${fact('Live now', fmtMw(v.measures.energisedCriticalItMw), 'critical IT, energised')}
    ${fact('Signed by customers', fmtMw(v.measures.customerContractedMw), 'contracted')}
    ${fact('Billing', fmtMw(v.measures.revenueLiveMw), 'disclosed as earning')}
    <div class="cofact" id="coNextResults" data-ticker="${esc(c.ticker)}"${next ? ' data-have="1"' : ''}><dt>Next results</dt><dd>${next
      ? `${esc(date(next.expectedAt))}<span class="cofactnote">${esc(SESSION[next.session] || 'date confirmed')}</span>`
      : `<span class="nd">Not scheduled</span><span class="cofactnote">no date announced</span>`}</dd></div>
    ${fact('Sites', String(sites.length), `${live} live or billing`)}
  </dl>
</section>`;
}

/** The bold element: suppliers in, the company, customers out — every arrow a quoted filing. */
export function chainPosition(c) {
  const id = chainIdFor(c.id);
  const ins = id ? CHAIN_LINKS.filter(l => l.to === id) : [];
  const outs = id ? CHAIN_LINKS.filter(l => l.from === id) : [];
  const builds = outs.flatMap(l => CHAIN_LINKS.filter(x => x.from === l.to &&
    ['models', 'applications'].includes(CHAIN_COMPANY_BY_ID[x.to]?.stage)).map(x => CHAIN_COMPANY_BY_ID[x.to].name));
  const node = (l, otherId) => {
    const o = CHAIN_COMPANY_BY_ID[otherId];
    return `<li><a class="copnode press" href="/?entity=${esc(o.id)}" title="${esc(l.excerpt)}">
      <span class="copname">${esc(o.name)}</span><span class="copwhat">${esc(LINK_KINDS[l.kind].label)} · ${esc(l.what)}</span></a></li>`;
  };
  const empty = side => `<li class="copnone">No ${side} is named in a filing yet.</li>`;
  return `<section class="copos" aria-labelledby="copos-h">
  <h2 id="copos-h">Where ${esc(c.name.split(' ')[0])} sits in the chain</h2>
  <div class="coflow">
    <div class="coside"><p class="cosideh">Buys from</p><ul>${ins.length ? ins.map(l => node(l, l.from)).join('') : empty('supplier')}</ul></div>
    <div class="cocore" aria-hidden="true"><span class="coarrow"></span><span class="cocorename">${esc(c.ticker)}</span><span class="coarrow"></span></div>
    <div class="coside"><p class="cosideh">Sells to</p><ul>${outs.length ? outs.map(l => node(l, l.to)).join('') : empty('customer')}</ul>
      ${builds.length ? `<p class="cobuilds">Those customers build ${esc([...new Set(builds)].join(', '))}</p>` : ''}</div>
  </div>
  <p class="cofoot">Each link quotes the filing that discloses it — hover for the sentence, or
    <a href="/?entity=${esc(id || '')}">open ${esc(c.ticker)} on the full chain</a>.</p>
</section>`;
}

/** The company's ticker plus its disclosed partners' — so an NVIDIA story reaches IREN's page. */
function newsTickersFor(c) {
  const id = chainIdFor(c.id);
  const partners = id ? CHAIN_LINKS.filter(l => l.from === id || l.to === id)
    .map(l => CHAIN_COMPANY_BY_ID[l.from === id ? l.to : l.from]?.ticker).filter(Boolean) : [];
  return [...new Set([c.ticker, ...partners])].join(',');
}

export const COMPANY_TABS = [['overview', 'Overview'], ['sites', 'Sites'], ['news', 'News'], ['record', 'Record'], ['sources', 'Sources']];

export function tabBar() {
  return `<nav class="cotabs" role="tablist" aria-label="Sections of this page">
    ${COMPANY_TABS.map(([id, label], i) => `<a class="cotab press" role="tab" id="tab-${id}" href="#${id}" data-tab="${id}"
      aria-controls="${id}" aria-selected="${i === 0}">${esc(label)}</a>`).join('')}
  </nav>`;
}

/** Overview: what is new, what is next. */
export function overviewPanel(c, v, { freshness, cats }) {
  const fr = freshness?.companies.find(x => x.id === c.id);
  const recent = v.events.slice(0, 4);
  return `<section class="copanel" id="overview" role="tabpanel" aria-labelledby="tab-overview">
  ${fr ? (fr.unreviewed.length
    ? `<div class="nhfresh"><p><b>${fr.unreviewed.length} new filing${fr.unreviewed.length === 1 ? '' : 's'} not yet reviewed</b> — the figures on this page do not reflect ${fr.unreviewed.length === 1 ? 'it' : 'them'} yet.</p>
        <ul>${fr.unreviewed.map(u => `<li><span class="hmwhen">${esc(date(u.filed))}</span> ${esc(u.form)} · ${esc(u.description)}
          <a class="cxsrc" href="${esc(u.url)}" target="_blank" rel="noopener">EDGAR ↗</a>
          ${digestControl(u)}</li>`).join('')}</ul></div>`
    : `<p class="cofresh">Every SEC filing reviewed through ${esc(date(fr.reviewedThrough))}.</p>`) : ''}
  <div class="cogrid2">
    <div>
      <h2>Latest on the record</h2>
      ${recent.length ? `<ul class="hmweek">${recent.map(e => `<li><span class="hmwhen">${esc(date(e.announcedAt))}</span>
        <span class="hmwhat">${esc(e.summary)}</span></li>`).join('')}</ul>` : '<p class="nhmeta">Nothing recorded yet.</p>'}
      <h2>In the news</h2>
      <ol class="nhstories" id="nhStories" data-limit="4" data-only="${esc(chainIdFor(c.id) || '')}" data-tickers="${esc(newsTickersFor(c))}">
        <li class="nhempty">Loading the latest stories…</li></ol>
    </div>
    <div>
      <h2>What comes next</h2>
      ${cats.length ? `<ul class="sxnext">${cats.map(k => `<li><span class="sxwhen">${esc(k.expectedAt ? date(k.expectedAt)
        : k.expectedWindowStart ? `${date(k.expectedWindowStart)} – ${date(k.expectedWindowEnd)}` : 'Date not given')}</span>
        <span>${esc(k.title)}</span></li>`).join('')}</ul>` : '<p class="nhmeta">No guided milestone on file.</p>'}
    </div>
  </div>
</section>`;
}

export function sitesPanel(sites, card) {
  return `<section class="copanel" id="sites" role="tabpanel" aria-labelledby="tab-sites">
  <h2>Sites</h2>
  ${sites.length ? `<div class="sitegrid">${sites.map(card).join('')}</div>`
    : '<p class="nhmeta">This company reports fleet-wide rather than by site.</p>'}
</section>`;
}

export function newsPanel(c) {
  return `<section class="copanel" id="news" role="tabpanel" aria-labelledby="tab-news">
  <h2>News about ${esc(c.name)}</h2>
  <ol class="nhstories" data-limit="20" data-only="${esc(chainIdFor(c.id) || '')}" data-tickers="${esc(newsTickersFor(c))}">
    <li class="nhempty">Loading the latest stories…</li></ol>
  <p class="nhdisc">Third-party headlines naming ${esc(c.name)} or one of its disclosed suppliers or customers.</p>
</section>`;
}
