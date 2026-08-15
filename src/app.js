/* T2C client runtime. Reads its configuration from the #t2c-config JSON block the
   build emits, so tickers and names are never duplicated between data and script. */
(function () {
  'use strict';

  var cfgEl = document.getElementById('t2c-config');
  var CFG = cfgEl ? JSON.parse(cfgEl.textContent) : { tickers: [], names: {} };
  var WATCH = CFG.tickers || [];
  var NAMES = CFG.names || {};

  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= THEME ================= */
  // Dark is the default; the choice persists but never overrides prefers-reduced-motion.
  var themeBtn = $('themeBtn');
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    if (themeBtn) {
      themeBtn.textContent = t === 'dark' ? 'Light' : 'Dark';
      themeBtn.setAttribute('aria-label', 'Switch to ' + (t === 'dark' ? 'light' : 'dark') + ' theme');
    }
    if (typeof drawDist === 'function') drawDist();
  }
  try {
    var saved = localStorage.getItem('t2c-theme');
    if (saved === 'light' || saved === 'dark') applyTheme(saved);
  } catch (e) { /* storage blocked — dark default stands */ }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('t2c-theme', next); } catch (e) {}
    });
  }

  /* ================= TABS / DEEP LINKING =================
     Each view has a stable #hash so a state can be shared and reloaded. */
  var TABS = ['overview', 'ledger', 'intelligence', 'filings', 'capacity', 'odds'];
  function showTab(name, push) {
    if (TABS.indexOf(name) === -1) name = 'overview';
    TABS.forEach(function (t) {
      var sec = $('view-' + t);
      if (sec) sec.classList.toggle('hide', t !== name);
      var btn = document.querySelector('.tab[data-tab="' + t + '"]');
      if (btn) btn.setAttribute('aria-selected', String(t === name));
    });
    if (push && location.hash !== '#' + name) history.pushState({ tab: name }, '', '#' + name);
    if (name === 'odds' && typeof drawDist === 'function') drawDist();
    var head = document.querySelector('#view-' + name + ' h2');
    if (push && head) head.setAttribute('tabindex', '-1'), head.focus({ preventScroll: true });
  }
  document.querySelectorAll('.tab[data-tab]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); showTab(b.dataset.tab, true); });
    b.addEventListener('keydown', function (e) {
      var i = TABS.indexOf(b.dataset.tab), n = null;
      if (e.key === 'ArrowRight') n = TABS[(i + 1) % TABS.length];
      if (e.key === 'ArrowLeft') n = TABS[(i - 1 + TABS.length) % TABS.length];
      if (e.key === 'Home') n = TABS[0];
      if (e.key === 'End') n = TABS[TABS.length - 1];
      if (n) {
        e.preventDefault();
        showTab(n, true);
        var t = document.querySelector('.tab[data-tab="' + n + '"]');
        if (t) t.focus();
      }
    });
  });
  window.addEventListener('popstate', function () { showTab((location.hash || '#overview').slice(1), false); });
  if (document.querySelector('.tab[data-tab]')) showTab((location.hash || '#overview').slice(1), false);

  /* ================= COUNTRY ROWS ================= */
  document.querySelectorAll('.georow').forEach(function (el) {
    el.addEventListener('click', function () {
      var d = $('geo-' + el.dataset.geo);
      var open = el.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.georow').forEach(function (o) {
        if (o !== el) {
          o.setAttribute('aria-expanded', 'false');
          var od = $('geo-' + o.dataset.geo);
          if (od) od.classList.remove('open');
        }
      });
      el.setAttribute('aria-expanded', String(!open));
      if (d) d.classList.toggle('open', !open);
    });
  });

  /* ================= HERO FLOW =================
     A schematic of the delivery path — power in at the left, invoicing at the
     right — rather than a generic node cloud. Static single frame when the user
     prefers reduced motion. */
  (function () {
    var cv = $('flow');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    if (!ctx) return;
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), raf, t0 = performance.now();
    var STOPS = 5;

    function size() {
      var r = cv.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function laneY(i, n) { return H * (0.22 + 0.56 * (n === 1 ? 0.5 : i / (n - 1))); }

    function draw(now) {
      var el = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      var lanes = H > 200 ? 3 : 2;
      var pad = Math.min(70, W * 0.07);
      var span = W - pad * 2;

      for (var l = 0; l < lanes; l++) {
        var y = laneY(l, lanes);
        // rail
        ctx.strokeStyle = 'rgba(214,255,0,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
        // stage nodes
        for (var s = 0; s < STOPS; s++) {
          var x = pad + span * (s / (STOPS - 1));
          ctx.fillStyle = 'rgba(214,255,0,0.30)';
          ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
        }
        // a packet advancing stage to stage: secured -> permitted -> built -> energised -> invoicing
        if (!reduced) {
          var period = 9 + l * 2.3;
          var p = ((el + l * 2.7) % period) / period;
          var eased = p * p * (3 - 2 * p);
          var px = pad + span * eased;
          var grad = ctx.createLinearGradient(px - 46, 0, px, 0);
          grad.addColorStop(0, 'rgba(214,255,0,0)');
          grad.addColorStop(1, 'rgba(214,255,0,0.55)');
          ctx.strokeStyle = grad; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(Math.max(pad, px - 46), y); ctx.lineTo(px, y); ctx.stroke();
          ctx.fillStyle = 'rgba(214,255,0,0.92)';
          ctx.beginPath(); ctx.arc(px, y, 2.6, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    }
    size(); draw(performance.now());
    var ro = new ResizeObserver(function () {
      cancelAnimationFrame(raf); size(); draw(performance.now());
    });
    ro.observe(cv.parentElement);
  })();

  /* ================= LIVE FEEDS ================= */
  function setConn(id, st, label) {
    var n = $(id); if (!n) return;
    n.className = 'conn ' + (st === 'ok' ? 'ok' : st === 'off' ? 'off' : '');
    n.innerHTML = '<i aria-hidden="true"></i> ' + esc(label);
  }
  var emptyBlock = function (t, b) {
    return '<div class="empty"><h3>' + esc(t) + '</h3><p>' + b + '</p></div>';
  };
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
  var clock = function () {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  var LASTQ = {};

  function loadQuotes() {
    var wrap = $('quoteWrap');
    if (!wrap) return;
    wrap.innerHTML = '<div class="kpis">' + WATCH.map(function (s) {
      return '<div class="kpi"><div style="font-weight:800;font-size:12.5px">' + esc(s) +
        '</div><div class="skel" style="width:70%;height:19px"></div><div class="skel" style="width:45%"></div></div>';
    }).join('') + '</div>';

    api('/api/quote?symbols=' + WATCH.join(',')).then(function (d) {
      var q = d.quotes || {};
      wrap.innerHTML = '<div class="kpis">' + WATCH.map(function (s) {
        var v = q[s];
        if (!v || v.price == null) {
          return '<div class="kpi"><div style="font-weight:800;font-size:12.5px">' + esc(s) +
            '</div><div class="kv" style="font-size:21px">—</div><div class="kd">No data</div></div>';
        }
        var c = v.change > 0 ? 'var(--up)' : v.change < 0 ? 'var(--down)' : 'var(--ink)';
        var dir = v.change > 0 ? '▲' : v.change < 0 ? '▼' : '■';
        return '<div class="kpi"><div style="font-weight:800;font-size:12.5px">' + esc(s) + '</div>' +
          '<div class="kv" style="font-size:23px;margin-top:5px">$' + Number(v.price).toFixed(2) + '</div>' +
          '<div class="kl mono" style="color:' + c + '">' + dir + ' ' +
          Math.abs(Number(v.changePct || 0)).toFixed(2) + '%</div>' +
          '<div class="kd mono">' + (v.high != null ? 'H ' + Number(v.high).toFixed(2) + ' · L ' + Number(v.low).toFixed(2) : '') + '</div></div>';
      }).join('') + '</div>';
      if ($('quoteMeta')) $('quoteMeta').textContent = 'Updated ' + clock();
      setConn('cQuote', 'ok', 'Prices live');
      drawTape(q);
      LASTQ = q;
      syncTicker(false);
    }).catch(function () {
      wrap.innerHTML = emptyBlock('Prices unavailable',
        'The quote feed did not respond. Every other panel on this page is static data and is unaffected.');
      if ($('quoteMeta')) $('quoteMeta').textContent = 'Offline';
      setConn('cQuote', 'off', 'Prices off');
      drawTape(null);
      syncTicker(false);
    });
  }

  function drawTape(q) {
    var el = $('tape'); if (!el) return;
    var cell = function (s) {
      var v = q && q[s];
      if (!v || v.price == null) return '<span class="tk"><b>' + esc(s) + '</b><span class="p">—</span></span>';
      var cls = v.change > 0 ? 'u' : v.change < 0 ? 'd' : 'p';
      var dir = v.change > 0 ? '▲' : v.change < 0 ? '▼' : '';
      return '<span class="tk"><b>' + esc(s) + '</b><span class="p">$' + Number(v.price).toFixed(2) +
        '</span><span class="' + cls + '">' + dir + Math.abs(Number(v.changePct || 0)).toFixed(2) + '%</span></span>';
    };
    var once = WATCH.map(cell).join('');
    el.innerHTML = once + once;
  }

  /* ---- Intelligence ---- */
  var NEWS = [], newsFilter = 'ALL';
  var thumb = function (n) {
    return n.image
      ? '<span class="nthumb"><img src="' + esc(n.image) + '" alt="" loading="lazy" ' +
        'referrerpolicy="no-referrer" onerror="this.parentElement.remove()" /></span>'
      : '';
  };
  function newsCard(n) {
    return '<a class="ncard" href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
      thumb(n) +
      '<span class="nbody"><span class="hl">' + esc(n.headline) + '</span>' +
      '<span class="mt">' +
      (n.symbols || []).slice(0, 3).map(function (s) { return '<span class="symp">' + esc(s) + '</span>'; }).join('') +
      '<span class="srcpill">' + esc(n.source || 'Unattributed') + '</span>' +
      (n.datetime && (Date.now() - n.datetime * 1000) < 7200000
        ? '<span class="fresh"><i aria-hidden="true"></i>' + esc(ago(n.datetime)) + '</span>'
        : '<span>' + esc(ago(n.datetime)) + '</span>') +
      '</span></span></a>';
  }
  function renderNews() {
    var items = newsFilter === 'ALL' ? NEWS : NEWS.filter(function (n) {
      return (n.symbols || []).indexOf(newsFilter) !== -1;
    });
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
        return '<button class="fchip" type="button" data-f="' + esc(s) + '" aria-pressed="' +
          (s === 'ALL') + '">' + (s === 'ALL' ? 'All stories' : esc(s)) + '</button>';
      }).join('');
      f.querySelectorAll('.fchip').forEach(function (b) {
        b.addEventListener('click', function () {
          f.querySelectorAll('.fchip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          newsFilter = b.dataset.f;
          renderNews();
        });
      });
    }
    api('/api/news?symbols=' + WATCH.join(',')).then(function (d) {
      NEWS = d.items || [];
      if ($('newsMeta')) $('newsMeta').textContent = NEWS.length + ' stories · ' + clock();
      setConn('cNews', 'ok', 'News live');
      renderNews();
    }).catch(function () {
      var m = emptyBlock('Intelligence feed unavailable',
        'The news route did not respond. Capacity, contracts and the ledger are static data and are unaffected.');
      if ($('newsHero')) $('newsHero').innerHTML = '';
      if (list) list.innerHTML = m;
      if (mini) mini.innerHTML = m;
      if ($('newsMeta')) $('newsMeta').textContent = 'Offline';
      setConn('cNews', 'off', 'News off');
    });
  }

  /* ---- Filings ---- */
  // "8-K — 8-K" was the old output whenever EDGAR gave no primaryDocDescription.
  // Fall back through description -> company -> a plain form description.
  var FORM_MEANING = {
    '8-K': 'Material event report',
    '10-Q': 'Quarterly report',
    '10-K': 'Annual report',
    'S-1': 'Registration statement',
    '424B5': 'Prospectus supplement',
    'SC 13D': 'Activist ownership stake',
    'SC 13G': 'Passive ownership stake'
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
      list.innerHTML = items.length
        ? '<div class="newsgrid">' + items.slice(0, 48).map(function (f) {
          return '<a class="ncard" href="' + esc(f.url) + '" target="_blank" rel="noopener">' +
            '<span class="nbody">' +
            '<span class="hl">' + esc(filingTitle(f)) + '</span>' +
            '<span class="mt"><span class="symp">' + esc(f.symbol) + '</span>' +
            '<span class="srcpill">' + esc(f.form) + '</span>' +
            '<span class="srcpill">SEC EDGAR</span><span>' + esc(f.filed) + '</span></span>' +
            '<span class="whatchanged">What changed — awaiting structured summary</span>' +
            '</span></a>';
        }).join('') + '</div>'
        : emptyBlock('No recent filings', 'Nothing new from these companies in the window queried.');
      if ($('filingMeta')) $('filingMeta').textContent = items.length + ' filings · ' + clock();
      setConn('cFilings', 'ok', 'Filings live');
    }).catch(function () {
      list.innerHTML = emptyBlock('Filings feed unavailable',
        'The EDGAR route did not respond. Capacity and ledger data are unaffected.');
      if ($('filingMeta')) $('filingMeta').textContent = 'Offline';
      setConn('cFilings', 'off', 'Filings off');
    });
  }

  /* ================= ODDS ================= */
  var SQ2PI = Math.sqrt(2 * Math.PI);
  function normCdf(x) {
    if (!isFinite(x)) return x > 0 ? 1 : 0;
    var t = 1 / (1 + 0.2316419 * Math.abs(x)), d = Math.exp(-x * x / 2) / SQ2PI;
    var p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return x > 0 ? 1 - p : p;
  }
  var normPdf = function (x) { return Math.exp(-x * x / 2) / SQ2PI; };
  function touchProb(S0, B, s, T, mu) {
    if (T <= 0 || s <= 0) return 0;
    var m = mu - 0.5 * s * s, b = Math.log(B / S0), sT = s * Math.sqrt(T);
    var p = B > S0
      ? normCdf((m * T - b) / sT) + Math.exp(2 * m * b / (s * s)) * normCdf((-b - m * T) / sT)
      : normCdf((b - m * T) / sT) + Math.exp(2 * m * b / (s * s)) * normCdf((b + m * T) / sT);
    return clamp(p, 0, 1);
  }
  function probAbove(S0, K, s, T, mu) {
    if (T <= 0) return S0 > K ? 1 : 0;
    var m = mu - 0.5 * s * s;
    return normCdf((Math.log(S0 / K) + m * T) / (s * Math.sqrt(T)));
  }
  var qt = function (S0, s, T, mu, z) { return S0 * Math.exp((mu - 0.5 * s * s) * T + z * s * Math.sqrt(T)); };

  var VOL_BASE = { IREN: 90, CRWV: 85, NBIS: 75, WULF: 95, KEEL: 100, APLD: 85, CIFR: 90, NVDA: 45 };
  var DIRTY = { spot: false, target: false, vol: false, date: false };

  // Parkinson estimator from the day's range. A single session is noisy — a quiet
  // day put NVDA at 15%, less than half its real level — so it is blended toward
  // the ticker's typical figure rather than trusted alone.
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
  var isoIn = function (d) { return new Date(Date.now() + d * 86400000).toISOString().slice(0, 10); };

  function syncTicker(reset) {
    if (!$('inTicker')) return;
    var t = $('inTicker').value, v = LASTQ[t], live = !!(v && v.price != null);
    if (reset) DIRTY = { spot: false, target: false, vol: false, date: false };

    if (live && !DIRTY.spot) $('inSpot').value = Number(v.price).toFixed(2);
    else if (reset && !live) $('inSpot').value = '';

    var base = VOL_BASE[t] || 80;
    var est = live ? estVol(v, base) : null;
    if (!DIRTY.vol) $('inVol').value = est == null ? base : est;
    $('volTag').textContent = DIRTY.vol ? 'Your figure'
      : est != null ? 'Today’s range + typical' : 'Typical for this share';

    if (!DIRTY.date && (reset || !$('inDate').value)) $('inDate').value = isoIn(90);

    var spot = +$('inSpot').value;
    if (!DIRTY.target && spot > 0) $('inTarget').value = niceTarget(spot, +$('inVol').value || base);

    $('spotTag').innerHTML = live
      ? '<span class="livetag on"><i aria-hidden="true"></i>Live' + (DIRTY.spot ? ' · overridden' : '') + '</span>'
      : '<span class="livetag">Prices offline — type one</span>';
    $('resyncBtn').disabled = !(DIRTY.spot || DIRTY.target || DIRTY.vol || DIRTY.date);
    drawOdds();
  }

  var DIST = {};
  function drawOdds() {
    if (!$('inSpot')) return;
    var S0 = +$('inSpot').value, B = +$('inTarget').value;
    var s = (+$('inVol').value) / 100, mu = (+$('inDrift').value) / 100;
    var days = Math.round((new Date($('inDate').value + 'T21:00:00Z') - new Date()) / 86400000);
    var T = days / 365.25;
    if (T <= 0 || !(S0 > 0) || !(B > 0)) {
      $('bigOdds').textContent = '—';
      $('oddsBar').style.width = '0%';
      $('oddsPlain').textContent = 'Pick a date in the future and check the price.';
      $('oddsTable').innerHTML = ''; $('stepsBox').innerHTML = '';
      return;
    }
    var pt = touchProb(S0, B, s, T, mu);
    var pc = B > S0 ? probAbove(S0, B, s, T, mu) : 1 - probAbove(S0, B, s, T, mu);
    var med = qt(S0, s, T, mu, 0), lo = qt(S0, s, T, mu, -1), hi = qt(S0, s, T, mu, 1);
    var half = 1 - probAbove(S0, S0 * 0.5, s, T, mu);
    var mv = (B / S0 - 1) * 100, sT = s * Math.sqrt(T), sd = Math.log(B / S0) / sT;
    var tick = $('inTicker').value;

    $('qLine').textContent = 'Touching $' + B + ' before ' +
      new Date($('inDate').value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    $('oddsTicker').innerHTML = '<span class="mono"><b>' + esc(tick) + '</b> $' + S0.toFixed(2) +
      ' → $' + B + ' · ' + days + 'd</span>';
    $('bigOdds').textContent = (pt * 100).toFixed(0) + '%';
    $('oddsBar').style.width = (pt * 100) + '%';
    var w = pt > 0.7 ? 'comfortably more likely than not' : pt > 0.55 ? 'slightly more likely than not'
      : pt > 0.45 ? 'close to a coin flip' : pt > 0.25 ? 'possible, but against the odds' : 'a long shot';
    $('oddsPlain').innerHTML = 'A <b>' + (mv > 0 ? 'rise' : 'fall') + ' of ' + Math.abs(mv).toFixed(0) +
      '%</b> in <b>' + days + ' days</b> at ' + (s * 100).toFixed(0) + '% volatility. That is <b>' + w +
      '</b> — out of 100 parallel worlds it would touch $' + B + ' in about <b>' + Math.round(pt * 100) + '</b>.';
    $('oddsTable').innerHTML = '<caption class="sr">Derived probabilities for ' + esc(tick) + '</caption><tbody>' +
      '<tr><td>Finishes above target</td><td>' + (pc * 100).toFixed(0) + '%</td></tr>' +
      '<tr><td>Most likely price</td><td>$' + med.toFixed(2) + '</td></tr>' +
      '<tr><td>Normal range, 2 in 3</td><td>$' + lo.toFixed(0) + ' – $' + hi.toFixed(0) + '</td></tr>' +
      '<tr><td>Chance it halves</td><td style="color:' + (half > 0.2 ? 'var(--bad)' : 'inherit') + '">' +
      (half * 100).toFixed(0) + '%</td></tr>' +
      '<tr><td>Days remaining</td><td>' + days + '</td></tr></tbody>';

    $('stepsBox').innerHTML = [
      ['Measure the distance',
        'How far the price has to travel, in percentage terms rather than dollars — a $10 move matters far more on a $20 share than a $200 one.',
        '$' + S0.toFixed(2) + ' → $' + B + ' = ' + (mv > 0 ? '+' : '') + mv.toFixed(1) + '%'],
      ['Measure the time',
        'Volatility is quoted per year, so the deadline is converted into a fraction of a year to match.',
        days + ' days = ' + T.toFixed(3) + ' of a year'],
      ['Shrink volatility to the window',
        'A share that swings ' + (s * 100).toFixed(0) + '% over a year does not swing that much over ' + days +
        ' days. Volatility scales with the square root of time.',
        (s * 100).toFixed(0) + '% × √' + T.toFixed(3) + ' = ' + (sT * 100).toFixed(1) + '% over the window'],
      ['Compare the two',
        'Distance divided by window volatility gives how many typical swings away the target sits. Under one is reachable; over two is a stretch.',
        Math.abs(mv).toFixed(1) + '% ÷ ' + (sT * 100).toFixed(1) + '% ≈ ' + Math.abs(sd).toFixed(2) + ' swings away'],
      ['Allow for touching, not just finishing',
        'A price that reaches $' + B + ' and falls straight back still counts. For every path ending above the target there is a mirror path that touched and returned.',
        'finishes above ' + (pc * 100).toFixed(0) + '% → touches ' + (pt * 100).toFixed(0) + '%'],
      ['Sense-check it',
        'Your drift of ' + (mu * 100).toFixed(0) + '%/yr moves the distribution ' +
        (mu > 0 ? 'up' : mu < 0 ? 'down' : 'not at all') + '. This assumes the share wobbles steadily and never gaps on news, which real shares do constantly.',
        'final answer ' + (pt * 100).toFixed(0) + '%']
    ].map(function (r) {
      return '<div class="step"><div class="no"></div><div><h4>' + esc(r[0]) + '</h4><p>' + esc(r[1]) +
        '</p><span class="calc">' + esc(r[2]) + '</span></div></div>';
    }).join('');

    DIST = { S0: S0, B: B, s: s, T: T, mu: mu, pt: pt, lo: lo, hi: hi, med: med, tick: tick };
    drawDist();
  }

  function drawDist() {
    var el = $('distChart'); if (!el) return;
    // Deep-linking straight to #odds calls this during boot, before drawOdds has
    // populated DIST — the var is hoisted but still undefined at that point.
    if (!DIST || !DIST.S0) { el.innerHTML = ''; return; }
    var S0 = DIST.S0, B = DIST.B, s = DIST.s, T = DIST.T, mu = DIST.mu;
    var W = 720, H = 240, pl = 8, pr = 8, ptop = 18, pb = 32;
    var lo = Math.log(S0 * 0.25), hi = Math.log(S0 * 3.2);
    var x = function (lp) { return pl + (lp - lo) / (hi - lo) * (W - pl - pr); };
    var m = mu - 0.5 * s * s, mean = Math.log(S0) + m * T, sd = s * Math.sqrt(T);
    var base = H - pb, amp = H - ptop - pb;
    var css = getComputedStyle(document.documentElement);
    var ok = css.getPropertyValue('--ok').trim() || '#2E9B52';
    var dim = css.getPropertyValue('--dim').trim() || '#888';
    var ink = css.getPropertyValue('--ink').trim() || '#000';
    var line = css.getPropertyValue('--line-2').trim() || '#ddd';

    var pts = [];
    for (var i = 0; i <= 240; i++) {
      var lp = lo + (hi - lo) * i / 240;
      pts.push([x(lp), base - normPdf((lp - mean) / sd) * amp]);
    }
    var xb = x(Math.log(B)), xs = x(Math.log(S0));
    var cut = pts.findIndex(function (p) { return p[0] >= xb; });
    var right = cut < 0 ? [] : pts.slice(cut);

    var sv = '';
    var step = S0 > 100 ? 50 : S0 > 40 ? 20 : 10;
    for (var v = step; v < S0 * 3.2; v += step) {
      if (Math.log(v) < lo || Math.log(v) > hi) continue;
      var px = x(Math.log(v));
      sv += '<line x1="' + px + '" y1="' + ptop + '" x2="' + px + '" y2="' + base + '" stroke="' + line + '" stroke-width="1"/>';
      sv += '<text x="' + px + '" y="' + (base + 15) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="10" fill="' + dim + '">' + v + '</text>';
    }
    sv += '<path d="M ' + pts[0][0] + ' ' + base + ' ' + pts.map(function (p) { return 'L ' + p[0] + ' ' + p[1]; }).join(' ') +
      ' L ' + pts[pts.length - 1][0] + ' ' + base + ' Z" fill="' + dim + '" opacity=".16"/>';
    if (right.length) {
      sv += '<path d="M ' + right[0][0] + ' ' + base + ' ' + right.map(function (p) { return 'L ' + p[0] + ' ' + p[1]; }).join(' ') +
        ' L ' + right[right.length - 1][0] + ' ' + base + ' Z" fill="' + ok + '" opacity=".5"/>';
    }
    sv += '<path d="M ' + pts.map(function (p) { return p.join(' '); }).join(' L ') + '" fill="none" stroke="' + ink + '" stroke-width="1.6" opacity=".8"/>';
    sv += '<line x1="' + xs + '" y1="' + (ptop - 4) + '" x2="' + xs + '" y2="' + base + '" stroke="' + dim + '" stroke-width="1.5" stroke-dasharray="3 3"/>';
    sv += '<text x="' + xs + '" y="' + (ptop - 6) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" font-weight="700" fill="' + dim + '">now $' + S0.toFixed(2) + '</text>';
    sv += '<line x1="' + xb + '" y1="' + (ptop - 4) + '" x2="' + xb + '" y2="' + base + '" stroke="' + ok + '" stroke-width="2.5"/>';
    sv += '<text x="' + xb + '" y="' + (ptop - 6) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" font-weight="700" fill="' + ink + '">target $' + B + '</text>';
    el.innerHTML = sv;

    var summary = $('distSummary');
    if (summary) {
      summary.textContent = 'Distribution of possible prices for ' + DIST.tick + ' on the deadline. Today $' +
        S0.toFixed(2) + ', target $' + B + '. Two thirds of outcomes fall between $' + DIST.lo.toFixed(0) +
        ' and $' + DIST.hi.toFixed(0) + ', with a central estimate of $' + DIST.med.toFixed(2) +
        '. The shaded area right of the target is the ' + (probAbove(S0, B, s, T, mu) * 100).toFixed(0) +
        '% of outcomes finishing above it.';
    }
  }

  /* ---- terms ---- */
  var TERMS = {
    'Volatility': 'How much a share price swings in a typical year, as a percentage. A supermarket might be 15%. An AI infrastructure share can be 90% or more. Higher volatility widens the range of outcomes in both directions — it is not a forecast of which way.',
    'Drift': 'Your own view of where the share is heading over a year, before any of the wobble. Zero means you have no directional opinion. Notice how little it changes the answer compared with volatility.',
    'Touching': 'The price reaches your target at any moment before the deadline, even for a second, even if it falls straight back. Always more likely than finishing above.',
    'Finishing above': 'The price is still above your target on the deadline day itself. A stricter test, and usually about half as likely as touching.',
    'Typical swings away': 'How far the target sits from today’s price, in units of how much the share normally moves over that window. Under 1 is within reach. Over 2 is a stretch.',
    'Normal range': 'The band the price lands in roughly two times out of three. The other third of the time it lands outside — which is the part people forget.',
    'Square root of time': 'Volatility does not scale straight with time. Four times the time gives only twice the swing. It is why a target that looks impossible in a week can be reasonable in a quarter.',
    'Chance it halves': 'The probability the share loses half its value by the deadline. Included because upside targets get all the attention and this one decides how much you can afford to hold.'
  };
  var chips = $('termChips');
  if (chips) {
    chips.innerHTML = Object.keys(TERMS).map(function (k, i) {
      return '<button class="term" type="button" data-t="' + esc(k) + '" aria-pressed="' + (i === 0) + '">' + esc(k) + '</button>';
    }).join('');
    var showTerm = function (k) {
      $('termDef').innerHTML = '<b>' + esc(k) + '</b> — ' + esc(TERMS[k]);
      chips.querySelectorAll('.term').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.t === k));
      });
    };
    chips.querySelectorAll('.term').forEach(function (b) {
      b.addEventListener('click', function () { showTerm(b.dataset.t); });
    });
    showTerm(Object.keys(TERMS)[0]);
  }

  if ($('inTicker')) {
    $('inTicker').innerHTML = WATCH.map(function (s) {
      return '<option value="' + esc(s) + '">' + esc(s) + ' — ' + esc(NAMES[s] || s) + '</option>';
    }).join('');
    Object.keys({ inSpot: 'spot', inTarget: 'target', inVol: 'vol', inDate: 'date' }).forEach(function (id) {
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

  /* ================= BOOT ================= */
  function refreshAll() { loadQuotes(); loadNews(); loadFilings(); }
  var rb = $('refreshBtn');
  if (rb) rb.addEventListener('click', refreshAll);
  refreshAll();
  setInterval(loadQuotes, 60000);
  setInterval(loadNews, 300000);
})();
