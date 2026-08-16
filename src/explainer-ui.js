/**
 * The canonical explainer template.
 *
 * One set of components serves all thirteen routes — seven stage hubs and six
 * photonics component pages — because the pack is explicit that a component page
 * is the same template as a stage page, not six unrelated layouts. A stage
 * renders its children; a component renders its parent. Nothing else differs.
 *
 * The two rules that shape most of the markup:
 *
 *   - The plain-English translation appears ONCE, in brackets, right after the
 *     definition. Every later technical term is a glossary trigger instead.
 *   - A supplier row states what its evidence actually establishes. A company
 *     that merely makes a component is never drawn like one that has won a named
 *     agreement, because a reader scanning a supplier table assumes somebody
 *     bought something.
 */
import { esc, date } from './lib/format.js';
import { cutout, opticsStyle } from './chain-ui.js';
import { SUPPLIER_CAVEAT } from '../data/suppliers.js';

/**
 * The hero hexagon, at display size.
 *
 * An SVG rather than a clip-path: clipping a bordered box cuts the border itself
 * into fragments, which rendered as three disconnected lines around the object.
 * The same shape as the chain node, so a reader arriving from the homepage sees
 * the same frame enlarged rather than a different device.
 */
const HERO_FRAME = `<svg class="ex-heroframe" viewBox="0 0 220 240" aria-hidden="true" focusable="false">
  <path d="M110 8 194 56v96l-84 48-84-48V56z" fill="none" stroke="currentColor" stroke-width="1.6"/>
  <path d="M110 20 184 62v84l-74 42-74-42V62z" fill="none" stroke="currentColor" stroke-opacity=".2"/>
  <circle cx="110" cy="8" r="4" fill="currentColor"/>
</svg>`;

/* ---------------------------------------------------------------- hero ---- */

/**
 * Breadcrumb, chain number, the large asset and the definition.
 *
 * The asset is the LCP image on these pages, so it loads eagerly here and
 * nowhere else — the pack allows exactly one.
 */
export function explainerHero(e, { number, parent = null }) {
  return `<header class="ex-hero">
    <nav class="ex-crumbs" aria-label="Breadcrumb">
      <a class="press" href="/chain/">Supply chain</a>
      ${parent ? `<span aria-hidden="true">&rsaquo;</span>
        <a class="press" href="/explainers/${esc(parent.slug)}/">${esc(parent.name)}</a>` : ''}
      <span aria-hidden="true">&rsaquo;</span>
      <span aria-current="page">${esc(e.name)}</span>
    </nav>

    <div class="ex-herogrid">
      <figure class="ex-heroart" style="${esc(opticsStyle(e.asset))}">
        ${HERO_FRAME}
        ${cutout(e.asset, {
          sizes: '(min-width: 1100px) 380px, (min-width: 700px) 300px, 220px',
          eager: true, className: 'ex-asset'
        })}
      </figure>

      <div class="ex-herocopy">
        ${number ? `<p class="ex-stagenum">${String(number).padStart(2, '0')} <span>/</span>
          ${esc(e.kind === 'stage' ? 'Chain stage' : 'Component')}</p>` : ''}
        <h1 class="ex-h1">${esc(e.title)}</h1>
        <p class="ex-def">${esc(e.definition)}</p>
        <p class="ex-simple">(In simple terms: ${esc(e.simple)}.)</p>
      </div>
    </div>
  </header>`;
}

/* ------------------------------------------------------------- sections ---- */

/** A numbered explainer section. The number is the reading order, nothing more. */
export const exSection = (n, id, title, body) => `
  <section class="ex-block" id="${esc(id)}" aria-labelledby="${esc(id)}-h">
    <h2 class="ex-blockh" id="${esc(id)}-h">
      <span class="ex-blockn" aria-hidden="true">${n}.</span> ${esc(title)}
    </h2>
    ${body}
  </section>`;

/** How it works — an ordered list, because the order is the mechanism. */
export const howItWorks = steps => `<ol class="ex-steps">
  ${steps.map((s, i) => `<li class="ex-step">
    <span class="ex-stepn" aria-hidden="true">${i + 1}</span>
    <span class="ex-steptext">${esc(s)}</span>
  </li>`).join('')}
</ol>`;

/** Inputs and outputs, which is what makes a stage part of a chain. */
export const inputsOutputs = e => `<dl class="ex-io">
  <div><dt>Made of</dt><dd>${esc(e.madeOf)}</dd></div>
  <div><dt>Takes in</dt><dd>${esc(e.inputs)}</dd></div>
  <div><dt>Produces</dt><dd>${esc(e.outputs)}</dd></div>
</dl>`;

/* ------------------------------------------------------------ children ---- */

/**
 * The component cards on a stage page.
 *
 * Each is a link to a real page, never a modal-only dead end — the pack calls
 * that out specifically, and a card that opens a popover and nothing else is a
 * dead end for anyone arriving from a search engine.
 */
export function componentCards(children) {
  if (!children.length) return '';
  return `<ul class="ex-parts" role="list">
    ${children.map(c => `<li class="ex-part">
      <a class="ex-partlink press" href="/what-is/${esc(c.slug)}/">
        <span class="ex-partart" style="${esc(opticsStyle(c.asset))}" aria-hidden="true">
          ${cutout(c.asset, { sizes: '(min-width: 700px) 140px, 110px', alt: '', className: 'ex-partimg' })}
        </span>
        <span class="ex-partname">${esc(c.name)}</span>
        <span class="ex-partsimple">${esc(c.simple)}</span>
        <span class="ex-partcta">What is this? <span aria-hidden="true">&rarr;</span></span>
      </a>
    </li>`).join('')}
  </ul>`;
}

/* --------------------------------------------------------- chain strip ---- */

/**
 * Where it sits in the chain.
 *
 * Reuses the same evidenced/implied state as the homepage rather than a second
 * copy of that mapping — this codebase has already shipped a bug caused by two
 * status mappings drifting apart.
 */
export function chainStrip(ctx) {
  return `<ol class="ex-chain" aria-label="Position in the supply chain">
    ${ctx.map(s => `<li class="ex-chainnode${s.here ? ' is-here' : ''} is-${esc(s.happened)}">
      ${s.href && s.asset
        ? `<a class="ex-chainlink press" href="${esc(s.href)}"${s.here ? ' aria-current="page"' : ''}>
             <span class="ex-chainart" style="${esc(opticsStyle(s.asset))}" aria-hidden="true">
               ${cutout(s.asset, { sizes: '64px', alt: '', className: 'ex-chainimg' })}
             </span>
             <span class="ex-chainlabel">${esc(s.label)}</span>
           </a>`
        : `<span class="ex-chainlink">
             <span class="ex-chainlabel">${esc(s.label)}</span>
           </span>`}
    </li>`).join('')}
  </ol>`;
}

/* ----------------------------------------------------------- suppliers ---- */

/**
 * Public companies in this area.
 *
 * The evidence grade leads the row, not the ticker. A reader scanning down the
 * column sees "Named supply agreement", "Volume order won", "Demonstrated only",
 * "Makes the component" — and that column is the honest answer to the question
 * the table appears to be answering.
 *
 * Prices are deliberately absent rather than faked: the quote adapter is a later
 * phase, so every row shows an explicit unavailable state and the page remains
 * completely usable without it. That is the pack's own requirement — a quote
 * failure must never block an explainer.
 */
export function supplierTable(rows, { anchor = 'suppliers' } = {}) {
  if (!rows.length) {
    return `<p class="ex-empty">T2C holds no sourced supplier record for this component yet.</p>`;
  }

  return `<p class="ex-caveat">${esc(SUPPLIER_CAVEAT)}</p>
  <div class="tw">
    <table class="ex-suppliers">
      <caption class="vh">Public companies making the components this stage depends on, with what
        each cited document actually establishes</caption>
      <thead><tr>
        <th scope="col">Company</th>
        <th scope="col">Role in the chain</th>
        <th scope="col">What the evidence shows</th>
        <th scope="col">Quote</th>
        <th scope="col">Source</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `<tr id="${esc(anchor)}-${esc(r.id)}">
          <th scope="row" class="tleft">
            <span class="ex-supname">${esc(r.company)}</span>
            <span class="ex-supticker">${esc(r.exchange)}: ${esc(r.ticker)}</span>
            <span class="ex-supcovers">${esc(r.coversHere.join(' · '))}</span>
          </th>
          <td class="tleft">
            <span class="ex-suprole" title="${esc(r.roleDefinition)}">${esc(r.roleLabel)}</span>
            <span class="ex-supwhat">${esc(r.what)}</span>
          </td>
          <td class="tleft">
            <span class="ex-grade" data-grade="${esc(r.gradeTone)}"
              title="${esc(r.gradeDefinition)}">${esc(r.gradeLabel)}</span>
            <span class="ex-supev">${esc(r.evidence)}</span>
            ${r.counterparty
              ? `<span class="ex-supparty">Counterparty: ${esc(r.counterparty)}</span>`
              : '<span class="ex-supparty is-none">No counterparty named in the document</span>'}
            <span class="ex-supasof">As of ${esc(date(r.asOf))}</span>
          </td>
          <td class="tleft">${quoteCell(r.ticker)}</td>
          <td class="tleft">
            ${r.sources.map(s => `<a class="ex-supsrc press" href="${esc(s.url)}"
              rel="noopener" target="_blank">${esc(s.publisher)}
              <span aria-hidden="true">&#8599;</span></a>`).join('')}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

/**
 * The quote cell.
 *
 * There is no authorised market-data provider configured on this project, so
 * every cell renders the unavailable state. It is a real state with a reason,
 * not a placeholder: the pack forbids hard-coding a price into page data, and a
 * blank cell would read as "no price exists" rather than "not connected yet".
 */
export function quoteCell(ticker) {
  return `<span class="ex-quote" data-quote-symbol="${esc(ticker)}" data-quote-state="unavailable">
    <span class="ex-quotedot" aria-hidden="true"></span>
    <span class="ex-quoteval">Not connected</span>
    <span class="ex-quotenote">No market-data provider is configured. T2C never prints a stored price.</span>
  </span>`;
}

/* ------------------------------------------------------------ glossary ---- */

/**
 * Glossary popovers.
 *
 * Native `popover`, so focus management, Escape and light-dismiss come from the
 * platform rather than from three hundred lines of script that would need its
 * own accessibility tests. The trigger is a real button with an accessible name.
 */
export function glossaryPanel(terms) {
  if (!terms.length) return '';
  return `<ul class="ex-gloss" role="list">
    ${terms.map(g => `<li class="ex-glossitem">
      <button type="button" class="ex-glosstrigger press"
        popovertarget="gloss-${esc(g.id)}"
        aria-label="What does ${esc(g.term)} mean?">${esc(g.term)}</button>
      <span class="ex-glossshort">${esc(g.short)}</span>
      <div class="ex-glosspop" id="gloss-${esc(g.id)}" popover>
        <h3 class="ex-glossh">${esc(g.term)}</h3>
        <p class="ex-glossbody">${esc(g.long)}</p>
        <button type="button" class="ex-glossclose press"
          popovertarget="gloss-${esc(g.id)}" popovertargetaction="hide">Close</button>
      </div>
    </li>`).join('')}
  </ul>`;
}

/* -------------------------------------------------------------- signals ---- */

/** Real signals touching this stage, or an honest empty state. */
export function relatedSignalList(rows, stageName) {
  if (!rows.length) {
    return `<p class="ex-empty">T2C holds no sourced signal for ${esc(stageName)}. The intelligence
      ledger covers the delivery end of the chain — sites, acceptance and billing — so an upstream
      stage has nothing on file rather than something thin.
      <a class="press" href="/methodology/#chain">Why coverage stops here</a></p>`;
  }
  return `<ul class="ex-signals" role="list">
    ${rows.map(s => `<li class="ex-signal">
      <a class="ex-signallink press" href="/intelligence/#${esc(s.id)}">
        <span class="ex-signaldate">${esc(date(s.announcedAt))}</span>
        <span class="ex-signaltitle">${esc(s.summary)}</span>
        <span class="ex-signalmeta">${esc(s.companyName)} · ${esc(s.eventTypeLabel)}</span>
      </a>
    </li>`).join('')}
  </ul>`;
}

/* --------------------------------------------------------------- footer ---- */

/** Evidence count, review date, methodology and the correction route. */
export function explainerFooter(e, { sourceCount, previous, next }) {
  return `<footer class="ex-foot">
    <div class="ex-footrow">
      <div class="ex-footitem">
        <span class="ex-footk">Sources behind this page</span>
        <span class="ex-footv">${sourceCount} document${sourceCount === 1 ? '' : 's'}</span>
      </div>
      <div class="ex-footitem">
        <span class="ex-footk">Methodology</span>
        <a class="ex-footv press" href="/methodology/#chain">How the chain is tracked</a>
      </div>
      <div class="ex-footitem">
        <span class="ex-footk">Something wrong?</span>
        <a class="ex-footv press" href="/contact/">Report an error</a>
      </div>
    </div>
    <nav class="ex-prevnext" aria-label="Adjacent chain stages">
      ${previous
        ? `<a class="ex-prev press" href="/explainers/${esc(previous.slug)}/">
             <span aria-hidden="true">&larr;</span>
             <span><small>Previous stage</small>${esc(previous.name)}</span></a>`
        : '<span></span>'}
      ${next
        ? `<a class="ex-next press" href="/explainers/${esc(next.slug)}/">
             <span><small>Next stage</small>${esc(next.name)}</span>
             <span aria-hidden="true">&rarr;</span></a>`
        : '<span></span>'}
    </nav>
  </footer>`;
}
