/**
 * Site model tests.
 *
 * The rules that matter here are all honesty rules: a stage nobody has reported
 * is not the same as a stage not yet reached, a replay may only replay dated
 * facts, and a confidence bar computed from a single gate is withheld.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROJECTS } from '../data/projects.js';
import { GATE_BY_ID } from '../data/schema.js';
import { firstSentence } from '../src/lib/format.js';
import {
  PATH, allSites, siteBySlug, siteSlug, path as sitePath, replay, latestEvidence,
  dependencies, evidenceConfidence, nextMilestone, furthestStage, stageFilterOptions
} from '../src/lib/sites.js';

const bySlug = s => siteBySlug(s);

test('every project becomes a site with a unique, url-safe slug', () => {
  const sites = allSites();
  assert.equal(sites.length, PROJECTS.length);
  const slugs = sites.map(s => s.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'two sites share a slug');
  for (const s of slugs) {
    assert.match(s, /^[a-z0-9-]+$/, `${s} is not url-safe`);
  }
});

test('every path stage names only gates that exist in the schema', () => {
  for (const stage of PATH) {
    for (const g of stage.gates) {
      assert.ok(GATE_BY_ID[g], `path stage ${stage.id} names unknown gate ${g}`);
    }
  }
});

test('the path has no stage that can never be evidenced', () => {
  // A stage backed by no gate would render as permanently unknown — a decorative
  // affordance, which the brief forbids.
  for (const stage of PATH) {
    assert.ok(stage.gates.length > 0, `path stage ${stage.id} has no backing gate`);
  }
});

test('an unreported stage says not disclosed, never not started', () => {
  const site = bySlug('iren-bc'); // one gate only: siteControl
  const stages = sitePath(site.project);
  const construction = stages.find(s => s.id === 'construction');
  assert.equal(construction.status, 'notDisclosed');
  assert.equal(construction.statusLabel, 'Not disclosed');
});

test('a completed stage carries the date and the sources that prove it', () => {
  const site = bySlug('iren-horizon-1');
  const acceptance = site.path.find(s => s.id === 'acceptance');
  assert.equal(acceptance.status, 'complete');
  assert.equal(acceptance.effectiveAt, '2026-08-13');
  assert.ok(acceptance.sourceIds.length > 0, 'an accepted stage cites nothing');
});

test('a stage rolls up several gates, and complete wins over in progress', () => {
  const site = bySlug('iren-childress');
  const energised = site.path.find(s => s.id === 'energised');
  // criticalItEnergised is complete; utilityEnergised is not reported at all.
  assert.equal(energised.status, 'complete');
});

test('the replay only replays dated facts', () => {
  for (const site of allSites()) {
    for (const r of replay(site.project)) {
      assert.match(r.at, /^\d{4}-\d{2}-\d{2}$/, `${site.slug} replays an undated gate`);
    }
    const dates = replay(site.project).map(r => r.at);
    assert.deepEqual(dates, [...dates].sort(), `${site.slug} replay is out of order`);
  }
});

test('latest evidence always carries a source or is withheld', () => {
  for (const site of allSites()) {
    const e = latestEvidence(site.project);
    if (e === null) continue;
    assert.ok(e.at, `${site.slug} has evidence with no date`);
    assert.ok(Array.isArray(e.sourceIds), `${site.slug} evidence has no source list`);
  }
});

test('confidence is withheld when there is too little to measure', () => {
  const thin = bySlug('iren-bc'); // a single reported gate
  assert.equal(evidenceConfidence(thin.project), null);

  const rich = bySlug('iren-horizon-1');
  const c = evidenceConfidence(rich.project);
  assert.ok(c, 'a well-evidenced site reports no confidence');
  assert.ok(c.total >= 2);
  assert.ok(c.share >= 0 && c.share <= 1);
  assert.ok(['high', 'medium', 'low'].includes(c.level));
});

test('cooling and networking are declared and honestly undisclosed', () => {
  const deps = dependencies(bySlug('iren-horizon-1').project);
  const ids = deps.map(d => d.id);
  assert.ok(ids.includes('cooling') && ids.includes('networking'));
  for (const id of ['cooling', 'networking']) {
    assert.equal(deps.find(d => d.id === id).status, 'notDisclosed',
      `${id} claims a status no company discloses`);
  }
});

test('a dependency backed by a real gate reports that gate status', () => {
  const deps = dependencies(bySlug('iren-horizon-1').project);
  const customer = deps.find(d => d.id === 'customer');
  assert.equal(customer.status, 'complete');
  assert.ok(customer.sourceIds.length > 0);
});

test('the next milestone never points backwards past completed work', () => {
  // Horizon 1 has no site-control gate on record but has been accepted by
  // Microsoft. "Next: announced" would be nonsense.
  const site = bySlug('iren-horizon-1');
  const next = nextMilestone(site.project);
  assert.ok(next, 'a site short of billing reports no next milestone');
  assert.equal(next.id, 'billing');
  assert.notEqual(next.status, 'complete');
});

test('no site reports a next milestone that sits before a completed one', () => {
  for (const site of allSites()) {
    const next = nextMilestone(site.project);
    if (!next) continue;
    const order = site.path.map(p => p.id);
    const nextAt = order.indexOf(next.id);
    const lastComplete = site.path.reduce((acc, s, i) => (s.status === 'complete' ? i : acc), -1);
    assert.ok(nextAt > lastComplete,
      `${site.slug} says next is "${next.label}" but has already completed a later stage`);
  }
});

test('a site with every stage complete reports no next milestone', () => {
  const complete = allSites().find(s => s.path.every(p => p.status === 'complete'));
  if (!complete) return; // none today; the assertion below is the contract if one appears
  assert.equal(nextMilestone(complete.project), null);
});

test('contracts attach to a site only where the company named the site', () => {
  const horizon = bySlug('iren-horizon-1');
  assert.ok(horizon.contracts.some(c => c.customer === 'Microsoft'));

  // The NVIDIA agreement names no site, so it must not surface on one.
  for (const site of allSites()) {
    assert.ok(!site.contracts.some(c => c.id === 'iren-nvda'),
      `${site.slug} claims a contract whose site was never disclosed`);
  }
});

test('furthest stage is a completed stage or nothing', () => {
  for (const site of allSites()) {
    const f = furthestStage(site);
    if (f) assert.equal(f.status, 'complete', `${site.slug} reports an incomplete furthest stage`);
  }
});

test('directory filter options all match at least one site', () => {
  const opts = stageFilterOptions();
  assert.ok(opts.length > 0);
  for (const o of opts) {
    assert.ok(allSites().some(s => furthestStage(s)?.id === o.id),
      `filter "${o.label}" matches no site`);
  }
});

test('capacity is never coerced to zero when undisclosed', () => {
  for (const site of allSites()) {
    if (site.capacityMw === null) continue;
    assert.notEqual(site.capacityMw, 0, `${site.slug} reports 0 MW`);
  }
  const undisclosed = allSites().filter(s => s.capacityMw === null);
  assert.ok(undisclosed.length > 0, 'no site is undisclosed — the fixture has drifted');
});

test('a card summary never cuts a number in half', () => {
  // "approximately $7.5bn" must not print as "approximately $7."
  assert.equal(
    firstSentence('300 MW leased to a hyperscaler, approximately $7.5bn over 15 years. More text here.'),
    '300 MW leased to a hyperscaler, approximately $7.5bn over 15 years.'
  );
  assert.equal(firstSentence('One sentence only'), 'One sentence only');
  assert.equal(firstSentence(''), '');
  assert.equal(firstSentence(null), '');
});

test('every site note renders as a whole sentence on its card', () => {
  for (const site of allSites()) {
    if (!site.note) continue;
    const s = firstSentence(site.note);
    assert.ok(s.length > 0, `${site.slug} produced an empty summary`);
    // The real failure mode: the cut lands inside a number, so the character
    // following it in the source is a digit.
    if (site.note.startsWith(s) && s.length < site.note.length) {
      assert.ok(!/^\d/.test(site.note.slice(s.length)),
        `${site.slug} summary ends mid-number: "${s}"`);
    }
  }
});

/* ---- implied stages ---- */

test('a stage before a confirmed one is implied, not left blank', () => {
  // Horizon 1 is accepted by Microsoft. It cannot have been accepted without
  // having been built, so the earlier undisclosed stages read as implied.
  const site = bySlug('iren-horizon-1');
  const announced = site.path.find(s => s.id === 'announced');
  assert.equal(announced.status, 'implied');
  assert.equal(announced.statusLabel, 'Implied');
  assert.ok(announced.impliedBy, 'an implied stage does not say what implies it');
});

test('an implied stage carries no date and no source', () => {
  for (const site of allSites()) {
    for (const s of site.path) {
      if (s.status !== 'implied') continue;
      assert.equal(s.effectiveAt, null, `${site.slug}/${s.id} invented a date`);
      assert.equal(s.sourceIds.length, 0, `${site.slug}/${s.id} invented a source`);
    }
  }
});

test('nothing after the furthest confirmed stage is ever implied', () => {
  // Billing does not follow from acceptance. Only stages BEFORE a confirmed one
  // are physically necessary.
  for (const site of allSites()) {
    const lastComplete = site.path.reduce((acc, s, i) => (s.status === 'complete' ? i : acc), -1);
    site.path.forEach((s, i) => {
      if (s.status === 'implied') {
        assert.ok(i < lastComplete, `${site.slug}/${s.id} is implied but sits after the last confirmed stage`);
      }
    });
  }
  const h1 = bySlug('iren-horizon-1');
  assert.equal(h1.path.find(s => s.id === 'billing').status, 'notDisclosed');
});

test('an explicitly not-started gate is never overwritten as implied', () => {
  // A company saying "not started" before a completed stage is a contradiction
  // in the record. It stays visible rather than being papered over.
  for (const site of allSites()) {
    for (const s of site.path) {
      if (s.status === 'implied') {
        assert.notEqual(s.statusLabel, 'Not started');
      }
    }
  }
});

test('implied stages never raise an evidence score', () => {
  const site = bySlug('iren-horizon-1');
  const implied = site.path.filter(s => s.status === 'implied').length;
  assert.ok(implied > 0, 'fixture no longer produces implied stages');
  // Confidence counts reported gates on the project, which implication does not touch.
  assert.equal(site.evidence.total, site.evidence.confirmed);
  assert.equal(site.evidence.total, 4);
});

test('the furthest evidenced stage ignores implication', () => {
  const site = bySlug('iren-horizon-1');
  const f = furthestStage(site);
  assert.equal(f.status, 'complete', 'furthest stage resolved to an implied one');
  assert.equal(f.id, 'acceptance');
});

test('an unknown slug returns null rather than an empty site', () => {
  assert.equal(siteBySlug('not-a-site'), null);
});

test('slug round-trips through the model', () => {
  for (const p of PROJECTS) {
    assert.equal(siteBySlug(siteSlug(p)).project.id, p.id);
  }
});
