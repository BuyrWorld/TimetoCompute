import { PROJECTS } from "../data/projects.js";
import { esc } from "./lib/format.js";
import { TRACK_POINTS, trackRead } from "./lib/track.js";
import { sectorPanel } from "./sector-panel.js";
import { allSites } from "./lib/sites.js";
import { imageForSite } from "./lib/homepage.js";
import { ASSET } from "./lib/assets.js";
import { illustration, disclosure } from "./editorial-ui.js";

const FRONT = TRACK_POINTS.filter((point) =>
  ["land", "permits", "grid", "gear"].includes(point.id));

const CHILDRESS = ["iren-horizon-1", "iren-horizons-2-4", "iren-childress"];
const OTHER = ["iren-bc", "iren-spain", "iren-bundey"];
const SITES = new Map(allSites().map((site) => [site.slug, site]));

function project(id) {
  return PROJECTS.find((item) => item.id === id);
}

function word(read) {
  if (read.tone === "ok" && read.shared) return "Shared";
  if (read.tone === "ok") return "In";
  if (read.tone === "warn") return "Partial";
  return "Open";
}

function card(item) {
  const site = SITES.get(item.id);
  const asset = site ? ASSET[imageForSite(site)] : null;
  const mw = item.capacityMw == null ? "—" : String(item.capacityMw);
  const chips = FRONT.map((point) => {
    const read = trackRead(item, point);
    return `<span class="vchip" data-tone="${esc(read.tone)}"><b>${esc(word(read))}</b><span>${esc(point.name)}</span></span>`;
  }).join("");
  const notes = FRONT.map((point) => {
    const read = trackRead(item, point);
    return `<p><b>${esc(point.name)}.</b> ${esc(read.note)}</p>`;
  }).join("");
  return `<details class="vcard">
    <summary>
      ${asset ? illustration(asset, { sizes: "280px", className: "vpic" }) : ""}
      <span class="vmetric">${esc(mw)}<small>${item.capacityMw == null ? "" : "MW"}</small></span>
      <span class="vname">${esc(item.name)}</span>
      <span class="vchips">${chips}</span>
    </summary>
    <div class="vmore">
      ${notes}
      <a href="/sites/${esc(item.id)}/">Full record</a>
      ${asset ? disclosure(asset.disclosure) : ""}
    </div>
  </details>`;
}

function row(title, meta, ids) {
  const cards = ids.map(project).filter(Boolean).map(card).join("");
  return `<section class="panel">
    <div class="ph"><h2>${esc(title)}</h2><span class="meta">${esc(meta)}</span></div>
    <div class="pb"><div class="vgrid">${cards}</div></div>
  </section>`;
}

export function trackBody() {
  return `<div class="shell">
    <div class="pagehead">
      <div class="pageheadin">
        <h1>Track</h1>
      </div>
    </div>
    ${sectorPanel("track")}
    ${row("Childress", "One campus", CHILDRESS)}
    ${row("Other places", "Not Childress", OTHER)}
  </div>`;
}
