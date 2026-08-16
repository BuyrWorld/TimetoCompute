/**
 * /ai-news/ — the finite signal product.
 *
 * HOW THIS DIFFERS FROM THE TWO ROUTES THAT ALREADY EXIST, because three
 * news-shaped pages needs justifying rather than assuming:
 *
 *   /ai-news/       This page. Every sourced change, written as what happened,
 *                   why it matters and what may happen next, with a finite set
 *                   the reader can finish. The editorial front.
 *   /intelligence/  The same records as a dense, filterable ledger with the raw
 *                   metric movements. The expert view, for somebody who already
 *                   knows the vocabulary.
 *   /news/          Third-party wire headlines. NOT T2C records, and clearly
 *                   separated — the wire is unfiltered by design.
 *
 * Each page says which of the three it is, so nobody has to guess.
 */
import { esc } from './lib/format.js';
import {
  newsHeader, newsFilters, featuredCard, signalRow, watchlistImpact,
  catalystPanel, sourcePanel, groupingNote
} from './ainews-ui.js';
import {
  signalGroups, featuredSignal, dailySet, sourceQuality,
  companyImpact, upcomingCatalysts, filterOptions
} from './lib/ainews.js';

export function aiNewsBody() {
  const grouped = signalGroups();
  const featured = featuredSignal();
  const set = dailySet();
  const opts = filterOptions();
  const quality = sourceQuality();
  const impact = companyImpact();
  const catalysts = upcomingCatalysts();

  /* The lead is lifted OUT of the feed rather than repeated in it. Showing the
     same headline twice in succession reads as a bug, and the reader has no way
     to tell the two apart. Review state is keyed by id either way, so nothing is
     lost by removing the duplicate — and the counter above still reports the
     whole record, so the total does not quietly shrink. */
  const rows = featured
    ? grouped.groups.filter(g => g.lead.id !== featured.id)
    : grouped.groups;

  return `<div class="t2c-shell ed-main an-page">
  ${newsHeader({
    set,
    total: grouped.records,
    disclosures: grouped.disclosures,
    combined: grouped.combined
  })}

  ${newsFilters(opts)}

  <div class="an-layout">
    <div class="an-main">
      <section class="an-section" aria-labelledby="an-lead-h">
        <h2 class="vh" id="an-lead-h">Lead signal</h2>
        ${featuredCard(featured)}
      </section>

      <section class="an-section" aria-labelledby="an-feed-h">
        <div class="ed-sectionhead">
          <h2 class="ed-sectionh" id="an-feed-h">Material signals</h2>
          <span class="ed-morelink" id="anShown">${rows.length} disclosures</span>
        </div>
        ${featured ? `<p class="an-feednote">The lead signal above is the most recent of the
          ${grouped.disclosures}. The rest follow, newest first.</p>` : ''}
        <ul class="an-feed" role="list" id="anFeed">
          ${rows.map(g => signalRow(g.lead, g)).join('')}
        </ul>

        <div class="an-caughtup" id="anCaughtUp" hidden>
          <span class="an-cuglyph" aria-hidden="true">&#10003;</span>
          <h3>You're caught up</h3>
          <p>You have reviewed every signal in the latest set. This is the whole record, not the
            first page of one — there is nothing more to load.</p>
          <a class="ed-cta secondary press" href="/chain/">Explore the chain <span aria-hidden="true">&rarr;</span></a>
        </div>

        <p class="an-noresults" id="anNoResults" hidden>No signal matches those filters.
          <button type="button" class="an-reset" id="anResetInline">Clear them</button></p>
      </section>

      ${groupingNote(grouped)}

      <p class="an-crosslink">Want the raw metric movements rather than the write-up?
        <a class="press" href="/intelligence/">The intelligence ledger</a> carries the same records
        with every figure and its previous value. For third-party headlines T2C has not verified,
        see the <a class="press" href="/news/">news wire</a>.</p>
    </div>

    <aside class="an-rail" aria-label="Context">
      ${watchlistImpact(impact)}
      ${catalystPanel(catalysts)}
      ${sourcePanel(quality)}
    </aside>
  </div>
</div>`;
}

/**
 * The client's view of the set.
 *
 * Shipped as JSON so the filter code does not have to re-parse the DOM to know
 * what exists. Ids only — no reader state, which lives on the device.
 */
export function aiNewsConfig() {
  const grouped = signalGroups();
  return {
    ids: grouped.groups.map(g => g.lead.id),
    /* The latest set is what the progress bar measures. It includes the lead
       even though the lead renders above the feed, because the reader still has
       to review it — the pips would otherwise be unfillable. */
    latest: dailySet().rows.map(r => r.id)
  };
}
