/**
 * Supplier Passport components.
 *
 * The first screen answers, in under ten seconds: what this company supplies,
 * where it sits in the chain, how far its commerce has got, how good the
 * evidence is, and what could break the thesis.
 *
 * The radar is the piece that most easily becomes decoration. Every axis is
 * labelled, carries its own computed detail, and states how it was derived; an
 * axis that cannot be computed is drawn as a gap in the ring rather than as a
 * zero, because "not disclosed" and "scored badly" are different claims and the
 * shape must not conflate them.
 */
import { esc, mw, pct } from './lib/format.js';
import { STAGES } from './lib/chain.js';

/* ================= header ================= */

export function passportHeader(p) {
  const s = p.score;
  return `<div class="pp-head">
    <div class="pp-fact">
      <span class="pp-factlabel">Chain position</span>
      <span class="pp-factval">${esc(p.position.label)}</span>
      <span class="pp-factnote">${esc(p.position.plain)}</span>
    </div>
    <div class="pp-fact">
      <span class="pp-factlabel">Commercial momentum</span>
      <span class="pp-factval ${esc(p.momentum.tone)}">${esc(p.momentum.label)}</span>
      <span class="pp-factnote">${esc(p.momentum.plain)}</span>
    </div>
    <div class="pp-fact">
      <span class="pp-factlabel">Evidence confidence</span>
      <span class="pp-factval">${s.available
        ? `${s.score}<span class="pp-outof">/100</span>`
        : '<span class="nd">Unavailable</span>'}</span>
      <span class="pp-factnote">${s.available
        ? esc(s.bandLabel)
        : 'Too little published record to score — see the breakdown below.'}</span>
    </div>
  </div>`;
}

/* ================= where it sits ================= */

/**
 * The company's position in the seven-stage chain. Stages T2C does not track are
 * shown as gaps here too, so a reader never infers that this company's absence
 * upstream means anything about the company.
 */
export function whereItSits(p) {
  return `<ol class="pp-chain" aria-label="Position in the AI supply chain">
    ${STAGES.map(st => {
      const here = st.id === 'factory';
      const cls = here ? 'is-here' : st.tracked ? 'is-tracked' : 'is-gap';
      return `<li class="pp-chainstep ${cls}">
        <span class="pp-chaindot" aria-hidden="true">${here ? '●' : st.tracked ? '○' : '—'}</span>
        <span class="pp-chainlabel">${esc(st.label)}</span>
        ${here ? '<span class="pp-chainyou">This company</span>' : ''}
      </li>`;
    }).join('')}
  </ol>
  <p class="ed-note">T2C tracks the delivery end of the chain. The four upstream stages are not
    tracked for any company, so their emptiness here says nothing about
    ${esc(p.company.name)} specifically.</p>`;
}

/* ================= radar ================= */

/**
 * A pentagon radar drawn as inline SVG.
 *
 * Every axis also appears as a labelled row beneath, so the chart is never the
 * only way to read the numbers — and a screen reader gets the figures rather
 * than a description of a shape.
 */
export function bottleneckRadar(radar, companyName) {
  const n = radar.axes.length;
  const R = 78, CX = 100, CY = 92;
  const pt = (i, r) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
  };
  const ring = f => radar.axes.map((_, i) => pt(i, R * f).map(v => v.toFixed(1)).join(',')).join(' ');

  // Only computable axes contribute a vertex; the shape breaks where data stops.
  const shape = radar.axes
    .map((a, i) => (a.available ? pt(i, R * Math.max(a.value, 0.04)) : null));
  const segments = [];
  let run = [];
  for (let i = 0; i <= n; i++) {
    const v = shape[i % n];
    if (v) run.push(v.map(x => x.toFixed(1)).join(','));
    else { if (run.length > 1) segments.push(run.join(' ')); run = []; }
  }
  if (run.length > 1) segments.push(run.join(' '));

  return `<div class="pp-radarwrap">
    <svg class="pp-radar" viewBox="0 0 200 190" role="img"
      aria-label="${esc(`Bottleneck radar for ${companyName}. ${radar.available} of ${radar.total} axes can be computed. Figures are listed below the chart.`)}">
      ${[0.25, 0.5, 0.75, 1].map(f =>
        `<polygon points="${ring(f)}" fill="none" stroke="currentColor" stroke-opacity=".16"/>`).join('')}
      ${radar.axes.map((_, i) => {
        const [x, y] = pt(i, R);
        return `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"
          stroke="currentColor" stroke-opacity=".16"/>`;
      }).join('')}
      ${segments.map(s =>
        `<polyline points="${s}" fill="none" stroke="var(--warn)" stroke-width="2"
          stroke-linejoin="round"/>`).join('')}
      ${radar.axes.map((a, i) => {
        if (!a.available) return '';
        const [x, y] = pt(i, R * Math.max(a.value, 0.04));
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="var(--warn)"/>`;
      }).join('')}
    </svg>

    <ol class="pp-axes">
      ${radar.axes.map(a => `<li class="pp-axis${a.available ? '' : ' is-missing'}">
        <span class="pp-axislabel" title="${esc(a.how)}">${esc(a.label)}</span>
        <span class="pp-axisval">${a.available ? esc(pct(a.value)) : '<span class="nd">Not available</span>'}</span>
        <span class="pp-axisdetail">${esc(a.available ? a.detail : a.reason)}</span>
      </li>`).join('')}
    </ol>
  </div>
  <p class="ed-note">Each axis is derived from published records and hovering its name shows how.
    An axis that cannot be computed breaks the shape rather than reading as zero — nothing published
    is not the same as a poor result.</p>`;
}

/* ================= dependency and geography ================= */

export function dependencyRisk(p) {
  const c = p.concentration;
  return `<div class="pp-dep">
    <div class="pp-depblock">
      <span class="pp-factlabel">Customer concentration</span>
      ${c.available
        ? `<span class="pp-depbig">${esc(pct(c.largest.share))}</span>
           <span class="pp-factnote">of ${esc(mw(c.totalMw))} disclosed contracted capacity sits with
             <b>${esc(c.largest.name)}</b>, across ${c.customers}
             customer${c.customers === 1 ? '' : 's'}.</span>
           <ul class="pp-deplist">
             ${c.rows.map(r => `<li>
               <span class="pp-depname">${esc(r.name)}</span>
               <span class="pp-depbar" role="img" aria-label="${esc(`${pct(r.share)} of disclosed contracted capacity`)}">
                 <i style="width:${(r.share * 100).toFixed(1)}%"></i></span>
               <span class="pp-depmw">${esc(mw(r.mw))}</span>
             </li>`).join('')}
           </ul>
           ${c.excluded ? `<p class="ed-note">${c.excluded === 1
             ? '1 disclosed contract states no megawatts and is'
             : `${c.excluded} disclosed contracts state no megawatts and are`}
             excluded from this measure.</p>` : ''}`
        : `<span class="pp-depbig nd">Not measurable</span>
           <span class="pp-factnote">${esc(c.reason)}</span>`}
    </div>

    <div class="pp-depblock">
      <span class="pp-factlabel">Geographic exposure</span>
      <span class="pp-depbig">${p.geography.countries}
        ${p.geography.countries === 1 ? 'country' : 'countries'}</span>
      <span class="pp-factnote">${p.geography.total} tracked
        site${p.geography.total === 1 ? '' : 's'}.</span>
      <ul class="pp-deplist">
        ${p.geography.rows.map(r => `<li>
          <span class="pp-depname">${esc(r.country)}</span>
          <span class="pp-depbar" role="img" aria-label="${esc(`${r.count} of ${p.geography.total} sites`)}">
            <i style="width:${(r.share * 100).toFixed(1)}%"></i></span>
          <span class="pp-depmw">${r.count}</span>
        </li>`).join('')}
      </ul>
    </div>
  </div>`;
}

export function thesisRiskPanel(risks) {
  if (!risks.length) {
    return `<p class="ed-note">No unresolved gate, concentration or missing disclosure is recorded
      against this company.</p>`;
  }
  return `<ul class="pp-risks">
    ${risks.map(r => `<li><span aria-hidden="true">⚠</span> ${esc(r)}</li>`).join('')}
  </ul>
  <p class="ed-note">Assembled from the records, not from opinion: each item names an unresolved gate,
    a measured concentration, or a disclosure that does not exist.</p>`;
}
