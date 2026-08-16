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
import { CATALYSTS_BY_COMPANY, CATALYSTS, CATALYST_STATUS } from './data/catalysts.js';
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
  briefingCards, snapshotCards, aboutPanel, officialLinks, leadershipCards, storybook, callPanel
} from './src/ui.js';
import {
  todayBody, companiesBody, compareBody, catalystsBody, researchBody, labBody,
  sitesBody, siteBody, intelligenceBody, newsBody, explainersBody, notFoundBody, chainBody
} from './src/pages.js';
import { allSites, companyPath } from './src/lib/sites.js';
import { ASSETS, ASSET_WIDTHS, ASSET_NATIVE_WIDTH } from './src/lib/assets.js';
import { STAGES, chainState, chainCoverage } from './src/lib/chain.js';
import { ART } from './data/artpack.js';
import { explainerRoutes, explainerHref } from './src/lib/explain.js';
import { explainerPageBody } from './src/explainer-page.js';
import { aiCatalystsBody, aiNewsConfig } from './src/ainews-page.js';
import { timeMachineBody } from './src/timemachine-page.js';
import { checkTimeMachine, CAMPAIGNS, chapterCount } from './src/lib/timemachine.js';
import { aiFactoryGraph } from './src/lib/corridor.js';
import { passport } from './src/lib/passport.js';
import {
  passportHeader, whereItSits, dependencyRisk, thesisRiskPanel,
  bottleneckRadar as bottleneckRadarPanel
} from './src/passport-ui.js';
import { signals, todaySet } from './src/lib/signals.js';
import { signalIndex } from './src/lib/today.js';
import { realityScore, FACTORS, MIN_WEIGHT_COVERAGE, THIN_SAMPLE } from './src/lib/score.js';
import {
  scorePanel, capacityTruth, contractXray, pathTrack, estimateBlock, revenueCalculator
} from './src/mission-ui.js';
import {
  companyEstimates, estimateCoverage, estimateRevenueRate,
  RULES as ESTIMATE_RULES, GROSS_TO_CRITICAL_IT
} from './src/lib/estimate.js';
import { LAB_COVERAGE, CONTRACT_ECONOMICS, CAPEX_REFERENCE, MODEL_DEFAULTS, ASSUMPTION_PROVENANCE } from './data/economics.js';

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
/**
 * Real routes, not tabs. Each is its own page, so an internal tool starts near the
 * top of the screen instead of below a repeated marketing hero.
 */
/**
/**
 * The primary destinations, named for what a reader wants rather than for the
 * data model behind them.
 *
 * MEGAPROJECTS IS GONE FROM HERE. A reader interested in a company's data
 * centres is already thinking about the company, so the detail belongs on the
 * company page — which is where it now lives, one section per site with its
 * gates, its timeline and its documents.
 *
 * The ROUTES ARE NOT DELETED. /sites/ and all 23 /sites/<slug>/ pages stay
 * exactly where they were: they are published URLs, they are in the sitemap and
 * the command palette, and the explainers and signals link into them. Deleting
 * a tab is an editorial decision; deleting a URL breaks every link anyone has
 * ever shared. /sites/ moves to the utility menu, where it is one tap away on
 * every page.
 */
const NAV = [
  { id: 'today', label: 'Today', href: '/' },
  { id: 'chain', label: 'Supply chain', href: '/chain/' },
  { id: 'companies', label: 'Companies', href: '/companies/' },
  /* The pack asks for AI News and Financials in the primary nav. News is
     promoted here because the route exists and carries real sourced stories.
     FINANCIALS IS DELIBERATELY ABSENT: its route is phase 6, and a primary nav
     item leading to a 404 — or to a page of em-dashes — is worse than one the
     reader has not been promised yet. It joins when it has something to show. */
  { id: 'ainews', label: 'AI news', href: '/ai-news/' },
  { id: 'catalysts', label: 'Catalysts', href: '/catalysts/' },
  { id: 'explainers', label: 'Explainers', href: '/explainers/' },
  /* The game gets its own tab. It sits last because it is the one destination
     that is not the research record, and the label says what it is rather than
     what it contains — nobody scanning a nav is looking for "AI Time Machine"
     unless they already know what that is. */
  { id: 'timemachine', label: 'Play', href: '/time-machine/', search: 'AI Time Machine game play history simulation' }
];

/**
 * The mobile bar. Four destinations, because six labels collide at 390px and a
 * bar nobody can read is worse than a shorter one. Everything omitted here is
 * still one tap away in the utility menu.
 */
const MOBILE_NAV = [
  { id: 'today', label: 'Today', href: '/' },
  { id: 'chain', label: 'Chain', href: '/chain/' },
  { id: 'watchlist', label: 'Watchlist', href: '/companies/?filter=watching' },
  { id: 'search', label: 'Search', action: 'palOpenMobile' }
];

/**
 * Secondary routes, reachable from the utility menu on every page. They carry
 * ids so that a reader standing on one still sees where they are — a demoted
 * route must not become a page with no current marker anywhere.
 */
const UTILITY_ROUTES = [
  { id: 'sites', label: 'All data centres', href: '/sites/' },
  { id: 'intelligence', label: 'Intelligence ledger', href: '/intelligence/' },
  { id: 'news', label: 'News wire', href: '/news/' },
  { id: 'lab', label: 'Edge Lab', href: '/lab/' },
  { id: 'compare', label: 'Compare companies', href: '/compare/' },
  { id: 'research', label: 'Research', href: '/research/' },
  { id: 'methodology', label: 'Methodology', href: '/methodology/' }
];

/**
 * Every hash the old single-page build ever used maps to a route. Indexed links
 * and anything a reader bookmarked must keep working.
 */
const HASH_ROUTES = {
  overview: '/', today: '/',
  companies: '/companies/',
  compare: '/compare/',
  catalysts: '/catalysts/',
  odds: '/lab/#odds', forecasts: '/lab/', scenarios: '/lab/', lab: '/lab/',
  sites: '/sites/', projects: '/sites/',
  research: '/research/', ledger: '/intelligence/', capacity: '/research/#capacity',
  intelligence: '/intelligence/', filings: '/research/#filings',
  geography: '/research/#geography', 'data-health': '/research/#data-health',
  reconciliation: '/research/#reconciliation'
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
/**
 * Compact application header, ~68px. Navigation, a market-state pill and a utility
 * menu. Refresh and theme moved into the menu so they stop competing with
 * navigation for attention.
 */
function appHeader(active = 'today') {
  const items = NAV.map(n =>
    `<a class="navlink press${n.id === active ? ' is-active' : ''}${n.primary ? ' is-primary' : ''}"
        href="${n.href}"${n.id === active ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('');

  return `<a class="skiplink" href="#main">Skip to content</a>
<header class="appbar">
  <div class="shell appbarin">
    <a class="brand press" href="/" aria-label="T2C — Time to Compute, home">
      <img src="/Logo/logo-header.png" width="514" height="120" alt="" />
    </a>
    <nav class="mainnav" aria-label="Primary">${items}</nav>
    <div class="appbarutil">
      <button class="paltrigger press" id="palOpen" type="button"
        aria-haspopup="dialog" aria-label="Search or run a command">
        <span aria-hidden="true">⌕</span>
        <span class="paltxt">Search or run a command</span>
        <kbd class="palkbd" aria-hidden="true">Ctrl K</kbd>
      </button>
      <a class="watchbtn-nav press" href="/companies/?filter=watching">
        <span class="ed-icon" data-icon="watchlist" aria-hidden="true"></span>
        <span class="watchtxt">My watchlist</span>
      </a>
      <!-- "Live" would read as telemetry this site does not have. Standard/Focus
           describes the interface, which is what the control actually changes. -->
      <div class="modetoggle" role="group" aria-label="Interface mode">
        <button class="modebtn press" type="button" data-mode="live" aria-pressed="true">Standard</button>
        <button class="modebtn press" type="button" data-mode="focus" aria-pressed="false">Focus</button>
      </div>
      <span class="mstate secondary" id="marketState" aria-live="polite">
        <i aria-hidden="true"></i><span class="mstate-text">Updating…</span>
      </span>
      <details class="umenu">
        <summary class="press" aria-label="Settings and data status"><span aria-hidden="true">⋯</span></summary>
        <div class="umenupanel">
          <div class="umenugroup">
            <div class="umenuhead">Data</div>
            <div class="umenurow" id="feedDetail">Checking the feed…</div>
            <button class="umenubtn press" id="refreshBtn" type="button">Refresh data</button>
          </div>
          <div class="umenugroup umenu-narrow">
            <div class="umenuhead">You</div>
            <a class="umenubtn press" href="/companies/?filter=watching">My watchlist</a>
            <div class="modetoggle" role="group" aria-label="Interface mode">
              <button class="modebtn press" type="button" data-mode="live" aria-pressed="true">Standard</button>
              <button class="modebtn press" type="button" data-mode="focus" aria-pressed="false">Focus</button>
            </div>
          </div>
          <div class="umenugroup">
            <div class="umenuhead">Display</div>
            <button class="umenubtn press" id="themeBtn" type="button" aria-label="Switch to light theme">Light theme</button>
            <button class="umenubtn press" id="estBtn" type="button" aria-pressed="true">Estimates: shown</button>
            <div class="umenurow">Estimates are derived by T2C from disclosed figures. Switch them off
              to see only what companies have published.</div>
          </div>
          <div class="umenugroup">
            <div class="umenuhead">More of T2C</div>
            ${UTILITY_ROUTES.map(r =>
              `<a class="umenubtn press${r.id === active ? ' is-active' : ''}" href="${r.href}"${
                r.id === active ? ' aria-current="page"' : ''}>${esc(r.label)}</a>`).join('\n            ')}
          </div>
          <div class="umenugroup">
            <div class="umenuhead">Reference</div>
            <a class="umenubtn press" href="/research/#data-health">Data health</a>
            <a class="umenubtn press" href="/methodology/#corrections">Corrections</a>
          </div>
        </div>
      </details>
    </div>
  </div>
</header>
<div class="focusbar" role="status">
  <span>Focus mode</span>
  <span class="focusnote">Supporting context hidden. Figures, their basis, confidence and sources are
    unchanged — nothing that qualifies a number is hidden.</span>
  <button type="button" class="press" data-mode="live">Leave focus</button>
</div>
${/* Mobile gets four destinations, not six. Six labels collide at 390px, and
      the brief prioritises Today, Chain, Watchlist and Search. Everything else
      stays one tap away in the utility menu — nothing is unreachable. */''}
<nav class="bottomnav" aria-label="Primary, mobile">
  ${MOBILE_NAV.map(n => (n.action
    ? `<button type="button" class="bnav press" id="${esc(n.action)}">
        <span>${esc(n.label)}</span></button>`
    : `<a class="bnav press${n.id === active ? ' is-active' : ''}" href="${n.href}"${
        n.id === active ? ' aria-current="page"' : ''}>
        <span>${esc(n.label)}</span></a>`)).join('')}
</nav>

<dialog class="pal" id="palette" aria-label="Search or run a command">
  <div class="palin">
    <div class="palfield">
      <span aria-hidden="true">⌕</span>
      <label class="vh" for="palInput">Search companies, sites and pages</label>
      <input type="search" id="palInput" placeholder="Search companies, sites and pages…"
        autocomplete="off" spellcheck="false" />
      <kbd class="palkbd" aria-hidden="true">Esc</kbd>
    </div>
    <ul class="palresults" id="palResults" role="listbox" aria-label="Results"></ul>
    <p class="palempty" id="palEmpty" hidden>Nothing matches that.</p>
  </div>
</dialog>`;
}

/**
 * Compact header for an internal page. Replaces the marketing hero so the tool
 * itself starts near the top of the viewport.
 */
function pageHeader({ title, lede, actions = '', meta = '' }) {
  return `<div class="pagehead">
    <div class="pageheadin">
      <h1>${esc(title)}</h1>
      ${lede ? `<p class="pagelede">${lede}</p>` : ''}
      ${meta ? `<div class="pagemeta">${meta}</div>` : ''}
    </div>
    ${actions ? `<div class="pageacts">${actions}</div>` : ''}
  </div>`;
}

function footer() {
  return `<footer class="foot">
  <div class="wrap footin">
    <div class="footmark">
      <img src="/Logo/logo-header.png" alt="" width="514" height="120" />
      <p>What management promised, what the evidence supports, what was physically delivered, what the
         customer accepted, and when revenue began.</p>
    </div>
    <div class="footgrid">
      <div class="footcol"><h4>Understand the data</h4><ul>
        <li><a href="/methodology/">Methodology</a></li>
        <li><a href="/methodology/#sources">Sources</a></li>
        <li><a href="/methodology/#corrections">Corrections</a></li>
        <li><a href="/research/#data-health">Data health</a></li>
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

/**
 * Everything the command palette can reach. Built from the same records as the
 * pages themselves, so the palette can never offer a destination that was not
 * generated — a stale search index is a broken link with extra steps.
 */
let PALETTE_CACHE = null;
function paletteIndex() {
  if (PALETTE_CACHE) return PALETTE_CACHE;
  const rows = [];
  /* `search` carries what a reader might type when the nav label is shorter than
     the thing itself. "Play" is the right word on a tab and the wrong one in a
     search box: somebody looking for the game will type "time machine". */
  for (const n of NAV) rows.push({ k: 'Page', n: n.label, h: n.href, ...(n.search ? { s: n.search } : {}) });
  for (const r of UTILITY_ROUTES) rows.push({ k: 'Page', n: r.label, h: r.href });
  for (const c of COMPANIES) {
    rows.push({ k: 'Company', n: `${c.name} (${c.ticker})`, h: `/companies/${c.slug}/` });
  }
  for (const p of PROFILES.filter(x => x.deliveryTracked === false)) {
    rows.push({ k: 'Company', n: `${p.legalName} (${p.ticker})`, h: `/companies/${p.id}/` });
  }
  for (const s of allSites()) {
    rows.push({ k: 'Site', n: `${s.name} — ${s.ticker || s.companyName}`, h: `/sites/${s.slug}/` });
  }
  PALETTE_CACHE = rows;
  return rows;
}

function page({ title, description, canonical, body, active = 'today', structured = null, extraScripts = [], inlineData = null }) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
${head({ title, description, canonical, structured })}
</head>
<body class="route-${active}">
${appHeader(active)}
<main id="main">${body}</main>
${footer()}
<script type="application/json" id="t2c-config">${JSON.stringify({
    tickers: WATCH_TICKERS, names: TICKER_NAMES, maxCompare: MAX_TICKERS, buildStamp: BUILD_STAMP,
    companyByTicker: Object.fromEntries(COMPANIES.map(c => [c.ticker, c.id])),
    route: active, hashRoutes: HASH_ROUTES,
    labReady: Object.entries(LAB_COVERAGE).filter(([, v]) => v.ready).map(([k]) => k),
    palette: paletteIndex(),
    // The whole ledger, compactly. The browser owns the "since last visit"
    // comparison because only it knows when the last visit was.
    signalIndex: active === 'today' ? signalIndex() : null,
    // Which signals exist and which belong to the latest set, so the filter and
    // progress code does not have to re-derive either from the DOM.
    aiNews: active === 'catalysts' ? aiNewsConfig() : null
  })}</script>
${inlineData ? `<script>Object.assign(window, ${JSON.stringify(inlineData)});</script>` : ''}
<script src="/app.js" defer></script>
${extraScripts.map(s => `<script src="${s}" defer></script>`).join('\n')}
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



/* ================= Edge Lab payload ================= */

/**
 * Build the tranches the Lab models, from real records only.
 *
 * A tranche exists where a CONTRACT discloses megawatts AND an economics entry
 * derives a revenue rate from that contract's own value and term. Capacity with no
 * disclosed contract terms is deliberately absent rather than modelled at a
 * borrowed rate — that absence is what keeps the output honest.
 */
function labPayload() {
  // The projection opens at the start of the current quarter, so anything already
  // evidenced as complete is inside the window from its first period.
  const now = new Date();
  const START_Q = { year: now.getUTCFullYear(), q: Math.floor(now.getUTCMonth() / 3) + 1 };
  const PROJECTION_START = `${START_Q.year}-${String((START_Q.q - 1) * 3 + 1).padStart(2, '0')}-01`;

  const companies = COMPANIES.filter(c => LAB_COVERAGE[c.id]?.ready).map(c => {
    const v = companyView(c);
    const contracts = (CONTRACTS_BY_COMPANY[c.id] || []).filter(k => k.mw && CONTRACT_ECONOMICS[k.id]);
    const projects = v.projects || [];

    /* Delivery evidence sits on projects, contract terms sit on contracts, and the
       link between them is declared in the data (`projectIds`) only where the company
       named the site itself. A contract with no declared site gets no delivery date —
       borrowing a sibling project's schedule would be a fabricated date, and every
       figure downstream of it would inherit that fabrication. */
    const byId = Object.fromEntries(projects.map(p => [p.id, p]));

    /**
     * Completed acceptance or revenue gates on the sites that serve one contract.
     *
     * A gate can be complete without a disclosed date. That still tells us the site
     * is earning now, so it is modelled as live from the start of the projection
     * rather than never — treating evidenced revenue as zero would understate the
     * company just as badly as inventing a date would overstate it. The two cases
     * are reported separately so the reader can see which is which.
     */
    const liveDateFor = ids => {
      const gates = (ids || []).flatMap(id => ((byId[id] || {}).gates || [])
        .filter(g => g.status === 'complete' && (g.id === 'revenueCommenced' || g.id === 'customerAccepted')));
      if (!gates.length) return { at: null, basis: 'none' };
      const dated = gates.map(g => g.effectiveAt).filter(Boolean).sort();
      return dated.length
        ? { at: dated[0], basis: 'evidenced-gate' }
        : { at: PROJECTION_START, basis: 'evidenced-undated' };
    };

    /**
     * Forward delivery windows on the sites that serve one contract. The END of a
     * guided window is used, never the start: "some time in this window" read
     * optimistically is how a model quietly flatters a company.
     */
    const windowsFor = (ids, after) => (ids || []).flatMap(id => {
      const p = byId[id];
      return ((p || {}).schedules || [])
        .filter(s => s.gate === 'criticalItEnergised' || s.gate === 'customerAccepted' || s.gate === 'revenueCommenced')
        .map(s => ({
          projectId: id, projectName: p.name, gate: s.gate, scope: s.scope || null,
          exact: s.exact || null, start: s.start || null, end: s.end || null,
          effective: s.exact || s.end || null
        }));
    }).filter(s => s.effective && (!after || s.effective > after))
      .sort((a, b) => a.effective.localeCompare(b.effective));

    /* One contract becomes up to two tranches: what has been delivered and is
       already earning, and what has not. They are separated because only the
       undelivered half still carries capex and still carries delivery risk. */
    const tranches = [];
    const allWindows = [];
    for (const k of contracts) {
      const e = CONTRACT_ECONOMICS[k.id];
      const delivered = k.deliveredMw || 0;
      const remaining = Math.max(0, k.mw - delivered);
      const live = liveDateFor(k.projectIds);
      const liveFrom = live.at;
      const windows = windowsFor(k.projectIds, liveFrom);
      const next = windows.length ? windows[0] : null;
      allWindows.push(...windows);

      if (delivered > 0) {
        tranches.push({
          id: k.id + '-delivered',
          label: `${k.customer} — delivered`,
          capacityMw: delivered, ownershipPct: 1,
          energisedAt: liveFrom, acceptedAt: liveFrom, revenueFrom: liveFrom,
          contracted: true, delivered: true,
          revenuePerMwYearM: e.revenuePerMwYearM,
          remainingCapexM: null,             // already spent
          dateBasis: live.basis,
          dateNote: live.basis === 'evidenced-gate'
            ? `Accepted ${date(liveFrom)}, evidenced by a completed delivery gate.`
            : live.basis === 'evidenced-undated'
              ? 'The delivery gate is complete but the company did not disclose the date, so this is modelled as earning from the start of the projection.'
              : 'No completed acceptance gate is on record for this site, so this capacity earns nothing in the model.',
          sourceIds: k.sourceIds
        });
      }

      if (remaining > 0) {
        /* Where the serving site is already through its revenue gate but the company
           has not split how much of the contract that covers, the remainder is dated
           from the same evidenced start. That is the upper bound, not a measurement,
           and the note says so — the alternative, modelling a site that is demonstrably
           invoicing as earning nothing, is a different kind of wrong. */
        const carriesLive = live.basis !== 'none' && !next;
        const from = next ? next.effective : (carriesLive ? liveFrom : null);

        tranches.push({
          id: k.id + '-remaining',
          label: `${k.customer} — still to deliver`,
          capacityMw: remaining, ownershipPct: 1,
          energisedAt: from, acceptedAt: from, revenueFrom: from,
          contracted: true, delivered: false,
          revenuePerMwYearM: e.revenuePerMwYearM,
          // TeraWulf's own disclosure is the only build cost T2C has; applying it
          // to another operator is an assumption, and the Lab labels it as one.
          remainingCapexM: remaining * CAPEX_REFERENCE.wulfPerMwM.midpoint,
          capexBasis: 'assumed-peer',
          dateBasis: next ? 'evidenced-window'
            : carriesLive ? 'upper-bound'
            : (k.projectIds ? 'no-window' : 'no-site'),
          dateNote: next
            ? `Dated from the end of the guided delivery window for ${next.projectName}${next.scope ? ' (' + next.scope + ')' : ''}. Shift the delivery slider to test other timings.`
            : carriesLive
              ? 'The site serving this contract has passed its revenue gate, but the company has not said how much of the contract is live. The model assumes all of it, which is the upper bound.'
              : (k.projectIds
                ? 'The site is known but no delivery window has been guided, so this capacity earns nothing until you set a date.'
                : 'The company has not named the site that serves this contract, so T2C has no delivery date for it and models no revenue from it.'),
          sourceIds: k.sourceIds
        });
      }
    }
    const schedule = allWindows.sort((a, b) => a.effective.localeCompare(b.effective));
    const liveFrom = tranches.filter(t => t.delivered && t.revenueFrom).map(t => t.revenueFrom).sort()[0] || null;
    const nextDelivery = schedule.length ? schedule[0].effective : null;

    const energisedM = v.measures.energisedCriticalItMw;
    const contractedM = v.measures.customerContractedMw;

    return {
      id: c.id, ticker: c.ticker, name: c.name, model: c.model,
      tranches,
      schedule: schedule.slice(0, 8),
      liveFrom, nextDelivery,
      totalTrancheMw: tranches.reduce((a, t) => a + (t.capacityMw || 0), 0),
      deliveredMw: tranches.filter(t => t.delivered).reduce((a, t) => a + t.capacityMw, 0),
      undatedMw: tranches.filter(t => !t.revenueFrom).reduce((a, t) => a + t.capacityMw, 0),
      evidencedMw: isKnown(energisedM) ? energisedM.valueMw : null,
      contractedMw: isKnown(contractedM) ? contractedM.valueMw : null,
      // Never sourced by T2C — the reader supplies these and the UI says so.
      balance: { cashM: null, debtM: null, sharesOutstandingM: null, equityIssuePrice: null },
      contractEconomics: contracts.map(k => ({
        id: k.id, label: k.customer,
        displayPerMwYearM: CONTRACT_ECONOMICS[k.id].displayPerMwYearM,
        derivation: CONTRACT_ECONOMICS[k.id].derivation
      })),
      coverage: LAB_COVERAGE[c.id]
    };
  });

  return {
    companies,
    startQuarter: START_Q,
    projectionStart: PROJECTION_START,
    defaults: MODEL_DEFAULTS,
    provenance: ASSUMPTION_PROVENANCE,
    capexReference: CAPEX_REFERENCE
  };
}

/** Ship the engine to the browser without a bundler: strip ESM, attach to window. */
function labEngineScript() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'edgelab.js'), 'utf8')
    .replace(/^import[^;]+;$/gm, '')
    .replace(/^export (const|function|class|let|var)/gm, '$1')
    .replace(/^export \{[^}]*\};?$/gm, '');

  const payload = labPayload();
  return `/* Edge Lab engine — generated from src/lib/edgelab.js at build time. */
(function(){
${src}
var LAB = ${JSON.stringify(payload)};
LAB.engine = {
  runScenario: runScenario, solveFor: solveFor, simulate: simulate, stress: stress,
  sensitivityGrid: sensitivityGrid, classifyRequirement: classifyRequirement,
  project: project, funding: funding, valuation: valuation, perShare: perShare,
  quarterOf: quarterOf, addQuarters: addQuarters, quarterEnd: quarterEnd,
  STRESS_TESTS: STRESS_TESTS, SOLVABLE: SOLVABLE, REQUIREMENT_VERDICT: REQUIREMENT_VERDICT
};
LAB.horizonLabel = function(q){ return quarterLabel(addQuarters(LAB.startQuarter, q)); };
window.T2C_LAB = LAB;
})();`;
}

/* ================= client payloads ================= */

/** Compare rows. Only like-for-like measures; nulls stay null. */
function comparePayload() {
  const out = {};
  for (const c of COMPANIES) {
    const v = companyView(c);
    const val = key => {
      const m = v.measures[key];
      return isKnown(m) ? `${m.valueStatus === 'minimum' ? '≥' : ''}${mw(m.valueMw)}` : null;
    };
    const records = [...(c.measures || [])];
    const known = records.filter(isKnown);
    const next = (v.catalysts || [])
      .filter(x => x.status !== 'completed')
      .sort((a, b) => String(a.expectedAt || a.expectedWindowStart || '')
        .localeCompare(String(b.expectedAt || b.expectedWindowStart || '')))[0];

    out[c.ticker] = {
      ticker: c.ticker, name: c.name, slug: c.slug,
      energised: val('energisedCriticalItMw'),
      contracted: isKnown(v.measures.customerContractedMw)
        ? val('customerContractedMw') : (c.contractedLabel || null),
      secured: val('securedPowerMw'),
      accepted: val('customerAcceptedMw'),
      revenueLive: val('revenueLiveMw'),
      stage: v.stage ? v.stage.short : null,
      nextCatalyst: next ? (next.expectedAt ? date(next.expectedAt)
        : windowText(next.expectedWindowStart, next.expectedWindowEnd)) : null,
      sourced: known.length
        ? `${Math.round((known.filter(m => m.confidence === 'confirmed').length / known.length) * 100)}%` : null,
      notDisclosed: String(records.length - known.length),
      lastVerified: v.lastVerifiedAt ? date(v.lastVerifiedAt) : null,
      catalysts: (v.catalysts || []).map(x => ({
        title: x.title,
        when: x.expectedAt ? date(x.expectedAt) : windowText(x.expectedWindowStart, x.expectedWindowEnd),
        certainty: CATALYST_STATUS[x.status]?.label || x.status
      }))
    };
  }
  return out;
}

/** "Q4 2026", never "in 47 days from the first of October". */
function windowText(start, end) {
  if (!start || !end) return 'Date unknown';
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  if (sy === ey) {
    if (sm === 1 && em === 6) return `H1 ${sy}`;
    if (sm === 7 && em === 12) return `H2 ${sy}`;
    if (sm === 1 && em === 3) return `Q1 ${sy}`;
    if (sm === 4 && em === 6) return `Q2 ${sy}`;
    if (sm === 7 && em === 9) return `Q3 ${sy}`;
    if (sm === 10 && em === 12) return `Q4 ${sy}`;
    if (sm === 1 && em === 12) return `During ${sy}`;
  }
  return `${date(start)} – ${date(end)}`;
}

/**
 * Catalyst payload.
 *
 * A day countdown appears ONLY for a confirmed exact date. A guided window shows
 * its period and an explicit "Expected during…", because counting days from the
 * first of a quarter implies a precision the company never gave.
 */
function catalystPayload() {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const days = iso => Math.round(
    (Date.parse(iso + 'T00:00:00Z') - Date.parse(todayIso + 'T00:00:00Z')) / 86400000);

  return CATALYSTS.map(c => {
    const co = COMPANIES.find(x => x.id === c.companyId);
    const exact = c.status === 'confirmed-date' && c.expectedAt;
    const start = c.expectedAt || c.expectedWindowStart || null;

    let when, countdown = null, group, tone;
    if (exact) {
      when = date(c.expectedAt);
      const d = days(c.expectedAt);
      countdown = d === 0 ? 'Today' : d > 0 ? `in ${d} days` : `${Math.abs(d)} days ago`;
      group = d <= 30 ? 'Next 30 days' : d <= 92 ? 'Next quarter' : 'Later';
      tone = 'ok';
    } else if (c.expectedWindowStart && c.expectedWindowEnd) {
      when = windowText(c.expectedWindowStart, c.expectedWindowEnd);
      group = 'Guided windows';
      tone = 'warn';
    } else {
      when = 'Date unknown';
      group = 'Date unknown';
      tone = 'unknown';
    }

    return {
      id: c.id, companyId: c.companyId, ticker: c.ticker,
      company: co ? co.name : c.companyId,
      title: c.title, description: c.description,
      category: c.category, status: c.status,
      certainty: exact ? 'Confirmed date'
        : c.expectedWindowStart ? `Expected during ${when}`
        : 'No date published',
      when, countdown, group, tone,
      affects: c.affectsMetric ? METRICS[c.affectsMetric]?.label : null,
      sourceHtml: sourceChips(c.sourceIds),
      sortKey: start || '9999-12-31'
    };
  }).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

/* ================= route pages ================= */

const DATASET_LD = () => ({
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
    'Manual extraction from primary company disclosures, classified by power basis (gross utility, ' +
    'critical IT, GPU load) and value status (actual, minimum, target, pipeline, potential).',
  citation: SOURCES.filter(s => s.isPrimary).slice(0, 12).map(s => ({
    '@type': 'CreativeWork', name: s.title, url: s.url, publisher: s.publisher, datePublished: s.publishedAt
  })),
  variableMeasured: Object.keys(METRICS).map(k => ({
    '@type': 'PropertyValue', name: METRICS[k].label, unitText: METRICS[k].unit
  }))
});

function todayPage() {
  return page({
    title: 'T2C — Time to Compute | Which AI infrastructure companies are actually delivering',
    description:
      'Track the journey from secured power to accepted, revenue-producing AI compute. Sourced capacity, ' +
      'contract economics, catalysts and a valuation lab that shows what would need to go right.',
    canonical: SITE + '/',
    body: todayBody(),
    inlineData: { T2C_COMPARE: comparePayload() },
    active: 'today',
    structured: DATASET_LD()
  });
}

function companiesPage() {
  return page({
    title: 'Companies — AI infrastructure delivery tracking | T2C',
    description:
      'Every tracked AI infrastructure operator: capacity switched on, capacity customers have signed ' +
      'for, delivery stage and next catalyst, each figure carrying its source.',
    canonical: SITE + '/companies/',
    body: companiesBody(),
    inlineData: { T2C_COMPARE: comparePayload() },
    active: 'companies'
  });
}

function comparePage() {
  return page({
    title: 'Compare AI infrastructure companies | T2C',
    description:
      'Put up to three AI infrastructure operators side by side on delivered capacity, contracted ' +
      'capacity, catalysts and evidence coverage.',
    canonical: SITE + '/compare/',
    body: compareBody(),
    inlineData: { T2C_COMPARE: comparePayload() },
    active: 'compare'
  });
}

function catalystsPage() {
  return page({
    title: 'AI catalysts — everything that influences the chain | T2C',
    description:
      'What has already moved the AI infrastructure record and what could move it next: every ' +
      'sourced change written as what happened, why it matters and what may happen next, followed ' +
      'by the dated events still ahead.',
    canonical: SITE + '/catalysts/',
    body: catalystsBody(),
    inlineData: { T2C_CATALYSTS: catalystPayload() },
    active: 'catalysts'
  });
}

function sitesPage() {
  return page({
    title: 'Sites — every tracked AI data centre project | T2C',
    description:
      'Every AI infrastructure project tracked at site level: the gates it has passed, the capacity it ' +
      'discloses, the customer that signed for it and the document behind each one.',
    canonical: SITE + '/sites/',
    body: sitesBody(),
    active: 'sites'
  });
}

function sitePage(site) {
  const stage = [...site.path].reverse().find(p => p.status === 'complete');
  return page({
    title: `${site.name} — ${site.companyName} site intelligence | T2C`,
    description:
      `${site.name}, operated by ${site.companyName} in ${site.countryName}. ` +
      `${stage ? `Furthest evidenced stage: ${stage.label}.` : 'No delivery stage evidenced yet.'} ` +
      'Gates, dependencies, contracts and sources for the site.',
    canonical: `${SITE}/sites/${site.slug}/`,
    body: siteBody(site),
    active: 'sites'
  });
}

function chainPage() {
  return page({
    title: 'AI supply chain explorer — trace every dependency | T2C',
    description:
      'Trace AI infrastructure from operator to site to customer, with every relationship carrying ' +
      'the document that evidences it — and a plain statement of where the evidence stops.',
    canonical: SITE + '/chain/',
    body: chainBody(),
    active: 'chain'
  });
}

/**
 * The thirteen explainer routes.
 *
 * One template, one description rule: the page's own definition is the meta
 * description, so what a search engine shows and what the reader lands on are
 * the same sentence. A hand-written variant would drift within a month.
 */
function explainerDetailPage(e) {
  const isStage = e.kind === 'stage';
  return page({
    title: `${e.title} | T2C`,
    description: `${e.definition} In simple terms: ${e.simple}. ` +
      (isStage
        ? 'Where it sits in the AI supply chain, where it gets stuck, and which public companies make it.'
        : 'Part of the photonics stage of the AI supply chain, with sourced component suppliers.'),
    canonical: SITE + explainerHref(e),
    body: explainerPageBody(e.slug),
    active: 'explainers'
  });
}

function explainersPage() {
  return page({
    title: 'Explainers — how AI infrastructure actually gets delivered | T2C',
    description:
      'What the words mean and why the distinctions matter: gross power against critical IT, a target ' +
      'against an actual, and how a promise becomes revenue. Written for readers new to the sector.',
    canonical: SITE + '/explainers/',
    body: explainersBody(),
    active: 'explainers'
  });
}

/** Branded 404. Vercel serves dist/404.html for any unmatched path. */
function notFoundPage() {
  return page({
    title: 'Page not found | T2C — Time to Compute',
    description: 'That page could not be found. Search T2C or jump to companies, megaprojects, ' +
      'the intelligence ledger or the methodology.',
    canonical: SITE + '/404',
    body: notFoundBody(),
    active: 'today'
  });
}

/**
 * AI News: the finite signal product, distinct from the third-party wire below.
 * The two are deliberately different routes because they are different claims —
 * one is what T2C has evidenced, the other is what other people have published.
 */
/**
 * The AI Time Machine.
 *
 * Its own route rather than a modal or a tab, because it is a destination people
 * will link to. It keeps the site shell — header, footer, palette — so it reads
 * as part of TimeToCompute, and mounts its immersive game header inside.
 */
function timeMachinePage() {
  return page({
    title: 'The AI Time Machine — play the AI infrastructure buildout | T2C',
    description:
      'Go back to the moment before the outcome. Five campaigns, ' + chapterCount() +
      ' real turning points, three theses each, primary sources and a hard knowledge cutoff. ' +
      'Educational only, using fictional capital.',
    canonical: SITE + '/time-machine/',
    body: timeMachineBody(),
    active: 'timemachine',
    extraScripts: ['/time-machine.js']
  });
}

/**
 * AI news — the third-party wire.
 *
 * What most people mean by "news": real headlines, pulled live. Deliberately NOT
 * the sourced record, which moved to /catalysts/ where it belongs beside the
 * dated events still ahead of it.
 *
 * /news/ was the wire's original address and stays a working URL, rendering the
 * same page with a canonical pointing here so the two do not compete.
 */
function aiNewsPage({ canonical = '/ai-news/', active = 'ainews' } = {}) {
  return page({
    title: 'AI news — live headlines for AI infrastructure | T2C',
    description:
      'Live third-party headlines for the AI infrastructure operators T2C tracks, plus sector ' +
      'coverage. Shown as published and clearly separated from the sourced delivery record.',
    canonical: SITE + canonical,
    body: newsBody(),
    active
  });
}

/**
 * The wire's original address. Same page, canonicalised to /ai-news/ so the two
 * do not compete — but it keeps its own `active` id, so a reader who arrives on
 * /news/ still sees the utility menu mark where they are.
 */
function newsPage() {
  return aiNewsPage({ canonical: '/ai-news/', active: 'news' });
}

function intelligencePage() {
  return page({
    title: 'Intelligence — every sourced change to the delivery record | T2C',
    description:
      'The full delivery ledger, classified: what advanced, what slipped, which contracts were signed ' +
      'and which targets moved — each entry carrying the document that evidences it.',
    canonical: SITE + '/intelligence/',
    body: intelligenceBody(),
    active: 'intelligence'
  });
}

function labPage() {
  return page({
    title: 'Edge Lab — what must go right? | T2C',
    description:
      'See the capacity, timing, contracts and financing a valuation appears to require, and how much ' +
      'of it the evidence already supports.',
    canonical: SITE + '/lab/',
    body: labBody(),
    extraScripts: ['/lab-engine.js', '/lab-ui.js'],
    active: 'lab'
  });
}

function researchPage() {
  return page({
    title: 'Research — the full evidence base | T2C',
    description:
      'Capacity records, the delivery ledger, contract economics, guidance scorecard, sources and ' +
      'corrections for listed AI infrastructure operators.',
    canonical: SITE + '/research/',
    body: researchBody(BUILD_STAMP),
    active: 'research',
    structured: DATASET_LD()
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

/**
 * The four numbers a reader came for, above everything else.
 *
 * Deliberately not a summary of the page: it is the page's conclusion, stated first.
 * How much is switched on, how much is signed for, how far through delivery the
 * company is, and what happens next — then a route into the Lab where those numbers
 * become a scenario. Anything not disclosed says so; nothing here is inferred.
 */
function investmentSnapshot(c, v) {
  const live = v.measures.energisedCriticalItMw;
  const signed = v.measures.customerContractedMw;
  const canModel = LAB_COVERAGE[c.id]?.ready;
  const nextCat = (CATALYSTS_BY_COMPANY[c.id] || [])
    .filter(x => x.status !== 'completed' && x.status !== 'cancelled')
    .sort((a, b) => String(a.expectedAt || a.expectedWindowStart || '')
      .localeCompare(String(b.expectedAt || b.expectedWindowStart || '')))[0] || null;

  const figure = (m, fallback) => isKnown(m)
    ? `<b>${esc(mw(m.valueMw))}</b>${statusChip(m.valueStatus)}`
    : `<span class="nd">${esc(fallback || NOT_DISCLOSED)}</span>`;

  return `<section class="csnap">
  <div class="csnaphead">
    <div>
      <h1>${esc(c.name)}</h1>
      <div class="csnapsub">
        <span class="mono">${esc(c.ticker)}</span> · ${esc(MODELS[c.model].label)}
        <span class="csnappx mono" data-price="${esc(c.ticker)}"><span class="skel" style="width:70px;height:15px"></span></span>
      </div>
    </div>
    <div class="csnapstate">
      ${v.needsSource ? pill('warn', '◐', 'Some values unsourced') : pill('ok', '●', 'All values sourced')}
      <span class="csnapverified">Last verified ${v.lastVerifiedAt ? esc(date(v.lastVerifiedAt)) : 'never'}</span>
    </div>
  </div>

  <p class="csnaplede">${esc(c.summary)}</p>

  <div class="csnapfigs">
    <div class="csnapfig">
      <dt>Switched on</dt>
      <dd>${figure(live)}</dd>
      <p>Critical IT load live and drawing power.</p>
    </div>
    <div class="csnapfig">
      <dt>Customers have signed for</dt>
      <dd>${figure(signed, c.contractedLabel)}</dd>
      <p>Capacity under a signed customer agreement.</p>
    </div>
    <div class="csnapfig">
      <dt>Delivery stage</dt>
      <dd>${v.stage ? `<b>${esc(v.stage.short)}</b>` : `<span class="nd">${NOT_DISCLOSED}</span>`}</dd>
      <p>The furthest gate with evidence behind it.</p>
    </div>
    <div class="csnapfig">
      <dt>Next catalyst</dt>
      <dd data-nextcat="${esc(c.ticker)}"
          data-nextcat-at="${esc(nextCat?.expectedAt || nextCat?.expectedWindowStart || '')}">${nextCat
        ? `<b>${esc(nextCat.expectedAt ? date(nextCat.expectedAt)
            : windowText(nextCat.expectedWindowStart, nextCat.expectedWindowEnd))}</b>`
        : `<span class="nd">None dated</span>`}</dd>
      <p data-nextcat-title>${nextCat ? esc(nextCat.title) : 'Nothing with a date on record.'}</p>
    </div>
  </div>

  <div class="csnapacts">
    <button class="cta ghost press watchbtn" type="button" data-watch="${esc(c.ticker)}"
      aria-pressed="false" aria-label="Watch ${esc(c.name)}">
      <span class="watchglyph" aria-hidden="true">☆</span> <span class="watchtext">Watch</span>
    </button>
    ${canModel
      ? `<a class="cta primary" href="/lab/?company=${esc(c.id)}">Open in Edge Lab</a>`
      : `<span class="cta disabled" aria-disabled="true"
           title="${esc(LAB_COVERAGE[c.id]?.reason || 'No contract discloses value, megawatts and term together.')}">Not modellable yet</span>`}
    <a class="cta ghost" href="/compare/?c=${esc(c.ticker)}">Compare with peers</a>
    <a class="cta ghost" href="#sources">Read the sources</a>
  </div>
  ${canModel ? '' : `<p class="csnapwhy">${esc(LAB_COVERAGE[c.id]?.reason || '')}</p>`}
</section>`;
}

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

  /* The company's data centres, in full.
     This is where site detail lives now that Megaprojects has left the primary
     navigation. Each card carries the site's capacity with its measurement
     basis, its gates, its dated milestones and its documents — and links to the
     site's own page for anyone who wants only that one. */
  const projects = v.projects.length ? v.projects.map(p => `<article class="projcard">
      <div class="projhead">
        <h3><a class="projlink press" href="/sites/${esc(p.id)}/">${esc(p.name)}</a></h3>
        <span class="projmeta">${esc(COUNTRY_NAMES[p.country] || p.country)}</span>
      </div>
      <div class="projval">
        ${p.capacityMw === null ? `<span class="nd">${NOT_DISCLOSED}</span>` : `<b>${esc(mw(p.capacityMw))}</b>`}
        ${basisChip(p.powerBasis)}${statusChip(p.valueStatus)}${evidenceChip(p.confidence)}
      </div>
      <p class="projnote">${esc(p.note || '')}</p>
      ${gateTrack(p)}
      ${timelinePanel(p)}
      <div class="projfoot">
        <div class="projsrc">${sourceChips(p.sourceIds)}</div>
        <a class="projmore press" href="/sites/${esc(p.id)}/">This site in full
          <span aria-hidden="true">&rarr;</span></a>
      </div>
    </article>`).join('')
    : `<div class="empty"><h3>No site-level data centres recorded</h3><p>This company reports fleet-wide rather than by site, so there is nothing to break out here.</p></div>`;

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

  /* The sections a reader can jump between. Built from what this company actually
     has, so the sticky nav never offers a link to an absent section. */
  const sections = [
    ['passport', 'Passport'],
    ['score', 'Reality Score'],
    ['path', 'Path to billing'],
    ['revenue', 'Revenue'],
    ['story', 'The story'],
    ['record', 'Capacity record'],
    ...(targetRows ? [['targets', 'Targets']] : []),
    ['projects', 'Data centres'],
    ...(contracts.length ? [['contracts', 'Contracts']] : []),
    ['changes', 'Changes'],
    ...(cats.length ? [['catalysts', 'Catalysts']] : []),
    ['yourcall', 'Your call'],
    ['sources', 'Sources']
  ];

  const score = realityScore(c);
  const cpath = companyPath(c.id);
  const reached = cpath.filter(s => s.status === 'complete');

  /* Capacity truth: four figures, each stating its own basis. They are stages of
     different measurements, not one funnel, and are never subtracted. */
  const estimates = companyEstimates(c);
  const truthCell = (metricKey, label, glyph) => {
    const m = v.measures[metricKey];
    return {
      glyph, label,
      value: isKnown(m) ? mw(m.valueMw) : null,
      basis: POWER_BASIS[m.powerBasis]?.short || '—',
      // Only ever offered where the company published nothing.
      estimate: isKnown(m) ? null : (estimates[metricKey] || null)
    };
  };
  const truth = [
    truthCell('securedPowerMw', 'Secured', '⌁'),
    truthCell('customerContractedMw', 'Contracted', '§'),
    truthCell('energisedCriticalItMw', 'Energised', '▣'),
    truthCell('revenueLiveMw', 'Billing', '$')
  ];

  const body = `<div class="shell">
  <nav class="crumb" aria-label="Breadcrumb">
    <a href="/">T2C</a> <span aria-hidden="true">/</span> <a href="/companies/">Companies</a>
    <span aria-hidden="true">/</span> <span aria-current="page">${esc(c.name)}</span>
  </nav>

  ${investmentSnapshot(c, v)}

  <nav class="secnav" aria-label="Sections of this page">
    ${sections.map(([id, label]) => `<a class="press" href="#${id}">${esc(label)}</a>`).join('')}
  </nav>

  ${(() => {
    const pp = passport(c);
    return `<section class="mpanel" id="passport">
      <div class="mhead">
        <span class="mkicker">Supplier passport</span>
        <span class="mnote secondary">What ${esc(c.ticker)} supplies, and how far it has actually got</span>
      </div>
      ${passportHeader(pp)}

      <div class="pp-grid">
        <div class="pp-cell">
          <h3 class="pp-h">Where it sits</h3>
          ${whereItSits(pp)}
        </div>
        <div class="pp-cell">
          <h3 class="pp-h">Bottleneck radar</h3>
          ${bottleneckRadarPanel(pp.radar, c.name)}
        </div>
      </div>

      <div class="pp-cell">
        <h3 class="pp-h">Dependency risk</h3>
        ${dependencyRisk(pp)}
      </div>

      <div class="pp-cell">
        <h3 class="pp-h">What could break the thesis</h3>
        ${thesisRiskPanel(pp.risks)}
      </div>
    </section>`;
  })()}

  <section class="mpanel" id="score">
    <div class="mhead">
      <span class="mkicker">T2C Reality Score</span>
      <span class="mnote secondary">Constructed from sourced records — not a disclosed figure</span>
    </div>
    ${scorePanel(score)}
  </section>

  <section class="mpanel" id="path">
    <div class="mhead">
      <span class="mkicker">Path to billing</span>
      <span class="mnote">${reached.length
        ? `Furthest reached anywhere: ${esc(reached[reached.length - 1].label)}`
        : 'No stage evidenced'}</span>
    </div>
    ${pathTrack(cpath, { idPrefix: `co-${c.slug}` })}
    <p class="mnote">A stage is marked complete when <b>any</b> of ${c.name}'s
      ${v.projects.length} tracked ${v.projects.length === 1 ? 'project' : 'projects'} has reached it —
      this is the furthest the company has got anywhere, not the state of every site.
      ${cpath.some(s => s.projects.length)
        ? 'Open a stage to see which sites evidence it.'
        : ''}</p>
  </section>

  <section class="mpanel" id="capacity">
    <div class="mhead">
      <span class="mkicker">Capacity truth</span>
      <span class="mnote secondary">Four different measurements</span>
    </div>
    ${capacityTruth(truth)}
    <p class="mnote">These are four separate disclosures on different bases, not four stages of one
      funnel. Secured power is measured at the utility connection; the rest are critical IT. They are
      never subtracted from one another.</p>
    ${truth.some(t => t.estimate) ? `<div class="estdetail">${truth.filter(t => t.estimate)
      .map(t => estimateBlock(t.estimate, { label: t.label })).join('')}</div>` : ''}
  </section>

  <section class="mpanel" id="revenue">
    <div class="mhead">
      <span class="mkicker">Revenue calculator</span>
      <span class="mnote secondary">What billing capacity implies, and what it would be worth</span>
    </div>
    <p class="mnote">The megawatts and the revenue rate come from what ${esc(c.name)} has published.
      The multiple does not — it is an opinion, and it is the input that moves the answer most.
      Nothing here is a price target.</p>
    ${(() => {
      const billing = (() => {
        const live = v.measures.revenueLiveMw;
        if (isKnown(live)) return { valueMw: live.valueMw, isEstimate: false };
        const e = estimates.revenueLiveMw;
        return e ? { valueMw: e.valueMw, isEstimate: true } : null;
      })();

      /* Only critical-IT measures are offered. The revenue rate is derived from
         contracts priced per MW of critical IT, so applying it to gross utility
         power would price megawatts that cannot be sold as compute. */
      const CRITICAL_IT = ['revenueLiveMw', 'customerAcceptedMw', 'customerContractedMw', 'energisedCriticalItMw'];
      const seen = new Set();
      const bases = [];
      if (billing) {
        bases.push({
          label: billing.isEstimate ? 'Billing (est)' : 'Billing today',
          valueMw: billing.valueMw,
          definition: 'Capacity the company has disclosed as billing, or T2C\'s estimate from accepted capacity.'
        });
        seen.add(billing.valueMw);
      }
      for (const key of CRITICAL_IT) {
        const m = v.measures[key];
        if (!isKnown(m) || seen.has(m.valueMw)) continue;
        seen.add(m.valueMw);
        bases.push({
          label: METRICS[key].label,
          valueMw: m.valueMw,
          definition: METRICS[key].definition
        });
      }
      bases.sort((a, b) => a.valueMw - b.valueMw);

      return revenueCalculator(c, { billing, rate: estimateRevenueRate(c.id), bases });
    })()}
  </section>

  ${/* storybook() already returns a <section id="story">; wrapping it in another
        element with the same id made the anchor ambiguous. */''}
  ${storybook(v)}

  <section class="panel" id="record">
    <div class="ph"><h2>Capacity record</h2><span class="meta">Every value with its evidence</span></div>
    <div class="tw"><table class="rectable">
      <thead><tr><th scope="col">Measure</th><th scope="col">Value and evidence</th></tr></thead>
      <tbody>${measureRows}</tbody></table></div>
  </section>

  ${targetRows ? `<section class="panel" id="targets">
    <div class="ph"><h2>Targets</h2><span class="meta">Management goals — excluded from all current totals</span></div>
    <div class="tw"><table class="rectable"><tbody>${targetRows}</tbody></table></div>
  </section>` : ''}

  ${historyRows ? `<section class="panel secondary">
    <div class="ph"><h2>Superseded disclosures</h2><span class="meta">Retained and dated, not deleted</span></div>
    <div class="tw"><table class="rectable"><tbody>${historyRows}</tbody></table></div>
  </section>` : ''}

  <section class="panel" id="projects">
    <div class="ph"><h2>Data centres and their gates</h2><span class="meta">${v.projects.length} recorded</span></div>
    <div class="keynote">Every site this company has disclosed, with what each one has actually
      cleared. Gates advance independently: zoning can be granted while environmental approval,
      financing and interconnection all remain outstanding — a single stage label would hide that.</div>
    <div class="projgrid">${projects}</div>
  </section>

  ${contracts.length ? `<section class="mpanel" id="contracts">
    <div class="mhead">
      <span class="mkicker">Contract X-ray</span>
      <span class="mnote">${contracts.length} disclosed agreement${contracts.length === 1 ? '' : 's'}</span>
    </div>
    ${contractXray(contracts)}
    <p class="mnote">Committed value and conditional maximum are shown apart and never added. Where a
      company discloses a ceiling — "up to" — the difference depends on events that have not happened.</p>
  </section>

  <section class="panel secondary">
    <div class="ph"><h2>Contract detail</h2><span class="meta">Every disclosed field</span></div>
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

  <section class="panel" id="changes">
    <div class="ph"><h2>Verified changes</h2><span class="meta">${v.events.length} event${v.events.length === 1 ? '' : 's'}</span></div>
    ${events}
  </section>

  ${cats.length ? `<section class="panel" id="catalysts">
    <div class="ph"><h2>Upcoming catalysts</h2><span class="meta">${cats.length}</span></div>
    <div class="catgrid">${cats.map(cat => `<article class="cat">
      <div class="cathead"><span class="cattick">${esc(cat.ticker)}</span></div>
      <h4>${esc(cat.title)}</h4>
      <p>${esc(cat.description)}</p>
      <div class="ledmeta">${evidenceChip(cat.confidence)}${sourceChips(cat.sourceIds)}</div>
    </article>`).join('')}</div>
  </section>` : ''}

  ${callPanel(c, v)}

  ${PROFILE_BY_ID[c.id] ? aboutPanel(PROFILE_BY_ID[c.id]) : ''}

  <section class="panel" id="sources">
    <div class="ph"><h2>Sources</h2><span class="meta">${sources.length} documents</span></div>
    <div class="pb">${sources.length ? `<ul class="srclist">${sources.map(s => `<li>
      <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>
      <span class="d">${esc(s.publisher)} · ${esc(s.sourceType)} · published ${esc(date(s.publishedAt))} · accessed ${esc(date(s.accessedAt))}${s.isPrimary ? ' · primary' : ''}</span>
      ${s.supportingExcerpt ? `<blockquote>${esc(s.supportingExcerpt)}</blockquote>` : ''}
    </li>`).join('')}</ul>` : `<p class="note">No primary documents linked yet.</p>`}</div>
  </section>
</div>`;

  return page({
    title: `${c.name} (${c.ticker}) — AI infrastructure delivery | T2C`,
    description:
      `${c.name} delivery tracking: secured power, customer-contracted capacity, energised critical IT ` +
      `and accepted megawatts, each figure carrying its measurement basis and primary source.`,
    canonical: `${SITE}/companies/${c.slug}/`,
    body,
    active: 'companies',
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
  const body = `<div class="shell">
  <p class="crumb"><a href="/">T2C</a> / <a href="/companies/">Companies</a> / ${esc(profile.tradingName)}</p>
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
</div>`;

  return page({
    title: `${profile.legalName} (${profile.ticker}) — company profile | T2C`,
    description:
      `${profile.legalName} company profile: leadership, business model, official investor-relations ` +
      `links and verified social accounts. Delivery tracking is not yet maintained for this ticker.`,
    canonical: `${SITE}/companies/${profile.id}/`,
    body,
    active: 'companies',
    structured: [organizationLd(profile)].filter(Boolean)
  });
}

/* ================= methodology ================= */

function methodologyPage() {
  const body = `<div class="shell">
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
      price targets at all, rather than showing an unattributed or placeholder figure. Live provider
      capability is reported on the <a href="/research/#data-health">data health panel</a>; there is no
      analyst-target view to open, because there is no analyst-target data to show.</p>

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

    <h2 id="implied">Implied stages</h2>
    <p>A site cannot be accepted by a customer without having been energised, and it cannot be
      energised without having been built. So where a stage carries <b>no record</b> but a later stage
      is confirmed, T2C marks the earlier one <b>Implied</b>: physically necessary, not separately
      evidenced.</p>
    <p>An implied stage is drawn with a dotted outline, always carries the word "Implied", and states
      which confirmed stage implies it. It has <b>no date and no source</b>, because none exists. It is
      never counted as a confirmed gate, never raises an evidence confidence score, never contributes
      to the Reality Score, and is never treated as the furthest stage a company has reached — those
      all continue to count documents only.</p>
    <p>Two things are deliberately never implied. Nothing <i>after</i> the furthest confirmed stage:
      acceptance does not imply billing, and treating it as though it did would collapse the single
      distinction this site exists to keep. And nothing a company has explicitly reported as not
      started — a gate marked not started sitting before a completed one is a contradiction in the
      record, and it stays visible as one rather than being quietly overwritten.</p>

    <h2 id="chain">How much of the supply chain T2C tracks</h2>
    <p>T2C's proposition is to follow AI from atoms to revenue. It does not yet follow the whole
      distance, and the homepage says which part it follows.</p>
    <p>The chain has seven stages. T2C holds sourced records for the last three —
      <b>AI factory</b>, <b>customer accepted</b> and <b>revenue</b> — covering
      ${COMPANIES.length} operators, ${allSites().length} sites and
      ${aiFactoryGraph().counts.confirmed} confirmed relationships, every one of them citing a document.</p>
    <p>It holds <b>nothing</b> for the first four — materials, wafers, chips and HBM, and photonics.
      Not thin data: none. There are no supplier records, no qualification records, no order or
      shipment records, and no relationship edges of any kind upstream of the data centre.</p>
    <p>Those four stages are nonetheless drawn as <b>having happened</b>, because they did. A site that
      is billing a customer proves that materials were mined, wafers were fabbed, chips were packaged
      and optics were installed — you cannot bill for compute that was never built. Drawing those
      stages as empty would have said the opposite, and that was wrong.</p>
    <p>So each stage carries two facts that are never merged. <b>Did it happen?</b> — implied with
      certainty by the furthest stage T2C can evidence. <b>Does T2C track it?</b> — separately, no. An
      implied stage is lit and marked, and simultaneously says <b>Not tracked by T2C</b>, links nowhere,
      and states what it would take to track it. It never counts towards coverage, never carries a
      date or a source, and never makes anything else look better evidenced than it is.</p>
    <p>The implication runs one way only, upstream. Billing implies the chips existed; nothing implies
      the reverse. A confirmed contract never implies acceptance, and acceptance never implies billing —
      that is the one distinction this site exists to keep.</p>
    <p>Every relationship T2C currently holds is <b>confirmed</b>: the company disclosed it in a primary
      document and that document is linked. The interface also defines <b>ecosystem</b> and
      <b>inferred</b> relationships, drawn with different line styles, so that the day one appears it
      cannot be mistaken for a supply agreement. None is on file today.</p>

    <h2 id="customers">Customers, and what they build</h2>
    <p>The chain ends with a customer paying for megawatts, so the supply-chain explorer maps every
      named counterparty in the contract records to the model families that customer publishes.</p>
    <p>These are <b>two separately sourced facts placed side by side, and deliberately not joined</b>.
      Who bought the capacity comes from the operator's filings. What the customer builds comes from
      the customer's own published model index, linked. No operator or customer in this dataset has
      disclosed which model runs on which site, so T2C never attributes a model to a megawatt, a
      contract or a campus — "Microsoft contracted 200 MW from IREN" and "Microsoft publishes Phi" are
      both true, and the sentence joining them would be an invention.</p>
    <p>Model <b>families</b> are named rather than versions. Frontier releases change monthly; a family
      name is durable, and each links to the developer's own index so the current list comes from the
      source rather than from us.</p>
    <p>Where an operator disclosed a contract but withheld the counterparty — describing only its credit
      quality, as in "high investment-grade hyperscaler" — the contract is shown as withheld and the
      description is quoted verbatim. T2C does not guess which hyperscaler is meant. It would be the
      easiest invention on the page and the hardest for a reader to detect.</p>

    <h2 id="estimates">Estimates, and what makes one allowable</h2>
    <p>T2C's default is to print <b>${NOT_DISCLOSED}</b> and stop. That is correct, and it is also —
      across the tracked set — unhelpful: nobody can judge scale from a column of blanks. So where a
      figure can be <b>derived from figures the company itself published</b>, it is derived, and marked
      as an assumption rather than a disclosure.</p>
    <p>Four rules make that safe rather than sloppy:</p>
    <ul>
      <li><b>Named rules over sourced inputs only.</b> Nothing is hand-typed and nothing comes from a
        peer average. A sector comparable would describe a different business; where a company has
        published nothing to derive from, the figure stays blank.</li>
      <li><b>An estimate can never enter a confirmed total.</b> It carries <code>estimated</code>
        confidence, which every aggregate on this site already excludes.</li>
      <li><b>An estimate never replaces a disclosure.</b> It only fills a gap.</li>
      <li><b>You can switch them off.</b> Use <i>Estimates: shown</i> in the ⋯ menu to see only what
        companies have actually published.</li>
    </ul>
    <p>Estimates are drawn in amber and labelled. Lime is reserved for evidenced progress; an estimate
      does not get to borrow the colour that means confirmed. Today
      ${estimateCoverage().filled} figures across the site are derived this way.</p>
    <div class="tw"><table class="rectable">
      <thead><tr><th scope="col">Rule</th><th scope="col">What is assumed</th></tr></thead>
      <tbody>${Object.values(ESTIMATE_RULES).map(r => `<tr>
        <td><b>${esc(r.label)}</b></td>
        <td class="tleft dim">${esc(r.assumption)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <p>The gross-to-critical-IT divisor of <b>${GROSS_TO_CRITICAL_IT}</b> is the single assumption that
      moves the most numbers. It is a T2C judgement about typical modern data-centre overheads, not a
      company disclosure, and it is defined in one place — <code>src/lib/estimate.js</code> — so
      changing it moves every derived figure on the site together.</p>

    <h2 id="reality-score">The T2C Reality Score</h2>
    <p>Every other figure on this site is disclosed by a company and cited to a document. The Reality
      Score is not: it is <b>constructed by T2C</b> from those disclosures. That makes it the one number
      here that you should check the workings of, so the workings are below.</p>
    <p>It is a weighted mean of four factors, each derived from sourced records. No input is
      hand-assigned, and no factor is scored by opinion.</p>
    <div class="tw"><table class="rectable">
      <thead><tr><th scope="col">Factor</th><th scope="col">Weight</th><th scope="col">What it measures</th></tr></thead>
      <tbody>${FACTORS.map(f => `<tr>
        <td><b>${esc(f.label)}</b></td>
        <td>${Math.round(f.weight * 100)}%</td>
        <td class="tleft dim">${esc(f.definition)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <h3>What it refuses to do</h3>
    <ul>
      <li><b>A missing factor is never a passing one.</b> If a company has published nothing that lets a
        factor be computed, that factor is excluded and the mean is taken over the weight actually
        covered — not filled in with a zero or a default.</li>
      <li><b>The composite is withheld below ${Math.round(MIN_WEIGHT_COVERAGE * 100)}% weight coverage.</b>
        A score resting on one factor out of four is noise wearing a number's clothes. Today that means
        most tracked companies show no score, because only one has reached a milestone it had guided.</li>
      <li><b>A thin sample is declared.</b> "100%" from one observation moves the score exactly as much
        as "100%" from twenty, so where a factor rests on fewer than ${THIN_SAMPLE} observations the
        page says so beside the number.</li>
      <li><b>Landing inside a guided window counts as delivered.</b> Only missing the window is a miss.
        Scoring a window against one of its edges produces artefacts like "early by one day".</li>
    </ul>
    <p>The weights are a judgement — delivering what you promised matters most, and how checkable the
      record is matters next, because an unevidenced record cannot be audited at all. Publishing them
      is the honest way to hold a judgement. They are defined in one place,
      <code>src/lib/score.js</code>, and changing them changes every score on the site at once.</p>
    <p><b>The score is not a rating, a recommendation, or a prediction.</b> It summarises how well a
      company has delivered against its own published promises, on the evidence available today.</p>

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
</div>`;

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
    body: `<div class="shell">
      <p class="crumb"><a href="/">T2C</a> / ${esc(title)}</p>
      <div class="chead"><div><h1>${esc(title)}</h1></div></div>
      <section class="panel"><div class="pb prose">${inner}</div></section>
    </div>`
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
bytes += write('index.html', todayPage());
bytes += write('companies/index.html', companiesPage());
bytes += write('compare/index.html', comparePage());
bytes += write('catalysts/index.html', catalystsPage());
bytes += write('lab/index.html', labPage());
bytes += write('research/index.html', researchPage());
bytes += write('sites/index.html', sitesPage());
bytes += write('intelligence/index.html', intelligencePage());
bytes += write('ai-news/index.html', aiNewsPage());
bytes += write('time-machine/index.html', timeMachinePage());
bytes += write('news/index.html', newsPage());
bytes += write('chain/index.html', chainPage());
bytes += write('explainers/index.html', explainersPage());
for (const { explainer, href } of explainerRoutes()) {
  bytes += write(`${href.slice(1)}index.html`, explainerDetailPage(explainer));
}
bytes += write('404.html', notFoundPage());
const SITES = allSites();
for (const s of SITES) bytes += write(`sites/${s.slug}/index.html`, sitePage(s));
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
  { loc: SITE + '/companies/', priority: '0.9', freq: 'daily' },
  { loc: SITE + '/sites/', priority: '0.9', freq: 'daily' },
  { loc: SITE + '/intelligence/', priority: '0.9', freq: 'daily' },
  { loc: SITE + '/news/', priority: '0.8', freq: 'hourly' },
  { loc: SITE + '/explainers/', priority: '0.7', freq: 'monthly' },
  ...SITES.map(s => ({ loc: `${SITE}/sites/${s.slug}/`, priority: '0.7', freq: 'weekly' })),
  { loc: SITE + '/lab/', priority: '0.9', freq: 'weekly' },
  { loc: SITE + '/catalysts/', priority: '0.8', freq: 'daily' },
  { loc: SITE + '/compare/', priority: '0.7', freq: 'weekly' },
  { loc: SITE + '/research/', priority: '0.8', freq: 'daily' },
  { loc: SITE + '/methodology/', priority: '0.9', freq: 'weekly' },
  ...COMPANIES.map(c => ({ loc: `${SITE}/companies/${c.slug}/`, priority: '0.8', freq: 'weekly' })),
  ...PROFILES.filter(p => p.deliveryTracked === false)
    .map(p => ({ loc: `${SITE}/companies/${p.id}/`, priority: '0.5', freq: 'monthly' })),
  /* The thirteen explainers, generated from the same table as the routes so the
     sitemap cannot fall behind the build. Stage hubs rank above component pages
     because a stage is the destination a reader is more likely to want. */
  { loc: SITE + '/ai-news/', priority: '0.9', freq: 'daily' },
  { loc: SITE + '/time-machine/', priority: '0.8', freq: 'monthly' },
  ...explainerRoutes().map(({ explainer, href }) => ({
    loc: SITE + href,
    priority: explainer.kind === 'stage' ? '0.8' : '0.6',
    freq: 'monthly'
  })),
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
  ['styles.css', 'components.css', 'profile.css', 'shell.css', 'mission.css', 'editorial.css', 'chain.css', 'passport.css', 'explainer.css', 'ainews.css', 'timemachine.css']
    .map(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n'));
fs.cpSync(path.join(ROOT, 'src', 'app.js'), path.join(OUT, 'app.js'));
fs.writeFileSync(path.join(OUT, 'lab-engine.js'), labEngineScript());
fs.cpSync(path.join(ROOT, 'src', 'lab-ui.js'), path.join(OUT, 'lab-ui.js'));
fs.cpSync(path.join(ROOT, 'src', 'timemachine-app.js'), path.join(OUT, 'time-machine.js'));
fs.cpSync(path.join(ROOT, 'assets', 'time-machine'),
  path.join(OUT, 'assets', 'time-machine'), { recursive: true });
fs.cpSync(path.join(ROOT, 'Logo'), path.join(OUT, 'Logo'), { recursive: true });

/* Illustrative campus artwork, copied under a name that says what it is: a
   generic illustration, not imagery of any tracked site.

   The source renders are far larger than anything the page displays — the
   campus is 1536px wide for a slot that never exceeds ~940px, and the vehicle
   sprite is 384px wide for a 26px marker. Shipping them untouched put 2.2 MB of
   images on the homepage. Each is resized to twice its largest display size (so
   it stays sharp on a 2× screen) and written as both WebP and PNG.

   If sharp cannot load — a native module on a build image we do not control —
   the originals are copied unchanged and the build carries on. The markup uses
   <picture>, so a missing WebP silently falls back to the PNG. A slow homepage
   is a worse outcome than a fast one; a failed deploy is worse than both. */
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

const IMAGES = [
  {
    // The "black" variant has a near-black surround; the other has a
    // checkerboard baked into its pixels and carries no alpha channel.
    /* 1536 is the source's own native width. It was being emitted at 1200 and
       then displayed in a 1230px box, so every screen at 1366px or wider was
       enlarging it — 2.05x on a 2x display. Emitting native costs a few KB and
       removes the softness up to the limit of the art. */
    from: path.join(ROOT, 'Sprites', 'datecenter', 'datacenterdrivableblack.png'),
    name: 'campus', width: 1536, pngWidth: 1200, quality: 78
  },
  {
    /* The full 8-direction sheet, not a single sprite. The vehicle follows the
       perimeter road, so it has to face the way it is travelling; shipping only
       ev-east.png is what made it look like it was driving backwards.
       1536x1024, 4 columns x 2 rows. Quartered, each cell is 96x128. */
    from: path.join(ROOT, 'Sprites', 'teslasprite', 'T2C_EV_Vehicle_Pack_v1',
      't2c-ev-spritesheet-8-direction.png'),
    name: 'vehicles', width: 384, quality: 82
  },
  {
    /* Publisher mark for Yahoo stories. Every Yahoo item in the feed carries the
       same generic yimg placeholder, so identical stretched thumbnails were
       loading from an external host.

       Letterboxed to 16:5, not 16:9. Two in five stories in this feed are Yahoo,
       and a full-height white tile repeated forty times down a dark page is
       louder than the placeholder it replaced. A short band reads as a publisher
       credit rather than as artwork for the story, which is what it actually is. */
    from: path.join(ROOT, 'Images', 'Yahoo', 'yahoo-news7577.jpg'),
    name: 'news-yahoo', width: 480, height: 150, fit: 'contain',
    background: '#ffffff', quality: 88
  }
];

let sharp = null;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.warn('  warn: sharp unavailable — shipping full-size images. Run `npm install` to fix.');
}

/* Editorial illustrations from the asset pack.
   The WebP variants ship as supplied — they are already 28–212 KB. The PNG
   fallbacks are 1.8–2.8 MB each, which is far too heavy for a file only reached
   by a browser without WebP, so each is re-encoded at the largest width the
   layout ever uses. Icons are SVG and ship verbatim. */
fs.mkdirSync(path.join(OUT, 'assets', 't2c', 'images'), { recursive: true });
fs.cpSync(path.join(ROOT, 'assets', 't2c', 'icons'),
  path.join(OUT, 'assets', 't2c', 'icons'), { recursive: true });

/* The game's own integrity gate. The check that matters most is no future
   leakage: a briefing source published after its own knowledge cutoff would hand
   the player evidence the historical decision-maker could not have had, which is
   the one way this game could cheat without looking broken. */
{
  const errs = checkTimeMachine();
  if (errs.length) {
    console.error(`  FAIL: AI Time Machine data has ${errs.length} problem(s):`);
    for (const e of errs.slice(0, 12)) console.error(`    ${e}`);
    process.exit(1);
  }
  console.log(`  time machine: ${CAMPAIGNS.length} campaigns, ${chapterCount()} chapters, no future leakage`);
}

/* Every declared asset must exist before anything can reference it.
   `data/artpack.js` is the manifest; this proves the manifest matches the disk.
   A missing derivative is invisible in code review and shows up as a hole in a
   hexagon, so it fails the build rather than the page. */
{
  const missing = [];
  for (const a of ART) {
    for (const w of a.widths) {
      const rel = `${a.base}-${w}.webp`.replace(/^\//, '');
      if (!fs.existsSync(path.join(ROOT, rel))) missing.push(rel);
    }
    if (a.fallbackWidth) {
      const rel = `${a.base}-${a.fallbackWidth}.png`.replace(/^\//, '');
      if (!fs.existsSync(path.join(ROOT, rel))) missing.push(rel);
    }
  }
  if (missing.length) {
    console.error(`  FAIL: ${missing.length} declared asset(s) missing from disk:`);
    for (const m of missing.slice(0, 10)) console.error(`    ${m}`);
    process.exit(1);
  }
  console.log(`  art pack: ${ART.length} assets declared, all present`);
}

/* Flagship pack: vectors, motion, and the responsive stage cutouts. The 1254px
   raster masters are NOT shipped — nothing displays a stage above 180px, so
   16 MB of masters would be downloaded by nobody. They stay in the pack for the
   large detail views described in ASSET_MANIFEST.md, if one is ever built. */
for (const d of ['svg', 'animated']) {
  fs.cpSync(path.join(ROOT, 'assets', 't2c', d), path.join(OUT, 'assets', 't2c', d), { recursive: true });
}
fs.mkdirSync(path.join(OUT, 'assets', 't2c', 'responsive'), { recursive: true });
let stageBytes = 0;
for (const s of STAGES) {
  for (const w of [192, 384, 768]) {
    const rel = `${s.asset}-${w}.webp`;
    fs.cpSync(path.join(ROOT, 'assets', 't2c', 'responsive', rel),
      path.join(OUT, 'assets', 't2c', 'responsive', rel));
    stageBytes += fs.statSync(path.join(OUT, 'assets', 't2c', 'responsive', rel)).size;
  }
  // The 1280 PNG is the transparent fallback; a stage node never exceeds 180px,
  // so it is re-encoded down rather than shipped at full size.
  const srcPng = path.join(ROOT, 'assets', 't2c', 'responsive', `${s.asset}-1280.png`);
  const outPng = path.join(OUT, 'assets', 't2c', 'responsive', `${s.asset}-1280.png`);
  if (sharp) {
    await sharp(srcPng).resize({ width: 512, withoutEnlargement: true })
      .png({ compressionLevel: 9 }).toFile(outPng);
  } else {
    fs.cpSync(srcPng, outPng);
  }
  stageBytes += fs.statSync(outPng).size;
}
console.log(`  chain stages: ${STAGES.length} cutouts + vectors → ${(stageBytes / 1024).toFixed(0)} KB`);

/* Photonics component cutouts and the news editorial raster.
   Shipped by walking the manifest rather than a hand-kept list: the explainer
   routes are generated from the same table, so a component added there cannot
   ship without its artwork. The 1024px derivative is included because a
   component hero displays at up to 480 CSS px, which is 960px on a 2x screen. */
let partBytes = 0;
for (const a of ART) {
  if (a.base.startsWith('/assets/t2c/responsive/stage-')) continue;  // already copied above
  const dir = path.join(OUT, path.dirname(a.base).replace(/^\//, ''));
  fs.mkdirSync(dir, { recursive: true });
  for (const w of a.widths) {
    const rel = `${a.base}-${w}.webp`.replace(/^\//, '');
    fs.cpSync(path.join(ROOT, rel), path.join(OUT, rel));
    partBytes += fs.statSync(path.join(OUT, rel)).size;
  }
}
console.log(`  photonics + editorial: ${ART.length - STAGES.length} assets → ${(partBytes / 1024).toFixed(0)} KB`);

let packBytes = 0;
for (const a of ASSETS) {
  for (const w of ASSET_WIDTHS) {
    const rel = `${a.id}-${w}.webp`;
    fs.cpSync(path.join(ROOT, 'assets', 't2c', 'images', rel),
      path.join(OUT, 'assets', 't2c', 'images', rel));
    packBytes += fs.statSync(path.join(OUT, 'assets', 't2c', 'images', rel)).size;
  }
  const srcPng = path.join(ROOT, 'assets', 't2c', 'images', `${a.id}.png`);
  const outPng = path.join(OUT, 'assets', 't2c', 'images', `${a.id}.png`);
  if (sharp) {
    // A native-width WebP: the pack's largest derivative is 1600, which is
    // smaller than a full-bleed hero's box on any 2x display from 1366px up.
    await sharp(srcPng).resize({ width: ASSET_NATIVE_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(OUT, 'assets', 't2c', 'images', `${a.id}-${ASSET_NATIVE_WIDTH}.webp`));
    packBytes += fs.statSync(path.join(OUT, 'assets', 't2c', 'images', `${a.id}-${ASSET_NATIVE_WIDTH}.webp`)).size;

    await sharp(srcPng).resize({ width: 1600, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true }).toFile(outPng);
  } else {
    fs.cpSync(srcPng, outPng);
  }
  packBytes += fs.statSync(outPng).size;
}
console.log(`  editorial pack: ${ASSETS.length} images + icons → ${(packBytes / 1024).toFixed(0)} KB`);

let imageBytes = 0;
for (const img of IMAGES) {
  const png = path.join(OUT, 'assets', `${img.name}.png`);
  const webp = path.join(OUT, 'assets', `${img.name}.webp`);

  if (!sharp) {
    fs.cpSync(img.from, png);
    imageBytes += fs.statSync(png).size;
    continue;
  }

  // `withoutEnlargement` keeps a source smaller than the target untouched rather
  // than upscaling it into a blurrier, larger file. An image given a height and
  // `fit: contain` is letterboxed onto its own background instead, so its
  // proportions survive a crop-to-fill container.
  const resized = sharp(img.from).resize(
    img.height
      ? { width: img.width, height: img.height, fit: img.fit || 'contain', background: img.background || '#000000' }
      : { width: img.width, withoutEnlargement: true });
  await resized.clone().webp({ quality: img.quality }).toFile(webp);

  /* The PNG is only reached by a browser with no WebP support, which in
     practice is an old one on a low-density screen. It is capped below the
     WebP's native width so the fallback does not cost more than the real path. */
  await sharp(img.from)
    .resize(img.height
      ? { width: img.width, height: img.height, fit: img.fit || 'contain', background: img.background || '#000000' }
      : { width: Math.min(img.width, img.pngWidth || img.width), withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true }).toFile(png);
  imageBytes += fs.statSync(webp).size + fs.statSync(png).size;

  const before = fs.statSync(img.from).size;
  console.log(`  ${img.name}: ${(before / 1024).toFixed(0)} KB → ` +
    `${(fs.statSync(webp).size / 1024).toFixed(0)} KB webp, ` +
    `${(fs.statSync(png).size / 1024).toFixed(0)} KB png`);
}

const pageCount = fs.readdirSync(OUT, { recursive: true }).filter(f => String(f).endsWith('index.html')).length;
console.log(`✓ built ${pageCount} pages + robots.txt + sitemap.xml (${(bytes / 1024).toFixed(0)} KB) → dist/`);
