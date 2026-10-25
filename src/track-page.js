import { PROJECTS } from "../data/projects.js";
import { esc } from "./lib/format.js";
import { TRACK_POINTS, trackRead } from "./lib/track.js";

const NAMES = [
  { ticker: "IREN", name: "IREN", href: "/companies/iren/" },
  { ticker: "CRWV", name: "CoreWeave", href: "/companies/coreweave/" },
  { ticker: "NBIS", name: "Nebius", href: "/companies/nebius/" },
  { ticker: "APLD", name: "Applied Digital", href: "/companies/applied-digital/" },
  { ticker: "WULF", name: "TeraWulf", href: "/companies/terawulf/" },
  { ticker: "CIFR", name: "Cipher", href: "/companies/cipher/" },
];

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

function table(columns) {
  const head = columns.map((project) =>
    `<th scope="col"><a href="/sites/${esc(project.id)}/">${esc(project.name)}</a></th>`).join("");
  const body = TRACK_POINTS.map((point) => `<tr>
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
  const names = NAMES.map((item) =>
    `<a class="press" href="${esc(item.href)}"><b>${esc(item.ticker)}</b> ${esc(item.name)}</a>`).join("");

  return `<div class="shell">
    <div class="pagehead">
      <div class="pageheadin">
        <h1>Track</h1>
        <p class="pagelede">The wire, then the checklist. Horizon 1 and Horizons 2–4 are one campus, so land and grid access are not asked three times.</p>
      </div>
    </div>

    <section class="panel" id="wire">
      <div class="ph"><h2>The wire</h2><span class="meta">Hourly, daily, weekly · Finnhub</span></div>
      <div class="pb">
        <p>Headlines for the six names, from the news feed this site already uses. This is not an X sentiment score, and a headline is not a gate.</p>
        <div class="namenames">${names}</div>
        <div class="winrow" role="group" aria-label="Wire window">
          <button type="button" class="press" data-tape="hour">Hourly</button>
          <button type="button" class="press" data-tape="day" aria-pressed="true">Daily</button>
          <button type="button" class="press" data-tape="week">Weekly</button>
        </div>
        <ul class="tapelist" id="tapeList"><li>Loading the wire…</li></ul>
      </div>
    </section>

    <section class="panel" id="checklist">
      <div class="ph"><h2>Childress</h2><span class="meta">One campus, three records</span></div>
      <div class="pb">
        <p>Land, the fact the campus is already on the grid, and anything the ledger does not score are shared. Transformers, construction and customer acceptance are not. A shared line is an inference from the campus record, marked in the note, not a new document.</p>
        ${table(childress)}
      </div>
    </section>

    <section class="panel">
      <div class="ph"><h2>Other IREN places</h2><span class="meta">Only what the ledger holds</span></div>
      <div class="pb">
        <p>British Columbia, Spain and Bundey are separate places. Nothing is copied across from Childress. Sweetwater and Kiowa are not ledger projects, so they are not on this page.</p>
        ${table(others)}
      </div>
    </section>
  </div>
  <script>
  (function () {
    var list = document.getElementById("tapeList");
    var buttons = document.querySelectorAll("[data-tape]");
    var items = [];
    var windowKey = "day";
    var span = { hour: 3600, day: 86400, week: 604800 };
    function render() {
      var cut = Date.now() / 1000 - span[windowKey];
      var rows = items.filter(function (item) { return (item.datetime || 0) >= cut; }).slice(0, 12);
      list.replaceChildren();
      if (!rows.length) {
        var empty = document.createElement("li");
        empty.textContent = "Nothing in this window.";
        list.appendChild(empty);
        return;
      }
      rows.forEach(function (item) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = item.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = item.headline;
        li.appendChild(a);
        if (item.source) {
          var meta = document.createElement("span");
          meta.className = "d";
          meta.textContent = " " + item.source;
          li.appendChild(meta);
        }
        list.appendChild(li);
      });
    }
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        windowKey = button.getAttribute("data-tape");
        buttons.forEach(function (other) {
          other.setAttribute("aria-pressed", String(other === button));
        });
        render();
      });
    });
    fetch("/api/news?symbols=IREN,CRWV,NBIS,APLD,WULF,CIFR")
      .then(function (response) { return response.json(); })
      .then(function (data) {
        items = data.items || [];
        render();
      })
      .catch(function () {
        list.replaceChildren();
        var li = document.createElement("li");
        li.textContent = "The wire did not load.";
        list.appendChild(li);
      });
  }());
  </script>`;
}
