/**
 * Chain Mapping tests.
 *
 * The pack names a handful of product rules as non-negotiable, and every one of
 * them is a rule about what the interface must NOT say. Those are the ones
 * tested here, because they are the ones a later edit breaks without anything
 * looking wrong:
 *
 *   - copper is present in both architecture modes;
 *   - photonics is never described as purely future technology;
 *   - relationship, evidence confidence and commercial stage stay three fields;
 *   - a sector participant is never promoted to a direct supplier;
 *   - no demo fixture from the pack reaches production;
 *   - an empty column is declared rather than hidden.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chainMap, commercialTimeline } from '../src/lib/chainmap.js';
import {
  COLUMNS, PILLARS, ARCHITECTURES, COMMERCIAL_STAGES, RELATIONSHIPS,
  CONFIDENCES, MATURITIES, BOUNDARY_STATEMENT, REACH_BANDS
} from '../data/chainmap.js';
import { PHOTONICS_SUPPLIERS, EVIDENCE_GRADES } from '../data/suppliers.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const page = () => read('dist/chain-mapping/index.html');

/* ================= architecture semantics ================= */

test('copper is present in BOTH architecture modes', () => {
  for (const a of ['deployed', 'next']) {
    const g = chainMap({ architecture: a });
    assert.ok(g.nodes.some(n => n.id === 'interconnect-copper'),
      `copper is missing from ${a} — the map would say copper goes away`);
  }
});

test('the toggle moves the optical boundary; it is not copper versus photonics', () => {
  const d = chainMap({ architecture: 'deployed' }).nodes.map(n => n.id);
  const n = chainMap({ architecture: 'next' }).nodes.map(n => n.id);
  // Exactly one node swaps. Everything else is shared, so the map is not
  // redrawn as "one technology replaced by another".
  const onlyDeployed = d.filter(x => !n.includes(x));
  const onlyNext = n.filter(x => !d.includes(x));
  assert.deepEqual(onlyDeployed, ['interconnect-deployed']);
  assert.deepEqual(onlyNext, ['interconnect-next']);
});

test('pluggable optics is deployed today, not filed under future technology', () => {
  const node = chainMap({ architecture: 'deployed' }).nodes
    .find(x => x.id === 'interconnect-deployed');
  assert.equal(node.maturity, 'deployed');
  // And the next-architecture node is sourced-maturity, not "future".
  const next = chainMap({ architecture: 'next' }).nodes.find(x => x.id === 'interconnect-next');
  assert.ok(['sampling', 'announced', 'shipping'].includes(next.maturity), next.maturity);
});

test('the boundary statement is on the page, verbatim', () => {
  assert.equal(BOUNDARY_STATEMENT, 'Copper does not disappear. Light moves closer to the chip.');
  assert.ok(page().includes(BOUNDARY_STATEMENT), 'the teaching line is missing from the page');
});

test('the reach ladder keeps copper in the next architecture', () => {
  const chip = REACH_BANDS.find(b => b.id === 'chip');
  assert.equal(chip.next.medium, 'electrical',
    'the shortest reach must stay electrical in the next architecture');
  // And optics is already carrying distance today.
  const building = REACH_BANDS.find(b => b.id === 'building');
  assert.equal(building.deployed.medium, 'optical');
});

test('next architecture carries the EMERGING qualifier', () => {
  const next = ARCHITECTURES.find(a => a.id === 'next');
  assert.equal(next.qualifier, 'Emerging');
  assert.ok(page().includes('Emerging'), 'the qualifier is missing from the page');
});

/* ================= the three separate axes ================= */

test('relationship, confidence and maturity are never collapsed into one field', () => {
  for (const n of chainMap({}).nodes) {
    assert.ok(RELATIONSHIPS[n.relationship], `${n.id}: unknown relationship`);
    assert.ok(CONFIDENCES[n.confidence], `${n.id}: unknown confidence`);
    assert.ok(MATURITIES[n.maturity], `${n.id}: unknown maturity`);
    // A node may legitimately have no commercial stage; it must never be faked.
    if (n.commercialStage) {
      assert.ok(COMMERCIAL_STAGES.some(s => s.id === n.commercialStage), n.commercialStage);
    }
  }
});

test('a capability record never becomes a direct supplier relationship', () => {
  // The map inherits the supplier table's grades. A company that merely makes a
  // component is `ecosystem`; only a named agreement is `direct`.
  for (const n of chainMap({}).nodes) {
    if (n.relationship !== 'direct') continue;
    const grades = (n.suppliers || []).map(s => s.grade);
    const own = PHOTONICS_SUPPLIERS.filter(s => s.id === n.supplierId).map(s => s.grade);
    const all = grades.concat(own);
    if (!all.length) continue;
    assert.ok(all.includes('supply-agreement'),
      `${n.id} is drawn as direct without a named agreement behind it`);
  }
});

test('a capability record supports no commercial stage', () => {
  for (const s of PHOTONICS_SUPPLIERS.filter(x => x.grade === 'capability')) {
    const n = chainMap({}).nodes.find(x => (x.suppliers || []).some(y => y.id === s.id));
    if (!n) continue;
    // The node may be lifted by a stronger sibling, but never BY this record.
    const best = (n.suppliers || []).slice()
      .sort((a, b) => EVIDENCE_GRADES[b.grade].rank - EVIDENCE_GRADES[a.grade].rank)[0];
    if (best.grade === 'capability') {
      assert.equal(n.commercialStage, null,
        `${n.id} claims a commercial stage on capability evidence alone`);
    }
  }
});

/* ================= edges ================= */

test('exactly one edge rests on a named company-to-company agreement', () => {
  const direct = chainMap({}).edges.filter(e => e.relationship === 'direct');
  assert.equal(direct.length, 1);
  assert.match(direct[0].label, /AXTI supplies LITE/);
  assert.ok(direct[0].evidenceIds.length, 'the direct edge cites nothing');
});

test('structural flow is column-level and marked inferred', () => {
  for (const e of chainMap({}).edges.filter(x => x.inferred)) {
    assert.ok(e.columnLevel, 'an inferred edge asserts a node-to-node relationship');
    assert.equal(e.confidence, 'unverified');
    assert.equal(e.evidenceIds.length, 0, 'an inferred edge cites evidence it does not have');
  }
});

test('turning off inferred links leaves only evidenced edges', () => {
  const edges = chainMap({ showInferred: false }).edges;
  assert.ok(edges.length > 0);
  for (const e of edges) assert.equal(e.inferred, false);
});

test('a break in the chain is drawn, not papered over', () => {
  // Systems is empty, so the flow from Components must be marked broken rather
  // than silently bridged — otherwise the gap reads as a rendering bug.
  const broken = chainMap({}).edges.filter(e => e.broken);
  assert.equal(broken.length, 1);
  assert.ok(broken[0].skipped.includes('systems'));
  assert.match(broken[0].label, /T2C holds no record/);
});

/* ================= columns ================= */

test('all five columns are always present, empty or not', () => {
  for (const a of ['deployed', 'next']) {
    const g = chainMap({ architecture: a });
    assert.equal(g.columns.length, 5);
    assert.deepEqual(g.columns.map(c => c.id), COLUMNS.map(c => c.id));
  }
});

test('an empty column states why it is empty', () => {
  const empty = chainMap({}).columns.filter(c => c.empty);
  assert.ok(empty.length > 0, 'the systems column should be empty on current data');
  for (const c of empty) {
    assert.ok(c.emptyReason && c.emptyReason.length > 40, `${c.id} is empty with no explanation`);
  }
  assert.ok(page().includes('T2C holds no accelerator, switch or server supplier record'),
    'the empty column is not declared on the page');
});

test('a node appears in exactly one column', () => {
  const g = chainMap({});
  const seen = new Map();
  for (const n of g.nodes) {
    assert.ok(!seen.has(n.id), `${n.id} appears twice`);
    seen.set(n.id, n.column);
  }
  // The substrate belongs to Inputs, not Components.
  const inp = g.nodes.filter(n => n.title === 'InP substrate');
  assert.equal(inp.length, 1);
  assert.equal(inp[0].column, 'inputs');
});

/* ================= pillars ================= */

test('an untracked pillar is declared, disabled and explained', () => {
  const untracked = PILLARS.filter(p => !p.tracked);
  assert.ok(untracked.length > 0);
  for (const p of untracked) {
    assert.ok(p.needs && p.needs.length > 30, `${p.id} does not say what tracking it would take`);
  }
  const html = page();
  for (const p of untracked) {
    assert.ok(html.includes(p.label), `${p.label} is hidden rather than declared`);
  }
  assert.ok(/class="cm-pillar[^"]*is-untracked[^"]*"[^>]*disabled/.test(html.replace(/\s+/g, ' ')),
    'an untracked pillar is offered as a working filter');
});

/* ================= the timeline ================= */

test('the timeline never infers a stage from the one before it', () => {
  const t = commercialTimeline();
  assert.equal(t.length, 6);
  for (const s of t) {
    if (s.count === 0) {
      assert.equal(s.state, 'none');
      assert.ok(s.emptyNote, `${s.id} is empty with no note`);
      assert.equal(s.sourceCount, 0, `${s.id} reports sources for records it does not have`);
    }
  }
  // Qualified and Shipping are genuinely zero on current data. If that changes,
  // it should change because a record was added, not because a default appeared.
  assert.equal(t.find(s => s.id === 'qualified').count, 0);
  assert.equal(t.find(s => s.id === 'shipping').count, 0);
});

test('every stage states what it does NOT mean', () => {
  for (const s of COMMERCIAL_STAGES) {
    assert.ok(s.notYet && s.notYet.length > 20, `${s.id} does not state its limit`);
  }
  assert.ok(page().includes('Acceptance normally starts the revenue clock. It is not revenue.'));
});

test('a stage reporting records also reports its sources', () => {
  for (const s of commercialTimeline()) {
    if (s.count > 0) {
      assert.ok(s.sourceCount > 0, `${s.id} shows ${s.count} records but no sources`);
    }
  }
});

/* ================= no demo data ================= */

test('no fixture from the pack reaches production', () => {
  const files = ['src/lib/chainmap.js', 'src/chainmap-ui.js', 'src/chainmap-page.js',
    'src/chainmap-app.js', 'data/chainmap.js'];
  for (const f of files) {
    const src = read(f);
    /* Asserted on IMPORTS rather than mentions: the header of chainmap.js names
       the pack fixtures precisely to record that they are never imported, and a
       substring check would flag that comment as the defect it warns about. */
    for (const m of src.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)) {
      const spec = m[1];
      assert.ok(!/sample-chain|chain-mapping-pack|preview\/|SCMAP/.test(spec),
        `${f} imports ${spec} from the pack`);
    }
  }
  // And nothing labelled demo may appear in the built page.
  const html = page();
  for (const bad of ['DEMO AI FACTORY', 'Demo AI Factory', 'DEMO SOURCE PLACEHOLDER',
    'MUST NOT SHIP', 'Example optical sup', 'Example substrate', 'Example memory']) {
    assert.ok(!html.includes(bad), `the page ships the pack fixture string "${bad}"`);
  }
});

test('no reference screenshot ships', () => {
  const html = page();
  for (const bad of ['reference/', '01-original-chain-mapping', '02-current-next-architecture']) {
    assert.ok(!html.includes(bad), `the page references ${bad}`);
  }
  assert.ok(!fs.existsSync(path.join(ROOT, 'dist/assets/t2c/chain-mapping/reference')),
    'reference imagery was copied into the production asset tree');
});

/* ================= assets ================= */

test('every sprite symbol the page uses exists in the sprite', () => {
  const sprite = read('assets/t2c/chain-mapping/chain-mapping-icons.svg');
  const ids = new Set([...sprite.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  const used = new Set([...page().matchAll(/chain-mapping-icons\.svg#([^"]+)"/g)].map(m => m[1]));
  assert.ok(used.size > 0, 'the page uses no sprite symbols');
  for (const u of used) assert.ok(ids.has(u), `the page uses #${u}, which the sprite does not define`);
});

test('the map is real HTML, not a canvas or an image', () => {
  const html = page();
  assert.ok(!/<canvas/.test(html), 'the map is drawn on a canvas and cannot be read or searched');
  const nodes = (html.match(/class="cm-node"/g) || []).length;
  assert.ok(nodes >= 30, `expected both modes' nodes in the document, found ${nodes}`);
  // Every node is a real button, so it is focusable and announceable.
  assert.equal((html.match(/<button type="button" class="cm-node"/g) || []).length, nodes);
});

test('the graph has an equivalent list alternative', () => {
  const html = page();
  assert.ok(html.includes('class="cm-listview"'), 'no list alternative exists');
  const rows = (html.match(/data-row-node="/g) || []).length;
  const nodes = (html.match(/class="cm-node"/g) || []).length;
  assert.equal(rows, nodes, 'the list view and the map show different numbers of nodes');
});

/* ================= route ================= */

test('the workspace is at /chain-mapping/ and the old route survives', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'dist/chain-mapping/index.html')));
  assert.ok(fs.existsSync(path.join(ROOT, 'dist/chain/index.html')),
    '/chain/ was deleted — it is a published URL');
  assert.match(page(), /<title>Chain mapping/);
});
