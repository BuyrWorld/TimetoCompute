/**
 * The AI news hub: what is happening across the supply chain, who each story
 * touches, and which models the compute is being used for.
 *
 * Three kinds of content, kept visibly apart because they are different claims:
 *
 *   LIVE STORIES   third-party headlines (Finnhub), shown as published. T2C adds
 *                  only who the story names and which neoclouds/AI-infra
 *                  operators those companies are linked to by a filing. That is
 *                  exposure, not a forecast: it never says good or bad for whom.
 *   NEW MODELS     each provider's own current lineup, quoted from its docs.
 *   ON THE RECORD  the sourced ledger — filings T2C has read.
 */
import { CHAIN_STAGES } from '../data/chainstages.js';
import { CHAIN_COMPANIES, CHAIN_COMPANY_BY_ID, CHAIN_LINKS } from '../data/chain.js';
import { PROVIDERS, MODEL_KINDS } from '../data/models.js';
import { SOURCE_BY_ID } from '../data/sources.js';
import { signals } from './lib/signals.js';
import { headlineFor } from './lib/leadstory.js';
import { esc, date } from './lib/format.js';
import { sourceChips } from './ui.js';
import { CX_COLUMNS } from './chainx.js';
import { ART_BY_ID } from '../data/artpack.js';

/** Which operators (neoclouds and AI-infra builders) a buyer has signed with. */
export function operatorsFor(chainId) {
  if (!chainId) return [];
  return CHAIN_LINKS
    .filter(l => l.to === chainId && CHAIN_COMPANY_BY_ID[l.from]?.stage === 'operators')
    .map(l => ({ name: CHAIN_COMPANY_BY_ID[l.from].name, what: l.what }));
}

function modelCard(p, m) {
  const src = SOURCE_BY_ID[m.sourceId || p.sourceId];
  return `<article class="nhmodel" data-kind="${esc(m.kind)}">
    <div class="nhmtop">
      <span class="nhkind nhkind-${esc(m.kind)}">${esc(MODEL_KINDS[m.kind])}</span>
      ${m.released ? `<span class="nhwhen">Released ${esc(m.released.length === 7 ? m.released : date(m.released))}</span>` : ''}
    </div>
    <h4 class="nhmname">${esc(m.name)}</h4>
    ${m.quote ? `<blockquote class="nhquote">“${esc(m.quote)}”</blockquote>` : `<p class="nhnote">${esc(m.note)}</p>`}
    <p class="nhuses-h">What people build with it <span class="nhours">T2C summary</span></p>
    <ul class="nhuses">${m.uses.map(u => `<li>${esc(u)}</li>`).join('')}</ul>
    ${src ? `<a class="cxsrc" href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.publisher)} ↗</a>` : ''}
  </article>`;
}

export function newsHubData() {
  // The client needs the chain to work out who each live story touches.
  return {
    companies: CHAIN_COMPANIES.map(c => ({ id: c.id, name: c.name, ticker: c.ticker, stage: c.stage, href: c.href || null })),
    links: CHAIN_LINKS.map(l => ({ from: l.from, to: l.to, what: l.what, kind: l.kind })),
    stages: CX_COLUMNS.map((col, i) => ({
      i, stages: col.stages, frame: col.frame,
      label: col.label || CHAIN_STAGES.find(s => s.id === col.stages[0]).label,
      // the column's hexagon art, small, so a story carries its stage visually
      art: `${ART_BY_ID[col.art].base}-192.webp`
    })),
    providers: PROVIDERS.map(p => ({ name: p.name, chainId: p.chainId, models: p.models.map(m => m.name) }))
  };
}

/** The sidebar's freshness note: what the record has not caught up with yet. */
/** The button that asks /api/digest for a plain-English summary of one unreviewed filing. */
export function digestControl(u) {
  return `<button class="dgbtn press" type="button" data-digest="${esc(u.url)}" aria-expanded="false">Summarise in plain English</button>
    <div class="dgout" hidden aria-live="polite"></div>`;
}

export function freshnessPanel(freshness) {
  if (!freshness) return '';
  const rows = freshness.companies.flatMap(c => c.unreviewed.map(u => ({ ...u, c })))
    .sort((a, b) => b.filed.localeCompare(a.filed));
  const through = [...new Set(freshness.companies.map(c => c.reviewedThrough))].sort()[0];
  const checked = date(freshness.checkedAt.slice(0, 10));
  if (!rows.length) {
    return `<div class="nhfresh is-ok"><p><b>Up to date.</b> Every SEC filing by the tracked companies is
      reviewed through ${esc(date(through))}.</p><p class="nhmeta">Checked against EDGAR ${esc(checked)}</p></div>`;
  }
  return `<div class="nhfresh"><p><b>${rows.length} new filing${rows.length === 1 ? '' : 's'} not yet reviewed</b> —
    the figures on this site do not reflect ${rows.length === 1 ? 'it' : 'them'} yet.</p>
    <ul>${rows.slice(0, 8).map(u => `<li><span class="hmwhen">${esc(date(u.filed))}</span>
      <a href="/companies/${esc(u.c.slug)}/">${esc(u.c.name)}</a> · ${esc(u.form)} · ${esc(u.description)}
      <a class="cxsrc" href="${esc(u.url)}" target="_blank" rel="noopener">EDGAR ↗</a>
      ${digestControl(u)}</li>`).join('')}</ul>
    <p class="nhmeta">Checked against EDGAR ${esc(checked)}</p></div>`;
}

export function newsHubBody({ freshness = null } = {}) {
  const record = signals({}).filter(s => s.confidence === 'confirmed').slice(0, 8);
  const tickers = newsTickers();

  return `<div class="t2c-shell nh">
  <header class="nhhead">
    <p class="ed-eyebrow">AI news</p>
    <h1 class="nhh">What is moving across the AI supply chain</h1>
    <p class="nhlede">The latest stories from every stage — chips to power to the models themselves — and
      which neoclouds and AI-infrastructure operators each one touches through a disclosed supplier or
      customer link.</p>
  </header>

  <div class="nhgrid">
    <section class="nhfeed" aria-labelledby="nh-live">
      <div class="nhsechead">
        <h2 id="nh-live">Latest stories</h2>
        <span class="nhmeta" id="nhCount">Loading…</span>
      </div>
      <div class="nhfilters" role="group" aria-label="Filter stories by part of the chain">
        <button type="button" class="nhchip press is-on" data-filter="all" aria-pressed="true">Everything</button>
        <button type="button" class="nhchip press" data-filter="neocloud" aria-pressed="false">Touches a neocloud</button>
        <button type="button" class="nhchip press" data-filter="models" aria-pressed="false">Models</button>
        ${CX_COLUMNS.map((col, i) => `<button type="button" class="nhchip press" data-filter="stage-${i}" aria-pressed="false">${esc(col.label || CHAIN_STAGES.find(s => s.id === col.stages[0]).label)}</button>`).join('')}
      </div>
      <ol class="nhstories" id="nhStories" data-tickers="${esc(tickers.join(','))}">
        <li class="nhempty">Loading the latest stories…</li>
      </ol>
      <button type="button" class="nhchip press nhmore" id="nhMore" aria-pressed="false" hidden>Show market commentary</button>
      <p class="nhdisc">Headlines are third-party and shown as published. Stock-tip and valuation pieces are
        hidden as market commentary — one tap shows them. “Touches” lists the operators a named
        company is linked to by a filing — exposure, not a prediction, and never investment advice.</p>
    </section>

    <aside class="nhside" aria-labelledby="nh-record">
      <h2 id="nh-record">On the record</h2>
      <p class="nhmeta">Filings T2C has read</p>
      ${freshnessPanel(freshness)}
      <ul class="nhrecord">
        ${record.map(sg => `<li>
          <span class="hmwhen">${esc(date(sg.announcedAt))}</span>
          <span class="nhrecwhat">${esc(headlineFor(sg))}</span>
          ${sourceChips(sg.sourceIds || [])}
        </li>`).join('')}
      </ul>
      <a class="hmmore press" href="/intelligence/">The full ledger →</a>
      <a class="cofeed press" href="/feed.xml">Follow the record by RSS</a>
    </aside>
  </div>

  <section class="nhmodels" id="models" aria-labelledby="nh-models">
    <div class="nhsechead">
      <h2 id="nh-models">The models the compute is for</h2>
      <a class="hmmore press" href="/models/">Every model, with prices →</a>
    </div>
    ${modelStrip(6)}
  </section>
</div>`;
}

/** Each provider's lead model, for the homepage strip. */
export function modelStrip(limit = 6) {
  return `<div class="nhmodelgrid hmmodels">${PROVIDERS.slice(0, limit).map(p => {
    const m = p.models[0];
    return modelCard(p, m).replace('<h4 class="nhmname">', `<p class="hmprov">${esc(p.name)}</p><h4 class="nhmname">`);
  }).join('')}</div>`;
}

/** Every listed company on the map, which is what the news feed is asked for. */
export const newsTickers = () => [...new Set(CHAIN_COMPANIES.map(c => c.ticker).filter(Boolean))];
