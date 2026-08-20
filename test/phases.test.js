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
