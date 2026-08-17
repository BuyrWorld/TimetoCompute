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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VERIFIED_OUTCOMES, OUTCOME_FIELDS } from '../../data/timemachine/verified-outcomes.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, '..', '..', 'data', 'timemachine');
const read = f => JSON.parse(readFileSync(path.join(DIR, f), 'utf8'));

const ASSET_DIR = path.join(HERE, '..', '..', 'assets', 'time-machine');
const assetExists = (kind, file) => !!file && existsSync(path.join(ASSET_DIR, kind, file));

/**
 * Intrinsic size of a WebP, read from its own header.
 *
 * Every image this site ships carries width and height so the layout is
 * reserved before the bytes arrive. Hard-coding the numbers here would work
 * today and lie the first time an asset is re-exported at a different size, so
 * they are read from the file instead. This is a header parse, not a decode:
 * the three WebP variants keep their dimensions in the first 30 bytes.
 */
function webpSize(kind, file) {
  const buf = readFileSync(path.join(ASSET_DIR, kind, file));
  const fmt = buf.toString('ascii', 12, 16);
  if (fmt === 'VP8X') return { w: (buf.readUIntLE(24, 3) & 0xffffff) + 1, h: (buf.readUIntLE(27, 3) & 0xffffff) + 1 };
  if (fmt === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  if (fmt === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  throw new Error(`${kind}/${file} is not a WebP this reader understands (${fmt})`);
}

/** Intrinsic sizes for every object and background, keyed as `kind/file`. */
export function assetSizes() {
  const out = {};
  for (const kind of ['objects', 'backgrounds']) {
    for (const file of readdirSync(path.join(ASSET_DIR, kind))) {
      if (file.endsWith('.webp')) out[`${kind}/${file}`] = webpSize(kind, file);
    }
  }
  return out;
}

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
 * `background` is the campaign's own production artwork; `depthPx` and the body
 * dimensions drive the object's parallax and are carried across verbatim so the
 * scene reads at the same depth the reference tuned it to.
 */
export const CAMPAIGN_VISUALS = {
  'ai-ignition': {
    object: 'gpu-accelerator.webp', icon: 'compute',
    background: 'background-ai-ignition.webp',
    depthPx: 132, bodyWidthPx: 350, bodyHeightPx: 205,
    eyebrow: 'The spark becomes a system',
    chain: ['Demand', 'Cloud', 'Compute', 'Network', 'Facility']
  },
  'memory-wall': {
    object: 'hbm-package.webp', icon: 'memory',
    background: 'background-memory-wall.webp',
    depthPx: 86, bodyWidthPx: 330, bodyHeightPx: 205,
    eyebrow: 'The bottleneck beside the GPU',
    chain: ['Accelerator', 'HBM', 'Packaging', 'Yield', 'Shipments']
  },
  'power-crisis': {
    object: 'power-transformer.webp', icon: 'power',
    background: 'background-power-crisis.webp',
    depthPx: 218, bodyWidthPx: 310, bodyHeightPx: 255,
    eyebrow: 'Every token begins as electricity',
    chain: ['Grid', 'Transformer', 'Rack', 'Cooling', 'Compute']
  },
  'photonics-shift': {
    object: 'photonics-engine.webp', icon: 'photon',
    background: 'background-photonics-shift.webp',
    depthPx: 92, bodyWidthPx: 340, bodyHeightPx: 205,
    eyebrow: 'When moving bits becomes the limit',
    chain: ['Switch', 'DSP', 'Laser', 'Fibre', 'Cluster']
  },
  'race-to-revenue': {
    object: 'ai-data-hall.webp', icon: 'facility',
    background: 'background-race-to-revenue.webp',
    depthPx: 260, bodyWidthPx: 380, bodyHeightPx: 235,
    eyebrow: 'Announcements meet physical reality',
    chain: ['Plan', 'Contract', 'Build', 'Accepted', 'Billing']
  }
};

/**
 * The factory's six physical systems.
 *
 * Each module switches on only when its campaign has been played far enough,
 * so the factory is assembled from decisions actually made rather than bought
 * with a currency. `participants` names publicly traded companies that operate
 * in that layer — and nothing more. It is not a supplier claim, not a ranking
 * and not a recommendation, which the inspector says on screen; T2C's own
 * supplier records live in data/suppliers.js and carry evidence grades, and
 * these six lists deliberately do not pretend to be those.
 */
export const FACTORY_MODULES = [
  {
    id: 'compute', title: 'Accelerated compute', label: 'GPU hall',
    object: 'gpu-accelerator.webp', campaignId: 'ai-ignition', unlockAt: 1,
    simple: 'The specialised processors that train and run modern AI models.',
    significance: 'Compute is the engine of the factory, but it only scales when memory, networking, power and cooling keep pace.',
    participants: ['NVDA', 'TSM', 'ASML']
  },
  {
    id: 'memory', title: 'High-bandwidth memory', label: 'Memory stack',
    object: 'hbm-package.webp', campaignId: 'memory-wall', unlockAt: 1,
    simple: 'Very fast memory placed close to the accelerator so data can reach it quickly.',
    significance: 'An accelerator waiting for data is expensive idle silicon. HBM capacity, packaging and yield can determine shipment volume.',
    participants: ['MU', 'AMKR', 'TSM']
  },
  {
    id: 'power', title: 'Power delivery', label: 'Substation',
    object: 'power-transformer.webp', campaignId: 'power-crisis', unlockAt: 1,
    simple: 'The grid connection, transformers and switchgear that turn electricity into usable data-centre power.',
    significance: 'A completed building cannot run AI equipment without energisation, conversion and reliable distribution.',
    participants: ['ETN', 'PWR', 'VRT']
  },
  {
    id: 'cooling', title: 'Liquid cooling', label: 'Thermal loop',
    object: 'liquid-cooling.webp', campaignId: 'power-crisis', unlockAt: 3,
    simple: 'A system that carries heat away from dense AI racks using liquid rather than air alone.',
    significance: 'Higher rack density concentrates heat. Cooling determines how much compute can operate safely inside a given hall.',
    participants: ['VRT', 'ETN']
  },
  {
    id: 'photonics', title: 'Optical networking', label: 'Light paths',
    object: 'photonics-engine.webp', campaignId: 'photonics-shift', unlockAt: 1,
    simple: 'Lasers and optical components move large amounts of data between accelerators and switches.',
    significance: 'As clusters grow, moving bits can consume more power and become harder than performing the calculation itself.',
    participants: ['AVGO', 'COHR', 'LITE', 'ANET']
  },
  {
    id: 'facility', title: 'Delivered AI capacity', label: 'Data hall',
    object: 'ai-data-hall.webp', campaignId: 'race-to-revenue', unlockAt: 1,
    simple: 'The finished, energised and customer-accepted environment where AI systems operate.',
    significance: 'Announcements become revenue only after equipment, power, networking and customers converge in an operational facility.',
    participants: ['IREN', 'CRWV', 'NBIS', 'APLD']
  }
];

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
    factoryModules: FACTORY_MODULES,
    assetSizes: assetSizes(),
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
    const vis = CAMPAIGN_VISUALS[c.id];
    if (!vis) fail(`Campaign ${c.id} has no visual definition`);
    else {
      /* A missing .webp is a silent broken image at runtime — nothing throws,
         the scene just loses its subject. Cheaper to catch here. */
      if (!assetExists('objects', vis.object)) fail(`Campaign ${c.id} object ${vis.object} is not in assets/time-machine/objects`);
      if (!assetExists('backgrounds', vis.background)) fail(`Campaign ${c.id} background ${vis.background} is not in assets/time-machine/backgrounds`);
      if (vis.chain?.length !== 5) fail(`Campaign ${c.id} chain has ${vis.chain?.length ?? 0} nodes; the outcome screen walks 5`);
    }
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

  /* Factory modules. A module that can never unlock is dead scenery, and a
     participant ticker with no instrument behind it would render as a bare
     symbol with no company name — a label the reader cannot check. */
  const moduleIds = new Set();
  for (const m of FACTORY_MODULES) {
    if (moduleIds.has(m.id)) fail(`Duplicate factory module id ${m.id}`);
    moduleIds.add(m.id);
    const campaign = CAMPAIGNS.find(c => c.id === m.campaignId);
    if (!campaign) { fail(`Factory module ${m.id} unlocks from unknown campaign ${m.campaignId}`); continue; }
    if (!(m.unlockAt >= 1) || m.unlockAt > campaign.chapterIds.length) {
      fail(`Factory module ${m.id} unlocks at ${m.unlockAt} of ${campaign.chapterIds.length} chapters — unreachable`);
    }
    if (!assetExists('objects', m.object)) fail(`Factory module ${m.id} object ${m.object} is not in assets/time-machine/objects`);
    if (!m.simple || !m.significance) fail(`Factory module ${m.id} states no plain-English meaning or significance`);
    if (!m.participants?.length) fail(`Factory module ${m.id} names no participants`);
    for (const t of m.participants || []) {
      if (!INSTRUMENT_BY_ID[t]) fail(`Factory module ${m.id} names unknown participant ${t}`);
    }
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
