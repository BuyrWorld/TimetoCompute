/**
 * Route page bodies.
 *
 * One function per route. Each returns only the page content — the shell, header
 * and footer live in build.js. Internal pages deliberately do NOT repeat the
 * marketing hero, the aggregate strip or the ticker: the tool starts at the top.
 */
import { METRICS, MODELS, POWER_BASIS } from '../data/schema.js';
import { COUNTRY_NAMES } from '../data/projects.js';
import { COMPANIES, WATCH_TICKERS, TICKER_NAMES } from '../data/companies.js';
import { PROFILES, PROFILE_BY_ID, PROFILE_BY_TICKER } from '../data/profiles.js';
import { CATALYSTS } from '../data/catalysts.js';
import { LAB_COVERAGE, CONTRACT_ECONOMICS, MODEL_DEFAULTS, CAPEX_REFERENCE, ASSUMPTION_PROVENANCE } from '../data/economics.js';
import {
  aggregate, ledger, companySnapshots, briefing, companyView, deliveryRecord, currentStage
} from './lib/compute.js';
import { esc, mw, pct, date, NOT_DISCLOSED, windowLabel } from './lib/format.js';
import { MAX_TICKERS, tickerOptions } from './lib/compare.js';
import { VOL_METHODOLOGY } from './lib/odds.js';
import {
  briefingCards, snapshotCards, kpiCards, ledgerPanel, capacityTable, contractsTable,
  countryPanel, evidenceKey, valueTypeKey, basisKey, reconciliationPanel, dataHealthPanel,
  deliveryRecordPanel, sourceChips, evidenceChip, pill, catalystPanel
} from './ui.js';
import { allSites, furthestStage, stageFilterOptions } from './lib/sites.js';
import { signals, availableCategories, todaySet, toSignal, CATEGORIES } from './lib/signals.js';
import {
  siteCard, pathTrack, statusLadder, dependencyGrid, replayTrack, confidenceFact,
  signalList, signalFilters, siteContracts, nextMilestonePanel,
  infrastructureMap, watchlistPanel, signalProgress
} from './mission-ui.js';
import { GROSS_TO_CRITICAL_IT } from './lib/estimate.js';
import { leadStory } from './lib/leadstory.js';
import {
  deliveryLeaders, nextCatalyst, promiseReality, megaprojects, imageForSite, EXPLAINER_STEPS
} from './lib/homepage.js';
import {
  leadStoryHero, whyDrawer, returningSummary, nextCatalystCard, audienceLens,
  megaprojectCard, explainer, deliveryLeaders as edDeliveryLeaders,
  promiseReality as promiseRealityPanel
} from './editorial-ui.js';
import { ASSET } from './lib/assets.js';

/* ================= shared bits ================= */

/**
 * Filter options are derived from the records, never hand-listed. A hand-listed
 * option that no company matches is a dead end the reader has to discover by
 * selecting it, and one that is missing hides companies entirely.
 */
function stageOptions() {
  const seen = new Map();
  for (const s of companySnapshots()) if (s.stage) seen.set(s.stage.id, s.stage);
  return [...seen.values()]
    .sort((a, b) => b.order - a.order)
    .map(s => `<option value="${esc(s.id)}">${esc(s.short)}</option>`).join('');
}

function modelOptions() {
  const seen = [...new Set(COMPANIES.map(c => c.model))];
  return seen.map(m => `<option value="${esc(m)}">${esc(MODELS[m].label)}</option>`).join('');
}

const section =(id, title, meta, body, { plain = false } = {}) => `
<section class="block" id="${id}">
  <div class="blockhead"><h2>${esc(title)}</h2>${meta ? `<span class="blockmeta">${meta}</span>` : ''}</div>
  ${plain ? body : `<div class="blockbody">${body}</div>`}
</section>`;

/* ================= / — Today ================= */

/**
 * The audience-led editorial homepage.
 *
 * One dominant story, consequence before technical detail, and every figure
 * still carrying the evidence that makes it checkable. The dense operational
 * modules that used to live here are not deleted — they moved to the routes
 * built for them, which is where a reader who wants them is already going.
 */
export function todayBody() {
  const story = leadStory();
  const leaders = deliveryLeaders(3);
  const catalyst = nextCatalyst();
  const pair = story.available ? promiseReality(story.signal.companyId) : null;
  const projects = megaprojects(3);

  /* Lens copy. Each panel explains the SAME facts for a different reader; none
     filters or recalculates anything. Power & communities deliberately stays
     general: T2C holds no sourced record of a named project's energy mix,
     water use, jobs or local impact, so it explains the topic without
     attributing a claim to anyone. */
  const lensCopy = {
    investments: `<p>Delivery is the thing a contract cannot guarantee. T2C tracks each operator from
        announcement to billing and shows which gate the evidence actually supports, so a signed
        agreement is never mistaken for revenue.</p>
      <ul class="ed-lenslist">
        <li>What has been <b>accepted by a customer</b>, not merely contracted.</li>
        <li>Where a guided window has <b>moved</b>, and by how long.</li>
        <li>Which figures rest on a primary document and which are second-hand.</li>
      </ul>
      <a class="ed-cta secondary press" href="/companies/">Compare the operators →</a>`,

    race: `<p>The constraint on AI is no longer only chips. It is power, land, grid connections and the
        years it takes to turn any of them into a hall a customer will accept.</p>
      <ul class="ed-lenslist">
        <li>Announced gigawatts are measured at the fence; usable compute is measured in the hall.</li>
        <li>The gap between the two is the story, and it is measured in years.</li>
        <li>${esc(String(projects.length))} of the tracked sites carry a dated change in the last quarter.</li>
      </ul>
      <a class="ed-cta secondary press" href="/sites/">See every tracked site →</a>`,

    power: `<p>A data centre is an electrical project before it is a computing one. Securing power,
        connecting to a grid and energising a site are separate gates that can each take years, and
        T2C tracks them separately for that reason.</p>
      <ul class="ed-lenslist">
        <li>Gross utility power is what a site draws at the connection.</li>
        <li>Critical IT load is what reaches the computing equipment — always the smaller figure.</li>
        <li>T2C holds no sourced record of any named project's energy mix, water use or local
          employment, so it makes no claim about them.</li>
      </ul>
      <a class="ed-cta secondary press" href="/methodology/#bases">How power is measured →</a>`
  };

  return `
${leadStoryHero(story, ASSET.hero)}
${whyDrawer(story)}

<div class="t2c-shell ed-main">
  ${returningSummary()}

  <section class="ed-section" aria-labelledby="buildout-h">
    <h2 class="ed-sectionh" id="buildout-h">The AI buildout today</h2>
    <div class="ed-grid4">
      <article class="ed-card">
        <h3 class="ed-cardh"><span class="ed-cardn" aria-hidden="true">1</span> Who is delivering?</h3>
        ${edDeliveryLeaders(leaders)}
      </article>

      <article class="ed-card">
        <h3 class="ed-cardh"><span class="ed-cardn" aria-hidden="true">2</span> Next big catalyst</h3>
        ${nextCatalystCard(catalyst)}
      </article>

      <article class="ed-card">
        <h3 class="ed-cardh"><span class="ed-cardn" aria-hidden="true">3</span> Promise vs reality</h3>
        ${pair ? `<p class="ed-cardsub">${esc(pair.ticker)}</p>` : ''}
        ${promiseRealityPanel(pair)}
      </article>

      <article class="ed-card">
        <h3 class="ed-cardh"><span class="ed-cardn" aria-hidden="true">4</span> Why should I care?</h3>
        ${audienceLens(lensCopy)}
      </article>
    </div>
  </section>

  <section class="ed-section" aria-labelledby="mega-h">
    <div class="ed-sectionhead">
      <h2 class="ed-sectionh" id="mega-h">Megaprojects to watch</h2>
      <a class="ed-morelink press" href="/sites/">All ${allSites().length} sites →</a>
    </div>
    <div class="ed-grid3">
      ${projects.map(s => megaprojectCard(s, ASSET[imageForSite(s)])).join('')}
    </div>
  </section>

  <section class="ed-section" id="evidence" aria-labelledby="expl-h">
    <h2 class="vh" id="expl-h">How an AI data centre makes money</h2>
    ${explainer(EXPLAINER_STEPS, ASSET['explainer-ai-datacentre-cutaway'])}
  </section>
</div>`;
}


/* ================= /companies/ ================= */

export function companiesBody() {
  const opts = tickerOptions();
  const tracked = COMPANIES.map(c => c.ticker);

  return `<div class="shell">
  ${pageHeadHtml({
    title: 'Companies',
    lede: 'Every tracked AI infrastructure operator, with what is switched on, what customers have ' +
      'signed for and what happens next.',
    meta: `<span class="pill-lite">${COMPANIES.length} fully tracked</span>
           <span class="pill-lite">${opts.length - COMPANIES.length} watchlist only</span>`
  })}

  <div class="filterbar" role="group" aria-label="Filter companies">
    <div class="fld">
      <label for="coSearch">Search</label>
      <input type="search" id="coSearch" placeholder="Company or ticker" autocomplete="off" />
    </div>
    <div class="fld">
      <label for="coModel">Operating model</label>
      <select id="coModel">
        <option value="">All models</option>
        ${modelOptions()}
      </select>
    </div>
    <div class="fld">
      <label for="coStage">Furthest stage reached</label>
      <select id="coStage">
        <option value="">Any stage</option>
        ${stageOptions()}
      </select>
    </div>
    <div class="fld">
      <label for="coSort">Sort by</label>
      <select id="coSort">
        <option value="operational">Capacity switched on</option>
        <option value="contracted">Capacity signed for</option>
        <option value="recent">Most recent verified change</option>
        <option value="catalyst">Next catalyst</option>
        <option value="name">Company name</option>
      </select>
    </div>
    <span class="filtercount" id="coCount" aria-live="polite">${COMPANIES.length} shown</span>
  </div>

  <p class="watchbanner" id="watchBanner" hidden>Showing only the companies you are watching.
    <a class="press" href="/companies/">Show all companies</a></p>

  <div id="companyGrid">${snapshotCards()}</div>

  ${section('watchonly', 'Watchlist only', 'Profile available, delivery not yet tracked',
    `<p class="blocklede">These are carried for price and news context. T2C does not maintain sourced
      delivery records for them, and they are excluded from every operational ranking.</p>
     <div class="watchgrid">
       ${PROFILES.filter(p => p.deliveryTracked === false).map(p => `
         <a class="watchcard" href="/companies/${esc(p.id)}/">
           <div class="watchtick">${esc(p.ticker)}</div>
           <div class="watchname">${esc(p.legalName)}</div>
           <p>${esc(p.shortDescription)}</p>
           <span class="watchgo">View profile →</span>
         </a>`).join('')}
     </div>`)}
</div>`;
}

/* ================= /compare/ ================= */

export function compareBody() {
  const opts = tickerOptions().filter(o => COMPANIES.some(c => c.ticker === o.ticker));
  const PRESETS = [
    { id: 'operators', label: 'Operational leaders', tickers: ['CRWV', 'APLD', 'WULF'] },
    { id: 'shells', label: 'Powered-shell developers', tickers: ['WULF', 'APLD', 'KEEL'] },
    { id: 'fullstack', label: 'Full-stack operators', tickers: ['IREN', 'CRWV', 'NBIS'] },
    { id: 'delivering', label: 'Furthest along', tickers: ['IREN', 'WULF', 'APLD'] }
  ];

  return `<div class="shell">
  ${pageHeadHtml({
    title: 'Compare',
    lede: `Put up to ${MAX_TICKERS} companies side by side on what they have actually delivered.`,
    meta: `<span class="pill-lite">Operational data — available now</span>`
  })}

  <div class="cmpbar">
    <div class="presets" role="group" aria-label="Comparison presets">
      <span class="presetlabel">Start from</span>
      ${PRESETS.map(p => `<button class="preset" type="button" data-preset="${p.tickers.join(',')}">${esc(p.label)}</button>`).join('')}
    </div>
    <div class="cmptray" id="cmpTray" aria-live="polite"></div>
    <details class="cmppicker">
      <summary>Add a company</summary>
      <div class="cmppickerpanel">
        ${opts.map(o => `<label class="cchip">
          <input type="checkbox" name="compare" value="${esc(o.ticker)}" />
          <span class="cct">${esc(o.ticker)}</span>
          <span class="ccn">${esc(o.name)}</span>
        </label>`).join('')}
        <p class="cmphint" id="cmpHint">Select up to ${MAX_TICKERS}.</p>
      </div>
    </details>
  </div>

  <div class="modebar" role="tablist" aria-label="Comparison mode">
    <button class="mode is-active" role="tab" type="button" data-mode="operational" aria-selected="true">Operational delivery</button>
    <button class="mode" role="tab" type="button" data-mode="catalysts" aria-selected="false">Catalyst timeline</button>
    <button class="mode" role="tab" type="button" data-mode="evidence" aria-selected="false">Evidence health</button>
    <button class="mode is-disabled" role="tab" type="button" data-mode="price" aria-selected="false" disabled
      title="Requires historical price candles, which the connected data plan does not provide">Share performance</button>
    <button class="mode is-disabled" role="tab" type="button" data-mode="analyst" aria-selected="false" disabled
      title="Requires analyst price targets, which the connected data plan does not provide">Analyst upside</button>
  </div>

  <div id="cmpOut"></div>
</div>`;
}

/* ================= /catalysts/ ================= */

export function catalystsBody() {
  return `<div class="shell">
  ${pageHeadHtml({
    title: 'Catalysts',
    lede: 'Dated events that could move an operational metric — with the certainty of each date made ' +
      'explicit, because a guided quarter is not a deadline.',
    meta: `<span class="pill-lite">${CATALYSTS.length} tracked</span>
           <span class="pill-lite">Earnings dates load live</span>`
  })}

  <div class="filterbar" role="group" aria-label="Filter catalysts">
    <div class="fld"><label for="catCompany">Company</label>
      <select id="catCompany"><option value="">All companies</option>
        ${COMPANIES.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div>
    <div class="fld"><label for="catCertainty">Date certainty</label>
      <select id="catCertainty"><option value="">Any</option>
        <option value="confirmed-date">Exact date</option>
        <option value="guided-window">Guided window</option>
        <option value="estimated-date">Estimated</option>
      </select></div>
    <div class="fld"><label for="catCategory">Type</label>
      <select id="catCategory"><option value="">All types</option>
        <option value="capacity-delivery">Capacity delivery</option>
        <option value="customer-acceptance">Customer acceptance</option>
        <option value="earnings">Earnings</option>
        <option value="energisation">Energisation</option>
      </select></div>
    <span class="filtercount" id="catCount" aria-live="polite"></span>
  </div>

  <div class="keynote">A day countdown is shown <b>only</b> for a confirmed exact date. A guided window
    shows its period, because "Q4 2026" does not mean the first of October.</div>

  <div id="catTimeline"></div>
  <div id="liveCatalystList"></div>
</div>`;
}

/* ================= /research/ ================= */

export function researchBody(buildStamp) {
  const k = [
    aggregate('securedPowerMw', { basis: 'gross-utility' }),
    aggregate('customerContractedMw', { basis: 'critical-it' }),
    aggregate('energisedCriticalItMw', { basis: 'critical-it' }),
    aggregate('customerAcceptedMw', { basis: 'critical-it' })
  ];
  const dr = deliveryRecord();

  const summaryRow = (label, value, note) =>
    `<div class="rsrow"><div class="rslabel">${esc(label)}</div>
      <div class="rsvalue">${value}</div><div class="rsnote">${esc(note)}</div></div>`;

  return `<div class="shell">
  ${pageHeadHtml({
    title: 'Research',
    lede: 'The full evidence base: every figure, every source, every correction. Start with the summary ' +
      'and open only what you need.',
    meta: `<a class="pill-lite" href="/methodology/">Methodology</a>
           <a class="pill-lite" href="/methodology/#corrections">Corrections</a>`
  })}

  ${section('summary', 'Research summary', 'Where the data stands today',
    `<div class="rsgrid">
      ${summaryRow('Secured power', `${k[0].isMinimum ? '≥' : ''}${esc(mw(k[0].total))}`,
        `${k[0].contributorCount} of ${k[0].companyCount} companies, gross-utility basis`)}
      ${summaryRow('Customers have signed for', `${k[1].isMinimum ? '≥' : ''}${esc(mw(k[1].total))}`,
        `${k[1].contributorCount} disclose on a critical-IT basis; ${k[1].missingCount} do not`)}
      ${summaryRow('Switched on', `${k[2].isMinimum ? '≥' : ''}${esc(mw(k[2].total))}`,
        `${k[2].contributorCount} disclose energised critical IT`)}
      ${summaryRow('Delivered and accepted', `${esc(mw(k[3].total))}`,
        `${k[3].contributorCount} company discloses formal acceptance`)}
      ${summaryRow('Guided milestones', String(dr.scheduledCount),
        `${dr.completedCount} reached and scoreable, ${dr.pendingCount} outstanding`)}
    </div>
    <p class="blocknote">Contributor sets differ between rows. These are not stages of one funnel.</p>`)}

  <details class="explore" id="explore" open>
    <summary><span class="explorehead">Explore the data</span>
      <span class="exploresub">Capacity records, ledger, contracts and sources</span></summary>
    <div class="explorebody">
      ${section('capacity', 'Capacity explorer', 'Every value with its evidence',
        `<div class="tabletools">
          <div class="fld"><label for="capSearch">Search</label>
            <input type="search" id="capSearch" placeholder="Company or measure" /></div>
          <div class="fld"><label for="capConfidence">Confidence</label>
            <select id="capConfidence"><option value="">All</option>
              <option value="confirmed">Confirmed</option><option value="unknown">Not disclosed</option></select></div>
        </div>
        <div class="scrollnote">Scroll sideways for all columns →</div>
        ${capacityTable()}`)}

      ${section('ledger', 'Delivery ledger', '', ledgerPanel(null, { heading: 'Delivery ledger', filters: true }))}

      ${section('guidance', 'Guidance scorecard', 'Promised against delivered', deliveryRecordPanel())}

      ${section('contracts', 'Contract economics', 'Compiled from filings',
        `<div class="scrollnote">Scroll sideways for all columns →</div>
        ${contractsTable()}
        <p class="blocknote">Per-megawatt figures are <b>not comparable across business models</b>, so
          this table does not rank them.</p>`)}

      ${section('geography', 'Delivery by country', 'Each basis in its own column', countryPanel())}

      ${section('reconciliation', 'Why these differ from company headlines', '', reconciliationPanel())}

      ${section('intelligence', 'Intelligence', '',
        `<div class="filters" id="newsFilters"></div><div id="newsHero"></div><div id="newsList"></div>`)}

      ${section('filings', 'SEC filings', '', `<div id="filingList"></div>`)}

      ${section('data-health', 'Data health', '', dataHealthPanel(buildStamp))}
    </div>
  </details>

  ${section('glossary', 'What the terms mean', 'Reference',
    `<details class="gloss"><summary>Evidence levels</summary>${evidenceKey()}</details>
     <details class="gloss"><summary>Value types</summary>${valueTypeKey()}</details>`)}
</div>`;
}

/* ================= /lab/ — Edge Lab ================= */

export function labBody() {
  const ready = COMPANIES.filter(c => LAB_COVERAGE[c.id]?.ready);
  const notReady = COMPANIES.filter(c => !LAB_COVERAGE[c.id]?.ready);

  return `<div class="shell">
  ${pageHeadHtml({
    title: 'Edge Lab',
    lede: 'See the capacity, timing, contracts and financing that a valuation appears to require — ' +
      'and how much of it the evidence already supports.',
    meta: `<span class="pill-lite">${ready.length} companies modelled</span>
           <span class="pill-lite">Seeded and reproducible</span>`
  })}

  <div class="modebar" role="tablist" aria-label="Edge Lab mode">
    <button class="mode is-active" role="tab" type="button" data-lab="requires" aria-selected="true">What does today's price require?</button>
    <button class="mode" role="tab" type="button" data-lab="target" aria-selected="false">What would justify my target?</button>
    <button class="mode" role="tab" type="button" data-lab="scenario" aria-selected="false">Build a scenario</button>
    <button class="mode" role="tab" type="button" data-lab="odds" aria-selected="false">Market odds</button>
  </div>

  <div class="labtop">
    <div class="fld">
      <label for="labCompany">Company</label>
      <select id="labCompany">
        ${ready.map(c => `<option value="${esc(c.id)}">${esc(c.name)} (${esc(c.ticker)})</option>`).join('')}
      </select>
    </div>
    <div class="fld">
      <label for="labPrice">Price per share <span class="fldunit">USD</span></label>
      <input type="number" id="labPrice" step="0.01" inputmode="decimal" placeholder="Last close" />
    </div>
    <div class="fld">
      <label for="labHorizon">Horizon</label>
      <select id="labHorizon">
        <option value="8">2 years</option>
        <option value="12" selected>3 years</option>
        <option value="16">4 years</option>
        <option value="20">5 years</option>
      </select>
    </div>
    <div class="fld">
      <label for="labPreset">Starting assumptions</label>
      <select id="labPreset">
        <option value="verified">Verified baseline</option>
        <option value="conservative">Conservative</option>
        <option value="base" selected>Base</option>
        <option value="optimistic">Optimistic</option>
      </select>
    </div>
    <div class="fld">
      <label for="labShift">Delivery timing <span class="fldunit" id="labShiftOut">on schedule</span></label>
      <input type="range" id="labShift" min="-2" max="8" step="1" value="0"
             aria-describedby="labShiftHelp" />
      <span class="fldhelp" id="labShiftHelp">Moves every undelivered tranche earlier or later, in quarters.</span>
    </div>
  </div>

  <div id="labWhat"></div>

  <div id="labAnswer" class="labanswer"></div>

  <details class="advanced" id="labAdvanced">
    <summary><span>Advanced assumptions</span>
      <span class="advsub">Every input, with where it comes from</span></summary>
    <div class="advbody" id="labAssumptions"></div>
  </details>

  <div id="labResults"></div>

  ${section('lab-coverage', 'Which companies can be modelled', 'And why the others cannot',
    `<div class="covgrid">
      ${ready.map(c => `<div class="covcard cov-ok">
        <div class="covhead">${pill('ok', '●', 'Modelled')} <b>${esc(c.ticker)}</b></div>
        <div class="covname">${esc(c.name)}</div>
        <p>${esc(LAB_COVERAGE[c.id].note)}</p>
      </div>`).join('')}
      ${notReady.map(c => `<div class="covcard cov-off">
        <div class="covhead">${pill('unknown', '○', 'Not modelled')} <b>${esc(c.ticker)}</b></div>
        <div class="covname">${esc(c.name)}</div>
        <p>${esc(LAB_COVERAGE[c.id].note)}</p>
      </div>`).join('')}
    </div>
    <p class="blocknote">A company is modelled only where a contract discloses <b>value, megawatts and
      term</b> together, so the revenue rate is arithmetic rather than assumption. No peer average is
      ever substituted.</p>`)}

  <section class="block" id="odds">
    <div class="blockhead"><h2>Market odds</h2><span class="blockmeta">Price probability, not valuation</span></div>
    <div class="blockbody">
      <p class="blocklede" id="oddsQuestion">What is the modelled chance of reaching a target by a date?</p>
      <div class="oddsrow">
        <div class="fld"><label for="inTicker">Company</label><select id="inTicker"></select></div>
        <div class="fld"><label for="inTarget">Target price <span class="fldunit">USD</span></label>
          <input id="inTarget" type="number" step="0.5" inputmode="decimal" /></div>
        <div class="fld"><label for="inDate">By date</label><input id="inDate" type="date" /></div>
      </div>
      <div id="oddsHeadline" class="oddshead"></div>
      <details class="advanced">
        <summary><span>Advanced assumptions</span><span class="advsub">Volatility, drift and price source</span></summary>
        <div class="advbody">
          <div class="oddsrow">
            <div class="fld"><label for="inSpot">Price now <span class="fldunit" id="spotTag"></span></label>
              <input id="inSpot" type="number" step="0.01" inputmode="decimal" /></div>
            <div class="fld"><label for="inVol">Volatility <span class="fldunit" id="volTag">%/yr</span></label>
              <input id="inVol" type="number" step="5" inputmode="decimal" /></div>
            <div class="fld"><label for="inDrift">Drift <span class="fldunit">%/yr</span></label>
              <input id="inDrift" type="number" step="5" value="0" inputmode="decimal" /></div>
            <button class="resync" id="resyncBtn" type="button">Reset to live</button>
          </div>
          <p class="blocknote"><b>Method.</b> ${esc(VOL_METHODOLOGY.estimator)} on
            ${esc(VOL_METHODOLOGY.priceBasis)}, annualised by ${esc(VOL_METHODOLOGY.annualisation)}.
            ${esc(VOL_METHODOLOGY.note)} Lognormal random walk, no jumps. Not options-implied and not advice.</p>
        </div>
      </details>
      <div class="grid2">
        <div><svg id="distChart" viewBox="0 0 720 260" role="img" aria-labelledby="distSummary"></svg>
          <div class="chartlegend" id="distLegend"></div>
          <p id="distSummary" class="chartsummary"></p></div>
        <div><table id="oddsTable"></table></div>
      </div>
      <div class="pb steps" id="stepsBox"></div>
    </div>
  </section>
</div>`;
}

/* ================= /sites/ ================= */

export function sitesBody() {
  const sites = allSites();
  const countries = [...new Set(sites.map(s => s.country))]
    .map(c => ({ id: c, label: COUNTRY_NAMES[c] || c }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const disclosed = sites.filter(s => s.capacityMw !== null).length;

  return `<div class="shell">
  ${pageHeadHtml({
    title: 'Sites',
    lede: 'Every project tracked at the level its milestones are actually evidenced — one record per ' +
      'site, with the gates it has passed and the documents that prove each one.',
    meta: `<span class="pill-lite">${sites.length} sites</span>
           <span class="pill-lite">${disclosed} disclose capacity</span>
           <span class="pill-lite">${countries.length} countries</span>`
  })}

  <div class="filterbar" role="group" aria-label="Filter sites">
    <div class="fld">
      <label for="siteSearch">Search</label>
      <input type="search" id="siteSearch" placeholder="Site, operator or country" autocomplete="off" />
    </div>
    <div class="fld">
      <label for="siteCompany">Operator</label>
      <select id="siteCompany">
        <option value="">All operators</option>
        ${COMPANIES.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
      </select>
    </div>
    <div class="fld">
      <label for="siteCountry">Country</label>
      <select id="siteCountry">
        <option value="">All countries</option>
        ${countries.map(c => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('')}
      </select>
    </div>
    <div class="fld">
      <label for="siteStage">Furthest stage reached</label>
      <select id="siteStage">
        <option value="">Any stage</option>
        ${stageFilterOptions().map(o => `<option value="${esc(o.id)}">${esc(o.label)}</option>`).join('')}
      </select>
    </div>
    <span class="filtercount" id="siteCount" aria-live="polite">${sites.length} shown</span>
  </div>

  <section class="mpanel flush mapcard" id="infrastructure" aria-labelledby="imh">
    <div class="mhead mappad">
      <span class="mkicker" id="imh">Infrastructure map</span>
      <span class="mnote secondary">Schematic � positions are not geographic</span>
    </div>
    ${infrastructureMap([...sites].sort((a, b) =>
      b.gateSummary.completeCount - a.gateSummary.completeCount ||
      (b.capacityMw ?? -1) - (a.capacityMw ?? -1)))}
  </section>

  <div class="sitegrid" id="siteGrid">${sites.map(siteCard).join('')}</div>

  <p class="blocknote">Capacity figures state what they measure, and half this estate quotes gross
    power at the fence while the other half quotes critical IT in the hall. Where a site publishes only
    a gross figure, the comparable critical IT load is shown beneath it in amber as a
    <b>T2C estimate</b> — gross ÷ ${GROSS_TO_CRITICAL_IT} — so the list can be read down one column.
    A site showing <b>${NOT_DISCLOSED}</b> has published nothing to derive from: it is never shown as
    zero and never filled with a peer average.
    <a class="press" href="/methodology/#estimates">How estimates work</a>.</p>
</div>`;
}

/* ================= /sites/<slug>/ ================= */

export function siteBody(site) {
  const stage = furthestStage(site);
  const customer = site.contracts.length
    ? site.contracts.map(c => c.customer).join(', ')
    : null;

  return `<div class="shell">
  <nav class="crumb" aria-label="Breadcrumb">
    <a href="/sites/">Sites</a>
    ${site.companySlug ? `<span aria-hidden="true">/</span><a href="/companies/${esc(site.companySlug)}/">${esc(site.ticker || site.companyName)}</a>` : ''}
    <span aria-hidden="true">/</span><span aria-current="page">${esc(site.name)}</span>
  </nav>

  <section class="siteid">
    <span class="siteticker" aria-hidden="true">${esc(site.ticker || '—')}</span>
    <div class="siteidmain">
      <h1>${esc(site.name)}</h1>
      <p class="siteidsub">${esc(site.flag)} ${esc(site.countryName)} ·
        ${site.companySlug
          ? `<a class="press" href="/companies/${esc(site.companySlug)}/">${esc(site.companyName)}</a>`
          : esc(site.companyName)}</p>
    </div>
    <div class="sitefacts">
      <div class="sitefact">
        <span class="sitefactv">${site.capacityMw === null
          ? `<span class="nd">${NOT_DISCLOSED}</span>`
          : esc(mw(site.capacityMw))}</span>
        <span class="sitefactl">${esc(POWER_BASIS[site.powerBasis]?.short || 'Capacity')}</span>
      </div>
      <div class="sitefact">
        <span class="sitefactv">${customer
          ? esc(customer.length > 26 ? customer.slice(0, 24) + '…' : customer)
          : `<span class="nd">${NOT_DISCLOSED}</span>`}</span>
        <span class="sitefactl">Customer</span>
      </div>
      <div class="sitefact wide">
        <span class="sitefactv">${confidenceFact(site.evidence).value}</span>
        <span class="sitefactl">${esc(confidenceFact(site.evidence).label)}</span>
      </div>
    </div>
  </section>

  ${site.note ? `<p class="blocknote">${esc(site.note)}</p>` : ''}

  ${section('path', 'Path to billing',
    stage ? `Furthest evidenced: ${esc(stage.label)}` : 'No stage evidenced',
    `${pathTrack(site.path, { idPrefix: `site-${site.slug}` })}
     <p class="blocknote">Each stage rolls up the project gates that evidence it. A stage marked
       <b>Not disclosed</b> has no gate on record — which is not the same as a stage the site has
       yet to reach.</p>`)}

  <div class="sitecols">
    <div>
      ${section('view', 'Site view', 'Illustrative — not a photograph of this site',
        `<div class="campus secondary">
          <picture>
            <source srcset="/assets/campus.webp" type="image/webp" />
            <img class="campusimg" src="/assets/campus.png" alt="" loading="lazy"
              decoding="async" width="1200" height="800" />
          </picture>
          <p class="campusnote">A generic campus illustration, shown to orient the layout of a site of this
            kind. It is not imagery of ${esc(site.name)}, carries no live telemetry, and no element of it is
            positioned from data. Every factual claim on this page is in the panels around it.</p>
        </div>`, { plain: false })}

      ${section('evidence', 'Latest evidence', '',
        site.latestEvidence
          ? `<div class="sig ${site.latestEvidence.kind === 'event' ? 'ok' : ''}">
              <span class="sigglyph" aria-hidden="true">✓</span>
              <div class="sigmain">
                <p class="sigsum">${esc(site.latestEvidence.summary)}</p>
                <div class="sigtop">${evidenceChip(site.latestEvidence.confidence)}
                  ${sourceChips(site.latestEvidence.sourceIds)}</div>
              </div>
              <div class="sigside"><span class="sigdate">${esc(date(site.latestEvidence.at))}</span></div>
            </div>`
          : `<p class="mnote">Nothing on this site carries a dated, sourced record yet.</p>`)}

      ${section('deps', 'Dependencies', 'From tracked gates only', dependencyGrid(site.dependencies))}

      ${section('replay', 'Site replay', 'Documented progression', replayTrack(site.replay))}
    </div>

    <div>
      ${section('status', 'Site status', '',
        `${statusLadder(site.path)}
         ${nextMilestonePanel(site.next)}`)}

      ${section('contracts', 'Customer contracts', '', siteContracts(site.contracts))}

      ${site.events.length ? section('changes', 'What changed here', `${site.events.length} record${site.events.length === 1 ? '' : 's'}`,
        signalList(site.events.map(toSignal), { reviewable: false })) : ''}
    </div>
  </div>
</div>`;
}

/* ================= /explainers/ ================= */

/**
 * Explainers.
 *
 * For the reader who arrived without the vocabulary. Everything here already
 * existed as definitions attached to the data model — this route gathers it into
 * one place and leads with the question a newcomer actually has.
 */
export function explainersBody() {
  return `<div class="t2c-shell ed-main">
  ${pageHeadHtml({
    title: 'Explainers',
    lede: 'What the words mean, why the distinctions matter, and how a promise becomes revenue. ' +
      'No prior knowledge assumed.',
    meta: `<span class="pill-lite">For newcomers</span>
           <span class="pill-lite">Definitions from the data model</span>`
  })}

  <section class="ed-section" id="lifecycle" aria-labelledby="expl-h">
    <h2 class="vh" id="expl-h">How an AI data centre makes money</h2>
    ${explainer(EXPLAINER_STEPS, ASSET['explainer-ai-datacentre-cutaway'])}
  </section>

  ${section('bases', 'A megawatt is not a megawatt', 'Three different quantities',
    `<p class="blocklede">The most common error in AI infrastructure coverage is treating these as
      interchangeable. They are separate fields in the data, they are never added together, and the
      build fails if an aggregate mixes them.</p>
     ${basisKey()}`)}

  ${section('types', 'Actual, minimum, target, pipeline, potential', 'What kind of number it is',
    `<p class="blocklede">A 5 GW ambition and a 1.5 GW operating figure are not the same kind of
      claim. Only the first two below ever enter a current-capacity total.</p>
     ${valueTypeKey()}`)}

  ${section('evidence', 'How well evidenced is it?', 'Four confidence levels',
    `<p class="blocklede">Every figure on this site carries one of these, and the level decides
      whether it can enter a total at all.</p>
     ${evidenceKey()}`)}

  ${section('more', 'Where to go next', '',
    `<div class="ed-grid3">
      <a class="ed-card press" href="/methodology/">
        <h3 class="ed-cardh">Methodology</h3>
        <p class="ed-note">Every definition, the Reality Score formula, how estimates are derived and
          the full corrections log.</p>
      </a>
      <a class="ed-card press" href="/sites/">
        <h3 class="ed-cardh">Megaprojects</h3>
        <p class="ed-note">Every tracked project at the level its milestones are actually evidenced.</p>
      </a>
      <a class="ed-card press" href="/intelligence/">
        <h3 class="ed-cardh">Intelligence ledger</h3>
        <p class="ed-note">Every sourced change to the delivery record, classified so you can read
          only the kind you came for.</p>
      </a>
    </div>`)}
</div>`;
}

/* ================= 404 ================= */

export function notFoundBody() {
  return `<div class="t2c-shell ed-main ed-404">
  <p class="ed-eyebrow">Error 404</p>
  <h1 class="ed-headline">This page isn't here</h1>
  <p class="ed-consequence">The address may have changed, or the record may never have existed.
    Nothing has gone wrong with the data.</p>

  <div class="ed-heroacts">
    <a class="ed-cta primary press" href="/">Back to today</a>
    <button type="button" class="ed-cta secondary press" id="palOpen404"
      aria-haspopup="dialog">Search the site</button>
  </div>

  <section class="ed-section" aria-labelledby="nf-h">
    <h2 class="ed-sectionh" id="nf-h">Where you might be going</h2>
    <div class="ed-grid3">
      <a class="ed-card press" href="/companies/">
        <h3 class="ed-cardh">Companies</h3>
        <p class="ed-note">Every tracked operator, what is switched on and what customers signed for.</p>
      </a>
      <a class="ed-card press" href="/sites/">
        <h3 class="ed-cardh">Megaprojects</h3>
        <p class="ed-note">Every project, the gates it has passed and the documents behind each one.</p>
      </a>
      <a class="ed-card press" href="/intelligence/">
        <h3 class="ed-cardh">Intelligence</h3>
        <p class="ed-note">The full delivery ledger, newest first.</p>
      </a>
      <a class="ed-card press" href="/catalysts/">
        <h3 class="ed-cardh">Catalysts</h3>
        <p class="ed-note">Dated events that could move an operational metric.</p>
      </a>
      <a class="ed-card press" href="/explainers/">
        <h3 class="ed-cardh">Explainers</h3>
        <p class="ed-note">What the words mean, for a reader arriving without the vocabulary.</p>
      </a>
      <a class="ed-card press" href="/methodology/">
        <h3 class="ed-cardh">Methodology</h3>
        <p class="ed-note">How every figure is defined, measured, sourced and corrected.</p>
      </a>
    </div>
  </section>
</div>`;
}

/* ================= /news/ ================= */

/**
 * Live third-party headlines.
 *
 * This is the one page on T2C whose content is NOT sourced, verified or
 * evidenced. It is a wire feed. Keeping it on its own route rather than inside
 * Intelligence is deliberate: the delivery ledger's value is that every line has
 * a document behind it, and mixing unverified headlines into that view would
 * quietly spend the credibility the ledger earns.
 *
 * The page therefore says what it is, at the top, before anything else.
 */
export function newsBody() {
  const tickers = tickerOptions();

  return `<div class="shell">
  ${pageHeadHtml({
    title: 'AI infrastructure news',
    lede: 'Live headlines for the companies T2C tracks, plus sector coverage matching AI infrastructure ' +
      'keywords. Updated continuously from the market data provider.',
    meta: `<span class="pill-lite">Third-party wire</span>
           <span class="pill-lite">Not verified by T2C</span>`
  })}

  <p class="newsdisclaimer">
    <b>These headlines are not T2C records.</b> Nothing here has been checked against a filing, given a
    confidence level or entered into the delivery ledger. A headline is a claim by its publisher.
    Where a story turns out to matter, it appears — sourced, dated and evidenced — in
    <a class="press" href="/intelligence/">Intelligence</a>.
  </p>

  <div class="filterbar" role="group" aria-label="Filter news">
    <div class="fld">
      <label for="newsCompany">Company</label>
      <select id="newsCompany">
        <option value="">All tracked companies</option>
        ${tickers.map(o => `<option value="${esc(o.ticker)}">${esc(o.ticker)} — ${esc(o.name)}</option>`).join('')}
      </select>
    </div>
    <div class="fld">
      <label for="newsSearch">Search headlines</label>
      <input type="search" id="newsSearch" placeholder="Keyword" autocomplete="off" />
    </div>
    <span class="filtercount" id="newsCount" aria-live="polite">Loading…</span>
  </div>

  <div id="newsFeed" class="newsgrid" aria-busy="true">
    <p class="mnote" id="newsLoading">Fetching the latest headlines…</p>
  </div>

  <p class="mnote" id="newsError" hidden></p>

  <div class="secondary">
    ${section('why', 'Why news sits apart from the ledger', 'How T2C treats a headline',
      `<p class="blocklede">A wire story can report a number the company never published, repeat an old
        figure as if it were new, or describe a target as an achievement. T2C's delivery records only
        move when a primary document says so.</p>
       ${evidenceKey()}`)}
  </div>
</div>`;
}

/* ================= /intelligence/ ================= */

export function intelligenceBody() {
  const counts = availableCategories();
  const today = todaySet();
  const all = signals({});

  return `<div class="shell">
  ${pageHeadHtml({
    title: 'Intelligence',
    lede: 'Every sourced change to the delivery record, classified so you can read only the kind you ' +
      'came for. A finite set — this is the whole ledger, not the first page of one.',
    meta: `<span class="pill-lite">${all.length} signals</span>
           ${today.at ? `<span class="pill-lite">${today.signals.length} on ${esc(date(today.at))}</span>` : ''}`
  })}

  <div class="mpanel" id="todayset">
    <div class="mhead">
      <span class="mkicker">Latest set${today.at ? ` · ${esc(date(today.at))}` : ''}</span>
      <span class="mnote" id="reviewCount" aria-live="polite">${today.signals.length} to review</span>
    </div>
    ${signalList(today.signals, { emptyNote: 'The ledger carries no entries yet.' })}
    <div class="caughtup" id="caughtUp" hidden>
      <span class="cuglyph" aria-hidden="true">✓</span>
      <h3>You're caught up</h3>
      <p>Every signal in the latest set has been reviewed. Nothing further has been published.</p>
    </div>
  </div>

  ${section('all', 'The whole ledger', `${all.length} sourced changes`,
    `${signalFilters(counts)}
     <div id="signalAll">${signalList(all, { anchor: true })}</div>
     <p class="blocknote"><b>Advanced</b> means evidenced delivery moved forward. A raised target is
       <b>outlook</b>, not progress — no megawatt moves because a company lifted an ambition.
       ${CATEGORIES.filter(c => !counts.some(k => k.id === c.id)).length
         ? `Categories with no entry on record (${esc(CATEGORIES.filter(c => !counts.some(k => k.id === c.id)).map(c => c.label.toLowerCase()).join(', '))}) are not offered as filters.`
         : ''}</p>`)}

  ${section('upcoming', 'What is scheduled next', 'Dated catalysts',
    `<p class="blocklede">Signals record what has happened. These are the dates on which the next
      evidence is expected.</p>
     ${catalystPanel()}
     <div class="blockacts"><a class="cta ghost press" href="/catalysts/">Full catalyst calendar →</a></div>`)}
</div>`;
}

/** Small local copy so pages can render their own header without importing build.js. */
function pageHeadHtml({ title, lede, meta = '' }) {
  return `<div class="pagehead">
    <div class="pageheadin">
      <h1>${esc(title)}</h1>
      ${lede ? `<p class="pagelede">${esc(lede)}</p>` : ''}
      ${meta ? `<div class="pagemeta">${meta}</div>` : ''}
    </div>
  </div>`;
}
