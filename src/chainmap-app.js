/**
 * Chain Mapping — client behaviour.
 *
 * The map itself is a server-rendered SVG and works without this file: every
 * node, every link, both architecture modes, the list view and the timeline are
 * all in the document. What this adds is the research workspace — switching
 * architecture, tracing, filtering, opening evidence, keyboard navigation, zoom
 * and one-shot path playback.
 *
 * Four rules are load-bearing rather than cosmetic. Three come from the pack:
 *
 *   1. FILTERED CONTEXT STAYS READABLE. A node outside the current filter drops
 *      to ~60% prominence, never to near-invisible. The reader must still be
 *      able to see what they filtered out.
 *   2. FOCUS RETURNS. Closing the drawer puts focus back on the node that opened
 *      it. Without that, a keyboard user is dumped at the top of the document
 *      every time they read a source.
 *   3. PLAYBACK RUNS ONCE. The timeline steps through and stops; it never loops.
 *      The only continuous motion on the page is the flow dot on each link,
 *      which conveys direction, is toggleable, and is off entirely under
 *      `prefers-reduced-motion`.
 *
 * The fourth is this map's own, and it is what tracing is for:
 *
 *   4. A TRACED PATH SHOWS ITS OWN STRENGTH. Tracing walks the whole dependency
 *      graph, so hovering a silicon wafer really does light the path up to the
 *      operators — that is the point of the map. But the hops are not equal, and
 *      the drawing says so: an evidenced agreement stays solid lime, a
 *      structural dependency stays dashed cyan, and the readout counts them
 *      separately. The reader can follow the whole chain AND see exactly which
 *      links T2C can document. Flattening the two into one style would be the
 *      one change that makes this map dishonest.
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
    flow: true,
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
  /**
   * Nodes the reader can actually reach right now.
   *
   * `offsetParent` is always null on an SVG element, so the HTML test this used
   * to do reported every node as hidden the moment the map became an SVG —
   * silently killing arrow-key navigation. `getClientRects()` is the test that
   * works for both, and it also correctly excludes the hidden architecture mode.
   */
  function visibleNodes() {
    var m = activeMode();
    if (!m) return [];
    return qsa('.cm-hexg', m).filter(function (n) { return n.getClientRects().length > 0; });
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

    qsa('.cm-hexg', m).forEach(function (n) {
      var okPillar = !state.pillar || n.getAttribute('data-pillar') === state.pillar;
      /* Trace modes emphasise; they do not remove. Bottleneck highlights the
         nodes whose evidence is weakest, which is where delivery actually
         stalls, rather than hiding everything else. */
      var okTrace = true;
      if (state.trace === 'bottleneck') {
        okTrace = ['ecosystem', 'inferred', 'unknown'].indexOf(n.getAttribute('data-rel')) !== -1;
      } else if (state.trace === 'company') {
        okTrace = n.getAttribute('data-org') === 'yes';
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

    drawHud();
    say(shown + ' node' + (shown === 1 ? '' : 's') + ' match' + (shown === 1 ? 'es' : '') +
      ' the current trace and filters' + (dimmed ? ', ' + dimmed + ' shown as context' : '') + '.');
    writeUrl();
  }

  /* ------------------------------------------------------------- drawer -- */

  function drawerHtml(n) {
    var h = '';
    /* The tier leads. A reader who opens a reference node must be told what it
       is before they read anything else in the panel, not after — by then they
       have already taken the content as a T2C finding. */
    h += '<p class="cm-dtier" data-tier="' + esc(n.tier) + '"><b>' + esc(n.tierLabel) + '</b>' +
      '<span>' + esc(n.tierNote) + '</span></p>';
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

    /* A reference node lists its example companies and states, in the same
       breath, the three things they are not: exhaustive, ranked, or connected to
       any tracked operator. Listing them without that sentence is how a
       reference panel quietly becomes a supplier claim. */
    if (n.tier === 'reference' && n.examples && n.examples.length) {
      h += '<section class="cm-dsec"><h3>Who operates at this stage</h3>' +
        '<ul class="cm-dexamples">' +
        n.examples.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
        '</ul><p class="cm-dcaveat">Examples, not a complete list and not a ranking. T2C holds no ' +
        'supplier record for this stage, and naming a company here is not a claim that it supplies ' +
        'any operator tracked on this site.</p></section>';
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
      lastFocus = document.querySelector('.cm-hexg[data-node="' + id + '"]') || document.activeElement;
    }
    state.selected = id;

    $('cmDrawerKicker').textContent = (n.column || '').toUpperCase();
    $('cm-drawer-h').textContent = n.title;
    $('cmDrawerOrg').textContent = n.org || '';
    $('cmDrawerBody').innerHTML = drawerHtml(n);
    drawer.hidden = false;
    page.classList.add('is-drawer-open');

    qsa('.cm-hexg').forEach(function (b) {
      b.classList.toggle('is-selected', b.getAttribute('data-node') === id);
      b.setAttribute('aria-pressed', String(b.getAttribute('data-node') === id));
    });

    highlightChain(id);
    if (opts.focus !== false) $('cm-drawer-h').focus();
    track('chain_mapping_node_opened', { node: id, architecture: state.architecture });
  }

  function closeDrawer(opts) {
    opts = opts || {};
    var drawer = $('cmDrawer');
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    page.classList.remove('is-drawer-open');
    qsa('.cm-hexg').forEach(function (b) {
      b.classList.remove('is-selected'); b.setAttribute('aria-pressed', 'false');
    });
    state.selected = null;
    highlightChain(null);
    // Focus returns to the node that opened it, not to the top of the document.
    if (opts.restore !== false && lastFocus && document.contains(lastFocus)) lastFocus.focus();
    lastFocus = null;
  }

  /* -------------------------------------------------------- zoom and pan -- */

  function applyZoom() {
    qsa('.cm-zoomwrap').forEach(function (z) {
      z.style.setProperty('--cm-zoom', String(state.zoom));
    });
    drawHud();
  }

  /**
   * Drag to pan, over the container's own scroll position.
   *
   * The map is a scrolling container rather than a transformed layer, so panning
   * is just `scrollLeft`. That was worth doing properly: native scrolling brings
   * momentum, a scrollbar, keyboard scrolling and trackpad gestures for free,
   * and a hand-rolled transform pan has none of them.
   *
   * Dragging never starts on a node — clicking a node to open its evidence is
   * the primary action here, and a node you cannot click is a node you cannot
   * read.
   */
  function wirePan(wrap) {
    var down = false, sx = 0, sl = 0, moved = false;
    wrap.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.cm-hexg')) return;
      down = true; moved = false;
      sx = e.clientX; sl = wrap.scrollLeft;
      wrap.classList.add('is-dragging');
      try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
    });
    wrap.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 3) moved = true;
      wrap.scrollLeft = sl - dx;
    });
    var end = function () { down = false; wrap.classList.remove('is-dragging'); };
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
    /* A drag that ended on empty canvas closes the drawer; a drag that moved
       does not, or panning away from a node would keep dismissing its evidence. */
    wrap.addEventListener('click', function (e) {
      if (!moved && !e.target.closest('.cm-hexg')) closeDrawer();
    });
  }

  /* ------------------------------------------------------ chain tracing -- */

  /**
   * Light the dependency chain running through one node.
   *
   * Follows only DIRECT edges — the ones where a document names both companies.
   * Structural bands are excluded on purpose: tracing through one would report
   * "this substrate reaches that customer" on the strength of T2C's own framing
   * of how a data centre is built, which is a much stronger claim than any
   * document supports.
   */
  function chainOf(id) {
    var adj = CFG.adjacency || { up: {}, down: {} };
    var seen = {};
    seen[id] = true;
    var walk = function (n, dir) {
      var next = (adj[dir] || {})[n] || [];
      for (var i = 0; i < next.length; i++) {
        if (!seen[next[i]]) { seen[next[i]] = true; walk(next[i], dir); }
      }
    };
    walk(id, 'up'); walk(id, 'down');
    return seen;
  }

  function highlightChain(id) {
    var m = activeMode();
    if (!m) return;
    var chain = id ? chainOf(id) : null;
    qsa('.cm-hexg', m).forEach(function (g) {
      g.classList.toggle('is-inchain', !!chain && !!chain[g.getAttribute('data-node')]);
    });
    qsa('.cm-edge', m).forEach(function (e) {
      var hot = chain && chain[e.getAttribute('data-a')] && chain[e.getAttribute('data-b')];
      e.classList.toggle('is-hot', !!hot);
      e.classList.toggle('is-dim', !!chain && !hot);
    });
  }

  /* ------------------------------------------------------------ readout -- */

  /**
   * The counters under the map.
   *
   * FOUR SEPARATE NUMBERS, and they must stay separate. Nodes T2C holds a record
   * for, nodes drawn from industry structure, links that are named agreements
   * between named companies, and links that are product-class dependencies. A
   * single "links" figure covering the last two would present T2C's framing of
   * how a data centre is built as though it were a signed contract — which is
   * precisely the confusion the whole page is built to prevent.
   */
  function drawHud() {
    var m = activeMode();
    if (!m) return;
    var hud = m.querySelector('[data-hud]');
    if (!hud) return;
    var nodes = qsa('.cm-hexg', m);
    var shown = nodes.filter(function (n) { return !n.classList.contains('is-context'); });
    var evidencedNodes = nodes.filter(function (n) { return n.getAttribute('data-tier') === 'evidenced'; });
    var allEdges = qsa('.cm-edge', m);
    var structural = allEdges.filter(function (e) { return e.classList.contains('is-structural'); });
    var evidencedEdges = allEdges.length - structural.length;
    var single = nodes.filter(function (n) { return n.getAttribute('data-single') === 'true'; }).length;
    hud.innerHTML =
      '<span class="cm-hudchip"><b>' + shown.length + '</b> of ' + nodes.length + ' nodes</span>' +
      '<span class="cm-hudchip is-brand"><b>' + evidencedNodes.length + '</b> with a T2C record</span>' +
      '<span class="cm-hudchip is-brand"><b>' + evidencedEdges + '</b> evidenced ' +
        (evidencedEdges === 1 ? 'agreement' : 'agreements') + '</span>' +
      '<span class="cm-hudchip is-cyan"><b>' + structural.length + '</b> structural ' +
        (structural.length === 1 ? 'dependency' : 'dependencies') + '</span>' +
      '<span class="cm-hudchip is-warn"><b>' + single + '</b> single maker on file</span>' +
      '<span class="cm-hudchip"><b>' + Math.round(state.zoom * 100) + '%</b> zoom</span>';
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
      state.zoom = 1; state.listView = false; state.flow = !reduced();
      closeDrawer(); highlightChain(null); applyFilters(); applyZoom(); applyListView();
      if (flow) flow.checked = state.flow;
      applyFlow();
      say('View reset.');
      return;
    }

    var node = e.target.closest('.cm-hexg') || e.target.closest('.cm-rowbtn');
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
    if (e.target.closest('[data-ctl="fit"]')) {
      state.zoom = 1; applyZoom();
      qsa('.cm-zoomwrap').forEach(function (z) { z.scrollLeft = 0; });
      return;
    }

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

  /**
   * Hovering a node previews its chain; selecting one holds it.
   *
   * Hover never overrides a selection — a reader who opened a node's evidence
   * and then moved the pointer across the map would otherwise watch the
   * highlight they were reading slide away underneath them.
   */
  function wireHover() {
    document.addEventListener('pointerover', function (e) {
      var g = e.target.closest && e.target.closest('.cm-hexg');
      if (!g || state.selected) return;
      highlightChain(g.getAttribute('data-node'));
    });
    document.addEventListener('pointerout', function (e) {
      var g = e.target.closest && e.target.closest('.cm-hexg');
      if (!g || state.selected) return;
      if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.cm-hexg') === g) return;
      highlightChain(null);
    });
    document.addEventListener('focusin', function (e) {
      var g = e.target.closest && e.target.closest('.cm-hexg');
      if (g && !state.selected) highlightChain(g.getAttribute('data-node'));
    });
  }

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

  /**
   * The flow animation, and the one honest thing about switching it off.
   *
   * The dots only ever conveyed direction, which the arrowheads and the drawer
   * already state — so turning them off costs the reader nothing. It defaults on
   * because a static dependency graph reads as a diagram, and a moving one reads
   * as a chain, which is what it is.
   */
  var flow = $('cmFlow');
  function applyFlow() {
    qsa('.cm-mode').forEach(function (m) { m.classList.toggle('hide-flow', !state.flow); });
  }
  if (flow) {
    /* Reduced motion wins over the stored preference — the CSS hides the dots
       regardless, so the control must not claim they are running. */
    if (reduced()) { state.flow = false; flow.checked = false; flow.disabled = true; }
    flow.addEventListener('change', function () {
      state.flow = flow.checked; applyFlow();
      say(state.flow ? 'Flow animation on.' : 'Flow animation off.');
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
    if (!cur || !cur.classList || !cur.classList.contains('cm-hexg')) return;
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

  qsa('.cm-zoomwrap').forEach(wirePan);
  wireHover();

  readUrl();
  applyArchitecture();
  applyFilters();
  applyZoom();
  applyListView();
  applyFlow();
  track('chain_mapping_opened', { architecture: state.architecture });
})();
