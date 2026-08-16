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
  const bar = meter(evidence.share * 6, 6, {
    tone: confidenceTone(evidence.level),
    label: `${evidence.label} confidence`
  });
  return {
    value: `<span class="conflevel ${esc(evidence.level)}">${esc(evidence.label)}</span> ${bar}`,
    label: `Evidence confidence · ${evidence.confirmed} of ${evidence.total} gates confirmed`
  };
}

/* ================= delivery path ================= */

const STEP_GLYPH = {
  complete: '✓', inProgress: '◐', conditional: '◑', notStarted: '○', notDisclosed: '—'
};

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
      : `<span class="pstatus">${esc(GATE_STATUS[s.status].label)}</span>`;

    const inner = `<span class="pnode" aria-hidden="true">${STEP_GLYPH[s.status]}</span>
      <span class="plabel">${esc(s.short || s.label)}</span>
      ${detail}`;

    const evidenced = s.sourceIds.length > 0;
    const title = `${s.label} — ${GATE_STATUS[s.status].label}. Evidenced by: ${s.gates.join(', ') || 'no gate on record'}.`;

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
  const cap = site.capacityMw === null
    ? `<span class="nd">${NOT_DISCLOSED}</span>`
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
      <span class="sitecardcap">${cap}</span>
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
    const cls = ['lstep', s.status === 'complete' ? 'done' : '', isNow ? 'now' : '',
      s.status === 'notDisclosed' ? 'nd' : ''].filter(Boolean).join(' ');
    return `<li class="${cls}">
      <span class="lnode" aria-hidden="true">${STEP_GLYPH[s.status]}</span>
      <div class="lbody">
        <span class="llabel">${esc(s.label)}</span>
        <div class="lmeta">${esc(GATE_STATUS[s.status].label)}${s.effectiveAt ? ` · ${esc(date(s.effectiveAt))}` : ''}
          ${s.sourceIds.length ? ' · ' + sourceChips(s.sourceIds) : ''}</div>
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

export function signalRow(s, { reviewable = true } = {}) {
  const delta = s.previousValue !== null && s.newValue !== null && s.unit
    ? `<span class="sigdelta ${esc(s.direction || '')}">${esc(s.previousValue)} → ${esc(s.newValue)} ${esc(s.unit)}</span>`
    : s.newValue !== null && s.unit
      ? `<span class="sigdelta">${esc(s.newValue)} ${esc(s.unit)}</span>`
      : '';

  return `<li class="sig ${esc(s.tone)}" data-cat="${esc(s.category)}" data-id="${esc(s.id)}"
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

export function signalList(rows, { reviewable = true, emptyNote = 'No signal matches this filter.' } = {}) {
  if (!rows.length) return `<p class="mnote">${esc(emptyNote)}</p>`;
  return `<ul class="siglist">${rows.map(s => signalRow(s, { reviewable })).join('')}</ul>`;
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
