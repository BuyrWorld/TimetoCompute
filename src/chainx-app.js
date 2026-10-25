/* Supply-chain explorer: trace a company's chain, open its details, read its news.
   Plain ES5-style, like the rest of the client scripts, and inert without data. */
(function () {
  var D = window.T2C_CHAIN;
  var root = document.querySelector('.cx');
  if (!D || !root) return;

  var byId = {};
  D.companies.forEach(function (c) { byId[c.id] = c; });
  var hint = document.getElementById('cxHint');
  var drawer = document.getElementById('cxDrawer');
  var body = document.getElementById('cxdBody');
  var DEFAULT_HINT = hint ? hint.textContent : '';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /* Walk the links in one direction until nothing new turns up. Upstream is
     "who it depends on", downstream is "who depends on it". */
  var depth = {};
  function walk(start, dir) {
    var seen = {}, queue = [start];
    depth[start] = 0;
    while (queue.length) {
      var id = queue.shift();
      D.links.forEach(function (l) {
        var next = dir === 'up' ? (l.to === id ? l.from : null) : (l.from === id ? l.to : null);
        if (next && !seen[next] && next !== start) { seen[next] = true; depth[next] = depth[id] + 1; queue.push(next); }
      });
    }
    return Object.keys(seen);
  }

  /* ---- the lines a trace draws ----
     Only links a filing discloses, only along the traced chain: upstream
     edges run between the picked company's suppliers, downstream edges
     between its customers. Each line grows from supplier to customer, one
     hop at a time, and a single pulse runs along it to show the direction.
     Then everything is still. Reduced motion draws them instantly. */
  var svg = document.getElementById('cxLines');
  var SVGNS = 'http://www.w3.org/2000/svg';
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var traced = null;
  var STEP = 230, DRAW = 420;

  function anchor(r, side, box) {
    var x = r.left - box.left, y = r.top - box.top;
    return side === 'r' ? [x + r.width, y + r.height / 2] : side === 'l' ? [x, y + r.height / 2]
      : side === 'b' ? [x + r.width / 2, y + r.height] : [x + r.width / 2, y];
  }
  /* A polyline with rounded corners, for routes that run along the gutters. */
  function rounded(pts) {
    var d = 'M' + pts[0];
    for (var i = 1; i < pts.length - 1; i++) {
      var p = pts[i - 1], c = pts[i], n = pts[i + 1];
      var r1 = Math.min(7, Math.hypot(c[0] - p[0], c[1] - p[1]) / 2), r2 = Math.min(7, Math.hypot(n[0] - c[0], n[1] - c[1]) / 2);
      var u1 = [(c[0] - p[0]) / (Math.hypot(c[0] - p[0], c[1] - p[1]) || 1), (c[1] - p[1]) / (Math.hypot(c[0] - p[0], c[1] - p[1]) || 1)];
      var u2 = [(n[0] - c[0]) / (Math.hypot(n[0] - c[0], n[1] - c[1]) || 1), (n[1] - c[1]) / (Math.hypot(n[0] - c[0], n[1] - c[1]) || 1)];
      d += ' L' + [c[0] - u1[0] * r1, c[1] - u1[1] * r1] + ' Q' + c + ' ' + [c[0] + u2[0] * r2, c[1] + u2[1] * r2];
    }
    return d + ' L' + pts[pts.length - 1];
  }

  /* Between rows a line never crosses a card: out of the card's side into
     the gutter beside its stage, along the gap between rows, down the gutter
     beside the target stage, and in. Like a metro map. */
  function route(a, b, box) {
    var ca = a.closest('.cxcol').getBoundingClientRect(), cb = b.closest('.cxcol').getBoundingClientRect();
    var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    var half = parseFloat(getComputedStyle(document.getElementById('cxTrack')).columnGap || 14) / 2;
    var X = function (v) { return v - box.left; }, Y = function (v) { return v - box.top; };
    var right = cb.left + cb.width / 2 >= ca.left + ca.width / 2;
    var gx1 = right ? ca.right + half : ca.left - half;
    var sx = right ? ra.right : ra.left;
    var tRight = ca.left + ca.width / 2 > cb.left + cb.width / 2;      // approach the target from its right?
    var gx2 = tRight ? cb.right + half : cb.left - half;
    var tx = tRight ? rb.right : rb.left;
    var sameRow = Math.abs(cb.top - ca.top) <= 4;
    var down = sameRow || cb.top > ca.top;
    // The gap between the source's row and the next row towards the target;
    // a line within one row dips into the gap below it (or below the chain).
    var tops = [].slice.call(root.querySelectorAll('.cxcol')).map(function (c) { return c.getBoundingClientRect(); });
    var gy;
    if (down) {
      var below = tops.filter(function (r) { return r.top > ca.top + 4; }).map(function (r) { return r.top; });
      gy = below.length ? (ca.bottom + Math.min.apply(null, below)) / 2 : ca.bottom + half + 4;
    } else {
      var prevBottom = Math.max.apply(null, tops.filter(function (r) { return r.bottom < ca.top - 4; }).map(function (r) { return r.bottom; }));
      gy = (ca.top + prevBottom) / 2;
    }
    var sy = ra.top + ra.height / 2, ty = rb.top + rb.height / 2;
    if (!sameRow) gy += right ? 6 : -6;        // keep clear of the bend drawn along the same gap
    return rounded([[X(sx), Y(sy)], [X(gx1), Y(sy)], [X(gx1), Y(gy)], [X(gx2), Y(gy)], [X(gx2), Y(ty)], [X(tx), Y(ty)]]);
  }

  function curve(a, b, box) {
    var ka = a.closest('.cxcol').getBoundingClientRect(), kb = b.closest('.cxcol').getBoundingClientRect();
    // Another row, or a stage skipped in this one: take the gutters. Neighbours join directly.
    if (Math.abs(ka.top - kb.top) > 4 || Math.abs((kb.left + kb.right) - (ka.left + ka.right)) / 2 > ka.width * 1.5) return route(a, b, box);
    var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    var dx = (rb.left + rb.width / 2) - (ra.left + ra.width / 2), dy = (rb.top + rb.height / 2) - (ra.top + ra.height / 2);
    var p, q, k;
    if (Math.abs(dx) < 24) {                       // same column: bow out to the right
      p = anchor(ra, 'r', box); q = anchor(rb, 'r', box); k = 34;
      return 'M' + p + ' C' + (p[0] + k) + ',' + p[1] + ' ' + (q[0] + k) + ',' + q[1] + ' ' + q;
    }
    if (Math.abs(dx) >= Math.abs(dy) * 0.6) {       // across a row
      p = anchor(ra, dx > 0 ? 'r' : 'l', box); q = anchor(rb, dx > 0 ? 'l' : 'r', box);
      k = Math.max(30, Math.abs(q[0] - p[0]) / 2) * (dx > 0 ? 1 : -1);
      return 'M' + p + ' C' + (p[0] + k) + ',' + p[1] + ' ' + (q[0] - k) + ',' + q[1] + ' ' + q;
    }
    p = anchor(ra, dy > 0 ? 'b' : 't', box); q = anchor(rb, dy > 0 ? 't' : 'b', box);
    k = Math.max(30, Math.abs(q[1] - p[1]) / 2) * (dy > 0 ? 1 : -1);
    return 'M' + p + ' C' + p[0] + ',' + (p[1] + k) + ' ' + q[0] + ',' + (q[1] - k) + ' ' + q;
  }
  function edgesFor(id, up, down) {
    var U = {}, W = {};
    up.forEach(function (x) { U[x] = 1; }); down.forEach(function (x) { W[x] = 1; });
    return D.links.filter(function (l) {
      return ((U[l.from]) && (U[l.to] || l.to === id)) || ((W[l.to]) && (W[l.from] || l.from === id));
    }).map(function (l) {
      var isUp = !!U[l.from];
      return { l: l, up: isUp, hop: isUp ? depth[l.from] : depth[l.to] };
    });
  }
  function draw(animate) {
    if (!svg) return;
    svg.innerHTML = '';
    if (!traced || getComputedStyle(svg).display === 'none') return;
    var box = svg.getBoundingClientRect();
    traced.edges.forEach(function (e) {
      var a = root.querySelector('[data-co="' + e.l.from + '"]'), b = root.querySelector('[data-co="' + e.l.to + '"]');
      if (!a || !b || !a.offsetParent || !b.offsetParent) return;
      var d = curve(a, b, box), cls = e.up ? 'ln-up' : 'ln-down';
      var line = document.createElementNS(SVGNS, 'path');
      line.setAttribute('d', d); line.setAttribute('class', cls);
      svg.appendChild(line);
      if (!animate || still || !line.animate) return;
      var len = line.getTotalLength(), delay = (e.hop - 1) * STEP;
      line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
      line.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: DRAW, delay: delay, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
      var pulse = document.createElementNS(SVGNS, 'path');
      pulse.setAttribute('d', d); pulse.setAttribute('class', cls + ' ln-pulse');
      pulse.style.strokeDasharray = '10 ' + len;
      svg.appendChild(pulse);
      pulse.animate([{ strokeDashoffset: 10, opacity: 1 }, { strokeDashoffset: -len, opacity: 1, offset: 0.9 }, { strokeDashoffset: -len, opacity: 0 }],
        { duration: 600, delay: delay + DRAW * 0.7, easing: 'ease-in', fill: 'forwards' });
    });
  }
  /* How long the drawing takes, so the details panel waits for it. */
  function drawTime() {
    if (still || !traced || !svg || getComputedStyle(svg).display === 'none' || !traced.edges.length) return 0;
    var hops = Math.max.apply(null, traced.edges.map(function (e) { return e.hop; }));
    return Math.min(1100, (hops - 1) * STEP + DRAW + 280);
  }
  var resizeT;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { draw(false); }, 120); });

  function clearTrace() {
    try { if (/[?&]entity=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    root.classList.remove('is-tracing');
    traced = null; if (svg) svg.innerHTML = '';
    root.querySelectorAll('.cxcol.has-lit').forEach(function (c) { c.classList.remove('has-lit'); });
    root.querySelectorAll('.cxco').forEach(function (b) {
      b.classList.remove('is-picked', 'is-up', 'is-down');
      b.removeAttribute('aria-pressed');
    });
    if (hint) hint.textContent = DEFAULT_HINT;
  }

  function trace(id) {
    clearTrace();
    var up = walk(id, 'up'), down = walk(id, 'down');
    root.classList.add('is-tracing');
    root.querySelectorAll('.cxco').forEach(function (b) {
      var c = b.getAttribute('data-co');
      if (c === id) { b.classList.add('is-picked'); b.setAttribute('aria-pressed', 'true'); }
      else if (up.indexOf(c) > -1) b.classList.add('is-up');
      else if (down.indexOf(c) > -1) b.classList.add('is-down');
    });
    root.querySelectorAll('.cxco.is-picked, .cxco.is-up, .cxco.is-down').forEach(function (b) {
      b.closest('.cxcol').classList.add('has-lit');
    });
    traced = { id: id, edges: edgesFor(id, up, down) };
    requestAnimationFrame(function () { draw(true); });
    var co = byId[id];
    try { history.replaceState(null, '', location.pathname + '?entity=' + encodeURIComponent(id) + location.hash); } catch (e) {}
    if (hint) {
      hint.textContent = !up.length && !down.length
        ? co.name + ': no supplier or customer is named in a filing yet.'
        : co.name + ': ' + up.length + ' upstream, ' + down.length + ' downstream. Tap again to clear.';
    }
  }

  function srcLink(id) {
    var s = D.sources[id];
    if (!s) return '';
    return '<a class="cxsrc" href="' + esc(s.u) + '" target="_blank" rel="noopener">' +
      esc(s.p.replace(/ \(SEC EDGAR\)$/, '')) + ', ' + esc(s.d) + ' ↗</a>';
  }

  function linkRow(l, otherId) {
    var o = byId[otherId];
    return '<li class="cxdlink"><button type="button" class="cxdgo press" data-go="' + esc(otherId) + '">' +
      esc(o.name) + '</button> <span class="cxdkind">' + esc(D.kinds[l.kind] || l.kind) + ' · ' + esc(l.what) + '</span>' +
      '<blockquote>' + esc(l.excerpt) + '</blockquote>' + srcLink(l.src) + '</li>';
  }

  /* The panel opens once the lines have drawn, so the trace is seen first. */
  var openT;
  function later(id, extra) {
    clearTimeout(openT);
    var wait = drawTime() + (extra || 0);
    if (!wait) return open(id);
    openT = setTimeout(function () { if (traced && traced.id === id) open(id); }, wait);
  }

  function open(id) {
    var c = byId[id];
    var stage = D.stages.filter(function (s) { return s.id === c.stage; })[0];
    var buys = D.links.filter(function (l) { return l.to === id; });
    var sells = D.links.filter(function (l) { return l.from === id; });
    body.innerHTML =
      '<p class="cxdstage">' + stage.n + ' · ' + esc(stage.label) + '</p>' +
      '<h2 class="cxdname" id="cxdName">' + esc(c.name) + (c.ticker ? ' <span class="cxtick">' + esc(c.ticker) + '</span>'
        : c.kind ? ' <span class="cxtick cxkind">' + esc({ private: 'PRIVATE', 'non-us': 'NON-US', model: 'MODEL', app: 'APP' }[c.kind] || '') + '</span>' : '') + '</h2>' +
      '<p class="cxdmakes">' + esc(c.makes) + '</p>' +
      (c.excerpt ? '<blockquote>' + esc(c.excerpt) + '</blockquote>' : '') + srcLink(c.src) +
      (c.href ? '<p><a class="cxdmore press" href="' + esc(c.href) + '">Sites, capacity and record →</a></p>' : '') +
      '<h3>Buys from</h3>' + (buys.length ? '<ul>' + buys.map(function (l) { return linkRow(l, l.from); }).join('') + '</ul>'
        : '<p class="cxdnone">No supplier is named in a filing.</p>') +
      '<h3>Sells to</h3>' + (sells.length ? '<ul>' + sells.map(function (l) { return linkRow(l, l.to); }).join('') + '</ul>'
        : '<p class="cxdnone">No customer is named in a filing.</p>') +
      (c.ticker ? '<h3>Latest news</h3><ul class="cxdnews" id="cxdNews"><li class="cxdnone">Loading…</li></ul>' : '');
    if (typeof drawer.showModal === 'function') drawer.showModal(); else drawer.setAttribute('open', '');
    if (c.ticker) news(c);
  }

  /* Company news is noisy — a ticker's feed carries market stories that never
     mention it — so only headlines that name the company are shown. */
  function news(c) {
    var list = document.getElementById('cxdNews');
    /* The full name, or the name without a generic suffix ("Dell Technologies"
       is "Dell" in a headline), or the ticker. Never the first word alone:
       "Applied" would claim Applied Digital's stories for Applied Materials. */
    var short = c.name.replace(/\s+(Technologies|Energy|Services|Electronics|Group|Systems USA|Manufacturing)$/, '');
    var names = [c.name, short, c.ticker].map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    var re = new RegExp('\\b(' + names.join('|') + ')\\b', 'i');
    fetch('/api/news?symbols=' + encodeURIComponent(c.ticker))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        if (!list.isConnected) return;
        var rows = (j.items || []).filter(function (n) { return re.test(n.headline || ''); }).slice(0, 5);
        list.innerHTML = rows.length ? rows.map(function (n) {
          var when = n.datetime ? new Date(n.datetime * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
          return '<li><a href="' + esc(n.url) + '" target="_blank" rel="noopener">' + esc(n.headline) + '</a>' +
            '<span class="cxdwhen">' + esc(n.source || '') + (when ? ' · ' + esc(when) : '') + '</span></li>';
        }).join('') : '<li class="cxdnone">No story naming ' + esc(c.name) + ' in the last few days.</li>';
      })
      .catch(function () { if (list.isConnected) list.innerHTML = '<li class="cxdnone">News is unavailable right now.</li>'; });
  }

  root.addEventListener('click', function (e) {
    var m = e.target.closest('.cxmore');
    if (m) {
      var col = m.closest('.cxcol');
      var expanded = col.classList.toggle('is-collapsed') === false;
      m.setAttribute('aria-expanded', String(expanded));
      m.textContent = expanded ? 'Show fewer' : m.getAttribute('data-label') || m.textContent;
      return;
    }
    var b = e.target.closest('.cxco');
    if (!b) return;
    var id = b.getAttribute('data-co');
    if (b.classList.contains('is-picked')) { clearTrace(); return; }
    trace(id);
    later(id);
  });

  drawer.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]');
    if (go) { var id = go.getAttribute('data-go'); drawer.close(); trace(id); later(id); return; }
    if (e.target === drawer || e.target.closest('#cxdClose')) drawer.close();
  });

  /* "Who it touches" chips elsewhere on the page trace into the map. */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-trace]');
    if (!t || !byId[t.getAttribute('data-trace')]) return;
    var id = t.getAttribute('data-trace');
    trace(id);
    var btn = root.querySelector('[data-co="' + id + '"]');
    if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
    later(id, 400);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !drawer.open) clearTrace();
  });

  root.querySelectorAll('.cxmore').forEach(function (m) { m.setAttribute('data-label', m.textContent); });

  /* One-time intro: the stages light 1 to 12 the first time the chain is
     seen in a visit. CSS skips it entirely under reduced motion. */
  var seenIntro = false;
  try { seenIntro = sessionStorage.getItem('t2c-intro') === '1'; } catch (e) {}
  if (!seenIntro && !still && 'IntersectionObserver' in window && !/[?&]entity=/.test(location.search)) {
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      root.classList.add('is-intro');
      try { sessionStorage.setItem('t2c-intro', '1'); } catch (e) {}
      setTimeout(function () { root.classList.remove('is-intro'); }, 1800);
    }, { threshold: 0.25 });
    io.observe(document.getElementById('cxTrack'));
  }

  /* Deep link: /?entity=iren opens the chain already traced from IREN. */
  var want = (location.search.match(/[?&]entity=([^&]+)/) || [])[1];
  if (want && byId[decodeURIComponent(want)]) {
    var id0 = decodeURIComponent(want);
    trace(id0);
    var btn0 = root.querySelector('[data-co="' + id0 + '"]');
    if (btn0) {
      root.scrollIntoView({ block: 'start' });
      btn0.scrollIntoView({ block: 'nearest' });
      btn0.classList.add('is-flash');
      setTimeout(function () { btn0.classList.remove('is-flash'); }, 1600);
    }
  }
  /* Heat map: colours each quoted company by its last session's share move.
     A lens over the chain, off until asked for; the choice is remembered. */
  var heatBtn = document.getElementById('cxHeat');
  var heatKey = document.getElementById('cxHeatKey');
  function setHeat(on) {
    root.classList.toggle('is-heat', on);
    heatBtn.setAttribute('aria-pressed', String(on));
    heatBtn.textContent = on ? 'Hide share moves' : 'Colour by share move';
    if (heatKey) heatKey.hidden = !on;
    try { localStorage.setItem('t2c-heat', on ? '1' : '0'); } catch (e) {}
  }
  if (heatBtn) {
    heatBtn.addEventListener('click', function () { setHeat(!root.classList.contains('is-heat')); });
    var saved = null;
    try { saved = localStorage.getItem('t2c-heat'); } catch (e) {}
    if (saved === '1') setHeat(true);
  }
})();
