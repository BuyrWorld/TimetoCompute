/**
 * /models/ — what the compute is for: every current model, when it came
 * out, what it does, what it costs to run, what a subscription costs in
 * your country, and who builds with it.
 *
 * Built from data/models.js (the lineup and the providers' own lines),
 * data/modelfacts.js (dates, specs, API prices, each with a source and a
 * basis) and data/plans.js (subscriptions, with App Store prices per
 * country). Nothing here is estimated by T2C: a figure is the provider's,
 * a marketplace's (labelled), or "not published".
 */
import { PROVIDERS, MODEL_KINDS, MODELS_ACCESSED } from '../data/models.js';
import { MODEL_FACTS, BUILT_WITH, FACTS_ACCESSED } from '../data/modelfacts.js';
import { PLAN_PROVIDERS, FREE_APPS, STOREFRONTS, STORE_ACCESSED, STORE_APPS, storePrice } from '../data/plans.js';
import { CHAIN_COMPANY_BY_ID, CHAIN_LINKS } from '../data/chain.js';
import { SOURCE_BY_ID } from '../data/sources.js';
import { perUsd } from './lib/fx.js';
import { operatorsFor } from './newshub.js';
import { esc, date } from './lib/format.js';

const BASIS = { provider: 'From the provider', listing: 'Marketplace estimate' };
const UNIT = { minute: 'a minute', second: 'a second', image: 'an image', song: 'a song' };
const usd = v => `$${v < 1 ? String(+v.toFixed(4)) : v.toFixed(2).replace(/\.00$/, '')}`;
const tokens = n => n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1000)}K`;
const DAY = 86400000;

function srcLink(id, label) {
  const s = SOURCE_BY_ID[id];
  return s ? `<a class="cxsrc" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(label || s.publisher)} ↗</a>` : '';
}

/** A US-dollar figure the reader's currency can replace. */
const money = v => `<span class="mpusd" data-usd="${v}">${esc(usd(v))}</span>`;

function apiLine(a) {
  if (!a) return `<p class="mpprice is-none">API price not published</p>`;
  const tag = `<span class="mpbasis mpbasis-${esc(a.basis)}">${esc(BASIS[a.basis])}</span>`;
  const body = a.per != null
    ? `${money(a.per)} ${esc(UNIT[a.unit] || a.unit)}`
    : `${a.from ? 'From ' : ''}${money(a.in)} in · ${money(a.out)} out <span class="mpunit">per million tokens</span>`;
  return `<p class="mpprice">${body}</p>
    <p class="mppricemeta">${tag}${a.note ? ` <span>${esc(a.note)}</span>` : ''} ${srcLink(a.src, a.basis === 'listing' ? 'OpenRouter' : null)}</p>`;
}

function card(p, m, f) {
  const src = SOURCE_BY_ID[m.sourceId || p.sourceId];
  const rel = f?.released
    ? `<span class="mpwhen">${f.basis === 'listing' ? 'Listed' : 'Released'} ${esc(date(f.released))}</span>`
    : `<span class="mpwhen is-none">Release date not published</span>`;
  const facts = [
    f?.context && `<li><b>${esc(tokens(f.context))}</b> context</li>`,
    f?.maxOut && `<li><b>${esc(tokens(f.maxOut))}</b> max output</li>`,
    f?.reasoning && '<li>Reasons step by step</li>',
    f?.inputs && `<li>Reads ${esc(f.inputs.join(', '))}</li>`,
    f?.openWeights && '<li><b>Open weights</b></li>'
  ].filter(Boolean);
  return `<article class="mpcard" data-kind="${esc(m.kind)}" data-prov="${esc(p.id)}"
      data-released="${esc(f?.released || '')}" data-cost="${f?.api?.in ?? ''}">
    <div class="mptop">
      <span class="nhkind nhkind-${esc(m.kind)}">${esc(MODEL_KINDS[m.kind])}</span>
      ${rel}
    </div>
    <p class="mpprov">${esc(p.name)}</p>
    <h3 class="mpname">${esc(m.name)}</h3>
    ${m.quote ? `<blockquote class="nhquote">“${esc(m.quote)}”</blockquote>` : `<p class="nhnote">${esc(m.note)}</p>`}
    ${facts.length ? `<ul class="mpfacts">${facts.join('')}</ul>` : ''}
    ${apiLine(f?.api)}
    <p class="nhuses-h">What people build with it <span class="nhours">T2C summary</span></p>
    <ul class="nhuses">${m.uses.map(u => `<li>${esc(u)}</li>`).join('')}</ul>
    <p class="mpsrcs">${src ? srcLink(src.id, `${src.publisher} docs`) : ''}
      ${f?.src && f.src !== f.api?.src && f.basis === 'provider' ? srcLink(f.src, 'Release') : ''}</p>
  </article>`;
}

/** Store prices for every plan in every storefront, for the currency switch. */
function storeTable() {
  const out = {};
  for (const prov of PLAN_PROVIDERS) for (const pl of prov.plans) if (pl.store) {
    out[`${prov.app}|${pl.store}`] = Object.fromEntries(STOREFRONTS.map(s => [s.cc, storePrice(prov.app, s.cc, pl.store)]));
  }
  return out;
}

function webPrice(w) {
  if (!w) return '<span class="nd">Not published</span>';
  const parts = [];
  if (w.usd != null) parts.push(`${w.from ? 'from ' : ''}${w.usd === 0 ? '$0' : esc(usd(w.usd))}`);
  if (w.gbp != null) parts.push(`${w.from ? 'from ' : ''}£${w.gbp === 0 ? '0' : esc(w.gbp.toFixed(2).replace(/\.00$/, ''))}`);
  return parts.length ? `${parts.join(' · ')}${w.perSeat ? ' a seat' : ''} <span class="mpunit">a month</span>` : '<span class="nd">Not published</span>';
}

function plansSection(fx) {
  return `<section class="mpsec" id="plans" aria-labelledby="mp-plans-h">
  <div class="nhsechead"><h2 id="mp-plans-h">What a subscription costs</h2>
    <span class="nhmeta">Monthly, in <span class="mpcountry">the United States</span></span></div>
  <p class="mpintro">The <b>App Store price</b> is what each provider charges in that country's App Store, read ${esc(date(STORE_ACCESSED))}.
    It includes local tax and can be higher than buying on the web, because Apple takes a share. The <b>web price</b> is from the
    provider's own pricing page, in the currency it showed.</p>
  <div class="mpplans">
  ${PLAN_PROVIDERS.map(prov => `<div class="mpplanprov">
    <h3>${esc(prov.name)}</h3>
    <table class="mptable">
      <thead><tr><th scope="col">Plan</th><th scope="col">App Store</th><th scope="col">Web</th><th scope="col">Includes</th></tr></thead>
      <tbody>${prov.plans.map(pl => {
        const us = pl.store ? storePrice(prov.app, 'us', pl.store) : null;
        return `<tr><th scope="row">${esc(pl.name)}</th>
          <td>${pl.store ? `<span class="mpstore" data-store="${esc(`${prov.app}|${pl.store}`)}">${us ? esc(us) : '<span class="nd">Not listed here</span>'}</span>
            <span class="mpitem">${esc(pl.store)}</span>` : '<span class="nd">—</span>'}</td>
          <td>${webPrice(pl.web)}</td>
          <td>${esc(pl.models)}</td></tr>`;
      }).join('')}</tbody>
    </table>
    <p class="mpsrcs">${prov.src === 'appstore' ? '' : srcLink(prov.src, `${SOURCE_BY_ID[prov.src]?.publisher} plans`)}
      <a class="cxsrc" href="https://apps.apple.com/us/app/id${STORE_APPS[prov.app]}" target="_blank" rel="noopener" data-appstore="${STORE_APPS[prov.app]}">App Store listing ↗</a></p>
  </div>`).join('')}
  </div>
  <p class="nhmeta">${FREE_APPS.map(a => `<b>${esc(a.name)}</b>: ${esc(a.note)}`).join(' · ')}. Apple shows at most ten purchases per app,
    so a plan marked “not listed here” may still exist in that country.</p>
</section>`;
}

function builtWith() {
  const chainApps = id => CHAIN_LINKS.filter(l => l.from === id && CHAIN_COMPANY_BY_ID[l.to]?.stage === 'applications');
  const models = Object.values(CHAIN_COMPANY_BY_ID).filter(c => c.stage === 'models');
  const fromFilings = models.flatMap(mo => chainApps(mo.id).map(l => ({ model: mo.name, l })));
  return `<section class="mpsec" id="built" aria-labelledby="mp-built-h">
  <div class="nhsechead"><h2 id="mp-built-h">Built with these models</h2>
    <span class="nhmeta">Only what a provider, or a filing, says</span></div>
  <div class="mpbuilt">
  ${PROVIDERS.filter(p => BUILT_WITH[p.id]).map(p => `<div class="mpbuiltprov"><h3>${esc(p.name)}</h3><ul>
    ${BUILT_WITH[p.id].map(b => `<li><b>${esc(b.what)}</b> <span>${esc(b.how)}</span> ${srcLink(b.src)}</li>`).join('')}</ul></div>`).join('')}
  ${fromFilings.length ? `<div class="mpbuiltprov"><h3>From the supply-chain map</h3><ul>
    ${fromFilings.map(({ model, l }) => `<li><b>${esc(CHAIN_COMPANY_BY_ID[l.to].name)}</b> <span>${esc(model)}: ${esc(l.what)}</span>
      <a class="cxsrc" href="/?entity=${esc(l.to)}">On the chain →</a></li>`).join('')}</ul></div>` : ''}
  </div>
  <p class="nhmeta">${esc(PROVIDERS.filter(p => !BUILT_WITH[p.id]).map(p => p.name).join(', '))}: no named product or customer found
    on the provider's own pages.</p>
</section>`;
}

export function modelsPageBody({ fx, now = new Date() }) {
  const all = PROVIDERS.flatMap(p => p.models.map(m => ({ p, m, f: MODEL_FACTS[m.name] })));
  const recent = all.filter(x => x.f?.released && now - new Date(x.f.released) <= 30 * DAY)
    .sort((a, b) => b.f.released.localeCompare(a.f.released));
  return `<div class="t2c-shell mp">
  <header class="mphead">
    <p class="ed-eyebrow">What the compute is for</p>
    <h1 class="mph">Every AI model, what it costs and what it is for</h1>
    <p class="mplede">${all.length} current models from ${PROVIDERS.length} providers: when each came out, what it can do,
      what it costs to run, and what a subscription costs where you live. Every figure links to where it came from.</p>
    <div class="mpbar">
      <label class="mpcur" for="mpCountry">Prices for
        <select id="mpCountry">${STOREFRONTS.map(s => `<option value="${esc(s.cc)}" data-currency="${esc(s.currency)}"
          data-locale="${esc(s.locale)}">${esc(s.name)} (${esc(s.currency)})</option>`).join('')}</select></label>
      <p class="mpfx" id="mpFx">API prices are set in US dollars. Other currencies are converted at the
        <a href="${esc(SOURCE_BY_ID['ecb-fx'].url)}" target="_blank" rel="noopener">European Central Bank</a> rate of
        ${esc(date(fx.date))} and marked ≈.</p>
    </div>
  </header>

  ${recent.length ? `<section class="mpsec" aria-labelledby="mp-new-h">
    <div class="nhsechead"><h2 id="mp-new-h">New in the last 30 days</h2><span class="nhmeta">${recent.length} models</span></div>
    <ol class="mpnew">${recent.map(({ p, m, f }) => `<li><span class="mpwhen">${esc(date(f.released))}</span>
      <a href="#m-${esc(slug(m.name))}"><b>${esc(m.name)}</b></a> <span>${esc(p.name)}</span></li>`).join('')}</ol>
  </section>` : ''}

  <section class="mpsec" id="models" aria-labelledby="mp-all-h">
    <div class="nhsechead"><h2 id="mp-all-h">Every current model</h2>
      <label class="mpsort">Sort by <select id="mpSort">
        <option value="new">Newest first</option><option value="cheap">Cheapest to run</option><option value="prov">Provider</option>
      </select></label></div>
    <div class="nhfilters" role="group" aria-label="Filter models by what they do">
      <button type="button" class="nhchip press is-on" data-mpkind="all" aria-pressed="true">All</button>
      ${Object.entries(MODEL_KINDS).map(([k, v]) => `<button type="button" class="nhchip press" data-mpkind="${esc(k)}" aria-pressed="false">${esc(v)}</button>`).join('')}
    </div>
    <div class="mpgrid" id="mpGrid">${all.map(({ p, m, f }) => card(p, m, f).replace('<article class="mpcard"', `<article id="m-${esc(slug(m.name))}" class="mpcard"`)).join('')}</div>
    <p class="nhdisc"><b>Marketplace estimate</b> means the provider publishes no price or date, so the figure is from
      OpenRouter, the largest marketplace reselling model APIs. Where both exist they usually match, but OpenRouter can charge
      more. Its date is when it listed the model. “What people build with it” is T2C's own summary of the provider's description.</p>
  </section>

  ${plansSection(fx)}
  ${builtWith()}
  ${computeBehind()}

  <section class="mpsec" aria-labelledby="mp-how-h">
    <h2 id="mp-how-h">Where these figures come from</h2>
    <p class="mpintro">Provider documentation, changelogs, launch posts and pricing pages, read ${esc(date(FACTS_ACCESSED))};
      the lineup itself as listed on ${esc(date(MODELS_ACCESSED))}. Prices change often, so check the linked page before you buy.
      No provider says which model runs in which data centre, so T2C never links a model to a site.</p>
  </section>
</div>`;
}

/** The tie back to the rest of the site: whose data centres each provider has signed for. */
function computeBehind() {
  const rows = PROVIDERS.map(p => ({ p, ops: operatorsFor(p.chainId) })).filter(x => x.ops.length);
  return `<section class="mpsec" id="compute" aria-labelledby="mp-compute-h">
  <div class="nhsechead"><h2 id="mp-compute-h">The data centres behind them</h2>
    <span class="nhmeta">Capacity each provider has signed for, from the operators' filings</span></div>
  <ul class="mpcompute">${rows.map(({ p, ops }) => `<li><b>${esc(p.name)}</b> ${ops.map(o =>
    `<span>${esc(o.name)} <small>${esc(o.what)}</small></span>`).join('')}
    <a class="cxsrc" href="/?entity=${esc(p.chainId)}">Trace it on the chain →</a></li>`).join('')}</ul>
  <p class="nhmeta">No provider says which model runs in which data centre, so these are the provider's contracts, not a model's.</p>
</section>`;
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** What the client needs to switch currency: rates per dollar and every store price. */
export function modelsPageData(fx) {
  return {
    fxDate: fx.date,
    perUsd: Object.fromEntries([...new Set(STOREFRONTS.map(s => s.currency))].map(c => [c, perUsd(fx, c)])),
    storefronts: STOREFRONTS,
    store: storeTable()
  };
}
