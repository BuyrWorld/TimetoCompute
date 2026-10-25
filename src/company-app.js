/* Company page tabs. Without JavaScript every section shows in order; with
   it, one panel shows at a time, the URL hash names it, and the tab list is
   keyboard-operable (arrow keys move, Home/End jump). */
(function () {
  /* Next results: the build bakes the date in; if it could not, ask the live
     calendar once. */
  var nr = document.getElementById('coNextResults');
  if (nr && !nr.hasAttribute('data-have')) {
    var t = nr.getAttribute('data-ticker');
    fetch('/api/catalysts?days=200&symbols=' + encodeURIComponent(t)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var today = new Date().toISOString().slice(0, 10);
      var e = j && (j.events || []).filter(function (x) { return x.ticker === t && x.expectedAt >= today; })
        .sort(function (a, b) { return a.expectedAt < b.expectedAt ? -1 : 1; })[0];
      if (!e) return;
      var d = new Date(e.expectedAt + 'T12:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
      var sess = { bmo: 'before the open', amc: 'after the close' }[e.session] || 'date confirmed';
      nr.querySelector('dd').innerHTML = d + '<span class="cofactnote">' + sess + '</span>';
    }).catch(function () {});
  }
})();

(function () {
  var tabs = [].slice.call(document.querySelectorAll('.cotab[data-tab]'));
  if (!tabs.length) return;
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('data-tab')); });
  document.documentElement.classList.add('has-cotabs');

  function show(id, focus) {
    if (!document.getElementById(id) || tabs.every(function (t) { return t.getAttribute('data-tab') !== id; })) id = 'overview';
    tabs.forEach(function (t, i) {
      var on = t.getAttribute('data-tab') === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (panels[i]) panels[i].hidden = !on;
      if (on && focus) t.focus();
    });
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      var id = t.getAttribute('data-tab');
      show(id);
      try { history.replaceState(null, '', '#' + id); } catch (err) {}
    });
    t.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (n === null) return;
      e.preventDefault();
      var to = tabs[(n + tabs.length) % tabs.length];
      show(to.getAttribute('data-tab'), true);
      try { history.replaceState(null, '', '#' + to.getAttribute('data-tab')); } catch (err) {}
    });
  });

  // Any other link into a tab (the Reality Score ring, "#record" anchors) switches to it.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-tab]:not(.cotab)');
    if (!a) return;
    e.preventDefault();
    show(a.getAttribute('data-tab'));
    document.querySelector('.cotabs').scrollIntoView({ block: 'start' });
  });

  // A deep link to a section inside a tab (e.g. #score) opens that tab first.
  var hash = location.hash.slice(1);
  var target = hash && document.getElementById(hash);
  var owner = target && panels.filter(function (p) { return p && p.contains(target); })[0];
  show(owner ? owner.id : hash || 'overview');
  if (owner && target !== owner) setTimeout(function () { target.scrollIntoView(); }, 0);
})();
