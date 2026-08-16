/**
 * /time-machine/ — the page the game mounts into.
 *
 * The game is interactive from first paint, so the server's job is small: ship
 * the data island, the root element and a genuine no-JavaScript fallback. The
 * fallback is not a courtesy — a reader with scripts blocked should still learn
 * what the game is, see the five campaigns, and reach the rest of the site.
 *
 * The page keeps this site's shell — header, footer, palette, mode toggle — so
 * the game is part of TimeToCompute rather than a microsite that happens to sit
 * on the same domain. The game's own immersive header lives inside the root
 * element and carries the real logo.
 */
import { esc } from './lib/format.js';
import { CAMPAIGNS, EVENT_BY_ID, CAMPAIGN_VISUALS, timeMachineData, chapterCount } from './lib/timemachine.js';

export function timeMachineBody() {
  const data = JSON.stringify(timeMachineData())
    // Never let a data island terminate the script tag that carries it.
    .replace(/</g, '\\u003c');

  return `<div class="tm-shell">
  <div id="tmRoot" class="t2c-time-machine tm-screen--title">
    ${noScriptFallback()}
  </div>

  <script type="application/json" id="tm-data">${data}</script>

  <aside class="tm-footnote">
    <p class="tm-footnote__legal"><b>Educational only &mdash; not investment advice.</b>
      A historical simulation using fictional capital. Nothing here is a recommendation, and past
      performance does not predict future results. Market results appear only where an adjusted-close
      figure has been verified; where it has not, the game says so rather than estimating one.</p>
    <p class="tm-footnote__links">
      <a class="press" href="/">Back to TimeToCompute</a>
      <a class="press" href="/chain/">The real supply chain</a>
      <a class="press" href="/methodology/">How T2C grades evidence</a>
    </p>
  </aside>
</div>`;
}

/**
 * The no-JavaScript view.
 *
 * Lives inside the root element and is replaced the moment the game boots, so
 * there is no flash of two headers and nothing to hide with CSS.
 */
function noScriptFallback() {
  return `<div class="tm-fallback">
    <div class="tm-fallback__brand">
      <img src="/Logo/logo-header.png" width="514" height="120" alt="TimeToCompute" />
    </div>
    <h1>The AI Time Machine</h1>
    <p class="tm-fallback__lede">Go back to the moment before the outcome. See only what was public.
      Choose the physical bottleneck you believe mattered next.</p>
    <p class="tm-fallback__note">The game needs JavaScript to run. With it switched off, here is what
      it covers &mdash; ${CAMPAIGNS.length} campaigns across ${chapterCount()} real turning points,
      each with three theses, primary sources and a hard knowledge cutoff.</p>
    <ul class="tm-fallback__list">
      ${CAMPAIGNS.map((c, i) => {
        const evs = c.chapterIds.map(id => EVENT_BY_ID[id]).filter(Boolean);
        const years = `${new Date(evs[0].cutoffAt).getUTCFullYear()}–${
          new Date(evs[evs.length - 1].cutoffAt).getUTCFullYear()}`;
        return `<li>
          <span class="tm-fallback__n">${String(i + 1).padStart(2, '0')}</span>
          <div>
            <b>${esc(c.title)}</b>
            <span class="tm-fallback__meta">${esc(years)} &middot; ${c.chapterIds.length} chapters
              &middot; ${esc(CAMPAIGN_VISUALS[c.id].eyebrow)}</span>
            <p>${esc(c.question)}</p>
          </div>
        </li>`;
      }).join('')}
    </ul>
    <p class="tm-fallback__out"><a class="press" href="/chain/">Explore the real supply chain instead
      <span aria-hidden="true">&rarr;</span></a></p>
  </div>`;
}
