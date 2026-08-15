/**
 * Build-time render helpers. The same records produce the homepage, the capacity
 * table and every company page — no figure is ever re-typed into a template.
 */
import { CONFIDENCE, VALUE_STATUS, POWER_BASIS, METRICS, MODELS, GATES, GATE_STATUS } from '../data/schema.js';
import { SOURCE_BY_ID } from '../data/sources.js';
import { COMPANIES } from '../data/companies.js';
import { PROJECTS_BY_COMPANY, CONTRACTS, COUNTRY_NAMES } from '../data/projects.js';
import { CATALYST_STATUS, CATALYST_CATEGORIES, CATALYSTS } from '../data/catalysts.js';
import {
  companyView, headlineKpis, byCountry, ledger, aggregate, isKnown, gateSummary, dataHealth
} from './lib/compute.js';
import {
  esc, mw, mwWithStatus, pct, usdBn, date, hostOf, NOT_DISCLOSED, windowLabel, countdown, statusLabel, basisLabel
} from './lib/format.js';

/* ================= atoms ================= */

export function pill(tone, glyph, label, title = '') {
  return `<span class="st st-${tone}"${title ? ` title="${esc(title)}"` : ''}>` +
    `<i aria-hidden="true">${glyph}</i>${esc(label)}</span>`;
}

const CONF_TONE = { confirmed: 'ok', reported: 'warn', estimated: 'warn', unknown: 'unknown' };

export function evidenceChip(confidence) {
  const c = CONFIDENCE[confidence] || CONFIDENCE.unknown;
  return pill(CONF_TONE[confidence] || 'unknown', c.glyph, c.label, c.definition);
}

/** A status chip appears whenever the value is not a plain current actual. */
export function statusChip(valueStatus) {
  if (!valueStatus || valueStatus === 'actual') return '';
  const v = VALUE_STATUS[valueStatus];
  const tone = valueStatus === 'minimum' ? 'ok' : 'unknown';
  return pill(tone, v.glyph, v.label, v.definition);
}

export function basisChip(powerBasis) {
  if (!powerBasis || powerBasis === 'not-applicable') return '';
  const b = POWER_BASIS[powerBasis];
  return `<span class="basis" title="${esc(b.definition)}">${esc(b.short)}</span>`;
}

/** One source, rendered as a link with its publisher and date. */
export function sourceLink(id) {
  const s = SOURCE_BY_ID[id];
  if (!s) return '';
  return `<a class="src" href="${esc(s.url)}" target="_blank" rel="noopener"` +
    ` title="${esc(s.title)} — ${esc(s.publisher)}, published ${esc(date(s.publishedAt))}">` +
    `↗ ${esc(hostOf(s.url))}</a>`;
}

export function sourceChips(sourceIds) {
  if (!sourceIds?.length) {
    return `<span class="src none" title="No document is linked for this figure.">source required</span>`;
  }
  return sourceIds.map(sourceLink).join(' ');
}

/**
 * Expandable evidence drawer. Uses <details> so it works without JavaScript and is
 * keyboard-operable by default.
 */
export function evidenceDrawer(record, { label = 'Evidence' } = {}) {
  const sources = (record.sourceIds || []).map(id => SOURCE_BY_ID[id]).filter(Boolean);
  if (!sources.length && !record.notes) return '';
  return `<details class="ev">
    <summary>${esc(label)}${sources.length ? ` · ${sources.length} source${sources.length === 1 ? '' : 's'}` : ''}</summary>
    <div class="evbody">
      ${record.notes ? `<p class="evnote">${esc(record.notes)}</p>` : ''}
      <dl class="evmeta">
        ${record.asOf ? `<dt>As of</dt><dd>${esc(date(record.asOf))}</dd>` : ''}
        ${record.verifiedAt ? `<dt>Verified</dt><dd>${esc(date(record.verifiedAt))}</dd>` : `<dt>Verified</dt><dd class="nd">Not verified</dd>`}
        ${record.powerBasis && record.powerBasis !== 'not-applicable' ? `<dt>Basis</dt><dd>${esc(POWER_BASIS[record.powerBasis].label)}</dd>` : ''}
        ${record.valueStatus ? `<dt>Type</dt><dd>${esc(statusLabel(record.valueStatus))}</dd>` : ''}
        ${record.isExhaustive !== undefined ? `<dt>Coverage</dt><dd>${record.isExhaustive ? 'Exhaustive total' : 'Not exhaustive — may be higher'}</dd>` : ''}
      </dl>
      ${sources.map(s => `<div class="evsrc">
        <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>
        <span class="evsrcmeta">${esc(s.publisher)} · ${esc(s.sourceType)} · published ${esc(date(s.publishedAt))}${s.isPrimary ? ' · primary' : ''}</span>
        ${s.supportingExcerpt ? `<blockquote>${esc(s.supportingExcerpt)}</blockquote>` : ''}
      </div>`).join('')}
    </div>
  </details>`;
}

/** A value plus everything needed to judge it. */
export function evidencedValue(record) {
  const value = isKnown(record)
    ? `<span class="val val-${record.valueStatus}">${esc(mwWithStatus(record.valueMw, record.valueStatus))}</span>`
    : `<span class="nd">${NOT_DISCLOSED}</span>`;
  return `${value}
    <span class="vmeta">${evidenceChip(record.confidence)}${statusChip(record.valueStatus)}${basisChip(record.powerBasis)}</span>
    <span class="vmeta">${isKnown(record) ? sourceChips(record.sourceIds) : ''}${record.asOf ? `<span class="asof">as of ${esc(date(record.asOf))}</span>` : ''}</span>`;
}

/* ================= keys ================= */

export function evidenceKey() {
  return `<div class="keys">` + Object.entries(CONFIDENCE).map(([k, c]) =>
    `<div class="keyitem"><div class="kh">${evidenceChip(k)}</div><p>${esc(c.definition)}</p></div>`
  ).join('') + `</div>`;
}

export function valueTypeKey() {
  return `<div class="keys">` + Object.entries(VALUE_STATUS).map(([k, v]) =>
    `<div class="keyitem"><div class="kh"><b>${esc(v.label)}</b>${v.aggregatable ? pill('ok', '∑', 'counted') : pill('unknown', '⊘', 'excluded')}</div>` +
    `<p>${esc(v.definition)}</p></div>`
  ).join('') + `</div>`;
}

export function basisKey() {
  return `<div class="keys">` + Object.entries(POWER_BASIS).filter(([k]) => k !== 'not-applicable').map(([k, b]) =>
    `<div class="keyitem"><div class="kh"><b>${esc(b.label)}</b></div><p>${esc(b.definition)}</p></div>`
  ).join('') + `</div>`;
}

/* ================= gates ================= */

export function gateTrack(project) {
  const g = gateSummary(project);
  return `<ol class="gates" aria-label="Project gates">` + g.rows.map(r => {
    const def = GATES.find(x => x.id === r.id);
    const st = GATE_STATUS[r.status];
    const evidence = r.sourceIds?.length ? ` · ${r.sourceIds.length} source${r.sourceIds.length === 1 ? '' : 's'}` : '';
    const title = `${def.label} — ${st.label}. ${def.definition}${r.notes ? ' ' + r.notes : ''}`;
    return `<li class="gate gate-${st.tone}" title="${esc(title)}">
      <span class="gglyph" aria-hidden="true">${st.glyph}</span>
      <span class="glabel">${esc(def.label)}</span>
      <span class="gstatus">${esc(st.label)}${esc(evidence)}</span>
      ${r.effectiveAt ? `<span class="gdate">${esc(date(r.effectiveAt))}</span>` : ''}
    </li>`;
  }).join('') + `</ol>`;
}

/* ================= KPI cards ================= */

/**
 * A KPI leads with what is confirmed and states its own coverage on the card.
 * An aggregate with no contributors prints "Insufficient comparable disclosure"
 * rather than a zero.
 */
export function kpiCard(k) {
  if (!k.sufficient) {
    return `<div class="kpi kpi-empty">
      <div class="kv nd">Insufficient comparable disclosure</div>
      <div class="kl">${esc(k.label)}</div>
      <div class="kd">No company has published this figure on a single comparable basis.
        ${k.missingCount} of ${k.companyCount} tracked companies do not disclose it.</div>
    </div>`;
  }
  const prefix = k.isMinimum ? '≥' : '';
  return `<div class="kpi">
    <div class="kv">${prefix}${esc(mw(k.total))}</div>
    <div class="kl">${esc(k.label)}
      ${k.isMinimum ? pill('ok', '≥', 'confirmed minimum', 'At least this much. Contributing companies disclose components rather than an exhaustive total, so the real figure may be higher.') : pill('ok', '=', 'exact', 'Every contributor publishes an exhaustive total for this measure.')}
    </div>
    <div class="kd">${esc(METRICS[k.metric].definition.split('.')[0])}.</div>
    <dl class="kfacts">
      <dt>Basis</dt><dd>${esc(POWER_BASIS[k.basis]?.label || NOT_DISCLOSED)}</dd>
      <dt>Contributors</dt><dd>${k.contributorCount} of ${k.companyCount} — ${k.included.map(i => esc(i.ticker)).join(', ')}</dd>
      <dt>Not disclosed</dt><dd>${k.missingCount ? k.missing.map(m => esc(m.ticker)).join(', ') : 'none'}</dd>
      <dt>Excluded</dt><dd>${k.excludedCount ? k.excluded.map(e => `${esc(e.ticker)} (${esc(e.reason)})`).join('; ') : 'none'}</dd>
      <dt>As of</dt><dd>${k.asOfEarliest === k.asOfLatest ? esc(date(k.asOfLatest)) : `${esc(date(k.asOfEarliest))} – ${esc(date(k.asOfLatest))}`}</dd>
      <dt>Sourced</dt><dd>${pct(k.verifiedShare)} of the total is stated in a linked primary document</dd>
    </dl>
    <a class="kpilink" href="#capacity">See the underlying records →</a>
  </div>`;
}

export function kpiCards() {
  return `<div class="kpis">` + headlineKpis().map(kpiCard).join('') + `</div>`;
}

/** Compact hero strip. Mirrors the cards, never a different calculation. */
export function kpiStrip() {
  return headlineKpis().map(k => `<div class="kcell">
    <div class="kv">${k.sufficient ? `${k.isMinimum ? '≥' : ''}${esc(mw(k.total))}` : '—'}</div>
    <div class="kl">${esc(k.label)}</div>
    <div class="ke">${k.sufficient ? `${k.contributorCount}/${k.companyCount} disclose · ${pct(k.verifiedShare)} sourced` : 'Insufficient disclosure'}</div>
  </div>`).join('');
}

/* ================= reconciliation ================= */

/**
 * Explains why T2C's figure differs from the number in a company's own headline.
 * This is the panel that stops a reader assuming the site is simply wrong.
 */
export function reconciliationPanel() {
  const rows = [
    ['CoreWeave', '4.2 GW contracted power',
      'Shown as secured power on a gross-utility basis. It is a total that already includes the 1.5 GW active — the two are not additive, and neither is customer-contracted compute.'],
    ['Nebius', '5 GW contracted power',
      'That is a year-end target from the Q2 shareholder letter, not capacity held today. The last explicitly measured figure is "more than 3.5 GW", which is what the totals use.'],
    ['Keel', '2.2 GW',
      'That is the total development pipeline. The company splits it into 648 MW secured and 1,513 MW planned. Only the 648 MW is counted as secured.'],
    ['TeraWulf', '1 GW at Muskie',
      'Up to 1 GW of contracted electric service — power availability at the utility, not customer-contracted critical IT. It is excluded from contracted totals.'],
    ['IREN', '480 MW',
      'A 2026 gross AI Cloud capacity target across multiple sites, not construction at one site and not current capacity. Held as a target and excluded from all current totals.'],
    ['Applied Digital', '2.15 GW',
      'Gross grid-connected utility power. The comparable customer-contracted figure is 1,410 MW of critical IT — a different measurement of a different thing.']
  ];
  return `<section class="panel" id="reconciliation">
    <div class="ph"><h2>Why these figures differ from the company headline</h2>
      <span class="meta">Reconciliation</span></div>
    <div class="keynote">Companies quote the largest defensible number, which is usually gross utility
      power including targets and pipeline. T2C reports the comparable measure. Neither is wrong — they
      answer different questions.</div>
    <div class="tw"><table>
      <thead><tr><th scope="col">Company</th><th scope="col">Headline figure</th><th scope="col">How T2C records it</th></tr></thead>
      <tbody>${rows.map(([c, h, w]) => `<tr>
        <td>${esc(c)}</td>
        <td class="mono">${esc(h)}</td>
        <td style="text-align:left;font-family:'Archivo',sans-serif;font-weight:400;font-size:12.5px;color:var(--soft);line-height:1.55">${esc(w)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
  </section>`;
}

/* ================= ledger ================= */

export function ledgerRow(e) {
  const c = COMPANIES.find(x => x.id === e.companyId);
  const fmt = v => v === null || v === undefined ? NOT_DISCLOSED : (e.unit === '$bn' ? usdBn(v) : mw(v));
  const hasDelta = e.previousValue !== null || e.newValue !== null;
  return `<article class="ledrow" data-company="${esc(e.companyId)}" data-type="${esc(e.eventType)}" data-confidence="${esc(e.confidence)}" data-date="${esc(e.announcedAt)}">
    <div class="when">
      <b>${esc(date(e.effectiveAt || e.announcedAt))}</b>
      <span>announced ${esc(date(e.announcedAt))}</span>
    </div>
    <div class="what">
      <h4><a href="/companies/${esc(c?.slug || '')}/">${esc(c ? c.name : e.companyId)}</a> — ${esc(e.summary)}</h4>
      <p>${esc(e.implication || '')}</p>
      <div class="ledmeta">
        ${evidenceChip(e.confidence)}
        ${e.significance ? pill(e.significance === 'high' ? 'ok' : 'unknown', '◆', `${e.significance} significance`) : ''}
        ${pill('unknown', '·', (e.eventType || '').replace(/-/g, ' '))}
        ${sourceChips(e.sourceIds)}
      </div>
    </div>
    ${hasDelta ? `<div class="delta">
      <span class="dfrom">${esc(fmt(e.previousValue))}</span>
      <span class="arrow" aria-hidden="true">→</span>
      <span class="dto">${esc(fmt(e.newValue))}</span>
    </div>` : '<div class="delta"></div>'}
  </article>`;
}

export function ledgerPanel(limit = null, { heading = 'Latest verified changes', filters = false } = {}) {
  const rows = ledger({ limit });
  const all = ledger({});
  const body = rows.length
    ? `<div class="led" id="ledgerRows">${rows.map(ledgerRow).join('')}</div>`
    : `<div class="empty"><h3>No verified milestone history yet</h3>
       <p>The ledger only carries changes backed by a document that exists. Nothing is reconstructed,
       so it fills as filings land.</p></div>`;

  const filterBar = filters ? `<div class="filters" role="group" aria-label="Filter the ledger">
    <div class="fsel"><label for="ledCompany">Company</label>
      <select id="ledCompany" name="ledCompany"><option value="">All companies</option>
        ${COMPANIES.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div>
    <div class="fsel"><label for="ledType">Event type</label>
      <select id="ledType" name="ledType"><option value="">All types</option>
        ${[...new Set(all.map(e => e.eventType))].map(t => `<option value="${esc(t)}">${esc(t.replace(/-/g, ' '))}</option>`).join('')}</select></div>
    <div class="fsel"><label for="ledConfidence">Confidence</label>
      <select id="ledConfidence" name="ledConfidence"><option value="">All</option>
        ${Object.keys(CONFIDENCE).map(k => `<option value="${esc(k)}">${esc(CONFIDENCE[k].label)}</option>`).join('')}</select></div>
    <div class="fsel"><label for="ledSince">Since</label>
      <select id="ledSince" name="ledSince"><option value="">Any date</option>
        <option value="2026-08-01">August 2026</option>
        <option value="2026-06-01">June 2026 onward</option>
        <option value="2026-01-01">2026</option></select></div>
    <span class="fcount" id="ledCount" aria-live="polite">${rows.length} events</span>
  </div>` : '';

  return `<section class="panel">
    <div class="ph"><h2>${esc(heading)}</h2><span class="meta">${all.length} verified events</span></div>
    ${filterBar}
    ${body}
    <div class="stamp">Every entry names the document it came from. Where a previous value was never
      published, the change shows <b>${NOT_DISCLOSED}</b> rather than an assumed figure.</div>
  </section>`;
}

/* ================= capacity ================= */

export function capacityTable() {
  const cols = ['securedPowerMw', 'customerContractedMw', 'energisedCriticalItMw', 'customerAcceptedMw', 'revenueLiveMw'];
  const head = `<thead><tr>
    <th scope="col">Company</th><th scope="col">Model</th>
    ${cols.map(c => `<th scope="col">${esc(METRICS[c].label)}</th>`).join('')}
    <th scope="col">Last verified</th></tr></thead>`;

  const body = COMPANIES.map(c => {
    const v = companyView(c);
    return `<tr>
      <td><a href="/companies/${esc(c.slug)}/">${esc(c.ticker)}</a><span class="sub">${esc(c.name)}</span></td>
      <td class="tleft dim">${esc(MODELS[c.model].label)}</td>
      ${cols.map(col => {
        const m = v.measures[col];
        const special = col === 'customerContractedMw' && !isKnown(m) && c.contractedLabel;
        return `<td>${special
          ? `<span class="nd">${esc(c.contractedLabel)}</span>`
          : evidencedValue(m)}</td>`;
      }).join('')}
      <td class="dim small">${v.lastVerifiedAt ? esc(date(v.lastVerifiedAt)) : `<span class="nd">not verified</span>`}</td>
    </tr>`;
  }).join('');

  return `<div class="tw"><table>${head}<tbody>${body}</tbody></table></div>`;
}

export function contractsTable() {
  const head = `<thead><tr><th scope="col">Company</th><th scope="col">Customer</th><th scope="col">MW</th>
    <th scope="col">Term</th><th scope="col">Value</th><th scope="col">Delivered</th><th scope="col">Terms</th></tr></thead>`;
  const body = CONTRACTS.map(k => {
    const c = COMPANIES.find(x => x.id === k.companyId);
    const nd = `<span class="nd">${NOT_DISCLOSED}</span>`;
    const value = k.conditional
      ? `${usdBn(k.valueBn)} committed<span class="sub">up to ${usdBn(k.valueMaxBn)} maximum — the balance is conditional and is not committed revenue</span>`
      : (k.valueBn != null ? usdBn(k.valueBn) : nd);
    return `<tr>
      <td><a href="/companies/${esc(c?.slug || '')}/">${esc(c ? c.ticker : k.companyId)}</a></td>
      <td class="tleft">${esc(k.customer)}</td>
      <td>${k.mw != null ? `${esc(mw(k.mw))}${basisChip(k.basis)}` : nd}</td>
      <td>${k.years ? `${k.years} yr` : nd}</td>
      <td>${value}</td>
      <td>${k.deliveredMw != null ? `${esc(mw(k.deliveredMw))}${k.mw ? `<span class="sub">${((k.deliveredMw / k.mw) * 100).toFixed(0)}% of the contract</span>` : ''}` : nd}</td>
      <td class="tleft dim small">${esc(k.terms)}<span class="sub">${evidenceChip(k.confidence)} ${sourceChips(k.sourceIds)}</span></td>
    </tr>`;
  }).join('');
  return `<div class="tw"><table>${head}<tbody>${body}</tbody></table></div>`;
}

/* ================= country ================= */

/**
 * Columns are per basis and per stage. Nothing incompatible is ever added, and the
 * per-country row expands to the projects that produced each column.
 */
export function countryPanel() {
  const { rows, totals, undisclosedCount } = byCountry();
  const cell = v => v ? esc(mw(v)) : `<span class="nd">—</span>`;

  const body = rows.map((r, i) => `
    <tr class="crow-main">
      <td><button class="georow" type="button" aria-expanded="false" aria-controls="geo-${i}" data-geo="${i}">
        <span aria-hidden="true">${r.flag}</span> ${esc(COUNTRY_NAMES[r.country] || r.country)}
        <span class="sub">${r.projects.length} site${r.projects.length > 1 ? 's' : ''}${r.undisclosedCount ? ` · ${r.undisclosedCount} without a figure` : ''}</span>
      </button></td>
      <td>${cell(r.grossUtility)}</td>
      <td>${cell(r.criticalIt)}</td>
      <td>${cell(r.energised)}</td>
      <td>${cell(r.construction)}</td>
      <td>${cell(r.plannedPotential)}</td>
      <td>${cell(r.unspecified)}</td>
    </tr>
    <tr class="crow-detail" id="geo-${i}" hidden>
      <td colspan="7">
        <div class="sitegrid">${r.projects.map(p => {
          const co = COMPANIES.find(c => c.id === p.companyId);
          return `<div class="sitecard">
            <div class="sn">${esc(p.name)}</div>
            <div class="sc"><a href="/companies/${esc(co?.slug || '')}/">${esc(co ? co.name : p.companyId)}</a></div>
            <div class="sm">${p.capacityMw === null ? `<span class="nd">${NOT_DISCLOSED}</span>` : esc(mw(p.capacityMw))}
              ${basisChip(p.powerBasis)}${statusChip(p.valueStatus)}</div>
            <div class="sc">${esc(p.note || '')}</div>
            <div class="sc">${evidenceChip(p.confidence)} ${sourceChips(p.sourceIds)}</div>
          </div>`;
        }).join('')}</div>
      </td>
    </tr>`).join('');

  return `<section class="panel" id="geography">
    <div class="ph"><h2>Delivery by country</h2><span class="meta">Select a country for its sites</span></div>
    <div class="keynote">Each column is a separate measurement. Gross utility power and critical IT load
      are <b>never added together</b>, and planned or potential capacity is kept out of both.</div>
    <div class="scrollnote">Scroll sideways for all columns →</div>
    <div class="tw"><table>
      <thead><tr>
        <th scope="col">Country</th>
        <th scope="col">Gross utility</th>
        <th scope="col">Critical IT</th>
        <th scope="col">Energised</th>
        <th scope="col">Under construction</th>
        <th scope="col">Planned / potential</th>
        <th scope="col">Unspecified basis</th>
      </tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr>
        <th scope="row">Total</th>
        <td>${cell(totals.grossUtility)}</td><td>${cell(totals.criticalIt)}</td>
        <td>${cell(totals.energised)}</td><td>${cell(totals.construction)}</td>
        <td>${cell(totals.plannedPotential)}</td><td>${cell(totals.unspecified)}</td>
      </tr></tfoot>
    </table></div>
    <div class="stamp">${undisclosedCount} sites are named in filings without a megawatt figure. They are
      listed under their country but excluded from every column rather than counted as zero.</div>
  </section>`;
}

/* ================= catalysts ================= */

export function catalystCard(c) {
  const st = CATALYST_STATUS[c.status];
  const when = c.expectedAt ? date(c.expectedAt) : windowLabel(c.expectedWindowStart, c.expectedWindowEnd);
  const cd = c.expectedAt ? countdown(c.expectedAt)
    : c.expectedWindowStart ? countdown(c.expectedWindowStart) : null;
  return `<article class="cat">
    <div class="cathead">
      <span class="cattick">${esc(c.ticker)}</span>
      ${pill(st.tone, st.glyph, st.label, st.definition)}
      ${pill('unknown', '·', CATALYST_CATEGORIES[c.category]?.label || c.category)}
    </div>
    <h4>${esc(c.title)}</h4>
    <div class="catwhen"><b>${esc(when)}</b>${cd ? `<span>${esc(cd)}</span>` : ''}</div>
    <p>${esc(c.description)}</p>
    <dl class="catmeta">
      <dt>Source of timing</dt><dd>${c.isCompanyGuidance ? 'Company guidance' : 'Independently scheduled'}</dd>
      ${c.affectsMetric ? `<dt>May change</dt><dd>${esc(METRICS[c.affectsMetric]?.label || c.affectsMetric)}</dd>` : ''}
      <dt>Evidence</dt><dd>${evidenceChip(c.confidence)} ${sourceChips(c.sourceIds)}</dd>
    </dl>
  </article>`;
}

export function catalystPanel(items = CATALYSTS) {
  return `<section class="panel" id="catalysts">
    <div class="ph"><h2>Upcoming catalysts</h2><span class="meta">${items.length} tracked · earnings dates load live</span></div>
    <div class="keynote">A catalyst is only listed when a cited document states its timing. Guided windows
      show as a period — <b>never as a false exact date</b> — and estimated dates are labelled as estimates.</div>
    ${items.length ? `<div class="catgrid">${items.map(catalystCard).join('')}</div>`
      : `<div class="empty"><h3>No dated catalysts</h3><p>Nothing with a sourced date is currently outstanding.</p></div>`}
    <div id="liveCatalysts"></div>
    <div class="stamp">Historical reactions to comparable past events would appear here. They require daily
      price history, which the connected data plan does not provide — see
      <a href="/methodology/#reactions">methodology</a>.</div>
  </section>`;
}

/* ================= data health ================= */

export function dataHealthPanel(buildStamp) {
  const h = dataHealth();
  const row = (label, value, hint) =>
    `<div class="hcell"><div class="hv">${esc(String(value))}</div><div class="hl">${esc(label)}</div>${hint ? `<div class="hh">${esc(hint)}</div>` : ''}</div>`;
  return `<section class="panel" id="data-health">
    <div class="ph"><h2>Data health</h2><span class="meta">Audit cut-off 15 Aug 2026</span></div>
    <div class="health">
      ${row('Confirmed values', h.confirmed, 'Primary source linked')}
      ${row('Reported values', h.reported, 'Awaiting a primary document')}
      ${row('Not disclosed', h.notDisclosed, 'Stored as null, never zero')}
      ${row('Unsourced', h.unsourced, 'Values with no document at all')}
      ${row('Projects tracked', h.projects, '')}
      ${row('Evidenced gates', h.gatesEvidenced, 'Project gates with a source')}
      ${row('Ledger events', h.events, '')}
      ${row('Catalysts', h.catalysts, '')}
    </div>
    <div class="stamp">Static data built <b>${esc(buildStamp)}</b>. Live feed status is shown in the header;
      analyst coverage is reported in the Scenarios view.</div>
  </section>`;
}
