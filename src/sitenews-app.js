/* Site news: stories that name this site first, then the owner's own news.
   A story only counts as the site's if its headline names the site. */
(function () {
  var list = document.getElementById('siteNews');
  if (!list) return;
  var ticker = list.getAttribute('data-ticker');
  var company = list.getAttribute('data-company') || '';
  var aliases = [];
  try { aliases = JSON.parse(list.getAttribute('data-aliases') || '[]'); } catch (e) { aliases = []; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function rx(words) {
    var w = words.filter(Boolean).map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    return w.length ? new RegExp('\\b(' + w.join('|') + ')\\b', 'i') : null;
  }
  function row(n) {
    var when = n.datetime ? new Date(n.datetime * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
    return '<li><a href="' + esc(n.url) + '" target="_blank" rel="noopener">' + esc(n.headline) + '</a>' +
      '<span class="cxdwhen">' + esc(n.source || '') + (when ? ' · ' + esc(when) : '') + '</span></li>';
  }
  if (!ticker) { list.innerHTML = '<li class="cxdnone">This owner has no listed news feed.</li>'; return; }

  fetch('/api/news?symbols=' + encodeURIComponent(ticker))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) {
      var items = j.items || [];
      var siteRe = rx(aliases);
      // Full name, name without "Limited"/"Group", or ticker; never the first
      // word alone ("Applied" would match Applied Materials).
      var coRe = rx([company, company.replace(/\s+(Limited|Group|Infrastructure|Inc\.?)$/, ''), ticker]);
      var here = siteRe ? items.filter(function (n) { return siteRe.test(n.headline || ''); }) : [];
      var owner = coRe ? items.filter(function (n) { return here.indexOf(n) < 0 && coRe.test(n.headline || ''); }) : [];
      var html = here.length ? here.slice(0, 6).map(row).join('')
        : '<li class="cxdnone">No story names this site in the last few days.</li>';
      if (owner.length) html += '<li class="sxnewsh">From ' + esc(company) + '</li>' + owner.slice(0, 5).map(row).join('');
      list.innerHTML = html;
    })
    .catch(function () { list.innerHTML = '<li class="cxdnone">News is unavailable right now.</li>'; });
})();
