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
