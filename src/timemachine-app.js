/**
 * AI Time Machine — client state machine.
 *
 * A faithful port of the reference `app/time-machine-game.tsx` to this site's
 * architecture. TimeToCompute has no bundler, no React and `dependencies: {}`;
 * adding a framework to host one page would be the replatform the integration
 * brief rules out. The component was a pure state machine over four JSON files,
 * so the port is mechanical: `useState` becomes one `state` object, the JSX
 * becomes template strings, and `useEffect` becomes explicit calls in `render()`.
 *
 * Everything the reference did, this does: eleven screens, three theses per
 * chapter, immutable knowledge cutoffs, the evidence drawer, irreversible
 * commitment, the time-jump animation, the outcome, the physical chain, later
 * evidence, the debrief, chapter completion, the campaign recap, saved progress,
 * resume, sound, focus trapping, keyboard support and reduced motion.
 *
 * TWO RULES ARE LOAD-BEARING AND ARE NOT STYLE CHOICES:
 *
 *   1. NO FUTURE LEAKAGE. `revealSourceIds` are never rendered before the player
 *      has committed. The evidence drawer shows `briefingSourceIds` only, and
 *      the build separately proves every one of those predates its own cutoff.
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
  var visuals = DATA.visuals;
  var OUTCOMES = DATA.outcomes || {};
  var eventById = {}, sourceById = {}, instrumentById = {};
  DATA.events.forEach(function (e) { eventById[e.id] = e; });
  DATA.sources.forEach(function (s) { sourceById[s.id] = s; });
  DATA.instruments.forEach(function (i) { instrumentById[i.id] = i; });

  var SAVE_KEY = 't2c-ai-time-machine-v1';
  var ASSETS = '/assets/time-machine';
  var AWAITING = 'Market result awaiting verification';

  /* ---------------------------------------------------------------- utils -- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtDate(value) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(value));
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

  /* ----------------------------------------------------------------- save -- */

  function freshProgress(campaign) {
    return {
      chapterIndex: 0, completed: [], choices: {}, evidenceOpened: [],
      appliedEvents: [], capitalUsd: campaign.initialCapitalUsd,
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
      return {
        version: 1,
        lastCampaignId: typeof parsed.lastCampaignId === 'string' ? parsed.lastCampaignId : null,
        soundOn: parsed.soundOn === true,
        campaigns: parsed.campaigns
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
    evidenceOpen: false,
    helpOpen: false,
    save: readSave(),
    liveMessage: ''
  };
  var jumpTimer = null;
  var audioCtx = null;

  function activeCampaign() {
    if (!state.campaignId) return null;
    for (var i = 0; i < campaigns.length; i++) {
      if (campaigns[i].id === state.campaignId) return campaigns[i];
    }
    return null;
  }
  function activeEvent() {
    var c = activeCampaign();
    return c ? (eventById[c.chapterIds[state.chapterIndex]] || null) : null;
  }
  function progressFor(c) {
    return c ? (state.save.campaigns[c.id] || freshProgress(c)) : null;
  }
  function selectedChoice() {
    var e = activeEvent();
    if (!e || !state.selectedChoiceId) return null;
    for (var i = 0; i < e.choices.length; i++) {
      if (e.choices[i].id === state.selectedChoiceId) return e.choices[i];
    }
    return null;
  }
  function patchProgress(id, updater) {
    var campaign = null;
    for (var i = 0; i < campaigns.length; i++) if (campaigns[i].id === id) campaign = campaigns[i];
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
    if (!existing || (!existing.completed.length && existing.chapterIndex === 0)) {
      state.chapterIndex = 0;
      go('prologue');
    } else if (existing.finished) {
      state.chapterIndex = Math.max(0, campaign.chapterIds.length - 1);
      go('recap');
    } else {
      state.chapterIndex = Math.min(existing.chapterIndex, campaign.chapterIds.length - 1);
      go('briefing');
    }
  }

  function startFreshCampaign() {
    var c = activeCampaign(); if (!c) return;
    patchProgress(c.id, function () { return freshProgress(c); });
    state.chapterIndex = 0;
    state.selectedChoiceId = null;
    go('briefing');
  }

  function resumeLast() {
    for (var i = 0; i < campaigns.length; i++) {
      if (campaigns[i].id === state.save.lastCampaignId) return openCampaign(campaigns[i]);
    }
    go('campaigns');
  }

  function openEvidence() {
    var c = activeCampaign(), e = activeEvent();
    if (c && e) {
      patchProgress(c.id, function (cur) {
        var set = cur.evidenceOpened.slice();
        if (set.indexOf(e.id) === -1) set.push(e.id);
        cur.evidenceOpened = set;
        cur.updatedAt = new Date().toISOString();
        return cur;
      });
    }
    state.evidenceOpen = true;
    render();
  }

  /** Irreversible: once locked, the choice is written and the jump begins. */
  function lockChoice() {
    var c = activeCampaign(), e = activeEvent();
    if (!c || !e || !state.selectedChoiceId) return;
    var chosen = state.selectedChoiceId;
    patchProgress(c.id, function (cur) {
      cur.choices[e.id] = chosen;
      cur.updatedAt = new Date().toISOString();
      return cur;
    });
    playCue('lock');
    go('jump');
  }

  function completeChapter() {
    var c = activeCampaign(), e = activeEvent(), ch = selectedChoice();
    if (!c || !e || !ch) return;
    var outcome = verifiedOutcome(e.id, ch.id);
    var isLast = state.chapterIndex === c.chapterIds.length - 1;
    var idx = state.chapterIndex;
    patchProgress(c.id, function (cur) {
      var alreadyApplied = cur.appliedEvents.indexOf(e.id) !== -1;
      /* Capital only moves on a verified outcome. An unverified chapter leaves
         it untouched — never zeroed, never guessed. */
      if (outcome && !alreadyApplied) {
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
    go('briefing');
  }

  function replayCampaign() {
    var c = activeCampaign(); if (!c) return;
    patchProgress(c.id, function () { return freshProgress(c); });
    state.chapterIndex = 0;
    state.selectedChoiceId = null;
    go('prologue');
  }

  function skipJump() {
    if (jumpTimer) { clearTimeout(jumpTimer); jumpTimer = null; }
    go('outcome', 'The time jump is complete. The historical window is now revealed.');
    playCue('reveal');
  }

  function toggleSound() {
    state.save.soundOn = !state.save.soundOn;
    writeSave();
    render();
  }

  /* --------------------------------------------------------------- pieces -- */

  /**
   * The brand lock-up.
   *
   * The reference drew a CSS "T2C" hexagon. This is the real TimeToCompute logo,
   * the same file the site header uses. It already contains the wordmark, so no
   * duplicate text label sits beside it — only the sub-label naming the game.
   */
  function brand(sub, asButton) {
    var img = '<img class="tm-brand__logo" src="/Logo/logo-header.png" ' +
      'width="514" height="120" alt="TimeToCompute" />';
    var label = sub ? '<span class="tm-brand__sub">' + esc(sub) + '</span>' : '';
    if (!asButton) return '<div class="tm-brand tm-brand--static">' + img + label + '</div>';
    return '<button class="tm-brand" type="button" data-act="campaigns" ' +
      'aria-label="Return to campaign selection">' + img + label + '</button>';
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
    return '<section class="tm-title-screen">' +
      '<div class="tm-title-screen__art" aria-hidden="true"></div>' +
      '<div class="tm-title-top">' + brand('AI Time Machine', false) +
      '<button class="tm-text-button" type="button" data-act="help">How it works ' +
      '<span aria-hidden="true">&#8599;</span></button></div>' +
      '<div class="tm-title-copy">' +
      '<span class="tm-kicker tm-kicker--lime">Interactive history &middot; Real evidence</span>' +
      '<h1>The AI<br /><em>Time Machine</em></h1>' +
      '<p>Go back to the moment before the outcome. See only what was public. ' +
      'Choose the physical bottleneck you believe mattered next.</p>' +
      '<div class="tm-title-actions">' +
      '<button class="tm-primary tm-primary--hero" type="button" data-act="campaigns">' +
      'Enter the timeline <span aria-hidden="true">&rarr;</span></button>' +
      (hasSave ? '<button class="tm-resume" type="button" data-act="resume">' +
        icon('time', 18) + ' Resume your last journey</button>' : '') +
      '</div>' +
      '<div class="tm-title-stats" aria-label="Game overview">' +
      '<div><b>05</b><span>Finite campaigns</span></div>' +
      '<div><b>34</b><span>Real turning points</span></div>' +
      '<div><b>03</b><span>Theses each time</span></div></div></div>' +
      '<div class="tm-title-rail" aria-hidden="true"><span class="tm-title-rail__line"></span>' +
      ['2023', '2024', '2025', '2026', '?'].map(function (y, i) {
        return '<span class="' + (i === 4 ? 'is-future' : '') + '"><i></i>' + y + '</span>';
      }).join('') + '</div>' +
      '<p class="tm-disclosure">Historical simulation &middot; Fictional capital &middot; ' +
      'Educational only&mdash;not investment advice</p></section>';
  }

  function screenCampaigns() {
    return '<section class="tm-campaign-select tm-page">' +
      '<div class="tm-section-heading"><div><span class="tm-kicker">Choose a turning point</span>' +
      '<h1 tabindex="-1" data-heading>Where do you enter history?</h1></div>' +
      '<p>Five finite stories. Thirty-four real signals. The future stays hidden until you commit.</p></div>' +
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
          '<img src="' + ASSETS + '/campaigns/' + esc(campaign.id) + '.webp" alt="" ' +
          'width="1672" height="941" loading="' + (index < 2 ? 'eager' : 'lazy') + '" decoding="async" />' +
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

  function screenPrologue() {
    var c = activeCampaign(), vis = visuals[c.id];
    var idx = campaigns.findIndex(function (x) { return x.id === c.id; });
    var first = eventById[c.chapterIds[0]];
    return '<section class="tm-prologue tm-page">' +
      '<img class="tm-prologue__bg" src="' + ASSETS + '/campaigns/' + esc(c.id) + '.webp" alt="" />' +
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
      '<img class="tm-prologue__object" src="' + ASSETS + '/objects/' + esc(vis.object) + '" alt="" /></section>';
  }

  function screenBriefing() {
    var c = activeCampaign(), e = activeEvent(), vis = visuals[c.id];
    var locked = e.truthMode === 'live_prediction';
    var chainIdx = Math.min(vis.chain.length - 1,
      Math.floor((e.chapter - 1) / Math.max(1, c.chapterIds.length - 1) * vis.chain.length));
    return '<section class="tm-stage tm-page">' +
      '<img class="tm-stage__bg" src="' + ASSETS + '/campaigns/' + esc(c.id) + '.webp" alt="" />' +
      '<div class="tm-stage__veil"></div><div class="tm-briefing-layout">' +
      '<div class="tm-briefing-copy">' +
      '<span class="tm-date-chip"><i></i> Knowledge cutoff &middot; ' + esc(fmtDate(e.cutoffAt)) + '</span>' +
      '<span class="tm-kicker">Chapter ' + e.chapter + ' &middot; Breaking signal</span>' +
      '<h1 tabindex="-1" data-heading>' + esc(e.title) + '</h1>' +
      '<p class="tm-lede">' + esc(e.briefing.headline) + '</p>' +
      '<p class="tm-simple"><span>In simple terms</span>' + esc(e.briefing.simpleMeaning) + '</p>' +
      '<div class="tm-briefing-actions">' +
      (locked
        ? '<button class="tm-primary" type="button" data-act="campaigns">Return to campaigns <span aria-hidden="true">&rarr;</span></button>'
        : '<button class="tm-primary" type="button" data-act="decide">Choose your thesis <span aria-hidden="true">&rarr;</span></button>') +
      '<button class="tm-secondary" type="button" data-act="evidence">' +
      icon('evidence', 18) + ' Inspect the evidence</button></div></div>' +
      '<div class="tm-briefing-visual" aria-hidden="true">' +
      '<span class="tm-orbit tm-orbit--one"></span><span class="tm-orbit tm-orbit--two"></span>' +
      '<img src="' + ASSETS + '/objects/' + esc(vis.object) + '" alt="" />' +
      '<span class="tm-object-label">' + esc(vis.chain[chainIdx]) + '</span></div>' +
      '<aside class="tm-clue-stack" aria-label="What was knowable">' +
      '<article><span>01 &middot; Direct fact</span><p>' + esc(e.briefing.directFact) + '</p></article>' +
      '<article><span>02 &middot; Physical meaning</span><p>' + esc(e.briefing.physicalMeaning) + '</p></article>' +
      '<article class="is-unknown"><span>03 &middot; Critical unknown</span><p>' +
      esc(e.briefing.criticalUnknown) + '</p></article></aside></div>' +
      (locked ? '<div class="tm-locked-banner">' + icon('lock', 22) +
        '<div><b>The outcome is still ahead</b><span>This ' + e.windowDays +
        '-day window matures on ' + esc(fmtDate(e.outcomeTargetDate)) +
        ' and stays locked until review.</span></div></div>' : '') +
      timeline(c, e) + '</section>';
  }

  function screenDecision() {
    var c = activeCampaign(), e = activeEvent(), vis = visuals[c.id], prog = progressFor(c);
    var sel = selectedChoice();
    var html = '<section class="tm-decision tm-page">' +
      '<div class="tm-decision__heading"><div>' +
      '<span class="tm-kicker">' + esc(fmtDate(e.cutoffAt)) + ' &middot; Make the call</span>' +
      '<h1 tabindex="-1" data-heading>Where does your thesis go?</h1>' +
      '<p>Reallocate ' + fmtCurrency(prog.capitalUsd) +
      ' of fictional capital. Every choice has a mechanism and a risk.</p></div>' +
      '<button class="tm-secondary" type="button" data-act="evidence">' +
      icon('evidence', 18) + ' Evidence available then</button></div>' +
      '<div class="tm-choice-grid" role="radiogroup" aria-label="Choose one historical thesis">' +
      e.choices.map(function (choice, index) {
        var on = choice.id === state.selectedChoiceId;
        return '<button class="tm-choice-card ' + (on ? 'is-selected' : '') + '" type="button" ' +
          'role="radio" aria-checked="' + on + '" data-act="pick" data-id="' + esc(choice.id) + '">' +
          '<span class="tm-choice-card__number">0' + (index + 1) + '</span>' +
          '<span class="tm-choice-card__check">' + icon('check', 16) + '</span>' +
          '<div class="tm-choice-card__object"><span class="tm-choice-orb tm-choice-orb--' + (index + 1) + '"></span>' +
          '<img src="' + ASSETS + '/objects/' + esc(vis.object) + '" alt="" /></div>' +
          '<span class="tm-choice-card__exposure">' + esc(exposureLabel(choice)) + '</span>' +
          '<h2>' + esc(choice.label) + '</h2>' +
          '<div class="tm-choice-card__detail"><span>Thesis</span><p>' + esc(choice.mechanism) + '</p></div>' +
          '<div class="tm-choice-card__detail is-risk"><span>' + icon('risk', 14) +
          ' Risk</span><p>' + esc(choice.risk) + '</p></div></button>';
      }).join('') + '</div>' +
      '<div class="tm-decision-bar"><div><span>Outcome window</span><b>' + e.windowDays +
      ' calendar days</b></div>' +
      '<button class="tm-primary" type="button" data-act="review"' +
      (state.selectedChoiceId ? '' : ' disabled') + '>' +
      (state.selectedChoiceId ? 'Review choice' : 'Select a thesis') +
      ' <span aria-hidden="true">&rarr;</span></button></div>' +
      timeline(c, e);

    if (state.screen === 'confirm' && sel) {
      html += overlay('Leave this date behind?',
        '<div class="tm-confirm"><span class="tm-confirm__icon">' + icon('lock', 25) + '</span>' +
        '<p>You are backing</p><h3>' + esc(sel.label) + '</h3>' +
        '<b>' + esc(exposureLabel(sel)) + '</b><dl>' +
        '<div><dt>Fictional allocation</dt><dd>' + fmtCurrency(prog.capitalUsd) + '</dd></div>' +
        '<div><dt>Entry rule</dt><dd>Next regular-session adjusted close</dd></div>' +
        '<div><dt>Destination</dt><dd>' + esc(fmtDate(e.outcomeTargetDate)) + '</dd></div></dl>' +
        '<p class="tm-confirm__warning">The next screen reveals information that was ' +
        'unavailable at the cutoff.</p>' +
        '<button class="tm-primary tm-primary--wide" type="button" data-act="lock">' +
        'Lock choice &amp; jump ' + e.windowDays + ' days <span aria-hidden="true">&rarr;</span></button>' +
        '<button class="tm-text-button" type="button" data-act="decide">Change decision</button></div>',
        false, 'decide');
    }
    return html + '</section>';
  }

  function screenJump() {
    var c = activeCampaign(), e = activeEvent();
    return '<section class="tm-jump tm-page" aria-busy="true">' +
      '<img class="tm-jump__bg" src="' + ASSETS + '/campaigns/' + esc(c.id) + '.webp" alt="" />' +
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

    /* FAIL CLOSED. With no verified adjusted-close pair the panel says so and
       shows nothing else — no estimate, no zero, no substituted index. */
    var result = outcome
      ? '<div class="tm-price-result"><span>' + fmtCurrency(prog.capitalUsd) + '</span>' +
        '<i aria-hidden="true">&rarr;</i><strong>' +
        fmtCurrency(prog.capitalUsd * (1 + outcome.returnRatio)) + '</strong>' +
        '<em>' + fmtPercent(outcome.returnRatio) + '</em>' +
        '<small>' + esc(outcome.entrySession) + ' to ' + esc(outcome.exitSession) +
        ' &middot; ' + esc(outcome.provider) + '</small></div>'
      : '<div class="tm-price-pending">' + icon('evidence', 26) +
        '<div><strong>' + AWAITING + '</strong>' +
        '<p>Your decision is preserved. No price has been estimated or invented.</p></div></div>';

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
      '<p class="tm-causality">A subsequent return would not prove that this event caused ' +
      'the price move.</p></article>' +
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
      '<p>Your decision is part of the trail. No points, no streak&mdash;just the evidence you followed.</p>' +
      '<div class="tm-decision-trail">' +
      c.chapterIds.map(function (id, index) {
        return '<span class="' + (index <= state.chapterIndex ? 'is-complete' : '') + '"><i>' +
          (index + 1) + '</i></span>';
      }).join('') + '</div>' +
      '<button class="tm-primary" type="button" data-act="next">' +
      (isLast ? 'Review campaign' : 'Continue to chapter ' + (state.chapterIndex + 2)) +
      ' <span aria-hidden="true">&rarr;</span></button></section>';
  }

  function screenRecap() {
    var c = activeCampaign(), vis = visuals[c.id], prog = progressFor(c);
    return '<section class="tm-recap tm-page">' +
      '<img class="tm-recap__bg" src="' + ASSETS + '/campaigns/' + esc(c.id) + '.webp" alt="" />' +
      '<div class="tm-recap__veil"></div><div class="tm-recap__content">' +
      '<span class="tm-kicker">Campaign record</span>' +
      '<h1 tabindex="-1" data-heading>Your path through<br />' + esc(c.title) + '</h1>' +
      '<p>Not a score. A record of which constraints you noticed, which risks you accepted ' +
      'and what the historical record later showed.</p>' +
      '<div class="tm-recap__stats">' +
      '<div><span>Decisions</span><b>' + prog.completed.length + ' / ' + c.chapterIds.length + '</b></div>' +
      '<div><span>Evidence opened</span><b>' + prog.evidenceOpened.length + '</b></div>' +
      '<div><span>Verified value</span><b>' + fmtCurrency(prog.capitalUsd) +
      '</b><small>Unverified chapters excluded</small></div></div>' +
      '<div class="tm-recap-trail">' +
      c.chapterIds.map(function (id, index) {
        var ev = eventById[id];
        var choiceId = prog.choices[id];
        var choice = null;
        for (var i = 0; i < ev.choices.length; i++) if (ev.choices[i].id === choiceId) choice = ev.choices[i];
        var label = choice ? choice.label
          : (ev.truthMode === 'live_prediction' ? 'Outcome locked' : 'Not played');
        return '<article class="' + (prog.completed.indexOf(id) !== -1 ? 'is-complete' : '') + '">' +
          '<span>' + String(index + 1).padStart(2, '0') + '</span><div><b>' +
          esc(fmtDate(ev.cutoffAt)) + '</b><p>' + esc(label) + '</p></div></article>';
      }).join('') + '</div>' +
      '<div class="tm-recap__actions">' +
      '<button class="tm-primary" type="button" data-act="campaigns">Choose another campaign ' +
      '<span aria-hidden="true">&rarr;</span></button>' +
      '<button class="tm-secondary" type="button" data-act="replay">Replay this campaign</button>' +
      '</div></div>' +
      '<img class="tm-recap__object" src="' + ASSETS + '/objects/' + esc(vis.object) + '" alt="" /></section>';
  }

  /* --------------------------------------------------------------- render -- */

  function header() {
    if (state.screen === 'title') return '';
    var c = activeCampaign(), e = activeEvent();
    var showProgress = c && e && ['campaigns', 'recap'].indexOf(state.screen) === -1;
    return '<header class="tm-header">' + brand('AI Time Machine', true) +
      (showProgress
        ? '<div class="tm-header__progress" aria-label="Chapter ' + e.chapter + ' of ' +
          c.chapterIds.length + '"><span>' + esc(c.title) + '</span><b>' +
          String(e.chapter).padStart(2, '0') + ' / ' +
          String(c.chapterIds.length).padStart(2, '0') + '</b></div>'
        : '') +
      '<div class="tm-header__tools">' +
      '<button class="tm-utility" type="button" data-act="help">' +
      '<span aria-hidden="true">?</span><span class="tm-utility__label">How it works</span></button>' +
      '<button class="tm-utility" type="button" data-act="sound" aria-pressed="' +
      state.save.soundOn + '">' + icon(state.save.soundOn ? 'sound' : 'muted', 17) +
      '<span class="tm-utility__label">' +
      (state.save.soundOn ? 'Sound on' : 'Sound off') + '</span></button>' +
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

  function helpDrawer() {
    if (!state.helpOpen) return '';
    return overlay('How the Time Machine works',
      '<div class="tm-how">' +
      '<div><span>01</span><h3>Arrive</h3><p>A real historical date becomes the hard information cutoff.</p></div>' +
      '<div><span>02</span><h3>Inspect</h3><p>Read the signal, physical implication and critical unknown.</p></div>' +
      '<div><span>03</span><h3>Choose</h3><p>Back one of three distinct theses using fictional capital.</p></div>' +
      '<div><span>04</span><h3>Jump</h3><p>Open the later evidence and see which delivery gate moved.</p></div>' +
      '</div><div class="tm-method-note">' + icon('evidence', 22) +
      '<p><b>Truth before drama.</b> Market results appear only after adjusted prices pass ' +
      'verification. Missing data remains missing&mdash;never zero and never guessed.</p></div>' +
      '<p class="tm-legal">Historical simulation using fictional allocations. Educational ' +
      'only&mdash;not investment advice. Past performance does not predict future results.</p>',
      false, 'closeHelp');
  }

  var SCREENS = {
    title: screenTitle, campaigns: screenCampaigns, prologue: screenPrologue,
    briefing: screenBriefing, decision: screenDecision, confirm: screenDecision,
    jump: screenJump, outcome: screenOutcome, debrief: screenDebrief,
    'chapter-complete': screenChapterComplete, recap: screenRecap
  };

  function render() {
    /* Guard: a saved state pointing at a campaign that no longer exists must not
       throw. It falls back to the campaign list rather than a blank page. */
    var needsCampaign = ['prologue', 'briefing', 'decision', 'confirm', 'jump',
      'outcome', 'debrief', 'chapter-complete', 'recap'];
    if (needsCampaign.indexOf(state.screen) !== -1 && (!activeCampaign() || !activeEvent())) {
      state.screen = 'campaigns';
    }
    if ((state.screen === 'outcome' || state.screen === 'debrief') && !selectedChoice()) {
      state.screen = 'briefing';
    }

    root.className = 't2c-time-machine tm-screen--' + state.screen;
    root.innerHTML =
      '<div class="tm-noise" aria-hidden="true"></div>' +
      header() +
      (SCREENS[state.screen] || screenTitle)() +
      '<div class="tm-live" aria-live="polite">' + esc(state.liveMessage) + '</div>' +
      evidenceDrawer() + helpDrawer();

    // Move focus to the screen heading, as the reference did on every change.
    var h = root.querySelector('[data-heading]');
    if (h && state.screen !== 'title') { try { h.focus({ preventScroll: true }); } catch (err) { h.focus(); } }

    // A dialog takes focus off the heading and traps it.
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
    campaigns: function () { state.evidenceOpen = false; state.helpOpen = false; go('campaigns'); },
    help: function () { state.helpOpen = true; render(); },
    closeHelp: function () { state.helpOpen = false; render(); },
    evidence: openEvidence,
    closeEvidence: function () { state.evidenceOpen = false; render(); },
    resume: resumeLast,
    sound: toggleSound,
    begin: startFreshCampaign,
    decide: function () {
      var e = activeEvent(), c = activeCampaign();
      var prog = progressFor(c);
      state.selectedChoiceId = (prog && prog.choices[e.id]) || state.selectedChoiceId || null;
      go('decision');
    },
    review: function () { if (state.selectedChoiceId) go('confirm'); },
    lock: lockChoice,
    skip: skipJump,
    debrief: function () { go('debrief'); },
    complete: completeChapter,
    next: continueAfterChapter,
    replay: replayCampaign
  };

  root.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!el || !root.contains(el)) return;
    var act = el.getAttribute('data-act');

    // The overlay backdrop carries data-act too; ignore clicks inside the sheet.
    if (el.classList.contains('tm-overlay') && ev.target !== el) return;

    if (act === 'open') {
      var id = el.getAttribute('data-id');
      for (var i = 0; i < campaigns.length; i++) {
        if (campaigns[i].id === id) return openCampaign(campaigns[i]);
      }
      return;
    }
    if (act === 'pick') {
      state.selectedChoiceId = el.getAttribute('data-id');
      playCue('select');
      return render();
    }
    if (ACTIONS[act]) ACTIONS[act]();
  });

  /* Escape closes a dialog; Tab is trapped inside it. Both come from the
     reference Overlay component and are the reason a keyboard user cannot fall
     out of a modal into the page behind it. */
  document.addEventListener('keydown', function (ev) {
    var sheet = root.querySelector('[data-sheet]');
    if (!sheet) return;
    if (ev.key === 'Escape') {
      ev.preventDefault();
      if (state.screen === 'confirm') return go('decision');
      state.evidenceOpen = false; state.helpOpen = false;
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
