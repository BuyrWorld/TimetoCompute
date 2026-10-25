/**
 * The earnings calendar — the most predictable catalyst there is, so it leads
 * the catalysts page.
 *
 * Dates come live from the provider's earnings calendar (/api/catalysts): an
 * exchange-scheduled event, not company guidance. T2C adds only who reports,
 * where they sit in the chain, and which neoclouds/AI-infrastructure operators
 * a report touches through a disclosed link — the same exposure the news hub
 * shows, never a forecast of the result.
 */
import { CHAIN_COMPANIES, CHAIN_COMPANY_BY_ID, CHAIN_LINKS } from '../data/chain.js';
import { COMPANIES } from '../data/companies.js';
import { ART_BY_ID } from '../data/artpack.js';
import { CX_COLUMNS } from './chainx.js';
import { CHAIN_STAGES } from '../data/chainstages.js';
import { esc } from './lib/format.js';

/** Operators one hop away, plus two hops along one direction (as the news hub does). */
function operatorsTouched(id) {
  const nb = x => CHAIN_LINKS.flatMap(l => l.from === x ? [{ id: l.to, dir: 'down', kind: l.kind, what: l.what }]
    : l.to === x ? [{ id: l.from, dir: 'up', kind: l.kind, what: l.what }] : []);
  const out = new Map();
  if (CHAIN_COMPANY_BY_ID[id]?.stage === 'operators') return [];
  for (const n1 of nb(id)) {
    const c1 = CHAIN_COMPANY_BY_ID[n1.id];
    if (c1.stage === 'operators') { if (!out.has(n1.id)) out.set(n1.id, n1.what); continue; }
    for (const n2 of nb(n1.id)) {
      if (n2.dir !== n1.dir && n1.kind !== 'backing') continue;
      if (CHAIN_COMPANY_BY_ID[n2.id].stage === 'operators' && !out.has(n2.id)) out.set(n2.id, `via ${c1.name}`);
    }
  }
  return [...out].map(([k, why]) => ({ name: CHAIN_COMPANY_BY_ID[k].name, why }));
}

export function earningsData() {
  const rows = new Map();
  for (const c of CHAIN_COMPANIES.filter(x => x.ticker)) {
    const col = CX_COLUMNS.findIndex(k => k.stages.includes(c.stage));
    const art = col > -1 ? `${ART_BY_ID[CX_COLUMNS[col].art].base}-192.webp` : null;
    rows.set(c.ticker, {
      t: c.ticker, n: c.name, h: c.href || null, art, frame: col > -1 ? CX_COLUMNS[col].frame : 'lime',
      stage: col > -1 ? (CX_COLUMNS[col].label || CHAIN_STAGES.find(s => s.id === c.stage).label) : '',
      ops: operatorsTouched(c.id)
    });
  }
  // Tracked operators not on the map (Keel, Cipher) still report.
  for (const c of COMPANIES) {
    if (!rows.has(c.ticker)) rows.set(c.ticker, { t: c.ticker, n: c.name, h: `/companies/${c.slug}/`,
      art: `${ART_BY_ID['server-rack'].base}-192.webp`, frame: 'cyan', stage: 'Operators', ops: [] });
  }
  for (const t of ['CIFR']) {
    if (!rows.has(t)) rows.set(t, { t, n: 'Cipher Digital', h: '/companies/cipher/',
      art: `${ART_BY_ID['server-rack'].base}-192.webp`, frame: 'cyan', stage: 'Operators', ops: [] });
  }
  return [...rows.values()];
}

export function earningsSection() {
  return `<section class="ec" id="earnings" aria-labelledby="ec-h">
  <div class="ecsechead">
    <div>
      <p class="ed-eyebrow">Catalysts</p>
      <h1 class="ech" id="ec-h">Earnings calendar</h1>
      <p class="eclede">When the companies across the AI supply chain report next. Results are where capacity,
        contracts and delivery dates get updated — so these are the dates most likely to move the record.</p>
    </div>
    <span class="nhmeta" id="ecMeta">Loading dates…</span>
  </div>
  <ol class="ecnext" id="ecNext" aria-label="The next reports"></ol>
  <details class="eclater" id="ecLaterWrap" hidden>
    <summary class="press">Later reports <span id="ecLaterCount"></span></summary>
    <ol class="eclist" id="ecLater"></ol>
  </details>
  <p class="nhdisc">Dates are exchange-scheduled events from the provider's earnings calendar, not company
    guidance. “Touches” lists operators linked to the reporting company by a filing — exposure, not a
    prediction of the result, and never investment advice.</p>
</section>`;
}
