/**
 * Phased site records.
 *
 * A site holds one or more phases when its blocks sit at different stages. These
 * tests exist to stop the two ways this can go quietly wrong: a phase figure
 * that nobody sourced, and a site total that drifts from the phases under it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROJECTS } from '../data/projects.js';
import { phase, phaseCapacity, POWER_BASIS } from '../data/schema.js';
import { phasePaths, pathConflicts, path } from '../src/lib/sites.js';

const phased = PROJECTS.filter(p => p.phases && p.phases.length);

test('a phased site has at least two phases', () => {
  for (const p of phased) {
    assert.ok(p.phases.length >= 2,
      `${p.id} has one phase, which is the same as having none`);
  }
});

test('every phase names itself and carries a stable id', () => {
  for (const p of phased) {
    const ids = p.phases.map(f => f.id);
    assert.equal(new Set(ids).size, ids.length, `${p.id} has duplicate phase ids`);
    for (const f of p.phases) {
      assert.ok(f.name, `${p.id}/${f.id} has no name`);
      assert.ok(/^[a-z0-9-]+$/.test(f.id), `${p.id}/${f.id} is not a stable slug`);
    }
  }
});

/**
 * The rule that keeps a phase honest. A capacity with no basis is not a figure —
 * two blocks quoting the same number may be measuring different things.
 */
test('a phase capacity always states its basis', () => {
  for (const p of phased) {
    for (const f of p.phases) {
      if (f.capacityMw === null) continue;
      assert.ok(POWER_BASIS[f.powerBasis],
        `${p.id}/${f.id} states ${f.capacityMw} MW with no valid basis`);
    }
  }
});

/**
 * The migration's load-bearing check. Restructuring must not move a number, so
 * where phases fully decompose a site, they must sum to exactly what the site
 * already published — not approximately, and not to a figure that happens to
 * look plausible.
 */
test('phases sum to the site total they decompose', () => {
  for (const p of phased) {
    const sum = phaseCapacity(p.phases);
    if (!sum) continue;                       /* partial breakdown, not a total */
    assert.equal(sum.mw, p.capacityMw,
      `${p.id} phases sum to ${sum.mw} MW but the site publishes ${p.capacityMw} MW`);
    assert.equal(sum.basis, p.powerBasis,
      `${p.id} phases are ${sum.basis} but the site is ${p.powerBasis}`);
  }
});

test('phaseCapacity refuses to sum across different bases', () => {
  const mixed = [
    phase({ id: 'a', name: 'A', capacityMw: 10, powerBasis: 'critical-it' }),
    phase({ id: 'b', name: 'B', capacityMw: 10, powerBasis: 'gross-utility' })
  ];
  assert.equal(phaseCapacity(mixed), null,
    'summing critical IT and gross utility would produce a meaningless number');
});

test('phaseCapacity refuses to sum a partial breakdown', () => {
  const partial = [
    phase({ id: 'a', name: 'A', capacityMw: 10, powerBasis: 'critical-it' }),
    phase({ id: 'b', name: 'B' })
  ];
  assert.equal(phaseCapacity(partial), null,
    'a total that silently omits an unsourced phase would read as complete');
});

test('a phase capacity with no basis is rejected at construction', () => {
  assert.throws(() => phase({ id: 'x', name: 'X', capacityMw: 50 }),
    /no valid basis/);
});

/**
 * Every gate must remain reachable. Twelve places read project.gates — the
 * evidence score, the score model, the validator. If a gate moved into a phase
 * and out of that array, a phased site would have gone silent in all of them at
 * once: Lake Mariner would have stopped reporting that it is billing.
 */
test('phase gates stay visible in the flat gates array', () => {
  for (const p of phased) {
    const flat = p.gates.map(g => g.id);
    for (const f of p.phases) {
      for (const g of f.gates || []) {
        assert.ok(flat.includes(g.id),
          `${p.id}/${f.id} gate ${g.id} is invisible to everything reading project.gates`);
      }
    }
    assert.equal(p.gates.length, p.siteGates.length + p.phases.flatMap(f => f.gates || []).length,
      `${p.id} flat gate count does not equal site gates plus phase gates`);
  }
});

test('a gate inside a phase says which phase it belongs to', () => {
  for (const p of phased) {
    const phaseIds = new Set(p.phases.map(f => f.id));
    for (const g of p.gates) {
      if (!g.phaseId) continue;
      assert.ok(phaseIds.has(g.phaseId),
        `${p.id} gate ${g.id} claims phase ${g.phaseId}, which does not exist`);
    }
    const tagged = p.gates.filter(g => g.phaseId).length;
    assert.equal(tagged, p.phases.flatMap(f => f.gates || []).length,
      `${p.id} has phase gates that lost their phaseId in the merge`);
  }
});

test('a site-wide gate is not also claimed by a phase', () => {
  for (const p of phased) {
    const siteIds = p.siteGates.map(g => g.id);
    const phaseGateIds = p.phases.flatMap(f => (f.gates || []).map(g => g.id));
    const both = siteIds.filter(id => phaseGateIds.includes(id));
    assert.deepEqual(both, [],
      `${p.id} records ${both.join(', ')} at both site and phase level`);
  }
});

/**
 * Sources are why the record exists. A phase that carries a figure and no
 * document is the thing this whole site is built to prevent.
 */
test('a phase stating a capacity carries a source', () => {
  for (const p of phased) {
    for (const f of p.phases) {
      if (f.capacityMw === null) continue;
      assert.ok((f.sourceIds || []).length,
        `${p.id}/${f.id} states ${f.capacityMw} MW with no source`);
    }
  }
});

test('no source is orphaned by the split', () => {
  for (const p of phased) {
    const reachable = new Set([
      ...(p.sourceIds || []),
      ...p.gates.flatMap(g => g.sourceIds || []),
      ...p.phases.flatMap(f => f.sourceIds || []),
      ...(p.schedules || []).flatMap(s => s.sourceIds || [])
    ]);
    for (const s of p.sourceIds || []) {
      assert.ok(reachable.has(s), `${p.id} lost site source ${s} in the split`);
    }
  }
});

/* ------------------------------------------------- the path rebuild -------- */

/**
 * Each phase draws its own track, and each must be internally ordered. Drawing
 * two blocks over one track is what produced the contradiction this milestone
 * exists to remove.
 */
test('every phase path is internally consistent', () => {
  for (const p of phased) {
    for (const ph of phasePaths(p)) {
      assert.deepEqual(ph.conflicts, [],
        `${p.id}/${ph.id} contradicts itself: ${JSON.stringify(ph.conflicts)}`);
    }
  }
});

test('a phase track is labelled with its name and its capacity', () => {
  for (const p of phased) {
    for (const ph of phasePaths(p)) {
      assert.ok(ph.name, `${p.id}/${ph.id} has no name to label its track`);
      assert.ok(ph.capacityMw === null || ph.powerBasis,
        `${p.id}/${ph.id} would render a capacity with no basis`);
    }
  }
});

test('a phase path carries all seven stages', () => {
  for (const p of phased) {
    for (const ph of phasePaths(p)) {
      assert.equal(ph.stages.length, 7,
        `${p.id}/${ph.id} renders ${ph.stages.length} stages`);
    }
  }
});

test('an unphased site returns no phase paths and keeps its single track', () => {
  const plain = PROJECTS.find(p => !p.phases || !p.phases.length);
  assert.deepEqual(phasePaths(plain), []);
});

/**
 * A conflict is reported, never repaired. If a rendering could reorder stages to
 * look consistent, the tidy version would be a lie a reader could not detect.
 */
test('pathConflicts finds a contradiction without reordering it', () => {
  const stages = [
    { id: 'announced', status: 'complete' },
    { id: 'power', status: 'complete' },
    { id: 'construction', status: 'inProgress' },
    { id: 'energised', status: 'complete' }
  ];
  const found = pathConflicts(stages);
  assert.equal(found.length, 1);
  assert.deepEqual(found[0], { from: 'construction', fromStatus: 'inProgress', to: 'energised' });
  assert.equal(stages[2].id, 'construction', 'the stages were reordered');
});

test('an unfinished stage before a not-disclosed one is not a conflict', () => {
  assert.deepEqual(pathConflicts([
    { id: 'construction', status: 'inProgress' },
    { id: 'energised', status: 'notDisclosed' }
  ]), [], 'absence of knowledge is not a contradiction');
});

/**
 * THE CORRECTION THAT MATTERS MOST HERE. A signed contract proves nothing
 * physical. Treating it as sequential told readers that construction had
 * certainly started at a campus that has not broken ground, and that three other
 * sites were certainly energised, on the strength of a signature.
 */
test('a customer signature does not imply any physical stage', () => {
  for (const p of PROJECTS) {
    const st = path(p);
    const by = Object.fromEntries(st.map(s => [s.id, s]));
    const physicalComplete = ['announced', 'power', 'construction', 'energised']
      .some(id => by[id] && by[id].status === 'complete');
    if (physicalComplete) continue;
    /* Nothing physical is evidenced, so nothing physical may be implied. */
    const implied = ['announced', 'power', 'construction', 'energised']
      .filter(id => by[id] && by[id].status === 'implied');
    assert.deepEqual(implied, [],
      `${p.id} implies ${implied.join(', ')} with no completed physical stage behind it`);
  }
});

test('contracted never anchors an implication', () => {
  for (const p of PROJECTS) {
    for (const s of path(p)) {
      if (s.status === 'implied') {
        assert.notEqual(s.impliedBy, 'Customer contracted',
          `${p.id}/${s.id} is implied by a signature`);
      }
    }
  }
});
