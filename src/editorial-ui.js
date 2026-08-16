/**
 * Editorial homepage components.
 *
 * The audience-led homepage: one dominant story, consequence before detail, and
 * every figure still carrying the evidence that makes it checkable.
 *
 * Two rules run through all of it:
 *   - Imagery is illustrative and says so. No generated picture is ever
 *     presented as evidence of a named project, and no claim, figure or logo is
 *     baked into a bitmap — every word here is selectable HTML.
 *   - Nothing is drawn by colour alone. Stage, confidence and direction each
 *     carry a word as well as a hue.
 */
import { esc, mw, date, NOT_DISCLOSED } from './lib/format.js';
import { sourceChips, evidenceChip } from './ui.js';
import { furthestStage } from './lib/sites.js';
import { ALL_ASSET_WIDTHS } from './lib/assets.js';

/* ================= imagery ================= */

/**
 * Responsive illustrative image.
 *
 * WebP with a PNG fallback, intrinsic dimensions on the <img> so nothing shifts
 * as it loads, and only the hero is allowed to load eagerly.
 */
export function illustration(asset, { eager = false, sizes = '100vw', className = '' } = {}) {
  const w = asset.intrinsic.width, h = asset.intrinsic.height;
  const srcset = ALL_ASSET_WIDTHS
    .map(n => `/assets/t2c/images/${asset.id}-${n}.webp ${n}w`).join(', ');

  return `<img class="ed-img ${esc(className)}"
    src="/assets/t2c/images/${esc(asset.id)}.png"
    srcset="${srcset}"
    sizes="${esc(sizes)}"
    width="${w}" height="${h}"
    style="object-position:${esc(asset.objectPosition)}"
    alt="${esc(asset.alt)}"
    ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" fetchpriority="low"'}
    decoding="async" />`;
}

/** The disclosure that must accompany every generated image. */
export const disclosure = text =>
  `<p class="ed-disclosure"><span aria-hidden="true">◇</span> ${esc(text)}</p>`;

/* ================= lead story ================= */

const STATE_GLYPH = { complete: '✓', current: '◉', pending: '○', unknown: '—' };

/**
 * The delivery rail.
 *
 * Each stage is a button carrying both label layers and its status in text. A
 * stage with evidence opens it; a stage with none says so rather than offering a
 * control that does nothing.
 */
export function deliveryRail(rail, { idPrefix = 'rail' } = {}) {
  return `<div class="ed-railwrap">
    <ol class="ed-rail" aria-label="Delivery journey">
      ${rail.map(step => {
        const evidenced = step.sourceIds && step.sourceIds.length > 0;
        const label = `${step.simple} — ${step.detailed}. ${step.statusLabel}${step.effectiveAt ? `, ${date(step.effectiveAt)}` : ''}.`;
        const inner = `<span class="ed-railnode" aria-hidden="true">${STATE_GLYPH[step.state]}</span>
          <span class="ed-railsimple">${esc(step.simple)}</span>
          <span class="ed-raildetail">${esc(step.detailed)}</span>
          <span class="ed-railstate">${esc(step.statusLabel)}</span>`;
        return `<li class="ed-railstep is-${esc(step.state)}">
          ${evidenced
            ? `<button type="button" class="ed-railbtn press" aria-expanded="false"
                 aria-controls="${esc(idPrefix)}-${esc(step.id)}"
                 aria-label="${esc(label)} Show the evidence.">${inner}</button>
               <div class="ed-railev" id="${esc(idPrefix)}-${esc(step.id)}" hidden>
                 ${sourceChips(step.sourceIds)}
               </div>`
            : `<span class="ed-railbtn is-inert" role="text" aria-label="${esc(label)}">${inner}</span>`}
        </li>`;
      }).join('')}
    </ol>
  </div>`;
}

const WATCH_TONE = {
  'On track': 'ok', 'Unresolved': 'warn', 'Pending evidence': 'warn', 'Date unknown': 'dim'
};

export function investorWatch(items) {
  if (!items.length) {
    return `<p class="ed-note">No unresolved item is recorded against this story.</p>`;
  }
  return `<aside class="ed-watch" aria-labelledby="ed-watch-h">
    <h2 class="ed-watchh" id="ed-watch-h">What investors are watching</h2>
    <ul class="ed-watchlist">
      ${items.map(w => `<li class="ed-watchrow">
        <a class="ed-watchlink press" href="${esc(w.href)}">
          <span class="ed-watchstate ${esc(WATCH_TONE[w.state] || 'dim')}">${esc(w.state)}</span>
          <span class="ed-watchbody">
            <span class="ed-watchtitle">${esc(w.title)}</span>
            <span class="ed-watchdetail">${esc(w.detail)}</span>
          </span>
          <span class="ed-watchgo" aria-hidden="true">›</span>
        </a>
      </li>`).join('')}
    </ul>
  </aside>`;
}

/**
 * The lead story hero.
 *
 * The headline is an <h1> in HTML over the illustration, never part of it. The
 * evidence badge states confidence and source type in words.
 */
export function leadStoryHero(story, heroAsset) {
  if (!story.available) {
    return `<section class="ed-hero is-empty">
      <div class="t2c-shell ed-heroin">
        <p class="ed-eyebrow">The physical race behind AI</p>
        <h1 class="ed-headline">No confirmed delivery record yet</h1>
        <p class="ed-consequence">${esc(story.reason)}</p>
        <a class="ed-cta secondary press" href="/methodology/">How T2C verifies a record</a>
      </div>
    </section>`;
  }

  const badge = `${story.confidence === 'confirmed' ? 'High confidence' : 'Reported'} · ${
    story.confidence === 'confirmed' ? 'Primary source' : 'Original document not linked'}`;

  return `<section class="ed-hero" aria-labelledby="ed-headline">
    <div class="ed-heromedia t2c-media">
      ${illustration(heroAsset, { eager: true, sizes: '100vw' })}
    </div>

    <div class="t2c-shell ed-heroin">
      <div class="ed-herocopy">
        <p class="ed-eyebrow">The physical race behind AI</p>
        <h1 class="ed-headline" id="ed-headline">${esc(story.headline)}</h1>
        <p class="ed-consequence">${esc(story.consequence)}</p>

        <div class="ed-heroacts">
          <button type="button" class="ed-cta primary press" id="whyBtn"
            aria-haspopup="dialog" aria-controls="whyDrawer">
            Why this matters <span aria-hidden="true">→</span>
          </button>
          <a class="ed-cta secondary press" href="#evidence">
            View the evidence <span aria-hidden="true">→</span>
          </a>
        </div>

        <p class="ed-badge" data-evidence="${esc(story.confidence)}">
          <span class="ed-icon" data-icon="verified-shield" aria-hidden="true"></span>
          ${esc(badge)}
          <span class="ed-badgedate">· ${esc(date(story.announcedAt))}</span>
        </p>

        ${disclosure(`${heroAsset.disclosure} Open the project record for the underlying evidence.`)}
      </div>

      ${investorWatch(story.watching)}
    </div>

    <div class="t2c-shell">
      ${deliveryRail(story.rail, { idPrefix: 'lead' })}
    </div>
  </section>`;
}

/**
 * The "why this matters" drawer.
 *
 * A summary of records already on the site, in the copy deck's fixed section
 * order. It is a <dialog>, so focus containment and Escape come from the
 * platform rather than from hand-written key handling.
 */
export function whyDrawer(story) {
  if (!story.available) return '';
  const section = (h, body) => `<section class="ed-drawersec">
    <h3>${esc(h)}</h3>${body}</section>`;

  return `<dialog class="ed-drawer" id="whyDrawer" aria-labelledby="ed-drawer-h">
    <div class="ed-drawerin">
      <header class="ed-drawerhead">
        <h2 id="ed-drawer-h">${esc(story.headline)}</h2>
        <button type="button" class="ed-drawerclose press" id="whyClose" aria-label="Close">
          <span aria-hidden="true">✕</span>
        </button>
      </header>
      <div class="ed-drawerbody">
        ${section('What happened', `<p>${esc(story.whatHappened)}</p>`)}
        ${section('Why it matters', `<p>${esc(story.whyItMatters)}</p>`)}
        ${section('What changed', `<p>${esc(story.whatChanged)}</p>`)}
        ${section('What happens next', `<p>${esc(story.whatHappensNext)}</p>`)}
        ${section('What could block it',
          `<ul class="ed-blockers">${story.blockers.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`)}
        ${section('View the evidence',
          `<div class="ed-drawersrc">${sourceChips(story.sourceIds)}</div>
           <p class="ed-note">This drawer summarises records already published on this site. It adds
             no new claim.</p>
           ${story.projectSlug
             ? `<a class="ed-cta secondary press" href="/sites/${esc(story.projectSlug)}/">Open the project record →</a>`
             : story.companySlug
               ? `<a class="ed-cta secondary press" href="/companies/${esc(story.companySlug)}/">Open the company record →</a>`
               : ''}`)}
      </div>
    </div>
  </dialog>`;
}

/* ================= returning user ================= */

export function returningSummary() {
  return `<section class="ed-return" id="returnSummary" aria-live="polite">
    <div class="ed-returnin">
      <p class="ed-returnhead" id="returnHead">Checking what changed…</p>
      <p class="ed-returnsub" id="returnSub"></p>
    </div>
    <a class="ed-cta secondary press" id="returnCta" href="/intelligence/?view=since-last-visit">
      Review the changes →
    </a>
  </section>`;
}

/* ================= buildout grid ================= */

export function deliveryLeaders(rows) {
  return `<ol class="ed-leaders">
    ${rows.map(r => `<li class="ed-leader">
      <a class="ed-leadlink press" href="/companies/${esc(r.slug)}/">
        <span class="ed-leadtick">${esc(r.ticker)}</span>
        <span class="ed-leadrail" role="img"
          aria-label="${esc(`${r.ticker}: furthest evidenced stage is ${r.stageLabel}, stage ${r.position} of 7. ${r.completeCount} of 7 stages evidenced.`)}">
          ${r.stages.map(on => `<i class="${on ? 'on' : ''}"></i>`).join('')}
        </span>
        <span class="ed-leadstage">${esc(r.stageLabel)}</span>
      </a>
    </li>`).join('')}
  </ol>
  <p class="ed-note">Ranked by the furthest delivery stage T2C can verify — not by announced capacity
    or share price. Ties are broken by the earlier evidenced date, then by ticker.</p>`;
}

export function nextCatalystCard(c) {
  if (!c) {
    return `<p class="ed-bignum nd">No exact date has been disclosed.</p>
      <p class="ed-note">No dated catalyst is on record for the tracked set.</p>`;
  }
  const certaintyLabel = c.certainty === 'exact' ? 'Confirmed date'
    : c.certainty === 'guided_window' ? 'Guided window' : 'Date unknown';
  return `<p class="ed-bignum ${c.certainty === 'exact' ? '' : 'is-soft'}">${esc(c.when)}</p>
    <p class="ed-certainty is-${esc(c.certainty)}">
      <span aria-hidden="true">${c.certainty === 'exact' ? '●' : c.certainty === 'guided_window' ? '◐' : '○'}</span>
      ${esc(certaintyLabel)}</p>
    <p class="ed-catco"><b>${esc(c.ticker)}</b> ${esc(c.title)}</p>
    ${c.certainty === 'guided_window'
      ? `<p class="ed-note">A guided window is a period the company named, not a deadline. It is never
          shown as an exact date.</p>` : ''}`;
}

/**
 * Promise versus reality.
 *
 * The two figures are shown side by side and are NEVER subtracted, ratioed or
 * turned into a percentage: they are different measurement bases at different
 * evidence stages. Each prints its own basis, qualifier and as-of date, and the
 * caveat is mandatory whenever the bases differ.
 */
export function promiseReality(pair) {
  if (!pair) {
    return `<p class="ed-note">No company publishes both an announced figure and a verified delivery
      figure on a basis that can be shown side by side.</p>`;
  }
  const cell = (m, label, tone) => `<div class="ed-prcell ${esc(tone)}">
    <span class="ed-prlabel">${esc(label)}</span>
    <span class="ed-prval">${m.value === null ? NOT_DISCLOSED : esc(mw(m.value))}</span>
    <span class="ed-prmeta">${esc(m.qualifierLabel)}</span>
    <span class="ed-prmeta">${esc(m.basisLabel)}</span>
    <span class="ed-prmeta">as of ${esc(date(m.asOf))}</span>
  </div>`;

  return `<div class="ed-promise">
    ${cell(pair.promise, 'Announced or potential', 'is-promise')}
    ${cell(pair.reality, 'Verified current stage', 'is-reality')}
  </div>
  <p class="ed-caveat">${esc(pair.caveat)}</p>`;
}

const LENSES = [
  { id: 'investments', label: 'My investments' },
  { id: 'race', label: 'The AI race' },
  { id: 'power', label: 'Power & communities' }
];

/**
 * The audience lens.
 *
 * Selecting a lens changes the EXPLANATION only. It does not filter, reorder or
 * recalculate a single research fact — the panels below are static prose chosen
 * at build time from what the data already supports.
 */
export function audienceLens(copy) {
  return `<div class="ed-lens">
    <div class="ed-lenstabs" role="tablist" aria-label="Choose your lens">
      ${LENSES.map((l, i) => `<button type="button" class="ed-lenstab press" role="tab"
        id="lens-tab-${esc(l.id)}" aria-controls="lens-panel-${esc(l.id)}"
        aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}"
        data-lens="${esc(l.id)}">${esc(l.label)}</button>`).join('')}
    </div>
    ${LENSES.map((l, i) => `<div class="ed-lenspanel" role="tabpanel"
      id="lens-panel-${esc(l.id)}" aria-labelledby="lens-tab-${esc(l.id)}"
      ${i === 0 ? '' : 'hidden'}>${copy[l.id]}</div>`).join('')}
    <p class="ed-note">Choosing a lens changes the explanation only. It never changes, filters or
      recalculates a research figure.</p>
  </div>`;
}

/* ================= megaprojects ================= */

export function megaprojectCard(site, asset) {
  const stage = furthestStage(site);
  const next = site.next;
  const customer = site.contracts.length
    ? [...new Set(site.contracts.map(c => c.customer))].join(', ')
    : null;

  return `<article class="ed-project">
    <div class="ed-projmedia t2c-media">
      ${illustration(asset, { sizes: '(min-width: 900px) 33vw, 100vw' })}
      <span class="ed-projstage">${esc(stage ? stage.label : 'No stage evidenced')}</span>
    </div>
    <div class="ed-projbody">
      <p class="ed-projop">${esc(site.ticker || site.companyName)} · ${esc(site.countryName)}</p>
      <h3 class="ed-projname">${esc(site.name)}</h3>
      <dl class="ed-projfacts">
        <div><dt>Customer</dt><dd>${customer ? esc(customer) : `<span class="nd">${NOT_DISCLOSED}</span>`}</dd></div>
        <div><dt>Capacity</dt><dd>${site.capacityMw === null
          ? `<span class="nd">${NOT_DISCLOSED}</span>` : esc(mw(site.capacityMw))}</dd></div>
        <div><dt>Next gate</dt><dd>${next ? esc(next.label) : 'All tracked stages complete'}</dd></div>
      </dl>
      <p class="ed-projev">${site.evidence
        ? `${esc(site.evidence.label)} evidence — ${site.evidence.confirmed} of ${site.evidence.total} gates confirmed`
        : 'Too few reported gates to characterise'}</p>
      <a class="ed-cta secondary press" href="/sites/${esc(site.slug)}/">Open project record →</a>
      ${disclosure('Illustrative image; not site evidence.')}
    </div>
  </article>`;
}

/* ================= explainer ================= */

export function explainer(steps, asset) {
  return `<div class="ed-explainer">
    <div class="ed-explmedia t2c-media">
      ${illustration(asset, { sizes: '(min-width: 900px) 50vw, 100vw' })}
    </div>
    <div class="ed-explbody">
      <p class="ed-eyebrow">60-second explainer</p>
      <h2 class="ed-explh" id="expl-h">How an AI data centre makes money</h2>

      <ol class="ed-steps" id="explSteps">
        ${steps.map((s, i) => `<li class="ed-step${i === 0 ? ' is-current' : ''}" data-step="${i}">
          <span class="ed-stepn" aria-hidden="true">${i + 1}</span>
          <span class="ed-steptext">${esc(s)}</span>
        </li>`).join('')}
      </ol>

      <div class="ed-explacts">
        <button type="button" class="ed-cta primary press" id="explStart">Start</button>
        <button type="button" class="ed-cta secondary press" id="explNext" hidden>Next step</button>
        <p class="ed-explstatus" id="explStatus" role="status">
          Step 1 of ${steps.length}. Press start to step through.
        </p>
      </div>

      <p class="ed-caveat">Acceptance and billing are different stages. T2C does not assume one proves
        the other.</p>
      ${disclosure('Educational illustration; stages and architecture vary by project.')}
    </div>
  </div>`;
}
