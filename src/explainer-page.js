/**
 * One page body for thirteen routes.
 *
 * The section order is fixed by the pack and is the same for a stage and a
 * component, because a reader who has learned the shape on one page should not
 * have to relearn it on the next. Sections that have nothing to show are
 * omitted rather than rendered empty — except the two where absence is itself
 * the finding (no supplier record, no signal on file), which say so explicitly.
 */
import { esc } from './lib/format.js';
import {
  explainerHero, exSection, howItWorks, inputsOutputs, componentCards,
  chainStrip, supplierTable, glossaryPanel, relatedSignalList, explainerFooter
} from './explainer-ui.js';
import {
  chainContext, neighbours, childrenOf, supplierRows, glossaryFor, relatedSignals
} from './lib/explain.js';
import { EXPLAINER_BY_SLUG } from '../data/explainers.js';
import { cutout } from './chain-ui.js';

export function explainerPageBody(slug) {
  const e = EXPLAINER_BY_SLUG[slug];
  if (!e) throw new Error(`Unknown explainer: ${slug}`);

  const parent = e.kind === 'component' ? EXPLAINER_BY_SLUG[e.parent] : null;
  const children = childrenOf(e);
  const suppliers = supplierRows(slug);
  const terms = glossaryFor(slug);
  const sigs = relatedSignals(slug);
  const { previous, next } = neighbours(slug);
  const sourceCount = new Set(suppliers.flatMap(s => s.sourceIds)).size;

  let n = 0;
  const num = () => ++n;

  return `<div class="t2c-shell ed-main ex-page">
  ${explainerHero(e, { number: e.order, parent })}

  ${exSection(num(), 'why', e.kind === 'stage' ? 'Why AI needs it' : 'Why it matters',
    `<p class="ex-lede">${esc(e.whyAi)}</p>`)}

  ${children.length ? exSection(num(), 'parts', 'What it is made of',
    `<p class="ex-note">Each part below has its own page. They are links, not pop-ups —
      a component you can read about only in a tooltip is a dead end.</p>
     ${componentCards(children)}`) : ''}

  ${exSection(num(), 'how', 'How it works', howItWorks(e.howItWorks))}

  ${exSection(num(), 'io', 'Inputs and outputs', inputsOutputs(e))}

  ${exSection(num(), 'bottleneck', 'Where it gets stuck',
    `<p class="ex-lede">${esc(e.bottleneck)}</p>
     <p class="ex-note">A general statement about the technology. It is not a claim about any
       named project — where T2C can evidence a specific delay, it appears in the
       <a class="press" href="/intelligence/">intelligence ledger</a> with its source.</p>`)}

  ${exSection(num(), 'chain', 'Where it sits in the chain',
    `${chainStrip(chainContext(slug))}
     ${e.role ? `<p class="ex-role"><b>Who sells to whom.</b> ${esc(e.role)}</p>` : ''}
     <p class="ex-note">T2C tracks the delivery end of this chain. An upstream stage is shown as
       having happened — capacity cannot be billing unless the parts were made — and simultaneously
       as untracked, because no supplier, order or shipment record sits behind it.</p>`)}

  ${exSection(num(), 'suppliers', 'Public companies in this area', supplierTable(suppliers))}

  ${terms.length ? exSection(num(), 'glossary', 'Glossary',
    `<p class="ex-note">Every term that appears above, defined. Each opens in place.</p>
     ${glossaryPanel(terms)}`) : ''}

  ${e.kind === 'stage' ? exSection(num(), 'signals', 'Related signals',
    relatedSignalList(sigs, e.name)) : ''}

  ${explainerFooter(e, { sourceCount, previous, next })}
</div>`;
}

/**
 * The explainer hub, rebuilt around the chain.
 *
 * The old hub explained the data model — bases, value types, confidence — which
 * is genuinely useful and is kept below. What it lacked was a way in: a reader
 * who has just met the seven-stage chain on the homepage arrives here and finds
 * vocabulary rather than the chain. Now the chain leads, and the vocabulary
 * follows it.
 */
export function explainerIndexCards(stages) {
  return `<ul class="ex-hub" role="list">
    ${stages.map(s => `<li class="ex-hubitem">
      <a class="ex-hublink press" href="/explainers/${esc(s.slug)}/">
        <span class="ex-hubn" aria-hidden="true">${String(s.order).padStart(2, '0')}</span>
        <span class="ex-hubart" aria-hidden="true">
          ${cutout(s.asset, { sizes: '96px', alt: '', className: 'ex-hubimg' })}
        </span>
        <span class="ex-hubbody">
          <span class="ex-hubname">${esc(s.name)}</span>
          <span class="ex-hubsimple">${esc(s.simple)}</span>
          <span class="ex-hubcta">What is this? <span aria-hidden="true">&rarr;</span></span>
        </span>
      </a>
    </li>`).join('')}
  </ul>`;
}
