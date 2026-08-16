/**
 * Signal classification tests.
 *
 * The classifier decides what a reader is told a change MEANS, so the tests here
 * are mostly about refusing to flatter the data: a raised target is not delivery,
 * a disposal is not progress, and a filter that matches nothing is not offered.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS } from '../data/events.js';
import { EVENT_TYPES } from '../data/schema.js';
import {
  CATEGORIES, CATEGORY_BY_ID, classify, direction, toSignal, signals,
  countsByCategory, availableCategories, todaySet, latestAnnouncement
} from '../src/lib/signals.js';

const byId = id => EVENTS.find(e => e.id === id);

test('every event classifies into a declared category', () => {
  for (const e of EVENTS) {
    const c = classify(e);
    assert.ok(CATEGORY_BY_ID[c], `${e.id} classified as unknown category ${c}`);
  }
});

test('every event type in the schema has a defined outcome', () => {
  for (const type of Object.keys(EVENT_TYPES)) {
    const c = classify({ eventType: type, previousValue: null, newValue: null });
    assert.ok(CATEGORY_BY_ID[c], `event type ${type} falls through the classifier`);
  }
});

test('a raised target is outlook, never advanced', () => {
  // Nebius lifted a year-end ambition from 3.5 GW to 5 GW. No megawatt moved.
  const e = byId('nbis-2026-q2-target-5gw');
  assert.equal(e.eventType, 'target-change');
  assert.ok(e.newValue > e.previousValue, 'fixture no longer describes a raised target');
  assert.equal(classify(e), 'outlook');
});

test('a disposal is a reduction, never progress', () => {
  const e = byId('wulf-2026-08-04-abernathy');
  assert.equal(classify(e), 'reduced');
});

test('acceptance and revenue commencement count as advanced', () => {
  assert.equal(classify(byId('iren-2026-08-13-horizon1')), 'advanced');
  assert.equal(classify(byId('wulf-2026-q2-102mw')), 'advanced');
});

test('a signed contract is its own category', () => {
  assert.equal(classify(byId('iren-2026-06-nvidia')), 'contract');
});

test('a capacity change is classified by direction, not by name', () => {
  assert.equal(classify({ eventType: 'capacity-change', previousValue: 100, newValue: 200 }), 'advanced');
  assert.equal(classify({ eventType: 'capacity-change', previousValue: 200, newValue: 100 }), 'reduced');
});

test('direction is read from the numbers or withheld', () => {
  assert.equal(direction({ previousValue: 1, newValue: 2 }), 'up');
  assert.equal(direction({ previousValue: 2, newValue: 1 }), 'down');
  assert.equal(direction({ previousValue: null, newValue: 50 }), null);
  assert.equal(direction({ previousValue: null, newValue: null }), null);
});

test('a signal carries its sources and never invents a project', () => {
  for (const s of signals({})) {
    assert.ok(Array.isArray(s.sourceIds) && s.sourceIds.length > 0, `${s.id} cites no document`);
    if (s.projectId === null) {
      assert.equal(s.projectName, null, `${s.id} names a project it is not attached to`);
    }
  }
});

test('signals are newest first and ties break deterministically', () => {
  const rows = signals({});
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i - 1].announcedAt >= rows[i].announcedAt, 'signals are out of order');
  }
  assert.deepEqual(signals({}).map(s => s.id), signals({}).map(s => s.id), 'ordering is not stable');
});

test('since includes the day itself', () => {
  const latest = latestAnnouncement();
  const on = signals({ since: latest });
  assert.ok(on.length > 0, 'a reader returning on announcement day sees nothing');
  assert.ok(on.every(s => s.announcedAt === latest));
});

test('since accepts a full timestamp, not only a date', () => {
  const latest = latestAnnouncement();
  assert.deepEqual(
    signals({ since: `${latest}T09:30:00.000Z` }).map(s => s.id),
    signals({ since: latest }).map(s => s.id)
  );
});

test('a future since returns an empty set rather than everything', () => {
  assert.equal(signals({ since: '2099-01-01' }).length, 0);
});

test('filters compose', () => {
  const rows = signals({ category: 'advanced', companyId: 'iren' });
  assert.ok(rows.length > 0);
  for (const s of rows) {
    assert.equal(s.category, 'advanced');
    assert.equal(s.companyId, 'iren');
  }
});

test('only categories that match a record are offered', () => {
  const offered = availableCategories();
  assert.ok(offered.length > 0);
  for (const c of offered) {
    assert.ok(c.count > 0, `${c.id} is offered but matches nothing`);
    assert.equal(signals({ category: c.id }).length, c.count);
  }
  const ids = offered.map(c => c.id);
  for (const c of CATEGORIES) {
    if (!ids.includes(c.id)) {
      assert.equal(signals({ category: c.id }).length, 0,
        `${c.id} matches records but is not offered`);
    }
  }
});

test('counts since a date never exceed the total', () => {
  const all = countsByCategory({});
  const recent = countsByCategory({ since: '2026-08-01' });
  for (const r of recent) {
    const total = all.find(a => a.id === r.id);
    assert.ok(total && r.count <= total.count, `${r.id} counts more since a date than in total`);
  }
});

test('the daily set is finite and closed on one announcement date', () => {
  const t = todaySet();
  assert.ok(t.at, 'the ledger reports no latest date');
  assert.ok(t.signals.length > 0);
  assert.ok(t.signals.every(s => s.announcedAt === t.at));
  assert.ok(t.signals.length < EVENTS.length, 'the "daily" set is the whole ledger');
});

test('every category declares a definition a reader can act on', () => {
  for (const c of CATEGORIES) {
    assert.ok(c.definition && c.definition.length > 20, `${c.id} has no usable definition`);
    assert.ok(c.label && c.glyph && c.tone, `${c.id} is missing display metadata`);
  }
});

test('tone is never the only thing distinguishing a category', () => {
  // Status must not be communicated by colour alone.
  for (const c of CATEGORIES) {
    assert.ok(c.label.trim().length > 0, `${c.id} has no text label`);
  }
});

test('a signal preserves the undisclosed previous value rather than zeroing it', () => {
  const s = toSignal(byId('iren-2026-08-13-horizon1'));
  assert.equal(s.previousValue, null);
  assert.equal(s.newValue, 50);
});
