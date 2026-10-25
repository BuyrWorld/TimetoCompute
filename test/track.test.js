import assert from "node:assert/strict";
import test from "node:test";
import { PROJECTS } from "../data/projects.js";
import { trackRead } from "../src/lib/track.js";
import { trackBody } from "../src/track-page.js";
import { sectorPanel } from "../src/sector-panel.js";

const project = (id) => PROJECTS.find((item) => item.id === id);
const point = (id) => ({
  id,
  gateId: { land: "siteControl", permits: "buildingPermits", grid: "interconnection", gear: "longLeadOrdered" }[id],
  operator: !["fuel", "casting", "lathes"].includes(id),
});

test("Horizons 2–4 inherit Childress land and do not inherit transformers", () => {
  const halls = project("iren-horizons-2-4");
  const land = trackRead(halls, point("land"));
  const gear = trackRead(halls, point("gear"));
  assert.equal(land.label, "Same campus");
  assert.equal(land.tone, "ok");
  assert.equal(gear.label, "Not disclosed");
  assert.equal(gear.shared, false);
});

test("Horizon 1 grid is the energised campus, not a copied permit", () => {
  const hall = project("iren-horizon-1");
  const grid = trackRead(hall, point("grid"));
  assert.equal(grid.label, "On the grid");
  assert.match(grid.note, /13 Aug 2026/);
});

test("the sector reading is a word count, and the long list starts closed", () => {
  const home = sectorPanel("home");
  const track = trackBody();
  assert.match(home, /Sector now/);
  assert.match(home, /Not a forecast and not advice/);
  assert.match(track, /data-sector/);
  assert.match(track, /class="vcard"/);
  assert.match(track, /50<small>MW/);
  assert.equal(track.includes("<script>"), false);
});

test("Spain does not borrow Childress", () => {
  const spain = project("iren-spain");
  assert.equal(trackRead(spain, point("grid")).label, "Not disclosed");
  assert.equal(trackRead(spain, point("land")).label, "Complete");
});
