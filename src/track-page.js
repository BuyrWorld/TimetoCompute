import { PROJECTS } from "../data/projects.js";
import { esc } from "./lib/format.js";
import { TRACK_POINTS, trackRead } from "./lib/track.js";
import { sectorPanel } from "./sector-panel.js";

const FRONT = new Set(["land", "permits", "grid", "gear"]);

const CHILDRESS_ORDER = ["iren-horizon-1", "iren-horizons-2-4", "iren-childress"];
const OTHER_ORDER = ["iren-bc", "iren-spain", "iren-bundey"];

function byId(id) {
  return PROJECTS.find((project) => project.id === id);
}

function cell(project, point) {
  const read = trackRead(project, point);
  return `<td>
    <strong>${esc(read.label)}</strong>
    <p class="d">${esc(read.note)}</p>
  </td>`;
}

function table(columns, points) {
  const head = columns.map((project) =>
    `<th scope="col"><a href="/sites/${esc(project.id)}/">${esc(project.name)}</a></th>`).join("");
  const body = points.map((point) => `<tr>
    <th scope="row">${esc(point.name)}</th>
    ${columns.map((project) => cell(project, point)).join("")}
  </tr>`).join("");
  return `<div class="tw"><table>
    <thead><tr><th scope="col">Point</th>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

export function trackBody() {
  const childress = CHILDRESS_ORDER.map(byId).filter(Boolean);
  const others = OTHER_ORDER.map(byId).filter(Boolean);
  const front = TRACK_POINTS.filter((point) => FRONT.has(point.id));

  return `<div class="shell">
    <div class="pagehead">
      <div class="pageheadin">
        <h1>Track</h1>
        <p class="pagelede">What the sector’s wire is saying, then where each IREN build stands.</p>
      </div>
    </div>

    ${sectorPanel("track")}

    <section class="panel" id="checklist">
      <div class="ph"><h2>Childress</h2><span class="meta">One campus</span></div>
      <div class="pb">
        <p>Land and grid access are shared because these halls are the same place. Transformers and customer acceptance are not. A shared line is an inference, not a new document.</p>
        ${table(childress, front)}
      </div>
    </section>

    <section class="panel">
      <div class="ph"><h2>Other IREN places</h2><span class="meta">Only what the ledger holds</span></div>
      <div class="pb">
        <p>British Columbia, Spain and Bundey are separate places. Nothing is copied across from Childress.</p>
        ${table(others, front)}
      </div>
    </section>
  </div>`;
}

