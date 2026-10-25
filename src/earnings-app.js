/* Earnings calendar: the next reports as date cards, the rest as a list. */
(function () {
  var D = window.T2C_EARNINGS;
  var next = document.getElementById('ecNext');
  if (!D || !next) return;
  var byT = {};
  D.forEach(function (r) { byT[r.t] = r; });
  var meta = document.getElementById('ecMeta');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  var SESSION = { bmo: 'Before the open', amc: 'After the close', dmh: 'During market hours' };
  function days(iso) {
    var d = new Date(iso + 'T12:00:00Z'), now = new Date();
    now = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
    return Math.round((d - now) / 86400000);
  }
  function when(n) { return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'In ' + n + ' days'; }
  function period(e) { return e.quarter && e.year ? 'Q' + e.quarter + ' ' + e.year : ''; }

  function card(e) {
    var r = byT[e.ticker] || { n: e.ticker, t: e.ticker };
    var d = new Date(e.expectedAt + 'T12:00:00Z');
    var n = days(e.expectedAt);
    return '<li class="eccard' + (n <= 7 ? ' is-soon' : '') + '">' +
      '<div class="ecdate"><span class="ecmon">' + d.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }) + '</span>' +
        '<span class="ecday">' + d.getUTCDate() + '</span>' +
        '<span class="ecdow">' + d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }) + '</span></div>' +
      '<div class="ecbody">' +
        '<p class="eccountdown">' + esc(when(n)) + (e.session && SESSION[e.session] ? ' · ' + esc(SESSION[e.session]) : '') + '</p>' +
        '<h3 class="ecname">' + (r.h ? '<a class="press" href="' + esc(r.h) + '">' + esc(r.n) + '</a>' : esc(r.n)) +
          ' <span class="cxtick">' + esc(e.ticker) + '</span></h3>' +
        '<p class="ecstage">' + (r.art ? '<span class="nhhex" data-frame="' + esc(r.frame) + '"><img src="' + esc(r.art) + '" alt="" width="44" height="44" loading="lazy" /></span>' : '') +
          '<span>' + esc(r.stage || '') + (period(e) ? ' · reporting ' + esc(period(e)) : '') + '</span></p>' +
        (r.ops && r.ops.length ? '<p class="nhtags"><span class="nhtagk">Touches</span>' + r.ops.map(function (o) {
          return '<span class="nhtag nhtag-op">' + esc(o.name) + '<span class="nhwhy">' + esc(o.why) + '</span></span>';
        }).join('') + '</p>' : '') +
      '</div></li>';
  }

  function row(e) {
    var r = byT[e.ticker] || { n: e.ticker };
    var d = new Date(e.expectedAt + 'T12:00:00Z');
    return '<li><span class="hmwhen">' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) + '</span>' +
      '<span class="eclname">' + (r.h ? '<a class="press" href="' + esc(r.h) + '">' + esc(r.n) + '</a>' : esc(r.n)) +
      ' <span class="cxtick">' + esc(e.ticker) + '</span></span>' +
      '<span class="ecsess">' + esc(SESSION[e.session] || '') + '</span></li>';
  }

  function render(ev, note) {
    ev = ev.filter(function (e) { return e.category === 'earnings' && days(e.expectedAt) >= 0; })
      .sort(function (a, b) { return a.expectedAt < b.expectedAt ? -1 : a.expectedAt > b.expectedAt ? 1 : 0; });
    // One date per company in the headline cards: its next report.
    var seen = {}, firsts = [], later = [];
    ev.forEach(function (e) { if (!seen[e.ticker]) { seen[e.ticker] = 1; firsts.push(e); } else later.push(e); });
    /* Operators (and NVIDIA) first: the neoclouds and AI-infrastructure
       builders are what the site is about, and in a busy season eight supplier
       dates would otherwise push every one of them below the fold. */
    var isOp = function (e) { var r = byT[e.ticker] || {}; return r.stage === 'Operators' || r.lead; };
    var ops = firsts.filter(isOp);
    var rest = firsts.filter(function (e) { return !isOp(e); });
    var top = rest.slice(0, 8);
    later = rest.slice(8).concat(later).sort(function (a, b) { return a.expectedAt < b.expectedAt ? -1 : 1; });
    var opsList = document.getElementById('ecOps');
    if (opsList) opsList.innerHTML = ops.length ? ops.map(card).join('')
      : '<li class="nhempty">No operator has a report scheduled in the next six months.</li>';
    next.innerHTML = top.length ? top.map(card).join('')
      : '<li class="nhempty">No other report is scheduled in the next six months.</li>';
    if (meta) meta.textContent = firsts.length + ' companies with a scheduled report' + (note ? ' · ' + note : '');
    var wrap = document.getElementById('ecLaterWrap');
    wrap.hidden = !later.length;
    document.getElementById('ecLaterCount').textContent = '(' + later.length + ')';
    document.getElementById('ecLater').innerHTML = later.map(row).join('');
  }

  /* The build-time snapshot renders at once, so the calendar is never empty
     while the live lookup runs or if it is rate-limited. Live data then
     replaces a company's dates wherever the live lookup answered for it; a
     company it missed keeps its snapshot dates. */
  var snap = window.T2C_EARNINGS_SNAPSHOT;
  var snapNote = snap && snap.asOf ? 'dates as of ' + new Date(snap.asOf).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
  if (snap && snap.events && snap.events.length) render(snap.events, snapNote + ', refreshing');

  fetch('/api/catalysts?days=200&symbols=' + encodeURIComponent(D.map(function (r) { return r.t; }).join(',')))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) {
      var live = (j.events || []).filter(function (e) { return e.category === 'earnings'; });
      var answered = {};
      live.forEach(function (e) { answered[e.ticker] = 1; });
      var kept = snap && snap.events ? snap.events.filter(function (e) { return !answered[e.ticker]; }) : [];
      render(live.concat(kept), kept.length ? 'live, with some ' + snapNote : 'live');
    })
    .catch(function () {
      if (snap && snap.events && snap.events.length) { render(snap.events, snapNote); return; }
      if (meta) meta.textContent = 'Unavailable';
      next.innerHTML = '<li class="nhempty">Earnings dates are unavailable right now.</li>';
    });
})();
