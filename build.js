/**
 * Static site build. Generates every page from the records in /data, so a figure
 * exists in exactly one place. Output to dist/; /api stays at the repo root as
 * Vercel serverless functions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { METRICS, MODELS, GATES, CONFIDENCE, VALUE_STATUS, POWER_BASIS } from './data/schema.js';
import { SOURCES, SOURCE_BY_ID, AUDIT_CUTOFF } from './data/sources.js';
import { COMPANIES, WATCH_TICKERS, TICKER_NAMES } from './data/companies.js';
import { CONTRACTS_BY_COMPANY, COUNTRY_NAMES } from './data/projects.js';
import { CORRECTIONS } from './data/events.js';
import { CATALYSTS_BY_COMPANY } from './data/catalysts.js';
import { PROFILE_BY_ID, PROFILES, chiefExecutives } from './data/profiles.js';
import { companyView, ledger, aggregate, isKnown, gateSummary } from './src/lib/compute.js';
import { runChecks } from './src/lib/validate.js';
import { esc, mw, pct, date, hostOf, NOT_DISCLOSED, statusLabel } from './src/lib/format.js';
import { VOL_METHODOLOGY } from './src/lib/odds.js';
import { METHODOLOGY as EVENT_METHODOLOGY } from './src/lib/eventstudy.js';
import { tickerOptions, MAX_TICKERS, PERIODS, DISPLAY_MODES } from './src/lib/compare.js';
import {
  kpiStrip, kpiCards, ledgerPanel, capacityTable, contractsTable, countryPanel,
  evidenceKey, valueTypeKey, basisKey, gateTrack, evidenceChip, statusChip, basisChip,
  sourceChips, evidencedValue, evidenceDrawer, reconciliationPanel, catalystPanel,
  dataHealthPanel, pill, timelinePanel, deliveryRecordPanel,
  briefingCards, snapshotCards, aboutPanel, officialLinks, leadershipCards, storybook
} from './src/ui.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://timetocompute.com';
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const BUILD_STAMP = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

/* ---------- gate the build on data integrity ---------- */
const checks = runChecks();
for (const w of checks.warnings) console.warn('  warn: ' + w);
if (!checks.ok) {
  console.error('\nData validation FAILED — build aborted:\n' + checks.errors.map(e => '  ✗ ' + e).join('\n'));
  process.exit(1);
}
console.log(`✓ data validation passed (${checks.warnings.length} warnings)`);

/**
 * Six top-level views, ordered by what an ordinary visitor wants first.
 * Specialist material lives under Research rather than competing for the top bar.
 */
const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'companies', label: 'Companies' },
  { id: 'compare', label: 'Compare' },
  { id: 'catalysts', label: 'Catalysts' },
  { id: 'forecasts', label: 'Forecasts' },
  { id: 'research', label: 'Research' }
];

/** Old hash routes keep working. Shared links must not rot. */
const HASH_ALIASES = {
  odds: 'forecasts', scenarios: 'forecasts',
  ledger: 'research', capacity: 'research', intelligence: 'research',
  filings: 'research', geography: 'research', 'data-health': 'research'
};

function head({ title, description, canonical, structured = null }) {
  return `<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(canonical)}" />
<meta name="robots" content="index,follow" />
<meta name="t2c-build" content="${BUILD_STAMP}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="T2C — Time to Compute" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:image" content="${esc(SITE)}/Logo/logo-header.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(SITE)}/Logo/logo-header.png" />
<meta name="theme-color" content="#0B0B0C" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/Logo/logo-header.png" />
<link rel="stylesheet" href="/styles.css" />
${(Array.isArray(structured) ? structured : [structured]).filter(Boolean)
  .map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}`;
}

/** Feed status is filled in by the client once it knows the market session. */
function header() {
  return `<header class="top">
  <div class="wrap topin">
    <a class="logo" href="/"><img src="/Logo/logo-header.png" width="514" height="120" alt="T2C — Time to Compute" /></a>
    <div class="right">
      <span class="feed" id="feedStatus" aria-live="polite"><i aria-hidden="true"></i><span>Connecting…</span></span>
      <button class="hbtn" id="refreshBtn" type="button">Refresh</button>
      <button class="hbtn" id="themeBtn" type="button" aria-label="Switch to light theme">Light</button>
    </div>
  </div>
</header>`;
}

function nav(mode, active = 'overview') {
  const items = NAV.map(n => mode === 'tabs'
    ? `<button class="tab" role="tab" type="button" id="tab-${n.id}" data-tab="${n.id}" aria-controls="view-${n.id}" aria-selected="${n.id === active}">${esc(n.label)}</button>`
    : `<a class="tab" href="/#${n.id}">${esc(n.label)}</a>`).join('');
  return `<nav class="nav" aria-label="Primary"><div class="wrap navin"${mode === 'tabs' ? ' role="tablist"' : ''}>` +
    items +
    `<a class="tab${active === 'methodology' ? ' active' : ''}" href="/methodology/">Methodology</a>` +
    `</div></nav>`;
}

function footer() {
  return `<footer class="foot">
  <div class="wrap footin">
    <div class="footmark">
      <img src="/Logo/logo-header.png" alt="" />
      <p>What management promised, what the evidence supports, what was physically delivered, what the
         customer accepted, and when revenue began.</p>
    </div>
    <div class="footgrid">
      <div class="footcol"><h4>Understand the data</h4><ul>
        <li><a href="/methodology/">Methodology</a></li>
        <li><a href="/methodology/#sources">Sources</a></li>
        <li><a href="/methodology/#corrections">Corrections</a></li>
        <li><a href="/#data-health">Data health</a></li>
      </ul></div>
      <div class="footcol"><h4>Companies</h4><ul>
        ${COMPANIES.map(c => `<li><a href="/companies/${esc(c.slug)}/">${esc(c.name)}</a></li>`).join('')}
      </ul></div>
      <div class="footcol"><h4>Site</h4><ul>
        <li><a href="/privacy/">Privacy</a></li>
        <li><a href="/terms/">Terms</a></li>
        <li><a href="/contact/">Contact</a></li>
      </ul></div>
    </div>
    <div class="footbase">
      <span>For information only — not investment advice. Figures are compiled from public filings and
        may lag or contain errors. Prices and news supplied by Finnhub; filings from SEC EDGAR.</span>
      <span class="sep">© 2026 T2C — Time to Compute</span>
    </div>
  </div>
</footer>`;
}

function page({ title, description, canonical, body, active = 'overview', structured = null }) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
${head({ title, description, canonical, structured })}
</head>
<body>
${header()}
${body}
${footer()}
<script type="application/json" id="t2c-config">${JSON.stringify({
    tickers: WATCH_TICKERS, names: TICKER_NAMES, maxCompare: MAX_TICKERS, buildStamp: BUILD_STAMP,
    tabs: NAV.map(n => n.id), hashAliases: HASH_ALIASES
  })}</script>
<script src="/app.js" defer></script>
</body>
</html>`;
}

/* ================= homepage ================= */

function hero() {
  return `<section class="hero">
  <canvas id="flow" aria-hidden="true"></canvas>
  <div class="wrap heroin">
    <h1 class="tagline">See which AI infrastructure companies are <u>actually delivering</u>.</h1>
    <p class="taglinesub">Track power, customer contracts, construction, customer acceptance, analyst
      expectations and upcoming catalysts — all linked to the underlying evidence.</p>
    <div class="heroacts">
      <a class="cta primary" href="#compare">Compare companies</a>
      <a class="cta ghost" href="#catalysts">See upcoming catalysts</a>
    </div>
  </div>
  <div class="wrap"><div class="kstrip">${kpiStrip()}</div></div>
  <div class="tape"><div class="tapein" id="tape"></div></div>
</section>`;
}

function scenariosView() {
  const opts = tickerOptions();
  return `
  <div class="segbar" role="tablist" aria-label="Scenario views">
    ${[['probability', 'Probability'], ['paths', 'Price paths'], ['targets', 'Analyst targets'], ['cats', 'Catalysts']]
      .map(([id, label], i) => `<button class="seg-btn" role="tab" type="button" id="segtab-${id}" data-seg="${id}" aria-controls="seg-${id}" aria-selected="${i === 0}">${esc(label)}</button>`).join('')}
  </div>

  <section class="panel">
    <div class="ph"><h2>Inputs</h2><span class="meta"><button class="resync" id="resyncBtn" type="button">Reset to live</button></span></div>
    <div class="pb">
      <div class="frow">
        <div class="field field-wide"><label for="inTicker">Company<span class="hint">Switching resets every box</span></label>
          <select id="inTicker" name="inTicker" title="Select a company — full names are shown in the list">${opts.map(o => `<option value="${esc(o.ticker)}">${esc(o.ticker)} — ${esc(o.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="inSpot">Price now <span class="hint" id="spotTag"></span></label><input id="inSpot" name="inSpot" type="number" step="0.01" inputmode="decimal" /></div>
        <div class="field"><label for="inTarget">Your target<span class="hint">Price you want</span></label><input id="inTarget" name="inTarget" type="number" step="0.5" inputmode="decimal" /></div>
        <div class="field"><label for="inDate">Deadline<span class="hint">Date-only, UTC</span></label><input id="inDate" name="inDate" type="date" /></div>
        <div class="field"><label for="inVol">Volatility<span class="hint" id="volTag">Annualised %</span></label><input id="inVol" name="inVol" type="number" step="5" inputmode="decimal" /></div>
        <div class="field"><label for="inDrift">Drift<span class="hint">Your view, %/yr</span></label><input id="inDrift" name="inDrift" type="number" step="5" value="0" inputmode="decimal" /></div>
      </div>
    </div>
  </section>

  <div id="seg-probability" role="tabpanel" aria-labelledby="segtab-probability">
    <div class="grid g32">
      <section class="panel">
        <div class="ph"><h2 id="qLine">Probability</h2><span class="meta" id="oddsTicker"></span></div>
        <div class="pb">
          <div class="big" id="bigOdds">—</div>
          <div class="pbar"><i id="oddsBar"></i></div>
          <p class="note" style="margin-top:13px" id="oddsPlain"></p>
        </div>
        <div class="tw"><table id="oddsTable"></table></div>
      </section>
      <section class="panel">
        <div class="ph"><h2>Distribution at the deadline</h2><span class="meta">Modelled, not predicted</span></div>
        <div class="pb">
          <svg id="distChart" viewBox="0 0 720 260" role="img" aria-labelledby="distSummary"></svg>
          <div class="chartlegend" id="distLegend"></div>
          <p id="distSummary" class="chartsummary"></p>
        </div>
      </section>
    </div>
    <section class="panel">
      <div class="ph"><h2>How it reached that number</h2><span class="meta">Every step shown</span></div>
      <div class="pb steps" id="stepsBox"></div>
      <div class="stamp"><b>Model assumptions.</b> Prices follow a lognormal random walk with constant
        volatility and no jumps. Real shares gap on news, which this cannot represent. Volatility default:
        ${esc(VOL_METHODOLOGY.estimator)}, ${esc(VOL_METHODOLOGY.priceBasis)}, annualised by
        ${esc(VOL_METHODOLOGY.annualisation)}. These are not options-implied probabilities and are not advice.</div>
    </section>
  </div>

  <div id="seg-paths" role="tabpanel" aria-labelledby="segtab-paths" hidden>
    <section class="panel">
      <div class="ph"><h2>Price paths</h2><span class="meta">Percentile bands over time</span></div>
      <div class="pb">
        <svg id="fanChart" viewBox="0 0 760 320" role="img" aria-labelledby="fanSummary"></svg>
        <div class="chartlegend" id="fanLegend"></div>
        <p id="fanSummary" class="chartsummary"></p>
      </div>
      <div class="stamp">These bands are a <b>modelled distribution of outcomes, not predicted trajectories</b>.
        The median line is not a forecast: half of modelled outcomes finish above it and half below.</div>
    </section>
  </div>

  <div id="seg-targets" role="tabpanel" aria-labelledby="segtab-targets" hidden>
    <section class="panel">
      <div class="ph"><h2>Analyst targets</h2><span class="meta" id="analystMeta">Checking provider…</span></div>
      <div id="analystBody"></div>
      <div class="stamp">Analyst price targets are attributable opinions published by third-party research
        firms. They are not T2C forecasts, may use different horizons and assumptions, and can change
        without warning. T2C never displays an unattributed target.</div>
    </section>
  </div>

  <div id="seg-cats" role="tabpanel" aria-labelledby="segtab-cats" hidden>
    ${catalystPanel()}
  </div>`;
}

function compareView() {
  const opts = tickerOptions();
  return `<section class="panel">
    <div class="ph"><h2>Compare companies</h2><span class="meta">Up to ${MAX_TICKERS} at once</span></div>
    <div class="pb">
      <fieldset class="cmpsel">
        <legend>Select companies to compare</legend>
        <div class="chiprow" id="cmpChips">
          ${opts.map(o => `<label class="cchip">
            <input type="checkbox" value="${esc(o.ticker)}" name="compare" />
            <span class="cct">${esc(o.ticker)}</span>
            <span class="ccn">${esc(o.name)}</span>
          </label>`).join('')}
        </div>
        <p class="cmphint" id="cmpHint" aria-live="polite">Select up to ${MAX_TICKERS} companies.</p>
      </fieldset>
      <div class="cmpcontrols">
        <div class="fsel"><label for="cmpPeriod">Period</label><select id="cmpPeriod" name="cmpPeriod">
          ${PERIODS.filter(p => p.id !== 'custom').map(p => `<option value="${esc(p.id)}"${p.id === '3M' ? ' selected' : ''}>${esc(p.label)}</option>`).join('')}
        </select></div>
        <div class="fsel"><label for="cmpMode">Display</label><select id="cmpMode" name="cmpMode">
          ${DISPLAY_MODES.map(m => `<option value="${esc(m.id)}" title="${esc(m.hint)}">${esc(m.label)}</option>`).join('')}
        </select></div>
        <button class="resync" id="cmpClear" type="button">Clear all</button>
      </div>
    </div>
    <div id="cmpChart"></div>
    <div id="cmpTable"></div>
    <div class="stamp">Current prices are never joined to analyst targets as though a trajectory existed.
      Companies are not ranked on figures measured on different bases — where a comparable figure does not
      exist the cell reads <b>${NOT_DISCLOSED}</b>.</div>
  </section>
  <section class="panel">
    <div class="ph"><h2>Potential</h2><span class="meta">Four separate things, kept separate</span></div>
    <div id="cmpPotential"></div>
    <div class="stamp">This panel deliberately separates <b>sell-side consensus</b> (analyst opinion),
      the <b>T2C mathematical scenario</b> (your assumptions run through a lognormal model),
      <b>company operational data</b> (sourced filings) and <b>your own selections</b>. They are never
      blended into a single predicted price.</div>
  </section>`;
}

function homepage() {
  const views = {
    /* 1. What changed, who is delivering, what happens next — before any table. */
    overview: `
      <section class="panel brief-panel">
        <div class="ph"><h2>The market in 30 seconds</h2>
          <span class="meta">Derived from sourced records</span></div>
        ${briefingCards()}
      </section>

      <section class="panel">
        <div class="ph"><h2>Who is delivering</h2>
          <span class="meta">${COMPANIES.length} tracked companies</span></div>
        <div class="keynote">Each card leads with capacity that is actually switched on, not power a
          company controls on paper. Select <b>Compare</b> on up to three to put them side by side.</div>
        ${snapshotCards()}
      </section>

      <section class="panel">
        <div class="ph"><h2>Compare up to three companies</h2><span class="meta">Side by side</span></div>
        <div class="pb"><p class="note">Pick any three of the tracked companies to compare delivery,
          contracted capacity and evidence coverage on one screen.</p>
          <div class="heroacts"><a class="cta primary" href="#compare">Open comparison</a></div></div>
      </section>

      ${ledgerPanel(4, { heading: 'Latest verified changes' })}

      <section class="panel">
        <div class="ph"><h2>Research and evidence</h2><span class="meta">For the detail</span></div>
        <div class="pb"><p class="note">Every figure on this site carries its source, its measurement
          basis and the date it was verified. The full records, the delivery ledger, the capacity tables
          and the corrections log all live under Research.</p>
          <div class="heroacts">
            <a class="cta ghost" href="#research">Open research</a>
            <a class="cta ghost" href="/methodology/">Read the methodology</a>
          </div></div>
      </section>`,

    /* 2. Companies — snapshots plus the watchlist prices. */
    companies: `
      <section class="panel">
        <div class="ph"><h2>Tracked companies</h2><span class="meta" id="quoteMeta">—</span></div>
        <div class="keynote">Six companies have sourced delivery records. Cipher and NVIDIA are carried on
          the watchlist for price and news context only — their company profiles are available, but
          <b>detailed delivery tracking is not yet available</b> for them.</div>
        ${snapshotCards()}
      </section>
      <section class="panel">
        <div class="ph"><h2>Watchlist prices</h2><span class="meta">Including watch-only tickers</span></div>
        <div id="quoteWrap"></div>
      </section>`,

    compare: compareView(),

    catalysts: catalystPanel() + `
      <section class="panel">
        <div class="ph"><h2>Scheduled events</h2><span class="meta">From the provider calendar</span></div>
        <div id="liveCatalystList"></div>
      </section>`,

    forecasts: scenariosView(),

    /* 3. Research — everything specialist, in one place. */
    research: `
      <section class="panel">
        <div class="ph"><h2>Where the megawatts actually are</h2><span class="meta">Confirmed disclosure only</span></div>
        ${kpiCards()}
        <div class="stamp">Every card states its measurement basis, its contributors and its exclusions.
          A <b>≥</b> means at least this much. Undisclosed figures are excluded, never treated as zero.</div>
      </section>
      ${reconciliationPanel()}
      ${deliveryRecordPanel()}
      ${ledgerPanel(null, { heading: 'Delivery ledger', filters: true })}
      <section class="panel">
        <div class="ph"><h2>Capacity by company</h2><span class="meta">Every value with its evidence</span></div>
        ${evidenceKey()}
        <div class="keynote">Each figure carries its measurement basis and value type. <b>Gross utility power
          is never added to critical IT load</b>, and targets never enter a current total.</div>
        <div class="scrollnote">Scroll sideways for all columns →</div>
        ${capacityTable()}
      </section>
      <section class="panel">
        <div class="ph"><h2>What the value types mean</h2></div>
        ${valueTypeKey()}
      </section>
      <section class="panel">
        <div class="ph"><h2>Contract economics</h2><span class="meta">Compiled from filings</span></div>
        <div class="scrollnote">Scroll sideways for all columns →</div>
        ${contractsTable()}
        <div class="stamp">Per-megawatt figures are <b>not comparable across business models</b>, so this
          table does not rank them. A conditional maximum is shown as conditional, never as committed revenue.</div>
      </section>
      ${countryPanel()}
      <section class="panel">
        <div class="ph"><h2>Intelligence</h2><span class="meta" id="newsMeta">—</span></div>
        <div class="filters" id="newsFilters"></div>
        <div id="newsHero"></div>
        <div id="newsList"></div>
        <div class="stamp">News can help discover an event but <b>can never make a capacity value
          confirmed</b>. T2C does not draw a materiality conclusion from a story it has not linked.</div>
      </section>
      <section class="panel">
        <div class="ph"><h2>SEC filings</h2><span class="meta" id="filingMeta">—</span></div>
        <div id="filingList"></div>
      </section>
      ${dataHealthPanel(BUILD_STAMP)}`
  };

  const body = `${hero()}
${nav('tabs', 'overview')}
<main class="wrap">
${NAV.map(n => `<div id="view-${n.id}" role="tabpanel" aria-labelledby="tab-${n.id}"${n.id === 'overview' ? '' : ' hidden'}>${views[n.id]}</div>`).join('\n')}
</main>`;

  const secured = aggregate('securedPowerMw', { basis: 'gross-utility' });
  return page({
    title: 'T2C — Time to Compute | AI infrastructure delivery tracking',
    description:
      'Track the journey from secured power to customer-accepted, invoicing AI compute. Sourced capacity, ' +
      'contract economics, a verified delivery ledger and upcoming catalysts for listed AI infrastructure operators.',
    canonical: SITE + '/',
    body,
    structured: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'T2C AI infrastructure delivery dataset',
      description:
        'Sourced capacity, delivery-stage and contract records for listed AI infrastructure operators. ' +
        'Every figure carries its measurement basis, value type, confidence level and primary source.',
      url: SITE + '/',
      dateModified: BUILD_DATE,
      temporalCoverage: `2026-02-01/${AUDIT_CUTOFF}`,
      isAccessibleForFree: true,
      creator: { '@type': 'Organization', name: 'T2C — Time to Compute', url: SITE },
      measurementTechnique:
        'Manual extraction from primary company disclosures (SEC filings, investor-relations releases and ' +
        'shareholder letters), classified by power basis (gross utility, critical IT, GPU load) and value ' +
        'status (actual, minimum, target, pipeline, potential).',
      citation: SOURCES.filter(s => s.isPrimary).slice(0, 12).map(s => ({
        '@type': 'CreativeWork', name: s.title, url: s.url, publisher: s.publisher, datePublished: s.publishedAt
      })),
      // Only measures actually held on a confirmed basis appear here.
      variableMeasured: [
        { '@type': 'PropertyValue', name: METRICS.securedPowerMw.label, unitText: 'MW',
          value: secured.total, description: `${secured.contributorCount} of ${secured.companyCount} companies, gross-utility basis` },
        { '@type': 'PropertyValue', name: METRICS.customerContractedMw.label, unitText: 'MW',
          description: 'Critical IT basis; disclosed minimum' },
        { '@type': 'PropertyValue', name: METRICS.energisedCriticalItMw.label, unitText: 'MW',
          description: 'Critical IT basis' },
        { '@type': 'PropertyValue', name: METRICS.customerAcceptedMw.label, unitText: 'MW',
          description: 'Critical IT basis' }
      ]
    }
  });
}


/**
 * Organization structured data. sameAs carries ONLY socials verified from an
 * official company domain, and a CEO appears only when the record is current and
 * carries an official source — an unverified officer is simply omitted.
 */
function organizationLd(profile) {
  if (!profile) return null;
  const chiefs = chiefExecutives(profile).filter(e => (e.sourceIds || []).length && e.verifiedAt);
  const sameAs = (profile.socials || [])
    .filter(s => s.verifiedThroughOfficialSite && s.url)
    .map(s => s.url);
  const addr = profile.headquarters || {};
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Corporation',
    name: profile.legalName,
    alternateName: profile.tradingName,
    url: profile.websiteUrl,
    description: profile.shortDescription,
    tickerSymbol: profile.ticker
  };
  if (profile.exchange) {
    ld.identifier = { '@type': 'PropertyValue', propertyID: 'tickerSymbol', value: profile.ticker };
  }
  if (addr.city || addr.country) {
    ld.address = {
      '@type': 'PostalAddress',
      addressLocality: addr.city || undefined,
      addressRegion: addr.region || undefined,
      addressCountry: addr.country || undefined
    };
  }
  if (profile.foundedYear) ld.foundingDate = String(profile.foundedYear);
  if (chiefs.length) {
    ld.employee = chiefs.map(e => ({ '@type': 'Person', name: e.name, jobTitle: e.title }));
    // schema.org allows a single ceo-like role; only assert it for a sole CEO.
    if (chiefs.length === 1) ld.founder = undefined;
  }
  if (sameAs.length) ld.sameAs = sameAs;
  return ld;
}

/* ================= company pages ================= */

function companyPage(c) {
  const v = companyView(c);
  const contracts = CONTRACTS_BY_COMPANY[c.id] || [];
  const cats = CATALYSTS_BY_COMPANY[c.id] || [];
  const order = ['securedPowerMw', 'pipelinePowerMw', 'customerContractedMw', 'constructionMw',
    'energisedCriticalItMw', 'customerAcceptedMw', 'revenueLiveMw'];

  const measureRows = order.map(k => {
    const m = v.measures[k];
    const special = k === 'customerContractedMw' && !isKnown(m) && c.contractedLabel;
    return `<tr>
      <td>${esc(METRICS[k].label)}<span class="sub">${esc(METRICS[k].definition)}</span></td>
      <td>${special ? `<span class="nd">${esc(c.contractedLabel)}</span>` : evidencedValue(m)}
        ${evidenceDrawer(m)}</td>
    </tr>`;
  }).join('');

  const targetRows = (v.targets || []).map(m => `<tr>
    <td>${esc(METRICS[m.metric].label)} target<span class="sub">${esc(m.notes || '')}</span></td>
    <td>${evidencedValue(m)}${evidenceDrawer(m)}</td></tr>`).join('');

  const historyRows = (v.historical || []).map(m => `<tr>
    <td>${esc(METRICS[m.metric].label)}<span class="sub">Historical disclosure — superseded</span></td>
    <td>${evidencedValue(m)}${evidenceDrawer(m)}</td></tr>`).join('');

  const projects = v.projects.length ? v.projects.map(p => `<article class="projcard">
      <div class="projhead">
        <h3>${esc(p.name)}</h3>
        <span class="projmeta">${esc(COUNTRY_NAMES[p.country] || p.country)}</span>
      </div>
      <div class="projval">
        ${p.capacityMw === null ? `<span class="nd">${NOT_DISCLOSED}</span>` : `<b>${esc(mw(p.capacityMw))}</b>`}
        ${basisChip(p.powerBasis)}${statusChip(p.valueStatus)}${evidenceChip(p.confidence)}
      </div>
      <p class="projnote">${esc(p.note || '')}</p>
      ${gateTrack(p)}
      ${timelinePanel(p)}
      <div class="projsrc">${sourceChips(p.sourceIds)}</div>
    </article>`).join('')
    : `<div class="empty"><h3>No site-level projects recorded</h3><p>This company reports fleet-wide rather than by site.</p></div>`;

  const events = v.events.length
    ? `<div class="led">${v.events.map(e => {
        const fmt = x => x === null || x === undefined ? NOT_DISCLOSED : (e.unit === '$bn' ? `$${x}bn` : mw(x));
        return `<article class="ledrow">
          <div class="when"><b>${esc(date(e.effectiveAt || e.announcedAt))}</b><span>announced ${esc(date(e.announcedAt))}</span></div>
          <div class="what"><h4>${esc(e.summary)}</h4><p>${esc(e.implication || '')}</p>
            <div class="ledmeta">${evidenceChip(e.confidence)}${sourceChips(e.sourceIds)}</div></div>
          <div class="delta"><span class="dfrom">${esc(fmt(e.previousValue))}</span><span class="arrow" aria-hidden="true">→</span><span class="dto">${esc(fmt(e.newValue))}</span></div>
        </article>`;
      }).join('')}</div>`
    : `<div class="empty"><h3>No verified milestone history yet</h3><p>Nothing is reconstructed. Entries appear as filings land.</p></div>`;

  const sources = v.sourceIds.map(id => SOURCE_BY_ID[id]).filter(Boolean)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const body = `<main class="wrap">
  <p class="crumb"><a href="/">T2C</a> / <a href="/#capacity">Companies</a> / ${esc(c.name)}</p>
  <div class="chead">
    <div>
      <h1>${esc(c.name)}</h1>
      <div class="tick">${esc(c.ticker)} · ${esc(MODELS[c.model].label)}</div>
    </div>
    <div class="right">
      ${v.needsSource ? pill('warn', '◐', 'Some values unsourced') : pill('ok', '●', 'All values sourced')}
      <div class="tick">Last verified ${v.lastVerifiedAt ? esc(date(v.lastVerifiedAt)) : 'never'}</div>
    </div>
  </div>
  <p class="note lede">${esc(c.summary)}</p>

  ${storybook(v)}

  <section class="panel">
    <div class="ph"><h2>Capacity record</h2><span class="meta">Every value with its evidence</span></div>
    <div class="tw"><table class="rectable">
      <thead><tr><th scope="col">Measure</th><th scope="col">Value and evidence</th></tr></thead>
      <tbody>${measureRows}</tbody></table></div>
  </section>

  ${targetRows ? `<section class="panel">
    <div class="ph"><h2>Targets</h2><span class="meta">Management goals — excluded from all current totals</span></div>
    <div class="tw"><table class="rectable"><tbody>${targetRows}</tbody></table></div>
  </section>` : ''}

  ${historyRows ? `<section class="panel">
    <div class="ph"><h2>Superseded disclosures</h2><span class="meta">Retained and dated, not deleted</span></div>
    <div class="tw"><table class="rectable"><tbody>${historyRows}</tbody></table></div>
  </section>` : ''}

  <section class="panel">
    <div class="ph"><h2>Projects and gates</h2><span class="meta">${v.projects.length} recorded</span></div>
    <div class="keynote">Gates advance independently. Zoning can be granted while environmental approval,
      financing and interconnection all remain outstanding — a single stage label would hide that.</div>
    <div class="projgrid">${projects}</div>
  </section>

  ${contracts.length ? `<section class="panel">
    <div class="ph"><h2>Major contracts</h2><span class="meta">${contracts.length}</span></div>
    <div class="scrollnote">Scroll sideways for all columns →</div>
    <div class="tw"><table>
      <thead><tr><th scope="col">Customer</th><th scope="col">MW</th><th scope="col">Term</th>
        <th scope="col">Value</th><th scope="col">Delivered</th><th scope="col">Terms</th></tr></thead>
      <tbody>${contracts.map(k => `<tr>
        <td class="tleft">${esc(k.customer)}</td>
        <td>${k.mw != null ? `${esc(mw(k.mw))}${basisChip(k.basis)}` : `<span class="nd">${NOT_DISCLOSED}</span>`}</td>
        <td>${k.years ? `${k.years} yr` : `<span class="nd">${NOT_DISCLOSED}</span>`}</td>
        <td>${k.conditional
          ? `$${k.valueBn}bn committed<span class="sub">up to $${k.valueMaxBn}bn maximum — conditional, not committed revenue</span>`
          : (k.valueBn != null ? `$${k.valueBn}bn` : `<span class="nd">${NOT_DISCLOSED}</span>`)}</td>
        <td>${k.deliveredMw != null ? esc(mw(k.deliveredMw)) : `<span class="nd">${NOT_DISCLOSED}</span>`}</td>
        <td class="tleft dim small">${esc(k.terms)}<span class="sub">${sourceChips(k.sourceIds)}</span></td>
      </tr>`).join('')}</tbody></table></div>
  </section>` : ''}

  <section class="panel">
    <div class="ph"><h2>Verified changes</h2><span class="meta">${v.events.length} event${v.events.length === 1 ? '' : 's'}</span></div>
    ${events}
  </section>

  ${cats.length ? `<section class="panel">
    <div class="ph"><h2>Upcoming catalysts</h2><span class="meta">${cats.length}</span></div>
    <div class="catgrid">${cats.map(cat => `<article class="cat">
      <div class="cathead"><span class="cattick">${esc(cat.ticker)}</span></div>
      <h4>${esc(cat.title)}</h4>
      <p>${esc(cat.description)}</p>
      <div class="ledmeta">${evidenceChip(cat.confidence)}${sourceChips(cat.sourceIds)}</div>
    </article>`).join('')}</div>
  </section>` : ''}

  ${PROFILE_BY_ID[c.id] ? aboutPanel(PROFILE_BY_ID[c.id]) : ''}

  <section class="panel">
    <div class="ph"><h2>Sources</h2><span class="meta">${sources.length} documents</span></div>
    <div class="pb">${sources.length ? `<ul class="srclist">${sources.map(s => `<li>
      <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>
      <span class="d">${esc(s.publisher)} · ${esc(s.sourceType)} · published ${esc(date(s.publishedAt))} · accessed ${esc(date(s.accessedAt))}${s.isPrimary ? ' · primary' : ''}</span>
      ${s.supportingExcerpt ? `<blockquote>${esc(s.supportingExcerpt)}</blockquote>` : ''}
    </li>`).join('')}</ul>` : `<p class="note">No primary documents linked yet.</p>`}</div>
  </section>
</main>`;

  return page({
    title: `${c.name} (${c.ticker}) — AI infrastructure delivery | T2C`,
    description:
      `${c.name} delivery tracking: secured power, customer-contracted capacity, energised critical IT ` +
      `and accepted megawatts, each figure carrying its measurement basis and primary source.`,
    canonical: `${SITE}/companies/${c.slug}/`,
    body,
    structured: [organizationLd(PROFILE_BY_ID[c.id]), {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `${c.name} AI infrastructure delivery record`,
      description: `Sourced capacity and delivery-gate record for ${c.name} (${c.ticker}).`,
      url: `${SITE}/companies/${c.slug}/`,
      dateModified: BUILD_DATE,
      temporalCoverage: `2026-02-01/${AUDIT_CUTOFF}`,
      isAccessibleForFree: true,
      creator: { '@type': 'Organization', name: 'T2C — Time to Compute', url: SITE },
      measurementTechnique: 'Manual extraction from primary company disclosures, classified by power basis and value status.',
      citation: sources.filter(s => s.isPrimary).map(s => ({
        '@type': 'CreativeWork', name: s.title, url: s.url, publisher: s.publisher, datePublished: s.publishedAt
      })),
      // Only confirmed, current, actual figures appear in structured data.
      variableMeasured: Object.entries(v.measures)
        .filter(([, m]) => isKnown(m) && m.confidence === 'confirmed' && m.valueStatus === 'actual')
        .map(([k, m]) => ({
          '@type': 'PropertyValue', name: METRICS[k].label, unitText: m.unit, value: m.valueMw,
          description: `${POWER_BASIS[m.powerBasis].label}, as of ${m.asOf}`
        }))
    }].filter(Boolean)
  });
}

/**
 * Watch-only tickers get a real, sourced company profile but no invented delivery
 * records. The page says so plainly rather than rendering an empty capacity table.
 */
function watchOnlyPage(profile) {
  const body = `<main class="wrap">
  <p class="crumb"><a href="/">T2C</a> / <a href="/#companies">Companies</a> / ${esc(profile.tradingName)}</p>
  <div class="chead">
    <div><h1>${esc(profile.tradingName)}</h1>
      <div class="tick">${esc(profile.ticker)}${profile.exchange ? ' · ' + esc(profile.exchange) : ''}</div></div>
    <div class="right">${pill('unknown', '○', 'Watchlist only')}
      <div class="tick">Last verified ${esc(date(profile.verifiedAt))}</div></div>
  </div>
  <section class="panel">
    <div class="ph"><h2>Delivery tracking</h2></div>
    <div class="pb"><div class="unavail compact">
      <h3>Detailed delivery tracking not yet available</h3>
      <p>${esc(profile.tradingName)} is carried on the watchlist for price and news context. T2C does not
        yet maintain sourced infrastructure-delivery records for it, and none have been invented to fill
        this page.</p>
      <p class="unavail-note">The company profile below is verified against official sources.</p>
    </div></div>
  </section>
  ${aboutPanel(profile)}
</main>`;

  return page({
    title: `${profile.legalName} (${profile.ticker}) — company profile | T2C`,
    description:
      `${profile.legalName} company profile: leadership, business model, official investor-relations ` +
      `links and verified social accounts. Delivery tracking is not yet maintained for this ticker.`,
    canonical: `${SITE}/companies/${profile.id}/`,
    body,
    structured: [organizationLd(profile)].filter(Boolean)
  });
}

/* ================= methodology ================= */

function methodologyPage() {
  const body = `<main class="wrap">
  <p class="crumb"><a href="/">T2C</a> / Methodology</p>
  <div class="chead"><div><h1>Methodology</h1>
    <div class="tick">How every figure is defined, measured, sourced and corrected · audit cut-off ${esc(date(AUDIT_CUTOFF))}</div></div></div>

  <section class="panel"><div class="pb prose">
    <h2 id="bases">A megawatt is not a megawatt</h2>
    <p>The single most common error in AI infrastructure coverage is treating three different quantities as
      interchangeable. T2C keeps them apart at the data level: they are separate fields, they are never
      added together, and the build fails if an aggregate mixes them.</p>
  </div>${basisKey()}</section>

  <section class="panel"><div class="pb prose">
    <h2 id="types">Actual, minimum, target, pipeline, potential</h2>
    <p>The second error is treating an ambition as a capability. A company can hold a 5 GW year-end target,
      a 2.2 GW development pipeline and 648 MW of secured power simultaneously — and only one of those is
      capacity it controls today.</p>
  </div>${valueTypeKey()}
  <div class="pb prose">
    <h3>Minimum versus exhaustive</h3>
    <p>Where a company itemises individual contracts but never publishes a company total, the sum of the
      items is a <b>disclosed minimum</b>, shown with a <code>≥</code>. IREN discloses 200 MW to Microsoft
      and 60 MW to NVIDIA, plus further contracts worth approximately $2.8bn whose megawatts are not
      disclosed — so 260 MW is a floor, not a total. Applied Digital, by contrast, publishes an exhaustive
      1,410 MW across five campuses, and that figure is exact.</p>
  </div></section>

  <section class="panel">
    <div class="ph"><h2 id="gates">Project gates</h2><span class="meta">Tracked independently</span></div>
    <div class="keynote">"Permitted" was previously a single stage. It is now several independent gates,
      because zoning, environmental approval and building permits are granted by different bodies on
      different timetables — and a project can hold one for years while waiting on another.</div>
    <div class="tw"><table class="deftable">
      <thead><tr><th scope="col">Gate</th><th scope="col">Meaning</th></tr></thead>
      <tbody>${GATES.map(g => `<tr><td>${esc(g.label)}</td><td>${esc(g.definition)}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>

  <section class="panel"><div class="pb prose">
    <h2 id="definitions">Key definitions</h2>
    <h3>Secured power</h3>
    <p>${esc(METRICS.securedPowerMw.definition)}</p>
    <h3>Customer accepted</h3>
    <p>${esc(METRICS.customerAcceptedMw.definition)}</p>
    <h3>Revenue live</h3>
    <p>${esc(METRICS.revenueLiveMw.definition)}</p>
    <h3>Delivery conversion</h3>
    <p>Energised critical IT divided by secured power, computed per company from the same records the
      tables display, and shown only when both figures are disclosed. Because the two are usually measured
      on different bases — critical IT against gross utility — the ratio is a rough indicator of progress,
      not a like-for-like efficiency measure, and the site labels it as crossing bases wherever it appears.
      Where either figure is missing the conversion reads <b>${NOT_DISCLOSED}</b>; it is never computed
      against an assumed zero.</p>
    <h3>Unknown values</h3>
    <p>An undisclosed figure is stored as <code>null</code> with confidence <code>unknown</code>, and the
      data layer refuses to coerce it. In aggregates it is excluded and counted separately, so every total
      states how many companies contributed and which did not. There is currently <b>no</b> genuine
      numeric zero in the capacity dataset: Keel has no announced lease, which is recorded as not
      disclosed with that label rather than as 0 MW, because a zero would imply a measured figure.</p>
  </div></section>

  <section class="panel">
    <div class="ph"><h2 id="evidence">Evidence levels</h2></div>
    ${evidenceKey()}
    <div class="pb prose">
      <p>Only <b>confirmed</b> values count toward a "sourced" percentage, and a value can only be confirmed
        against a primary document — an SEC filing, an official investor-relations release, a shareholder
        letter, or a regulator or utility record. <b>News can help discover an event, but can never make a
        capacity value confirmed.</b></p>
      <h3>Verification dates</h3>
      <p>A record's verification date is when the underlying evidence was genuinely reviewed. It is never
        set to the current date because a page rendered. Figures never checked against a document show
        <b>not verified</b>.</p>
    </div>
  </section>

  <section class="panel"><div class="pb prose">
    <h2 id="models">Full stack versus powered shell</h2>
    <p>${esc(MODELS.fullStack.definition)}</p>
    <p>${esc(MODELS.poweredShell.definition)}</p>
    <h3>Why per-MW economics cannot be compared directly</h3>
    <p>A powered-shell landlord earning a few million per megawatt per year and a full-stack operator
      earning many times that are not one better than the other — they sell different products with
      different capital bases and different risks. A combined revenue-per-megawatt league table would be
      meaningless, so T2C does not publish one.</p>

    <h2 id="analysts">Analyst targets</h2>
    <p>Analyst price targets are attributable opinions published by third-party research firms. They are
      not T2C forecasts, may use different horizons and assumptions, and can change without warning.
      Consensus statistics use the latest available target from each contributing firm, de-duplicated so
      an aggregator repeating the same research action cannot count twice. The median is shown as the
      primary figure because the mean is easily distorted by a single outlier.</p>
    <p>Where a research note or provider does not state a target horizon, T2C displays
      <b>"Horizon not stated"</b>. A target date is never manufactured by adding twelve months.</p>
    <p><b>Current availability.</b> The connected market-data plan grants a rating distribution but not
      price targets, per-firm rating actions or target history. T2C therefore does not display analyst
      price targets at all, rather than showing an unattributed or placeholder figure. The
      <a href="/#scenarios">Scenarios view</a> states this directly.</p>

    <h2 id="reactions">Historical catalyst reactions</h2>
    <p>Historical event reactions measure observed share-price movements around past announcements. They
      do not prove causation and are not predictions of how the share price will react to a future event.</p>
    <p>The methodology, implemented and tested, is: ${esc(EVENT_METHODOLOGY.sessionAlignment)}
      ${esc(EVENT_METHODOLOGY.abnormalReturn)} The default benchmark is
      ${esc(EVENT_METHODOLOGY.benchmark)}, using ${esc(EVENT_METHODOLOGY.priceBasis)}. Summary statistics
      are withheld below a sample of ${EVENT_METHODOLOGY.minimumSample} comparable events, because a
      median of two observations is noise presented as a finding.</p>
    <p><b>Current availability.</b> Daily historical candles are not granted by the connected plan, so no
      event study can currently run. The engine is in place and unit-tested against reference cases; it
      produces results as soon as a price-history source is connected.</p>

    <h2 id="scenarios">Probability scenarios</h2>
    <p>The Scenarios view runs a lognormal random walk on assumptions <em>you</em> choose. It is not
      options-implied probability, it takes no view on any company, and it is not advice. The median
      outcome is the 50th percentile — half of modelled outcomes finish above it — and is deliberately
      not labelled "most likely price", which would imply a mode.</p>
    <p>Touch probability exceeds finish-above probability because of the reflection principle for Brownian
      motion: paths that cross the target and fall back still count as a touch, and each such path can be
      mapped to a corresponding path that finishes above.</p>
    <p>Default volatility: ${esc(VOL_METHODOLOGY.estimator)} on ${esc(VOL_METHODOLOGY.priceBasis)},
      annualised by ${esc(VOL_METHODOLOGY.annualisation)}, over a selectable lookback of
      ${VOL_METHODOLOGY.lookbacks.join(', ')} trading days. ${esc(VOL_METHODOLOGY.note)}</p>
    <p>All deadline arithmetic is date-only and UTC-based, so a deadline always displays as the date
      chosen regardless of the reader's timezone.</p>

    <h2 id="advice">Not investment advice</h2>
    <p>T2C is an information tool. Nothing here is a recommendation to buy or sell anything, and no
      financial outcome described on this site is guaranteed or certain. Figures are compiled from public
      filings, may lag, and may contain errors — the corrections log below exists because they sometimes do.</p>

    <h2 id="corrections">Corrections</h2>
    <p>Values are not edited silently. When a figure changes, the change is recorded and published here.</p>
  </div>
  <div class="led">${CORRECTIONS.map(c => `<article class="ledrow">
      <div class="when"><b>${esc(date(c.date))}</b></div>
      <div class="what"><h4>${esc(c.summary)}</h4><p>${esc(c.change)}</p>
        ${c.sourceUrl ? `<div class="ledmeta"><a class="src" href="${esc(c.sourceUrl)}" target="_blank" rel="noopener">↗ ${esc(hostOf(c.sourceUrl))}</a></div>` : ''}</div>
      <div class="delta"></div></article>`).join('')}</div>
  </section>

  <section class="panel">
    <div class="ph"><h2 id="sources">Source register</h2><span class="meta">${SOURCES.length} documents</span></div>
    <div class="pb"><ul class="srclist">${SOURCES.map(s => `<li>
      <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>
      <span class="d">${esc(s.publisher)} · ${esc(s.sourceType)} · published ${esc(date(s.publishedAt))} · accessed ${esc(date(s.accessedAt))}${s.isPrimary ? ' · primary' : ''}</span>
    </li>`).join('')}</ul></div>
  </section>
</main>`;

  return page({
    title: 'Methodology — how T2C defines, measures and sources every figure',
    description:
      'Power basis definitions, value types, project gates, evidence levels, analyst-target policy, ' +
      'event-study methodology and the full corrections log.',
    canonical: SITE + '/methodology/',
    body,
    active: 'methodology'
  });
}

function simplePage(slug, title, description, inner) {
  return page({
    title: `${title} — T2C`, description, canonical: `${SITE}/${slug}/`,
    body: `<main class="wrap">
      <p class="crumb"><a href="/">T2C</a> / ${esc(title)}</p>
      <div class="chead"><div><h1>${esc(title)}</h1></div></div>
      <section class="panel"><div class="pb prose">${inner}</div></section>
    </main>`
  });
}

/* ================= write ================= */

function write(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return Buffer.byteLength(content);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let bytes = 0;
bytes += write('index.html', homepage());
bytes += write('methodology/index.html', methodologyPage());
for (const c of COMPANIES) bytes += write(`companies/${c.slug}/index.html`, companyPage(c));
// Watch-only tickers: a real profile, an honest "not tracked" delivery state.
for (const p of PROFILES.filter(x => x.deliveryTracked === false)) {
  bytes += write(`companies/${p.id}/index.html`, watchOnlyPage(p));
}

bytes += write('privacy/index.html', simplePage('privacy', 'Privacy',
  'What T2C collects — and what it does not.',
  `<h2>What we collect</h2>
   <p>T2C sets no advertising or tracking cookies and runs no third-party analytics. The only values
     stored in your browser are your theme preference and your comparison selections, kept in local
     storage on your own device and never transmitted.</p>
   <h2>What the page requests</h2>
   <p>Pages call this site's own <code>/api/</code> routes for prices, news, filings, analyst coverage and
     earnings dates. Those routes call Finnhub and SEC EDGAR from the server, so your browser is never
     given an API key. News thumbnails load directly from the publisher's own image host with
     <code>referrerpolicy="no-referrer"</code>.</p>
   <h2>Hosting</h2>
   <p>The site is served by Vercel, which processes standard request logs as our hosting provider.</p>`));

bytes += write('terms/index.html', simplePage('terms', 'Terms',
  'Terms of use for T2C — information only, not investment advice.',
  `<h2>Information only</h2>
   <p>T2C is an information tool. Nothing on this site is investment advice, a recommendation, or an offer
     to buy or sell any security, and no financial outcome described here is guaranteed or certain.</p>
   <h2>Accuracy</h2>
   <p>Figures are compiled from public filings and company releases. They may lag, may be misinterpreted,
     and may be wrong. Every figure carries a confidence level and a link to the underlying document —
     check the document rather than relying on our summary. Corrections are published in the
     <a href="/methodology/#corrections">corrections log</a>.</p>
   <h2>Scenarios and analyst data</h2>
   <p>The Scenarios view is a lognormal probability exercise on inputs you choose. It is not derived from
     options markets, does not account for gaps or jumps, and must not be treated as a forecast. Analyst
     targets, where shown, are third-party opinions attributed to their publisher and are not T2C views.
     Historical event reactions are observations and do not establish causation.</p>
   <h2>Third-party data</h2>
   <p>Prices, news, analyst coverage and earnings dates are supplied by Finnhub; filings by SEC EDGAR.
     Their terms apply to that data. Linked articles belong to their publishers.</p>`));

bytes += write('contact/index.html', simplePage('contact', 'Contact',
  'How to reach T2C, report an error or supply a source.',
  `<h2>Corrections and missing sources</h2>
   <p>If you can point to a primary document for a figure marked <b>reported</b>, or you believe a figure
     is wrong, that is the most useful thing you can send. Corrections are published in full in the
     <a href="/methodology/#corrections">corrections log</a>, including what the figure was before.</p>
   <h2>Get in touch</h2>
   <p>Open an issue at
     <a href="https://github.com/BuyrWorld/TimetoCompute/issues" target="_blank" rel="noopener">github.com/BuyrWorld/TimetoCompute</a>.
     Please include the company, the figure, and a link to the document.</p>`));

const urls = [
  { loc: SITE + '/', priority: '1.0', freq: 'hourly' },
  { loc: SITE + '/methodology/', priority: '0.9', freq: 'weekly' },
  ...COMPANIES.map(c => ({ loc: `${SITE}/companies/${c.slug}/`, priority: '0.8', freq: 'weekly' })),
  ...PROFILES.filter(p => p.deliveryTracked === false)
    .map(p => ({ loc: `${SITE}/companies/${p.id}/`, priority: '0.5', freq: 'monthly' })),
  { loc: SITE + '/privacy/', priority: '0.2', freq: 'yearly' },
  { loc: SITE + '/terms/', priority: '0.2', freq: 'yearly' },
  { loc: SITE + '/contact/', priority: '0.3', freq: 'yearly' }
];

bytes += write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
bytes += write('sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${BUILD_DATE}</lastmod>\n` +
    `    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n') +
  `\n</urlset>\n`);

bytes += write('favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
  `<rect width="64" height="64" rx="10" fill="#0A0A0A"/>` +
  `<text x="32" y="43" font-family="Archivo,Helvetica,Arial,sans-serif" font-size="30" font-weight="900" ` +
  `fill="#D6FF00" text-anchor="middle" letter-spacing="-1.5">T2C</text></svg>`);

// One stylesheet ships: base tokens + components, concatenated so the page makes
// a single CSS request and the cascade order is explicit.
fs.writeFileSync(path.join(OUT, 'styles.css'),
  ['styles.css', 'components.css', 'profile.css']
    .map(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n'));
fs.cpSync(path.join(ROOT, 'src', 'app.js'), path.join(OUT, 'app.js'));
fs.cpSync(path.join(ROOT, 'Logo'), path.join(OUT, 'Logo'), { recursive: true });

console.log(`✓ built ${COMPANIES.length + 5} pages + robots.txt + sitemap.xml (${(bytes / 1024).toFixed(0)} KB) → dist/`);
