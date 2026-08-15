/**
 * Hand-drawn SVG illustrations.
 *
 * Everything here is generated from the records — no stock imagery, no photography,
 * no third-party assets and nothing licensed. The visual language is industrial
 * schematic: thin strokes, flat fills, theme variables, no gradients or glow.
 *
 * Accessibility: every figure carries role="img" and an aria-label that states the
 * same facts as the drawing, so the picture is never the only way to get the point.
 */
import { METRICS, POWER_BASIS, GATES } from '../../data/schema.js';
import { esc, mw, NOT_DISCLOSED } from './format.js';

/** Per-company accent, used only for identity tiles — never to encode data. */
export const COMPANY_ACCENT = {
  iren: '#C8E82A', coreweave: '#4FA3E3', nebius: '#B07BE8',
  terawulf: '#E08A3C', keel: '#3FBF9E', 'applied-digital': '#E3556F',
  cipher: '#7E8AA8', nvidia: '#76B900'
};

/**
 * Identity tile. A monogram plus a schematic mark implying racks and power —
 * enough to make a card scannable without pretending to be a company logo.
 */
export function companyTile(company, { size = 56 } = {}) {
  const accent = COMPANY_ACCENT[company.id] || 'var(--ok)';
  const t = esc(company.ticker);
  return `<svg class="ctile" viewBox="0 0 56 56" width="${size}" height="${size}" role="img"
    aria-label="${esc(company.name)} identifier">
    <rect x="0.5" y="0.5" width="55" height="55" rx="7" fill="var(--surface-3)" stroke="var(--line)"/>
    <g opacity="0.30" fill="${accent}">
      <rect x="8" y="9" width="14" height="3" rx="1"/><rect x="8" y="15" width="10" height="3" rx="1"/>
      <rect x="34" y="9" width="14" height="3" rx="1"/><rect x="38" y="15" width="10" height="3" rx="1"/>
      <rect x="8" y="44" width="14" height="3" rx="1"/><rect x="34" y="44" width="14" height="3" rx="1"/>
    </g>
    <text x="28" y="34" text-anchor="middle" font-family="IBM Plex Mono, monospace"
      font-size="15" font-weight="700" fill="${accent}" letter-spacing="-0.5">${t}</text>
  </svg>`;
}

/**
 * The delivery funnel — the single most useful picture on the site.
 *
 * It shows power narrowing from what a company controls to what actually invoices.
 * The basis change from gross utility to critical IT is drawn explicitly, because
 * the drop across that line is a change of MEASUREMENT, not a loss of capacity, and
 * a reader who misses that will misread every company here.
 */
export function deliveryFunnel(view, { width = 620 } = {}) {
  const c = view.company;
  const rows = [
    { key: 'securedPowerMw', label: 'Power controlled', tech: 'Secured power' },
    { key: 'constructionMw', label: 'Being built', tech: 'Under construction' },
    { key: 'energisedCriticalItMw', label: 'Switched on', tech: 'Energised critical IT' },
    { key: 'customerContractedMw', label: 'Customers signed for', tech: 'Customer-contracted' },
    { key: 'customerAcceptedMw', label: 'Delivered and accepted', tech: 'Customer-accepted' },
    { key: 'revenueLiveMw', label: 'Generating revenue', tech: 'Revenue live' }
  ].map(r => {
    const m = view.measures[r.key];
    const known = m && m.valueMw !== null && m.valueMw !== undefined;
    return { ...r, m, known, value: known ? m.valueMw : null, basis: m?.powerBasis };
  });

  const max = Math.max(...rows.filter(r => r.known).map(r => r.value), 1);
  const rowH = 44, padL = 4, padT = 10;
  const height = padT + rows.length * rowH + 30;
  const barMax = width - 210;

  const tone = key =>
    key === 'revenueLiveMw' || key === 'customerAcceptedMw' ? 'var(--ok)'
      : key === 'constructionMw' ? 'var(--warn)'
        : 'var(--series-2)';

  let y = padT;
  let body = '';
  let prevBasis = null;

  for (const r of rows) {
    // Mark the point where the measurement changes, once.
    if (r.known && prevBasis && r.basis && r.basis !== prevBasis) {
      body += `<line x1="${padL}" y1="${y - 5}" x2="${width - 6}" y2="${y - 5}"
        stroke="var(--warn)" stroke-width="1" stroke-dasharray="3 3" opacity="0.65"/>
        <text x="${width - 8}" y="${y - 9}" text-anchor="end" font-family="IBM Plex Mono, monospace"
          font-size="8.5" fill="var(--warn)">measurement changes to ${esc(POWER_BASIS[r.basis].short)}</text>`;
    }
    if (r.known) prevBasis = r.basis;

    const w = r.known ? Math.max(3, (r.value / max) * barMax) : 0;
    body += `<text x="${padL}" y="${y + 13}" font-family="Archivo, sans-serif" font-size="11.5"
      font-weight="700" fill="var(--soft)">${esc(r.label)}</text>`;

    if (r.known) {
      body += `<rect x="${padL}" y="${y + 20}" width="${w}" height="13" rx="2" fill="${tone(r.key)}" opacity="0.85"/>
        <text x="${padL + w + 8}" y="${y + 30}" font-family="IBM Plex Mono, monospace" font-size="11.5"
          font-weight="700" fill="var(--ink)">${r.m.valueStatus === 'minimum' ? '≥' : ''}${esc(mw(r.value))}</text>
        <text x="${width - 8}" y="${y + 30}" text-anchor="end" font-family="IBM Plex Mono, monospace"
          font-size="8.5" fill="var(--dim)">${esc(POWER_BASIS[r.basis]?.short || '')}</text>`;
    } else {
      body += `<rect x="${padL}" y="${y + 20}" width="${barMax}" height="13" rx="2" fill="none"
        stroke="var(--line)" stroke-width="1" stroke-dasharray="4 4"/>
        <text x="${padL + 9}" y="${y + 30}" font-family="IBM Plex Mono, monospace" font-size="10"
          fill="var(--unknown)">not disclosed</text>`;
    }
    y += rowH;
  }

  const spoken = rows.map(r =>
    `${r.label}: ${r.known ? (r.m.valueStatus === 'minimum' ? 'at least ' : '') + mw(r.value) : 'not disclosed'}`
  ).join('. ');

  return `<figure class="illus">
    <svg viewBox="0 0 ${width} ${height}" role="img"
      aria-label="Delivery funnel for ${esc(c.name)}. ${esc(spoken)}.">${body}</svg>
    <figcaption>Each bar is drawn to the same scale. A dashed row means the company has not published
      that figure — it is not zero. Where the dashed line appears, the measurement itself changes from
      power at the utility connection to usable capacity inside the hall, so the step down is a change
      of definition rather than capacity going missing.</figcaption>
  </figure>`;
}

/**
 * Who owns which layer. This is the difference between a landlord and an operator,
 * and it is the reason per-megawatt revenue cannot be compared across the two.
 */
export function businessModelDiagram(model) {
  const layers = [
    { id: 'power', label: 'Grid power' },
    { id: 'shell', label: 'Building and cooling' },
    { id: 'racks', label: 'Racks and network' },
    { id: 'chips', label: 'Accelerators' },
    { id: 'compute', label: 'Compute sold' }
  ];
  // A powered-shell landlord stops at the rack; the tenant supplies the rest.
  const ownedThrough = model === 'fullStack' ? 5 : 3;
  const W = 560, H = 118, boxW = (W - 8) / layers.length - 8;

  const body = layers.map((l, i) => {
    const owned = i < ownedThrough;
    const x = 4 + i * (boxW + 8);
    return `<g>
      <rect x="${x}" y="26" width="${boxW}" height="42" rx="4"
        fill="${owned ? 'var(--ok)' : 'none'}" opacity="${owned ? 0.22 : 1}"
        stroke="${owned ? 'var(--ok)' : 'var(--line)'}" stroke-width="1.5"
        ${owned ? '' : 'stroke-dasharray="4 4"'}/>
      <text x="${x + boxW / 2}" y="${52}" text-anchor="middle" font-family="Archivo, sans-serif"
        font-size="10.5" font-weight="700" fill="${owned ? 'var(--ink)' : 'var(--dim)'}">${esc(l.label)}</text>
      <text x="${x + boxW / 2}" y="${84}" text-anchor="middle" font-family="IBM Plex Mono, monospace"
        font-size="8.5" fill="${owned ? 'var(--ok)' : 'var(--unknown)'}">${owned ? 'company' : 'tenant'}</text>
      ${i < layers.length - 1 ? `<path d="M ${x + boxW + 1} 47 L ${x + boxW + 6} 47" stroke="var(--line)" stroke-width="1.5"/>` : ''}
    </g>`;
  }).join('');

  const spoken = model === 'fullStack'
    ? 'The company owns every layer from grid power through to the accelerators, and sells finished compute.'
    : 'The company owns grid power, the building and the racks. The tenant supplies its own accelerators and sells its own compute.';

  return `<figure class="illus">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spoken)}">
      <text x="4" y="14" font-family="IBM Plex Mono, monospace" font-size="9.5"
        fill="var(--dim)" letter-spacing="1">WHO OWNS WHAT</text>
      ${body}
    </svg>
    <figcaption>${esc(spoken)}</figcaption>
  </figure>`;
}

/**
 * The stage journey. Interactive: each step is a button that reveals its evidence,
 * so a curious reader can go from picture to primary document in one click.
 */
export function journeyStrip(view) {
  const STEPS = [
    { gate: 'utilityAgreement', label: 'Power secured', icon: 'power', alsoGates: ['siteControl'], alsoMetric: 'securedPowerMw' },
    { gate: 'constructionStarted', label: 'Built', icon: 'build' },
    { gate: 'criticalItEnergised', label: 'Switched on', icon: 'energise' },
    { gate: 'customerContracted', label: 'Customer signed', icon: 'contract' },
    { gate: 'customerAccepted', label: 'Accepted', icon: 'accept' },
    { gate: 'revenueCommenced', label: 'Invoicing', icon: 'revenue' }
  ];

  // A step counts as reached when any project has that gate complete.
  const reached = {};
  for (const p of view.projects || []) {
    for (const g of p.gates || []) {
      if (g.status === 'complete') reached[g.id] = reached[g.id] || { project: p.name, at: g.effectiveAt, sourceIds: g.sourceIds };
    }
  }

  const ICON = {
    power: '<path d="M13 3 L7 13 h5 l-1 8 6-10 h-5 z"/>',
    build: '<path d="M3 20 h18 M6 20 V9 l6-4 6 4 v11" fill="none" stroke-width="1.8"/>',
    energise: '<circle cx="12" cy="12" r="7" fill="none" stroke-width="1.8"/><circle cx="12" cy="12" r="2.5"/>',
    contract: '<path d="M6 3 h9 l4 4 v14 H6 z M9 11 h7 M9 15 h7" fill="none" stroke-width="1.6"/>',
    accept: '<path d="M4 12 l5 5 L20 6" fill="none" stroke-width="2.4"/>',
    revenue: '<path d="M4 18 L9 12 l4 3 7-9" fill="none" stroke-width="2"/>'
  };

  return `<ol class="journey" aria-label="Delivery journey for ${esc(view.company.name)}">` +
    STEPS.map((s, i) => {
      var extra = (s.alsoGates || []).map(function (g) { return reached[g]; }).filter(Boolean)[0];
      var byMetric = null;
      if (s.alsoMetric) {
        var mm = view.measures[s.alsoMetric];
        if (mm && mm.valueMw !== null && mm.valueMw !== undefined) {
          byMetric = { project: 'Company-wide disclosure', at: mm.asOf, sourceIds: mm.sourceIds };
        }
      }
      const hit = reached[s.gate] || extra || byMetric;
      const state = hit ? 'done' : 'pending';
      const detail = hit
        ? `${hit.project}${hit.at ? ' · ' + hit.at : ''}`
        : 'No evidence recorded yet';
      return `<li class="jstep jstep-${state}">
        <button class="jbtn" type="button" aria-expanded="false" aria-controls="j-${esc(view.company.id)}-${i}">
          <span class="jicon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">${ICON[s.icon]}</svg>
          </span>
          <span class="jlabel">${esc(s.label)}</span>
          <span class="jstate">${hit ? 'Reached' : 'Not yet'}</span>
        </button>
        <div class="jdetail" id="j-${esc(view.company.id)}-${i}" hidden>
          <p>${esc(detail)}</p>
          ${hit && hit.sourceIds?.length ? `<div class="jsrc" data-sources="${esc(hit.sourceIds.join(','))}"></div>` : ''}
        </div>
      </li>`;
    }).join('') + `</ol>`;
}

/**
 * Schematic footprint. Deliberately not a geographic map — a dot grid per country
 * avoids implying a precision of location the records do not have.
 */
export function footprintDots(projects) {
  const byCountry = {};
  for (const p of projects || []) {
    byCountry[p.country] = byCountry[p.country] || { flag: p.flag, items: [] };
    byCountry[p.country].items.push(p);
  }
  const entries = Object.entries(byCountry);
  if (!entries.length) return '';

  return `<div class="footprint">` + entries.map(([code, g]) => `
    <div class="fpcountry">
      <div class="fphead"><span class="fpflag" aria-hidden="true">${g.flag}</span>
        <b>${g.items.length}</b></div>
      <div class="fpdots" role="img" aria-label="${g.items.length} site${g.items.length === 1 ? '' : 's'} in ${esc(code)}">
        ${g.items.map(p => {
          const known = p.capacityMw !== null;
          return `<span class="fpdot${known ? '' : ' fpdot-unknown'}" title="${esc(p.name)} — ${known ? esc(mw(p.capacityMw)) : NOT_DISCLOSED}"></span>`;
        }).join('')}
      </div>
    </div>`).join('') + `</div>`;
}
