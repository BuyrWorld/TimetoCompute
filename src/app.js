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

  /* Dates are formatted and compared UTC-safe from a YYYY-MM-DD string, matching
     the build's own formatter. Parsing a bare date as local time shifts it a day
     for anyone west of Greenwich. */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var fmtDate = function (iso) {
    if (!iso) return ND;
    var p = String(iso).slice(0, 10).split('-');
    var y = +p[0], m = +p[1], d = +p[2];
    if (!y || !m || !d) return ND;
    return d + ' ' + MONTHS[m - 1] + ' ' + y;
  };
  var dayGap = function (iso) {
    if (!iso) return null;
    var t = Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z');
    if (!isFinite(t)) return null;
    var today = Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
    return Math.round((t - today) / 86400000);
  };

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

  /* ============ local stores ============
     Both live in this browser and leave it only when the reader looks at them.
     They are declared here, above every route controller, because a controller
     further down the file runs at parse time and a `var` assignment below it
     would not exist yet.

     Reviewed: this reader's progress through the ledger. It records an id and
     nothing else — not what the signal said, not when it was read.

     Watch: one store shared by the homepage panel, the companies directory
     filter and the button on a company page, so starring a company anywhere is
     the same fact everywhere. Writes report success, because storage can be full
     or blocked and a star that will not survive a reload must not be left
     showing. */
  var REVIEW_KEY = 't2c-reviewed';
  var readReviewed = function () {
    try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || '[]'); } catch (e) { return []; }
  };
  var writeReviewed = function (list) {
    try { localStorage.setItem(REVIEW_KEY, JSON.stringify(list.slice(-400))); } catch (e) {}
  };

  /* Bookmarks: the same shape as reviewed, kept separate because they answer
     different questions. "Reviewed" is progress through a finite set and is
     expected to fill up; "bookmarked" is a deliberate keep and is not. */
  var MARK_KEY = 't2c-bookmarks';
  var readMarks = function () {
    try { return JSON.parse(localStorage.getItem(MARK_KEY) || '[]'); } catch (e) { return []; }
  };
  var writeMarks = function (list) {
    try { localStorage.setItem(MARK_KEY, JSON.stringify(list.slice(-400))); return true; } catch (e) { return false; }
  };

  var WATCH_KEY = 't2c-watch';
  var readWatch = function () {
    try { return JSON.parse(localStorage.getItem(WATCH_KEY) || '[]'); } catch (e) { return []; }
  };
  var writeWatch = function (v) {
    try { localStorage.setItem(WATCH_KEY, JSON.stringify(v)); return true; } catch (e) { return false; }
  };

  /* ============ estimates on/off ============
     Estimates are T2C's derivations, not company disclosures, so the reader can
     switch them off and see only what was published. The preference persists.
     Default is on: a column of blanks tells a reader nothing about scale. */
  (function estimatesToggle() {
    var KEY = 't2c-estimates';
    var btn = $('estBtn');
    var apply = function (on, persist) {
      document.documentElement.setAttribute('data-estimates', on ? 'on' : 'off');
      if (btn) {
        btn.setAttribute('aria-pressed', String(on));
        btn.textContent = 'Estimates: ' + (on ? 'shown' : 'hidden');
      }
      if (persist) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {} }
    };
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    apply(saved !== 'off', false);
    if (btn) {
      btn.addEventListener('click', function () {
        apply(document.documentElement.getAttribute('data-estimates') !== 'on', true);
        track('estimates_toggled', {});
      });
    }
  })();

  /* ============ click-glow ============
     One primitive for every pressable thing. Three rules it exists to keep:

       1. Pointer, Enter and Space produce identical feedback. A keyboard user
          gets the same confirmation a mouse user does.
       2. Navigation is never delayed for the animation. The class is applied and
          a timer removes it; if the page changes first, the timer is irrelevant.
       3. Double activation is suppressed. Space on a <button> fires click on
          keyup, and holding a key repeats keydown — neither may fire twice. */
  (function clickGlow() {
    var GLOW_MS = 340;
    var held = null;

    var flash = function (el) {
      if (!el || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;
      el.classList.add('is-pressed');
      // The timer only removes a visual class, so navigation is free to happen
      // underneath it at any moment.
      setTimeout(function () { el.classList.remove('is-pressed'); }, GLOW_MS);
    };

    document.addEventListener('pointerdown', function (e) {
      var el = e.target.closest ? e.target.closest('.press') : null;
      if (el) flash(el);
    }, { passive: true });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      if (e.repeat) return;                       // holding a key must not strobe
      var el = document.activeElement;
      if (!el || !el.classList || !el.classList.contains('press')) return;
      if (held === el) return;                    // already flashed for this press
      held = el;
      flash(el);
    });
    document.addEventListener('keyup', function () { held = null; });
  })();

  /* ============ Live / Focus ============
     Focus mode pauses decorative movement and hides secondary metrics. It must
     not disturb the investigation in progress, so it only toggles a root
     attribute — no panel is closed, no filter is reset, no scroll is moved. */
  var MODE_KEY = 't2c-mode';
  var MODE = 'live';
  (function modeToggle() {
    // The header pair plus the "leave focus" button in the focus banner. All of
    // them carry data-mode, so one handler serves the lot.
    var buttons = qsa('.modebtn, .focusbar button[data-mode]');
    var apply = function (mode, persist) {
      MODE = mode === 'focus' ? 'focus' : 'live';
      document.documentElement.setAttribute('data-mode', MODE);
      buttons.forEach(function (b) {
        // The banner's escape hatch is an action, not a state, so it takes no
        // pressed state — only the header toggle pair does.
        if (b.classList.contains('modebtn')) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === MODE));
        }
      });
      if (persist) { try { localStorage.setItem(MODE_KEY, MODE); } catch (e) {} }
      // Anything animating asks the mode rather than being told, so a controller
      // that starts later still honours it.
      if (window.__t2cModeChanged) window.__t2cModeChanged(MODE);
    };
    var saved = null;
    try { saved = localStorage.getItem(MODE_KEY); } catch (e) {}
    apply(saved === 'focus' ? 'focus' : 'live', false);
    buttons.forEach(function (b) {
      b.addEventListener('click', function () { apply(b.getAttribute('data-mode'), true); });
    });
  })();
  /** Decorative motion runs only in Live mode, and never under reduced motion. */
  var motionAllowed = function () { return !reduced && MODE !== 'focus'; };

  /* ============ command palette ============ */
  (function palette() {
    var dlg = $('palette'), input = $('palInput'), list = $('palResults'), empty = $('palEmpty');
    var trigger = $('palOpen');
    if (!dlg || !input || !list || !trigger || !dlg.showModal) return;

    var INDEX = CFG.palette || [];
    var active = -1, rows = [];

    var render = function (q) {
      var needle = q.trim().toLowerCase();
      rows = !needle ? INDEX.slice(0, 8) : INDEX.filter(function (r) {
        /* `r.s` is a hidden search alias, for rows whose nav label is shorter
           than the thing it names — "Play" is right on a tab and wrong in a
           search box, where somebody will type "time machine". */
        return r.n.toLowerCase().indexOf(needle) !== -1 ||
          r.k.toLowerCase().indexOf(needle) !== -1 ||
          (r.s ? r.s.toLowerCase().indexOf(needle) !== -1 : false);
      }).slice(0, 12);
      active = rows.length ? 0 : -1;
      list.innerHTML = rows.map(function (r, i) {
        return '<li role="option" aria-selected="' + (i === 0) + '">' +
          '<a class="palitem' + (i === 0 ? ' is-active' : '') + '" href="' + esc(r.h) + '">' +
          '<span class="palkind">' + esc(r.k) + '</span>' +
          '<span class="palname">' + esc(r.n) + '</span>' +
          '<span class="palhint" aria-hidden="true">↵</span></a></li>';
      }).join('');
      empty.hidden = rows.length > 0;
    };

    var move = function (delta) {
      if (!rows.length) return;
      active = (active + delta + rows.length) % rows.length;
      qsa('#palResults .palitem').forEach(function (el, i) {
        el.classList.toggle('is-active', i === active);
        el.parentElement.setAttribute('aria-selected', String(i === active));
        if (i === active && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      });
    };

    // <dialog> traps focus while modal for free. It also restores focus to
    // whatever was focused before — but opening by shortcut means that was the
    // body, which would strand the keyboard user. Remember a real return point.
    var returnTo = null;
    var open = function () {
      var prev = document.activeElement;
      returnTo = prev && prev !== document.body && prev.focus ? prev : trigger;
      input.value = '';
      render('');
      dlg.showModal();
      input.focus();
      track('palette_opened', {});
    };

    dlg.addEventListener('close', function () {
      if (returnTo && document.contains(returnTo)) returnTo.focus();
    });

    trigger.addEventListener('click', open);
    // The 404 and the mobile bar offer their own ways into search.
    ['palOpen404', 'palOpenMobile'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('click', open);
    });
    input.addEventListener('input', function () { render(input.value); });

    dlg.addEventListener('keydown', function (e) {
      // A search input eats the first Escape to clear itself, so the dialog's
      // native cancel never fires. Close explicitly.
      if (e.key === 'Escape') { e.preventDefault(); dlg.close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        var el = qsa('#palResults .palitem')[active];
        if (el) { e.preventDefault(); location.href = el.getAttribute('href'); }
      }
    });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (dlg.open) dlg.close(); else open();
      }
    });

    // Clicking the backdrop closes; clicking the panel must not.
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  })();

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
        /* The label alone. This used to append "· Last trade 16:00 ET" when the
           market was shut, which pushed the pill past the edge of the header on
           anything narrower than a desktop. The timestamp is not lost — it is in
           the utility menu below, where there is room for it and where somebody
           looking for it will actually go. */
        text = (FEED.session ? FEED.session.label : 'Market');
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
          if (motionAllowed()) {
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
        if (motionAllowed()) raf = requestAnimationFrame(draw);
      };
      size(); draw(performance.now());
      new ResizeObserver(function () { cancelAnimationFrame(raf); size(); draw(performance.now()); })
        .observe(cv.parentElement);
      // Switching to Live must restart the loop; switching to Focus lets the
      // current frame finish and stops, leaving the static rails drawn.
      window.__t2cModeChanged = function () {
        cancelAnimationFrame(raf);
        draw(performance.now());
      };
    }
  }

  /* ============ companies directory ============ */
  if (ROUTE === 'companies') {
    var grid = $('companyGrid');
    var cards = grid ? qsa('#companyGrid .snap') : [];
    // "View all watchlist" arrives here with ?filter=watching, so the link has to
    // actually filter rather than merely land on the page.
    var watchingOnly = new URLSearchParams(location.search).get('filter') === 'watching';
    var applyCo = function () {
      var q = (($('coSearch') || {}).value || '').toLowerCase();
      var model = ($('coModel') || {}).value || '';
      var stage = ($('coStage') || {}).value || '';
      var watched = watchingOnly ? readWatch() : null;
      var shown = 0;
      cards.forEach(function (card) {
        var ok = (!q || card.textContent.toLowerCase().indexOf(q) !== -1) &&
                 (!model || card.getAttribute('data-model') === model) &&
                 (!stage || card.getAttribute('data-stage') === stage) &&
                 (!watched || watched.indexOf(card.getAttribute('data-ticker')) !== -1);
        card.hidden = !ok;
        if (ok) shown++;
      });
      var c = $('coCount');
      if (c) {
        c.textContent = shown + (shown === 1 ? ' company' : ' companies') + ' shown' +
          (watchingOnly ? ' · watching only' : '');
      }
      var banner = $('watchBanner');
      if (banner) {
        banner.hidden = !watchingOnly;
        if (watchingOnly && !shown) {
          banner.textContent = 'You are not watching any company yet. Clear this filter to see all of them.';
        }
      }
    };
    ['coSearch', 'coModel', 'coStage'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', applyCo);
      el.addEventListener('change', applyCo);
    });
    // Run once on load: the page can arrive already filtered, via
    // /companies/?filter=watching from the homepage.
    if (watchingOnly) applyCo();

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

  /* ============ editorial homepage ============ */
  if (ROUTE === 'today') {

    /* ---- why-this-matters drawer ----
       A <dialog>, so focus containment and Escape come from the platform. The
       only things added are returning focus to the trigger and closing on a
       backdrop click. Navigation is never delayed for it. */
    (function whyThisMatters() {
      var dlg = $('whyDrawer'), btn = $('whyBtn'), close = $('whyClose');
      if (!dlg || !btn || !dlg.showModal) return;

      btn.addEventListener('click', function () {
        dlg.showModal();
        track('lead_story_why_it_matters_open', { story: dlg.getAttribute('data-story') || '' });
      });
      if (close) close.addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', function () { btn.focus(); });
    })();

    /* ---- supply-chain nodes ----
       A tracked stage is a link and needs no script. An untracked one is a
       button that opens the explanation of why it is empty. Only one panel is
       open at a time, so the track never turns into a wall of text. */
    qsa('.cn-hit[aria-controls]').forEach(function (b) {
      b.addEventListener('click', function () {
        var panel = document.getElementById(b.getAttribute('aria-controls'));
        var open = b.getAttribute('aria-expanded') === 'true';
        qsa('.cn-hit[aria-controls]').forEach(function (o) {
          o.setAttribute('aria-expanded', 'false');
          var p = document.getElementById(o.getAttribute('aria-controls'));
          if (p) p.hidden = true;
        });
        if (!open) {
          b.setAttribute('aria-expanded', 'true');
          if (panel) panel.hidden = false;
          track('chain_stage_open', { stage: b.closest('.cn-node').getAttribute('data-stage') });
        }
      });
    });


    /* ---- returning-user summary ----
       Counted in this browser against this browser's own last visit. A first
       visit says so rather than manufacturing a return state. */
    (function returning() {
      var head = $('returnHead'), sub = $('returnSub'), cta = $('returnCta'), box = $('returnSummary');
      if (!head || !box) return;
      var idx = CFG.signalIndex || [];

      if (!SINCE) {
        head.textContent = 'Welcome to T2C';
        if (sub) {
          sub.textContent = 'This is your first visit, so there is nothing to compare against yet. ' +
            'Come back and this panel will list only what changed while you were away.';
        }
        if (cta) cta.textContent = 'Open the full ledger →';
        return;
      }

      var cut = String(SINCE).slice(0, 10);
      var since = idx.filter(function (r) { return r.at >= cut; });

      if (!since.length) {
        box.classList.add('is-caughtup');
        head.textContent = "You're caught up";
        if (sub) sub.textContent = 'No verified delivery records have changed since your last review.';
        if (cta) { cta.textContent = 'Open the full ledger →'; cta.href = '/intelligence/'; }
        return;
      }

      // Forward, back, or evidence-only — the three shapes the copy deck names.
      var FORWARD = ['advanced', 'contract'], BACK = ['slipped', 'reduced'];
      var fwd = since.filter(function (r) { return FORWARD.indexOf(r.c) !== -1; }).length;
      var back = since.filter(function (r) { return BACK.indexOf(r.c) !== -1; }).length;
      var ev = since.length - fwd - back;

      head.textContent = since.length + (since.length === 1
        ? ' verified change while you were away' : ' verified changes while you were away');
      if (sub) {
        sub.textContent = fwd + ' moved forward · ' + back + ' moved back · ' +
          ev + ' changed evidence only';
      }
    })();

    /* ---- audience lens ----
       Changes the explanation only. No fact is filtered or recalculated. */
    (function lens() {
      var tabs = qsa('.ed-lenstab');
      if (!tabs.length) return;

      var select = function (id, focus) {
        tabs.forEach(function (t) {
          var on = t.getAttribute('data-lens') === id;
          t.setAttribute('aria-selected', String(on));
          t.setAttribute('tabindex', on ? '0' : '-1');
          var panel = document.getElementById('lens-panel-' + t.getAttribute('data-lens'));
          if (panel) panel.hidden = !on;
          if (on && focus) t.focus();
        });
        track('audience_lens_select', { lens: id });
      };

      tabs.forEach(function (t, i) {
        t.addEventListener('click', function () { select(t.getAttribute('data-lens'), false); });
        // Arrow-key roving focus, as a tablist is expected to behave.
        t.addEventListener('keydown', function (e) {
          var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          select(tabs[(i + d + tabs.length) % tabs.length].getAttribute('data-lens'), true);
        });
      });
    })();

    /* ---- 60-second explainer ----
       Never autoplays. Under reduced motion the states still change, just
       without the transition. */
    (function explainer() {
      var steps = qsa('#explSteps .ed-step');
      var start = $('explStart'), next = $('explNext'), status = $('explStatus');
      if (!steps.length || !start) return;
      var at = 0, started = false;

      var paint = function () {
        steps.forEach(function (s, i) {
          s.classList.toggle('is-current', i === at);
          s.classList.toggle('is-done', i < at);
        });
        if (status) {
          status.textContent = 'Step ' + (at + 1) + ' of ' + steps.length + '. ' +
            steps[at].querySelector('.ed-steptext').textContent;
        }
      };

      start.addEventListener('click', function () {
        started = true;
        at = 0;
        start.hidden = true;
        if (next) next.hidden = false;
        paint();
        track('explainer_start', {});
      });

      if (next) {
        next.addEventListener('click', function () {
          if (at < steps.length - 1) {
            at++;
            paint();
            if (at === steps.length - 1) {
              next.textContent = 'Done';
            }
          } else {
            next.hidden = true;
            start.hidden = false;
            start.textContent = 'Replay';
            steps.forEach(function (s) { s.classList.add('is-done'); s.classList.remove('is-current'); });
            if (status) status.textContent = 'Complete. Acceptance and billing are different stages.';
            track('explainer_complete', {});
          }
        });
      }
    })();

    qsa('.ed-project .ed-cta').forEach(function (a) {
      a.addEventListener('click', function () {
        track('project_card_open', { href: a.getAttribute('href') });
      });
    });
  }

  /* ============ infrastructure map (Sites) ============ */
  if (ROUTE === 'sites') {
    /* ---- infrastructure map ---- */
    (function map() {
      var view = $('mapView'), img = $('mapImg'), car = $('mapVehicle');
      if (!view || !img) return;

      var fx = $('mapFx');
      var zoom = 1;
      var apply = function () {
        img.style.transform = 'scale(' + zoom + ')';
        // The effects layer scales with the artwork so the vehicle stays on the
        // road; the sprite itself counter-scales so it does not balloon.
        if (fx) fx.style.transform = 'scale(' + zoom + ')';
        if (car) car.style.transform = 'translate(-50%,-50%) scale(' + (1 / zoom) + ')';
        qsa('#mapView .hot').forEach(function (h) {
          h.style.transform = 'translate(-50%,-50%) scale(' + (1 / Math.max(1, zoom * 0.72)) + ')';
        });
      };
      var setZoom = function (z) { zoom = Math.min(2.4, Math.max(1, z)); apply(); };

      var zin = $('mapIn'), zout = $('mapOut'), zres = $('mapReset');
      if (zin) zin.addEventListener('click', function () { setZoom(zoom + 0.3); });
      if (zout) zout.addEventListener('click', function () { setZoom(zoom - 0.3); });
      if (zres) zres.addEventListener('click', function () { setZoom(1); });

      /* The one piece of decorative movement on the page, confined to the map
         and to Live mode. It carries no meaning and is hidden from assistive
         technology; a delivery vehicle we do not track must not look tracked.

         The route traces the campus perimeter road clockwise. Points are
         percentages of the map box, which maps 1:1 onto the artwork because the
         image is 3:2 and the box is locked to the same ratio. The sprite faces
         whichever of eight directions the next segment is heading, so it can
         never appear to drive backwards. */
      var ROUTE = [
        [7.0, 57.1], [8.9, 48.6], [12.7, 42.9], [19.1, 35.2], [26.7, 27.6],
        [34.3, 21.9], [41.9, 17.1], [49.6, 14.5], [57.2, 15.2], [64.8, 18.1],
        [72.4, 23.8], [80.1, 30.5], [87.7, 39.0], [92.8, 46.7], [94.7, 52.4],
        [91.5, 60.0], [85.1, 67.6], [77.5, 74.3], [68.6, 79.6], [58.4, 83.8],
        [48.3, 86.1], [38.1, 86.7], [29.2, 83.4], [21.6, 78.5], [15.2, 72.4],
        [10.8, 65.7], [8.3, 61.0]
      ];

      // Screen angle -> the eight sheet cells. 0deg is east, +90 is south.
      var DIRS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
      var facing = function (dx, dy) {
        var a = Math.atan2(dy, dx) * 180 / Math.PI;      // -180..180
        return DIRS[((Math.round(a / 45) % 8) + 8) % 8];
      };

      // Total route length, so the vehicle travels at a constant speed rather
      // than hurrying through the short segments.
      var segs = [], total = 0;
      for (var i = 0; i < ROUTE.length; i++) {
        var a = ROUTE[i], b = ROUTE[(i + 1) % ROUTE.length];
        var dx = b[0] - a[0], dy = b[1] - a[1];
        var len = Math.sqrt(dx * dx + dy * dy);
        segs.push({ a: a, dx: dx, dy: dy, len: len, dir: facing(dx, dy) });
        total += len;
      }

      var LAP_MS = 32000;
      var raf = null, t0 = null;
      var stop = function () {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        if (car) car.hidden = true;
      };
      var place = function (p) {
        var want = p * total, acc = 0, s = segs[0], f = 0;
        for (var j = 0; j < segs.length; j++) {
          if (acc + segs[j].len >= want) { s = segs[j]; f = (want - acc) / segs[j].len; break; }
          acc += segs[j].len;
        }
        car.style.left = (s.a[0] + s.dx * f) + '%';
        car.style.top = (s.a[1] + s.dy * f) + '%';
        if (car.getAttribute('data-dir') !== s.dir) car.setAttribute('data-dir', s.dir);
      };
      var start = function () {
        if (!car || raf) return;
        car.hidden = false;
        t0 = performance.now();
        var step = function (now) {
          place((((now - t0) / LAP_MS) % 1 + 1) % 1);
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      };

      var sync = function () {
        if (motionAllowed()) start(); else stop();
      };
      var prevModeHook = window.__t2cModeChanged;
      window.__t2cModeChanged = function (mode) {
        if (prevModeHook) prevModeHook(mode);
        sync();
      };
      sync();
    })();
  }

  /* ============ news ============
     A wire feed, not a T2C record. Every item is attributed to its publisher and
     opens off-site; nothing here is presented as evidenced. */
  /* Gated on the DOM, not the route id: the wire moved from /news/ to /ai-news/
     and serves both, so keying off a route name would strand its behaviour. */
  if ($('newsFeed')) {
    var feed = $('newsFeed'), loading = $('newsLoading'), errEl = $('newsError');
    var ITEMS = [];

    var when = function (ts) {
      if (!ts) return '';
      var mins = Math.round((Date.now() / 1000 - ts) / 60);
      if (mins < 1) return 'just now';
      if (mins < 60) return mins + ' min ago';
      var hrs = Math.round(mins / 60);
      if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
      var d = Math.round(hrs / 24);
      return d + (d === 1 ? ' day ago' : ' days ago');
    };

    /* Which picture a story gets.
       Some publishers return the same house placeholder on every article rather
       than artwork for the story — Yahoo sends one generic yimg file for all of
       them, so the feed rendered twenty-odd identical stretched thumbnails
       fetched from an external host. Those are replaced with the publisher's own
       mark, served locally and letterboxed to 16:9 at build time.
       A real, story-specific image is always preferred and never overridden. */
    var HOUSE_MARKS = [
      { test: /(^|\/)s\.yimg\.com\/.*yahoo_finance/i, src: '/assets/news-yahoo.png', alt: 'Yahoo News' }
    ];
    var BRAND_BY_SOURCE = { yahoo: { src: '/assets/news-yahoo.png', alt: 'Yahoo News' } };

    var artwork = function (n) {
      var house = n.image && HOUSE_MARKS.filter(function (h) { return h.test.test(n.image); })[0];
      if (house) return { src: house.src, alt: house.alt, brand: true };
      if (n.image) return { src: n.image, alt: '', brand: false };
      // No artwork at all: fall back to the publisher's mark where we hold one.
      var b = BRAND_BY_SOURCE[String(n.source || '').toLowerCase()];
      return b ? { src: b.src, alt: b.alt, brand: true } : null;
    };

    var paint = function () {
      var t = ($('newsCompany') || {}).value || '';
      var q = (($('newsSearch') || {}).value || '').toLowerCase().trim();
      var rows = ITEMS.filter(function (n) {
        return (!t || (n.symbols || []).indexOf(t) !== -1) &&
               (!q || n.headline.toLowerCase().indexOf(q) !== -1);
      });

      var counter = $('newsCount');
      if (counter) counter.textContent = rows.length + (rows.length === 1 ? ' story' : ' stories');

      if (!rows.length) {
        feed.innerHTML = '<p class="mnote">No headline matches that filter.</p>';
        return;
      }
      feed.innerHTML = rows.map(function (n) {
        var tags = (n.symbols || []).map(function (s) {
          return '<span class="newstick">' + esc(s) + '</span>';
        }).join('');
        var art = artwork(n);
        return '<article class="newscard">' +
          (art
            ? '<img class="newsimg' + (art.brand ? ' is-brand' : '') + '" src="' + esc(art.src) +
              '" alt="' + esc(art.alt) + '" loading="lazy" decoding="async" ' +
              'referrerpolicy="no-referrer" onerror="this.remove()" />'
            : '') +
          '<div class="newsbody">' +
            '<div class="newsmeta">' + tags +
              '<span class="newssrc">' + esc(n.source || 'wire') + '</span>' +
              '<span class="newsage">' + esc(when(n.datetime)) + '</span>' +
            '</div>' +
            '<h3 class="newshead"><a class="press" href="' + esc(n.url) + '" target="_blank" ' +
              'rel="noopener noreferrer">' + esc(n.headline) + '</a></h3>' +
          '</div>' +
        '</article>';
      }).join('');
    };

    api('/api/news?symbols=' + WATCH.join(','))
      .then(function (d) {
        ITEMS = (d && d.items) || [];
        if (loading) loading.remove();
        feed.setAttribute('aria-busy', 'false');
        if (!ITEMS.length) {
          feed.innerHTML = '<p class="mnote">The provider returned no stories for these companies right now.</p>';
          var c0 = $('newsCount'); if (c0) c0.textContent = '0 stories';
          return;
        }
        paint();
      })
      .catch(function () {
        if (loading) loading.remove();
        feed.setAttribute('aria-busy', 'false');
        feed.innerHTML = '';
        if (errEl) {
          errEl.hidden = false;
          errEl.textContent = 'The news feed is unavailable right now. This affects headlines only — ' +
            'every sourced delivery record on the rest of the site is built at publish time and is unaffected.';
        }
        var c1 = $('newsCount'); if (c1) c1.textContent = 'Unavailable';
      });

    ['newsCompany', 'newsSearch'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', paint);
      el.addEventListener('change', paint);
    });
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

  /* ============ AI news ============
     Three behaviours, all of which must survive a reload and none of which sends
     anything anywhere: filters that live in the URL, finite review progress, and
     bookmarks. The filter state is in the query string rather than in memory so
     a filtered view can be linked to and reopened — a research page whose state
     evaporates on refresh is a page nobody can cite. */
  /* Likewise: the signal product moved from /ai-news/ to /catalysts/. */
  if ($('anFeed')) {
    var anReviewed = readReviewed();
    var anMarks = readMarks();
    var anWatch = readWatch();
    var anCfg = (CFG.aiNews || { ids: [], latest: [] });

    var anState = (function () {
      var p = new URLSearchParams(location.search);
      return {
        cat: p.get('cat') || '',
        mat: p.get('mat') || '',
        co: p.get('co') || '',
        watch: p.get('watch') === '1'
      };
    })();

    var MAT_RANK = { high: 3, medium: 2, low: 1 };

    var anMatches = function (el) {
      if (anState.cat && el.getAttribute('data-cat') !== anState.cat) return false;
      if (anState.mat) {
        var need = MAT_RANK[anState.mat] || 0;
        if ((MAT_RANK[el.getAttribute('data-mat')] || 0) < need) return false;
      }
      var co = el.getAttribute('data-co') || '';
      if (anState.co && co !== anState.co) return false;
      if (anState.watch && (!co || anWatch.indexOf(co) === -1)) return false;
      return true;
    };

    var anSyncUrl = function () {
      var p = new URLSearchParams(location.search);
      ['cat', 'mat', 'co'].forEach(function (k) {
        if (anState[k]) p.set(k, anState[k]); else p.delete(k);
      });
      if (anState.watch) p.set('watch', '1'); else p.delete('watch');
      var q = p.toString();
      history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
    };

    var anApply = function () {
      var rows = qsa('#anFeed .an-row');
      var shown = 0;
      rows.forEach(function (r) {
        var ok = anMatches(r);
        r.hidden = !ok;
        if (ok) shown++;
      });

      var feat = document.querySelector('.an-featured');
      if (feat) feat.hidden = !anMatches(feat);

      var count = $('anShown');
      if (count) count.textContent = shown + (shown === 1 ? ' disclosure' : ' disclosures');
      var none = $('anNoResults');
      if (none) none.hidden = shown !== 0;

      // Buttons and selects reflect the state, so a linked-to view looks set.
      qsa('.an-filter[data-filter="cat"]').forEach(function (b) {
        var on = (b.getAttribute('data-value') || '') === anState.cat;
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('is-on', on);
      });
      var mSel = $('anMateriality'); if (mSel) mSel.value = anState.mat;
      var cSel = $('anCompany'); if (cSel) cSel.value = anState.co;
      var wBtn = $('anWatchOnly');
      if (wBtn) { wBtn.setAttribute('aria-pressed', String(anState.watch)); wBtn.classList.toggle('is-on', anState.watch); }

      var state = $('anFilterState');
      if (state) {
        var bits = [];
        if (anState.cat) bits.push('category');
        if (anState.mat) bits.push(anState.mat + ' materiality and above');
        if (anState.co) bits.push(anState.co);
        if (anState.watch) bits.push('your watchlist');
        state.textContent = bits.length
          ? 'Filtered by ' + bits.join(', ') + ' — showing ' + shown + ' of ' + rows.length + '.'
          : '';
      }
      anSyncUrl();
    };

    /* Finite progress. The pips fill as the latest set is reviewed, and the
       caught-up state is reachable because the set has a last item. */
    var anPaint = function () {
      qsa('#anFeed .an-row, .an-featured').forEach(function (r) {
        var id = r.getAttribute('data-id');
        var isRev = anReviewed.indexOf(id) !== -1;
        var isMark = anMarks.indexOf(id) !== -1;
        r.classList.toggle('is-reviewed', isRev);
        r.classList.toggle('is-bookmarked', isMark);
        var rb = r.querySelector('[data-review]');
        if (rb) { rb.setAttribute('aria-pressed', String(isRev)); rb.textContent = isRev ? 'Reviewed' : 'Mark reviewed'; }
        var mb = r.querySelector('[data-bookmark]');
        if (mb) { mb.setAttribute('aria-pressed', String(isMark)); mb.textContent = isMark ? 'Bookmarked' : 'Bookmark'; }
      });

      var latest = anCfg.latest || [];
      var done = latest.filter(function (id) { return anReviewed.indexOf(id) !== -1; }).length;
      var pips = qsa('.an-pip');
      pips.forEach(function (p, i) { p.classList.toggle('is-done', i < done); });
      var bar = $('anProgress');
      if (bar) bar.setAttribute('aria-valuenow', String(done));
      var label = $('anReviewCount');
      if (label) {
        label.textContent = done + ' of ' + latest.length + ' reviewed'
          + (done === latest.length && latest.length ? ' — caught up' : '');
      }
      var cu = $('anCaughtUp');
      if (cu) cu.hidden = !(latest.length && done === latest.length);
    };

    /* Watchlist impact is filtered here rather than on the server, because the
       server has no business knowing what this reader follows. */
    var anPaintWatch = function () {
      var any = false;
      qsa('#anWatchImpact .an-watchrow').forEach(function (r) {
        var on = anWatch.indexOf(r.getAttribute('data-co')) !== -1;
        r.hidden = !on;
        if (on) any = true;
      });
      var empty = $('anWatchEmpty');
      if (empty) empty.hidden = any;
    };

    document.addEventListener('click', function (e) {
      if (!e.target.closest) return;

      var f = e.target.closest('.an-filter[data-filter="cat"]');
      if (f) { anState.cat = f.getAttribute('data-value') || ''; anApply(); track('ainews_filter', { cat: anState.cat }); return; }

      if (e.target.closest('#anWatchOnly')) {
        anState.watch = !anState.watch; anApply(); track('ainews_filter', { watch: anState.watch }); return;
      }
      if (e.target.closest('#anReset') || e.target.closest('#anResetInline')) {
        anState.cat = ''; anState.mat = ''; anState.co = ''; anState.watch = false;
        anApply(); return;
      }

      var rev = e.target.closest('[data-review]');
      if (rev) {
        var rid = rev.getAttribute('data-review');
        var at = anReviewed.indexOf(rid);
        if (at === -1) anReviewed.push(rid); else anReviewed.splice(at, 1);
        writeReviewed(anReviewed); anPaint();
        track('signal_reviewed', { reviewed: at === -1 });
        return;
      }

      var mk = e.target.closest('[data-bookmark]');
      if (mk) {
        var mid = mk.getAttribute('data-bookmark');
        var mAt = anMarks.indexOf(mid);
        if (mAt === -1) anMarks.push(mid); else anMarks.splice(mAt, 1);
        writeMarks(anMarks); anPaint();
        track('signal_bookmarked', { bookmarked: mAt === -1 });
      }
    });

    ['anMateriality', 'anCompany'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (id === 'anMateriality') anState.mat = el.value; else anState.co = el.value;
        anApply();
        track('ainews_filter', { mat: anState.mat, co: anState.co });
      });
    });

    anApply(); anPaint(); anPaintWatch();
  }

  /* ============ intelligence ============ */
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

      if (view === 'today') {
        // The finite daily set, in the full ledger. Narrow to the latest
        // announcement date the page already rendered at the top.
        var todayAt = null;
        var firstToday = document.querySelector('#todayset .sig[data-at]');
        if (firstToday) todayAt = firstToday.getAttribute('data-at');
        if (todayAt) {
          var n = 0;
          qsa('#signalAll .sig').forEach(function (row) {
            var ok = row.getAttribute('data-at') === todayAt;
            row.hidden = !ok;
            if (ok) n++;
          });
          var todayHead = document.querySelector('#all .blockmeta');
          if (todayHead) todayHead.textContent = n + (n === 1 ? ' signal' : ' signals') + ' in the latest set';
        }
      }

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

  /* ============ scheduled earnings in the snapshot ============
     A company's next catalyst is whichever comes first: a T2C-curated delivery
     window, or the scheduled results date. The build only knows the former, so
     the earlier of the two is resolved here. An earnings date that is LATER than
     what is already shown changes nothing. */
  (function nextCatalyst() {
    var slots = qsa('[data-nextcat]');
    if (!slots.length) return;
    var wanted = slots.map(function (s) { return s.getAttribute('data-nextcat'); });

    api('/api/catalysts?symbols=' + wanted.join(',') + '&days=270')
      .then(function (d) {
        if (!d || !d.available || !d.events) return;
        slots.forEach(function (slot) {
          var tick = slot.getAttribute('data-nextcat');
          var soonest = d.events
            .filter(function (e) { return e.ticker === tick && dayGap(e.expectedAt) >= 0; })
            .sort(function (a, b) { return String(a.expectedAt).localeCompare(String(b.expectedAt)); })[0];
          if (!soonest) return;

          var current = slot.getAttribute('data-nextcat-at');
          if (current && current <= soonest.expectedAt) return;   // already showing something sooner

          var gap = dayGap(soonest.expectedAt);
          slot.innerHTML = '<b>' + esc(fmtDate(soonest.expectedAt)) + '</b>';
          var note = slot.parentElement.querySelector('[data-nextcat-title]');
          if (note) {
            note.textContent = soonest.title + ' — scheduled results date' +
              (gap === 0 ? ', today' : gap > 0 ? ', in ' + gap + ' days' : '');
          }
        });
      })
      .catch(function () { /* the build-time catalyst stands */ });
  })();

  /* ============ revenue calculator ============
     The maths mirrors src/lib/revenue.js, which is unit-tested. Kept in full
     precision throughout and rounded only where it is printed. */
  (function revenueCalc() {
    var root = document.querySelector('.revcalc');
    if (!root) return;

    var id = root.id.replace(/-root$/, '');
    var get = function (s) { return $(id + '-' + s); };
    var mwEl = get('mw'), rateEl = get('rate'), multEl = get('mult'), sharesEl = get('shares');
    var out = get('out'), sens = get('sens');
    if (!mwEl || !rateEl || !multEl || !sharesEl) return;

    // Deliberately NOT data-price: the quote renderer claims every [data-price]
    // element on the page and replaces its contents.
    var priceAttr = root.getAttribute('data-live-price');
    var PRICE = priceAttr ? Number(priceAttr) : null;

    var money = function (m) {
      if (!isFinite(m)) return '—';
      return m >= 1000 ? '$' + (m / 1000).toFixed(2) + 'bn' : '$' + Math.round(m) + 'm';
    };
    var slot = function (k) { return root.querySelector('[data-out="' + k + '"]'); };

    var compute = function () {
      var mw = parseFloat(mwEl.value);
      var rate = parseFloat(rateEl.value);
      var mult = parseFloat(multEl.value);
      var shares = parseFloat(sharesEl.value);

      var ok = isFinite(mw) && mw > 0 && isFinite(rate) && rate > 0;
      var rev = ok ? mw * rate : null;
      var ev = ok && isFinite(mult) && mult > 0 ? rev * mult : null;
      var ps = ev !== null && isFinite(shares) && shares > 0 ? ev / shares : null;
      var up = ps !== null && PRICE ? (ps / PRICE) - 1 : null;

      slot('revenue').textContent = rev === null ? '—' : money(rev) + ' / yr';
      slot('ev').textContent = ev === null ? '—' : money(ev);
      slot('pershare').textContent = ps === null ? '—' : '$' + ps.toFixed(2);

      var upEl = slot('upside');
      if (up === null) {
        upEl.textContent = ps === null
          ? 'Add a share count'
          : (PRICE ? '—' : 'Live price unavailable');
        upEl.className = 'rvval';
      } else {
        upEl.textContent = (up >= 0 ? '+' : '') + (up * 100).toFixed(1) + '% vs $' + PRICE.toFixed(2);
        upEl.className = 'rvval ' + (up >= 0 ? 'up' : 'down');
      }

      slot('caveat').textContent = ps === null ? '' :
        'This is enterprise value per share, not equity value per share. It does not subtract net debt, ' +
        'which T2C does not carry for any tracked company. The multiple is an opinion; nothing here is ' +
        'a price target or a recommendation.';

      // Sensitivity: the same revenue at a range of multiples.
      var body = sens.querySelector('tbody');
      if (!ok) { body.innerHTML = ''; sens.hidden = true; return; }
      sens.hidden = false;
      body.innerHTML = [3, 4, 6, 8, 10, 12].map(function (m) {
        var e = rev * m;
        var p = isFinite(shares) && shares > 0 ? e / shares : null;
        var u = p !== null && PRICE ? (p / PRICE) - 1 : null;
        return '<tr' + (m === mult ? ' class="is-base"' : '') + '>' +
          '<td>' + m + '×</td>' +
          '<td>' + money(e) + '</td>' +
          '<td>' + (p === null ? '—' : '$' + p.toFixed(2)) + '</td>' +
          '<td class="' + (u === null ? '' : (u >= 0 ? 'up' : 'down')) + '">' +
            (u === null ? '—' : (u >= 0 ? '+' : '') + (u * 100).toFixed(0) + '%') + '</td>' +
        '</tr>';
      }).join('');
    };

    [mwEl, rateEl, multEl, sharesEl].forEach(function (el) {
      el.addEventListener('input', compute);
    });

    // Capacity presets. Modelling today's billing alone answers a much narrower
    // question than most readers think they are asking, so the alternatives are
    // one click away and every one of them is on the same critical-IT basis.
    qsa('.rvpreset').forEach(function (b) {
      b.addEventListener('click', function () {
        qsa('.rvpreset').forEach(function (o) {
          o.classList.toggle('is-selected', o === b);
          o.setAttribute('aria-pressed', String(o === b));
        });
        mwEl.value = b.getAttribute('data-mw');
        compute();
      });
    });

    // Share count and live price arrive asynchronously; the calculator is usable
    // before either lands, and simply gains a per-share line when they do.
    var ticker = root.getAttribute('data-ticker');
    var sharesBasis = sharesEl.closest('.rvrow').querySelector('.rvbasis');

    api('/api/shares?symbols=' + ticker)
      .then(function (d) {
        var row = d && d.shares && d.shares[ticker];
        if (!row) throw new Error(d && d.reason || 'no-data');
        sharesEl.value = row.sharesOutstandingM;
        sharesBasis.textContent = 'Supplied by the market data provider — you can override it';
        sharesBasis.className = 'rvbasis ok';
        compute();
      })
      .catch(function () {
        sharesBasis.textContent = 'Not available from the provider — enter a share count for a per-share figure';
        sharesBasis.className = 'rvbasis pending';
        compute();
      });

    if (PRICE === null) {
      api('/api/quote?symbols=' + ticker)
        .then(function (d) {
          var q = d && d.quotes && d.quotes[ticker];
          var p = q && (q.price != null ? q.price : q.c);
          if (isFinite(p) && p > 0) { PRICE = Number(p); compute(); }
        })
        .catch(function () { /* the model still runs without a comparison */ });
    }

    compute();
  })();

  /* ============ watch control on a company page ============ */
  (function companyWatch() {
    var btns = qsa('.watchbtn[data-watch]');
    if (!btns.length) return;
    var watched = readWatch();
    var paint = function () {
      btns.forEach(function (b) {
        var on = watched.indexOf(b.getAttribute('data-watch')) !== -1;
        b.setAttribute('aria-pressed', String(on));
        b.querySelector('.watchglyph').textContent = on ? '★' : '☆';
        b.querySelector('.watchtext').textContent = on ? 'Watching' : 'Watch';
        b.setAttribute('aria-label', (on ? 'Stop watching ' : 'Watch ') + b.getAttribute('data-watch'));
      });
    };
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-watch');
        var at = watched.indexOf(t);
        var next = watched.slice();
        if (at === -1) next.push(t); else next.splice(at, 1);
        if (!writeWatch(next)) {
          b.querySelector('.watchtext').textContent = 'Could not save';
          return;
        }
        watched = next;
        paint();
        track('watchlist_changed', { watching: watched.length });
      });
    });
    paint();
  })();

  /* ============ delivery rail ============
     A stage opens its own evidence. The rail lives on site pages, so this is
     not scoped to a route. */
  qsa('.ed-railbtn[aria-controls]').forEach(function (b) {
    b.addEventListener('click', function () {
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      var open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      if (panel) panel.hidden = open;
      if (!open) track('delivery_stage_interact', { stage: b.getAttribute('aria-controls') });
    });
  });

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

    /* ---- scheduled earnings dates ----
       These are exchange-scheduled events from the provider, not company
       guidance about delivery, and they are labelled as such on every card.
       They are merged in at render time rather than baked into the build,
       because a build from last week would show a date that has since moved. */
    api('/api/catalysts?symbols=' + WATCH.join(',') + '&days=270')
      .then(function (d) {
        if (!d || !d.available || !d.events || !d.events.length) return;
        var merged = d.events.map(function (e) {
          var days = dayGap(e.expectedAt);
          if (days === null || days < 0) return null;
          return {
            id: e.id,
            companyId: (CFG.companyByTicker || {})[e.ticker] || e.ticker,
            ticker: e.ticker,
            company: NAMES[e.ticker] || e.ticker,
            title: e.title,
            category: 'earnings',
            status: 'confirmed-date',
            when: fmtDate(e.expectedAt),
            certainty: 'Scheduled date',
            countdown: days === 0 ? 'Today' : 'in ' + days + ' days',
            group: days <= 30 ? 'Next 30 days' : days <= 92 ? 'Next quarter' : 'Later',
            tone: 'ok',
            description: e.description,
            affects: null,
            // Provider-supplied, so it carries the provider's name rather than a
            // T2C source link it does not have.
            sourceHtml: '<span class="src none" title="Scheduled date supplied by the market data ' +
              'provider, not a T2C-sourced document.">provider: ' + esc(e.provider || 'finnhub') + '</span>'
          };
        }).filter(Boolean);

        if (!merged.length) return;
        window.T2C_CATALYSTS = (window.T2C_CATALYSTS || []).concat(merged);

        // Offer the new category only now that something matches it.
        var catSel = $('catCategory');
        if (catSel && !catSel.querySelector('option[value="earnings"]')) {
          var opt = document.createElement('option');
          opt.value = 'earnings';
          opt.textContent = 'Earnings';
          catSel.appendChild(opt);
        }
        renderCats();
      })
      .catch(function () { /* the curated catalysts still render */ });
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
