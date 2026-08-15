/**
 * Static site build.
 *
 * Generates every page from the records in /data, so a figure exists in exactly one
 * place and the homepage, capacity table and company pages cannot drift apart.
 * Output goes to dist/; /api stays at the repo root as Vercel serverless functions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { STAGES, METRICS, CONFIDENCE, MODELS } from './data/schema.js';
import { COMPANIES, WATCH_TICKERS, TICKER_NAMES } from './data/companies.js';
import { CONTRACTS_BY_COMPANY, COUNTRY_NAMES } from './data/projects.js';
import { CORRECTIONS } from './data/events.js';
import { companyView, headlineKpis, ledger, totalFor, isKnown } from './src/lib/compute.js';
import { runChecks } from './src/lib/validate.js';
import { esc, mw, pct, date, hostOf, NOT_DISCLOSED } from './src/lib/format.js';
import {
  kpiStrip, kpiCards, ledgerPanel, capacityTable, contractsTable,
  countryPanel, contributionPanel, deliveryKey, stageKey, stageTrack,
  confidencePill, sourceChip, statusPill
} from './src/ui.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://timetocompute.com';
const BUILD_DATE = new Date().toISOString().slice(0, 10);
/** Lets a deployed page be identified, so a failed deploy is not mistaken for a live one. */
const BUILD_STAMP = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

/* ---------- gate the build on data integrity ---------- */
const checks = runChecks();
for (const w of checks.warnings) console.warn('  warn: ' + w);
if (!checks.ok) {
  console.error('\nData validation FAILED — build aborted:\n' + checks.errors.map(e => '  ✗ ' + e).join('\n'));
  process.exit(1);
}
console.log(`✓ data validation passed (${checks.warnings.length} warnings)`);

/* ---------- shell ---------- */
const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'ledger', label: 'Delivery ledger' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'filings', label: 'Filings' },
  { id: 'capacity', label: 'Capacity' },
  { id: 'odds', label: 'Odds' }
];

function head({ title, description, canonical, ogImage = '/Logo/logo-header.png', structured = null }) {
  return `<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(canonical)}" />
<meta name="robots" content="index,follow" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="T2C — Time to Compute" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:image" content="${esc(SITE + ogImage)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(SITE + ogImage)}" />
<meta name="theme-color" content="#0B0B0C" />
<meta name="t2c-build" content="${BUILD_STAMP}" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/Logo/logo-header.png" />
<link rel="stylesheet" href="/styles.css" />
${structured ? `<script type="application/ld+json">${JSON.stringify(structured)}</script>` : ''}`;
}

function header(active) {
  return `<header class="top">
  <div class="wrap topin">
    <a class="logo" href="/"><img src="/Logo/logo-header.png" width="514" height="120" alt="T2C — Time to Compute" /></a>
    <div class="right">
      <span class="conn" id="cQuote"><i aria-hidden="true"></i> Prices</span>
      <span class="conn" id="cNews"><i aria-hidden="true"></i> News</span>
      <span class="conn" id="cFilings"><i aria-hidden="true"></i> Filings</span>
      <button class="hbtn" id="refreshBtn" type="button">Refresh</button>
      <button class="hbtn" id="themeBtn" type="button" aria-label="Switch to light theme">Light</button>
    </div>
  </div>
</header>`;
}

/** Nav renders as links on sub-pages and as tabs on the homepage. */
function nav(mode, active = 'overview') {
  const items = NAV.map(n => mode === 'tabs'
    ? `<button class="tab" role="tab" type="button" id="tab-${n.id}" data-tab="${n.id}"
         aria-controls="view-${n.id}" aria-selected="${n.id === active}">${esc(n.label)}</button>`
    : `<a class="tab" href="/#${n.id}">${esc(n.label)}</a>`
  ).join('');
  const methodology = mode === 'tabs'
    ? `<a class="tab" href="/methodology/">Methodology</a>`
    : `<a class="tab${active === 'methodology' ? ' active' : ''}" href="/methodology/">Methodology</a>`;
  return `<nav class="nav" aria-label="Primary"><div class="wrap navin"${mode === 'tabs' ? ' role="tablist"' : ''}>${items}${methodology}</div></nav>`;
}

function footer() {
  const k = headlineKpis();
  return `<footer class="foot">
  <div class="wrap footin">
    <div class="footmark">
      <img src="/Logo/logo-header.png" alt="" />
      <p>Tracking the journey from secured power to customer-accepted, invoicing AI compute.</p>
    </div>
    <div class="footgrid">
      <div class="footcol"><h4>Tracked now</h4><ul>
        ${k.map(x => `<li><b>${esc(mw(x.total))}</b> ${esc(x.label.toLowerCase())}</li>`).join('')}
      </ul></div>
      <div class="footcol"><h4>Understand the data</h4><ul>
        <li><a href="/methodology/">Methodology</a></li>
        <li><a href="/methodology/#sources">Sources</a></li>
        <li><a href="/methodology/#corrections">Corrections</a></li>
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
      <span>For information only — not investment advice. Figures are compiled from public filings and may lag or contain errors.</span>
      <span class="sep">© 2026 T2C — Time to Compute</span>
    </div>
  </div>
</footer>`;
}

function page({ title, description, canonical, body, active = 'overview', navMode = 'links', structured = null }) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
${head({ title, description, canonical, structured })}
</head>
<body>
${header(active)}
${body}
${footer()}
<script type="application/json" id="t2c-config">${JSON.stringify({
    tickers: WATCH_TICKERS, names: TICKER_NAMES
  })}</script>
<script src="/app.js" defer></script>
</body>
</html>`;
}

/* ---------- homepage ---------- */
function heroSection() {
  return `<section class="hero">
  <canvas id="flow" aria-hidden="true"></canvas>
  <div class="wrap heroin">
    <h1 class="tagline">The market prices the press release. We measure the <u>delivery</u>.</h1>
    <p class="taglinesub">Track the journey from secured power to customer-accepted, invoicing AI compute.</p>
    <div class="heroacts">
      <a class="cta primary" href="#ledger">Explore the delivery ledger</a>
      <a class="cta ghost" href="/methodology/">View methodology</a>
    </div>
  </div>
  <div class="wrap"><div class="kstrip">${kpiStrip()}</div></div>
  <div class="tape"><div class="tapein" id="tape"></div></div>
</section>`;
}

function homepage() {
  const views = {
    overview: `
      <section class="panel">
        <div class="ph"><h2>Where the megawatts actually are</h2>
          <span class="meta">Every figure sums the same records</span></div>
        ${kpiCards()}
        <div class="stamp">Secured power is supply contracted from utilities and landlords.
          Customer-contracted is demand signed by a paying customer. They are different measurements
          and are never added together. Undisclosed figures are excluded, not treated as zero —
          see <a href="/methodology/">methodology</a>.</div>
      </section>
      ${ledgerPanel(4, { heading: 'Latest verified changes' })}
      <div class="grid g23">${countryPanel()}${contributionPanel()}</div>
      <section class="panel">
        <div class="ph"><h2>Watchlist</h2><span class="meta" id="quoteMeta">—</span></div>
        <div id="quoteWrap"></div>
      </section>
      <section class="panel">
        <div class="ph"><h2>Latest intelligence</h2><span class="meta">Live feed</span></div>
        <div id="newsMini"></div>
      </section>`,

    ledger: `
      ${ledgerPanel(null, { heading: 'Delivery ledger' })}
      <section class="panel">
        <div class="ph"><h2>What the stages mean</h2><span class="meta">Ordered pipeline</span></div>
        ${stageKey()}
      </section>`,

    intelligence: `
      <section class="panel">
        <div class="ph"><h2>Intelligence</h2><span class="meta" id="newsMeta">—</span></div>
        <div class="filters" id="newsFilters"></div>
        <div id="newsHero"></div>
        <div id="newsList"></div>
        <div class="stamp">Headlines link to the original publisher and open in a new tab. T2C does not
          summarise or draw a materiality conclusion from a story it has not linked.</div>
      </section>`,

    filings: `
      <section class="panel">
        <div class="ph"><h2>SEC filings</h2><span class="meta" id="filingMeta">—</span></div>
        <div class="keynote">8-K filings are where delivery milestones, new contracts and capacity
          acquisitions get confirmed first, usually ahead of the news.</div>
        <div id="filingList"></div>
      </section>`,

    capacity: `
      <section class="panel">
        <div class="ph"><h2>Capacity by company</h2><span class="meta">Compiled from filings</span></div>
        ${deliveryKey()}
        <div class="keynote">Every figure carries its own confidence and source. A value marked
          <b>source required</b> was carried over from an earlier compile whose document was not recorded —
          it is shown so it can be challenged, not because it is trusted.</div>
        <div class="scrollnote">Scroll the table sideways for all columns →</div>
        ${capacityTable()}
        <div class="stamp">${NOT_DISCLOSED} means the company has not published the figure. It never means zero.
          Conversion is energised critical IT divided by secured power, and is only shown when both are disclosed.</div>
      </section>
      <section class="panel">
        <div class="ph"><h2>Contract economics</h2><span class="meta">Compiled from filings</span></div>
        <div class="scrollnote">Scroll the table sideways for all columns →</div>
        ${contractsTable()}
        <div class="stamp">Per-megawatt figures are <b>not comparable across business models</b>. Renting powered
          buildings earns a few million per megawatt; buying the chips and selling finished compute earns far
          more, and costs far more. See <a href="/methodology/">methodology</a>.</div>
      </section>`,

    odds: oddsView()
  };

  const body = `${heroSection()}
${nav('tabs', 'overview')}
<main class="wrap">
${NAV.map(n => `<div id="view-${n.id}" role="tabpanel" aria-labelledby="tab-${n.id}"${n.id === 'overview' ? '' : ' class="hide"'}>${views[n.id]}</div>`).join('\n')}
</main>`;

  return page({
    title: 'T2C — Time to Compute | AI infrastructure delivery tracking',
    description:
      'Track the journey from secured power to customer-accepted, invoicing AI compute. Sourced capacity, ' +
      'contract economics and a verified delivery ledger for listed AI infrastructure operators.',
    canonical: SITE + '/',
    body,
    navMode: 'tabs',
    structured: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'T2C — Time to Compute',
      url: SITE + '/',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      description:
        'AI infrastructure delivery intelligence: secured power, customer-contracted capacity, ' +
        'energisation and acceptance for listed operators, each figure carrying its source.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
    }
  });
}

function oddsView() {
  return `<div class="grid g32">
    <section class="panel">
      <div class="ph"><h2>Inputs</h2><span class="meta"><button class="resync" id="resyncBtn" type="button">Reset to live</button></span></div>
      <div class="pb">
        <div class="frow">
          <div class="field"><label for="inTicker">Company<span class="hint">Switching resets every box below</span></label><select id="inTicker" name="inTicker"></select></div>
          <div class="field"><label for="inSpot">Price now <span class="hint" id="spotTag"></span></label><input id="inSpot" name="inSpot" type="number" step="0.01" inputmode="decimal" /></div>
          <div class="field"><label for="inTarget">Target<span class="hint">Price you want</span></label><input id="inTarget" name="inTarget" type="number" step="0.5" inputmode="decimal" /></div>
          <div class="field"><label for="inDate">By date<span class="hint">Deadline</span></label><input id="inDate" name="inDate" type="date" /></div>
          <div class="field"><label for="inVol">Volatility<span class="hint" id="volTag">Yearly swing %</span></label><input id="inVol" name="inVol" type="number" step="5" inputmode="decimal" /></div>
          <div class="field"><label for="inDrift">Drift<span class="hint">Your view, %/yr</span></label><input id="inDrift" name="inDrift" type="number" step="5" value="0" inputmode="decimal" /></div>
        </div>
      </div>
      <div class="tw"><table id="oddsTable"></table></div>
    </section>
    <section class="panel">
      <div class="ph"><h2 id="qLine">Odds</h2><span class="meta" id="oddsTicker"></span></div>
      <div class="pb">
        <div class="big" id="bigOdds">—</div>
        <div class="pbar"><i id="oddsBar"></i></div>
        <p class="note" style="margin-top:13px" id="oddsPlain"></p>
      </div>
      <div style="padding:0 16px 16px">
        <svg id="distChart" viewBox="0 0 720 240" role="img" aria-labelledby="distSummary"></svg>
        <p id="distSummary" class="stamp" style="border-top:none;padding-left:0;padding-right:0"></p>
      </div>
    </section>
  </div>
  <div class="grid g11">
    <section class="panel">
      <div class="ph"><h2>How it reached that number</h2><span class="meta">Every step shown</span></div>
      <div class="pb steps" id="stepsBox"></div>
    </section>
    <section class="panel">
      <div class="ph"><h2>What the terms mean</h2><span class="meta">Select any word</span></div>
      <div class="terms" id="termChips"></div>
      <div id="termDef"></div>
      <div class="pb"><p class="note"><b>The lesson worth taking away.</b> Change the volatility box and watch
        the answer move. Then change drift by the same amount and watch how little it moves. For a share this
        jumpy, how far it swings matters far more than which way you think it is heading.</p></div>
    </section>
  </div>
  <section class="panel"><div class="stamp">These odds are a lognormal maths exercise on your own inputs.
    They are not a forecast, not derived from options pricing, and not investment advice.</div></section>`;
}

/* ---------- company pages ---------- */
function companyPage(c) {
  const v = companyView(c);
  const contracts = CONTRACTS_BY_COMPANY[c.id] || [];
  const order = ['securedPowerMw', 'customerContractedMw', 'constructionMw', 'energisedCriticalItMw', 'customerAcceptedMw', 'revenueLiveMw'];

  const measureRows = order.map(k => {
    const m = v.measures[k];
    return `<tr>
      <td>${esc(METRICS[k].label)}<span class="sub">${esc(METRICS[k].definition)}</span></td>
      <td>${isKnown(m) ? mw(m.value) : `<span class="nd">${NOT_DISCLOSED}</span>`}</td>
      <td style="text-align:left">${confidencePill(m.confidence)}</td>
      <td style="text-align:left">${sourceChip(m) || '<span class="nd">—</span>'}</td>
      <td>${m.effectiveDate ? esc(date(m.effectiveDate)) : `<span class="nd">—</span>`}</td>
      <td>${m.verifiedAt ? esc(date(m.verifiedAt)) : `<span class="nd">not verified</span>`}</td>
    </tr>`;
  }).join('');

  const projects = v.projects.length ? `<div class="tw"><table>
    <thead><tr><th scope="col">Project</th><th scope="col">Country</th><th scope="col">Capacity</th>
      <th scope="col">Stage</th><th scope="col">Current target</th><th scope="col">Actual</th></tr></thead>
    <tbody>${v.projects.map(p => `<tr>
      <td>${esc(p.name)}<span class="sub">${esc(p.note || '')}</span></td>
      <td style="text-align:left">${esc(COUNTRY_NAMES[p.country] || p.country)}</td>
      <td>${p.capacityMw === null ? `<span class="nd">${NOT_DISCLOSED}</span>` : mw(p.capacityMw)}</td>
      <td style="text-align:left">${esc(STAGES.find(s => s.id === p.stage)?.label || NOT_DISCLOSED)}</td>
      <td>${p.currentTarget ? esc(date(p.currentTarget)) : `<span class="nd">${NOT_DISCLOSED}</span>`}</td>
      <td>${p.actual ? esc(date(p.actual)) : `<span class="nd">${NOT_DISCLOSED}</span>`}</td>
    </tr>`).join('')}</tbody></table></div>`
    : `<div class="empty"><h3>No projects recorded</h3><p>This company reports fleet-wide rather than by site.</p></div>`;

  const events = v.events.length
    ? `<div class="led">${v.events.map(e => `<div class="ledrow">
        <div class="when"><b>${esc(date(e.effectiveDate))}</b>announced ${esc(date(e.announcedDate))}</div>
        <div class="what"><h4>${esc(e.summary)}</h4><p>${esc(e.implication || '')}</p>
          <div class="ledmeta">${confidencePill(e.confidence)}
            ${e.sourceUrl ? `<a class="src" href="${esc(e.sourceUrl)}" target="_blank" rel="noopener">↗ ${esc(hostOf(e.sourceUrl))}</a>` : ''}</div></div>
        <div class="delta">${e.previousValue === null ? NOT_DISCLOSED : mw(e.previousValue)}<span class="arrow">→</span>${e.newValue === null ? NOT_DISCLOSED : (e.unit === '$bn' ? '$' + e.newValue + 'bn' : mw(e.newValue))}</div>
      </div>`).join('')}</div>`
    : `<div class="empty"><h3>No verified milestone history yet</h3>
       <p>Nothing is reconstructed. Entries appear here as filings and releases land.</p></div>`;

  const body = `<main class="wrap">
  <p class="crumb"><a href="/">T2C</a> / <a href="/#capacity">Companies</a> / ${esc(c.name)}</p>
  <div class="chead">
    <div>
      <h1>${esc(c.name)}</h1>
      <div class="tick">${esc(c.ticker)} · ${esc(MODELS[c.model].label)}</div>
    </div>
    <div class="right">
      ${v.needsSource ? statusPill('warn', '◐', 'Some values unsourced') : statusPill('ok', '●', 'All values sourced')}
      <div class="tick" style="margin-top:6px">Last verified ${v.lastVerifiedAt ? esc(date(v.lastVerifiedAt)) : 'never'}</div>
    </div>
  </div>
  <p class="note" style="max-width:70ch;margin-bottom:16px">${esc(c.summary)}</p>

  <section class="panel">
    <div class="ph"><h2>Delivery stage</h2><span class="meta">${v.stage ? esc(v.stage.label) : NOT_DISCLOSED}</span></div>
    <div class="pb">
      ${stageTrack(v.stage ? v.stage.id : null)}
      <p class="note" style="margin-top:13px">
        ${v.stage ? `Furthest evidenced stage is <b>${esc(v.stage.label)}</b>.` : 'No stage has been evidenced yet.'}
        ${v.next ? ` Next milestone is <b>${esc(v.next.label)}</b>.` : ''}
        ${v.conversion !== null ? ` Delivery conversion is <b>${pct(v.conversion)}</b> of secured power energised.` : ` Delivery conversion is ${NOT_DISCLOSED} — it needs both secured and energised figures.`}
      </p>
    </div>
  </section>

  <section class="panel">
    <div class="ph"><h2>Capacity record</h2><span class="meta">Every value with its evidence</span></div>
    <div class="scrollnote">Scroll sideways for source and verification columns →</div>
    <div class="tw"><table>
      <thead><tr><th scope="col">Measure</th><th scope="col">Value</th><th scope="col">Confidence</th>
        <th scope="col">Source</th><th scope="col">As of</th><th scope="col">Verified</th></tr></thead>
      <tbody>${measureRows}</tbody></table></div>
  </section>

  <section class="panel">
    <div class="ph"><h2>Projects</h2><span class="meta">${v.projects.length} recorded</span></div>
    ${projects}
  </section>

  ${contracts.length ? `<section class="panel">
    <div class="ph"><h2>Major contracts</h2><span class="meta">${contracts.length}</span></div>
    <div class="tw"><table>
      <thead><tr><th scope="col">Customer</th><th scope="col">MW</th><th scope="col">Value</th>
        <th scope="col">Delivered</th><th scope="col">Terms</th></tr></thead>
      <tbody>${contracts.map(k => `<tr>
        <td>${esc(k.customer)}</td>
        <td>${k.mw ?? `<span class="nd">${NOT_DISCLOSED}</span>`}</td>
        <td>${k.valueBn != null ? '$' + k.valueBn + 'bn' : `<span class="nd">${NOT_DISCLOSED}</span>`}</td>
        <td>${k.deliveredMw != null ? k.deliveredMw + ' MW' : `<span class="nd">${NOT_DISCLOSED}</span>`}</td>
        <td style="text-align:left;font-family:'Archivo',sans-serif;font-weight:400;font-size:12.5px;color:var(--dim)">${esc(k.terms)}</td>
      </tr>`).join('')}</tbody></table></div>
  </section>` : ''}

  <section class="panel">
    <div class="ph"><h2>Verified changes</h2><span class="meta">${v.events.length} event${v.events.length === 1 ? '' : 's'}</span></div>
    ${events}
  </section>

  <section class="panel">
    <div class="ph"><h2>Sources</h2><span class="meta">${v.sources.length} linked</span></div>
    <div class="pb">${v.sources.length ? `<ul class="srclist">${v.sources.map(s =>
      `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>
        <span class="d">${esc(hostOf(s.url))} · published ${esc(date(s.publishedDate))}</span></li>`).join('')}</ul>`
      : `<p class="note">No primary documents linked yet. Every figure above is marked accordingly.</p>`}</div>
  </section>
</main>`;

  return page({
    title: `${c.name} (${c.ticker}) — AI infrastructure delivery | T2C`,
    description:
      `${c.name} AI infrastructure delivery tracking: secured power, customer-contracted capacity, ` +
      `energised megawatts and verified milestone changes, each figure carrying its source.`,
    canonical: `${SITE}/companies/${c.slug}/`,
    body,
    navMode: 'links',
    structured: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `${c.name} AI infrastructure delivery record`,
      description: `Sourced capacity and delivery-stage record for ${c.name} (${c.ticker}).`,
      url: `${SITE}/companies/${c.slug}/`,
      creator: { '@type': 'Organization', name: 'T2C — Time to Compute', url: SITE },
      isAccessibleForFree: true,
      variableMeasured: Object.keys(METRICS).map(k => ({
        '@type': 'PropertyValue', name: METRICS[k].label, unitText: METRICS[k].unit
      }))
    }
  });
}

/* ---------- methodology ---------- */
function methodologyPage() {
  const body = `<main class="wrap">
  <p class="crumb"><a href="/">T2C</a> / Methodology</p>
  <div class="chead"><div><h1>Methodology</h1>
    <div class="tick">How every figure on this site is defined, sourced and corrected</div></div></div>

  <section class="panel"><div class="pb prose">
    <h2 id="categories">What each megawatt category means</h2>
    <p>A megawatt is not a megawatt. The single most common error in AI infrastructure coverage is
      treating power a company has secured from a utility as though it were compute a customer has
      agreed to pay for. T2C keeps those apart at the data level — they are different fields, they are
      never added together, and no total on this site mixes them.</p>
  </div>
  <div class="tw"><table class="deftable">
    <thead><tr><th scope="col">Field</th><th scope="col">Meaning</th></tr></thead>
    <tbody>${Object.entries(METRICS).map(([k, m]) =>
      `<tr><td>${esc(k)}</td><td><b>${esc(m.label)}</b> — ${esc(m.definition)}</td></tr>`).join('')}</tbody>
  </table></div></section>

  <section class="panel">
    <div class="ph"><h2>The delivery pipeline</h2><span class="meta">Ordered stages</span></div>
    ${stageKey()}
  </section>

  <section class="panel"><div class="pb prose">
    <h2 id="models">Full stack versus powered shell</h2>
    <p>${esc(MODELS.fullStack.definition)}</p>
    <p>${esc(MODELS.poweredShell.definition)}</p>
    <h3>Why per-MW economics cannot be compared directly</h3>
    <p>A powered-shell landlord earning roughly $2m per megawatt per year and a full-stack operator
      earning ten times that are not one better than the other — they are selling different products
      with different capital bases and different risks. Ranking them on a single revenue-per-megawatt
      column would be meaningless, so the contract table labels the model on every row and this site
      does not produce a combined league table of per-MW economics.</p>

    <h2 id="conversion">How delivery rate is calculated</h2>
    <p>Delivery conversion is <code>energisedCriticalItMw ÷ securedPowerMw</code>, computed per company
      from the same records the tables display. It is shown only when <em>both</em> figures are
      disclosed. Where either is missing the conversion reads <b>${NOT_DISCLOSED}</b> — it is never
      computed against an assumed zero, which would manufacture a 0% delivery rate for companies that
      have simply not published a number.</p>

    <h2 id="unknowns">How unknown values are handled</h2>
    <p>An undisclosed figure is stored as <code>null</code> with confidence <code>unknown</code>, and
      the data layer refuses to coerce it. In aggregates it is excluded and counted separately, so
      every total states how many companies contributed to it. A total of four companies' secured
      power is described as exactly that, not as an industry figure.</p>
    <p>There is one genuine zero on the site: Keel has signed no customer lease, and reports 0 rather
      than withholding the figure. It is stored as a real <code>0</code> and is distinguishable in the
      data from a missing value.</p>

    <h2 id="confidence">How estimates are labelled</h2>
  </div>
  ${deliveryKey()}
  <div class="pb prose">
    <p>Confidence describes the evidence, not our opinion of the company. Only <b>confirmed</b> values
      count toward a "sourced" percentage. The homepage KPI cards show that percentage on every card,
      so the coverage of a number is visible at the same moment as the number.</p>

    <h2 id="sources">Sources</h2>
    <p>Live prices and company news come from <a href="https://finnhub.io" target="_blank" rel="noopener">Finnhub</a>.
      Filings come directly from <a href="https://www.sec.gov/edgar/search/" target="_blank" rel="noopener">SEC EDGAR</a>.
      Both are called from server-side routes so that no API key is ever present in the page.</p>
    <p>Capacity records are compiled by hand from primary company documents. Each one carries the
      document title, its URL, its publication date, and the date a human actually read it. Where that
      chain is incomplete the figure is marked <b>source required</b> and is excluded from sourced totals.</p>
    <h3>Verification dates</h3>
    <p>A row's verification date records when the underlying evidence was genuinely reviewed. It is
      never set to the current date just because the page rendered. Figures that have never been
      checked against a document show <b>not verified</b> rather than today's date.</p>

    <h2 id="corrections">Corrections</h2>
    <p>Values are not edited silently. When a figure changes, the change is recorded and published here.</p>
  </div>
  <div class="led">${CORRECTIONS.map(c => `<div class="ledrow">
      <div class="when"><b>${esc(date(c.date))}</b></div>
      <div class="what"><h4>${esc(c.summary)}</h4><p>${esc(c.change)}</p>
        ${c.sourceUrl ? `<div class="ledmeta"><a class="src" href="${esc(c.sourceUrl)}" target="_blank" rel="noopener">↗ ${esc(hostOf(c.sourceUrl))}</a></div>` : ''}</div>
      <div class="delta"></div></div>`).join('')}</div>
  <div class="pb prose">
    <h2 id="advice">Not investment advice</h2>
    <p>T2C is an information tool. Nothing on this site is a recommendation to buy or sell anything.
      The Odds view is a lognormal probability exercise driven entirely by inputs you choose; it is not
      derived from options markets and carries no view about any company. Figures are compiled from
      public filings, may lag, and may contain errors — the corrections log above exists because they
      sometimes do.</p>
  </div></section>
</main>`;

  return page({
    title: 'Methodology — how T2C defines and sources every figure',
    description:
      'Definitions for every megawatt category, how delivery rate is calculated, how unknown values ' +
      'and estimates are handled, and the full corrections log.',
    canonical: SITE + '/methodology/',
    body,
    active: 'methodology'
  });
}

/* ---------- minimal legal pages ---------- */
function simplePage(slug, title, description, inner) {
  return page({
    title: `${title} — T2C`,
    description,
    canonical: `${SITE}/${slug}/`,
    body: `<main class="wrap">
      <p class="crumb"><a href="/">T2C</a> / ${esc(title)}</p>
      <div class="chead"><div><h1>${esc(title)}</h1></div></div>
      <section class="panel"><div class="pb prose">${inner}</div></section>
    </main>`
  });
}

/* ---------- write ---------- */
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

bytes += write('privacy/index.html', simplePage('privacy', 'Privacy',
  'What T2C collects — and what it does not.',
  `<h2>What we collect</h2>
   <p>T2C sets no advertising or tracking cookies and runs no third-party analytics. The only value
     stored in your browser is your light/dark theme preference, kept in local storage on your own
     device and never transmitted.</p>
   <h2>What the page requests</h2>
   <p>Pages call this site's own <code>/api/</code> routes for prices, news and filings. Those routes
     call Finnhub and SEC EDGAR from the server, so your browser is never given an API key and those
     providers do not receive your details from us. News thumbnails are loaded directly from the
     publisher's own image host with <code>referrerpolicy="no-referrer"</code>.</p>
   <h2>Hosting</h2>
   <p>The site is served by Vercel, which processes standard request logs as our hosting provider.</p>
   <h2>Contact</h2>
   <p>Questions about this page: see <a href="/contact/">contact</a>.</p>`));

bytes += write('terms/index.html', simplePage('terms', 'Terms',
  'Terms of use for T2C — information only, not investment advice.',
  `<h2>Information only</h2>
   <p>T2C is an information tool. Nothing on this site is investment advice, a recommendation, or an
     offer to buy or sell any security. You are responsible for your own decisions and should take
     professional advice before acting.</p>
   <h2>Accuracy</h2>
   <p>Figures are compiled from public filings and company releases. They may lag, may be
     misinterpreted, and may simply be wrong. Every figure carries a confidence level and, where one
     exists, a link to the underlying document — check the document rather than relying on our
     summary of it. Corrections are published in the <a href="/methodology/#corrections">corrections log</a>.</p>
   <h2>The Odds view</h2>
   <p>The Odds calculator is a lognormal probability exercise applied to inputs you choose. It is not
     derived from options markets, it does not account for gaps, jumps or events, and it must not be
     treated as a forecast.</p>
   <h2>Third-party data</h2>
   <p>Prices and news are supplied by Finnhub; filings by SEC EDGAR. Their terms apply to that data.
     Linked articles belong to their publishers.</p>`));

bytes += write('contact/index.html', simplePage('contact', 'Contact',
  'How to reach T2C, report an error or request a source.',
  `<h2>Corrections and missing sources</h2>
   <p>Much of the capacity data on this site is marked <b>source required</b> — the figure came from an
     earlier compile that did not record which filing it came from. If you can point to the primary
     document for one of them, that is the single most useful thing you can send.</p>
   <p>Corrections are published in full in the <a href="/methodology/#corrections">corrections log</a>,
     including what the figure was before.</p>
   <h2>Get in touch</h2>
   <p>Open an issue at
     <a href="https://github.com/BuyrWorld/TimetoCompute/issues" target="_blank" rel="noopener">github.com/BuyrWorld/TimetoCompute</a>.
     Please include the company, the figure, and a link to the document.</p>`));

/* robots + sitemap */
const urls = [
  { loc: SITE + '/', priority: '1.0', freq: 'hourly' },
  { loc: SITE + '/methodology/', priority: '0.8', freq: 'monthly' },
  ...COMPANIES.map(c => ({ loc: `${SITE}/companies/${c.slug}/`, priority: '0.7', freq: 'weekly' })),
  { loc: SITE + '/privacy/', priority: '0.2', freq: 'yearly' },
  { loc: SITE + '/terms/', priority: '0.2', freq: 'yearly' },
  { loc: SITE + '/contact/', priority: '0.3', freq: 'yearly' }
];

bytes += write('robots.txt',
  `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);

bytes += write('sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${BUILD_DATE}</lastmod>\n` +
    `    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n') +
  `\n</urlset>\n`);

/* favicon — the T2C mark as a lime monogram on the brand black */
bytes += write('favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
  `<rect width="64" height="64" rx="10" fill="#0A0A0A"/>` +
  `<text x="32" y="43" font-family="Archivo,Helvetica,Arial,sans-serif" font-size="30" font-weight="900" ` +
  `fill="#D6FF00" text-anchor="middle" letter-spacing="-1.5">T2C</text></svg>`);

/* static assets */
fs.cpSync(path.join(ROOT, 'src', 'styles.css'), path.join(OUT, 'styles.css'));
fs.cpSync(path.join(ROOT, 'src', 'app.js'), path.join(OUT, 'app.js'));
fs.cpSync(path.join(ROOT, 'Logo'), path.join(OUT, 'Logo'), { recursive: true });

// index + methodology + privacy + terms + contact + one per company
const pages = COMPANIES.length + 5;
console.log(`✓ built ${pages} pages + robots.txt + sitemap.xml (${(bytes / 1024).toFixed(0)} KB) → dist/`);
