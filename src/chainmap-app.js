/**
 * Chain Mapping — client behaviour.
 *
 * The map itself is server-rendered and works without this file: five columns,
 * every node, the list view and the timeline are all in the document. What this
 * adds is the research workspace — switching architecture, tracing, filtering,
 * opening evidence, keyboard navigation, zoom and one-shot path playback.
 *
 * Three rules from the pack are load-bearing rather than cosmetic:
 *
 *   1. FILTERED CONTEXT STAYS READABLE. A node outside the current filter drops
 *      to ~60% prominence, never to near-invisible. The reader must still be
 *      able to see what they filtered out.
 *   2. FOCUS RETURNS. Closing the drawer puts focus back on the node that opened
 *      it. Without that, a keyboard user is dumped at the top of the document
 *      every time they read a source.
 *   3. NOTHING ANIMATES FOREVER. Playback runs once and stops. There is no
 *      ambient motion on this canvas at all.
 */
(function () {
  'use strict';

  var page = document.querySelector('.cm-page');
  if (!page) return;

  var CFG = (function () {
    var el = document.getElementById('t2c-config');
    try { return (JSON.parse(el.textContent) || {}).chainMapping || null; } catch (e) { return null; }
  })();
  if (!CFG) return;

  var $ = function (id) { return document.getElementById(id); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var track = window.t2cTrack || function () {};

  var state = {
    architecture: 'deployed',
    trace: 'product',
    pillar: null,
    inferred: true,
    selected: null,
    listView: false,
    zoom: 1
  };
  var lastFocus = null;
  var playTimer = null;

  function reduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function say(msg) { var l = activeLive(); if (l) l.textContent = msg; }
  function activeMode() { return document.querySelector('.cm-mode[data-mode="' + state.architecture + '"]'); }
  function activeLive() { var m = activeMode(); return m ? m.querySelector('.cm-live') : null; }
  function inMode(sel) { var m = activeMode(); return m ? m.querySelector(sel) : null; }
  function visibleNodes() {
    var m = activeMode();
    return m ? qsa('.cm-node', m).filter(function (n) { return !n.hidden && n.offsetParent !== null; }) : [];
  }

  /* ---------------------------------------------------------- URL state -- */

  function readUrl() {
    var p = new URLSearchParams(location.search);
    var a = p.get('architecture');
    if (a === 'deployed' || a === 'next') state.architecture = a;
    var t = p.get('trace');
    if (t && document.querySelector('[data-trace="' + t + '"]')) state.trace = t;
    var pl = p.get('pillar');
    if (pl && document.querySelector('[data-pillar="' + pl + '"]:not([disabled])')) state.pillar = pl;
    if (p.get('inferred') === '0') state.inferred = false;
    if (p.get('view') === 'list') state.listView = true;
  }
  function writeUrl() {
    var p = new URLSearchParams(location.search);
    p.set('architecture', state.architecture);
    if (state.trace !== 'product') p.set('trace', state.trace); else p.delete('trace');
    if (state.pillar) p.set('pillar', state.pillar); else p.delete('pillar');
    if (!state.inferred) p.set('inferred', '0'); else p.delete('inferred');
    if (state.listView) p.set('view', 'list'); else p.delete('view');
    var q = p.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  }

  /* ------------------------------------------------------ architecture -- */

  function applyArchitecture() {
    qsa('.cm-mode').forEach(function (m) {
      m.hidden = m.getAttribute('data-mode') !== state.architecture;
    });
    qsa('.cm-segbtn').forEach(function (b) {
      var on = b.getAttribute('data-arch') === state.architecture;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-on', on);
    });
    page.setAttribute('data-architecture', state.architecture);

    var meta = (CFG.architectures || []).filter(function (a) { return a.id === state.architecture; })[0];
    var sum = $('cmArchSummary');
    if (sum && meta) sum.textContent = meta.summary;

    qsa('.cm-ladderrow').forEach(function (r) {
      r.classList.toggle('is-current', r.getAttribute('data-mode') === state.architecture);
    });

    /* A selection that does not exist in the new mode moves to its declared
       successor rather than vanishing — the interconnect node is the whole
       point of the toggle, so losing it on every switch would be perverse. */
    if (state.selected) {
      var ids = (CFG.modes || {})[state.architecture] || [];
      if (ids.indexOf(state.selected) === -1) {
        var succ = (CFG.successors || {})[state.selected];
        if (succ && ids.indexOf(succ) !== -1) {
          state.selected = succ;
          openDrawer(succ, { focus: false });
          say('This node is replaced in ' + state.architecture + ' architecture. Showing its successor.');
        } else {
          closeDrawer({ restore: false });
          say('The selected node does not exist in this architecture. Selection cleared.');
        }
      }
    }
  }

  /* ------------------------------------------------------------ filters -- */

  function applyFilters() {
    var m = activeMode();
    if (!m) return;
    var shown = 0, dimmed = 0;

    qsa('.cm-node', m).forEach(function (n) {
      var okPillar = !state.pillar || n.getAttribute('data-pillar') === state.pillar;
      /* Trace modes emphasise; they do not remove. Bottleneck highlights the
         nodes whose evidence is weakest, which is where delivery actually
         stalls, rather than hiding everything else. */
      var okTrace = true;
      if (state.trace === 'bottleneck') {
        okTrace = ['ecosystem', 'inferred', 'unknown'].indexOf(n.getAttribute('data-rel')) !== -1;
      } else if (state.trace === 'company') {
        okTrace = !!n.querySelector('.cm-node__org');
      } else if (state.trace === 'project') {
        okTrace = n.getAttribute('data-column') === 'infrastructure' ||
          n.getAttribute('data-column') === 'monetisation';
      }
      var inFilter = okPillar && okTrace;
      n.classList.toggle('is-context', !inFilter);
      if (inFilter) shown++; else dimmed++;
    });

    qsa('.cm-trace').forEach(function (b) {
      var on = b.getAttribute('data-trace') === state.trace;
      b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-on', on);
    });
    qsa('.cm-pillar').forEach(function (b) {
      var on = b.getAttribute('data-pillar') === state.pillar;
      b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-on', on);
    });
    var inf = $('cmInferred');
    if (inf) inf.checked = state.inferred;
    m.classList.toggle('hide-inferred', !state.inferred);

    say(shown + ' node' + (shown === 1 ? '' : 's') + ' match' + (shown === 1 ? 'es' : '') +
      ' the current trace and filters' + (dimmed ? ', ' + dimmed + ' shown as context' : '') + '.');
    writeUrl();
  }

  /* ------------------------------------------------------------- drawer -- */

  function drawerHtml(n) {
    var h = '';
    h += '<p class="cm-dsimple">' + esc(n.simple || '') + '</p>';
    h += '<section class="cm-dsec"><h3>What is this?</h3><p>' + esc(n.technical) + '</p>';
    if (n.explainerHref) {
      h += '<a class="cm-dlink press" href="' + esc(n.explainerHref) + '" data-explainer="1">' +
        'Open the full explainer <span aria-hidden="true">&rarr;</span></a>';
    }
    h += '</section>';

    h += '<section class="cm-dsec"><h3>Why it matters</h3><p>' + esc(n.why) + '</p></section>';

    if (n.inputs || n.outputs) {
      h += '<section class="cm-dsec"><h3>Inputs and outputs</h3><dl class="cm-dio">';
      if (n.inputs) h += '<div><dt>Takes in</dt><dd>' + esc(n.inputs) + '</dd></div>';
      if (n.outputs) h += '<div><dt>Produces</dt><dd>' + esc(n.outputs) + '</dd></div>';
      h += '</dl></section>';
    }

    /* Three separate axes, never merged into one badge. */
    h += '<section class="cm-dsec"><h3>Classification</h3><dl class="cm-daxes">' +
      '<div><dt>Relationship</dt><dd><span class="cm-tag" data-rel="' + esc(n.relationship) + '">' +
        esc(n.relationshipLabel) + '</span><small>' + esc(n.relationshipDef) + '</small></dd></div>' +
      '<div><dt>Evidence</dt><dd>' + esc(n.confidenceLabel) + '</dd></div>' +
      '<div><dt>Maturity</dt><dd>' + esc(n.maturityLabel) + '</dd></div>' +
      '<div><dt>Commercial stage</dt><dd>' +
        (n.stage ? esc(n.stage.label) + '<small>' + esc(n.stage.notYet) + '</small>'
          : '<span class="cm-none">None on record</span><small>Nothing here supports a commercial ' +
            'stage. It is not inferred from what the company makes.</small>') +
      '</dd></div></dl></section>';

    if (n.contractedMw != null) {
      h += '<section class="cm-dsec"><h3>Contracted from tracked operators</h3>' +
        '<p class="cm-dfig">' + esc(String(n.contractedMw)) + ' MW</p></section>';
    }
    if (n.withheld && n.withheld.length) {
      h += '<section class="cm-dsec"><h3>What the operators disclosed</h3><ul class="cm-dlist">' +
        n.withheld.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') +
        '</ul><p class="cm-dnote">T2C does not guess which hyperscaler is meant.</p></section>';
    }

    if (n.suppliers && n.suppliers.length) {
      h += '<section class="cm-dsec"><h3>Who makes it</h3><ul class="cm-dsup">' +
        n.suppliers.map(function (s) {
          return '<li><span class="cm-dsupname">' + esc(s.company) +
            (s.ticker ? ' <em>' + esc(s.exchange) + ': ' + esc(s.ticker) + '</em>' : '') + '</span>' +
            '<span class="cm-dsuprole">' + esc(s.role) + '</span>' +
            '<span class="cm-dsupgrade" data-confirmed="' + !!s.confirmed + '">' + esc(s.grade) + '</span>' +
            '<span class="cm-dsupev">' + esc(s.evidence) + '</span>' +
            (s.counterparty ? '<span class="cm-dsupparty">Counterparty: ' + esc(s.counterparty) + '</span>' : '') +
            '<span class="cm-dsupasof">As of ' + esc(s.asOf) + '</span></li>';
        }).join('') + '</ul></section>';
    }

    var srcs = n.sources || [];
    h += '<section class="cm-dsec"><h3>Evidence</h3>';
    if (!srcs.length) {
      h += '<p class="cm-dnote">No document sits behind this node. It is editorial structure — how ' +
        'the thing is built — rather than a sourced claim about anybody.</p>';
    } else {
      h += '<ul class="cm-dsrc">' + srcs.map(function (s) {
        return '<li><a class="press" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" ' +
          'data-source="1">' + esc(s.title) + ' <span aria-hidden="true">&#8599;</span></a>' +
          '<span class="cm-dsrcmeta">' + esc(s.publisher) + ' &middot; ' + esc(s.publishedAt) +
          ' &middot; ' + (s.primary ? 'Primary' : 'Secondary') + '</span>' +
          (s.excerpt ? '<span class="cm-dsrcex">' + esc(s.excerpt) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    }
    if (n.asOf) h += '<p class="cm-dasof">Record as of ' + esc(n.asOf) + '</p>';
    h += '</section>';
    return h;
  }

  function openDrawer(id, opts) {
    var n = (CFG.nodes || {})[id];
    if (!n) return;
    opts = opts || {};
    var drawer = $('cmDrawer');
    if (!drawer) return;

    if (opts.focus !== false) {
      lastFocus = document.querySelector('.cm-node[data-node="' + id + '"]') || document.activeElement;
    }
    state.selected = id;

    $('cmDrawerKicker').textContent = (n.column || '').toUpperCase();
    $('cm-drawer-h').textContent = n.title;
    $('cmDrawerOrg').textContent = n.org || '';
    $('cmDrawerBody').innerHTML = drawerHtml(n);
    drawer.hidden = false;
    page.classList.add('is-drawer-open');

    qsa('.cm-node').forEach(function (b) {
      b.classList.toggle('is-selected', b.getAttribute('data-node') === id);
      b.setAttribute('aria-pressed', String(b.getAttribute('data-node') === id));
    });

    if (opts.focus !== false) $('cm-drawer-h').focus();
    track('chain_mapping_node_opened', { node: id, architecture: state.architecture });
  }

  function closeDrawer(opts) {
    opts = opts || {};
    var drawer = $('cmDrawer');
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    page.classList.remove('is-drawer-open');
    qsa('.cm-node').forEach(function (b) {
      b.classList.remove('is-selected'); b.setAttribute('aria-pressed', 'false');
    });
    state.selected = null;
    // Focus returns to the node that opened it, not to the top of the document.
    if (opts.restore !== false && lastFocus && document.contains(lastFocus)) lastFocus.focus();
    lastFocus = null;
  }

  /* --------------------------------------------------------------- zoom -- */

  function applyZoom() {
    qsa('.cm-zoomwrap').forEach(function (z) {
      z.style.setProperty('--cm-zoom', String(state.zoom));
    });
  }

  /* ----------------------------------------------------------- playback -- */

  function stopPlay() {
    if (playTimer) { clearTimeout(playTimer); playTimer = null; }
    qsa('.cm-stage').forEach(function (s) { s.classList.remove('is-playing'); });
    var b = $('cmPlay');
    if (b) { b.setAttribute('aria-pressed', 'false'); }
    var l = $('cmPlayLabel');
    if (l) l.textContent = 'Follow this chain';
  }

  function play() {
    var steps = qsa('.cm-stage');
    if (!steps.length) return;
    var i = 0;
    var b = $('cmPlay');
    if (b) b.setAttribute('aria-pressed', 'true');
    var l = $('cmPlayLabel');
    if (l) l.textContent = 'Stop';
    track('chain_mapping_timeline_played', {});

    var step = function () {
      steps.forEach(function (s) { s.classList.remove('is-playing'); });
      if (i >= steps.length) { stopPlay(); say('Playback finished at recognised revenue.'); return; }
      var s = steps[i];
      s.classList.add('is-playing');
      var label = s.querySelector('.cm-stagelabel');
      var count = s.querySelector('.cm-stagecount');
      say('Stage ' + (i + 1) + ' of ' + steps.length + ': ' +
        (label ? label.textContent : '') + '. ' + (count ? count.textContent : ''));
      i++;
      // Runs once through and stops. Never loops.
      playTimer = setTimeout(step, reduced() ? 220 : 620);
    };
    step();
  }

  /* --------------------------------------------------------------- wire -- */

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;

    var arch = e.target.closest('.cm-segbtn');
    if (arch) {
      state.architecture = arch.getAttribute('data-arch');
      applyArchitecture(); applyFilters(); applyZoom();
      track('chain_mapping_architecture_changed', { architecture: state.architecture });
      return;
    }

    var tr = e.target.closest('.cm-trace');
    if (tr) {
      state.trace = tr.getAttribute('data-trace');
      applyFilters();
      track('chain_mapping_trace_mode_changed', { mode: state.trace });
      return;
    }

    var pl = e.target.closest('.cm-pillar');
    if (pl && !pl.disabled) {
      var v = pl.getAttribute('data-pillar');
      state.pillar = state.pillar === v ? null : v;
      applyFilters();
      track('chain_mapping_filter_changed', { pillar: state.pillar });
      return;
    }

    if (e.target.closest('#cmReset')) {
      state.trace = 'product'; state.pillar = null; state.inferred = true;
      state.zoom = 1; state.listView = false;
      closeDrawer(); applyFilters(); applyZoom(); applyListView();
      say('View reset.');
      return;
    }

    var node = e.target.closest('.cm-node') || e.target.closest('.cm-rowbtn');
    if (node) { openDrawer(node.getAttribute('data-node')); return; }

    if (e.target.closest('#cmDrawerClose')) { closeDrawer(); return; }

    if (e.target.closest('[data-ctl="zoomin"]')) {
      state.zoom = Math.min(1.6, state.zoom + 0.15); applyZoom();
      track('chain_mapping_zoom_changed', { zoom: state.zoom }); return;
    }
    if (e.target.closest('[data-ctl="zoomout"]')) {
      state.zoom = Math.max(0.6, state.zoom - 0.15); applyZoom();
      track('chain_mapping_zoom_changed', { zoom: state.zoom }); return;
    }
    if (e.target.closest('[data-ctl="fit"]')) { state.zoom = 1; applyZoom(); return; }

    if (e.target.closest('[data-ctl="list"]')) {
      state.listView = !state.listView; applyListView();
      if (state.listView) track('chain_mapping_list_view_opened', {});
      return;
    }

    if (e.target.closest('#cmPlay')) {
      if (playTimer) stopPlay(); else play();
      return;
    }
    if (e.target.closest('#cmTlReset')) { stopPlay(); return; }

    if (e.target.closest('[data-source]')) track('chain_mapping_source_opened', {});
    if (e.target.closest('[data-explainer]')) track('chain_mapping_explainer_opened', {});
  });

  function applyListView() {
    qsa('.cm-mode').forEach(function (m) {
      var canvas = m.querySelector('.cm-canvas');
      var list = m.querySelector('.cm-listview');
      if (canvas) canvas.hidden = state.listView;
      if (list) list.hidden = !state.listView;
    });
    qsa('[data-ctl="list"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(state.listView));
      b.setAttribute('aria-label', state.listView ? 'Switch to map view' : 'Switch to list view');
    });
    writeUrl();
  }

  var inf = $('cmInferred');
  if (inf) {
    inf.addEventListener('change', function () {
      state.inferred = inf.checked; applyFilters();
      track('chain_mapping_filter_changed', { inferred: state.inferred });
    });
  }

  var proj = $('cmProject');
  if (proj) {
    proj.addEventListener('change', function () {
      say(proj.value ? 'Showing the whole map. Per-project filtering needs project-level supplier ' +
        'records, which T2C does not yet hold.' : 'Showing all tracked operators.');
      track('chain_mapping_filter_changed', { project: proj.value });
    });
  }

  /* Keyboard: arrows move between visible nodes, Escape closes the drawer. */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('cmDrawer').hidden) { e.preventDefault(); return closeDrawer(); }
    if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].indexOf(e.key) === -1) return;
    var cur = document.activeElement;
    if (!cur || !cur.classList || !cur.classList.contains('cm-node')) return;
    e.preventDefault();

    var nodes = visibleNodes();
    var box = cur.getBoundingClientRect();
    var best = null, bestD = Infinity;
    nodes.forEach(function (n) {
      if (n === cur) return;
      var b = n.getBoundingClientRect();
      var dx = b.left - box.left, dy = b.top - box.top;
      var ok = e.key === 'ArrowRight' ? dx > 8 : e.key === 'ArrowLeft' ? dx < -8
        : e.key === 'ArrowDown' ? dy > 8 : dy < -8;
      if (!ok) return;
      var d = Math.abs(dx) + Math.abs(dy) +
        ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') ? Math.abs(dy) * 2 : Math.abs(dx) * 2);
      if (d < bestD) { bestD = d; best = n; }
    });
    if (best) best.focus();
  });

  readUrl();
  applyArchitecture();
  applyFilters();
  applyZoom();
  applyListView();
  track('chain_mapping_opened', { architecture: state.architecture });
})();
