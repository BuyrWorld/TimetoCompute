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
  function walk(start, dir) {
    var seen = {}, queue = [start];
    while (queue.length) {
      var id = queue.shift();
      D.links.forEach(function (l) {
        var next = dir === 'up' ? (l.to === id ? l.from : null) : (l.from === id ? l.to : null);
        if (next && !seen[next] && next !== start) { seen[next] = true; queue.push(next); }
      });
    }
    return Object.keys(seen);
  }

  function clearTrace() {
    try { if (/[?&]entity=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    root.classList.remove('is-tracing');
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
    open(id);
  });

  drawer.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]');
    if (go) { var id = go.getAttribute('data-go'); trace(id); open(id); return; }
    if (e.target === drawer || e.target.closest('#cxdClose')) drawer.close();
  });

  /* "Who it touches" chips elsewhere on the page trace into the map. */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-trace]');
    if (!t || !byId[t.getAttribute('data-trace')]) return;
    var id = t.getAttribute('data-trace');
    trace(id);
    var btn = root.querySelector('[data-co="' + id + '"]');
    if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    open(id);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !drawer.open) clearTrace();
  });

  root.querySelectorAll('.cxmore').forEach(function (m) { m.setAttribute('data-label', m.textContent); });

  /* Twelve columns do not fit on one screen: arrows, a progress rail, and
     native horizontal scrolling (trackpad, shift+wheel, swipe) all work. */
  var track = document.getElementById('cxTrack');
  var rail = document.getElementById('cxRail');
  var prev = document.getElementById('cxPrev'), nxt = document.getElementById('cxNext');
  function step(dir) {
    var col = track.querySelector('.cxcol');
    track.scrollBy({ left: dir * (col ? col.getBoundingClientRect().width + 10 : 200) * 3, behavior: 'smooth' });
  }
  function sync() {
    var max = track.scrollWidth - track.clientWidth;
    var scrollable = max > 4;
    track.parentNode.querySelector('.cxnav').hidden = !scrollable;
    if (!scrollable) return;
    var f = track.clientWidth / track.scrollWidth;
    rail.style.width = (f * 100) + '%';
    rail.style.marginLeft = ((track.scrollLeft / track.scrollWidth) * 100) + '%';
    prev.disabled = track.scrollLeft < 4;
    nxt.disabled = track.scrollLeft > max - 4;
  }
  if (track) {
    prev.addEventListener('click', function () { step(-1); });
    nxt.addEventListener('click', function () { step(1); });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* Deep link: /?entity=iren opens the chain already traced from IREN. */
  var want = (location.search.match(/[?&]entity=([^&]+)/) || [])[1];
  if (want && byId[decodeURIComponent(want)]) {
    var id0 = decodeURIComponent(want);
    trace(id0);
    var btn0 = root.querySelector('[data-co="' + id0 + '"]');
    if (btn0) {
      root.scrollIntoView({ block: 'start' });
      btn0.scrollIntoView({ block: 'nearest', inline: 'center' });
      btn0.classList.add('is-flash');
      setTimeout(function () { btn0.classList.remove('is-flash'); }, 1600);
    }
  }
})();
