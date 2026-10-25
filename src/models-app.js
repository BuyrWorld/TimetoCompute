/* The models page: pick a country to see its prices, filter by what a model
   does, sort by newest or cheapest. Plain ES5 like the other client scripts;
   without it the page still reads, in US dollars. */
(function () {
  'use strict';
  var D = window.T2C_MODELPAGE;
  var sel = document.getElementById('mpCountry');
  if (!D || !sel) return;

  var COUNTRY_OF = { US: 'us', GB: 'gb', DE: 'de', AT: 'de', FR: 'fr', BE: 'fr', CA: 'ca', AU: 'au', IN: 'in', JP: 'jp', BR: 'br', SG: 'sg' };
  function guess() {
    var saved = null;
    try { saved = localStorage.getItem('t2c-country'); } catch (e) {}
    if (saved && D.store && D.storefronts.some(function (s) { return s.cc === saved; })) return saved;
    var region = ((navigator.language || '').split('-')[1] || '').toUpperCase();
    return COUNTRY_OF[region] || 'us';
  }

  function fmt(v, s) {
    var big = v >= 100 && (s.currency === 'JPY' || s.currency === 'INR');
    try {
      return new Intl.NumberFormat(s.locale, { style: 'currency', currency: s.currency,
        minimumFractionDigits: 0, maximumFractionDigits: big ? 0 : v < 1 ? 4 : 2 }).format(v);
    } catch (e) { return s.currency + ' ' + v.toFixed(2); }
  }

  function apply(cc) {
    var s = D.storefronts.filter(function (x) { return x.cc === cc; })[0] || D.storefronts[0];
    var rate = D.perUsd[s.currency];
    document.querySelectorAll('.mpusd').forEach(function (el) {
      var v = +el.getAttribute('data-usd');
      if (s.currency === 'USD') { el.textContent = fmt(v, s); el.removeAttribute('title'); el.classList.remove('is-conv'); return; }
      el.textContent = '≈ ' + fmt(v * rate, s);
      el.title = 'Converted from $' + v + ' at the ECB rate of ' + D.fxDate;
      el.classList.add('is-conv');
    });
    document.querySelectorAll('.mpstore').forEach(function (el) {
      var p = (D.store[el.getAttribute('data-store')] || {})[s.cc];
      el.innerHTML = p ? '' : '<span class="nd">Not listed here</span>';
      if (p) el.textContent = p;
    });
    document.querySelectorAll('[data-appstore]').forEach(function (a) {
      a.href = 'https://apps.apple.com/' + s.cc + '/app/id' + a.getAttribute('data-appstore');
    });
    document.querySelectorAll('.mpcountry').forEach(function (el) {
      el.textContent = s.cc === 'us' ? 'the United States' : s.cc === 'gb' ? 'the United Kingdom' : s.name;
    });
    var fx = document.getElementById('mpFx');
    if (fx) fx.hidden = s.currency === 'USD';
    try { localStorage.setItem('t2c-country', s.cc); } catch (e) {}
  }

  sel.value = guess();
  apply(sel.value);
  sel.addEventListener('change', function () { apply(sel.value); });

  /* Filter by what a model does. */
  var chips = document.querySelectorAll('[data-mpkind]');
  var cards = [].slice.call(document.querySelectorAll('.mpcard'));
  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-mpkind');
      chips.forEach(function (c) { var on = c === b; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
      cards.forEach(function (c) { c.hidden = k !== 'all' && c.getAttribute('data-kind') !== k; });
    });
  });

  /* Sort: newest, cheapest to run (input price; unpriced last), or provider order. */
  var grid = document.getElementById('mpGrid');
  var original = cards.slice();
  var sort = document.getElementById('mpSort');
  function order(how) {
    var list = how === 'prov' ? original.slice() : cards.slice().sort(function (a, b) {
      if (how === 'new') return (b.getAttribute('data-released') || '').localeCompare(a.getAttribute('data-released') || '');
      var x = a.getAttribute('data-cost'), y = b.getAttribute('data-cost');
      if (x === '' && y === '') return 0; if (x === '') return 1; if (y === '') return -1;
      return +x - +y;
    });
    list.forEach(function (c) { grid.appendChild(c); });
  }
  if (sort) { sort.addEventListener('change', function () { order(sort.value); }); order(sort.value); }
})();
