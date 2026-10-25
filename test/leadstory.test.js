/**
 * Lead story tests.
 *
 * The homepage headline is the loudest claim on the site. These tests exist to
 * keep it from ever saying more than the record does — above all, that a gate is
 * never promoted: acceptance is not billing, a contract is not energisation, and
 * a raised target is not delivery.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS } from '../data/events.js';
import { COMPANIES } from '../data/companies.js';
import { signals, toSignal } from '../src/lib/signals.js';
import { getMeasure, isKnown } from '../src/lib/compute.js';
import { leadStory, storyFor, headlineFor, consequenceFor, JOURNEY } from '../src/lib/leadstory.js';

const sig = id => toSignal(EVENTS.find(e => e.id === id));

/* The acceptance story is the fixture for every gate-wording test. These used
   to read whatever leadStory() returned, so refreshing the data — a newer event
   taking the front page — broke tests that were about wording, not selection. */
const horizon1 = () => storyFor(sig('iren-2026-08-13-horizon1'));

/* ---- selection ---- */

test('the lead story is the newest high-significance confirmed record', () => {
  const s = leadStory();
  assert.ok(s.available);
  assert.equal(s.confidence, 'confirmed');
  const high = signals({}).filter(x => x.confidence === 'confirmed' && x.significance === 'high')
    .sort((a, b) => String(b.announcedAt).localeCompare(String(a.announcedAt)));
  assert.equal(s.id, high[0].id);
});

test('a routine filing never takes the front page from a high-significance one', () => {
  // The revolver amendment is the newest record on file and must not lead.
  const s = leadStory();
  assert.notEqual(s.signal.eventType, 'financing');
  assert.equal(s.signal.significance, 'high');
});

test('only a confirmed record may lead the homepage', () => {
  // The hero rests on a primary document or it does not run.
  const s = leadStory();
  assert.notEqual(s.confidence, 'reported');
  assert.notEqual(s.confidence, 'estimated');
  assert.ok(s.sourceIds.length > 0, 'the lead story cites no document');
});

test('selection is deterministic', () => {
  assert.equal(leadStory().id, leadStory().id);
});

/* ---- the gate is never overstated ---- */

test('acceptance is never rendered as revenue', () => {
  const s = horizon1();
  assert.equal(s.signal.eventType, 'customer-accepted');
  const text = [s.headline, s.consequence].join(' ').toLowerCase();
  for (const forbidden of ['earning money', 'earning revenue', 'revenue has begun', 'is billing', 'now billing']) {
    assert.ok(!text.includes(forbidden), `acceptance was promoted to billing: "${forbidden}"`);
  }
  // For an operator with no billing on record, it says so explicitly.
  const asIfKeel = consequenceFor({ ...sig('iren-2026-08-13-horizon1'), companyId: 'keel' });
  assert.match(asIfKeel, /billing has not yet been disclosed/i);
});

test('the consequence checks the record instead of assuming what follows', () => {
  // Keel has no disclosed billing, so the acceptance sentence must say so.
  const keel = COMPANIES.find(c => c.ticker === 'KEEL');
  assert.equal(isKnown(getMeasure(keel, 'revenueLiveMw')), false, 'fixture changed');
  const asIfKeel = consequenceFor({ ...sig('iren-2026-08-13-horizon1'), companyId: 'keel' });
  assert.match(asIfKeel, /not yet been disclosed/i);

  // IREN HAS disclosed billing capacity (its 10-K), so its own acceptance
  // sentence must not claim the disclosure is missing.
  const iren = COMPANIES.find(c => c.ticker === 'IREN');
  assert.equal(isKnown(getMeasure(iren, 'revenueLiveMw')), true, 'fixture changed');
  assert.ok(!/not yet been disclosed/i.test(consequenceFor(sig('iren-2026-08-13-horizon1'))),
    'the sentence ignored the company and asserted a missing disclosure that exists');
});

test('a raised target is never rendered as delivery', () => {
  const s = sig('nbis-2026-q2-target-5gw');
  const text = (headlineFor(s) + ' ' + consequenceFor(s)).toLowerCase();
  for (const forbidden of ['delivers', 'delivered', 'accepts', 'accepted', 'switched on', 'energised', 'built']) {
    assert.ok(!text.includes(forbidden), `a target was described as delivery: "${forbidden}"`);
  }
  assert.match(consequenceFor(s), /not capacity that exists today/i);
});

test('a signed contract is never rendered as built capacity', () => {
  const s = sig('iren-2026-06-nvidia');
  assert.match(consequenceFor(s), /not built capacity/i);
  assert.ok(!/delivered|accepted|energised/i.test(headlineFor(s)));
});

test('every event type produces a headline and a consequence', () => {
  for (const e of EVENTS) {
    const s = toSignal(e);
    const h = headlineFor(s);
    const c = consequenceFor(s);
    assert.ok(h && h.length > 12, `${e.id} produced a thin headline: "${h}"`);
    assert.ok(c && c.length > 20, `${e.id} produced a thin consequence: "${c}"`);
    assert.ok(!/undefined|null|NaN/.test(h + c), `${e.id} leaked a placeholder: "${h}" / "${c}"`);
  }
});

/* ---- the rail ---- */

test('the rail carries all five path stages with both label layers', () => {
  const s = horizon1();
  assert.equal(s.rail.length, 5);
  for (const step of s.rail) {
    assert.ok(step.simple && step.detailed, 'a stage is missing a label layer');
    assert.ok(['complete', 'implied', 'current', 'pending', 'unknown'].includes(step.state), step.state);
    // Status must never be conveyable by colour alone: there is always a word.
    assert.ok(step.statusLabel && step.statusLabel.length > 2);
  }
});

test('the journey vocabulary matches the canonical delivery model', () => {
  // One vocabulary: the rail uses the path's own words, never a second set.
  assert.deepEqual(JOURNEY.map(j => j.detailed), [
    'Power secured', 'Under construction', 'Energised', 'Accepted', 'Billing'
  ]);
  for (const j of JOURNEY) assert.equal(j.simple, j.detailed);
});

test('an unreported stage before a confirmed one reads as implied', () => {
  // Horizon 1 has no power gate on record, but Microsoft accepted it —
  // it cannot have been accepted without having had power secured.
  const s = horizon1();
  const announced = s.rail.find(r => r.id === 'power');
  assert.equal(announced.state, 'implied');
  assert.equal(announced.statusLabel, 'Implied');
  assert.ok(announced.impliedBy, 'the rail does not say what implies the stage');
});

test('an unreported stage after the last confirmed one stays unknown', () => {
  // Billing does not follow from acceptance, and is not implied by it — at the
  // site level, Horizon 1's own billing is still undisclosed.
  const s = horizon1();
  const billing = s.rail.find(r => r.id === 'billing');
  assert.equal(billing.state, 'unknown');
  assert.equal(billing.statusLabel, 'Not disclosed');
});

test('implied is a state of its own, never folded into complete', () => {
  const s = horizon1();
  const implied = s.rail.filter(r => r.state === 'implied');
  assert.ok(implied.length > 0, 'fixture no longer produces implied stages');
  for (const r of implied) {
    assert.notEqual(r.state, 'complete');
    assert.equal(r.sourceIds.length, 0, 'an implied stage cites a document');
    assert.equal(r.effectiveAt, null, 'an implied stage carries a date');
  }
});

test('no stage after the current one is ever marked complete out of order', () => {
  const s = leadStory();
  const lastComplete = s.rail.reduce((acc, r, i) => (r.state === 'complete' ? i : acc), -1);
  const current = s.rail.findIndex(r => r.state === 'current');
  if (current > -1) assert.ok(current > lastComplete);
});

/* ---- drawer and watch panel ---- */

test('the drawer sections are all populated from the record', () => {
  const s = leadStory();
  for (const k of ['whatHappened', 'whyItMatters', 'whatChanged', 'whatHappensNext']) {
    assert.ok(s[k] && s[k].length > 15, `${k} is empty or thin`);
  }
  assert.ok(Array.isArray(s.blockers) && s.blockers.length > 0);
});

test('a guided window is never printed as an exact date', () => {
  const s = leadStory();
  const next = s.whatHappensNext;
  // A window renders as a period label — "H2 2027", "Q4 2026", "During 2028".
  const showsWindow = /\b(H[12]|Q[1-4])\s+\d{4}\b|\bDuring\s+\d{4}\b/.test(next);
  const showsExactDate = /\b\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}\b/.test(next);

  if (showsWindow) {
    assert.match(next, /a guided window is not a date/i,
      'a window was shown without the caveat that it is not a date');
    assert.ok(!showsExactDate, 'a window was rendered alongside an exact date');
  }
  // Whatever the case, it must never claim a date it does not have.
  if (/no date or window/i.test(next)) {
    assert.ok(!showsWindow && !showsExactDate,
      `says no date is guided but prints one: "${next}"`);
  }
});

test('the watch panel holds at most three items, each with a state and a route', () => {
  const s = leadStory();
  assert.ok(s.watching.length <= 3);
  const ALLOWED = ['On track', 'Unresolved', 'Pending evidence', 'Date unknown'];
  for (const w of s.watching) {
    assert.ok(ALLOWED.includes(w.state), `"${w.state}" is not in the copy deck vocabulary`);
    assert.ok(w.title && w.detail && w.href);
  }
});

test('the watch panel does not list the same thing twice', () => {
  const titles = leadStory().watching.map(w => w.title.toLowerCase());
  assert.equal(new Set(titles).size, titles.length, `duplicated: ${titles.join(', ')}`);
});

test('no watch item invents a date', () => {
  for (const w of leadStory().watching) {
    if (w.state === 'Date unknown') {
      assert.ok(!/\d{4}/.test(w.detail), `a date-unknown item shows a year: "${w.detail}"`);
    }
  }
});
