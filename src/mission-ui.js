/**
 * Mission Control render helpers.
 *
 * Kept apart from ui.js because these components render the site and signal
 * models rather than the company/metric models, and because ui.js is already
 * long. Same rules apply: every figure comes from a record, an undisclosed value
 * prints as "Not disclosed", and nothing here writes a sentence about a company
 * that the data does not support.
 */
import { GATE_STATUS } from '../data/schema.js';
import { esc, mw, date, usdBn, NOT_DISCLOSED, windowLabel, firstSentence } from './lib/format.js';
import { CATEGORIES } from './lib/signals.js';
import { furthestStage } from './lib/sites.js';
import { siteEstimates } from './lib/estimate.js';
import { FACTOR_BY_ID } from './lib/score.js';
import { sourceChips, evidenceChip, pill } from './ui.js';

/* ================= atoms ================= */

/**
 * The segmented bar from the reference. It is always accompanied by its own text
 * label, because status must never be carried by colour or length alone.
 */
export function meter(filled, total = 10, { tone = '', label = '', showLabel = true } = {}) {
  const n = Math.max(0, Math.min(total, Math.round(filled)));
  const cells = Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  // The label is always the accessible name, whether or not it is drawn — a bar
  // whose only meaning is its length and colour is unreadable without it.
  const bar = `<span class="meter ${esc(tone)}" role="img" aria-label="${esc(label || `${n} of ${total}`)}">${cells}</span>`;
  return label && showLabel ? `<span class="meterlab">${esc(label)}</span>${bar}` : bar;
}

const confidenceTone = level => (level === 'high' ? '' : level === 'medium' ? 'warn' : 'bad');

/** Evidence confidence, or an honest silence when there is too little to measure. */
export function confidenceMeter(evidence) {
  if (!evidence) {
    return `<span class="meterlab nd" title="Fewer than two gates on this site have been reported, which is too little to characterise.">Not enough evidence</span>`;
  }
  return meter(evidence.share * 10, 10, {
    tone: confidenceTone(evidence.level),
    label: `${evidence.label} — ${evidence.confirmed} of ${evidence.total} gates confirmed`
  });
}

/**
 * Confidence as a header fact: the level as the value, the bar beside it and the
 * count underneath. Keeps the long explanatory text out of the value line, which
 * otherwise collides with the bar.
 */
export function confidenceFact(evidence) {
  if (!evidence) {
    return {
      value: `<span class="nd">Not enough evidence</span>`,
      label: 'Evidence confidence · fewer than two gates reported'
    };
  }
  // showLabel is off: the level word is already the value beside the bar, and
  // printing it twice reads as "High HIGH CONFIDENCE".
  const bar = meter(evidence.share * 6, 6, {
    tone: confidenceTone(evidence.level),
    showLabel: false,
    label: `${evidence.label} confidence — ${evidence.confirmed} of ${evidence.total} confirmed`
  });
  return {
    value: `<span class="conflevel ${esc(evidence.level)}">${esc(evidence.label)}</span> ${bar}`,
    label: `Evidence confidence · ${evidence.confirmed} of ${evidence.total} gates confirmed`
  };
}

/* ================= delivery path ================= */

const STEP_GLYPH = {
  complete: '✓', implied: '⌁', inProgress: '◐', conditional: '◑', notStarted: '○', notDisclosed: '—'
};

/** Prefer the stage's own label — an implied stage has one the schema does not. */
const stepLabel = s => s.statusLabel || GATE_STATUS[s.status]?.label || s.status;

/**
 * The horizontal path to billing.
 *
 * A stage with evidence is a real button that opens its sources. A stage with
 * nothing behind it is rendered as a disabled step that says why, rather than as
 * an affordance that does nothing when pressed.
 */
export function pathTrack(stages, { idPrefix = 'path' } = {}) {
  const lastDone = stages.reduce((acc, s, i) => (s.status === 'complete' ? i : acc), -1);

  return `<div class="pathwrap"><ol class="path" aria-label="Path to billing">` + stages.map((s, i) => {
    const isNow = i === lastDone + 1 && s.status !== 'notDisclosed';
    const cls = [
      'pstep',
      s.status === 'complete' ? 'done' : '',
      isNow ? 'now' : '',
      s.status === 'notDisclosed' ? 'nd' : ''
    ].filter(Boolean).join(' ');

    const detail = s.effectiveAt
      ? `<span class="pdate">${esc(date(s.effectiveAt))}</span>`
      : `<span class="pstatus">${esc(stepLabel(s))}</span>`;

    const inner = `<span class="pnode" aria-hidden="true">${STEP_GLYPH[s.status]}</span>
      <span class="plabel">${esc(s.short || s.label)}</span>
      ${detail}`;

    const evidenced = s.sourceIds.length > 0;
    const title = `${s.label} — ${stepLabel(s)}. Evidenced by: ${s.gates.join(', ') || 'no gate on record'}.`;

    // Only a stage with sources is pressable; the rest state why they are not.
    return `<li class="${cls}">
      ${evidenced
        ? `<button type="button" class="press pstep-btn" aria-expanded="false"
             aria-controls="${esc(idPrefix)}-${esc(s.id)}" title="${esc(title)}"
             style="all:unset;display:block;cursor:pointer;width:100%">${inner}</button>
           <div class="pstepev" id="${esc(idPrefix)}-${esc(s.id)}" hidden>${sourceChips(s.sourceIds)}</div>`
        : `<span title="${esc(title)}">${inner}</span>`}
    </li>`;
  }).join('') + `</ol></div>`;
}

/* ================= site components ================= */

export function siteCard(site) {
  const stage = furthestStage(site);
  const ests = siteEstimates(site.project);
  const cap = site.capacityMw === null
    ? (ests.capacityMw
      ? `<span class="ctest" data-estimate>~${esc(mw(ests.capacityMw.valueMw))}</span>`
      : `<span class="nd">${NOT_DISCLOSED}</span>`)
    : esc(mw(site.capacityMw));

  return `<a class="sitecard press" href="/sites/${esc(site.slug)}/"
     data-company="${esc(site.companyId ?? site.project.companyId)}"
     data-country="${esc(site.country)}"
     data-stage="${esc(stage?.id || '')}"
     data-name="${esc(site.name)}"
     data-search="${esc(`${site.name} ${site.companyName} ${site.ticker || ''} ${site.countryName}`.toLowerCase())}">
    <div class="sitecardtop">
      <div>
        <span class="sitecardco">${esc(site.ticker || site.companyName)}</span>
        <h3 class="sitecardname">${esc(site.name)}</h3>
        <span class="sitecardloc">${esc(site.flag)} ${esc(site.countryName)}</span>
      </div>
      <span class="sitecardcap">${cap}
        ${ests.criticalItMw
          ? `<span class="sitecardit" data-estimate
               title="${esc(ests.criticalItMw.derivation + ' — ' + ests.criticalItMw.assumption)}">~${esc(mw(ests.criticalItMw.valueMw))} critical IT (est)</span>`
          : ''}</span>
    </div>
    ${site.note ? `<p class="mnote secondary">${esc(firstSentence(site.note))}</p>` : ''}
    <div class="sitecardfoot">
      <span class="sitecardstage${stage ? '' : ' none'}">${esc(stage ? stage.label : 'No stage evidenced')}</span>
      ${site.evidence ? meter(site.evidence.share * 5, 5, {
        tone: confidenceTone(site.evidence.level),
        showLabel: false,
        label: `${site.evidence.label} evidence confidence — ${site.evidence.confirmed} of ${site.evidence.total} gates confirmed`
      }) : ''}
    </div>
  </a>`;
}

/** The vertical status ladder on a site page. */
export function statusLadder(stages) {
  const lastDone = stages.reduce((acc, s, i) => (s.status === 'complete' ? i : acc), -1);
  return `<ol class="ladder" aria-label="Site status">` + stages.map((s, i) => {
    const isNow = i === lastDone + 1 && s.status !== 'notDisclosed';
    const cls = ['lstep', s.status === 'complete' ? 'done' : '',
      s.status === 'implied' ? 'implied' : '', isNow ? 'now' : '',
      s.status === 'notDisclosed' ? 'nd' : ''].filter(Boolean).join(' ');
    return `<li class="${cls}">
      <span class="lnode" aria-hidden="true">${STEP_GLYPH[s.status]}</span>
      <div class="lbody">
        <span class="llabel">${esc(s.label)}</span>
        <div class="lmeta">${s.status === 'implied'
          ? `Implied by ${esc(s.impliedBy)} — necessary, but not separately evidenced`
          : `${esc(stepLabel(s))}${s.effectiveAt ? ` · ${esc(date(s.effectiveAt))}` : ''}
             ${s.sourceIds.length ? ' · ' + sourceChips(s.sourceIds) : ''}`}</div>
        ${s.notes ? `<div class="lmeta secondary">${esc(s.notes)}</div>` : ''}
      </div>
    </li>`;
  }).join('') + `</ol>`;
}

export function dependencyGrid(deps) {
  const GLYPH = { grid: '⚡', permits: '§', financing: '$', equipment: '⚙', customer: '☺', cooling: '≋', networking: '⌁' };
  return `<div class="deps">` + deps.map(d => `
    <div class="dep ${esc(d.tone)}" title="${esc(d.gates.length ? 'From: ' + d.gates.join(', ') : 'No tracked company discloses this as a separate site milestone.')}">
      <span class="depglyph" aria-hidden="true">${GLYPH[d.id] || '·'}</span>
      <span>
        <span class="deplabel">${esc(d.label)}</span>
        <span class="depstatus">${esc(d.statusLabel)}</span>
      </span>
    </div>`).join('') + `</div>`;
}

/**
 * Site replay. Only dated gates appear, so the replay can never imply a
 * progression the documents do not record.
 */
export function replayTrack(steps) {
  if (!steps.length) {
    return `<p class="mnote">No milestone on this site carries a published date, so there is nothing to replay.</p>`;
  }
  return `<div class="replay" aria-label="Documented progression">` + steps.map(s => `
    <div class="rstep">
      <span class="rdot" aria-hidden="true">✓</span>
      <span class="rlabel">${esc(s.label)}</span>
      <span class="rdate">${esc(date(s.at))}</span>
    </div>`).join('') + `</div>`;
}

/* ================= signals ================= */

export function signalFilters(counts, { selected = null } = {}) {
  const total = counts.reduce((a, c) => a + c.count, 0);
  const chip = (id, label, n, isSel) =>
    `<button type="button" class="chip press sigfilter" data-cat="${esc(id)}"
       aria-pressed="${isSel ? 'true' : 'false'}">${esc(label)} <span class="n">${n}</span></button>`;
  return `<div class="sigfilters" role="group" aria-label="Filter signals by kind">
    ${chip('', 'All', total, !selected)}
    ${counts.map(c => chip(c.id, c.label, c.count, selected === c.id)).join('')}
  </div>`;
}

/**
 * `anchor` gives the row a real id so `/intelligence/#<signal>` lands on it. Only
 * one copy of a signal on a page may claim the id — the same signal appears in
 * both the daily set and the full ledger, and duplicate ids would make the
 * anchor ambiguous.
 */
export function signalRow(s, { reviewable = true, anchor = false } = {}) {
  const delta = s.previousValue !== null && s.newValue !== null && s.unit
    ? `<span class="sigdelta ${esc(s.direction || '')}">${esc(s.previousValue)} → ${esc(s.newValue)} ${esc(s.unit)}</span>`
    : s.newValue !== null && s.unit
      ? `<span class="sigdelta">${esc(s.newValue)} ${esc(s.unit)}</span>`
      : '';

  return `<li class="sig ${esc(s.tone)}"${anchor ? ` id="${esc(s.id)}"` : ''}
      data-cat="${esc(s.category)}" data-id="${esc(s.id)}"
      data-company="${esc(s.companyId)}" data-at="${esc(s.announcedAt)}">
    <span class="sigglyph" aria-hidden="true">${esc(s.glyph)}</span>
    <div class="sigmain">
      <div class="sigtop">
        ${s.companySlug
          ? `<a class="sigco press" href="/companies/${esc(s.companySlug)}/">${esc(s.ticker || s.companyName)}</a>`
          : `<span class="sigco">${esc(s.ticker || s.companyName)}</span>`}
        <span class="sigcat">${esc(s.categoryLabel)}</span>
        ${evidenceChip(s.confidence)}
        ${s.projectId ? `<a class="sigco press" href="/sites/${esc(s.projectId)}/">${esc(s.projectName)}</a>` : ''}
      </div>
      <p class="sigsum">${esc(s.summary)}</p>
      ${s.implication ? `<p class="sigimp secondary">${esc(s.implication)}</p>` : ''}
      <div class="sigtop">${sourceChips(s.sourceIds)}</div>
      ${reviewable ? `<button type="button" class="sigread press" data-review="${esc(s.id)}"
        aria-pressed="false">Mark reviewed</button>` : ''}
    </div>
    <div class="sigside">
      <span class="sigdate">${esc(date(s.announcedAt))}</span>
      ${delta}
    </div>
  </li>`;
}

export function signalList(rows, {
  reviewable = true, anchor = false, emptyNote = 'No signal matches this filter.'
} = {}) {
  if (!rows.length) return `<p class="mnote">${esc(emptyNote)}</p>`;
  return `<ul class="siglist">${rows.map(s => signalRow(s, { reviewable, anchor })).join('')}</ul>`;
}

/* ================= contracts on a site ================= */

export function siteContracts(contracts) {
  if (!contracts.length) {
    return `<p class="mnote">No contract disclosure names this site. Where a company announces a customer
      without naming the location, the contract is held against the company rather than guessed onto a site.</p>`;
  }
  return `<div class="deps">` + contracts.map(c => `
    <div class="dep ok">
      <span class="depglyph" aria-hidden="true">§</span>
      <span>
        <span class="deplabel">${esc(c.customer)}</span>
        <span class="depstatus">${c.mw ? esc(mw(c.mw)) : NOT_DISCLOSED}${c.valueBn ? ` · ${esc(usdBn(c.valueBn))}` : ''}${c.years ? ` · ${esc(c.years)}-year term` : ''}</span>
      </span>
    </div>`).join('') + `</div>`;
}

/* ================= estimates ================= */

/**
 * An estimate, rendered so it can never be mistaken for a disclosure.
 *
 * It sits inside a `.est` block that the reader can switch off wholesale, it
 * leads with the tilde and the word ESTIMATED, and the derivation is on the page
 * rather than behind a tooltip. The assumption is one expand away.
 */
export function estimateBlock(e, { label = null } = {}) {
  if (!e) return '';
  return `<div class="est" data-estimate>
    <span class="estval">~${esc(mw(e.valueMw))}</span>
    <span class="esttag">Estimated</span>
    ${label ? `<span class="estlabel">${esc(label)}</span>` : ''}
    <span class="estderiv">${esc(e.derivation)}</span>
    <details class="estwhy">
      <summary>What is assumed</summary>
      <p>${esc(e.assumption)}</p>
      <p class="estrule">Rule: <b>${esc(e.ruleLabel)}</b>. Inputs are sourced;
        the assumption is T2C's. ${sourceChips(e.sourceIds)}</p>
    </details>
  </div>`;
}

/** A compact estimate for a card, where there is no room for the derivation. */
export function estimateChip(e, { suffix = '' } = {}) {
  if (!e) return '';
  return `<span class="estchip" data-estimate title="${esc(e.derivation + ' — ' + e.assumption)}">
    ~${esc(mw(e.valueMw))}${esc(suffix)} <i>est</i></span>`;
}

/* ================= Reality Score ================= */

/**
 * The score panel.
 *
 * When the composite cannot be justified the panel does not go blank — it shows
 * the factors that could be computed and names the ones that could not. An
 * "Unavailable" that explains itself is more useful than a number that does not.
 */
export function scorePanel(score) {
  const head = score.available
    ? `<div class="scorehead">
        <span class="scoreval ${esc(score.band)}">${score.score}</span>
        ${meter(score.score / 10, 10, {
          tone: score.band === 'strong' ? '' : score.band === 'mixed' ? 'warn' : 'bad',
          showLabel: false,
          label: `${score.score} out of 100 — ${score.bandLabel}`
        })}
        <span class="scoreband">${esc(score.bandLabel)}</span>
        <span class="scorederived">Derived · <a class="press" href="/methodology/#reality-score">how this is calculated</a></span>
      </div>`
    : `<div class="scorehead">
        <span class="scoreval nd">—</span>
        <span class="scoreband">Not enough published record to score</span>
        <span class="scorederived"><a class="press" href="/methodology/#reality-score">what would be needed</a></span>
      </div>
      <p class="mnote">${esc(score.reason)}</p>`;

  const rows = score.factors.map(f => `
    <div class="sfactor${f.available ? '' : ' is-missing'}">
      <span class="sflabel" title="${esc(FACTOR_BY_ID[f.id].definition)}">${esc(f.label)}</span>
      <span class="sfbar">${f.available
        ? meter(f.value * 12, 12, {
          tone: f.value >= 0.75 ? '' : f.value >= 0.5 ? 'warn' : 'bad',
          showLabel: false,
          label: `${f.label}: ${Math.round(f.value * 100)}% — ${f.detail}`
        })
        : `<span class="nd">Not available</span>`}</span>
      <span class="sfdetail">${esc(f.available ? f.detail : f.reason)}</span>
      <span class="sfweight" title="Share of the composite this factor carries.">${Math.round(f.weight * 100)}%</span>
    </div>`).join('');

  return `${head}
    <div class="sfactors">${rows}</div>
    ${score.available && score.thinNote
      ? `<p class="mnote warnnote">${esc(score.thinNote)}</p>` : ''}
    ${score.available && score.missing.length
      ? `<p class="mnote">Computed over ${Math.round(score.coverage * 100)}% of the score's weight.
          ${esc(score.missing.join(' and '))} could not be computed and ${score.missing.length === 1 ? 'is' : 'are'}
          excluded rather than counted as passing.</p>` : ''}`;
}

/* ================= capacity truth ================= */

/**
 * The four capacity figures side by side. Each states its own basis, because
 * announced gross power and billing critical IT are not the same quantity and
 * the row must not imply they can be subtracted from one another.
 */
export function capacityTruth(cells) {
  return `<div class="ctruth">` + cells.map(c => `
    <div class="ctcell">
      <span class="ctglyph" aria-hidden="true">${esc(c.glyph)}</span>
      <span class="ctval">${c.value === null
        ? (c.estimate
          ? `<span class="ctest" data-estimate>~${esc(mw(c.estimate.valueMw))}</span>`
          : `<span class="nd">${NOT_DISCLOSED}</span>`)
        : esc(c.value)}</span>
      <span class="ctlabel">${esc(c.label)}</span>
      <span class="ctbasis">${esc(c.basis)}</span>
      ${c.value === null && c.estimate
        ? `<span class="ctesttag" data-estimate title="${esc(c.estimate.derivation + ' — ' + c.estimate.assumption)}">Estimated · not disclosed</span>`
        : ''}
      ${c.value === null && !c.estimate
        ? `<span class="ctesttag ctnone">Nothing published to derive from</span>`
        : ''}
    </div>`).join('') + `</div>`;
}

/* ================= contract x-ray ================= */

/**
 * Firm against optional value, and what the disclosure does not say.
 *
 * A conditional maximum is never added to committed value: TeraWulf's $27bn
 * Meta ceiling is $12bn committed plus up to $15bn that depends on events which
 * have not happened.
 */
export function contractXray(contracts) {
  if (!contracts.length) {
    return `<p class="mnote">No contract disclosure for this company names megawatts or value.</p>`;
  }
  return `<div class="xray">` + contracts.map(c => {
    const optional = c.valueMaxBn && c.valueBn ? c.valueMaxBn - c.valueBn : null;
    return `<article class="xcard">
      <header class="xhead">
        <span class="xcust">${esc(c.customer)}</span>
        <span class="xmw">${c.mw ? esc(mw(c.mw)) : `<span class="nd">MW not disclosed</span>`}</span>
      </header>
      <dl class="xgrid">
        <div class="xitem ok">
          <dt>Firm</dt>
          <dd>${c.valueBn ? esc(usdBn(c.valueBn)) : `<span class="nd">${NOT_DISCLOSED}</span>`}</dd>
          <p>${c.years ? `${esc(c.years)}-year term, committed.` : 'Committed value.'}</p>
        </div>
        <div class="xitem${optional ? '' : ' is-missing'}">
          <dt>Optional</dt>
          <dd>${optional ? esc(usdBn(optional)) : `<span class="nd">None disclosed</span>`}</dd>
          <p>${optional
            ? 'Conditional on events that have not occurred. Never added to committed revenue.'
            : 'The company has disclosed no conditional upside on this agreement.'}</p>
        </div>
        <div class="xitem${c.deliveredMw ? ' ok' : ' is-missing'}">
          <dt>Delivered</dt>
          <dd>${c.deliveredMw ? esc(mw(c.deliveredMw)) : `<span class="nd">None yet</span>`}</dd>
          <p>${c.deliveredMw
            ? 'Accepted by the customer under this agreement.'
            : 'Contracted is not delivered. Nothing has been accepted under this agreement yet.'}</p>
        </div>
      </dl>
      ${c.terms ? `<p class="xterms">${esc(c.terms)}</p>` : ''}
      <div class="xsrc">${sourceChips(c.sourceIds)}</div>
    </article>`;
  }).join('') + `</div>`;
}

/* ================= revenue calculator ================= */

/**
 * The revenue calculator.
 *
 * Server-rendered with the company's own defaults so it says something useful
 * before the reader touches it, then recomputed in the browser as inputs change.
 * Every input row states what it rests on, because the difference between a
 * derived rate and an assumed multiple is the whole point.
 */
export function revenueCalculator(c, { billing, rate, price = null, bases = [] }) {
  const id = s => `rev-${c.slug}-${s}`;

  if (!billing || !rate) {
    const missing = [];
    if (!billing) missing.push('no capacity is disclosed or derivable as billing');
    if (!rate) missing.push('no contract discloses value, megawatts and term together, so no revenue rate can be derived');
    return `<p class="mnote">This company cannot be modelled: ${esc(missing.join('; '))}.
      A sector average would describe a different business, so none is substituted.
      <a class="press" href="/methodology/#estimates">How estimates work</a>.</p>`;
  }

  const basisTag = (text, tone) =>
    `<span class="rvbasis ${esc(tone)}">${esc(text)}</span>`;

  return `<div class="revcalc" id="${id('root')}"
      data-rate="${rate.perMwYearM}" data-shares=""
      data-ticker="${esc(c.ticker)}" data-live-price="${price === null ? '' : price}">

    ${bases.length > 1 ? `<div class="rvpresets" role="group" aria-label="Which capacity to model">
      ${bases.map((b, i) => `<button type="button" class="rvpreset press${i === 0 ? ' is-selected' : ''}"
        data-mw="${b.valueMw}" aria-pressed="${i === 0}"
        title="${esc(b.definition)}">${esc(b.label)}<span>${esc(mw(b.valueMw))}</span></button>`).join('')}
    </div>
    <p class="rvpresetnote">Every option above is measured as <b>critical IT</b>, the same basis the
      revenue rate is derived on. Secured power is deliberately absent: it is gross power at the
      utility connection, and applying a per-MW contract rate to it would price megawatts that cannot
      be sold as compute.</p>` : ''}

    <div class="rvinputs">
      <div class="rvrow">
        <label for="${id('mw')}">Capacity modelled</label>
        <div class="rvfield">
          <input type="number" id="${id('mw')}" value="${billing.valueMw}" min="0" step="1" inputmode="decimal" />
          <span class="rvunit">MW</span>
        </div>
        ${basisTag(billing.isEstimate ? 'Estimated by T2C from accepted capacity' : 'Disclosed by the company',
          billing.isEstimate ? 'est' : 'ok')}
      </div>

      <div class="rvrow">
        <label for="${id('rate')}">Revenue per MW / year</label>
        <div class="rvfield">
          <span class="rvunit pre">$</span>
          <input type="number" id="${id('rate')}" value="${rate.displayPerMwYearM}" min="0" step="0.01" inputmode="decimal" />
          <span class="rvunit">m</span>
        </div>
        ${basisTag('Derived from ' + c.ticker + '’s own contracts', 'ok')}
        <p class="rvderiv">${esc(rate.derivation)}</p>
      </div>

      <div class="rvrow">
        <label for="${id('mult')}">EV / revenue multiple</label>
        <div class="rvfield">
          <input type="number" id="${id('mult')}" value="6" min="0.5" max="30" step="0.5" inputmode="decimal" />
          <span class="rvunit">×</span>
        </div>
        ${basisTag('An opinion — not a disclosure', 'opinion')}
      </div>

      <div class="rvrow">
        <label for="${id('shares')}">Shares outstanding</label>
        <div class="rvfield">
          <input type="number" id="${id('shares')}" placeholder="—" min="0" step="0.1" inputmode="decimal" />
          <span class="rvunit">m</span>
        </div>
        ${basisTag('Fetching from the provider…', 'pending')}
      </div>
    </div>

    <div class="rvout" id="${id('out')}" aria-live="polite">
      <div class="rvline">
        <span class="rvlabel">Run-rate revenue</span>
        <span class="rvval" data-out="revenue">—</span>
      </div>
      <div class="rvline">
        <span class="rvlabel">Implied enterprise value</span>
        <span class="rvval" data-out="ev">—</span>
      </div>
      <div class="rvline rvbig">
        <span class="rvlabel">Enterprise value per share</span>
        <span class="rvval" data-out="pershare">—</span>
      </div>
      <div class="rvline">
        <span class="rvlabel">Against the live price</span>
        <span class="rvval" data-out="upside">—</span>
      </div>
    </div>

    <div class="tw">
      <table class="rvsens" id="${id('sens')}">
        <caption>How much of that is the multiple</caption>
        <thead><tr><th scope="col">EV / revenue</th><th scope="col">Enterprise value</th>
          <th scope="col">Per share</th><th scope="col">vs price</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>

    <p class="mnote warnnote" data-out="caveat"></p>
  </div>`;
}

/* ================= Mission Control homepage ================= */

/**
 * Hotspot anchor points over the campus illustration.
 *
 * These are positions on a drawing, not coordinates. The data carries no
 * latitude or longitude for any site, so the map is explicitly schematic and
 * says so on the page. Anchors are named after what they sit on in the artwork
 * so the pairing stays stable if the list of sites changes.
 */
const CAMPUS_ANCHORS = [
  { id: 'hall-b', x: 55, y: 22, place: 'right' },
  { id: 'hall-a', x: 32, y: 40, place: 'left' },
  { id: 'hall-c', x: 72, y: 45, place: 'right' },
  { id: 'substation', x: 24, y: 62, place: 'left' }
];

/**
 * The infrastructure map.
 *
 * Every hotspot is a real site and navigates to it. The surface behind them is a
 * link to the Sites explorer, placed underneath rather than wrapping the
 * hotspots, so a hotspot click can never trigger both.
 */
export function infrastructureMap(sites) {
  const pinned = sites.slice(0, CAMPUS_ANCHORS.length);

  const hotspots = pinned.map((s, i) => {
    const a = CAMPUS_ANCHORS[i];
    const stage = furthestStage(s);
    return `<a class="hot press hot-${esc(a.place)}" href="/sites/${esc(s.slug)}/"
        style="left:${a.x}%;top:${a.y}%"
        data-site="${esc(s.slug)}"
        aria-label="${esc(`${s.name}, ${s.ticker || s.companyName} — ${stage ? stage.label : 'no stage evidenced'}`)}">
      <span class="hotdot" aria-hidden="true"></span>
      <span class="hotcard">
        <span class="hotname">${esc(s.name)}</span>
        <span class="hotcap">${s.capacityMw === null ? NOT_DISCLOSED : esc(mw(s.capacityMw))}</span>
        <span class="hotstage">${esc(stage ? stage.label : 'No stage evidenced')}</span>
      </span>
    </a>`;
  }).join('');

  return `<div class="map" id="infraMap">
    <div class="mapview" id="mapView">
      <picture>
        <source srcset="/assets/campus.webp" type="image/webp" />
        <img class="mapimg" id="mapImg" src="/assets/campus.png" alt=""
          width="1200" height="800" decoding="async" fetchpriority="low" />
      </picture>
      <a class="mapsurface" href="/sites/" aria-label="Open the Sites explorer"></a>
      ${hotspots}
      <div class="mapfx" id="mapFx" aria-hidden="true">
        <span class="vehicle" id="mapVehicle" data-dir="e" hidden></span>
      </div>

      <div class="mapctl" role="group" aria-label="Map controls">
        <button class="mapbtn press" type="button" id="mapIn" aria-label="Zoom in">+</button>
        <button class="mapbtn press" type="button" id="mapOut" aria-label="Zoom out">−</button>
        <button class="mapbtn press" type="button" id="mapReset" aria-label="Recentre the map">◎</button>
      </div>
    </div>

    <p class="mapnote">Schematic. The illustration is generic campus artwork and the pin positions are
      drawing coordinates — they are not geographic, and no tracked company publishes site coordinates.
      <span class="taphint">Tap a pin to open its site.</span> Each pin opens the real site record behind it.</p>
  </div>`;
}

/** The watchlist rows. Client state decides which are watched; the markup carries all of them. */
export function watchlistPanel(rows) {
  return `<ul class="watchlist" id="watchList">` + rows.map(r => `
    <li class="wrow" data-ticker="${esc(r.ticker)}">
      <a class="wmain press" href="/companies/${esc(r.slug)}/">
        <span class="wtick">${esc(r.ticker)}</span>
        <span class="wbody">
          <span class="wname">${esc(r.name)}</span>
          <span class="wmeta">${esc(r.sitesLabel)}</span>
        </span>
        <span class="wstage">${esc(r.stageLabel)}</span>
      </a>
      <button class="wbtn press" type="button" data-watch="${esc(r.ticker)}"
        aria-pressed="false" aria-label="Watch ${esc(r.name)}">
        <span aria-hidden="true">☆</span>
      </button>
    </li>`).join('') + `</ul>
    <p class="watchempty" id="watchEmpty" hidden>You are not watching anything yet. Star a company to
      pin it here.</p>
    <a class="cta ghost press wall" href="/companies/?filter=watching">View all watchlist →</a>`;
}

/** Finite progress across the day's signals. Each node opens its own signal. */
export function signalProgress(rows) {
  return `<div class="prog" id="signalProgress">
    <div class="proghead">
      <span class="progglyph" aria-hidden="true">⚡</span>
      <span class="progcount" id="progCount" aria-live="polite">${rows.length}
        ${rows.length === 1 ? 'signal' : 'signals'} · 0 reviewed</span>
    </div>
    <ol class="prognodes" aria-label="Today's signals">
      ${rows.map((s, i) => `<li>
        <a class="pnodebtn press" href="/intelligence/#${esc(s.id)}" data-node="${esc(s.id)}"
           aria-label="${esc(`Signal ${i + 1} of ${rows.length}: ${s.summary}`)}">
          <span aria-hidden="true">${i + 1}</span>
        </a>
      </li>`).join('')}
    </ol>
    <a class="cta primary press" href="/intelligence/?view=today">View all signals →</a>
  </div>`;
}

/** The guided window for the next milestone, printed as a window and never as a date. */
export function nextMilestonePanel(next) {
  if (!next) {
    return `<p class="mnote">Every tracked stage on this site is complete.</p>`;
  }
  const s = next.schedule;
  const when = !s ? 'No date or window has been guided.'
    : s.kind === 'exact' ? `Guided for ${date(s.exact)}`
      : s.kind === 'window' ? `Guided for ${windowLabel(s.start, s.end)}`
        : 'No date or window has been guided.';
  return `<div class="nextmile">
    <span class="mkicker">Next</span>
    <p class="sigsum">${esc(next.label)}</p>
    <p class="mnote">${esc(when)}${s?.scope ? ` · applies to ${esc(s.scope)}` : ''}</p>
    ${s?.sourceIds?.length ? sourceChips(s.sourceIds) : ''}
  </div>`;
}

