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
import {
  chainMap, commercialTimeline, chainGeometry, traceChain,
  singleMakerNodes, hexPoints, GEOMETRY
} from '../src/lib/chainmap.js';
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

/**
 * The invariant that matters most now the map draws the whole chain.
 *
 * Structural edges are numerous and cross the entire graph. Every one of them
 * must be flagged inferred, cite nothing, and state its mechanism — a single
 * structural edge that slipped through unflagged would be indistinguishable
 * from the one signed agreement on the page.
 */
test('every structural link is flagged, cites nothing, and states its mechanism', () => {
  const edges = chainMap({}).edges.filter(x => x.inferred);
  assert.ok(edges.length > 10, 'the structural chain is not being drawn');
  for (const e of edges) {
    assert.equal(e.confidence, 'unverified', e.id);
    assert.equal(e.evidenceIds.length, 0, `${e.id} cites evidence it does not have`);
    assert.equal(e.relationship, 'inferred', e.id);
    assert.ok(e.columnLevel || e.structural, `${e.id} is inferred but claims to be evidenced`);
    assert.ok(e.label && e.label.length > 20, `${e.id} asserts a dependency without saying why`);
  }
});

test('turning off inferred links leaves only evidenced edges', () => {
  const edges = chainMap({ showInferred: false }).edges;
  assert.ok(edges.length > 0);
  for (const e of edges) assert.equal(e.inferred, false);
});

/**
 * A fan addresses a column, never a node.
 *
 * "Operators install racks" is true of every operator. An edge from rack
 * integration to one named operator would invent a relationship, so a fan must
 * carry a column and no `to`.
 */
test('a fan addresses a whole column and never a single node', () => {
  const fans = chainMap({}).edges.filter(e => e.fan);
  assert.ok(fans.length > 0);
  for (const f of fans) {
    assert.equal(f.to, null, `${f.id} singles out one node`);
    assert.ok(f.toColumn, `${f.id} names no column`);
    assert.equal(f.structural, true);
  }
});

/* ================= columns ================= */

test('all five columns are always present, empty or not', () => {
  for (const a of ['deployed', 'next']) {
    const g = chainMap({ architecture: a });
    assert.equal(g.columns.length, 5);
    assert.deepEqual(g.columns.map(c => c.id), COLUMNS.map(c => c.id));
  }
});

test('no column renders empty now the reference chain is drawn', () => {
  for (const a of ['deployed', 'next']) {
    for (const c of chainMap({ architecture: a }).columns) {
      assert.ok(c.nodes.length > 0, `${c.id} is empty in ${a} — the chain has a hole in it`);
    }
  }
});

/* A filter can still empty a column, and that case must still explain itself. */
test('a column emptied by a filter still states why', () => {
  const g = chainMap({ pillar: 'photonics' });
  const empty = g.columns.filter(c => c.empty);
  assert.ok(empty.length > 0, 'filtering to one pillar should empty at least one column');
  for (const c of empty) {
    assert.ok(c.emptyReason && c.emptyReason.length > 40, `${c.id} is empty with no explanation`);
  }
});

/* Turning the reference layer off returns the map to T2C's records alone —
   the evidence-only view is still reachable, it is simply no longer the
   default, because on its own it taught nobody how the chain works. */
test('the reference layer can be switched off entirely', () => {
  const g = chainMap({ reference: false });
  assert.ok(g.nodes.every(n => n.tier === 'evidenced'));
  assert.ok(g.columns.find(c => c.id === 'systems').empty,
    'without the reference layer, Systems is empty — that was the original finding');
  assert.match(g.columns.find(c => c.id === 'systems').emptyReason,
    /no accelerator, switch or server supplier record/);
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

test('the map is markup, not a canvas or an image', () => {
  const html = page();
  assert.ok(!/<canvas/.test(html), 'the map is drawn on a canvas and cannot be read or searched');
  const nodes = (html.match(/class="cm-hexg"/g) || []).length;
  assert.ok(nodes >= 30, `expected both modes' nodes in the document, found ${nodes}`);
  /* Every node is focusable, announceable and carries its own description —
     an SVG shape with none of those is a picture of a node, not a node. */
  assert.equal((html.match(/class="cm-hexg"[^>]*/g) || [])
    .filter(t => t.includes('tabindex="0"')).length, nodes);
  assert.equal((html.match(/role="button"/g) || []).length >= nodes, true);
  assert.equal((html.match(/<desc id="cm-nodedesc-/g) || []).length, nodes);
});

test('the graph has an equivalent list alternative', () => {
  const html = page();
  assert.ok(html.includes('class="cm-listview"'), 'no list alternative exists');
  const rows = (html.match(/data-row-node="/g) || []).length;
  const nodes = (html.match(/class="cm-hexg"/g) || []).length;
  assert.equal(rows, nodes, 'the list view and the map show different numbers of nodes');
});

/* ================= geometry ================= */

test('every node gets a position and nothing lands outside the canvas', () => {
  for (const architecture of ['deployed', 'next']) {
    const g = chainMap({ architecture });
    const geo = chainGeometry(g);
    assert.equal(Object.keys(geo.pos).length, g.nodes.length, architecture);
    for (const n of g.nodes) {
      const p = geo.pos[n.id];
      assert.ok(p, `${n.id} has no position`);
      assert.ok(p.x > 0 && p.x < geo.width, `${n.id} sits outside the canvas horizontally`);
      assert.ok(p.y > 0 && p.y < geo.height, `${n.id} sits outside the canvas vertically`);
    }
  }
});

test('a column occupies its own band and never overlaps the next', () => {
  const g = chainMap({ architecture: 'deployed' });
  const geo = chainGeometry(g);
  for (const n of g.nodes) {
    const box = geo.columnBox.find(c => c.id === n.column);
    const p = geo.pos[n.id];
    assert.ok(Math.abs(p.x - box.cx) < 0.01, `${n.id} is not on its column's centre line`);
    assert.ok(p.x - GEOMETRY.nodeW / 2 >= box.x0, `${n.id} overhangs into the previous column`);
    assert.ok(p.x + GEOMETRY.nodeW / 2 <= box.x1, `${n.id} overhangs into the next column`);
  }
});

test('nodes in one column never overlap each other', () => {
  const g = chainMap({ architecture: 'deployed' });
  const geo = chainGeometry(g);
  for (const c of g.columns) {
    const ys = c.nodes.map(n => geo.pos[n.id].y).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) {
      assert.ok(ys[i] - ys[i - 1] >= GEOMETRY.nodeH, `${c.id} stacks two nodes on top of each other`);
    }
  }
});

/**
 * The shape of a link is the claim it makes, so the two must not be confusable.
 * A band that reached a node would say "this company supplies that one" on the
 * strength of T2C's own framing of how a deployment is built.
 */
test('a structural band stops short of every node it passes', () => {
  const g = chainMap({ architecture: 'deployed' });
  const geo = chainGeometry(g);
  const bands = geo.links.filter(l => l.kind === 'band');
  assert.ok(bands.length > 0);
  for (const b of bands) {
    for (const n of g.nodes) {
      const p = geo.pos[n.id];
      const left = p.x - GEOMETRY.nodeW / 2, right = p.x + GEOMETRY.nodeW / 2;
      // The band's own endpoints must sit in the gutters, never inside a node.
      for (const x of [b.x1, b.x2]) {
        assert.ok(x <= left || x >= right, `a band endpoint lands inside ${n.id}`);
      }
    }
  }
});

/**
 * However many links the map grows, exactly one of them is a signed agreement.
 *
 * This is the number a reader would be most misled by if it drifted, so it is
 * asserted against the drawn geometry rather than the source data — a rendering
 * change that promoted a structural edge to an evidenced one would fail here.
 */
test('exactly one drawn link is a company-to-company agreement', () => {
  for (const architecture of ['deployed', 'next']) {
    const geo = chainGeometry(chainMap({ architecture }));
    const drawn = geo.links.filter(l => l.kind === 'edge' || l.kind === 'fan');
    const evidenced = drawn.filter(l => !l.structural);
    assert.equal(evidenced.length, 1, `${architecture}: ${evidenced.length} evidenced links drawn`);
    assert.equal(evidenced[0].relationship, 'direct');
    assert.ok(evidenced[0].evidenceIds.length > 0, 'the one direct link cites no source');
    assert.ok(drawn.length > 10, 'the structural chain is not being drawn');
  }
});

/**
 * Tracing now walks the whole chain — that is the point of the map. What keeps
 * it honest is that the hops stay individually labelled, so a reader following a
 * long path can still see that one hop is evidenced and the rest are structure.
 */
test('tracing reaches across the whole chain and every hop stays labelled', () => {
  const g = chainMap({ architecture: 'deployed' });
  const chain = traceChain(g, 'ref-silicon-wafer');
  assert.ok(chain.size > 10, `tracing reached only ${chain.size} nodes`);
  assert.ok([...chain].some(id => id.startsWith('operator-')),
    'a wafer should reach the operators — that is the interdependency being shown');

  const inChain = g.edges.filter(e => e.from && e.to && chain.has(e.from) && chain.has(e.to));
  assert.ok(inChain.length > 5);
  for (const e of inChain) {
    assert.ok(e.structural === true || e.relationship === 'direct',
      `${e.id} is neither flagged structural nor an evidenced agreement`);
  }
});

test('a single maker on file is flagged only where it can be counted', () => {
  const g = chainMap({ architecture: 'deployed' });
  const flagged = singleMakerNodes(g);
  assert.ok(flagged.length > 0);
  for (const id of flagged) {
    const n = g.nodes.find(x => x.id === id);
    assert.ok(['inputs', 'components'].includes(n.column),
      `${id} is in ${n.column}, which has no makers to count`);
    const makers = Array.isArray(n.suppliers) ? n.suppliers.length : (n.supplierId ? 1 : 0);
    assert.equal(makers, 1, `${id} is flagged but has ${makers} makers on file`);
  }
  // Nothing with two or more makers may carry the flag.
  for (const n of g.nodes) {
    const makers = Array.isArray(n.suppliers) ? n.suppliers.length : 0;
    if (makers > 1) assert.ok(!flagged.includes(n.id), `${n.id} has ${makers} makers but is flagged`);
  }
});

test('a hexagon is a closed six-point polygon at the point it is asked for', () => {
  const pts = hexPoints(100, 50).split(' ').map(p => p.split(',').map(Number));
  assert.equal(pts.length, 6);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  assert.equal((Math.min(...xs) + Math.max(...xs)) / 2, 100);
  assert.equal((Math.min(...ys) + Math.max(...ys)) / 2, 50);
  assert.equal(Math.max(...xs) - Math.min(...xs), GEOMETRY.nodeW);
  assert.equal(Math.max(...ys) - Math.min(...ys), GEOMETRY.nodeH);
});

/* ================= route ================= */

test('the workspace is at /chain-mapping/ and the old route survives', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'dist/chain-mapping/index.html')));
  assert.ok(fs.existsSync(path.join(ROOT, 'dist/chain/index.html')),
    '/chain/ was deleted — it is a published URL');
  assert.match(page(), /<title>Chain mapping/);
});

/* ================= the list as a mobile surface ================= */

/**
 * The tier badge on the list is the legally load-bearing one.
 *
 * The graph has carried it since the tier system landed. The list did not,
 * which made the list the one surface where an industry-reference row and a row
 * T2C holds a document for looked identical — and the list is what a phone now
 * opens by default, and what a text-only export or a screen reader is most
 * likely to reach.
 */
test('every list row and every card states its tier', () => {
  const html = page();
  const nodes = (html.match(/class="cm-hexg"/g) || []).length;
  const tags = (html.match(/class="cm-tiertag" data-tier=/g) || []).length;
  /* One in the table row and one on the card, across both architecture modes —
     the same node count the graph draws. */
  assert.equal(tags, nodes * 2, `${tags} tier tags for ${nodes} nodes`);
  assert.ok(html.includes('>REFERENCE<'), 'no REFERENCE badge reaches the list');
  assert.ok(html.includes('>T2C RECORD<'), 'no evidenced badge reaches the list');
});

test('the cards carry every qualifier the table carries', () => {
  const html = page();
  const cards = (html.match(/class="cm-cardbtn"/g) || []).length;
  assert.ok(cards > 0, 'no cards rendered');
  assert.equal((html.match(/class="cm-cardid"/g) || []).length, cards);
  assert.equal((html.match(/class="cm-cardstage"/g) || []).length, cards);
  assert.equal((html.match(/class="cm-cardmeta"/g) || []).length, cards);
  /* Compressing a qualifier's presentation is allowed. Dropping it is not. */
  assert.ok(html.includes('No commercial stage on record'),
    'the cards drop the "none on record" marker');
});

test('the cards carry the attributes the filters act on', () => {
  const html = page();
  const cards = [...html.matchAll(/class="cm-cardbtn"([\s\S]{0,300}?)>/g)];
  assert.ok(cards.length > 0);
  for (const [, attrs] of cards) {
    for (const a of ['data-node', 'data-column', 'data-pillar', 'data-rel', 'data-tier', 'data-org']) {
      assert.ok(attrs.includes(a), `a card is missing ${a}, so a filter cannot reach it`);
    }
  }
});

/**
 * The rail ships OPEN, and that is not an accident.
 *
 * A closed `<details>` gives its non-summary children a zero-size box whatever
 * `display` they are given. Shipping it closed and re-opening it with CSS above
 * 640px therefore rendered every desktop control at 0×0 — invisible to a
 * pointer, still clickable by script, which is why only a real pointer-driven
 * check caught it. The script closes it on a narrow viewport instead, and a
 * reader with no JavaScript keeps the expanded rail they have today.
 */
test('the filter rail ships open so it is never a zero-size box', () => {
  const html = page();
  assert.ok(html.includes('<details class="cm-rail" open>'),
    'the rail ships closed; its controls render at 0×0 wherever CSS cannot reopen it');
  assert.ok(html.includes('class="cm-railsummary"'), 'the rail has no disclosure summary');
});

/* ================= the trace readout ================= */

/**
 * The idle string is declared in two places and must stay identical.
 *
 * chainmap-app.js is a plain browser script, not a module, so it cannot import
 * the constant the server renders. A drift would only show as the readout
 * changing its own wording the first time a trace ends — which nobody notices.
 */
test('the trace readout says the same thing on the server and in the client', () => {
  const client = read('src/chainmap-app.js').match(/var TRACE_IDLE = '([^']+)'/);
  const server = read('src/chainmap-ui.js').match(/export const TRACE_IDLE =\s*'([^']+)'/);
  assert.ok(client, 'the client declares no TRACE_IDLE');
  assert.ok(server, 'the server exports no TRACE_IDLE');
  assert.equal(client[1], server[1]);
  assert.ok(page().includes(client[1]), 'the idle readout is not in the rendered page');
});

/**
 * The readout survives the view toggle.
 *
 * The older HUD lives inside .cm-canvas, which list view hides — and list view
 * is what a phone opens. A readout only the desktop map can show is a readout
 * most readers never see.
 */
test('the trace readout sits outside the canvas so list view keeps it', () => {
  const html = page();
  const canvasStart = html.indexOf('class="cm-canvas"');
  const hudPos = html.indexOf('data-tracehud');
  assert.ok(hudPos > -1, 'no trace readout rendered');
  assert.ok(hudPos < canvasStart,
    'the readout is inside the canvas, so it disappears in list view');
});

/* ================= motion discipline ================= */

/**
 * Nothing on the commercial-stage ladder or on a per-company badge may move.
 *
 * A stage badge that animates is a delivery milestone celebrating itself, and
 * an evidence grade that pulses is a judgement about a company rather than
 * about a document. Both are off limits on a page about listed securities.
 */
test('no stage or evidence badge moves, pulses or fades', () => {
  const css = read('src/chainmap.css');
  const BADGES = ['.cm-stage', '.cm-tag', '.cm-tiertag', '.cm-dtier', '.cm-ladderrow'];
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = selector.trim();
    if (!BADGES.some(f => sel.split(',').some(p => p.trim().startsWith(f)))) continue;

    /* A keyframe animation on a badge is always wrong — that is a pulse, and a
       pulsing delivery stage is a milestone celebrating itself. */
    assert.ok(!/\banimation\b/.test(body), `${sel} carries a keyframe animation`);

    /* Movement and fading are equally wrong. A colour transition is not: the
       timeline playback steps through the ladder on a border-colour change, and
       that is a reader walking the stages deliberately, not a stage reacting to
       a company doing well. */
    for (const [, list] of body.matchAll(/transition:\s*([^;]+)/g)) {
      for (const part of list.split(',')) {
        const prop = part.trim().split(/\s+/)[0];
        assert.ok(!['transform', 'opacity', 'scale', 'all'].includes(prop),
          `${sel} transitions ${prop} — a badge may change colour, never move or fade`);
      }
    }
  }
});

/**
 * 60fps or it does not ship: transform and opacity only.
 *
 * A `:active` press that animated width, height or box-shadow would jank on
 * exactly the mid-range phone most readers are holding.
 */
test('every press state animates transform only', () => {
  const css = read('src/chainmap.css');
  const presses = [...css.matchAll(/(\.cm-[^{}]*:active[^{}]*)\{([^{}]*)\}/g)];
  assert.ok(presses.length >= 8, `only ${presses.length} press states found`);
  for (const [, sel, body] of presses) {
    const props = body.split(';').map(d => d.split(':')[0].trim()).filter(Boolean);
    for (const prop of props) {
      assert.ok(prop === 'transform' || prop === 'transform-origin' || prop === 'transform-box',
        `${sel.trim()} animates ${prop}; only transform composites`);
    }
  }
});
