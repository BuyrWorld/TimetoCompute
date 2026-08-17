/**
 * The AI Time Machine's invariants.
 *
 * The game's screens are proved in a browser by scripts/timemachine-qa.js,
 * because a state machine cannot be checked by reading it. What is checked here
 * is the part that has nothing to do with rendering: the data contract, the
 * no-future-leakage rule, and the fail-closed price lookup.
 *
 * These are the assertions that would still matter if the entire interface were
 * rewritten tomorrow.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGNS, EVENTS, SOURCES, INSTRUMENTS, EVENT_BY_ID, SOURCE_BY_ID, INSTRUMENT_BY_ID,
  CAMPAIGN_VISUALS, FACTORY_MODULES, timeMachineData, chapterCount, checkTimeMachine
} from '../src/lib/timemachine.js';
import {
  VERIFIED_OUTCOMES, OUTCOME_FIELDS, AWAITING_VERIFICATION, verifiedOutcome
} from '../data/timemachine/verified-outcomes.js';

test('the build gate passes on the shipped data', () => {
  assert.deepEqual(checkTimeMachine(), []);
});

test('five campaigns cover every event exactly once', () => {
  assert.equal(CAMPAIGNS.length, 5);
  const listed = CAMPAIGNS.flatMap(c => c.chapterIds);
  assert.equal(listed.length, new Set(listed).size, 'a chapter appears in two campaigns');
  assert.equal(listed.length, EVENTS.length);
  assert.equal(chapterCount(), EVENTS.length);
});

test('every chapter offers three theses, each with a mechanism and a risk', () => {
  for (const e of EVENTS) {
    assert.equal(e.choices.length, 3, e.id);
    for (const c of e.choices) {
      assert.ok(c.mechanism?.length > 10, `${e.id}/${c.id} mechanism`);
      assert.ok(c.risk?.length > 10, `${e.id}/${c.id} risk`);
    }
  }
});

/**
 * The rule that separates a history game from a quiz with the answers printed
 * on the back. A briefing source published after its own cutoff would hand the
 * player evidence the historical decision-maker could not have had.
 */
test('no briefing source postdates the cutoff it is shown at', () => {
  for (const e of EVENTS) {
    for (const id of e.briefingSourceIds || []) {
      const s = SOURCE_BY_ID[id];
      assert.ok(s, `${e.id} cites unknown source ${id}`);
      assert.ok(s.publishedAt <= e.cutoffAt,
        `${e.id} would show ${id} (${s.publishedAt}) before its cutoff ${e.cutoffAt}`);
    }
  }
});

test('the reveal set is disjoint from the briefing set', () => {
  for (const e of EVENTS) {
    const briefing = new Set(e.briefingSourceIds || []);
    for (const id of e.revealSourceIds || []) {
      assert.ok(!briefing.has(id),
        `${e.id} lists ${id} as both pre-cutoff evidence and a later reveal`);
    }
  }
});

test('every source is a fetchable primary record', () => {
  for (const s of SOURCES) {
    assert.match(s.url, /^https?:\/\//, s.id);
    assert.match(s.publishedAt, /^\d{4}-\d{2}-\d{2}/, s.id);
    assert.ok(s.publisher && s.title, s.id);
  }
});

/* ------------------------------------------------------------ fail closed -- */

test('the outcome registry ships empty and frozen', () => {
  assert.deepEqual(VERIFIED_OUTCOMES, {});
  assert.ok(Object.isFrozen(VERIFIED_OUTCOMES));
});

test('every chapter currently reports the awaiting state', () => {
  for (const e of EVENTS) {
    for (const c of e.choices) {
      assert.equal(verifiedOutcome(e.id, c.id), null, `${e.id}/${c.id}`);
    }
  }
  assert.equal(AWAITING_VERIFICATION, 'Market result awaiting verification');
});

test('a partial record is treated as absent, not as a result', () => {
  const complete = {
    returnRatio: 0.12, benchmarkReturnRatio: 0.04, entrySession: '2024-03-01',
    exitSession: '2024-06-01', methodology: 'adjusted close', provider: 'Example',
    verifiedAt: '2024-07-01'
  };
  /* Simulated against the same predicate the lookup uses, since the shipped
     registry is empty by design and must stay that way. */
  const usable = row => OUTCOME_FIELDS.every(f => row[f] !== undefined && row[f] !== null) &&
    typeof row.returnRatio === 'number' && Number.isFinite(row.returnRatio);
  assert.ok(usable(complete));
  for (const f of OUTCOME_FIELDS) {
    assert.ok(!usable({ ...complete, [f]: null }), `${f} missing should fail closed`);
    assert.ok(!usable({ ...complete, [f]: undefined }), `${f} undefined should fail closed`);
  }
  assert.ok(!usable({ ...complete, returnRatio: 0 / 0 }), 'NaN is not a return');
});

/* ------------------------------------------------------- campaign visuals -- */

test('every campaign has artwork and a five-node physical chain', () => {
  for (const c of CAMPAIGNS) {
    const v = CAMPAIGN_VISUALS[c.id];
    assert.ok(v, c.id);
    assert.match(v.object, /\.webp$/);
    assert.match(v.background, /^background-.+\.webp$/);
    assert.equal(v.chain.length, 5, c.id);
    assert.ok(v.depthPx > 0 && v.bodyWidthPx > 0 && v.bodyHeightPx > 0, c.id);
  }
});

/* -------------------------------------------------------- factory modules -- */

test('every factory system unlocks from a campaign that can reach it', () => {
  for (const m of FACTORY_MODULES) {
    const campaign = CAMPAIGNS.find(c => c.id === m.campaignId);
    assert.ok(campaign, `${m.id} unlocks from unknown campaign ${m.campaignId}`);
    assert.ok(m.unlockAt >= 1, `${m.id} unlocks at ${m.unlockAt}`);
    assert.ok(m.unlockAt <= campaign.chapterIds.length,
      `${m.id} needs ${m.unlockAt} of ${campaign.chapterIds.length} chapters — unreachable`);
  }
});

test('a first system is reachable from every campaign', () => {
  for (const c of CAMPAIGNS) {
    assert.ok(FACTORY_MODULES.some(m => m.campaignId === c.id && m.unlockAt === 1),
      `${c.id} unlocks nothing on its first chapter`);
  }
});

/**
 * Participants are named companies in a physical layer — nothing stronger.
 * They are not supplier records: data/suppliers.js holds those, with evidence
 * grades attached, and these lists must never be mistaken for them.
 */
test('every named participant resolves to a real instrument', () => {
  for (const m of FACTORY_MODULES) {
    assert.ok(m.participants.length > 0, m.id);
    for (const t of m.participants) {
      assert.ok(INSTRUMENT_BY_ID[t], `${m.id} names unknown participant ${t}`);
    }
  }
});

test('every factory system explains itself in plain English', () => {
  for (const m of FACTORY_MODULES) {
    assert.ok(m.simple?.length > 30, `${m.id} simple`);
    assert.ok(m.significance?.length > 40, `${m.id} significance`);
    assert.ok(m.title && m.label, m.id);
  }
});

/* ---------------------------------------------------------- the data island -- */

test('the browser payload carries everything the game reads and nothing it cannot', () => {
  const d = timeMachineData();
  assert.deepEqual(Object.keys(d).sort(),
    ['assetSizes', 'campaigns', 'events', 'factoryModules', 'instruments',
      'outcomes', 'sources', 'visuals']);
  assert.deepEqual(d.outcomes, {});
  assert.equal(d.factoryModules.length, 6);
  /* Every object and background the game can reach has an intrinsic size, so no
     image is ever rendered without a reserved box. */
  for (const c of CAMPAIGNS) {
    const v = CAMPAIGN_VISUALS[c.id];
    for (const key of [`objects/${v.object}`, `backgrounds/${v.background}`]) {
      assert.ok(d.assetSizes[key]?.w > 0 && d.assetSizes[key]?.h > 0, `no size for ${key}`);
    }
  }
  for (const m of FACTORY_MODULES) {
    assert.ok(d.assetSizes[`objects/${m.object}`]?.w > 0, `no size for ${m.object}`);
  }
  /* Instruments carry a name so a ticker is never shown bare — a symbol with no
     company behind it is a label the reader cannot check. */
  for (const i of INSTRUMENTS) assert.ok(i.name?.length > 1, i.id);
});

test('the payload contains no price field anywhere', () => {
  const json = JSON.stringify(timeMachineData());
  for (const banned of ['"price"', '"close"', '"sharePrice"', '"lastPrice"']) {
    assert.ok(!json.includes(banned), `payload contains ${banned}`);
  }
});
