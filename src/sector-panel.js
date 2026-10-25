const NAMES = [
  ["IREN", "IREN", "/companies/iren/"],
  ["CRWV", "CoreWeave", "/companies/coreweave/"],
  ["NBIS", "Nebius", "/companies/nebius/"],
  ["APLD", "Applied Digital", "/companies/applied-digital/"],
  ["WULF", "TeraWulf", "/companies/terawulf/"],
  ["CIFR", "Cipher", "/companies/cipher/"],
];

function names() {
  return NAMES.map(([ticker, name, href]) =>
    `<a class="press" href="${href}"><b>${ticker}</b> ${name}</a>`).join("");
}

function controls() {
  return `<div class="namenames">${names()}</div>
    <div class="winrow" role="group" aria-label="Wire window">
      <button type="button" class="press" data-tape="hour">Hourly</button>
      <button type="button" class="press" data-tape="day" aria-pressed="true">Daily</button>
      <button type="button" class="press" data-tape="week">Weekly</button>
    </div>
    <p class="sector-line" data-sector-line>Reading the wire…</p>
    <p class="d" data-sector-count>A count of words in headlines. Not a forecast and not advice.</p>
    <ul class="tapelist" data-sector-list></ul>`;
}

/** Live wire. Headline tone only — never a score and never advice. */
export function sectorPanel(where) {
  const body = controls() + (where === "home"
    ? `<p><a class="ed-cta secondary press" href="/track/">Open the checklist</a></p>`
    : "");
  if (where === "home") {
    return `<section class="ed-section sector" data-sector data-window="day" aria-labelledby="sector-h">
      <h2 class="ed-sectionh" id="sector-h">Sector now</h2>
      <p>What the wire has been saying about the neocloud names. The checklist of builds is one step away.</p>
      ${body}
    </section>`;
  }
  return `<section class="panel sector" data-sector data-window="day" id="wire">
    <div class="ph"><h2>Sector now</h2><span class="meta">Hourly, daily, weekly</span></div>
    <div class="pb">
      <p>Headlines from the feed this site already uses. A lean is a word count, not an X score, and a headline is not a gate.</p>
      ${body}
    </div>
  </section>`;
}
