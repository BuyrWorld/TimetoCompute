/**
 * Server-side render helpers. These run at build time and emit HTML strings, so
 * the same records produce the homepage, the capacity table and every company
 * page — no figure is ever re-typed into a template.
 */
import { CONFIDENCE, STAGES, METRICS, MODELS } from '../data/schema.js';
import { COMPANIES, WATCH_TICKERS } from '../data/companies.js';
import { PROJECTS_BY_COMPANY, CONTRACTS, COUNTRY_NAMES } from '../data/projects.js';
import { EVENTS } from '../data/events.js';
import {
  companyView, headlineKpis, byCountry, ledger, totalFor, getMeasure, isKnown, deliveryConversion
} from './lib/compute.js';
import { esc, mw, pct, usdBn, date, hostOf, NOT_DISCLOSED } from './lib/format.js';

/* ---------- atoms ---------- */

/** Status pill. Always glyph + text; colour is reinforcement, never the signal. */
export function statusPill(kind, glyph, label, title = '') {
  return `<span class="st st-${kind}"${title ? ` title="${esc(title)}"` : ''}>` +
    `<i aria-hidden="true">${glyph}</i>${esc(label)}</span>`;
}

export function confidencePill(confidence) {
  const c = CONFIDENCE[confidence] || CONFIDENCE.unknown;
  const kind = confidence === 'confirmed' ? 'ok'
    : confidence === 'reported' ? 'warn'
    : confidence === 'estimated' ? 'warn' : 'unknown';
  return statusPill(kind, c.glyph, c.label, c.definition);
}

/** Source chip. A confirmed figure links out; an unsourced one says so plainly. */
export function sourceChip(m) {
  if (m.source?.url) {
    return `<a class="src" href="${esc(m.source.url)}" target="_blank" rel="noopener"` +
      ` title="${esc(m.source.title)} — published ${esc(date(m.source.publishedDate))}">` +
      `↗ ${esc(hostOf(m.source.url))}</a>`;
  }
  if (m.sourceRequired) {
    return `<span class="src none" title="This figure was carried over from an earlier compile without recording which document it came from.">source required</span>`;
  }
  return '';
}

/** A measure rendered as a value plus its provenance. */
export function measureCell(m) {
  const v = isKnown(m) ? mw(m.value) : `<span class="nd">${NOT_DISCLOSED}</span>`;
  return `${v}${m.note ? `<span class="sub">${esc(m.note)}</span>` : ''}`;
}

/* ---------- stage track ---------- */

/**
 * Ordered stage track. The reader's position is given by the numbered sequence and
 * the "current" marker, so it stays legible regardless of colour perception.
 */
export function stageTrack(currentStageId, { compact = false } = {}) {
  const cur = STAGES.find(s => s.id === currentStageId);
  const curOrder = cur ? cur.order : -1;
  const shown = compact ? STAGES.filter(s => ['secured', 'construction', 'energised', 'accepted', 'revenueLive'].includes(s.id)) : STAGES;
  return `<ol class="track" aria-label="Delivery stage">` + shown.map(s => {
    const state = s.order < curOrder ? 'done' : s.order === curOrder ? 'here' : '';
    const suffix = s.order === curOrder ? ' (current stage)' : s.order < curOrder ? ' (reached)' : ' (not reached)';
    return `<li class="seg ${state}"><span class="sn">${String(s.order + 1).padStart(2, '0')}</span>` +
      `<span class="sl">${esc(s.short)}<span class="sr">${esc(suffix)}</span></span></li>`;
  }).join('') + `</ol>`;
}

/* ---------- key ---------- */

export function deliveryKey() {
  const rows = [
    ['ok', CONFIDENCE.confirmed.glyph, 'Confirmed', CONFIDENCE.confirmed.definition],
    ['warn', CONFIDENCE.reported.glyph, 'Reported', CONFIDENCE.reported.definition],
    ['warn', CONFIDENCE.estimated.glyph, 'Estimated', CONFIDENCE.estimated.definition],
    ['unknown', CONFIDENCE.unknown.glyph, 'Not disclosed', CONFIDENCE.unknown.definition]
  ];
  return `<div class="keys">` + rows.map(([kind, glyph, label, def]) =>
    `<div class="keyitem"><div class="kh">${statusPill(kind, glyph, label)}</div>` +
    `<p>${esc(def)}</p></div>`).join('') + `</div>`;
}

export function stageKey() {
  return `<div class="keys">` + STAGES.map(s =>
    `<div class="keyitem"><div class="kh"><b>${String(s.order + 1).padStart(2, '0')} · ${esc(s.label)}</b></div>` +
    `<p>${esc(s.definition)}</p></div>`).join('') + `</div>`;
}

/* ---------- KPI strip ---------- */

export function kpiStrip() {
  return headlineKpis().map((k, i) => {
    const verified = k.verifiedShare;
    return `<div class="kcell">
      <div class="kv${i % 2 ? ' plain' : ''}">${mw(k.total)}</div>
      <div class="kl">${esc(k.label)}</div>
      <div class="ke">${k.disclosedCount}/${k.companyCount} disclosed · ${pct(verified)} sourced</div>
    </div>`;
  }).join('');
}

/** Homepage KPI cards, each showing how much of itself is actually verified. */
export function kpiCards() {
  return `<div class="kpis">` + headlineKpis().map(k => {
    const unverifiedShare = 1 - k.verifiedShare;
    return `<div class="kpi">
      <div class="kv">${mw(k.total)}</div>
      <div class="kl">${esc(k.label)}</div>
      <div class="kd">${esc(METRICS[k.metric].definition.split('.')[0])}.</div>
      <div class="bar" role="img" aria-label="${pct(k.verifiedShare)} of this total is backed by a linked primary source">
        <i style="width:${(k.verifiedShare * 100).toFixed(1)}%;background:var(--ok)"></i>
        <i style="width:${(unverifiedShare * 100).toFixed(1)}%;background:var(--warn)"></i>
      </div>
      <div class="kfoot">
        <span class="src none" title="Share of this total stated in a linked primary document">${pct(k.verifiedShare)} sourced</span>
        ${k.missing.length ? `<span class="src none" title="These companies have not published this figure, so they are absent from the total rather than counted as zero">${k.missing.length} not disclosed</span>` : ''}
      </div>
    </div>`;
  }).join('') + `</div>`;
}

/* ---------- delivery ledger ---------- */

export function ledgerPanel(limit = null, { heading = 'Latest verified changes' } = {}) {
  const rows = ledger(limit);
  const body = rows.length ? `<div class="led">` + rows.map(e => {
    const c = COMPANIES.find(x => x.id === e.companyId);
    const from = e.previousValue === null ? NOT_DISCLOSED
      : e.unit === '$bn' ? usdBn(e.previousValue) : mw(e.previousValue);
    const to = e.newValue === null ? NOT_DISCLOSED
      : e.unit === '$bn' ? usdBn(e.newValue) : mw(e.newValue);
    return `<div class="ledrow">
      <div class="when"><b>${esc(date(e.effectiveDate))}</b>announced ${esc(date(e.announcedDate))}</div>
      <div class="what">
        <h4>${esc(c ? c.name : e.companyId)} — ${esc(e.summary)}</h4>
        <p>${esc(e.implication || '')}</p>
        <div class="ledmeta">
          ${confidencePill(e.confidence)}
          ${e.newStage ? statusPill('unknown', '→', STAGES.find(s => s.id === e.newStage)?.label || e.newStage) : ''}
          ${e.sourceUrl ? `<a class="src" href="${esc(e.sourceUrl)}" target="_blank" rel="noopener">↗ ${esc(hostOf(e.sourceUrl))}</a>` : ''}
        </div>
      </div>
      <div class="delta">${esc(from)}<span class="arrow">→</span>${esc(to)}</div>
    </div>`;
  }).join('') + `</div>`
    : `<div class="empty"><h3>No verified milestone history yet</h3>
       <p>The ledger only carries changes backed by a document that exists. Nothing is
       reconstructed from memory, so it starts near-empty and fills as filings land.</p></div>`;

  return `<section class="panel">
    <div class="ph"><h2>${esc(heading)}</h2>
      <span class="meta">${rows.length} verified event${rows.length === 1 ? '' : 's'}</span></div>
    ${body}
    <div class="stamp">Every entry names the document it came from. Where a previous value was
      never published, the change shows <b>${NOT_DISCLOSED}</b> rather than an assumed figure.</div>
  </section>`;
}

/* ---------- capacity table ---------- */

export function capacityTable() {
  const cols = ['securedPowerMw', 'customerContractedMw', 'constructionMw', 'energisedCriticalItMw', 'customerAcceptedMw'];
  const head = `<thead><tr><th scope="col">Company</th><th scope="col">Model</th>` +
    cols.map(c => `<th scope="col">${esc(METRICS[c].label)}</th>`).join('') +
    `<th scope="col">Conversion</th><th scope="col">Stage</th><th scope="col">Last verified</th></tr></thead>`;

  const body = COMPANIES.map(c => {
    const v = companyView(c);
    const conv = v.conversion;
    return `<tr>
      <td><a href="/companies/${esc(c.slug)}/">${esc(c.ticker)}</a><span class="sub">${esc(c.name)}</span></td>
      <td style="text-align:left;font-family:'Archivo',sans-serif;font-weight:500;font-size:12px;color:var(--dim)">${esc(MODELS[c.model].label)}</td>
      ${cols.map(col => {
        const m = v.measures[col];
        return `<td>${isKnown(m) ? mw(m.value) : `<span class="nd">${NOT_DISCLOSED}</span>`}` +
          `<span class="sub">${confidencePill(m.confidence)} ${sourceChip(m)}</span></td>`;
      }).join('')}
      <td>${conv === null ? `<span class="nd">${NOT_DISCLOSED}</span>` : `<b>${pct(conv)}</b>`}
        <span class="sub">energised ÷ secured</span></td>
      <td style="text-align:left">${v.stage ? esc(v.stage.short) : `<span class="nd">${NOT_DISCLOSED}</span>`}</td>
      <td style="font-size:11.5px;color:var(--dim)">${v.lastVerifiedAt ? esc(date(v.lastVerifiedAt)) : `<span class="nd">not verified</span>`}</td>
    </tr>`;
  }).join('');

  return `<div class="tw"><table>${head}<tbody>${body}</tbody></table></div>`;
}

export function contractsTable() {
  const head = `<thead><tr><th scope="col">Company</th><th scope="col">Customer</th><th scope="col">MW</th>
    <th scope="col">Term</th><th scope="col">Value</th><th scope="col">Per MW/yr</th>
    <th scope="col">Delivered</th><th scope="col">Terms</th></tr></thead>`;
  const body = CONTRACTS.map(k => {
    const c = COMPANIES.find(x => x.id === k.companyId);
    const per = (k.valueBn && k.mw && k.years) ? (k.valueBn * 1000 / k.mw / k.years) : null;
    const nd = `<span class="nd">${NOT_DISCLOSED}</span>`;
    return `<tr>
      <td>${esc(c ? c.ticker : k.companyId)}</td>
      <td style="text-align:left;font-family:'Archivo',sans-serif;font-weight:600;font-size:12.5px">${esc(k.customer)}</td>
      <td>${k.mw ?? nd}</td>
      <td>${k.years ? k.years + ' yr' : nd}</td>
      <td>${k.valueBn != null ? usdBn(k.valueBn) : nd}</td>
      <td>${per ? '<b>$' + per.toFixed(1) + 'm</b>' : nd}</td>
      <td>${k.deliveredMw != null ? (k.mw ? `${k.deliveredMw} MW<span class="sub">${((k.deliveredMw / k.mw) * 100).toFixed(0)}% of deal</span>` : `${k.deliveredMw} MW`) : nd}</td>
      <td style="text-align:left;font-family:'Archivo',sans-serif;font-weight:400;font-size:12px;color:var(--dim)">
        ${esc(k.terms)}<span class="sub">${confidencePill(k.confidence)} ${k.source ? `<a class="src" href="${esc(k.source.url)}" target="_blank" rel="noopener">↗ ${esc(hostOf(k.source.url))}</a>` : '<span class="src none">source required</span>'}</span></td>
    </tr>`;
  }).join('');
  return `<div class="tw"><table>${head}<tbody>${body}</tbody></table></div>`;
}

/* ---------- country panel ---------- */

export function countryPanel() {
  const { rows, disclosedTotal, undisclosedCount } = byCountry();
  const stageColour = { secured: 'var(--unknown)', permitted: 'var(--unknown)', construction: 'var(--warn)', energised: 'var(--ok)', accepted: 'var(--ok)', revenueLive: 'var(--ok)' };

  const list = rows.map((r, i) => {
    const share = disclosedTotal ? r.mw / disclosedTotal * 100 : 0;
    const segs = Object.entries(r.byStage)
      .map(([st, v]) => `<i style="background:${stageColour[st] || 'var(--unknown)'};width:${r.mw ? v / r.mw * 100 : 0}%"></i>`).join('');
    return `<button class="georow" type="button" aria-expanded="false" aria-controls="geo-${i}" data-geo="${i}">
        <span class="geoflag" aria-hidden="true">${r.flag}</span>
        <span>
          <span class="geoname">${esc(COUNTRY_NAMES[r.country] || r.country)}
            <small>${r.projects.length} site${r.projects.length > 1 ? 's' : ''}${r.undisclosed ? ` · ${r.undisclosed} without a published figure` : ''}</small></span>
          <span class="geobar" role="img" aria-label="Stage split for ${esc(COUNTRY_NAMES[r.country] || r.country)}">${segs}</span>
        </span>
        <span class="geoval">${share.toFixed(1)}%<small>${mw(r.mw)}</small></span>
      </button>
      <div class="geodetail" id="geo-${i}">
        <div class="sitegrid">${r.projects.map(p => {
          const co = COMPANIES.find(c => c.id === p.companyId);
          return `<div class="sitecard">
            <div class="sn">${esc(p.name)}</div>
            <div class="sc">${esc(co ? co.name : p.companyId)}</div>
            <div class="sm">${p.capacityMw === null ? `<span class="nd">${NOT_DISCLOSED}</span>` : mw(p.capacityMw)}</div>
            <div class="sc" style="margin-top:5px">${esc(p.note || '')}</div>
            <div class="sc" style="margin-top:6px">${confidencePill(p.confidence)}</div>
          </div>`;
        }).join('')}</div>
      </div>`;
  }).join('');

  return `<section class="panel">
    <div class="ph"><h2>Delivery by country</h2><span class="meta">Select a row for sites</span></div>
    <div class="geo">${list}</div>
    <div class="stamp">Percentages are of the <b>${mw(disclosedTotal)}</b> of site-level capacity companies have
      actually published. ${undisclosedCount} further sites are named in filings without a megawatt figure; they are
      listed but excluded from the split rather than counted as zero.</div>
  </section>`;
}

/* ---------- company contribution ---------- */

export function contributionPanel() {
  const t = totalFor('securedPowerMw');
  const rows = t.contributing.slice().sort((a, b) => b.value - a.value);
  const max = rows.length ? rows[0].value : 1;
  return `<section class="panel">
    <div class="ph"><h2>Who holds the power</h2><span class="meta">Share of secured power</span></div>
    <div class="contrib">${rows.map(r => {
      const co = COMPANIES.find(c => c.ticker === r.ticker);
      return `<div class="crow">
        <div class="ct"><a href="/companies/${esc(co.slug)}/">${esc(r.ticker)}</a></div>
        <div class="cb"><i style="width:${r.value / max * 100}%"></i></div>
        <div class="cv">${pct(r.value / t.total, 1)}<small>${mw(r.value)}</small></div>
      </div>`;
    }).join('')}</div>
    <div class="stamp">Secured power is capacity contracted from utilities and landlords — supply.
      It is <b>not</b> the same as capacity contracted to customers, which is tracked separately.
      ${t.missing.length ? `${t.missing.join(', ')} ${t.missing.length === 1 ? 'has' : 'have'} not published a figure and ${t.missing.length === 1 ? 'is' : 'are'} absent from this split.` : ''}</div>
  </section>`;
}
