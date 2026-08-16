/**
 * AI News components.
 *
 * Every signal answers the same three questions in the same order — what
 * happened, why it matters, what may happen next — because a reader who has
 * learned that shape on the featured card should not have to relearn it in the
 * feed. The order is the product.
 *
 * Two things that look like decoration and are not:
 *   - The affected-stage chips link to the explainers built in phase 3, so a
 *     reader who does not know what "acceptance" means is one click from finding
 *     out rather than being expected to already know.
 *   - The evidence count opens the documents. A material claim that cannot be
 *     traced is the one thing this page may not ship.
 */
import { esc, date } from './lib/format.js';
import { cutout } from './chain-ui.js';
import { MATERIALITY } from './lib/ainews.js';

/* ------------------------------------------------------------- the header ---- */

/**
 * The finite counter.
 *
 * "N material signals" with a progress bar the reader can actually finish. The
 * total is the whole record, not a page of one, and the page says so.
 */
export function newsHeader({ set, total, disclosures, combined }) {
  return `<header class="an-head">
    <div class="an-headcopy">
      <h1 class="an-h1">AI news &mdash; only what changes the chain<span class="dot">.</span></h1>
      <p class="an-lede">T2C filters the record into supply-chain signals: what happened, why it
        matters, who is affected, and what may happen next.</p>
      <p class="an-simple">(In simple terms: the things that actually move a project forward, and
        nothing else.)</p>
    </div>

    <aside class="an-counter" aria-labelledby="an-count-h">
      <p class="an-counterkicker" id="an-count-h">The whole record</p>
      <p class="an-counterfig"><b>${total}</b> material signal${total === 1 ? '' : 's'}</p>
      <div class="an-progress" id="anProgress"
        role="progressbar" aria-valuemin="0" aria-valuemax="${set.rows.length}"
        aria-valuenow="0" aria-label="Signals reviewed in the latest set">
        ${set.rows.map((_, i) => `<span class="an-pip" data-pip="${i}"></span>`).join('')}
      </div>
      <p class="an-counternote" id="anReviewCount" aria-live="polite">
        0 of ${set.rows.length} reviewed${set.at ? ` &middot; latest ${esc(date(set.at))}` : ''}
      </p>
      <p class="an-counternoise">${disclosures} disclosure${disclosures === 1 ? '' : 's'}${
        combined ? `, ${combined} of them reported as more than one record` : ''}.
        <a class="press" href="#an-grouping">How grouping works</a></p>
    </aside>
  </header>`;
}

/* ------------------------------------------------------------ the filters ---- */

/**
 * Filters.
 *
 * Rendered as real buttons with `aria-pressed`, and every option is derived from
 * the set — a filter that would return nothing is never offered, because
 * discovering an option is dead by selecting it is worse than not seeing it.
 */
export function newsFilters(opts) {
  return `<div class="an-filters" role="group" aria-label="Filter signals">
    <div class="an-filterrow">
      <button type="button" class="an-filter is-on" data-filter="cat" data-value=""
        aria-pressed="true">All <span class="an-fcount">${opts.categories.reduce((a, c) => a + c.count, 0)}</span></button>
      ${opts.categories.map(c => `<button type="button" class="an-filter"
        data-filter="cat" data-value="${esc(c.id)}" aria-pressed="false">
        ${esc(c.label)} <span class="an-fcount">${c.count}</span></button>`).join('')}
    </div>
    <div class="an-filterrow">
      <label class="an-select">
        <span class="vh">Minimum materiality</span>
        <select id="anMateriality" data-filter="mat">
          <option value="">Any materiality</option>
          ${opts.materialities.map(m => `<option value="${esc(m.id)}">
            ${esc(m.label)} and above (${m.count})</option>`).join('')}
        </select>
      </label>
      <label class="an-select">
        <span class="vh">Company</span>
        <select id="anCompany" data-filter="co">
          <option value="">Any company</option>
          ${opts.companies.map(c => `<option value="${esc(c.ticker)}">
            ${esc(c.ticker)} — ${esc(c.name)} (${c.count})</option>`).join('')}
        </select>
      </label>
      <button type="button" class="an-filter" id="anWatchOnly" data-filter="watch"
        aria-pressed="false">My watchlist</button>
      <button type="button" class="an-reset" id="anReset">Reset</button>
    </div>
    <p class="an-filterstate" id="anFilterState" aria-live="polite"></p>
  </div>`;
}

/* ------------------------------------------------------------- the signal ---- */

/** The three questions, in the order that makes a signal readable. */
const triad = r => `<dl class="an-triad">
  <div class="an-tq">
    <dt><span class="an-tqmark" aria-hidden="true">?</span> What happened</dt>
    <dd>${esc(r.happened)}</dd>
  </div>
  <div class="an-tq">
    <dt><span class="an-tqmark" aria-hidden="true">&#10003;</span> Why it matters</dt>
    <dd>${esc(r.matters)}</dd>
  </div>
  <div class="an-tq">
    <dt><span class="an-tqmark" aria-hidden="true">&rarr;</span> What may happen next</dt>
    <dd>${esc(r.next)}</dd>
  </div>
</dl>`;

/** Affected stages, each a link into the explainer system. */
const stageChips = r => r.stages.length
  ? `<ul class="an-stages" role="list">
      ${r.stages.map(s => `<li><a class="an-stage press" href="${esc(s.href)}">
        <span class="an-stageart" aria-hidden="true">
          ${cutout(s.asset, { sizes: '40px', alt: '', className: 'an-stageimg' })}
        </span>${esc(s.label)}</a></li>`).join('')}
    </ul>`
  : '';

/**
 * Evidence: the count, and the documents themselves.
 *
 * `where` namespaces the id because the lead signal is deliberately shown twice
 * — once as the featured card and again in its place in the feed — and two
 * elements sharing an id makes every anchor to it ambiguous.
 */
const evidence = (r, where) => `<details class="an-ev" id="ev-${esc(where)}-${esc(r.id)}">
  <summary class="an-evsum">
    <span class="an-evcount">${r.sourceCount} source${r.sourceCount === 1 ? '' : 's'}</span>
    <span class="an-evconf" data-conf="${esc(r.confidence)}">${esc(r.confidence)}</span>
  </summary>
  <ul class="an-evlist" role="list">
    ${r.sources.map(s => `<li class="an-evitem">
      <a class="an-evlink press" href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.title)}</a>
      <span class="an-evmeta">${esc(s.publisher)} &middot; ${esc(date(s.publishedAt))}
        &middot; ${s.isPrimary ? 'Primary' : 'Secondary'}</span>
      ${s.supportingExcerpt ? `<span class="an-evex">${esc(s.supportingExcerpt)}</span>` : ''}
    </li>`).join('')}
  </ul>
  <p class="an-evnote">T2C records what the document says. It does not verify the underlying event
    independently. <a class="press" href="/methodology/">How evidence is graded</a></p>
</details>`;

/**
 * The featured signal.
 *
 * Gets the editorial image only when the signal genuinely concerns photonics —
 * the pack is explicit that the optical-network raster must not become a generic
 * story image, and nothing on file is photonics, so today it never appears.
 */
export function featuredCard(r, { showArt = false } = {}) {
  if (!r) {
    return `<p class="an-empty">No confirmed signal is on file yet. Nothing is featured rather than
      promoting a weaker record into the lead.</p>`;
  }
  return `<article class="an-featured" data-id="${esc(r.id)}"
    data-cat="${esc(r.category)}" data-mat="${esc(r.materiality)}" data-co="${esc(r.ticker || '')}">
    ${showArt ? `<figure class="an-featart">
      ${cutout('optical-network-signal', {
        sizes: '(min-width: 1100px) 420px, 100vw', className: 'an-featimg'
      })}
      <figcaption class="an-featcap">Illustrative. Not a photograph of any named project.</figcaption>
    </figure>` : ''}

    <div class="an-featbody">
      <p class="an-featkicker">Lead signal
        <span class="an-featcat">${esc(r.categoryLabel)}</span></p>
      <h2 class="an-feath">${esc(r.title)}</h2>
      ${triad(r)}

      <div class="an-featmeta">
        <span class="an-badge" data-mat="${esc(r.materiality)}">${esc(r.materialityLabel)} materiality</span>
        ${evidence(r, 'lead')}
      </div>

      ${stageChips(r)}

      <div class="an-featacts">
        <a class="ed-cta primary press" href="/companies/${esc(r.companySlug || '')}/">
          ${esc(r.companyName)} <span aria-hidden="true">&rarr;</span></a>
        <button type="button" class="an-act press" data-review="${esc(r.id)}"
          aria-pressed="false">Mark reviewed</button>
        <button type="button" class="an-act press" data-bookmark="${esc(r.id)}"
          aria-pressed="false">Bookmark</button>
      </div>
    </div>
  </article>`;
}

/** A row in the material-signal feed. */
export function signalRow(r, group) {
  return `<li class="an-row" data-id="${esc(r.id)}"
    data-cat="${esc(r.category)}" data-mat="${esc(r.materiality)}" data-co="${esc(r.ticker || '')}">
    <div class="an-rowhead">
      <span class="an-rowdate">${esc(date(r.announcedAt))}</span>
      <span class="an-badge" data-mat="${esc(r.materiality)}">${esc(r.materialityLabel)}</span>
      <span class="an-rowcat">${esc(r.categoryLabel)}</span>
      ${group && group.grouped > 1
        ? `<span class="an-rowgroup" title="These records come from one document">
             ${group.grouped} records &middot; 1 disclosure</span>` : ''}
    </div>

    <h3 class="an-rowh">${esc(r.title)}</h3>
    ${triad(r)}

    <div class="an-rowfoot">
      <span class="an-rowco">
        ${r.companySlug
          ? `<a class="press" href="/companies/${esc(r.companySlug)}/">${esc(r.ticker || r.companyName)}</a>`
          : esc(r.companyName)}${r.projectName ? ` &middot; ${esc(r.projectName)}` : ''}
      </span>
      ${stageChips(r)}
      ${evidence(r, 'feed')}
      <span class="an-rowacts">
        <button type="button" class="an-act press" data-review="${esc(r.id)}"
          aria-pressed="false">Mark reviewed</button>
        <button type="button" class="an-act press" data-bookmark="${esc(r.id)}"
          aria-pressed="false">Bookmark</button>
      </span>
    </div>
  </li>`;
}

/* --------------------------------------------------------------- the rail ---- */

/** Watchlist impact. Counts ship; the browser decides which are watched. */
export function watchlistImpact(rows) {
  return `<section class="an-panel" aria-labelledby="an-watch-h">
    <h2 class="an-panelh" id="an-watch-h">Your watchlist</h2>
    <ul class="an-watchlist" role="list" id="anWatchImpact">
      ${rows.map(r => `<li class="an-watchrow" data-co="${esc(r.ticker)}" hidden>
        <a class="an-watchlink press" href="/companies/${esc(r.slug)}/">
          <span class="an-watchticker">${esc(r.ticker)}</span>
          <span class="an-watchcount">${r.count} signal${r.count === 1 ? '' : 's'}${
            r.high ? `, ${r.high} high` : ''}</span>
        </a>
      </li>`).join('')}
    </ul>
    <p class="an-panelempty" id="anWatchEmpty">You are not watching any company yet.
      <a class="press" href="/companies/">Pick some</a> and their signals appear here.</p>
    <p class="an-panelnote">Watchlists are stored on this device only. Nothing about what you read
      leaves the browser.</p>
  </section>`;
}

/** Upcoming catalysts. A window stays a window. */
export function catalystPanel(rows) {
  if (!rows.length) {
    return `<section class="an-panel" aria-labelledby="an-cat-h">
      <h2 class="an-panelh" id="an-cat-h">Upcoming catalysts</h2>
      <p class="an-panelempty">No dated catalyst is on file ahead of today.</p>
    </section>`;
  }
  return `<section class="an-panel" aria-labelledby="an-cat-h">
    <h2 class="an-panelh" id="an-cat-h">Upcoming catalysts</h2>
    <ul class="an-cats" role="list">
      ${rows.map(c => `<li class="an-cat">
        <span class="an-catwhen">${esc(date(c.when))}${c.isWindow ? '<small>from</small>' : ''}</span>
        <span class="an-catbody">
          <span class="an-cattitle">${esc(c.title)}</span>
          <span class="an-catco">${esc(c.ticker)}</span>
        </span>
      </li>`).join('')}
    </ul>
    <a class="an-panellink press" href="/catalysts/">Full calendar <span aria-hidden="true">&rarr;</span></a>
  </section>`;
}

/** Source quality. */
export function sourcePanel(q) {
  return `<section class="an-panel" aria-labelledby="an-src-h">
    <h2 class="an-panelh" id="an-src-h">Source quality</h2>
    <ul class="an-srcq" role="list">
      ${q.rows.map(r => `<li class="an-srcrow">
        <span class="an-srcfig">${r.count}</span>
        <span class="an-srclabel">${esc(r.label)}</span>
      </li>`).join('')}
    </ul>
    <p class="an-panelnote">${q.allPrimary
      ? `All ${q.total} signals rest on a primary document — a filing, an official release or a
         regulator record. News can put a figure on this site; it can never make one confirmed.`
      : 'Some signals rest on second-hand reporting and are marked as such.'}</p>
  </section>`;
}

/** How grouping works — the honest version of "noise removed". */
export function groupingNote({ records, disclosures, combined }) {
  return `<section class="an-grouping" id="an-grouping" aria-labelledby="an-group-h">
    <h2 class="an-panelh" id="an-group-h">How coverage is grouped</h2>
    <p><b>${records} records</b> come from <b>${disclosures} disclosures</b>.
      ${combined
        ? `${combined} document${combined === 1 ? '' : 's'} produced more than one record — a quarterly
           release that moves two figures at once is one disclosure, not two events.`
        : 'No document produced more than one record in the current set.'}</p>
    <p class="an-panelnote">This is the only grouping rule applied: records resting on <b>exactly the
      same document</b> are one disclosure. T2C does not group by matching headlines, because deciding
      that two differently-worded announcements are "really" the same story is a judgement it cannot
      evidence. Corrections are never folded into the record they correct.
      <a class="press" href="/methodology/">Read the methodology</a></p>
  </section>`;
}
