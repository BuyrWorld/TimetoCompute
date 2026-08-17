/**
 * AI Time Machine — client state machine.
 *
 * A faithful port of the reference `app/time-machine-game.tsx` (True Depth
 * build) to this site's architecture. TimeToCompute has no bundler, no React
 * and `dependencies: {}`; adding a framework to host one page would be the
 * replatform the integration brief rules out. The component is a pure state
 * machine over four JSON files, so the port is mechanical: `useState` becomes
 * one `state` object, JSX becomes template strings, and `useEffect` becomes
 * explicit calls in `render()`.
 *
 * THIRTEEN SCREENS, including the two the True Depth build adds:
 *
 *   factory  A persistent world assembled from decisions already made. Modules
 *            switch on as campaigns progress; each one explains what it does and
 *            names publicly traded participants — participants only, never a
 *            recommendation and never a price.
 *   vault    Where a `live_prediction` chapter ends. The outcome does not exist
 *            yet, so the decision is timestamped and sealed rather than being
 *            given a fabricated result.
 *
 * TWO RULES ARE LOAD-BEARING AND ARE NOT STYLE CHOICES:
 *
 *   1. NO FUTURE LEAKAGE. `revealSourceIds` are never rendered before the player
 *      has committed. The evidence drawer shows `briefingSourceIds` only, and
 *      the build separately proves every one predates its own cutoff.
 *   2. FAIL CLOSED ON PRICES. A chapter with no verified outcome shows "Market
 *      result awaiting verification" and contributes nothing to running capital.
 *      Nothing is estimated, interpolated or rendered as zero.
 */
(function () {
  'use strict';

  var root = document.getElementById('tmRoot');
  if (!root) return;
  var raw = document.getElementById('tm-data');
  if (!raw) return;
  var DATA = JSON.parse(raw.textContent);

  var campaigns = DATA.campaigns;
  var events = DATA.events;
  var visuals = DATA.visuals;
  var factoryModules = DATA.factoryModules || [];
  var OUTCOMES = DATA.outcomes || {};
  var SIZES = DATA.assetSizes || {};
  var eventById = {}, sourceById = {}, instrumentById = {};
  events.forEach(function (e) { eventById[e.id] = e; });
  DATA.sources.forEach(function (s) { sourceById[s.id] = s; });
  DATA.instruments.forEach(function (i) { instrumentById[i.id] = i; });

  var SAVE_KEY = 't2c-ai-time-machine-v1';
  var ASSETS = '/assets/time-machine';
  var LOGO = '/Logo/logo-header.png';
  var AWAITING = 'Market result awaiting verification';

  /* ---------------------------------------------------------------- utils -- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtDate(v) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(v));
  }
  function fmtCurrency(v) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0
    }).format(v);
  }
  function fmtPercent(v) {
    return new Intl.NumberFormat('en-US', {
      style: 'percent', signDisplay: 'always',
      minimumFractionDigits: 1, maximumFractionDigits: 1
    }).format(v);
  }
  function exposureLabel(choice) {
    return choice.exposures.map(function (x) {
      return choice.exposures.length > 1
        ? x.instrumentId + ' ' + Math.round(x.weight * 100) + '%'
        : x.instrumentId;
    }).join(' · ');
  }
  /**
   * An object or background image, always dimensioned.
   *
   * Intrinsic sizes come from the build, which reads them out of the files
   * themselves, so an asset re-exported at a new size cannot leave a stale
   * width behind. Without them the browser reserves no box and every screen
   * reflows as its artwork lands.
   */
  function art(kind, file, cls, extra) {
    var d = SIZES[kind + '/' + file] || { w: 0, h: 0 };
    return '<img class="' + cls + '" src="' + ASSETS + '/' + kind + '/' + esc(file) + '" alt=""' +
      (d.w ? ' width="' + d.w + '" height="' + d.h + '"' : '') +
      ' loading="lazy" decoding="async"' + (extra || '') + ' />';
  }

  function icon(name, size) {
    size = size || 20;
    return '<svg class="tm-icon" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<use href="' + ASSETS + '/svg/icons.svg#tm-' + esc(name) + '"></use></svg>';
  }
  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * The fail-closed lookup. A partially filled record is treated as absent: half
   * a verification is not a verification, and a return printed beside a blank
   * provider looks more authoritative than the empty state it replaced.
   */
  var OUTCOME_FIELDS = ['returnRatio', 'benchmarkReturnRatio', 'entrySession',
    'exitSession', 'methodology', 'provider', 'verifiedAt'];
  function verifiedOutcome(eventId, choiceId) {
    var byChoice = OUTCOMES[eventId];
    var row = byChoice && byChoice[choiceId];
    if (!row) return null;
    for (var i = 0; i < OUTCOME_FIELDS.length; i++) {
      var v = row[OUTCOME_FIELDS[i]];
      if (v === undefined || v === null) return null;
    }
    if (typeof row.returnRatio !== 'number' || !isFinite(row.returnRatio)) return null;
    return row;
  }

  /* ------------------------------------------------------- choice visuals -- */

  /**
   * What a thesis is ABOUT, derived from its own words and its exposures.
   *
   * Classification only — it decides which object and which category label the
   * card shows. It asserts nothing about any company beyond the tickers the
   * choice already names.
   */
  function getChoiceVisual(choice) {
    var label = (choice.label + ' ' + choice.mechanism).toLowerCase();
    var tickers = choice.exposures.map(function (x) { return x.instrumentId; });
    var names = tickers.map(function (t) {
      return (instrumentById[t] && instrumentById[t].name) ||
        (t === 'CASH' ? 'Fictional cash reserve' : t);
    });
    var has = function (list) {
      return tickers.some(function (t) { return list.indexOf(t) !== -1; });
    };
    var out = function (category, ic, tone) {
      return { category: category, icon: ic, tone: tone, tickers: tickers, names: names };
    };

    if (tickers.indexOf('CASH') !== -1) return out('Wait for evidence', 'lock', 'cash');
    if (/hbm|memory/.test(label)) return out('Memory capacity', 'memory', 'memory');
    if (/packag|manufactur|foundry|assembly|wafer|lithograph/.test(label)) {
      return out('Silicon manufacturing', 'memory', 'manufacturing');
    }
    if (/facility|infrastructure|cooling|thermal|rack-scale/.test(label) && has(['VRT', 'ETN', 'PWR'])) {
      return out('AI facility infrastructure', 'facility', 'infrastructure');
    }
    if (/photon|optical|laser|cpo|network|ethernet|switch/.test(label)) {
      return out('Network & photonics', 'photon', 'network');
    }
    if (/cooling/.test(label)) return out('Power & cooling', 'power', 'power');
    if (/grid|electrical|power|conversion|infrastructure/.test(label) && has(['ETN', 'PWR', 'VRT'])) {
      return out(/grid/.test(label) ? 'Grid buildout' : 'Power infrastructure', 'power', 'power');
    }
    if (/operator|capacity|contracted|delivery|backlog|lease/.test(label) &&
      has(['IREN', 'APLD', 'NBIS', 'WULF'])) {
      return out('AI capacity operator', 'facility', 'facility');
    }
    if (/cloud|customer|tenant|adoption/.test(label) || has(['MSFT', 'GOOGL', 'META', 'CRWV'])) {
      return out('Cloud demand', 'facility', 'cloud');
    }
    if (/platform|compute|accelerator|gpu|silicon/.test(label) || tickers.indexOf('NVDA') !== -1) {
      return out('Compute platform', 'compute', 'compute');
    }
    return out('Physical infrastructure', 'facility', 'facility');
  }

  var OBJECT_BY_TONE = {
    cash: null, compute: 'gpu-accelerator.webp', cloud: 'ai-data-hall.webp',
    memory: 'hbm-package.webp', manufacturing: 'hbm-package.webp',
    power: 'power-transformer.webp', network: 'photonics-engine.webp',
    facility: 'ai-data-hall.webp', infrastructure: 'ai-data-hall.webp'
  };
  var DEPTH_BY_TONE = {
    cash: 0, compute: 34, cloud: 48, memory: 28, manufacturing: 32,
    power: 50, network: 30, facility: 52, infrastructure: 78
  };
  function choiceObjectAsset(tone) {
    return Object.prototype.hasOwnProperty.call(OBJECT_BY_TONE, tone)
      ? OBJECT_BY_TONE[tone] : 'gpu-accelerator.webp';
  }
  function choiceObjectDepth(tone) {
    return DEPTH_BY_TONE[tone] === undefined ? 34 : DEPTH_BY_TONE[tone];
  }

  /* -------------------------------------------------------- thesis profile -- */

  /**
   * Which constraint the player keeps noticing.
   *
   * Derived entirely from choices already made, weighted by the exposures those
   * choices declare. It is a description of behaviour, not a score, and it says
   * so on the screen: "There is no perfect factory."
   */
  var TICKER_GROUPS = [
    { key: 'compute', list: ['NVDA', 'MSFT', 'GOOGL'] },
    { key: 'power', list: ['ETN', 'PWR', 'VRT'] },
    { key: 'network', list: ['AVGO', 'COHR', 'LITE', 'ANET'] },
    { key: 'systems', list: ['MU', 'AMKR', 'TSM', 'ASML'] },
    { key: 'facility', list: ['IREN', 'CRWV', 'NBIS', 'APLD', 'WULF'] }
  ];
  var PROFILES = {
    compute: { name: 'Compute Maximalist', description: 'You repeatedly follow the platforms and processors at the centre of the AI build-out.' },
    power: { name: 'Power Realist', description: 'You notice that every token begins with electricity, conversion, cooling and physical delivery.' },
    network: { name: 'Network Architect', description: 'You follow the connections between systems and spot when moving data becomes the binding constraint.' },
    systems: { name: 'Constraint Hunter', description: 'You look beyond headline chips toward memory, packaging, tools and the bottlenecks that govern volume.' },
    facility: { name: 'Delivery Detective', description: 'You separate ambitious announcements from energised, accepted and billable AI capacity.' },
    evidence: { name: 'Evidence Purist', description: 'You prefer confirmation over narrative and wait for company-level evidence before committing.' }
  };

  function thesisProfile() {
    var scores = { compute: 0, power: 0, network: 0, systems: 0, facility: 0, evidence: 0 };
    var decisions = 0;
    Object.keys(state.save.campaigns).forEach(function (cid) {
      var prog = state.save.campaigns[cid];
      Object.keys(prog.choices || {}).forEach(function (eid) {
        var ev = eventById[eid];
        var ch = ev && ev.choices.filter(function (c) { return c.id === prog.choices[eid]; })[0];
        if (!ch) return;
        decisions++;
        ch.exposures.forEach(function (x) {
          if (x.instrumentId === 'CASH') { scores.evidence += x.weight; return; }
          var hit = TICKER_GROUPS.filter(function (g) {
            return g.list.indexOf(x.instrumentId) !== -1;
          })[0];
          if (hit) scores[hit.key] += x.weight;
          else scores.systems += x.weight * 0.5;
        });
      });
    });
    if (!decisions) {
      return {
        name: 'Signal Scout', signal: 'No thesis locked yet',
        description: 'Enter a timeline to discover which physical constraints consistently catch your attention.'
      };
    }
    var winner = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; })[0];
    var p = PROFILES[winner];
    return { name: p.name, description: p.description, signal: decisions + ' signals decoded' };
  }

  /* ----------------------------------------------------------------- save -- */

  function freshProgress(campaign) {
    return {
      chapterIndex: 0, completed: [], choices: {}, confidence: {}, sealed: [],
      evidenceOpened: [], appliedEvents: [], capitalUsd: campaign.initialCapitalUsd,
      finished: false, updatedAt: new Date().toISOString()
    };
  }
  var emptySave = { version: 1, lastCampaignId: null, soundOn: false, campaigns: {} };

  function readSave() {
    try {
      var rawSave = localStorage.getItem(SAVE_KEY);
      if (!rawSave || rawSave.length > 200000) return JSON.parse(JSON.stringify(emptySave));
      var parsed = JSON.parse(rawSave);
      if (parsed.version !== 1 || typeof parsed.campaigns !== 'object' || !parsed.campaigns) {
        return JSON.parse(JSON.stringify(emptySave));
      }
      /* Normalised on read. A save written by the previous build has no
         `confidence` or `sealed`, and a missing array must not throw halfway
         through a render — a corrupted save should cost progress, never the page. */
      var out = {};
      Object.keys(parsed.campaigns).forEach(function (id) {
        var p = parsed.campaigns[id] || {};
        var campaign = campaigns.filter(function (c) { return c.id === id; })[0];
        out[id] = {
          chapterIndex: typeof p.chapterIndex === 'number' ? p.chapterIndex : 0,
          completed: Array.isArray(p.completed) ? p.completed : [],
          choices: p.choices || {},
          confidence: p.confidence || {},
          sealed: Array.isArray(p.sealed) ? p.sealed : [],
          evidenceOpened: Array.isArray(p.evidenceOpened) ? p.evidenceOpened : [],
          appliedEvents: Array.isArray(p.appliedEvents) ? p.appliedEvents : [],
          capitalUsd: typeof p.capitalUsd === 'number' ? p.capitalUsd
            : (campaign ? campaign.initialCapitalUsd : 10000),
          finished: p.finished === true,
          updatedAt: p.updatedAt || new Date().toISOString()
        };
      });
      return {
        version: 1,
        lastCampaignId: typeof parsed.lastCampaignId === 'string' ? parsed.lastCampaignId : null,
        soundOn: parsed.soundOn === true,
        campaigns: out
      };
    } catch (e) { return JSON.parse(JSON.stringify(emptySave)); }
  }
  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state.save)); } catch (e) {}
  }

  /* ---------------------------------------------------------------- state -- */

  var state = {
    screen: 'title',
    campaignId: null,
    chapterIndex: 0,
    selectedChoiceId: null,
    selectedConfidence: 65,
    factoryModuleId: null,
    shareStatus: '',
    evidenceOpen: false,
    helpOpen: false,
    save: readSave(),
    liveMessage: '',
    /* Rotation is view state, not game state. It is written straight to the
       element's custom properties during a drag and only read back here so a
       re-render redraws the object where the player left it. Routing a pointer
       gesture through render() would rebuild the DOM at 60fps and cancel the
       CSS animation it was trying to show. */
    coreRotations: {},
    objectRotation: { x: -5, y: -12 }
  };
  var jumpTimer = null;
  var audioCtx = null;
  var lastEventId = null;
  var lastScreen = null;

  function activeCampaign() {
    if (!state.campaignId) return null;
    return campaigns.filter(function (c) { return c.id === state.campaignId; })[0] || null;
  }
  function activeEvent() {
    var c = activeCampaign();
    return c ? (eventById[c.chapterIds[state.chapterIndex]] || null) : null;
  }
  function progressFor(c) { return c ? (state.save.campaigns[c.id] || freshProgress(c)) : null; }
  function selectedChoice() {
    var e = activeEvent();
    if (!e || !state.selectedChoiceId) return null;
    return e.choices.filter(function (c) { return c.id === state.selectedChoiceId; })[0] || null;
  }
  function isLiveSignal() {
    var e = activeEvent();
    return !!e && e.truthMode === 'live_prediction';
  }
  function totalCompleted() {
    return Object.keys(state.save.campaigns).reduce(function (a, k) {
      return a + (state.save.campaigns[k].completed || []).length;
    }, 0);
  }
  function moduleUnlocked(m) {
    var p = state.save.campaigns[m.campaignId];
    return ((p && p.completed.length) || 0) >= m.unlockAt;
  }
  function unlockedModules() { return factoryModules.filter(moduleUnlocked); }

  function patchProgress(id, updater) {
    var campaign = campaigns.filter(function (c) { return c.id === id; })[0];
    if (!campaign) return;
    var existing = state.save.campaigns[id] || freshProgress(campaign);
    state.save.campaigns[id] = updater(existing);
    state.save.lastCampaignId = id;
    writeSave();
  }

  /* ---------------------------------------------------------------- sound -- */

  function playCue(kind) {
    if (!state.save.soundOn) return;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    try {
      if (!audioCtx) audioCtx = new Ctor();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var notes = kind === 'select' ? [440, 523.25]
        : kind === 'lock' ? [110, 660]
        : kind === 'jump' ? [73.42, 392]
        : kind === 'online' ? [329.63, 493.88]
        : kind === 'button' ? [660]
        : [392, 493.88, 587.33];
      notes.forEach(function (frequency, index) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var start = audioCtx.currentTime + index * 0.055;
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(kind === 'jump' ? 0.045 : 0.025, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.17);
      });
    } catch (e) { /* audio is a courtesy, never a dependency */ }
  }

  /* -------------------------------------------------------------- actions -- */

  function go(screen, message) {
    state.screen = screen;
    if (message !== undefined) state.liveMessage = message;
    render();
  }

  function openCampaign(campaign) {
    var existing = state.save.campaigns[campaign.id];
    state.campaignId = campaign.id;
    state.selectedChoiceId = null;
    state.selectedConfidence = 65;
    if (!existing || (!existing.completed.length && existing.chapterIndex === 0)) {
      state.chapterIndex = 0; go('prologue');
    } else if (existing.finished) {
      state.chapterIndex = Math.max(0, campaign.chapterIds.length - 1); go('recap');
    } else {
      state.chapterIndex = Math.min(existing.chapterIndex, campaign.chapterIds.length - 1);
      go('briefing');
    }
  }

  function startFreshCampaign() {
    var c = activeCampaign(); if (!c) return;
    patchProgress(c.id, function () { return freshProgress(c); });
    state.chapterIndex = 0; state.selectedChoiceId = null; state.selectedConfidence = 65;
    go('briefing');
  }

  function resumeLast() {
    var last = campaigns.filter(function (c) { return c.id === state.save.lastCampaignId; })[0];
    if (last) return openCampaign(last);
    go('campaigns');
  }

  function openEvidence() {
    var c = activeCampaign(), e = activeEvent();
    if (c && e) {
      patchProgress(c.id, function (cur) {
        if (cur.evidenceOpened.indexOf(e.id) === -1) cur.evidenceOpened = cur.evidenceOpened.concat([e.id]);
        cur.updatedAt = new Date().toISOString();
        return cur;
      });
    }
    state.evidenceOpen = true;
    render();
  }

  /**
   * Irreversible. A historical chapter jumps; a LIVE chapter seals instead,
   * because its outcome does not exist yet and inventing one is the single thing
   * this game may not do.
   */
  function lockChoice() {
    var c = activeCampaign(), e = activeEvent();
    if (!c || !e || !state.selectedChoiceId) return;
    var chosen = state.selectedChoiceId, conf = state.selectedConfidence, live = isLiveSignal();
    patchProgress(c.id, function (cur) {
      cur.choices[e.id] = chosen;
      cur.confidence[e.id] = conf;
      if (live && cur.sealed.indexOf(e.id) === -1) cur.sealed = cur.sealed.concat([e.id]);
      cur.updatedAt = new Date().toISOString();
      return cur;
    });
    playCue('lock');
    go(live ? 'vault' : 'jump');
  }

  function completeChapter() {
    var c = activeCampaign(), e = activeEvent(), ch = selectedChoice();
    if (!c || !e || !ch) return;
    var outcome = verifiedOutcome(e.id, ch.id);
    var isLast = state.chapterIndex === c.chapterIds.length - 1;
    var idx = state.chapterIndex;
    patchProgress(c.id, function (cur) {
      var already = cur.appliedEvents.indexOf(e.id) !== -1;
      /* Capital only moves on a verified outcome. An unverified chapter leaves it
         untouched — never zeroed, never guessed. */
      if (outcome && !already) {
        cur.capitalUsd = cur.capitalUsd * (1 + outcome.returnRatio);
        cur.appliedEvents = cur.appliedEvents.concat([e.id]);
      }
      if (cur.completed.indexOf(e.id) === -1) cur.completed = cur.completed.concat([e.id]);
      cur.chapterIndex = isLast ? idx : idx + 1;
      cur.finished = isLast;
      cur.updatedAt = new Date().toISOString();
      return cur;
    });
    go('chapter-complete');
  }

  function continueAfterChapter() {
    var c = activeCampaign(); if (!c) return;
    if (state.chapterIndex === c.chapterIds.length - 1) return go('recap');
    state.chapterIndex += 1;
    state.selectedChoiceId = null;
    state.selectedConfidence = 65;
    go('briefing');
  }

  function replayCampaign() {
    var c = activeCampaign(); if (!c) return;
    patchProgress(c.id, function () { return freshProgress(c); });
    state.chapterIndex = 0; state.selectedChoiceId = null; state.selectedConfidence = 65;
    go('prologue');
  }

  function skipJump() {
    if (jumpTimer) { clearTimeout(jumpTimer); jumpTimer = null; }
    go('outcome', 'The time jump is complete. The historical window is now revealed.');
    playCue('reveal');
  }

  function toggleSound() { state.save.soundOn = !state.save.soundOn; writeSave(); render(); }

  function shareDecision() {
    var c = activeCampaign(), e = activeEvent(), ch = selectedChoice();
    if (!c || !e || !ch) return;
    var msg = 'I entered ' + c.title + ' on ' + fmtDate(e.cutoffAt) + ' and backed “' +
      ch.label + '” with ' + state.selectedConfidence + '% confidence. ' +
      'My TimeToCompute thesis DNA: ' + thesisProfile().name + '.';
    var done = function (t) { state.shareStatus = t; render(); };
    try {
      if (navigator.share) {
        navigator.share({ title: 'My AI Time Machine decision', text: msg, url: location.href })
          .then(function () { done('Shared'); })['catch'](function () { done(''); });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(msg + ' ' + location.href)
          .then(function () { done('Copied to clipboard'); })['catch'](function () { done(''); });
      }
    } catch (err) { done(''); }
  }

  /* --------------------------------------------------------------- pieces -- */

  /**
   * The brand lock-up.
   *
   * The reference draws a CSS "T2C" hexagon in earlier builds and ships its own
   * brand PNG in this one. That PNG is byte-identical to this site's canonical
   * /Logo/logo-header.png, so the game points at the canonical file: same pixels,
   * one copy, and a logo change lands everywhere at once. It already contains the
   * wordmark, so no duplicate text label sits beside it.
   */
  function brandLogo(title) {
    return '<span class="tm-logo-reactor' + (title ? ' tm-logo-reactor--title' : '') + '">' +
      '<img class="tm-brand__logo' + (title ? ' tm-brand__logo--title' : '') + '" src="' + LOGO +
      '" width="514" height="120" alt="TimeToCompute" />' +
      '<i class="tm-logo-status-dot" aria-hidden="true"></i></span>';
  }

  function timeline(campaign, event) {
    var pct = ((event.chapter - 1) / Math.max(1, campaign.chapterIds.length - 1)) * 100;
    return '<div class="tm-timeline" aria-label="Timeline: chapter ' + event.chapter +
      ' of ' + campaign.chapterIds.length + ', ' + esc(fmtDate(event.cutoffAt)) + '">' +
      '<span class="tm-timeline__past" style="width:' + pct + '%"></span>' +
      campaign.chapterIds.map(function (id, index) {
        var ce = eventById[id];
        var cls = (index < event.chapter - 1 ? 'is-past ' : '') +
          (index === event.chapter - 1 ? 'is-current' : '');
        return '<span class="' + cls.trim() + '"><i></i><b>' +
          new Date(ce.cutoffAt).getUTCFullYear() + '</b></span>';
      }).join('') +
      '<em>' + icon('lock', 15) + ' Future hidden</em></div>';
  }

  function overlay(title, bodyHtml, wide, closeAct) {
    return '<div class="tm-overlay" role="presentation" data-act="' + closeAct + '">' +
      '<div class="tm-sheet ' + (wide ? 'tm-sheet--wide' : '') + '" role="dialog" ' +
      'aria-modal="true" aria-labelledby="tm-overlay-title" data-sheet>' +
      '<div class="tm-sheet__head"><div><span class="tm-kicker">TimeToCompute</span>' +
      '<h2 id="tm-overlay-title">' + esc(title) + '</h2></div>' +
      '<button class="tm-icon-button" type="button" data-act="' + closeAct + '" ' +
      'aria-label="Close">&times;</button></div>' +
      '<div class="tm-sheet__body">' + bodyHtml + '</div></div></div>';
  }

  /* -------------------------------------------------------------- screens -- */

  function screenTitle() {
    var hasSave = !!state.save.lastCampaignId;
    var snd = state.save.soundOn;
    return '<section class="tm-title-screen">' +
      '<div class="tm-title-screen__art" aria-hidden="true"></div>' +
      '<div class="tm-title-top">' +
      '<div class="tm-brand tm-brand--static">' + brandLogo(true) + '</div>' +
      '<div class="tm-title-top__tools">' +
      '<button class="tm-utility" type="button" data-act="sound" aria-pressed="' + snd + '">' +
      icon(snd ? 'sound' : 'muted', 17) + '<span>' + (snd ? 'AI audio on' : 'AI audio off') + '</span></button>' +
      '<button class="tm-text-button" type="button" data-act="help">How it works ' +
      '<span aria-hidden="true">&#8599;</span></button></div></div>' +
      '<div class="tm-title-copy">' +
      '<span class="tm-kicker tm-kicker--lime">Interactive history &middot; Real evidence</span>' +
      '<h1>The AI<br /><em>Time Machine</em></h1>' +
      '<p>Go back to the moment before the outcome. See only what was public. Choose the physical ' +
      'bottleneck you believe mattered next&mdash;and build your own AI factory from the signals you decode.</p>' +
      '<div class="tm-title-actions">' +
      '<button class="tm-primary tm-primary--hero" type="button" data-act="campaigns">' +
      'Enter the timeline <span aria-hidden="true">&rarr;</span></button>' +
      (hasSave ? '<button class="tm-resume" type="button" data-act="resume">' +
        icon('time', 18) + ' Resume your last journey</button>' : '') +
      '</div>' +
      '<div class="tm-title-stats" aria-label="Game overview">' +
      '<div><b>05</b><span>Finite campaigns</span></div>' +
      '<div><b>' + events.length + '</b><span>Real turning points</span></div>' +
      '<div><b>0' + factoryModules.length + '</b><span>Factory systems</span></div></div></div>' +
      '<div class="tm-title-rail" aria-hidden="true"><span class="tm-title-rail__line"></span>' +
      ['2023', '2024', '2025', '2026', '?'].map(function (y, i) {
        return '<span class="' + (i === 4 ? 'is-future' : '') + '"><i></i>' + y + '</span>';
      }).join('') + '</div>' +
      '<p class="tm-disclosure">Historical simulation &middot; Fictional capital &middot; ' +
      'Educational only&mdash;not investment advice</p></section>';
  }

  function screenCampaigns() {
    var prof = thesisProfile();
    return '<section class="tm-campaign-select tm-page">' +
      '<div class="tm-section-heading"><div><span class="tm-kicker">Choose a turning point</span>' +
      '<h1 tabindex="-1" data-heading>Where do you enter history?</h1></div>' +
      '<div class="tm-campaign-intro">' +
      '<p>Five finite stories. ' + events.length + ' real signals. The future stays hidden until you commit.</p>' +
      '<button class="tm-factory-cta" type="button" data-act="factory">' + icon('facility', 20) +
      '<span><b>Enter your AI Factory</b><small>' + unlockedModules().length + ' / ' +
      factoryModules.length + ' systems online &middot; ' + esc(prof.name) + '</small></span>' +
      '<span aria-hidden="true">&rarr;</span></button></div></div>' +
      '<div class="tm-campaign-grid">' +
      campaigns.map(function (campaign, index) {
        var evs = campaign.chapterIds.map(function (id) { return eventById[id]; }).filter(Boolean);
        var prog = state.save.campaigns[campaign.id];
        var complete = prog ? prog.completed.length : 0;
        var years = new Date(evs[0].cutoffAt).getUTCFullYear() + '—' +
          new Date(evs[evs.length - 1].cutoffAt).getUTCFullYear();
        var vis = visuals[campaign.id];
        var pct = Math.round((complete / campaign.chapterIds.length) * 100);
        return '<article class="tm-campaign-card" style="--card-index:' + index + '">' +
          art('backgrounds', vis.background, 'tm-campaign-card__art') +
          '<div class="tm-campaign-card__shade"></div>' +
          '<div class="tm-campaign-card__top"><span>' + String(index + 1).padStart(2, '0') +
          '</span><span>' + years + '</span></div>' +
          '<div class="tm-campaign-card__content">' +
          '<div class="tm-campaign-card__icon">' + icon(vis.icon, 24) + '</div>' +
          '<span class="tm-kicker">' + esc(vis.eyebrow) + '</span>' +
          '<h2>' + esc(campaign.title) + '</h2><p>' + esc(campaign.question) + '</p>' +
          '<div class="tm-card-progress"><span><i style="width:' + pct + '%"></i></span>' +
          '<b>' + complete + ' / ' + campaign.chapterIds.length + '</b></div>' +
          '<button class="tm-card-action" type="button" data-act="open" data-id="' + esc(campaign.id) + '">' +
          (prog && prog.finished ? 'Review timeline' : complete ? 'Resume campaign' : 'Begin campaign') +
          ' <span aria-hidden="true">&#8599;</span></button></div></article>';
      }).join('') + '</div>' +
      '<div class="tm-method-strip">' +
      '<span>' + icon('evidence', 18) + ' Primary sources</span>' +
      '<span>' + icon('time', 18) + ' Immutable cutoffs</span>' +
      '<span>' + icon('risk', 18) + ' Mechanism + risk</span>' +
      '<span>' + icon('lock', 18) + ' No future leakage</span></div></section>';
  }

  /**
   * The factory.
   *
   * A persistent world assembled only from decisions already made. Every module
   * is locked until its campaign has progressed far enough, and the counter says
   * exactly what unlocks it — there is no hidden currency and nothing to buy.
   */
  function screenFactory() {
    var prof = thesisProfile();
    var evOpened = Object.keys(state.save.campaigns).reduce(function (a, k) {
      return a + (state.save.campaigns[k].evidenceOpened || []).length;
    }, 0);
    return '<section class="tm-factory tm-page">' +
      art('backgrounds', 'background-race-to-revenue.webp', 'tm-factory__bg') +
      '<div class="tm-factory__veil"></div>' +
      '<div class="tm-factory__heading"><div>' +
      '<span class="tm-kicker">Persistent world &middot; Built from your decisions</span>' +
      '<h1 tabindex="-1" data-heading>Your AI Factory</h1>' +
      '<p>Every historical signal you complete switches on another physical layer. Open an online ' +
      'system to inspect what it does and who participates in it.</p></div>' +
      '<button class="tm-secondary" type="button" data-act="campaigns">Return to timelines &rarr;</button>' +
      '</div><div class="tm-factory-layout">' +
      '<div class="tm-factory-map" aria-label="Your evolving AI factory">' +
      '<div class="tm-factory-map__grid" aria-hidden="true"></div>' +
      '<div class="tm-factory-map__core" aria-hidden="true"><i></i><span>COMPUTE CAMPUS</span></div>' +
      factoryModules.map(function (m, index) {
        var on = moduleUnlocked(m);
        return '<button class="tm-factory-node tm-factory-node--' + esc(m.id) + ' ' +
          (on ? 'is-online' : 'is-locked') + '" type="button"' + (on ? '' : ' disabled') +
          ' data-act="module" data-id="' + esc(m.id) + '" style="--node-index:' + index + '"' +
          ' aria-label="' + esc(on ? 'Inspect ' + m.title : m.title + ' locked') + '">' +
          '<span class="tm-factory-node__pulse"></span>' +
          art('objects', m.object, '') +
          '<span class="tm-factory-node__copy"><small>' +
          (on ? 'SYSTEM ONLINE' : 'UNLOCK ' + m.unlockAt + ' SIGNAL' + (m.unlockAt > 1 ? 'S' : '')) +
          '</small><b>' + esc(m.label) + '</b></span></button>';
      }).join('') + '</div>' +
      '<aside class="tm-factory-profile"><span class="tm-kicker">Your thesis DNA</span>' +
      '<h2>' + esc(prof.name) + '</h2><b>' + esc(prof.signal) + '</b><p>' + esc(prof.description) + '</p>' +
      '<dl><div><dt>Signals completed</dt><dd>' + totalCompleted() + ' / ' + events.length + '</dd></div>' +
      '<div><dt>Systems online</dt><dd>' + unlockedModules().length + ' / ' + factoryModules.length + '</dd></div>' +
      '<div><dt>Evidence opened</dt><dd>' + evOpened + '</dd></div></dl>' +
      '<p class="tm-factory-profile__note">There is no perfect factory. This one reflects the ' +
      'constraints you consistently notice.</p></aside></div></section>';
  }

  function screenPrologue() {
    var c = activeCampaign(), vis = visuals[c.id];
    var idx = campaigns.findIndex(function (x) { return x.id === c.id; });
    var first = eventById[c.chapterIds[0]];
    return '<section class="tm-prologue tm-page">' +
      art('backgrounds', vis.background, 'tm-prologue__bg') +
      '<div class="tm-prologue__veil"></div><div class="tm-prologue__copy">' +
      '<span class="tm-kicker">Campaign ' + String(idx + 1).padStart(2, '0') + '</span>' +
      '<h1 tabindex="-1" data-heading>' + esc(c.title) + '</h1>' +
      '<p class="tm-prologue__question">' + esc(c.question) + '</p>' +
      '<p>' + esc(c.synopsis) + '</p><div class="tm-prologue__rules">' +
      '<span>' + icon('trend', 21) + '<b>' + fmtCurrency(c.initialCapitalUsd) + '</b> fictional starting value</span>' +
      '<span>' + icon('evidence', 21) + 'Only evidence public at each cutoff</span>' +
      '<span>' + icon('time', 21) + c.chapterIds.length + ' finite chapters</span></div>' +
      '<button class="tm-primary" type="button" data-act="begin">Begin in ' +
      esc(fmtDate(first.cutoffAt)) + ' <span aria-hidden="true">&rarr;</span></button></div>' +
      art('objects', vis.object, 'tm-prologue__object') + '</section>';
  }

  /**
   * The briefing's rotatable object.
   *
   * A real box in CSS 3D: six chassis faces give it thickness, and two textured
   * surfaces carry the artwork front and back. The reference calls this the
   * "true depth" build and this is the piece that earns the name — flattening it
   * back to one <img> would drop the whole point of the update.
   *
   * Rotation state lives outside render() and is written straight onto the
   * element's custom properties during a drag, so a 60fps gesture never rebuilds
   * the DOM. It is re-emitted here so a re-render does not snap the object back.
   */
  function objectInspector(campaign, vis, label) {
    var r = state.objectRotation;
    return '<div class="tm-briefing-visual tm-object-inspector" role="img" tabindex="0" ' +
      'data-object-inspector aria-label="Interactive 3D model of ' + esc(campaign.title) +
      '. Drag to rotate or click for a full turn.">' +
      '<span class="tm-orbit tm-orbit--one"></span><span class="tm-orbit tm-orbit--two"></span>' +
      '<span class="tm-object-inspector__rotator" data-object-rotator style="' +
      '--object-rx:' + r.x + 'deg;--object-ry:' + r.y + 'deg;' +
      '--object-surface-depth:' + (vis.depthPx / 2) + 'px;--object-body-depth:' + vis.depthPx + 'px;' +
      '--object-body-w:' + vis.bodyWidthPx + 'px;--object-body-h:' + vis.bodyHeightPx + 'px">' +
      '<span class="tm-object-inspector__asset" data-object-asset data-model="' + esc(campaign.id) + '">' +
      ['front', 'back', 'left', 'right', 'top', 'bottom'].map(function (f) {
        return '<i class="tm-object-inspector__chassis-face tm-object-inspector__chassis-face--' +
          f + '" aria-hidden="true"></i>';
      }).join('') +
      '<span class="tm-object-inspector__surface tm-object-inspector__surface--front">' +
      art('objects', vis.object, '', ' draggable="false"') + '</span>' +
      '<span class="tm-object-inspector__surface tm-object-inspector__surface--back">' +
      art('objects', vis.object, '', ' draggable="false"') +
      '<b>TIME TO COMPUTE</b></span></span></span>' +
      '<span class="tm-object-label">' + esc(label) + '</span>' +
      '<span class="tm-object-inspector__hint" aria-hidden="true"><i></i> Drag to inspect &middot; click to spin</span>' +
      '</div>';
  }

  function screenBriefing() {
    var c = activeCampaign(), e = activeEvent(), vis = visuals[c.id];
    var live = isLiveSignal();
    var prog = progressFor(c);
    var sealed = live && prog.sealed.indexOf(e.id) !== -1;
    var chainIdx = Math.min(vis.chain.length - 1,
      Math.floor((e.chapter - 1) / Math.max(1, c.chapterIds.length - 1) * vis.chain.length));
    return '<section class="tm-stage tm-page">' +
      art('backgrounds', vis.background, 'tm-stage__bg') +
      '<div class="tm-stage__veil"></div><div class="tm-briefing-layout">' +
      '<div class="tm-briefing-copy">' +
      '<span class="tm-date-chip"><i></i> Knowledge cutoff &middot; ' + esc(fmtDate(e.cutoffAt)) + '</span>' +
      '<span class="tm-kicker">Chapter ' + e.chapter + ' &middot; Breaking signal</span>' +
      '<h1 tabindex="-1" data-heading>' + esc(e.title) + '</h1>' +
      '<p class="tm-lede">' + esc(e.briefing.headline) + '</p>' +
      '<p class="tm-simple"><span>In simple terms</span>' + esc(e.briefing.simpleMeaning) + '</p>' +
      '<div class="tm-briefing-actions">' +
      '<button class="tm-primary" type="button" data-act="decide">' +
      (sealed ? 'View your sealed signal' : live ? 'Seal your live signal' : 'Choose your thesis') +
      ' <span aria-hidden="true">&rarr;</span></button>' +
      '<button class="tm-secondary" type="button" data-act="evidence">' +
      icon('evidence', 18) + ' Inspect the evidence</button></div></div>' +
      objectInspector(c, vis, vis.chain[chainIdx]) +
      '<aside class="tm-clue-stack" aria-label="What was knowable">' +
      '<article><span>01 &middot; Direct fact</span><p>' + esc(e.briefing.directFact) + '</p></article>' +
      '<article><span>02 &middot; Physical meaning</span><p>' + esc(e.briefing.physicalMeaning) + '</p></article>' +
      '<article class="is-unknown"><span>03 &middot; Critical unknown</span><p>' +
      esc(e.briefing.criticalUnknown) + '</p></article></aside></div>' +
      (live ? '<div class="tm-locked-banner">' + icon('lock', 22) +
        '<div><b>The outcome is still ahead</b><span>This ' + e.windowDays +
        '-day window matures on ' + esc(fmtDate(e.outcomeTargetDate)) +
        '. Your decision is sealed and timestamped; no result is invented.</span></div></div>' : '') +
      timeline(c, e) + '</section>';
  }

  /**
   * A thesis rendered as a solid object.
   *
   * Six labelled faces carry the whole decision: category, exposure, mechanism
   * and index. The product inside is built from a solid core plus five stacked
   * image layers — that layering is what makes the artwork read as a physical
   * part rather than a sticker when the cube turns.
   *
   * The "wait for evidence" thesis deliberately has NO object. There is nothing
   * physical to draw for holding cash, and drawing something anyway would give
   * the most cautious choice the same visual weight as a built system.
   */
  function choiceCard(choice, index) {
    var cv = getChoiceVisual(choice);
    var obj = choiceObjectAsset(cv.tone);
    var depth = choiceObjectDepth(cv.tone);
    var on = choice.id === state.selectedChoiceId;
    var rot = state.coreRotations[choice.id] || { x: -8, y: -16 };

    var product = obj
      ? '<span class="tm-thesis-core__product-solid" aria-hidden="true">' +
        ['front', 'back', 'left', 'right', 'top', 'bottom'].map(function (f) {
          return '<i class="tm-thesis-core__product-solid-face tm-thesis-core__product-solid-face--' + f + '"></i>';
        }).join('') + '</span>' +
        [0, 1, 2, 3, 4].map(function (layer) {
          return '<span class="tm-thesis-core__product-layer" style="--choice-object-z:' +
            (-depth / 2 + layer * (depth / 4)) + 'px">' +
            art('objects', obj, '', ' draggable="false"') + '</span>';
        }).join('')
      : icon('lock', 42);

    return '<button class="tm-choice-card ' + (on ? 'is-selected' : '') + '" type="button" ' +
      'role="radio" aria-checked="' + on + '" data-act="pick" data-id="' + esc(choice.id) + '">' +
      '<span class="tm-choice-card__number">0' + (index + 1) + '</span>' +
      '<span class="tm-choice-card__check">' + icon('check', 16) + '</span>' +
      '<div class="tm-choice-visual tm-choice-visual--' + esc(cv.tone) + '" aria-hidden="true" ' +
      'data-core="' + esc(choice.id) + '">' +
      '<span class="tm-choice-visual__grid"></span>' +
      '<span class="tm-choice-visual__rotator" data-core-rotator style="--core-rx:' + rot.x +
      'deg;--core-ry:' + rot.y + 'deg;--choice-model-depth:' + depth + 'px">' +
      '<span class="tm-thesis-core' + (on ? ' is-spinning' : '') + '" data-core-cube>' +
      '<span class="tm-thesis-core__face tm-thesis-core__face--front">' +
      '<span class="tm-thesis-core__eyebrow">' + icon(cv.icon, 16) + esc(cv.category) + '</span>' +
      '<span class="tm-thesis-core__product' + (obj ? '' : ' is-reserve') + '">' + product +
      '</span></span>' +
      '<span class="tm-thesis-core__face tm-thesis-core__face--back">' +
      (obj
        ? art('objects', obj, 'tm-thesis-core__rear-object', ' draggable="false"')
        : icon('lock', 32)) +
      '<b>' + esc(choice.label) + '</b><small>Mechanism + risk mapped</small></span>' +
      '<span class="tm-thesis-core__face tm-thesis-core__face--left"><b>0' + (index + 1) +
      '</b><small>' + esc(cv.category) + '</small></span>' +
      '<span class="tm-thesis-core__face tm-thesis-core__face--right"><b>' +
      esc(exposureLabel(choice)) + '</b><small>EXPOSURE</small></span>' +
      '<span class="tm-thesis-core__face tm-thesis-core__face--top">' + icon(cv.icon, 18) +
      '<b>THESIS CORE</b></span>' +
      '<span class="tm-thesis-core__face tm-thesis-core__face--bottom"><b>TIME TO COMPUTE</b></span>' +
      '</span></span>' +
      '<span class="tm-choice-visual__hint"><i></i> Drag to rotate &middot; click to choose</span>' +
      '</div>' +
      '<div class="tm-choice-card__identity">' +
      '<span class="tm-choice-card__category">' + icon(cv.icon, 15) + esc(cv.category) + '</span>' +
      '<span class="tm-choice-card__exposure">' + esc(exposureLabel(choice)) + '</span>' +
      '<small>' + esc(cv.names.join(' + ')) + '</small></div>' +
      '<h2>' + esc(choice.label) + '</h2>' +
      '<div class="tm-choice-card__detail"><span>Thesis</span><p>' + esc(choice.mechanism) + '</p></div>' +
      '<div class="tm-choice-card__detail is-risk"><span>' + icon('risk', 14) +
      ' Risk</span><p>' + esc(choice.risk) + '</p></div></button>';
  }

  function screenDecision() {
    var c = activeCampaign(), e = activeEvent(), prog = progressFor(c);
    var sel = selectedChoice(), live = isLiveSignal();
    var html = '<section class="tm-decision tm-page">' +
      '<div class="tm-decision__heading"><div>' +
      '<span class="tm-kicker">' + esc(fmtDate(e.cutoffAt)) + ' &middot; Make the call</span>' +
      '<h1 tabindex="-1" data-heading>' +
      (live ? 'Seal your live signal' : 'Where does your thesis go?') + '</h1><p>' +
      (live
        ? 'Choose before the outcome exists. Your decision and confidence cannot change after the vault closes.'
        : 'Reallocate ' + fmtCurrency(prog.capitalUsd) +
          ' of fictional capital. Every choice has a mechanism and a risk.') +
      '</p></div><button class="tm-secondary" type="button" data-act="evidence">' +
      icon('evidence', 18) + ' Evidence available then</button></div>' +
      '<div class="tm-choice-grid" role="radiogroup" aria-label="Choose one historical thesis">' +
      e.choices.map(choiceCard).join('') + '</div>' +
      '<div class="tm-confidence" aria-label="Confidence level">' +
      '<div><span class="tm-kicker">Confidence</span>' +
      '<p>How strongly does the evidence support your thesis?</p></div>' +
      '<div class="tm-confidence__options" role="radiogroup" aria-label="Select confidence">' +
      [50, 65, 80, 95].map(function (v) {
        var on = state.selectedConfidence === v;
        return '<button type="button" role="radio" aria-checked="' + on + '" class="' +
          (on ? 'is-selected' : '') + '" data-act="confidence" data-id="' + v + '">' + v + '%</button>';
      }).join('') + '</div></div>' +
      '<div class="tm-decision-bar"><div><span>' +
      (live ? 'Vault opens' : 'Outcome window') + '</span><b>' +
      (live ? esc(fmtDate(e.outcomeTargetDate)) : e.windowDays + ' calendar days') + '</b></div>' +
      '<button class="tm-primary" type="button" data-act="review"' +
      (state.selectedChoiceId ? '' : ' disabled') + '>' +
      (state.selectedChoiceId ? 'Review choice' : 'Select a thesis') +
      ' <span aria-hidden="true">&rarr;</span></button></div>' + timeline(c, e);

    if (state.screen === 'confirm' && sel) {
      html += overlay(live ? 'Seal this signal?' : 'Leave this date behind?',
        '<div class="tm-confirm"><span class="tm-confirm__icon">' + icon('lock', 25) + '</span>' +
        '<p>You are backing</p><h3>' + esc(sel.label) + '</h3>' +
        '<b>' + esc(exposureLabel(sel)) + '</b><dl>' +
        '<div><dt>Fictional allocation</dt><dd>' + fmtCurrency(prog.capitalUsd) + '</dd></div>' +
        '<div><dt>Confidence</dt><dd>' + state.selectedConfidence + '%</dd></div>' +
        '<div><dt>' + (live ? 'Vault opens' : 'Destination') + '</dt><dd>' +
        esc(fmtDate(e.outcomeTargetDate)) + '</dd></div></dl>' +
        '<p class="tm-confirm__warning">' +
        (live
          ? 'Your thesis will be timestamped and sealed. Later evidence remains hidden.'
          : 'The next screen reveals information that was unavailable at the cutoff.') + '</p>' +
        '<button class="tm-primary tm-primary--wide" type="button" data-act="lock">' +
        (live ? 'Seal decision in the vault' : 'Lock choice &amp; jump ' + e.windowDays + ' days') +
        ' <span aria-hidden="true">&rarr;</span></button>' +
        '<button class="tm-text-button" type="button" data-act="decide">Change decision</button></div>',
        false, 'decide');
    }
    return html + '</section>';
  }

  /**
   * The vault.
   *
   * Where a live-prediction chapter ends. The window has not matured, so there
   * is nothing to reveal — and rather than manufacture a result, the decision is
   * timestamped and sealed. This is the fail-closed rule applied to time itself.
   */
  function screenVault() {
    var c = activeCampaign(), e = activeEvent(), vis = visuals[c.id], ch = selectedChoice();
    return '<section class="tm-vault tm-page">' +
      art('backgrounds', vis.background, 'tm-vault__bg') +
      '<div class="tm-vault__veil"></div>' +
      '<div class="tm-vault__seal" aria-hidden="true">' + icon('lock', 42) + '<i></i><i></i></div>' +
      '<div class="tm-vault__content">' +
      '<span class="tm-kicker">Signal Vault &middot; Timestamped ' + esc(fmtDate(e.cutoffAt)) + '</span>' +
      '<h1 tabindex="-1" data-heading>Decision sealed.</h1>' +
      '<p class="tm-vault__lede">You entered before the outcome existed. The historical record after ' +
      'the cutoff remains hidden.</p>' +
      '<article class="tm-vault-card"><span>Your live thesis</span>' +
      '<h2>' + esc(ch.label) + '</h2><b>' + esc(exposureLabel(ch)) + '</b><dl>' +
      '<div><dt>Confidence</dt><dd>' + state.selectedConfidence + '%</dd></div>' +
      '<div><dt>Vault opens</dt><dd>' + esc(fmtDate(e.outcomeTargetDate)) + '</dd></div>' +
      '<div><dt>Window</dt><dd>' + e.windowDays + ' days</dd></div></dl></article>' +
      '<div class="tm-vault__actions">' +
      '<button class="tm-primary" type="button" data-act="campaigns">Return to timelines <span aria-hidden="true">&rarr;</span></button>' +
      '<button class="tm-secondary" type="button" data-act="factory">Visit your AI Factory</button>' +
      '<button class="tm-text-button" type="button" data-act="share">Share sealed signal</button></div>' +
      '<p class="tm-share-status" role="status">' + esc(state.shareStatus) + '</p></div>' +
      art('objects', vis.object, 'tm-vault__object') + '</section>';
  }

  function screenJump() {
    var c = activeCampaign(), e = activeEvent(), vis = visuals[c.id];
    return '<section class="tm-jump tm-page" aria-busy="true">' +
      art('backgrounds', vis.background, 'tm-jump__bg') +
      '<div class="tm-jump__tunnel" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<div class="tm-jump__copy"><span class="tm-kicker">Decision locked</span>' +
      '<h1 tabindex="-1" data-heading>Advancing the timeline</h1>' +
      '<div class="tm-jump__dates"><span>' + esc(fmtDate(e.cutoffAt)) + '</span><i></i><span>' +
      esc(fmtDate(e.outcomeTargetDate)) + '</span></div>' +
      '<p>The future evidence is opening. Your choice cannot change now.</p>' +
      '<button class="tm-secondary" type="button" data-act="skip">' +
      icon('pause', 17) + ' Skip transition</button></div></section>';
  }

  function screenOutcome() {
    var c = activeCampaign(), e = activeEvent(), vis = visuals[c.id];
    var prog = progressFor(c), ch = selectedChoice();
    var outcome = verifiedOutcome(e.id, ch.id);
    var activeThrough = Math.max(1, Math.ceil(e.chapter / c.chapterIds.length * vis.chain.length));

    /* FAIL CLOSED. With no verified adjusted-close pair the panel says exactly
       that and shows nothing else — no estimate, no zero, no substituted index.
       The reference's own copy here reads "Decision preserved" and omits the
       sentence; the integration brief requires the sentence, so it leads and
       the reference's confidence line follows it. */
    var conf = prog.confidence[e.id] || state.selectedConfidence;
    var result = outcome
      ? '<div class="tm-price-result"><span>' + fmtCurrency(prog.capitalUsd) + '</span>' +
        '<i aria-hidden="true">&rarr;</i><strong>' +
        fmtCurrency(prog.capitalUsd * (1 + outcome.returnRatio)) + '</strong>' +
        '<em>' + fmtPercent(outcome.returnRatio) + '</em>' +
        '<small>' + esc(outcome.entrySession) + ' to ' + esc(outcome.exitSession) +
        ' &middot; ' + esc(outcome.provider) + '</small></div>'
      : '<div class="tm-thesis-record">' + icon('lock', 26) +
        '<div><strong>' + AWAITING + '</strong>' +
        '<p>Your decision is preserved &mdash; you committed with ' + conf +
        '% confidence before the later evidence was revealed. No price has been ' +
        'estimated or invented.</p></div></div>';

    var later = (e.revealSourceIds && e.revealSourceIds.length)
      ? e.revealSourceIds.slice(0, 3).map(function (id) {
          var s = sourceById[id]; if (!s) return '';
          return '<div><span>' + esc(fmtDate(s.publishedAt)) + '</span><b>' + esc(s.publisher) +
            '</b><p>' + esc(s.supportedClaim) + '</p></div>';
        }).join('')
      : '<div><span>End of recorded arc</span><b>No later seed source</b>' +
        '<p>This chapter closes on what the cited source proved&mdash;and what it did not.</p></div>';

    return '<section class="tm-outcome tm-page"><div class="tm-outcome__top">' +
      '<span class="tm-kicker">The window closed &middot; ' + esc(fmtDate(e.outcomeTargetDate)) + '</span>' +
      '<h1 tabindex="-1" data-heading>What happened next?</h1></div>' +
      '<div class="tm-outcome-grid">' +
      '<article class="tm-outcome-value"><span>Your historical thesis</span>' +
      '<h2>' + esc(ch.label) + '</h2><b>' + esc(exposureLabel(ch)) + '</b>' + result +
      (outcome
        ? '<p class="tm-causality">A subsequent return would not prove that this event caused the price move.</p>'
        : '') + '</article>' +
      '<article class="tm-chain-card"><span class="tm-kicker">The physical chain</span>' +
      '<h2>Signal &rarr; system</h2><div class="tm-chain">' +
      vis.chain.map(function (node, index) {
        return '<span class="' + (index < activeThrough ? 'is-active' : '') + '"><i>' +
          (index + 1) + '</i><b>' + esc(node) + '</b></span>';
      }).join('') + '</div><p>' + esc(e.briefing.physicalMeaning) + '</p></article>' +
      '<article class="tm-later-evidence"><span class="tm-kicker">What became knowable later</span>' +
      later + '</article></div>' +
      '<div class="tm-outcome-actions"><button class="tm-primary" type="button" data-act="debrief">' +
      'Open the debrief <span aria-hidden="true">&rarr;</span></button></div></section>';
  }

  function screenDebrief() {
    var e = activeEvent(), ch = selectedChoice();
    var ids = (e.briefingSourceIds || []).concat(e.revealSourceIds || []);
    return '<section class="tm-debrief tm-page">' +
      '<div class="tm-section-heading tm-section-heading--compact"><div>' +
      '<span class="tm-kicker">Chapter ' + e.chapter + ' debrief</span>' +
      '<h1 tabindex="-1" data-heading>What this chapter actually proved</h1></div></div>' +
      '<div class="tm-debrief-grid">' +
      '<article class="tm-debrief-card is-direct"><span><i></i> Direct</span>' +
      '<h2>The strongest evidence</h2><p>' + esc(e.briefing.directFact) + '</p></article>' +
      '<article class="tm-debrief-card is-inference"><span><i></i> Your inference</span>' +
      '<h2>The leap your thesis required</h2><p>' + esc(ch.mechanism) + '</p></article>' +
      '<article class="tm-debrief-card is-unknown"><span><i></i> Unknown</span>' +
      '<h2>The unresolved risk</h2><p>' + esc(e.briefing.criticalUnknown) + '</p></article></div>' +
      '<div class="tm-debrief-bottom"><div class="tm-source-list">' +
      '<span class="tm-kicker">Primary record</span>' +
      ids.map(function (id) {
        var s = sourceById[id]; if (!s) return '';
        return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' +
          '<span>' + esc(s.publisher) + ' &middot; ' + esc(fmtDate(s.publishedAt)) + '</span>' +
          '<b>' + esc(s.title) + '</b><i aria-hidden="true">&#8599;</i></a>';
      }).join('') + '</div>' +
      '<div class="tm-debrief-choice"><span>You chose</span><b>' + esc(ch.label) + '</b>' +
      '<p>' + esc(ch.risk) + '</p></div></div>' +
      '<div class="tm-debrief-actions">' +
      '<button class="tm-primary" type="button" data-act="complete">Complete chapter ' +
      '<span aria-hidden="true">&rarr;</span></button>' +
      '<button class="tm-text-button" type="button" data-act="campaigns">' +
      'Stop here &mdash; progress is saved</button></div></section>';
  }

  function screenChapterComplete() {
    var c = activeCampaign();
    var isLast = state.chapterIndex === c.chapterIds.length - 1;
    return '<section class="tm-chapter-complete tm-page">' +
      '<div class="tm-complete-ring">' + icon('check', 42) + '</div>' +
      '<span class="tm-kicker">Timeline updated</span>' +
      '<h1 tabindex="-1" data-heading>Chapter saved.</h1>' +
      '<p>Your decision has changed the factory. Your emerging thesis DNA is <b>' +
      esc(thesisProfile().name) + '</b>.</p>' +
      '<div class="tm-decision-trail">' +
      c.chapterIds.map(function (id, index) {
        return '<span class="' + (index <= state.chapterIndex ? 'is-complete' : '') + '"><i>' +
          (index + 1) + '</i></span>';
      }).join('') + '</div>' +
      '<div class="tm-complete-actions">' +
      '<button class="tm-primary" type="button" data-act="next">' +
      (isLast ? 'Review campaign' : 'Continue to chapter ' + (state.chapterIndex + 2)) +
      ' <span aria-hidden="true">&rarr;</span></button>' +
      '<button class="tm-secondary" type="button" data-act="factory">See factory upgrade</button>' +
      (selectedChoice()
        ? '<button class="tm-text-button" type="button" data-act="share">Share your signal</button>' : '') +
      '</div><p class="tm-share-status" role="status">' + esc(state.shareStatus) + '</p></section>';
  }

  function screenRecap() {
    var c = activeCampaign(), vis = visuals[c.id], prog = progressFor(c);
    var prof = thesisProfile();
    return '<section class="tm-recap tm-page">' +
      art('backgrounds', vis.background, 'tm-recap__bg') +
      '<div class="tm-recap__veil"></div><div class="tm-recap__content">' +
      '<span class="tm-kicker">Campaign record</span>' +
      '<h1 tabindex="-1" data-heading>Your path through<br />' + esc(c.title) + '</h1>' +
      '<p>Not a score. A record of which constraints you noticed, which risks you accepted and what ' +
      'the historical record later showed.</p>' +
      '<div class="tm-recap__stats">' +
      '<div><span>Decisions</span><b>' + prog.completed.length + ' / ' + c.chapterIds.length + '</b></div>' +
      '<div><span>Evidence opened</span><b>' + prog.evidenceOpened.length + '</b></div>' +
      '<div><span>Thesis DNA</span><b>' + esc(prof.name) + '</b><small>' + esc(prof.signal) + '</small></div></div>' +
      '<div class="tm-recap-trail">' +
      c.chapterIds.map(function (id, index) {
        var ev = eventById[id];
        var choiceId = prog.choices[id];
        var choice = ev.choices.filter(function (x) { return x.id === choiceId; })[0];
        var done = prog.completed.indexOf(id) !== -1 || prog.sealed.indexOf(id) !== -1;
        var label = choice ? choice.label
          : (ev.truthMode === 'live_prediction' ? 'Live signal' : 'Not played');
        return '<article class="' + (done ? 'is-complete' : '') + '">' +
          '<span>' + String(index + 1).padStart(2, '0') + '</span><div><b>' +
          esc(fmtDate(ev.cutoffAt)) + '</b><p>' + esc(label) + '</p></div></article>';
      }).join('') + '</div>' +
      '<div class="tm-recap__actions">' +
      '<button class="tm-primary" type="button" data-act="campaigns">Choose another campaign <span aria-hidden="true">&rarr;</span></button>' +
      '<button class="tm-secondary" type="button" data-act="factory">Visit your AI Factory</button>' +
      '<button class="tm-text-button" type="button" data-act="replay">Replay this campaign</button>' +
      '</div></div>' +
      art('objects', vis.object, 'tm-recap__object') + '</section>';
  }

  /* --------------------------------------------------------------- render -- */

  function header() {
    if (state.screen === 'title') return '';
    var c = activeCampaign(), e = activeEvent();
    var hideProgress = ['campaigns', 'factory', 'recap'].indexOf(state.screen) !== -1;
    var snd = state.save.soundOn;
    return '<header class="tm-header">' +
      '<button class="tm-brand" type="button" data-act="campaigns" ' +
      'aria-label="Return to campaign selection">' + brandLogo(false) + '</button>' +
      (c && e && !hideProgress
        ? '<div class="tm-header__progress" aria-label="Chapter ' + e.chapter + ' of ' +
          c.chapterIds.length + '"><span>' + esc(c.title) + '</span><b>' +
          String(e.chapter).padStart(2, '0') + ' / ' +
          String(c.chapterIds.length).padStart(2, '0') + '</b></div>'
        : '') +
      '<div class="tm-header__tools">' +
      '<button class="tm-utility" type="button" data-act="help">' +
      '<span aria-hidden="true">?</span><span class="tm-utility__label">How it works</span></button>' +
      '<button class="tm-utility" type="button" data-act="sound" aria-pressed="' + snd + '">' +
      icon(snd ? 'sound' : 'muted', 17) + '<span class="tm-utility__label">' +
      (snd ? 'Sound on' : 'Sound off') + '</span></button>' +
      '<a class="tm-utility tm-utility--exit" href="/">' +
      '<span aria-hidden="true">&larr;</span>' +
      '<span class="tm-utility__label">Back to TimeToCompute</span></a>' +
      '</div></header>';
  }

  function evidenceDrawer() {
    var e = activeEvent();
    if (!state.evidenceOpen || !e) return '';
    /* briefingSourceIds ONLY. Reveal sources stay hidden until commitment — the
       one rule that keeps this a history game rather than a quiz with answers. */
    var items = (e.briefingSourceIds || []).map(function (id) { return sourceById[id]; })
      .filter(Boolean).map(function (s, index) {
        return '<article><div class="tm-evidence-list__number">0' + (index + 1) + '</div>' +
          '<div class="tm-evidence-list__content"><span>' +
          esc(String(s.sourceType).split('_').join(' ')) + ' &middot; Available by cutoff</span>' +
          '<h3>' + esc(s.title) + '</h3><p>' + esc(s.supportedClaim) + '</p>' +
          '<dl><div><dt>Publisher</dt><dd>' + esc(s.publisher) + '</dd></div>' +
          '<div><dt>Published</dt><dd>' + esc(fmtDate(s.publishedAt)) + '</dd></div></dl>' +
          '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' +
          'Open primary source <span aria-hidden="true">&#8599;</span></a></div></article>';
      }).join('');
    return overlay('Evidence available by ' + fmtDate(e.cutoffAt),
      '<p class="tm-sheet-intro">Only material published by the knowledge cutoff appears here. ' +
      'Later evidence stays hidden until after commitment.</p>' +
      '<div class="tm-evidence-list">' + items + '</div>', true, 'closeEvidence');
  }

  function moduleDrawer() {
    if (!state.factoryModuleId) return '';
    var m = factoryModules.filter(function (x) { return x.id === state.factoryModuleId; })[0];
    if (!m) return '';
    return overlay(m.title,
      '<div class="tm-module-inspector">' +
      '<div class="tm-module-inspector__visual"><span class="tm-module-inspector__orbit"></span>' +
      art('objects', m.object, '') +
      '<b>' + esc(m.label) + '</b></div>' +
      '<div class="tm-module-inspector__copy"><span class="tm-kicker">What is this?</span>' +
      '<h3>' + esc(m.simple) + '</h3>' +
      '<div><span>Why it matters</span><p>' + esc(m.significance) + '</p></div>' +
      '<div><span>Publicly traded participants</span><div class="tm-ticker-list">' +
      m.participants.map(function (t) {
        var inst = instrumentById[t];
        return '<span><b>' + esc(t) + '</b>' + esc((inst && inst.name) || t) + '</span>';
      }).join('') + '</div></div>' +
      '<p class="tm-module-inspector__note">Tickers identify participants only. No live price or ' +
      'investment recommendation is implied.</p></div></div>', true, 'closeModule');
  }

  function helpDrawer() {
    if (!state.helpOpen) return '';
    return overlay('How the Time Machine works',
      '<div class="tm-how">' +
      '<div><span>01</span><h3>Arrive</h3><p>A real historical date becomes the hard information cutoff.</p></div>' +
      '<div><span>02</span><h3>Inspect</h3><p>Read the signal, physical implication and critical unknown.</p></div>' +
      '<div><span>03</span><h3>Choose</h3><p>Back one of three distinct theses using fictional capital.</p></div>' +
      '<div><span>04</span><h3>Jump</h3><p>Open the later evidence and see which delivery gate moved.</p></div>' +
      '</div><div class="tm-method-note">' + icon('evidence', 22) +
      '<p><b>Truth before drama.</b> The game shows sourced evidence and physical mechanisms. ' +
      'Financial performance appears only when a reviewed data source is attached.</p></div>' +
      '<p class="tm-legal">Historical simulation using fictional allocations. Educational ' +
      'only&mdash;not investment advice. Past performance does not predict future results.</p>',
      false, 'closeHelp');
  }

  var SCREENS = {
    title: screenTitle, campaigns: screenCampaigns, factory: screenFactory,
    prologue: screenPrologue, briefing: screenBriefing,
    decision: screenDecision, confirm: screenDecision,
    vault: screenVault, jump: screenJump, outcome: screenOutcome,
    debrief: screenDebrief, 'chapter-complete': screenChapterComplete, recap: screenRecap
  };

  function render() {
    /* Guard: a saved state pointing at a campaign that no longer exists must not
       throw. It falls back to the campaign list rather than a blank page. */
    var needsCampaign = ['prologue', 'briefing', 'decision', 'confirm', 'vault', 'jump',
      'outcome', 'debrief', 'chapter-complete', 'recap'];
    if (needsCampaign.indexOf(state.screen) !== -1 && (!activeCampaign() || !activeEvent())) {
      state.screen = 'campaigns';
    }
    if (['outcome', 'debrief', 'vault'].indexOf(state.screen) !== -1 && !selectedChoice()) {
      state.screen = 'briefing';
    }

    /* innerHTML detaches the arc; drop the handle so drawArc rebuilds it rather
       than writing into a node that is no longer in the document. */
    arc = null;

    /* A new chapter gets its objects back at rest. Choice ids repeat across
       chapters, so without this a rotation dragged in chapter 3 would reappear
       on an unrelated thesis in chapter 4. */
    var evNow = activeEvent();
    var idNow = evNow ? evNow.id : null;
    if (idNow !== lastEventId) {
      lastEventId = idNow;
      state.coreRotations = {};
      state.objectRotation = { x: -5, y: -12 };
    }

    root.className = 't2c-time-machine tm-app tm-screen--' + state.screen;
    root.innerHTML =
      '<div class="tm-noise" aria-hidden="true"></div>' +
      header() +
      (SCREENS[state.screen] || screenTitle)() +
      '<div class="tm-live" aria-live="polite">' + esc(state.liveMessage) + '</div>' +
      evidenceDrawer() + moduleDrawer() + helpDrawer();

    var h = root.querySelector('[data-heading]');
    if (h && state.screen !== 'title') { try { h.focus({ preventScroll: true }); } catch (err) { h.focus(); } }

    /* A screen change starts at the top of the screen.
       The game lives inside the ordinary site page rather than its own viewport,
       so the window keeps whatever scroll the previous screen was left at —
       scroll to the bottom of a briefing, click through, and the next screen
       opens halfway down with its heading offscreen. Only on a genuine screen
       change: re-rendering to select a thesis must not yank the page. */
    if (state.screen !== lastScreen) {
      lastScreen = state.screen;
      /* Instant, not smooth: this is a cut to a new screen, not a scroll within
         one, and an in-flight smooth scroll moves every control out from under
         a player who clicks during it.

         The site's app bar is sticky at z-index 90, so landing exactly on the
         top of #tmRoot puts the game's own header — brand, help, sound, exit —
         underneath it and out of reach. Stopping one bar-height short is what
         keeps the game a page on this site rather than a page fighting it. */
      var bar = document.querySelector('.appbar');
      var inset = bar && getComputedStyle(bar).position === 'sticky'
        ? bar.getBoundingClientRect().height : 0;
      var top = root.getBoundingClientRect().top + window.pageYOffset - inset;
      if (window.pageYOffset > top) window.scrollTo(0, Math.max(0, top));
    }

    var sheet = root.querySelector('[data-sheet]');
    if (sheet) {
      var f = sheet.querySelector('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (f) f.focus();
    }

    if (state.screen === 'jump') startJump();
  }

  function startJump() {
    if (jumpTimer) clearTimeout(jumpTimer);
    playCue('jump');
    jumpTimer = setTimeout(function () {
      jumpTimer = null;
      go('outcome', 'The time jump is complete. The historical window is now revealed.');
      playCue('reveal');
    }, reducedMotion() ? 180 : 1350);
  }

  /* --------------------------------------------------------------- events -- */

  var ACTIONS = {
    campaigns: function () {
      state.evidenceOpen = false; state.helpOpen = false;
      state.factoryModuleId = null; state.shareStatus = '';
      go('campaigns');
    },
    factory: function () {
      state.evidenceOpen = false; state.helpOpen = false; state.shareStatus = '';
      go('factory');
    },
    help: function () { state.helpOpen = true; render(); },
    closeHelp: function () { state.helpOpen = false; render(); },
    evidence: openEvidence,
    closeEvidence: function () { state.evidenceOpen = false; render(); },
    closeModule: function () { state.factoryModuleId = null; render(); },
    resume: resumeLast,
    sound: toggleSound,
    begin: startFreshCampaign,
    decide: function () {
      var e = activeEvent(), c = activeCampaign();
      if (!e || !c) return go('campaigns');
      var prog = progressFor(c);
      /* A sealed live signal reopens its vault rather than inviting a second,
         different decision — the seal is the point. */
      if (isLiveSignal() && prog && prog.sealed.indexOf(e.id) !== -1) {
        state.selectedChoiceId = prog.choices[e.id] || null;
        state.selectedConfidence = prog.confidence[e.id] || 65;
        return go('vault');
      }
      state.selectedChoiceId = (prog && prog.choices[e.id]) || state.selectedChoiceId || null;
      if (prog && prog.confidence[e.id]) state.selectedConfidence = prog.confidence[e.id];
      go('decision');
    },
    review: function () { if (state.selectedChoiceId) go('confirm'); },
    lock: lockChoice,
    skip: skipJump,
    debrief: function () { go('debrief'); },
    complete: completeChapter,
    next: continueAfterChapter,
    replay: replayCampaign,
    share: shareDecision
  };

  /* -------------------------------------------------------------- gestures -- */

  /**
   * Drag to rotate, click to spin — for both the briefing object and each
   * thesis core.
   *
   * A drag that moved must NOT also register as a click, or inspecting a thesis
   * would silently select it. `moved` is tracked past a 4px threshold and the
   * following click is swallowed, which is the same guard the reference uses.
   */
  var drag = null;
  var suppressClick = null;

  function applyRotation(el, x, y) {
    el.style.setProperty('--core-rx', x + 'deg');
    el.style.setProperty('--core-ry', y + 'deg');
    el.style.setProperty('--object-rx', x + 'deg');
    el.style.setProperty('--object-ry', y + 'deg');
  }

  root.addEventListener('pointerdown', function (ev) {
    var core = ev.target.closest && ev.target.closest('[data-core]');
    var obj = ev.target.closest && ev.target.closest('[data-object-inspector]');
    var host = core || obj;
    if (!host) return;
    var rotator = host.querySelector('[data-core-rotator],[data-object-rotator]');
    if (!rotator) return;
    var id = core ? core.getAttribute('data-core') : '__object';
    var base = core ? (state.coreRotations[id] || { x: -8, y: -16 }) : state.objectRotation;
    try { host.setPointerCapture(ev.pointerId); } catch (e) {}
    drag = {
      id: id, pointerId: ev.pointerId, host: host, rotator: rotator,
      startX: ev.clientX, startY: ev.clientY,
      baseX: base.x, baseY: base.y, moved: false,
      // The object tolerates a wider tilt and turns slower; the reference tuned
      // both numbers per element and they read differently at those values.
      tilt: core ? 55 : 58, sx: core ? 0.42 : 0.32, sy: core ? 0.55 : 0.48
    };
  });

  root.addEventListener('pointermove', function (ev) {
    if (!drag || drag.pointerId !== ev.pointerId) return;
    var dx = ev.clientX - drag.startX, dy = ev.clientY - drag.startY;
    if (Math.sqrt(dx * dx + dy * dy) > 4) drag.moved = true;
    var x = Math.max(-drag.tilt, Math.min(drag.tilt, drag.baseX - dy * drag.sx));
    var y = drag.baseY + dx * drag.sy;
    if (drag.id === '__object') state.objectRotation = { x: x, y: y };
    else state.coreRotations[drag.id] = { x: x, y: y };
    applyRotation(drag.rotator, x, y);
  });

  function endDrag(ev) {
    if (!drag || drag.pointerId !== ev.pointerId) return;
    suppressClick = drag.moved ? drag.id : null;
    try {
      if (drag.host.hasPointerCapture(ev.pointerId)) drag.host.releasePointerCapture(ev.pointerId);
    } catch (e) {}
    drag = null;
  }
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);

  /**
   * The electric arc that follows the pointer off a hovered thesis.
   *
   * Decorative, rAF-throttled, and mouse-only: on touch there is no hover to
   * anchor it to, and a jitter path redrawn on every touchmove would cost more
   * than it shows.
   */
  var arc = null, arcFrame = null, arcPoint = null;

  function electricPath(f, seed) {
    var dx = f.endX - f.startX, dy = f.endY - f.startY;
    var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    var nx = -dy / len, ny = dx / len;
    var pts = [];
    for (var i = 0; i <= 10; i++) {
      var t = i / 10;
      var fade = Math.sin(Math.PI * t);
      var j = Math.sin((i + 1) * (seed * 1.71 + 1.9)) * Math.min(17, len * 0.16) * fade;
      pts.push((f.startX + dx * t + nx * j) + ',' + (f.startY + dy * t + ny * j));
    }
    return 'M ' + pts.join(' L ');
  }

  function clearArc() {
    if (arc) { arc.remove(); arc = null; }
  }

  function drawArc(f) {
    if (!arc) {
      arc = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arc.setAttribute('class', 'tm-choice-electric');
      arc.setAttribute('aria-hidden', 'true');
      arc.innerHTML = '<path class="tm-choice-electric__glow"></path><path></path><path></path>' +
        '<circle class="tm-choice-electric__source" r="3"></circle><circle r="4"></circle>';
      root.appendChild(arc);
    }
    var paths = arc.querySelectorAll('path'), circles = arc.querySelectorAll('circle');
    for (var i = 0; i < 3; i++) paths[i].setAttribute('d', electricPath(f, i + 1));
    circles[0].setAttribute('cx', f.startX); circles[0].setAttribute('cy', f.startY);
    circles[1].setAttribute('cx', f.endX); circles[1].setAttribute('cy', f.endY);
  }

  root.addEventListener('pointermove', function (ev) {
    if (reducedMotion()) return;
    arcPoint = { x: ev.clientX, y: ev.clientY, type: ev.pointerType, target: ev.target };
    if (arcFrame !== null) return;
    arcFrame = requestAnimationFrame(function () {
      arcFrame = null;
      var p = arcPoint;
      var visual = p && p.target.closest && p.target.closest('.tm-choice-visual');
      if (!p || p.type === 'touch' || !visual) return clearArc();
      var r = visual.getBoundingClientRect();
      drawArc({
        startX: r.left + r.width * 0.5, startY: r.top + r.height * 0.48,
        endX: p.x, endY: p.y
      });
    });
  });
  root.addEventListener('pointerleave', clearArc);

  /** Restart a CSS animation the way React's `key` prop does: replace the node. */
  function replayAnimation(el, cls) {
    if (!el || reducedMotion()) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  root.addEventListener('click', function (ev) {
    /* A drag that moved must not also count as a click — inspecting a thesis
       would otherwise select it, which is exactly the mistake a 3D affordance
       on a radio button invites. */
    if (suppressClick !== null) {
      var moved = suppressClick;
      suppressClick = null;
      var owner = ev.target.closest && ev.target.closest('[data-core],[data-object-inspector]');
      if (owner && (moved === '__object' || owner.getAttribute('data-core') === moved)) {
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
    }

    var inspector = ev.target.closest && ev.target.closest('[data-object-inspector]');
    if (inspector) {
      replayAnimation(inspector.querySelector('[data-object-asset]'), 'is-spinning');
      playCue('select');
      return;
    }

    var el = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!el || !root.contains(el)) return;
    var act = el.getAttribute('data-act');

    // The overlay backdrop carries data-act too; ignore clicks inside the sheet.
    if (el.classList.contains('tm-overlay') && ev.target !== el) return;

    if (act === 'open') {
      var id = el.getAttribute('data-id');
      var c = campaigns.filter(function (x) { return x.id === id; })[0];
      if (c) openCampaign(c);
      return;
    }
    if (act === 'pick') {
      state.selectedChoiceId = el.getAttribute('data-id');
      playCue('select');
      return render();
    }
    if (act === 'confidence') {
      state.selectedConfidence = Number(el.getAttribute('data-id'));
      return render();
    }
    if (act === 'module') {
      state.factoryModuleId = el.getAttribute('data-id');
      playCue('online');
      return render();
    }
    if (ACTIONS[act]) ACTIONS[act]();
  });

  /* Escape closes a dialog; Tab is trapped inside it. Both come from the
     reference Overlay component and are the reason a keyboard user cannot fall
     out of a modal into the page behind it. */
  /* The object is focusable, so it must be operable from the keyboard too —
     a mouse-only affordance is not an affordance. */
  root.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var inspector = ev.target.closest && ev.target.closest('[data-object-inspector]');
    if (!inspector) return;
    ev.preventDefault();
    replayAnimation(inspector.querySelector('[data-object-asset]'), 'is-spinning');
    playCue('select');
  });

  document.addEventListener('keydown', function (ev) {
    var sheet = root.querySelector('[data-sheet]');
    if (!sheet) return;
    if (ev.key === 'Escape') {
      ev.preventDefault();
      if (state.screen === 'confirm') return go('decision');
      state.evidenceOpen = false; state.helpOpen = false; state.factoryModuleId = null;
      return render();
    }
    if (ev.key !== 'Tab') return;
    var items = Array.prototype.slice.call(sheet.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(function (n) { return !n.hasAttribute('disabled'); });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });

  render();
})();
