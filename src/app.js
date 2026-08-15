/* T2C client runtime. Configuration comes from the #t2c-config JSON block the build
   emits, so tickers and names are never duplicated between data and script. */
(function () {
  'use strict';

  var CFG = (function () {
    var el = document.getElementById('t2c-config');
    try { return el ? JSON.parse(el.textContent) : {}; } catch (e) { return {}; }
  })();
  var WATCH = CFG.tickers || [];
  var NAMES = CFG.names || {};
  var MAX_COMPARE = CFG.maxCompare || 3;

  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NOT_DISCLOSED = 'Not disclosed';

  /* ============ UTC-safe date helpers ============
     Parsing a date-only string through local time shifted deadlines by a day for
     anyone behind UTC — a 13 Nov deadline displayed as "before 12 Nov". */
  function daysBetweenUtc(fromIso, toIso) {
    var a = Date.parse(String(fromIso).slice(0, 10) + 'T00:00:00Z');
    var b = Date.parse(String(toIso).slice(0, 10) + 'T00:00:00Z');
    if (!isFinite(a) || !isFinite(b)) return null;
    return Math.round((b - a) / 86400000);
  }
  var todayUtc = function () { return new Date().toISOString().slice(0, 10); };
  function fmtDateUtc(iso, opts) {
    var t = Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z');
    if (!isFinite(t)) return NOT_DISCLOSED;
    return new Intl.DateTimeFormat('en-GB',
      Object.assign({ day: 'numeric', month: 'short', timeZone: 'UTC' }, opts || {})).format(new Date(t));
  }
  var isoIn = function (d) { return new Date(Date.now() + d * 86400000).toISOString().slice(0, 10); };

  /* ============ THEME ============ */
  var themeBtn = $('themeBtn');
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    if (themeBtn) {
      themeBtn.textContent = t === 'dark' ? 'Light' : 'Dark';
      themeBtn.setAttribute('aria-label', 'Switch to ' + (t === 'dark' ? 'light' : 'dark') + ' theme');
    }
    drawDist(); drawFan();
  }
  try {
    var saved = localStorage.getItem('t2c-theme');
    if (saved === 'light' || saved === 'dark') applyTheme(saved);
  } catch (e) {}
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('t2c-theme', next); } catch (e) {}
  });

  /* ============ TABS ============ */
  var TABS = CFG.tabs || ['overview', 'companies', 'compare', 'catalysts', 'forecasts', 'research'];
  var ALIASES = CFG.hashAliases || {};

  /* Old hash routes must keep working — #odds opens Forecasts, #ledger and
     #capacity open Research. A shared link from six months ago should not 404. */
  function resolveTab(name) {
    if (TABS.indexOf(name) !== -1) return name;
    if (ALIASES[name]) return ALIASES[name];
    return 'overview';
  }
  function showTab(rawName, push) {
    var name = resolveTab(rawName);
    TABS.forEach(function (t) {
      var sec = $('view-' + t);
      if (sec) sec.hidden = t !== name;
      var btn = document.querySelector('.tab[data-tab="' + t + '"]');
      if (btn) btn.setAttribute('aria-selected', String(t === name));
    });
    if (push && location.hash !== '#' + name) history.pushState({ tab: name }, '', '#' + name);
    if (name === 'forecasts') { drawOdds(); }
    if (name === 'compare') renderCompare();
  }
  document.querySelectorAll('.tab[data-tab]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); showTab(b.dataset.tab, true); });
    b.addEventListener('keydown', function (e) {
      var i = TABS.indexOf(b.dataset.tab), n = null;
      if (e.key === 'ArrowRight') n = TABS[(i + 1) % TABS.length];
      if (e.key === 'ArrowLeft') n = TABS[(i - 1 + TABS.length) % TABS.length];
      if (e.key === 'Home') n = TABS[0];
      if (e.key === 'End') n = TABS[TABS.length - 1];
      if (n) { e.preventDefault(); showTab(n, true); var t = document.querySelector('.tab[data-tab="' + n + '"]'); if (t) t.focus(); }
    });
  });
  window.addEventListener('popstate', function () { showTab((location.hash || '#overview').slice(1), false); });
  // The initial activation runs in the boot block at the end of this file. Calling
  // it here would invoke renderCompare()/drawOdds() before their state exists —
  // deep-linking straight to #compare or #scenarios would throw on a cold load.

  /* segmented controls inside Scenarios */
  var SEGS = ['probability', 'paths', 'targets', 'cats'];
  document.querySelectorAll('.seg-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      SEGS.forEach(function (s) {
        var p = $('seg-' + s); if (p) p.hidden = s !== b.dataset.seg;
        var t = document.querySelector('.seg-btn[data-seg="' + s + '"]');
        if (t) t.setAttribute('aria-selected', String(s === b.dataset.seg));
      });
      if (b.dataset.seg === 'paths') drawFan();
      if (b.dataset.seg === 'targets') loadAnalysts();
    });
  });

  /* ============ expandable country rows ============ */
  document.querySelectorAll('.georow').forEach(function (el) {
    el.addEventListener('click', function () {
      var d = $('geo-' + el.dataset.geo);
      var open = el.getAttribute('aria-expanded') === 'true';
      el.setAttribute('aria-expanded', String(!open));
      if (d) d.hidden = open;
    });
  });

  /* ============ ledger filters ============ */
  (function () {
    var f = { company: $('ledCompany'), type: $('ledType'), conf: $('ledConfidence'), since: $('ledSince') };
    if (!f.company) return;
    function apply() {
      var rows = document.querySelectorAll('#ledgerRows .ledrow');
      var shown = 0;
      rows.forEach(function (r) {
        var ok = (!f.company.value || r.dataset.company === f.company.value) &&
                 (!f.type.value || r.dataset.type === f.type.value) &&
                 (!f.conf.value || r.dataset.confidence === f.conf.value) &&
                 (!f.since.value || r.dataset.date >= f.since.value);
        r.hidden = !ok;
        if (ok) shown++;
      });
      var c = $('ledCount');
      if (c) c.textContent = shown + (shown === 1 ? ' event' : ' events');
    }
    Object.keys(f).forEach(function (k) { if (f[k]) f[k].addEventListener('change', apply); });
  })();

  /* ============ HERO FLOW ============ */
  (function () {
    var cv = $('flow'); if (!cv) return;
    var ctx = cv.getContext('2d'); if (!ctx) return;
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), raf, t0 = performance.now();
    var STOPS = 5;
    function size() {
      var r = cv.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(now) {
      var el = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      var lanes = H > 200 ? 3 : 2;
      var pad = Math.min(70, W * 0.07), span = W - pad * 2;
      for (var l = 0; l < lanes; l++) {
        var y = H * (0.24 + 0.52 * (lanes === 1 ? 0.5 : l / (lanes - 1)));
        ctx.strokeStyle = 'rgba(214,255,0,0.09)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
        for (var s = 0; s < STOPS; s++) {
          var x = pad + span * (s / (STOPS - 1));
          ctx.fillStyle = 'rgba(214,255,0,0.26)';
          ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
        }
        if (!reduced) {
          var period = 10 + l * 2.4, p = ((el + l * 3.1) % period) / period;
          var eased = p * p * (3 - 2 * p), px = pad + span * eased;
          var grad = ctx.createLinearGradient(px - 44, 0, px, 0);
          grad.addColorStop(0, 'rgba(214,255,0,0)');
          grad.addColorStop(1, 'rgba(214,255,0,0.5)');
          ctx.strokeStyle = grad; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(Math.max(pad, px - 44), y); ctx.lineTo(px, y); ctx.stroke();
          ctx.fillStyle = 'rgba(214,255,0,0.9)';
          ctx.beginPath(); ctx.arc(px, y, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    }
    size(); draw(performance.now());
    new ResizeObserver(function () { cancelAnimationFrame(raf); size(); draw(performance.now()); }).observe(cv.parentElement);
  })();

  /* ============ FEED STATUS ============
     "Prices live" at 9pm on a Sunday destroys trust in every other number, so the
     label separates feed health from market session and names the provider. */
  var FEED = { quotes: null, news: null, filings: null, session: null, lastOk: null };
  function renderFeed() {
    var el = $('feedStatus'); if (!el) return;
    var s = FEED.session;
    var online = FEED.quotes === 'ok' || FEED.news === 'ok' || FEED.filings === 'ok';
    var parts = [online ? 'Feed online' : 'Feed offline'];
    if (s) parts.push(s.label);
    var last = FEED.lastTrade || FEED.lastOk;
    if (last) parts.push('Last trade ' + last);
    el.className = 'feed ' + (online ? (s && s.isOpen ? 'ok' : 'idle') : 'off');
    el.innerHTML = '<i aria-hidden="true"></i><span>' + esc(parts.join(' · ')) + '</span>';
    el.title = online
      ? 'Prices supplied by Finnhub. Quotes may be delayed and are not for trading use.'
      : 'The price feed did not respond. Static capacity data is unaffected.';
  }

  /* ============ LIVE FEEDS ============ */
  var emptyBlock = function (t, b) { return '<div class="empty"><h3>' + esc(t) + '</h3><p>' + b + '</p></div>'; };
  var loadingBlock = function (n) {
    var s = '<div class="pb">';
    for (var i = 0; i < n; i++) s += '<div class="skel" style="width:' + (90 - i * 11) + '%"></div>';
    return s + '</div>';
  };
  function api(p) {
    return fetch(p, { headers: { accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  var ago = function (ts) {
    if (!ts) return '';
    var m = Math.round((Date.now() - ts * 1000) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.round(h / 24) + 'd ago';
  };
  var clock = function () { return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };

  var LASTQ = {};

  function loadQuotes() {
    var wrap = $('quoteWrap');
    if (wrap) wrap.innerHTML = '<div class="kpis">' + WATCH.map(function (s) {
      return '<div class="kpi"><div class="qt">' + esc(s) + '</div><div class="skel" style="width:70%;height:19px"></div><div class="skel" style="width:45%"></div></div>';
    }).join('') + '</div>';

    api('/api/quote?symbols=' + WATCH.join(',')).then(function (d) {
      var q = d.quotes || {};
      LASTQ = q;
      FEED.quotes = 'ok';
      FEED.session = d.session || null;
      if (d.session && !d.session.isOpen) {
        var anyT = WATCH.map(function (s) { return q[s] && q[s].lastTradeAt; }).filter(Boolean).sort().pop();
        FEED.lastTrade = anyT ? new Date(anyT).toLocaleString('en-GB',
          { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET' : null;
      } else { FEED.lastTrade = null; }
      renderFeed();

      if (wrap) {
        wrap.innerHTML = '<div class="kpis">' + WATCH.map(function (s) {
          var v = q[s];
          if (!v || v.price == null) {
            return '<div class="kpi"><div class="qt">' + esc(s) + '</div><div class="qn">' + esc(NAMES[s] || '') +
              '</div><div class="kv" style="font-size:20px">—</div><div class="kd">No data</div></div>';
          }
          var c = v.change > 0 ? 'var(--up)' : v.change < 0 ? 'var(--down)' : 'var(--ink)';
          var dir = v.change > 0 ? '▲' : v.change < 0 ? '▼' : '■';
          return '<div class="kpi"><div class="qt">' + esc(s) + '</div>' +
            '<div class="qn">' + esc(NAMES[s] || '') + '</div>' +
            '<div class="kv" style="font-size:22px;margin-top:4px">$' + Number(v.price).toFixed(2) + '</div>' +
            '<div class="kl mono" style="color:' + c + '">' + dir + ' ' + Math.abs(Number(v.changePct || 0)).toFixed(2) + '%</div>' +
            '<div class="kd mono">' + (v.high != null ? 'H ' + Number(v.high).toFixed(2) + ' · L ' + Number(v.low).toFixed(2) : '') + '</div></div>';
        }).join('') + '</div>';
      }
      if ($('quoteMeta')) {
        $('quoteMeta').textContent = (d.session ? d.session.label + ' · ' : '') + 'updated ' + clock() +
          (d.feed && d.feed.realtime === false ? ' · may be delayed' : '');
      }
      drawTape(q);
      paintSnapshots(q);
      syncTicker(false);
      renderCompare();
    }).catch(function () {
      FEED.quotes = 'off'; renderFeed();
      paintSnapshots(null);
      if (wrap) wrap.innerHTML = emptyBlock('Prices unavailable',
        'The quote feed did not respond. Capacity, ledger and contract data are static and unaffected.');
      if ($('quoteMeta')) $('quoteMeta').textContent = 'Offline';
      drawTape(null); syncTicker(false); renderCompare();
    });
  }

  function drawTape(q) {
    var el = $('tape'); if (!el) return;
    var cell = function (s) {
      var v = q && q[s];
      var name = NAMES[s] || s;
      if (!v || v.price == null) {
        return '<span class="tk"><b>' + esc(s) + '</b><span class="tkn">' + esc(name) + '</span><span class="p">—</span></span>';
      }
      var cls = v.change > 0 ? 'u' : v.change < 0 ? 'd' : 'p';
      var dir = v.change > 0 ? '▲' : v.change < 0 ? '▼' : '';
      return '<span class="tk"><b>' + esc(s) + '</b><span class="tkn">' + esc(name) + '</span>' +
        '<span class="p">$' + Number(v.price).toFixed(2) + '</span>' +
        '<span class="' + cls + '">' + dir + Math.abs(Number(v.changePct || 0)).toFixed(2) + '%</span></span>';
    };
    var once = WATCH.map(cell).join('');
    // The duplicate exists purely to make the marquee loop seamlessly, so it is
    // hidden from assistive technology to avoid every ticker being read twice.
    el.innerHTML = '<span class="tkgroup">' + once + '</span>' +
      '<span class="tkgroup" aria-hidden="true">' + once + '</span>';
  }

  /* ---- intelligence ---- */
  var NEWS = [], newsFilter = 'ALL';
  var thumb = function (n) {
    return n.image ? '<span class="nthumb"><img src="' + esc(n.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.remove()" /></span>' : '';
  };
  function newsCard(n) {
    return '<a class="ncard" href="' + esc(n.url) + '" target="_blank" rel="noopener">' + thumb(n) +
      '<span class="nbody"><span class="hl">' + esc(n.headline) + '</span>' +
      '<span class="mt">' +
      (n.symbols || []).slice(0, 3).map(function (s) { return '<span class="symp">' + esc(s) + '</span>'; }).join('') +
      '<span class="srcpill">' + esc(n.source || 'Unattributed') + '</span>' +
      (n.datetime ? '<span>' + esc(ago(n.datetime)) + '</span>' : '') +
      '</span></span></a>';
  }
  function renderNews() {
    var items = newsFilter === 'ALL' ? NEWS : NEWS.filter(function (n) { return (n.symbols || []).indexOf(newsFilter) !== -1; });
    var hero = $('newsHero'), list = $('newsList'), mini = $('newsMini');
    if (!items.length) {
      if (hero) hero.innerHTML = '';
      if (list) list.innerHTML = emptyBlock('Nothing matching that filter', 'Try All, or check back after the next refresh.');
      if (mini) mini.innerHTML = emptyBlock('No stories yet', 'The feed returned nothing for these tickers.');
      return;
    }
    var top = items[0];
    if (hero) {
      hero.innerHTML = '<a class="newshero" href="' + esc(top.url) + '" target="_blank" rel="noopener">' +
        '<div class="lead">Lead story</div>' +
        (top.image ? '<img class="heroimg" src="' + esc(top.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />' : '') +
        '<div class="hl">' + esc(top.headline) + '</div>' +
        '<div class="mt" style="margin-top:11px">' +
        (top.symbols || []).slice(0, 4).map(function (s) { return '<span class="symp">' + esc(s) + '</span>'; }).join('') +
        '<span class="srcpill">' + esc(top.source || 'Unattributed') + '</span><span>' + esc(ago(top.datetime)) + '</span>' +
        '</div></a>';
    }
    if (list) list.innerHTML = '<div class="newsgrid">' + items.slice(1, 49).map(newsCard).join('') + '</div>';
    if (mini) mini.innerHTML = '<div class="newsgrid">' + items.slice(0, 6).map(newsCard).join('') + '</div>';
  }
  function loadNews() {
    var list = $('newsList'), mini = $('newsMini');
    if (!list && !mini) return;
    if (list) list.innerHTML = loadingBlock(6);
    if (mini) mini.innerHTML = loadingBlock(4);
    var f = $('newsFilters');
    if (f && !f.dataset.built) {
      f.dataset.built = '1';
      f.innerHTML = ['ALL'].concat(WATCH).map(function (s) {
        return '<button class="fchip" type="button" data-f="' + esc(s) + '" aria-pressed="' + (s === 'ALL') + '"' +
          (s === 'ALL' ? '' : ' title="' + esc(NAMES[s] || s) + '"') + '>' +
          (s === 'ALL' ? 'All stories' : esc(s)) + '</button>';
      }).join('');
      f.querySelectorAll('.fchip').forEach(function (b) {
        b.addEventListener('click', function () {
          f.querySelectorAll('.fchip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          newsFilter = b.dataset.f; renderNews();
        });
      });
    }
    api('/api/news?symbols=' + WATCH.join(',')).then(function (d) {
      NEWS = d.items || [];
      FEED.news = 'ok'; renderFeed();
      if ($('newsMeta')) $('newsMeta').textContent = NEWS.length + ' stories · ' + clock();
      renderNews();
    }).catch(function () {
      FEED.news = 'off'; renderFeed();
      var m = emptyBlock('Intelligence feed unavailable',
        'The news route did not respond. Capacity, contracts and the ledger are static and unaffected.');
      if ($('newsHero')) $('newsHero').innerHTML = '';
      if (list) list.innerHTML = m;
      if (mini) mini.innerHTML = m;
      if ($('newsMeta')) $('newsMeta').textContent = 'Offline';
    });
  }

  /* ---- filings ---- */
  var FORM_MEANING = {
    '8-K': 'Material event report', '10-Q': 'Quarterly report', '10-K': 'Annual report',
    'S-1': 'Registration statement', '424B5': 'Prospectus supplement',
    'SC 13D': 'Activist ownership stake', 'SC 13G': 'Passive ownership stake'
  };
  function filingTitle(f) {
    var d = (f.description || '').trim();
    if (d && d.toUpperCase() !== String(f.form || '').toUpperCase()) return d;
    return FORM_MEANING[f.form] || (f.company || 'Filing');
  }
  function loadFilings() {
    var list = $('filingList'); if (!list) return;
    list.innerHTML = loadingBlock(6);
    api('/api/filings?symbols=' + WATCH.join(',')).then(function (d) {
      var items = d.items || [];
      FEED.filings = 'ok'; renderFeed();
      list.innerHTML = items.length ? '<div class="newsgrid">' + items.slice(0, 48).map(function (f) {
        return '<a class="ncard" href="' + esc(f.url) + '" target="_blank" rel="noopener"><span class="nbody">' +
          '<span class="filinghead"><span class="symp">' + esc(f.symbol) + '</span>' +
          '<span class="formpill">' + esc(f.form) + '</span>' +
          '<span class="filingdate">' + esc(f.filed) + '</span></span>' +
          '<span class="hl">' + esc(filingTitle(f)) + '</span>' +
          '<span class="qn">' + esc(f.company || NAMES[f.symbol] || '') + '</span>' +
          '<span class="whatchanged">What changed — structured summary pending</span>' +
          '</span></a>';
      }).join('') + '</div>' : emptyBlock('No recent filings', 'Nothing new from these companies in the window queried.');
      if ($('filingMeta')) $('filingMeta').textContent = items.length + ' filings · ' + clock();
    }).catch(function () {
      FEED.filings = 'off'; renderFeed();
      list.innerHTML = emptyBlock('Filings feed unavailable', 'The EDGAR route did not respond. Capacity and ledger data are unaffected.');
      if ($('filingMeta')) $('filingMeta').textContent = 'Offline';
    });
  }

  /* ============ ANALYSTS ============ */
  var ANALYSTS = null;
  function loadAnalysts() {
    var body = $('analystBody'); if (!body || body.dataset.loaded) return;
    body.dataset.loaded = '1';
    body.innerHTML = loadingBlock(4);
    api('/api/analysts?symbols=' + WATCH.join(',')).then(function (d) {
      ANALYSTS = d;
      renderAnalysts(d);
      renderCompare();
    }).catch(function () {
      body.innerHTML = emptyBlock('Analyst coverage unavailable',
        'The analyst route did not respond. Nothing else on this page depends on it.');
      if ($('analystMeta')) $('analystMeta').textContent = 'Offline';
    });
  }

  function renderAnalysts(d) {
    var body = $('analystBody');
    var av = d.availability || {};
    if ($('analystMeta')) {
      $('analystMeta').textContent = av.priceTargets ? 'Provider: ' + d.provider : 'Targets unavailable on this plan';
    }

    var html = '';
    if (!av.priceTargets) {
      // No fabricated consensus. State exactly what is missing and why.
      html += '<div class="unavail">' +
        '<h3>Analyst price targets are not available</h3>' +
        '<p>' + esc(d.limitation || '') + '</p>' +
        '<p class="unavail-fields"><b>Not available:</b> ' + esc((d.unavailableFields || []).join(', ')) + '</p>' +
        '<p class="unavail-note">T2C will not display an unattributed price target, a placeholder, or a ' +
        'target horizon it has invented. When a licensed provider supplying per-firm targets is connected, ' +
        'this panel fills in automatically — the consensus, revision and upside calculations are already ' +
        'implemented and unit-tested.</p></div>';
    }

    // Rating distribution IS available, so show it — attributed, and clearly not a target.
    var rows = [];
    Object.keys(d.symbols || {}).forEach(function (t) {
      var e = d.symbols[t];
      if (!e.ratingDistribution || !e.ratingDistribution.length) return;
      var latest = e.ratingDistribution[0];
      var total = (latest.strongBuy || 0) + (latest.buy || 0) + (latest.hold || 0) + (latest.sell || 0) + (latest.strongSell || 0);
      if (!total) return;
      var bull = (latest.strongBuy || 0) + (latest.buy || 0);
      var neu = latest.hold || 0;
      var bear = (latest.sell || 0) + (latest.strongSell || 0);
      rows.push(
        '<tr><td><a href="#">' + esc(t) + '</a><span class="sub">' + esc(NAMES[t] || '') + '</span></td>' +
        '<td>' + total + '</td>' +
        '<td><div class="ratingbar" role="img" aria-label="' + bull + ' bullish, ' + neu + ' neutral, ' + bear + ' bearish">' +
        '<i style="width:' + (bull / total * 100) + '%;background:var(--ok)"></i>' +
        '<i style="width:' + (neu / total * 100) + '%;background:var(--unknown)"></i>' +
        '<i style="width:' + (bear / total * 100) + '%;background:var(--bad)"></i></div></td>' +
        '<td>' + bull + '</td><td>' + neu + '</td><td>' + bear + '</td>' +
        '<td class="dim small">' + esc(latest.period || '') + '</td></tr>'
      );
    });

    if (rows.length) {
      html += '<div class="keynote">A rating <b>distribution</b> is available on the connected plan — how ' +
        'many firms are positive, neutral or negative. It carries no price target and no individual firm ' +
        'attribution, so it is shown as a distribution and never converted into a target.</div>' +
        '<div class="scrollnote">Scroll sideways for all columns →</div>' +
        '<div class="tw"><table><thead><tr><th scope="col">Ticker</th><th scope="col">Firms</th>' +
        '<th scope="col">Split</th><th scope="col">Bullish</th><th scope="col">Neutral</th>' +
        '<th scope="col">Bearish</th><th scope="col">Period</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
        '<div class="stamp">Supplied by ' + esc(d.provider) + '. Ratings are third-party opinions, not T2C views.</div>';
    }
    body.innerHTML = html;
  }

  /* ============ SCENARIOS ============ */
  var SQ2PI = Math.sqrt(2 * Math.PI);
  function normCdf(x) {
    if (!isFinite(x)) return x > 0 ? 1 : 0;
    var t = 1 / (1 + 0.2316419 * Math.abs(x)), d = Math.exp(-x * x / 2) / SQ2PI;
    var p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return x > 0 ? 1 - p : p;
  }
  var normPdf = function (x) { return Math.exp(-x * x / 2) / SQ2PI; };
  function probAbove(S0, K, s, T, mu) {
    if (T <= 0) return S0 > K ? 1 : 0;
    var m = mu - 0.5 * s * s;
    return normCdf((Math.log(S0 / K) + m * T) / (s * Math.sqrt(T)));
  }
  function probTouch(S0, B, s, T, mu) {
    if (T <= 0 || s <= 0) return 0;
    var m = mu - 0.5 * s * s, b = Math.log(B / S0), sT = s * Math.sqrt(T);
    var p = B > S0
      ? normCdf((m * T - b) / sT) + Math.exp(2 * m * b / (s * s)) * normCdf((-b - m * T) / sT)
      : normCdf((b - m * T) / sT) + Math.exp(2 * m * b / (s * s)) * normCdf((b + m * T) / sT);
    return clamp(p, 0, 1);
  }
  var qt = function (S0, s, T, mu, z) { return S0 * Math.exp((mu - 0.5 * s * s) * T + z * s * Math.sqrt(T)); };
  function inverseNorm(p) {
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var pl = 0.02425, q, r;
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }

  var VOL_BASE = { IREN: 90, CRWV: 85, NBIS: 75, WULF: 95, KEEL: 100, APLD: 85, CIFR: 90, NVDA: 45 };
  var DIRTY = { spot: false, target: false, vol: false, date: false };
  var SCN = null;

  function estVol(v, base) {
    if (!v || !(v.high > 0) || !(v.low > 0) || v.high <= v.low) return null;
    var hl = Math.log(v.high / v.low);
    var park = Math.sqrt(hl * hl / (4 * Math.LN2)) * Math.sqrt(252) * 100;
    return clamp(Math.round(park * 0.4 + base * 0.6), 20, 220);
  }
  function niceTarget(spot, volPct) {
    var raw = spot * (1 + clamp(volPct / 100, 0.15, 1.2) * 0.55);
    var step = raw >= 500 ? 50 : raw >= 100 ? 10 : raw >= 25 ? 5 : raw >= 10 ? 1 : 0.5;
    return +(Math.round(raw / step) * step).toFixed(2);
  }

  function syncTicker(reset) {
    if (!$('inTicker')) return;
    var t = $('inTicker').value, v = LASTQ[t], live = !!(v && v.price != null);
    if (reset) DIRTY = { spot: false, target: false, vol: false, date: false };
    if (live && !DIRTY.spot) $('inSpot').value = Number(v.price).toFixed(2);
    else if (reset && !live) $('inSpot').value = '';
    var base = VOL_BASE[t] || 80, est = live ? estVol(v, base) : null;
    if (!DIRTY.vol) $('inVol').value = est == null ? base : est;
    $('volTag').textContent = DIRTY.vol ? 'Your figure' : est != null ? 'From today’s range + typical' : 'Typical — no history on this plan';
    if (!DIRTY.date && (reset || !$('inDate').value)) $('inDate').value = isoIn(90);
    var spot = +$('inSpot').value;
    if (!DIRTY.target && spot > 0) $('inTarget').value = niceTarget(spot, +$('inVol').value || base);
    $('spotTag').innerHTML = live
      ? '<span class="livetag on"><i aria-hidden="true"></i>Live' + (DIRTY.spot ? ' · overridden' : '') + '</span>'
      : '<span class="livetag">Prices offline — type one</span>';
    $('resyncBtn').disabled = !(DIRTY.spot || DIRTY.target || DIRTY.vol || DIRTY.date);
    drawOdds();
  }

  function drawOdds() {
    if (!$('inSpot')) return;
    var S0 = +$('inSpot').value, B = +$('inTarget').value;
    var s = (+$('inVol').value) / 100, mu = (+$('inDrift').value) / 100;
    var deadline = $('inDate').value;
    var days = deadline ? daysBetweenUtc(todayUtc(), deadline) : null;

    if (!(days > 0) || !(S0 > 0) || !(B > 0) || !(s > 0)) {
      SCN = null;
      $('bigOdds').textContent = '—';
      $('oddsBar').style.width = '0%';
      $('oddsPlain').textContent = 'Enter a positive price, target and volatility, and pick a future deadline.';
      $('oddsTable').innerHTML = ''; $('stepsBox').innerHTML = '';
      drawDist(); drawFan();
      return;
    }
    var T = days / 365.25;
    var finishAbove = probAbove(S0, B, s, T, mu);
    var touch = probTouch(S0, B, s, T, mu);
    var median = qt(S0, s, T, mu, 0), lo = qt(S0, s, T, mu, -1), hi = qt(S0, s, T, mu, 1);
    var halve = 1 - probAbove(S0, S0 * 0.5, s, T, mu);
    var movePct = (B / S0 - 1) * 100, sT = s * Math.sqrt(T);
    var tick = $('inTicker').value;

    SCN = { S0: S0, B: B, s: s, T: T, mu: mu, days: days, median: median, lo: lo, hi: hi, tick: tick, deadline: deadline };

    $('qLine').textContent = 'Touching $' + B + ' before ' + fmtDateUtc(deadline);
    $('oddsTicker').innerHTML = '<span class="mono"><b>' + esc(tick) + '</b> $' + S0.toFixed(2) + ' → $' + B + ' · ' + days + 'd</span>';
    $('bigOdds').textContent = (touch * 100).toFixed(0) + '%';
    $('oddsBar').style.width = (touch * 100) + '%';
    var w = touch > 0.7 ? 'comfortably more likely than not' : touch > 0.55 ? 'slightly more likely than not'
      : touch > 0.45 ? 'close to a coin flip' : touch > 0.25 ? 'possible, but against the odds' : 'a long shot';
    $('oddsPlain').innerHTML = 'A <b>' + (movePct > 0 ? 'rise' : 'fall') + ' of ' + Math.abs(movePct).toFixed(0) +
      '%</b> in <b>' + days + ' days</b> at ' + (s * 100).toFixed(0) + '% annualised volatility. On these ' +
      'assumptions that is <b>' + w + '</b>.';

    $('oddsTable').innerHTML = '<caption class="sr">Modelled probabilities for ' + esc(tick) + '</caption><tbody>' +
      '<tr><td>Probability of touching the target</td><td>' + (touch * 100).toFixed(0) + '%</td></tr>' +
      '<tr><td>Probability of finishing above</td><td>' + (finishAbove * 100).toFixed(0) + '%</td></tr>' +
      '<tr><td>Median outcome<span class="sub">Half of modelled outcomes finish above this</span></td><td>$' + median.toFixed(2) + '</td></tr>' +
      '<tr><td>Two-thirds range</td><td>$' + lo.toFixed(0) + ' – $' + hi.toFixed(0) + '</td></tr>' +
      '<tr><td>Required move</td><td>' + (movePct > 0 ? '+' : '') + movePct.toFixed(1) + '%</td></tr>' +
      '<tr><td>Probability of halving</td><td style="color:' + (halve > 0.2 ? 'var(--bad)' : 'inherit') + '">' + (halve * 100).toFixed(0) + '%</td></tr>' +
      '<tr><td>Days remaining</td><td>' + days + '</td></tr></tbody>';

    $('stepsBox').innerHTML = [
      ['Measure the distance', 'How far the price has to travel, in percentage terms rather than dollars.',
        '$' + S0.toFixed(2) + ' → $' + B + ' = ' + (movePct > 0 ? '+' : '') + movePct.toFixed(1) + '%'],
      ['Measure the time', 'Volatility is quoted per year, so the deadline becomes a fraction of a year.',
        days + ' days = ' + T.toFixed(3) + ' of a year'],
      ['Scale volatility to the window', 'Volatility grows with the square root of time, not with time itself.',
        (s * 100).toFixed(0) + '% × √' + T.toFixed(3) + ' = ' + (sT * 100).toFixed(1) + '% over the window'],
      ['Compare the two', 'Distance divided by window volatility gives how many typical moves away the target sits.',
        Math.abs(movePct).toFixed(1) + '% ÷ ' + (sT * 100).toFixed(1) + '% ≈ ' + Math.abs(Math.log(B / S0) / sT).toFixed(2) + ' moves away'],
      ['Allow for touching, not just finishing',
        'A price that reaches the target and falls back still counts as a touch. Under the reflection ' +
        'principle for Brownian motion, each path that crosses the barrier and returns corresponds to a ' +
        'reflected path finishing above it, which is why the touch probability is the larger of the two.',
        'finishes above ' + (finishAbove * 100).toFixed(0) + '% → touches ' + (touch * 100).toFixed(0) + '%'],
      ['Sense-check it', 'Your drift of ' + (mu * 100).toFixed(0) + '%/yr shifts the distribution ' +
        (mu > 0 ? 'up' : mu < 0 ? 'down' : 'not at all') + '. The model assumes no gaps or jumps, which real shares have.',
        'final answer ' + (touch * 100).toFixed(0) + '%']
    ].map(function (r) {
      return '<div class="step"><div class="no"></div><div><h4>' + esc(r[0]) + '</h4><p>' + esc(r[1]) +
        '</p><span class="calc">' + esc(r[2]) + '</span></div></div>';
    }).join('');

    drawDist(); drawFan();
  }

  function cssVar(n, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return v || fb;
  }

  function drawDist() {
    var el = $('distChart'); if (!el) return;
    if (!SCN) { el.innerHTML = ''; if ($('distSummary')) $('distSummary').textContent = ''; return; }
    var S0 = SCN.S0, B = SCN.B, s = SCN.s, T = SCN.T, mu = SCN.mu;
    var W = 720, H = 260, pl = 10, pr = 10, ptop = 26, pb = 52;
    var lo = Math.log(S0 * 0.25), hi = Math.log(S0 * 3.2);
    var x = function (lp) { return pl + (lp - lo) / (hi - lo) * (W - pl - pr); };
    var m = mu - 0.5 * s * s, mean = Math.log(S0) + m * T, sd = s * Math.sqrt(T);
    var base = H - pb, amp = H - ptop - pb;
    var ok = cssVar('--ok', '#C8E82A'), dim = cssVar('--dim', '#8A8A93');
    var ink = cssVar('--ink', '#fff'), line = cssVar('--line-2', '#1F1F23');

    var pts = [];
    for (var i = 0; i <= 240; i++) {
      var lp = lo + (hi - lo) * i / 240;
      pts.push([x(lp), base - normPdf((lp - mean) / sd) * amp]);
    }
    var xb = x(Math.log(B)), xs = x(Math.log(S0)), xm = x(Math.log(SCN.median));
    var cut = -1;
    for (var j = 0; j < pts.length; j++) if (pts[j][0] >= xb) { cut = j; break; }
    var right = cut < 0 ? [] : pts.slice(cut);

    var sv = '';
    var step = S0 > 100 ? 50 : S0 > 40 ? 20 : 10;
    for (var v = step; v < S0 * 3.2; v += step) {
      if (Math.log(v) < lo || Math.log(v) > hi) continue;
      var px = x(Math.log(v));
      sv += '<line x1="' + px + '" y1="' + ptop + '" x2="' + px + '" y2="' + base + '" stroke="' + line + '" stroke-width="1"/>';
      sv += '<text x="' + px + '" y="' + (base + 16) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="10" fill="' + dim + '">$' + v + '</text>';
    }
    sv += '<path d="M ' + pts[0][0] + ' ' + base + ' ' + pts.map(function (p) { return 'L ' + p[0] + ' ' + p[1]; }).join(' ') +
      ' L ' + pts[pts.length - 1][0] + ' ' + base + ' Z" fill="' + dim + '" opacity=".18"/>';
    if (right.length) {
      sv += '<path d="M ' + right[0][0] + ' ' + base + ' ' + right.map(function (p) { return 'L ' + p[0] + ' ' + p[1]; }).join(' ') +
        ' L ' + right[right.length - 1][0] + ' ' + base + ' Z" fill="' + ok + '" opacity=".45"/>';
    }
    sv += '<path d="M ' + pts.map(function (p) { return p.join(' '); }).join(' L ') + '" fill="none" stroke="' + ink + '" stroke-width="1.6" opacity=".75"/>';
    function marker(px, colour, label, dash) {
      return '<line x1="' + px + '" y1="' + (ptop - 6) + '" x2="' + px + '" y2="' + base + '" stroke="' + colour + '" stroke-width="2"' + (dash ? ' stroke-dasharray="4 3"' : '') + '/>' +
        '<text x="' + px + '" y="' + (ptop - 10) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="10.5" font-weight="700" fill="' + colour + '">' + label + '</text>';
    }
    sv += marker(xs, dim, 'now $' + S0.toFixed(2), true);
    sv += marker(xm, ink, 'median $' + SCN.median.toFixed(2), true);
    sv += marker(xb, ok, 'target $' + B, false);
    sv += '<text x="' + (W / 2) + '" y="' + (H - 12) + '" text-anchor="middle" font-family="Archivo,sans-serif" font-size="11.5" font-weight="700" fill="' + dim + '">Share price at selected deadline</text>';
    el.innerHTML = sv;

    var legend = $('distLegend');
    if (legend) {
      legend.innerHTML =
        '<span class="lg"><i style="background:' + ok + ';opacity:.45"></i>Shaded — outcomes finishing above your target</span>' +
        '<span class="lg"><i style="background:' + dim + ';opacity:.35"></i>Full range of modelled outcomes</span>' +
        '<span class="lg"><i class="dash" style="background:' + dim + '"></i>Current price</span>' +
        '<span class="lg"><i class="dash" style="background:' + ink + '"></i>Median outcome</span>' +
        '<span class="lg"><i style="background:' + ok + '"></i>Your target</span>';
    }
    if ($('distSummary')) {
      $('distSummary').textContent = 'Distribution of possible prices for ' + SCN.tick + ' on ' +
        fmtDateUtc(SCN.deadline, { year: 'numeric' }) + '. Today $' + S0.toFixed(2) + ', your target $' + B +
        '. The median outcome is $' + SCN.median.toFixed(2) + ' and two thirds of modelled outcomes fall between $' +
        SCN.lo.toFixed(0) + ' and $' + SCN.hi.toFixed(0) + '. The shaded area right of the target is the ' +
        (probAbove(S0, B, s, T, mu) * 100).toFixed(0) + '% of outcomes finishing above it. Modelled from your ' +
        'assumptions — not a prediction.';
    }
  }

  function drawFan() {
    var el = $('fanChart'); if (!el) return;
    if (!SCN) { el.innerHTML = ''; if ($('fanSummary')) $('fanSummary').textContent = ''; return; }
    var W = 760, H = 320, pl = 52, pr = 14, ptop = 18, pb = 46;
    var steps = 40;
    var ok = cssVar('--ok', '#C8E82A'), dim = cssVar('--dim', '#8A8A93');
    var ink = cssVar('--ink', '#fff'), line = cssVar('--line-2', '#1F1F23');

    var bands = [];
    for (var i = 0; i <= steps; i++) {
      var t = SCN.T * i / steps;
      var row = { i: i, v: {} };
      [0.10, 0.25, 0.50, 0.75, 0.90].forEach(function (p) {
        row.v[p] = t === 0 ? SCN.S0 : qt(SCN.S0, SCN.s, t, SCN.mu, inverseNorm(p));
      });
      bands.push(row);
    }
    var all = bands.reduce(function (a, r) { return a.concat([r.v[0.10], r.v[0.90]]); }, [SCN.B]);
    var ymin = Math.min.apply(null, all) * 0.95, ymax = Math.max.apply(null, all) * 1.05;
    var x = function (i) { return pl + (i / steps) * (W - pl - pr); };
    var y = function (v) { return ptop + (1 - (v - ymin) / (ymax - ymin)) * (H - ptop - pb); };

    var sv = '';
    for (var g = 0; g <= 4; g++) {
      var gv = ymin + (ymax - ymin) * g / 4, gy = y(gv);
      sv += '<line x1="' + pl + '" y1="' + gy + '" x2="' + (W - pr) + '" y2="' + gy + '" stroke="' + line + '" stroke-width="1"/>';
      sv += '<text x="' + (pl - 8) + '" y="' + (gy + 3.5) + '" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="10" fill="' + dim + '">$' + gv.toFixed(0) + '</text>';
    }
    function band(pLo, pHi, opacity) {
      var top = bands.map(function (r) { return x(r.i) + ' ' + y(r.v[pHi]); });
      var bot = bands.slice().reverse().map(function (r) { return x(r.i) + ' ' + y(r.v[pLo]); });
      return '<path d="M ' + top.join(' L ') + ' L ' + bot.join(' L ') + ' Z" fill="' + ok + '" opacity="' + opacity + '"/>';
    }
    sv += band(0.10, 0.90, 0.12);
    sv += band(0.25, 0.75, 0.22);
    sv += '<path d="M ' + bands.map(function (r) { return x(r.i) + ' ' + y(r.v[0.50]); }).join(' L ') + '" fill="none" stroke="' + ink + '" stroke-width="2"/>';
    var ty = y(SCN.B);
    sv += '<line x1="' + pl + '" y1="' + ty + '" x2="' + (W - pr) + '" y2="' + ty + '" stroke="' + ok + '" stroke-width="2" stroke-dasharray="5 4"/>';
    sv += '<text x="' + (W - pr - 4) + '" y="' + (ty - 6) + '" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="10.5" font-weight="700" fill="' + ok + '">your target $' + SCN.B + '</text>';
    sv += '<text x="' + pl + '" y="' + (H - 14) + '" font-family="IBM Plex Mono,monospace" font-size="10" fill="' + dim + '">today</text>';
    sv += '<text x="' + (W - pr) + '" y="' + (H - 14) + '" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="10" fill="' + dim + '">' + esc(fmtDateUtc(SCN.deadline)) + '</text>';
    sv += '<text x="' + (W / 2) + '" y="' + (H - 14) + '" text-anchor="middle" font-family="Archivo,sans-serif" font-size="11.5" font-weight="700" fill="' + dim + '">Time to deadline</text>';
    el.innerHTML = sv;

    var lg = $('fanLegend');
    if (lg) {
      lg.innerHTML =
        '<span class="lg"><i style="background:' + ink + '"></i>Median path — half of outcomes above, half below</span>' +
        '<span class="lg"><i style="background:' + ok + ';opacity:.22"></i>Middle 50% of outcomes (25th–75th)</span>' +
        '<span class="lg"><i style="background:' + ok + ';opacity:.12"></i>Middle 80% of outcomes (10th–90th)</span>' +
        '<span class="lg"><i class="dash" style="background:' + ok + '"></i>Your target</span>';
    }
    if ($('fanSummary')) {
      $('fanSummary').textContent = 'Modelled range of prices for ' + SCN.tick + ' between today and ' +
        fmtDateUtc(SCN.deadline, { year: 'numeric' }) + '. The median path ends near $' + SCN.median.toFixed(2) +
        ', with the middle 80% of outcomes between $' + bands[steps].v[0.10].toFixed(0) + ' and $' +
        bands[steps].v[0.90].toFixed(0) + '. These are distributions of possible outcomes, not predicted ' +
        'trajectories — no individual path is a forecast.';
    }
  }

  /* ============ COMPARISON ============ */
  var CMP = [];
  try {
    var savedCmp = JSON.parse(localStorage.getItem('t2c-compare') || '[]');
    if (Array.isArray(savedCmp)) CMP = savedCmp.slice(0, MAX_COMPARE);
  } catch (e) {}

  function persistCmp() { try { localStorage.setItem('t2c-compare', JSON.stringify(CMP)); } catch (e) {} }

  (function initCmp() {
    var box = $('cmpChips'); if (!box) return;
    box.querySelectorAll('input[name="compare"]').forEach(function (input) {
      input.checked = CMP.indexOf(input.value) !== -1;
      input.addEventListener('change', function () {
        if (input.checked) {
          if (CMP.length >= MAX_COMPARE) {
            input.checked = false;
            var hint = $('cmpHint');
            if (hint) hint.textContent = 'You can compare at most ' + MAX_COMPARE + ' companies. Remove one first.';
            return;
          }
          CMP.push(input.value);
        } else {
          CMP = CMP.filter(function (t) { return t !== input.value; });
        }
        persistCmp(); syncCmpDisabled(); renderCompare();
      });
    });
    var clear = $('cmpClear');
    if (clear) clear.addEventListener('click', function () {
      CMP = []; persistCmp();
      box.querySelectorAll('input[name="compare"]').forEach(function (i) { i.checked = false; });
      syncCmpDisabled(); renderCompare();
    });
    ['cmpPeriod', 'cmpMode'].forEach(function (id) {
      var el = $(id); if (el) el.addEventListener('change', renderCompare);
    });
    syncCmpDisabled();
  })();

  function syncCmpDisabled() {
    var box = $('cmpChips'); if (!box) return;
    var full = CMP.length >= MAX_COMPARE;
    box.querySelectorAll('input[name="compare"]').forEach(function (i) {
      i.disabled = full && !i.checked;
      i.closest('.cchip').classList.toggle('is-disabled', i.disabled);
    });
    var hint = $('cmpHint');
    if (hint) {
      hint.textContent = CMP.length === 0
        ? 'Select up to ' + MAX_COMPARE + ' companies.'
        : CMP.length + ' of ' + MAX_COMPARE + ' selected' + (full ? ' — the maximum' : '');
    }
  }

  function renderCompare() {
    var chart = $('cmpChart'), table = $('cmpTable'), pot = $('cmpPotential');
    if (!table) return;
    if (!CMP.length) {
      var msg = emptyBlock('No companies selected', 'Choose up to ' + MAX_COMPARE + ' companies above to compare them.');
      if (chart) chart.innerHTML = '';
      table.innerHTML = msg;
      if (pot) pot.innerHTML = '';
      return;
    }

    // Historical series are unavailable on this plan, so the performance chart
    // states that rather than drawing an empty axis.
    if (chart) {
      chart.innerHTML = '<div class="unavail compact">' +
        '<h3>Performance chart unavailable</h3>' +
        '<p>A normalised performance chart needs daily price history. The connected market-data plan does ' +
        'not grant historical candles, so no series can be drawn. Current prices below are live.</p>' +
        '<p class="unavail-note">The normalisation, drawdown and volatility calculations are implemented ' +
        'and unit-tested; the chart renders as soon as a price-history source is connected.</p></div>';
    }

    var rows = CMP.map(function (t) {
      var q = LASTQ[t];
      var price = q && q.price != null ? '$' + Number(q.price).toFixed(2) : '<span class="nd">' + NOT_DISCLOSED + '</span>';
      var chg = q && q.changePct != null
        ? '<span style="color:' + (q.change > 0 ? 'var(--up)' : q.change < 0 ? 'var(--down)' : 'inherit') + '">' +
          (q.change > 0 ? '▲ ' : q.change < 0 ? '▼ ' : '') + Math.abs(Number(q.changePct)).toFixed(2) + '%</span>'
        : '<span class="nd">—</span>';
      var nd = '<span class="nd">' + NOT_DISCLOSED + '</span>';
      return '<tr><td><b>' + esc(t) + '</b><span class="sub">' + esc(NAMES[t] || '') + '</span></td>' +
        '<td>' + price + '</td><td>' + chg + '</td>' +
        '<td>' + nd + '<span class="sub">no history on this plan</span></td>' +
        '<td>' + nd + '<span class="sub">no targets on this plan</span></td>' +
        '<td>' + nd + '<span class="sub">no targets on this plan</span></td>' +
        '</tr>';
    }).join('');

    table.innerHTML = '<div class="scrollnote">Scroll sideways for all columns →</div>' +
      '<div class="tw"><table><thead><tr>' +
      '<th scope="col">Company</th><th scope="col">Price</th><th scope="col">Today</th>' +
      '<th scope="col">Period return</th><th scope="col">Median target</th><th scope="col">Implied upside</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="stamp">Operational comparison — secured power, contracted capacity and energised critical IT — ' +
      'is on each company page, where every figure carries its measurement basis. Companies are not ranked ' +
      'across incompatible bases.</div>';

    if (pot) {
      pot.innerHTML = '<div class="potgrid">' + CMP.map(function (t) {
        var q = LASTQ[t];
        return '<div class="potcard"><h4>' + esc(t) + '<span>' + esc(NAMES[t] || '') + '</span></h4>' +
          '<dl><dt>Current price <span class="tag tag-live">live</span></dt><dd>' +
          (q && q.price != null ? '$' + Number(q.price).toFixed(2) : NOT_DISCLOSED) + '</dd>' +
          '<dt>Sell-side consensus <span class="tag tag-analyst">analyst opinion</span></dt><dd class="nd">Not available on this plan</dd>' +
          '<dt>T2C scenario <span class="tag tag-model">your assumptions</span></dt><dd>' +
          (SCN && SCN.tick === t ? 'Touch ' + (probTouch(SCN.S0, SCN.B, SCN.s, SCN.T, SCN.mu) * 100).toFixed(0) + '% at $' + SCN.B : 'Set inputs in Scenarios') + '</dd>' +
          '<dt>Company operational data <span class="tag tag-filed">filed</span></dt><dd><a href="#capacity">See capacity record</a></dd>' +
          '</dl></div>';
      }).join('') + '</div>';
    }
  }


  /* ============ ANALYTICS ============
     Anonymous, non-sensitive product events. No vendor is contacted: events land on
     window.t2cEvents and, if a dataLayer already exists, are pushed there too. This
     adds no third-party script and no identifiers. */
  window.t2cEvents = window.t2cEvents || [];
  function track(name, detail) {
    var evt = { name: name, at: new Date().toISOString(), detail: detail || {} };
    window.t2cEvents.push(evt);
    if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: 't2c_' + name, t2c: evt.detail });
  }

  /* ============ SNAPSHOT CARDS ============ */
  function paintSnapshots(q) {
    document.querySelectorAll('.snapprice[data-price]').forEach(function (el) {
      var t = el.dataset.price, v = q && q[t];
      if (!v || v.price == null) { el.innerHTML = '<span class="nd">—</span>'; return; }
      var col = v.change > 0 ? 'var(--up)' : v.change < 0 ? 'var(--down)' : 'var(--dim)';
      var dir = v.change > 0 ? '▲' : v.change < 0 ? '▼' : '■';
      el.innerHTML = '$' + Number(v.price).toFixed(2) +
        '<span class="chg" style="color:' + col + '">' + dir + ' ' +
        Math.abs(Number(v.changePct || 0)).toFixed(2) + '%</span>';
    });
  }

  // "Compare" on a snapshot card adds the ticker and jumps to the comparison.
  document.querySelectorAll('.snapcompare').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.add;
      if (CMP.indexOf(t) === -1) {
        if (CMP.length >= MAX_COMPARE) {
          b.textContent = 'Max ' + MAX_COMPARE;
          setTimeout(function () { b.textContent = 'Compare'; }, 1600);
          return;
        }
        CMP.push(t);
        persistCmp();
        track('ticker_added_to_compare', { ticker: t, from: 'snapshot' });
      }
      var box = $('cmpChips');
      if (box) {
        box.querySelectorAll('input[name="compare"]').forEach(function (i) {
          i.checked = CMP.indexOf(i.value) !== -1;
        });
      }
      syncCmpDisabled();
      renderCompare();
      showTab('compare', true);
      track('compare_started', { tickers: CMP.slice() });
    });
  });

  document.querySelectorAll('.snapname, .olink').forEach(function (el) {
    el.addEventListener('click', function () {
      if (el.classList.contains('olink')) track('official_social_clicked', { href: el.getAttribute('href') });
      else track('company_opened', { href: el.getAttribute('href') });
    });
  });
  document.querySelectorAll('details.ev').forEach(function (d) {
    d.addEventListener('toggle', function () { if (d.open) track('source_drawer_opened', {}); });
  });


  /* ============ STORYBOOK JOURNEY ============
     Each step expands to its evidence, so a reader can go from the picture to the
     primary document without leaving the page. */
  document.querySelectorAll('.jbtn').forEach(function (b) {
    b.addEventListener('click', function () {
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      var open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      if (panel) panel.hidden = open;
      if (!open) track('journey_step_opened', { step: b.querySelector('.jlabel').textContent });
    });
  });
  /* ============ wiring ============ */
  if ($('inTicker')) {
    ['inSpot', 'inTarget', 'inVol', 'inDate'].forEach(function (id) {
      var flag = { inSpot: 'spot', inTarget: 'target', inVol: 'vol', inDate: 'date' }[id];
      $(id).addEventListener('input', function () {
        DIRTY[flag] = true;
        $('resyncBtn').disabled = false;
        if (flag === 'spot') $('spotTag').innerHTML = '<span class="livetag">Your figure</span>';
        if (flag === 'vol') $('volTag').textContent = 'Your figure';
        drawOdds();
      });
    });
    $('inDrift').addEventListener('input', drawOdds);
    $('inTicker').addEventListener('change', function () { syncTicker(true); });
    $('resyncBtn').addEventListener('click', function () { syncTicker(true); });
    syncTicker(true);
  }

  function refreshAll() { loadQuotes(); loadNews(); loadFilings(); }
  var rb = $('refreshBtn');
  if (rb) rb.addEventListener('click', refreshAll);
  renderFeed();

  // Everything is defined by this point, so a deep link can safely activate its tab.
  if (document.querySelector('.tab[data-tab]')) {
    showTab((location.hash || '#overview').slice(1), false);
  }

  refreshAll();
  setInterval(loadQuotes, 60000);
  setInterval(loadNews, 300000);
})();
