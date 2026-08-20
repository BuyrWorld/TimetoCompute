/**
 * The canonical stage list.
 *
 * These tests exist to stop the thing Milestone 1 was raised to fix from
 * happening again: a node gaining a stage in one place and not another, or a new
 * node arriving with no stage at all and being rendered as though it had one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES, STAGE_BY_N, CHAIN_STAGE_BY_ID, NODE_STAGE, stageOfNode
} from '../data/chainstages.js';
import { REFERENCE_NODES, REFERENCE_EDGES } from '../data/chainreference.js';
import { chainMap } from '../src/lib/chainmap.js';
import { PILLARS, MAP_PILLARS } from '../data/chainmap.js';
import { CORRIDORS } from '../src/lib/corridor.js';
import { PHOTONICS_SUPPLIERS } from '../data/suppliers.js';
import { STAGES as HOMEPAGE_STAGES, chainState } from '../src/lib/chain.js';
import { COMMERCIAL_STAGES, COMMERCIAL_STAGE_BY_ID } from '../data/chainmap.js';
import { EXPLAINER_BY_STAGE } from '../data/explainers.js';

test('there are ten stages, numbered 1 to 10 without gaps', () => {
  assert.equal(STAGES.length, 10);
  assert.deepEqual(STAGES.map(s => s.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('every stage carries an id, a label and plain English', () => {
  for (const s of STAGES) {
    assert.ok(s.id && s.label && s.plain && s.scope, `stage ${s.n} is missing a field`);
    assert.ok(!/^[A-Z]/.test(s.plain), `stage ${s.n} plain text should not start capitalised`);
  }
});

test('stage ids and numbers are unique', () => {
  assert.equal(new Set(STAGES.map(s => s.id)).size, 10);
  assert.equal(Object.keys(STAGE_BY_N).length, 10);
  assert.equal(Object.keys(CHAIN_STAGE_BY_ID).length, 10);
});

test('every reference node is assigned exactly one stage', () => {
  const unassigned = REFERENCE_NODES.filter(n => stageOfNode(n.id) === null);
  assert.deepEqual(unassigned.map(n => n.id), [],
    'a reference node with no stage would render without a position in the chain');
});

test('no stage is assigned to a node that does not exist', () => {
  const ids = new Set(REFERENCE_NODES.map(n => n.id));
  const orphans = Object.keys(NODE_STAGE).filter(id => !ids.has(id));
  assert.deepEqual(orphans, [], 'a stage entry outlived its node');
});

/**
 * The stage lives on the node now. NODE_STAGE is a lookup over the nodes rather
 * than a second list, so an omission can no longer be caught by the two
 * disagreeing — nothing would disagree, and the node would simply have no stage.
 * This is the test that catches it instead.
 */
test('every reference node declares its own stage', () => {
  const undeclared = REFERENCE_NODES
    .filter(n => typeof n.stage !== 'number')
    .map(n => n.id);
  assert.deepEqual(undeclared, [], 'a node reached the chain without a stage');
});

test('a node stage is always a real stage number', () => {
  for (const n of REFERENCE_NODES) {
    assert.ok(STAGE_BY_N[n.stage], `${n.id} claims stage ${n.stage}, which does not exist`);
  }
});

test('every stage number used is a real stage', () => {
  for (const [id, n] of Object.entries(NODE_STAGE)) {
    assert.ok(STAGE_BY_N[n], `${id} claims stage ${n}, which does not exist`);
  }
});

test('every node the live graph draws resolves to a stage', () => {
  /* Evidenced nodes are derived from records, so they are matched by prefix.
     A new generator with an unrecognised prefix must fail here rather than
     render a node with no position. */
  for (const arch of ['deployed', 'next']) {
    const g = chainMap({ architecture: arch });
    const unresolved = g.nodes.filter(n => stageOfNode(n.id) === null).map(n => n.id);
    assert.deepEqual(unresolved, [], `unresolved nodes in ${arch} mode`);
  }
});

test('both ends of every structural edge have a stage', () => {
  for (const [from, to] of REFERENCE_EDGES) {
    assert.ok(stageOfNode(from) !== null, `edge source ${from} has no stage`);
    assert.ok(stageOfNode(to) !== null, `edge target ${to} has no stage`);
  }
});

/**
 * The invariant that is deliberately NOT asserted, recorded so nobody adds it.
 *
 * Stage numbers do not increase along every edge, and a test asserting they do
 * would be wrong rather than failing. Power and cooling are parallel tracks that
 * converge on the rack, not later steps than compute. This test pins the
 * exceptions so that the day one disappears, someone reads the comment above it
 * rather than "fixing" the numbering.
 */
test('the backward edges are the four expected convergences, and no others', () => {
  const backward = REFERENCE_EDGES
    .filter(([from, to]) => stageOfNode(from) > stageOfNode(to))
    .map(([from, to]) => `${from}->${to}`);
  assert.deepEqual(backward.sort(), [
    'ref-cooling-direct->ref-rack-integration',
    'ref-cooling-immersion->ref-rack-integration',
    'ref-cooling-rear-door->ref-rack-integration',
    'ref-power-semis->ref-rack-integration'
  ], 'power and cooling converge on the rack; anything else here is a real error');
});

/* ------------------------------------------------------- one taxonomy ------ */

/**
 * Corridors and pillars are the same taxonomy seen from two pages. They used to
 * be two arrays that disagreed: /chain/ declared photonics untracked while
 * /chain-mapping/ declared it tracked, and T2C held seven photonics supplier
 * records the whole time. These tests exist so that cannot recur.
 */
test('corridors and pillars are the same objects, not two lists', () => {
  assert.equal(CORRIDORS, PILLARS,
    'the corridor list must be the pillar list, not a copy of it');
});

test('the map filters only by pillars a node can actually carry', () => {
  assert.ok(MAP_PILLARS.every(p => p.onMap));
  assert.ok(!MAP_PILLARS.some(p => p.id === 'ai-factory'),
    'no node carries an ai-factory pillar, so the map cannot filter by it');
});

test('every track carries both description lengths', () => {
  for (const p of PILLARS) {
    assert.ok(p.definition, `${p.id} has no definition for the map drawer`);
    assert.ok(p.plain, `${p.id} has no plain text for the corridor card`);
  }
});

test('an untracked track says what it would need, a tracked one does not', () => {
  for (const p of PILLARS) {
    if (p.tracked) assert.ok(!p.needs, `${p.id} is tracked but still lists what it needs`);
    else assert.ok(p.needs, `${p.id} is a gap and must say what would close it`);
  }
});

/**
 * The specific drift that caused the contradiction. `tracked` is declared, not
 * derived, so this asserts the declaration still matches the records behind it.
 */
test('photonics is marked tracked because photonics supplier records exist', () => {
  const photonics = PILLARS.find(p => p.id === 'photonics');
  assert.equal(photonics.tracked, PHOTONICS_SUPPLIERS.length > 0,
    'photonics tracked state has drifted from the supplier records again');
});

test('the tracks with no supplier records are not marked tracked', () => {
  for (const id of ['hbm-packaging', 'power-cooling']) {
    const p = PILLARS.find(x => x.id === id);
    assert.equal(p.tracked, false,
      `${id} is marked tracked, but no supplier dataset backs it`);
  }
});

/* --------------------------------------------- the homepage compression ---- */

/**
 * The homepage row compresses ten canonical stages into five hexagons plus a
 * two-step commercial tail. It no longer asserts a chain of its own: each entry
 * names the canonical stages it covers, and the commercial pair names the
 * commercial rung it reports rather than pretending to be a position in the
 * chain.
 */
test('every homepage chain stage names the canonical stages it compresses', () => {
  const chain = HOMEPAGE_STAGES.filter(s => s.axis === 'chain');
  assert.ok(chain.length > 0);
  for (const s of chain) {
    assert.ok(Array.isArray(s.stages) && s.stages.length > 0,
      `${s.id} does not say which canonical stages it covers`);
    for (const n of s.stages) {
      assert.ok(STAGE_BY_N[n], `${s.id} claims canonical stage ${n}, which does not exist`);
    }
  }
});

test('the homepage covers every canonical stage from atoms to operators', () => {
  const covered = new Set(HOMEPAGE_STAGES.flatMap(s => s.stages || []));
  const missing = [1, 2, 3, 4, 5, 6, 7, 8].filter(n => !covered.has(n));
  assert.deepEqual(missing, [],
    'a canonical stage has no hexagon representing it on the homepage');
});

/**
 * Stages 9 and 10 are deliberately absent from the chain hexagons. Buyers and
 * end applications are who pays and what for, which the commercial tail reports
 * as states rather than as positions in the chain.
 */
test('the commercial tail reports rungs, not chain positions', () => {
  const commercial = HOMEPAGE_STAGES.filter(s => s.axis === 'commercial');
  assert.deepEqual(commercial.map(s => s.id), ['accepted', 'revenue']);
  for (const s of commercial) {
    assert.deepEqual(s.stages, [], `${s.id} claims a chain position it does not have`);
    assert.ok(COMMERCIAL_STAGES.some(c => c.id === s.commercialStage),
      `${s.id} reports commercial rung "${s.commercialStage}", which is not a rung`);
  }
});

test('every homepage stage declares which axis it belongs to', () => {
  for (const s of HOMEPAGE_STAGES) {
    assert.ok(['chain', 'commercial'].includes(s.axis), `${s.id} has no axis`);
  }
});

/**
 * The homepage said photonics was untracked while seven sourced supplier records
 * sat behind it, and went on saying it. Derived now, and asserted here.
 */
test('the homepage photonics stage is tracked because the records exist', () => {
  const photonics = HOMEPAGE_STAGES.find(s => s.id === 'photonics');
  assert.equal(photonics.tracked, PHOTONICS_SUPPLIERS.length > 0);
  assert.equal(photonics.needs, null, 'a tracked stage must not still ask to be tracked');
});

test('a tracked homepage stage reports a real count', () => {
  for (const s of chainState()) {
    if (!s.tracked) continue;
    assert.ok(s.count && s.count.primary && s.count.secondary,
      `${s.id} is tracked but reports no count`);
    assert.ok(!/undefined|NaN/.test(s.count.primary + s.count.secondary),
      `${s.id} count is malformed: ${JSON.stringify(s.count)}`);
  }
});

/* ------------------------------------------------ the two stage lookups ---- */

/**
 * There used to be two exports called STAGE_BY_ID, in different files, over
 * disjoint id spaces: one keyed by chain stage (materials..revenue), one by
 * commercial rung (capacity..recognised). Every import happened to be correct,
 * and nothing would have failed if one had not been. They are now named for what
 * they hold, and these tests assert the id spaces stay disjoint so a future
 * collision is a test failure rather than a silent wrong lookup.
 */
test('the explainer lookup is keyed by chain stage, not by commercial rung', () => {
  const keys = Object.keys(EXPLAINER_BY_STAGE);
  const homeIds = new Set(HOMEPAGE_STAGES.map(s => s.id));
  for (const k of keys) {
    assert.ok(homeIds.has(k), `${k} is not a chain stage id`);
  }
});

test('the commercial lookup is keyed by commercial rung, not by chain stage', () => {
  const keys = Object.keys(COMMERCIAL_STAGE_BY_ID);
  const rungs = new Set(COMMERCIAL_STAGES.map(s => s.id));
  for (const k of keys) {
    assert.ok(rungs.has(k), `${k} is not a commercial rung`);
  }
});

test('the two id spaces do not overlap', () => {
  /* `accepted` is the one word both vocabularies could plausibly claim. It
     belongs to the commercial ladder; the homepage entry that reports it is
     marked axis 'commercial' and carries no chain position. If a chain stage
     ever takes an id that is also a rung, the lookups become ambiguous again. */
  const chainIds = new Set(
    HOMEPAGE_STAGES.filter(s => s.axis === 'chain').map(s => s.id)
  );
  const overlap = COMMERCIAL_STAGES.map(s => s.id).filter(id => chainIds.has(id));
  assert.deepEqual(overlap, [],
    'a chain stage and a commercial rung share an id');
});
