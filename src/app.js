/* T2C client runtime.
   Route-aware: each page runs only the controllers it needs. Configuration comes
   from the #t2c-config block the build emits. */
(function () {
  'use strict';

  var CFG = (function () {
    var el = document.getElementById('t2c-config');
    try { return el ? JSON.parse(el.textContent) : {}; } catch (e) { return {}; }
  })();
  var WATCH = CFG.tickers || [];
  var NAMES = CFG.names || {};
  var MAX_COMPARE = CFG.maxCompare || 3;
  var ROUTE = CFG.route || 'today';

  var $ = function (id) { return document.getElementById(id); };
  var qsa = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ND = 'Not disclosed';

  /* ============ legacy hashes ============
     The old build was one page with #tabs. Anything indexed or bookmarked must
     still land somewhere sensible, so a known hash redirects to its route. */
  (function () {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return;
    var target = (CFG.hashRoutes || {})[h];
    if (!target) return;
    var here = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
    if (here === target.split('#')[0]) return;   // already on the right route
    location.replace(target);
  })();

  /* ============ analytics ============
     Anonymous, no vendor, no identifiers. Events land on window.t2cEvents. */
  window.t2cEvents = window.t2cEvents || [];
  function track(name, detail) {
    var evt = { name: name, at: new Date().toISOString(), detail: detail || {} };
    window.t2cEvents.push(evt);
    if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: 't2c_' + name, t2c: evt.detail });
  }

  /* ============ theme ============ */
  var themeBtn = $('themeBtn');
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    if (themeBtn) {
      themeBtn.textContent = t === 'dark' ? 'Light theme' : 'Dark theme';
      themeBtn.setAttribute('aria-label', 'Switch to ' + (t === 'dark' ? 'light' : 'dark') + ' theme');
    }
    if (window.__t2cRedrawCharts) window.__t2cRedrawCharts();
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

  /* ============ visit window ============
     "Since last visit" needs the timestamp of the PREVIOUS session, and it must
     survive moving between pages within this one. Two rules follow:

       1. The comparison point is frozen in sessionStorage the first time a page
          renders in this session, so every page in the session compares against
          the same moment rather than against three seconds ago.
       2. The stored last-visit timestamp is only advanced AFTER a page has
          rendered. A reader who opens the site and closes it before anything
          appears has not "visited", and must not lose their window. */
  var SINCE = null;
  var FIRST_VISIT = false;
  (function visitWindow() {
    var LAST = 't2c-last-visit', MARK = 't2c-session-since';
    var frozen = null;
    try { frozen = sessionStorage.getItem(MARK); } catch (e) {}

    if (frozen !== null) {
      SINCE = frozen || null;
      return;
    }
    var prev = null;
    try { prev = localStorage.getItem(LAST); } catch (e) {}
    SINCE = prev || null;
    FIRST_VISIT = !prev;

    // Freeze this session's comparison point, then advance the stored visit only
    // once the page has actually painted.
    var commit = function () {
      try {
        sessionStorage.setItem(MARK, SINCE || '');
        localStorage.setItem(LAST, new Date().toISOString());
      } catch (e) {}
    };
    if (document.readyState === 'complete') requestAnimationFrame(commit);
    else window.addEventListener('load', function () { requestAnimationFrame(commit); });
  })();

  /* ============ FEED AND MARKET STATE ============
     Three separate facts, never conflated:
       1. has the request finished — loading / ok / failed
       2. is the market open — the session comes from the server
       3. how old is the price — live / delayed / last close / cached
     "Live" appears only during a regular session, and the pill says "Updating…"
     before the first request resolves rather than claiming the feed is offline. */
  var FEED = {
    status: 'loading', session: null, lastTradeIso: null,
    lastSuccessAt: null, realtime: false, usingCache: false
  };

  function priceQualifier() {
    if (FEED.status === 'loading') return 'Updating…';
    if (FEED.status === 'failed') return FEED.usingCache ? 'Cached price' : 'Unavailable';
    if (!FEED.session) return 'Price';
    if (FEED.session.isOpen) return FEED.realtime ? 'Live' : 'Delayed';
    if (FEED.session.isExtended) return 'Extended hours';
    return 'Last close';
  }

  function fmtEt(iso) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        timeZone: 'America/New_York'
      }) + ' ET';
    } catch (e) { return null; }
  }

  function renderMarketState() {
    var el = $('marketState');
    if (el) {
      var cls = 'mstate', text;
      if (FEED.status === 'loading') { cls += ' is-loading'; text = 'Updating…'; }
      else if (FEED.status === 'failed') {
        cls += ' is-off';
        text = FEED.usingCache ? 'Cached · feed offline' : 'Feed offline';
      } else {
        cls += FEED.session && FEED.session.isOpen ? ' is-open' : ' is-closed';
        text = (FEED.session ? FEED.session.label : 'Market');
        if (FEED.lastTradeIso && FEED.session && !FEED.session.isOpen) {
          text += ' · Last trade ' + fmtEt(FEED.lastTradeIso);
        }
      }
      el.className = cls;
      el.innerHTML = '<i aria-hidden="true"></i><span class="mstate-text">' + esc(text) + '</span>';
    }

    var detail = $('feedDetail');
    if (detail) {
      var lines = ['Status: ' + (FEED.status === 'ok' ? 'online' : FEED.status === 'loading' ? 'updating' : 'offline')];
      if (FEED.session) lines.push('Market: ' + FEED.session.label + ' (' + FEED.session.timezone + ')');
      if (FEED.lastTradeIso) lines.push('Last trade: ' + fmtEt(FEED.lastTradeIso));
      if (FEED.lastSuccessAt) lines.push('Last refresh: ' + fmtEt(FEED.lastSuccessAt));
      lines.push('Provider: Finnhub' + (FEED.realtime ? '' : ' — quotes may be delayed'));
      detail.innerHTML = lines.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('');
    }
  }

  /* ============ quotes ============ */
  var LASTQ = {};
  try {
    var cachedQ = JSON.parse(sessionStorage.getItem('t2c-quotes') || 'null');
    // A cached quote beats a blank cell — but it is always labelled as cached.
    if (cachedQ && cachedQ.quotes) { LASTQ = cachedQ.quotes; FEED.usingCache = true; }
  } catch (e) {}

  function api(p) {
    return fetch(p, { headers: { accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function loadQuotes() {
    if (FEED.status !== 'ok') { FEED.status = 'loading'; renderMarketState(); }
    return api('/api/quote?symbols=' + WATCH.join(','))
      .then(function (d) {
        LASTQ = d.quotes || {};
        FEED.status = 'ok';
        FEED.usingCache = false;
        FEED.session = d.session || null;
        FEED.realtime = !!(d.feed && d.feed.realtime);
        FEED.lastSuccessAt = new Date().toISOString();
        var stamps = WATCH.map(function (s) { return LASTQ[s] && LASTQ[s].lastTradeAt; }).filter(Boolean).sort();
        FEED.lastTradeIso = stamps.length ? stamps[stamps.length - 1] : null;
        try { sessionStorage.setItem('t2c-quotes', JSON.stringify({ quotes: LASTQ, at: FEED.lastSuccessAt })); } catch (e) {}
        renderMarketState(); paintPrices();
      })
      .catch(function () {
        // A transient failure must never blank prices that were valid a moment ago.
        FEED.status = 'failed';
        FEED.usingCache = Object.keys(LASTQ).length > 0;
        renderMarketState(); paintPrices();
      });
  }

  function paintPrices() {
    qsa('[data-price]').forEach(function (el) {
      var v = LASTQ[el.getAttribute('data-price')];
      if (!v || v.price == null) {
        el.innerHTML = '<span class="nd">' + (FEED.status === 'loading' ? '—' : 'Unavailable') + '</span>';
        return;
      }
      var col = v.change > 0 ? 'var(--up)' : v.change < 0 ? 'var(--down)' : 'var(--dim)';
      var dir = v.change > 0 ? '▲' : v.change < 0 ? '▼' : '■';
      el.innerHTML = '<span class="pxval">$' + Number(v.price).toFixed(2) + '</span>' +
        '<span class="pxchg" style="color:' + col + '">' + dir + ' ' +
        Math.abs(Number(v.changePct || 0)).toFixed(2) + '%</span>' +
        '<span class="pxqual">' + esc(priceQualifier()) + '</span>';
    });
  }

  var rb = $('refreshBtn');
  if (rb) rb.addEventListener('click', function () { loadQuotes(); track('data_refreshed', {}); });

  /* ============ hero flow — homepage only ============ */
  if (ROUTE === 'today') {
    var cv = $('flow');
    if (cv && cv.getContext) {
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), raf, t0 = performance.now();
      var size = function () {
        var r = cv.parentElement.getBoundingClientRect();
        W = r.width; H = r.height;
        cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      var draw = function (now) {
        var el = (now - t0) / 1000;
        ctx.clearRect(0, 0, W, H);
        var lanes = H > 220 ? 3 : 2, pad = Math.min(80, W * 0.08), span = W - pad * 2;
        for (var l = 0; l < lanes; l++) {
          var y = H * (0.26 + 0.48 * (lanes === 1 ? 0.5 : l / (lanes - 1)));
          ctx.strokeStyle = 'rgba(214,255,0,0.07)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
          for (var s = 0; s < 5; s++) {
            var x = pad + span * (s / 4);
            ctx.fillStyle = 'rgba(214,255,0,0.2)';
            ctx.fillRect(x - 2, y - 2, 4, 4);
          }
          if (!reduced) {
            var period = 11 + l * 2.6, p = ((el + l * 3.4) % period) / period;
            var px = pad + span * (p * p * (3 - 2 * p));
            var g = ctx.createLinearGradient(px - 50, 0, px, 0);
            g.addColorStop(0, 'rgba(214,255,0,0)'); g.addColorStop(1, 'rgba(214,255,0,0.4)');
            ctx.strokeStyle = g; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(Math.max(pad, px - 50), y); ctx.lineTo(px, y); ctx.stroke();
            ctx.fillStyle = 'rgba(214,255,0,0.85)';
            ctx.beginPath(); ctx.arc(px, y, 2.4, 0, Math.PI * 2); ctx.fill();
          }
        }
        if (!reduced) raf = requestAnimationFrame(draw);
      };
      size(); draw(performance.now());
      new ResizeObserver(function () { cancelAnimationFrame(raf); size(); draw(performance.now()); })
        .observe(cv.parentElement);
    }
  }

  /* ============ companies directory ============ */
  if (ROUTE === 'companies') {
    var grid = $('companyGrid');
    var cards = grid ? qsa('#companyGrid .snap') : [];
    var applyCo = function () {
      var q = (($('coSearch') || {}).value || '').toLowerCase();
      var model = ($('coModel') || {}).value || '';
      var stage = ($('coStage') || {}).value || '';
      var shown = 0;
      cards.forEach(function (card) {
        var ok = (!q || card.textContent.toLowerCase().indexOf(q) !== -1) &&
                 (!model || card.getAttribute('data-model') === model) &&
                 (!stage || card.getAttribute('data-stage') === stage);
        card.hidden = !ok;
        if (ok) shown++;
      });
      var c = $('coCount');
      if (c) c.textContent = shown + (shown === 1 ? ' company' : ' companies') + ' shown';
    };
    ['coSearch', 'coModel', 'coStage'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', applyCo);
      el.addEventListener('change', applyCo);
    });

    var sortSel = $('coSort');
    if (sortSel && cards.length) {
      var host = cards[0].parentElement;
      sortSel.addEventListener('change', function () {
        var key = sortSel.value;
        cards.slice().sort(function (a, b) {
          if (key === 'name') return (a.getAttribute('data-name') || '').localeCompare(b.getAttribute('data-name') || '');
          return parseFloat(b.getAttribute('data-' + key) || '-1') - parseFloat(a.getAttribute('data-' + key) || '-1');
        }).forEach(function (n) { host.appendChild(n); });
      });
    }
  }

  /* ============ sites directory ============ */
  if (ROUTE === 'sites') {
    var siteCards = qsa('#siteGrid .sitecard');
    var applySite = function () {
      var q = (($('siteSearch') || {}).value || '').toLowerCase().trim();
      var co = ($('siteCompany') || {}).value || '';
      var country = ($('siteCountry') || {}).value || '';
      var stage = ($('siteStage') || {}).value || '';
      var shown = 0;
      siteCards.forEach(function (card) {
        var ok = (!q || (card.getAttribute('data-search') || '').indexOf(q) !== -1) &&
                 (!co || card.getAttribute('data-company') === co) &&
                 (!country || card.getAttribute('data-country') === country) &&
                 (!stage || card.getAttribute('data-stage') === stage);
        card.hidden = !ok;
        if (ok) shown++;
      });
      var c = $('siteCount');
      if (c) c.textContent = shown + (shown === 1 ? ' site' : ' sites') + ' shown';
      // The filter state belongs in the URL so a back navigation restores it.
      var p = new URLSearchParams();
      if (q) p.set('q', q);
      if (co) p.set('operator', co);
      if (country) p.set('country', country);
      if (stage) p.set('stage', stage);
      var qs = p.toString();
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    };
    var siteIds = ['siteSearch', 'siteCompany', 'siteCountry', 'siteStage'];
    siteIds.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', applySite);
      el.addEventListener('change', applySite);
    });
    // Restore whatever the reader had selected before they opened a site.
    (function restoreSites() {
      var p = new URLSearchParams(location.search);
      var map = { q: 'siteSearch', operator: 'siteCompany', country: 'siteCountry', stage: 'siteStage' };
      var any = false;
      Object.keys(map).forEach(function (k) {
        var v = p.get(k);
        var el = $(map[k]);
        if (v && el) { el.value = v; any = true; }
      });
      if (any) applySite();
    })();
  }

  /* ============ intelligence ============
     Reviewed state is this reader's own and stays in this browser. It records an
     id and nothing else — not what the signal said, not when it was read. */
  var REVIEW_KEY = 't2c-reviewed';
  var readReviewed = function () {
    try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || '[]'); } catch (e) { return []; }
  };
  var writeReviewed = function (list) {
    try { localStorage.setItem(REVIEW_KEY, JSON.stringify(list.slice(-400))); } catch (e) {}
  };

  if (ROUTE === 'intelligence') {
    var reviewed = readReviewed();

    var paintReviewed = function () {
      qsa('.sig[data-id]').forEach(function (row) {
        var on = reviewed.indexOf(row.getAttribute('data-id')) !== -1;
        row.classList.toggle('is-reviewed', on);
        var btn = row.querySelector('[data-review]');
        if (btn) {
          btn.setAttribute('aria-pressed', String(on));
          btn.textContent = on ? 'Reviewed' : 'Mark reviewed';
        }
      });
      // The daily set is finite, so "caught up" is a state that can be reached.
      var todayRows = qsa('#todayset .sig[data-id]');
      var left = todayRows.filter(function (r) { return !r.classList.contains('is-reviewed'); }).length;
      var counter = $('reviewCount');
      if (counter) counter.textContent = left ? left + ' to review' : 'All reviewed';
      var cu = $('caughtUp');
      var list = document.querySelector('#todayset .siglist');
      if (cu && todayRows.length) {
        cu.hidden = left !== 0;
        if (list) list.hidden = left === 0;
      }
    };

    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-review]') : null;
      if (!btn) return;
      var id = btn.getAttribute('data-review');
      var at = reviewed.indexOf(id);
      if (at === -1) reviewed.push(id); else reviewed.splice(at, 1);
      writeReviewed(reviewed);
      paintReviewed();
      track('signal_reviewed', { reviewed: at === -1 });
    });

    var applyCat = function (cat) {
      qsa('#signalAll .sig').forEach(function (row) {
        row.hidden = !!cat && row.getAttribute('data-cat') !== cat;
      });
      qsa('.sigfilter').forEach(function (b) {
        b.setAttribute('aria-pressed', String((b.getAttribute('data-cat') || '') === cat));
      });
      var p = new URLSearchParams(location.search);
      if (cat) p.set('change', cat); else p.delete('change');
      var qs = p.toString();
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    };

    qsa('.sigfilter').forEach(function (b) {
      b.addEventListener('click', function () { applyCat(b.getAttribute('data-cat') || ''); });
    });

    (function initIntel() {
      var p = new URLSearchParams(location.search);
      var cat = p.get('change');
      if (cat) applyCat(cat);

      // ?view=since-last-visit narrows the ledger to what is new for this reader.
      var view = p.get('view');
      if (view === 'since-last-visit') {
        var head = document.querySelector('#all .blockmeta');
        if (!SINCE) {
          // No previous visit on record. Showing "0 new" would be a lie about the
          // ledger rather than a statement about this browser.
          if (head) head.textContent = 'First visit — showing the whole ledger';
        } else {
          var cut = String(SINCE).slice(0, 10);
          var shown = 0;
          qsa('#signalAll .sig').forEach(function (row) {
            var iso = row.getAttribute('data-at') || '';
            var ok = iso ? iso >= cut : true;
            row.hidden = !ok;
            if (ok) shown++;
          });
          if (head) {
            head.textContent = shown
              ? shown + ' since your last visit'
              : 'Nothing new since your last visit';
          }
        }
      }
      paintReviewed();
    })();
  }

  /* ============ path step evidence ============ */
  qsa('.pstep-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      var open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      if (panel) panel.hidden = open;
    });
  });

  /* ============ compare ============ */
  var CMP = [];
  (function readCmp() {
    var fromUrl = new URLSearchParams(location.search).get('c');
    if (fromUrl) CMP = fromUrl.split(',').map(function (s) { return s.toUpperCase(); }).slice(0, MAX_COMPARE);
    else {
      try {
        var s = JSON.parse(localStorage.getItem('t2c-compare') || '[]');
        if (Array.isArray(s)) CMP = s.slice(0, MAX_COMPARE);
      } catch (e) {}
    }
  })();
  function persistCmp() {
    try { localStorage.setItem('t2c-compare', JSON.stringify(CMP)); } catch (e) {}
    if (ROUTE === 'compare') {
      var u = new URL(location.href);
      if (CMP.length) u.searchParams.set('c', CMP.join(',')); else u.searchParams.delete('c');
      history.replaceState(null, '', u);
    }
  }

  function renderTray() {
    var tray = $('cmpTray');
    if (!tray) return;
    tray.innerHTML = CMP.length
      ? CMP.map(function (t) {
          return '<span class="traychip"><b>' + esc(t) + '</b> ' + esc(NAMES[t] || '') +
            '<button type="button" data-drop="' + esc(t) + '" aria-label="Remove ' +
            esc(NAMES[t] || t) + ' from the comparison">×</button></span>';
        }).join('')
      : '<span class="trayempty">No companies selected yet</span>';
    qsa('#cmpTray [data-drop]').forEach(function (b) {
      b.addEventListener('click', function () {
        CMP = CMP.filter(function (x) { return x !== b.getAttribute('data-drop'); });
        persistCmp(); syncBoxes(); renderCompare();
      });
    });
  }

  function syncBoxes() {
    qsa('input[name="compare"]').forEach(function (i) {
      i.checked = CMP.indexOf(i.value) !== -1;
      i.disabled = CMP.length >= MAX_COMPARE && !i.checked;
      var chip = i.closest('.cchip');
      if (chip) chip.classList.toggle('is-disabled', i.disabled);
    });
    var hint = $('cmpHint');
    if (hint) {
      hint.textContent = CMP.length
        ? CMP.length + ' of ' + MAX_COMPARE + ' selected' + (CMP.length >= MAX_COMPARE ? ' — the maximum' : '')
        : 'Select up to ' + MAX_COMPARE + '.';
    }
    renderTray();
  }

  if (ROUTE === 'compare') {
    qsa('input[name="compare"]').forEach(function (i) {
      i.addEventListener('change', function () {
        if (i.checked) {
          if (CMP.length >= MAX_COMPARE) { i.checked = false; return; }
          CMP.push(i.value);
          track('ticker_added_to_compare', { ticker: i.value });
        } else CMP = CMP.filter(function (x) { return x !== i.value; });
        persistCmp(); syncBoxes(); renderCompare();
      });
    });
    qsa('.preset').forEach(function (b) {
      b.addEventListener('click', function () {
        CMP = b.getAttribute('data-preset').split(',').slice(0, MAX_COMPARE);
        persistCmp(); syncBoxes(); renderCompare();
        track('compare_started', { tickers: CMP.slice(), from: 'preset' });
      });
    });
    qsa('.mode[data-mode]').forEach(function (b) {
      if (b.disabled) return;
      b.addEventListener('click', function () {
        qsa('.mode[data-mode]').forEach(function (x) {
          x.classList.remove('is-active'); x.setAttribute('aria-selected', 'false');
        });
        b.classList.add('is-active'); b.setAttribute('aria-selected', 'true');
        renderCompare(b.getAttribute('data-mode'));
      });
    });
    syncBoxes();
  }

  function renderCompare(mode) {
    var out = $('cmpOut');
    if (!out) return;
    var activeBtn = document.querySelector('.mode[data-mode].is-active');
    mode = mode || (activeBtn ? activeBtn.getAttribute('data-mode') : 'operational');

    if (!CMP.length) {
      out.innerHTML = '<div class="emptystate"><h3>Pick up to ' + MAX_COMPARE + ' companies</h3>' +
        '<p>Start from a preset above, or add them individually. Your selection is kept in the page ' +
        'address, so the comparison can be shared.</p></div>';
      return;
    }

    var rows = CMP.map(function (t) { return (window.T2C_COMPARE || {})[t]; }).filter(Boolean);
    if (!rows.length) { out.innerHTML = ''; return; }

    var cell = function (v) {
      return (v === null || v === undefined || v === '')
        ? '<span class="nd">' + ND + '</span>' : esc(v);
    };
    var headHtml = '<div class="cmphead"><div class="cmpspacer"></div>' +
      rows.map(function (r) {
        return '<div class="cmpco"><a href="/companies/' + esc(r.slug) + '/"><b>' + esc(r.ticker) + '</b></a>' +
          '<span class="cmpconame">' + esc(r.name) + '</span>' +
          '<span class="cmppx" data-price="' + esc(r.ticker) + '"></span></div>';
      }).join('') + '</div>';

    if (mode === 'operational') {
      var ROWS = [
        ['Capacity switched on', 'energised'],
        ['Customers have signed for', 'contracted'],
        ['Power controlled', 'secured'],
        ['Delivered and accepted', 'accepted'],
        ['Generating revenue', 'revenueLive'],
        ['Delivery stage', 'stage'],
        ['Next catalyst', 'nextCatalyst'],
        ['Figures sourced', 'sourced']
      ];
      out.innerHTML = '<div class="cmpgrid" style="--cols:' + rows.length + '">' + headHtml +
        ROWS.map(function (m) {
          return '<div class="cmprow"><div class="cmplabel">' + esc(m[0]) + '</div>' +
            rows.map(function (r) { return '<div class="cmpcell">' + cell(r[m[1]]) + '</div>'; }).join('') + '</div>';
        }).join('') + '</div>' +
        '<p class="blocknote">Only like-for-like measures share a row. Where a company has not published ' +
        'a figure the cell reads <b>' + ND + '</b> — never zero, and never a peer’s number.</p>';
    } else if (mode === 'catalysts') {
      out.innerHTML = '<div class="cmpcats">' + rows.map(function (r) {
        return '<div class="cmpcatco"><h3>' + esc(r.ticker) + ' <span>' + esc(r.name) + '</span></h3>' +
          (r.catalysts && r.catalysts.length
            ? '<ul>' + r.catalysts.map(function (c) {
                return '<li><span class="catwhen">' + esc(c.when) + '</span>' +
                  '<span class="cattitle">' + esc(c.title) + '</span>' +
                  '<span class="catcert">' + esc(c.certainty) + '</span></li>';
              }).join('') + '</ul>'
            : '<p class="nd">No dated catalysts</p>') + '</div>';
      }).join('') + '</div>';
    } else if (mode === 'evidence') {
      out.innerHTML = '<div class="cmpgrid" style="--cols:' + rows.length + '">' + headHtml +
        [['Figures sourced', 'sourced'], ['Not disclosed', 'notDisclosed'], ['Last verified', 'lastVerified']]
          .map(function (m) {
            return '<div class="cmprow"><div class="cmplabel">' + esc(m[0]) + '</div>' +
              rows.map(function (r) { return '<div class="cmpcell">' + cell(r[m[1]]) + '</div>'; }).join('') + '</div>';
          }).join('') + '</div>';
    }
    paintPrices();
    track('compare_rendered', { mode: mode, tickers: CMP.slice() });
  }

  /* ============ catalysts timeline ============ */
  if (ROUTE === 'catalysts') {
    var renderCats = function () {
      var host = $('catTimeline');
      if (!host || !window.T2C_CATALYSTS) return;
      var co = ($('catCompany') || {}).value || '';
      var cert = ($('catCertainty') || {}).value || '';
      var cat = ($('catCategory') || {}).value || '';
      var items = window.T2C_CATALYSTS.filter(function (c) {
        return (!co || c.companyId === co) && (!cert || c.status === cert) && (!cat || c.category === cat);
      });
      var groups = {};
      items.forEach(function (c) { (groups[c.group] = groups[c.group] || []).push(c); });
      var ORDER = ['Next 30 days', 'Next quarter', 'Later', 'Guided windows', 'Date unknown'];
      host.innerHTML = ORDER.filter(function (g) { return groups[g]; }).map(function (g) {
        return '<section class="catgroup"><h2>' + esc(g) + ' <span>' + groups[g].length + '</span></h2>' +
          groups[g].map(function (c) {
            return '<article class="catrow catrow-' + esc(c.tone) + '">' +
              '<div class="catwhenbox"><div class="catwhen">' + esc(c.when) + '</div>' +
              '<div class="catcert">' + esc(c.certainty) + '</div>' +
              (c.countdown ? '<div class="catcount">' + esc(c.countdown) + '</div>' : '') + '</div>' +
              '<div class="catbody"><h3>' + esc(c.title) + '</h3>' +
              '<div class="catco"><b>' + esc(c.ticker) + '</b> ' + esc(c.company) + '</div>' +
              '<p>' + esc(c.description) + '</p>' +
              (c.affects ? '<div class="catmetric">May change: <b>' + esc(c.affects) + '</b></div>' : '') +
              '<div class="catsrc">' + c.sourceHtml + '</div></div></article>';
          }).join('') + '</section>';
      }).join('') ||
        '<div class="emptystate"><h3>Nothing matches those filters</h3><p>Try widening them.</p></div>';
      var n = $('catCount');
      if (n) n.textContent = items.length + (items.length === 1 ? ' catalyst' : ' catalysts');
    };
    ['catCompany', 'catCertainty', 'catCategory'].forEach(function (id) {
      var el = $(id); if (el) el.addEventListener('change', renderCats);
    });
    renderCats();
  }

  /* ============ shared interactions ============ */
  qsa('details.ev').forEach(function (d) {
    d.addEventListener('toggle', function () { if (d.open) track('source_drawer_opened', {}); });
  });
  qsa('.jbtn').forEach(function (b) {
    b.addEventListener('click', function () {
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      var open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      if (panel) panel.hidden = open;
    });
  });
  qsa('.georow').forEach(function (el) {
    el.addEventListener('click', function () {
      var d = $('geo-' + el.dataset.geo);
      var open = el.getAttribute('aria-expanded') === 'true';
      el.setAttribute('aria-expanded', String(!open));
      if (d) d.hidden = open;
    });
  });
  qsa('.snapcompare').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-add');
      if (CMP.indexOf(t) === -1) {
        if (CMP.length >= MAX_COMPARE) {
          var was = b.textContent;
          b.textContent = 'Max ' + MAX_COMPARE;
          setTimeout(function () { b.textContent = was; }, 1500);
          return;
        }
        CMP.push(t);
      }
      persistCmp();
      location.href = '/compare/?c=' + CMP.join(',');
    });
  });

  /* ============ your own calls ============ */
  /*
   * Entirely local. Reading, writing and scoring all happen in this browser; no
   * request carries a call anywhere, and the analytics event records only that a
   * call was saved, never what it said.
   */
  var CALLS_KEY = 't2c-calls';

  function readCalls() {
    try {
      var v = JSON.parse(localStorage.getItem(CALLS_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function writeCalls(list) {
    try { localStorage.setItem(CALLS_KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }   // private browsing, or the quota is full
  }

  function quarterEndOf(tag) {
    var m = /^(\d{4})-Q([1-4])$/.exec(tag || '');
    if (!m) return null;
    var y = +m[1], q = +m[2];
    return new Date(Date.UTC(y, q * 3, 0)).toISOString().slice(0, 10);
  }

  function renderCalls(ticker) {
    var host = $('callList-' + ticker);
    if (!host) return;
    var mine = readCalls().filter(function (c) { return c.ticker === ticker; })
      .sort(function (a, b) { return b.savedAt.localeCompare(a.savedAt); });

    if (!mine.length) {
      host.innerHTML = '<p class="callempty">No calls saved for ' + ticker + ' yet.</p>';
      return;
    }

    var today = new Date().toISOString().slice(0, 10);
    host.innerHTML = mine.map(function (c) {
      var due = quarterEndOf(c.by);
      var state = due && due < today ? 'due' : 'open';
      return '<article class="callcard call-' + state + '">' +
        '<div class="callmeta"><b>' + esc(c.gateLabel) + '</b> by <b>' + esc(c.byLabel) + '</b>' +
        (c.mw ? ' · ' + esc(c.mw) + ' MW' : '') + ' · ' + esc(c.confidence) + '% sure</div>' +
        (c.why ? '<p class="callwhy">' + esc(c.why) + '</p>' : '') +
        '<div class="callfoot">' +
        '<span class="callstate">' + (state === 'due'
          ? 'The window has closed — check the delivery record above and mark it.'
          : 'Open until ' + esc(c.byLabel)) + '</span>' +
        '<span class="callbtns">' +
        '<button class="callmark" type="button" data-id="' + esc(c.id) + '" data-result="right">Right</button>' +
        '<button class="callmark" type="button" data-id="' + esc(c.id) + '" data-result="wrong">Wrong</button>' +
        '<button class="calldel" type="button" data-id="' + esc(c.id) + '">Delete</button>' +
        '</span></div>' +
        (c.result ? '<div class="callresult call-' + esc(c.result) + '">You marked this ' + esc(c.result) +
          ' on ' + esc(c.resultAt) + '</div>' : '') +
        '</article>';
    }).join('');
  }

  qsa('.callform').forEach(function (form) {
    var ticker = form.getAttribute('data-call');
    var range = form.querySelector('input[name="confidence"]');
    var out = $('callConfOut-' + ticker);
    if (range && out) {
      range.addEventListener('input', function () { out.textContent = range.value + '%'; });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var gateSel = form.querySelector('select[name="gate"]');
      var bySel = form.querySelector('select[name="by"]');
      var mwIn = form.querySelector('input[name="mw"]');
      var status = form.querySelector('.callsaved');

      var list = readCalls();
      list.push({
        id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6),
        ticker: ticker,
        companyId: form.getAttribute('data-company'),
        gate: gateSel.value,
        gateLabel: gateSel.options[gateSel.selectedIndex].text,
        by: bySel.value,
        byLabel: bySel.options[bySel.selectedIndex].text,
        mw: mwIn.value ? Number(mwIn.value) : null,
        confidence: Number(range ? range.value : 60),
        why: (form.querySelector('textarea[name="why"]') || {}).value || '',
        savedAt: new Date().toISOString().slice(0, 10),
        result: null, resultAt: null
      });

      if (writeCalls(list)) {
        if (status) status.textContent = 'Saved to this browser.';
        track('call_saved', { ticker: ticker });      // the count, never the content
        form.reset();
        if (out) out.textContent = '60%';
        renderCalls(ticker);
      } else if (status) {
        status.textContent = 'This browser will not let T2C store data, so the call was not saved.';
      }
      if (status) setTimeout(function () { status.textContent = ''; }, 4000);
    });

    var host = $('callList-' + ticker);
    if (host) {
      host.addEventListener('click', function (e) {
        var mark = e.target.closest('.callmark');
        var del = e.target.closest('.calldel');
        if (!mark && !del) return;
        var id = (mark || del).getAttribute('data-id');
        var list = readCalls();
        if (del) list = list.filter(function (c) { return c.id !== id; });
        else list = list.map(function (c) {
          return c.id === id
            ? Object.assign({}, c, { result: mark.getAttribute('data-result'), resultAt: new Date().toISOString().slice(0, 10) })
            : c;
        });
        writeCalls(list);
        renderCalls(ticker);
      });
    }

    renderCalls(ticker);
  });

  /* ============ sticky section navigation ============ */
  /* Highlights whichever section is currently in view. IntersectionObserver rather
     than a scroll handler, so it costs nothing on a long company page. */
  (function sectionSpy() {
    var nav = document.querySelector('.secnav');
    if (!nav || !('IntersectionObserver' in window)) return;
    var links = qsa('.secnav a');
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

    var targets = Object.keys(byId).map(function (id) { return $(id); }).filter(Boolean);
    if (!targets.length) return;

    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var current = null;
      for (var i = 0; i < targets.length; i++) {
        if (visible[targets[i].id]) { current = targets[i].id; break; }
      }
      links.forEach(function (a) { a.classList.remove('is-active'); });
      if (current && byId[current]) byId[current].classList.add('is-active');
    }, { rootMargin: '-120px 0px -60% 0px' });

    targets.forEach(function (t) { io.observe(t); });
  })();

  /* ============ boot ============ */
  renderMarketState();
  loadQuotes();
  renderCompare();
  setInterval(loadQuotes, 60000);
})();
