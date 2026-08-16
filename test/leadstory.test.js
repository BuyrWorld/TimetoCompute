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
import { leadStory, headlineFor, consequenceFor, JOURNEY } from '../src/lib/leadstory.js';

const sig = id => toSignal(EVENTS.find(e => e.id === id));

/* ---- selection ---- */

test('the lead story is the newest confirmed record', () => {
  const s = leadStory();
  assert.ok(s.available);
  assert.equal(s.confidence, 'confirmed');
  const newest = signals({}).filter(x => x.confidence === 'confirmed')[0];
  assert.equal(s.id, newest.id);
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
  const s = leadStory();
  assert.equal(s.signal.eventType, 'customer-accepted', 'fixture changed — revisit this test');
  const text = [s.headline, s.consequence].join(' ').toLowerCase();
  for (const forbidden of ['earning money', 'earning revenue', 'revenue has begun', 'is billing', 'now billing']) {
    assert.ok(!text.includes(forbidden), `acceptance was promoted to billing: "${forbidden}"`);
  }
  // And it says so explicitly.
  assert.match(s.consequence, /billing has not yet been disclosed/i);
});

test('the consequence checks the record instead of assuming what follows', () => {
  // IREN has no disclosed billing, so the acceptance sentence must say so.
  const iren = COMPANIES.find(c => c.ticker === 'IREN');
  assert.equal(isKnown(getMeasure(iren, 'revenueLiveMw')), false, 'fixture changed');
  assert.match(consequenceFor(sig('iren-2026-08-13-horizon1')), /not yet been disclosed/i);

  // TeraWulf HAS disclosed billing, so the same event type must not claim it is missing.
  const wulf = COMPANIES.find(c => c.ticker === 'WULF');
  assert.equal(isKnown(getMeasure(wulf, 'revenueLiveMw')), true, 'fixture changed');
  const asIfWulf = consequenceFor({ ...sig('iren-2026-08-13-horizon1'), companyId: 'terawulf' });
  assert.ok(!/not yet been disclosed/i.test(asIfWulf),
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

test('the rail carries all seven stages with both label layers', () => {
  const s = leadStory();
  assert.equal(s.rail.length, 7);
  for (const step of s.rail) {
    assert.ok(step.simple && step.detailed, 'a stage is missing a label layer');
    assert.ok(['complete', 'implied', 'current', 'pending', 'unknown'].includes(step.state), step.state);
    // Status must never be conveyable by colour alone: there is always a word.
    assert.ok(step.statusLabel && step.statusLabel.length > 2);
  }
});

test('the journey vocabulary matches the canonical delivery model', () => {
  assert.deepEqual(JOURNEY.map(j => j.detailed), [
    'Announced', 'Power secured', 'Construction', 'Energised',
    'Customer contracted', 'Customer accepted', 'Billing'
  ]);
});

test('an unreported stage before a confirmed one reads as implied', () => {
  // Horizon 1 has no site-control gate on record, but Microsoft accepted it —
  // it cannot have been accepted without having been announced.
  const s = leadStory();
  const announced = s.rail.find(r => r.id === 'announced');
  assert.equal(announced.state, 'implied');
  assert.equal(announced.statusLabel, 'Implied');
  assert.ok(announced.impliedBy, 'the rail does not say what implies the stage');
});

test('an unreported stage after the last confirmed one stays unknown', () => {
  // Billing does not follow from acceptance, and is not implied by it.
  const s = leadStory();
  const billing = s.rail.find(r => r.id === 'billing');
  assert.equal(billing.state, 'unknown');
  assert.equal(billing.statusLabel, 'Not disclosed');
});

test('implied is a state of its own, never folded into complete', () => {
  const s = leadStory();
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
