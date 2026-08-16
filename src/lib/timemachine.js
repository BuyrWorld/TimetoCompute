/**
 * The AI Time Machine, as data.
 *
 * The reference implementation is a React component that imports four JSON files
 * directly. This site has no bundler and no React, so the JSON is read once here
 * and handed to two consumers: the build, which validates it and ships it to the
 * page, and the client state machine, which reads it back out of the page.
 *
 * WHAT THIS FILE GUARDS, beyond loading:
 *
 *   - NO FUTURE LEAKAGE. Every chapter has a knowledge cutoff. A source cited in
 *     the briefing must have been published by that cutoff; a source published
 *     after it belongs in `revealSourceIds` and is withheld until the player has
 *     committed. `checkTimeMachine()` fails the build if a briefing source
 *     postdates its own cutoff — the single defect that would quietly turn this
 *     from a history game into a cheat.
 *   - The campaign/chapter graph resolves: every chapterId is a real event,
 *     every sourceId a real source, every instrumentId a real instrument.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VERIFIED_OUTCOMES, OUTCOME_FIELDS } from '../../data/timemachine/verified-outcomes.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, '..', '..', 'data', 'timemachine');
const read = f => JSON.parse(readFileSync(path.join(DIR, f), 'utf8'));

export const CAMPAIGNS = read('campaigns.json').campaigns;
export const EVENTS = read('events.json').events;
export const SOURCES = read('source-ledger.json').sources;
export const INSTRUMENTS = read('companies.json').instruments;

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));
export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map(s => [s.id, s]));
export const INSTRUMENT_BY_ID = Object.fromEntries(INSTRUMENTS.map(i => [i.id, i]));

/**
 * Per-campaign visual language, ported from the reference component.
 *
 * `chain` is the five-node physical path the outcome screen walks. It is
 * editorial framing of the campaign's subject, not a claim about any company.
 */
export const CAMPAIGN_VISUALS = {
  'ai-ignition': {
    object: 'gpu-accelerator.webp', icon: 'compute',
    eyebrow: 'The spark becomes a system',
    chain: ['Demand', 'Cloud', 'Compute', 'Network', 'Facility']
  },
  'memory-wall': {
    object: 'hbm-package.webp', icon: 'memory',
    eyebrow: 'The bottleneck beside the GPU',
    chain: ['Accelerator', 'HBM', 'Packaging', 'Yield', 'Shipments']
  },
  'power-crisis': {
    object: 'power-transformer.webp', icon: 'power',
    eyebrow: 'Every token begins as electricity',
    chain: ['Grid', 'Transformer', 'Rack', 'Cooling', 'Compute']
  },
  'photonics-shift': {
    object: 'photonics-engine.webp', icon: 'photon',
    eyebrow: 'When moving bits becomes the limit',
    chain: ['Switch', 'DSP', 'Laser', 'Fibre', 'Cluster']
  },
  'race-to-revenue': {
    object: 'ai-data-hall.webp', icon: 'facility',
    eyebrow: 'Announcements meet physical reality',
    chain: ['Plan', 'Contract', 'Build', 'Accepted', 'Billing']
  }
};

/**
 * What the browser needs.
 *
 * Shipped as one JSON island rather than fetched, so the game has no loading
 * state and no request to fail. Sources are split: `briefing` entries travel
 * with the page because they were public at the cutoff, and so do `reveal`
 * entries — withholding them is a UI rule, not a transport one, and a determined
 * reader can open the page source either way. What matters is that the interface
 * never shows a reveal source before commitment, which is asserted by test.
 */
export function timeMachineData() {
  return {
    campaigns: CAMPAIGNS,
    events: EVENTS,
    sources: SOURCES,
    instruments: INSTRUMENTS,
    visuals: CAMPAIGN_VISUALS,
    /* Ships as {} today. The client renders "Market result awaiting
       verification" for every chapter, which is the correct state. */
    outcomes: VERIFIED_OUTCOMES
  };
}

/** Total chapters across every campaign, for the title screen's counter. */
export const chapterCount = () =>
  CAMPAIGNS.reduce((a, c) => a + c.chapterIds.length, 0);

/**
 * Build-time integrity checks.
 *
 * Returns a list of failures; the build stops on any. These are the invariants
 * that make the game honest rather than merely working.
 */
export function checkTimeMachine() {
  const errors = [];
  const fail = m => errors.push(m);
  const ISO = /^\d{4}-\d{2}-\d{2}/;

  const ids = new Set();
  for (const c of CAMPAIGNS) {
    if (ids.has(c.id)) fail(`Duplicate campaign id ${c.id}`);
    ids.add(c.id);
    if (!CAMPAIGN_VISUALS[c.id]) fail(`Campaign ${c.id} has no visual definition`);
    if (!c.chapterIds?.length) fail(`Campaign ${c.id} has no chapters`);
    if (!(c.initialCapitalUsd > 0)) fail(`Campaign ${c.id} has no starting capital`);
    for (const id of c.chapterIds) {
      if (!EVENT_BY_ID[id]) fail(`Campaign ${c.id} lists unknown chapter ${id}`);
    }
  }

  const seen = new Set();
  for (const e of EVENTS) {
    if (seen.has(e.id)) fail(`Duplicate event id ${e.id}`);
    seen.add(e.id);
    if (!ids.has(e.campaignId)) fail(`Event ${e.id} belongs to unknown campaign ${e.campaignId}`);
    if (!ISO.test(e.cutoffAt)) fail(`Event ${e.id} has no ISO cutoff`);
    if (!e.choices || e.choices.length !== 3) {
      fail(`Event ${e.id} offers ${e.choices?.length ?? 0} theses; the game promises 3`);
    }
    for (const b of ['headline', 'simpleMeaning', 'directFact', 'physicalMeaning', 'criticalUnknown']) {
      if (!e.briefing?.[b]) fail(`Event ${e.id} briefing is missing ${b}`);
    }

    /* THE RULE THAT MATTERS. A briefing source published after the cutoff would
       hand the player evidence the historical decision-maker could not have had,
       which is the one way this game could cheat without looking broken. */
    for (const sid of e.briefingSourceIds || []) {
      const s = SOURCE_BY_ID[sid];
      if (!s) { fail(`Event ${e.id} cites unknown briefing source ${sid}`); continue; }
      if (s.publishedAt > e.cutoffAt) {
        fail(`Event ${e.id} shows source ${sid} (${s.publishedAt}) before its own cutoff ${e.cutoffAt}`);
      }
    }
    for (const sid of e.revealSourceIds || []) {
      if (!SOURCE_BY_ID[sid]) fail(`Event ${e.id} cites unknown reveal source ${sid}`);
    }

    for (const ch of e.choices || []) {
      if (!ch.mechanism || !ch.risk) fail(`Choice ${e.id}/${ch.id} states no mechanism or risk`);
      for (const ex of ch.exposures || []) {
        if (!INSTRUMENT_BY_ID[ex.instrumentId]) {
          fail(`Choice ${e.id}/${ch.id} references unknown instrument ${ex.instrumentId}`);
        }
      }
      const total = (ch.exposures || []).reduce((a, x) => a + x.weight, 0);
      if (Math.abs(total - 1) > 0.005) {
        fail(`Choice ${e.id}/${ch.id} exposures sum to ${total}, not 1`);
      }
    }
  }

  for (const s of SOURCES) {
    if (!/^https?:\/\//.test(s.url)) fail(`Source ${s.id} has no absolute URL`);
    if (!ISO.test(s.publishedAt)) fail(`Source ${s.id} has no ISO published date`);
  }

  /* A partially filled verified outcome would render a return beside a blank
     provider, which looks more authoritative than the empty state it replaced. */
  for (const [eventId, byChoice] of Object.entries(VERIFIED_OUTCOMES)) {
    if (!EVENT_BY_ID[eventId]) fail(`Verified outcome for unknown event ${eventId}`);
    for (const [choiceId, row] of Object.entries(byChoice)) {
      const ev = EVENT_BY_ID[eventId];
      if (ev && !ev.choices.some(c => c.id === choiceId)) {
        fail(`Verified outcome for unknown choice ${eventId}/${choiceId}`);
      }
      for (const f of OUTCOME_FIELDS) {
        if (row[f] === undefined || row[f] === null) {
          fail(`Verified outcome ${eventId}/${choiceId} is missing ${f} — half a verification is none`);
        }
      }
    }
  }

  return errors;
}
