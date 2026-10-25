const NAMES = [
  ["IREN", "IREN", "/companies/iren/"],
  ["CRWV", "CoreWeave", "/companies/coreweave/"],
  ["NBIS", "Nebius", "/companies/nebius/"],
  ["APLD", "Applied Digital", "/companies/applied-digital/"],
  ["WULF", "TeraWulf", "/companies/terawulf/"],
  ["CIFR", "Cipher", "/companies/cipher/"],
];

function tiles() {
  return `<div class="vgrid">${NAMES.map(([ticker, name, href]) => `<div class="vtile" data-ticker="${ticker}">
      <button type="button" class="vhit" aria-expanded="false">
        <span class="vmark" data-mark>—</span>
        <b>${ticker}</b>
        <span class="vsub">${name}</span>
      </button>
      <div class="vmore" hidden>
        <p data-line>Nothing in this window.</p>
        <a href="${href}">Record</a>
      </div>
    </div>`).join("")}</div>`;
}

function controls() {
  return `<div class="winrow" role="group" aria-label="Wire window">
      <button type="button" class="press" data-tape="hour">Hourly</button>
      <button type="button" class="press" data-tape="day" aria-pressed="true">Daily</button>
      <button type="button" class="press" data-tape="week">Weekly</button>
    </div>
    <p class="sector-line" data-sector-line>…</p>
    ${tiles()}
    <details class="vhow">
      <summary>How this is counted</summary>
      <p class="d" data-sector-count>A count of words in headlines. Not a forecast and not advice.</p>
    </details>`;
}

/** Live wire as tiles. The line is a word, not a paragraph. */
export function sectorPanel(where) {
  const extra = where === "home"
    ? `<p class="vjump"><a class="ed-cta secondary press" href="/track/">Open the builds</a></p>`
    : "";
  if (where === "home") {
    return `<section class="ed-section sector" data-sector data-window="day" aria-labelledby="sector-h">
      <h2 class="ed-sectionh" id="sector-h">Sector now</h2>
      ${controls()}
      ${extra}
    </section>`;
  }
  return `<section class="panel sector" data-sector data-window="day" id="wire">
    <div class="ph"><h2>Sector now</h2><span class="meta">Tap a name</span></div>
    <div class="pb">${controls()}</div>
  </section>`;
}
