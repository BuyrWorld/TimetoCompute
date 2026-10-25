/* Plain-English digests of filings the record has not caught up with.
   Nothing is fetched until a reader asks: each button calls /api/digest for
   its one filing, and the answer is cached at the edge for everyone after.
   Every point shows the sentence from the filing that supports it; the
   server has already dropped any point whose quote it could not find. */
(function () {
  'use strict';

  var REASONS = {
    'not-configured': 'Plain-English summaries are not switched on yet. The filing itself is on EDGAR.',
    'not-awaiting-review': 'This filing has since been reviewed, so its figures are already in the record.',
    'declined': 'No summary could be written for this filing. Read it on EDGAR.',
    'rate-limited': 'Too many summaries are being written at once. Try again in a minute.',
    'filing-unavailable': 'EDGAR did not return the filing just now. Try again in a minute.'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(d) {
    var when = new Date(d.writtenAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return '<p class="dglabel">AI summary of the filing, each point checked against its text</p>' +
      '<p class="dghead">' + esc(d.headline) + '</p>' +
      (d.points.length ? '<ol class="dgpoints">' + d.points.map(function (p) {
        return '<li><span>' + esc(p.point) + '</span><blockquote>“' + esc(p.quote) + '”</blockquote></li>';
      }).join('') + '</ol>' : '<p class="nhmeta">No point in this filing could be checked against its text.</p>') +
      '<p class="nhmeta">Written by Claude on ' + esc(when) + '.' +
      (d.unverifiedDropped ? ' ' + d.unverifiedDropped + ' point' + (d.unverifiedDropped === 1 ? ' was' : 's were') +
        ' dropped because the quote behind ' + (d.unverifiedDropped === 1 ? 'it' : 'them') + ' was not found in the filing.' : '') +
      (d.truncated ? ' The filing is long, so only its first part was read.' : '') +
      ' Not yet reflected in the figures on this site; read the filing before relying on it.</p>';
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-digest]');
    if (!btn) return;
    var out = btn.nextElementSibling;
    if (!out || !out.classList.contains('dgout')) return;
    if (btn.getAttribute('data-loaded')) {
      var open = out.hidden;
      out.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Hide the summary' : 'Show the summary';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Reading the filing…';
    out.hidden = false;
    out.innerHTML = '<p class="nhmeta">Reading the filing and checking each point against it. This can take half a minute the first time.</p>';
    fetch('/api/digest?url=' + encodeURIComponent(btn.getAttribute('data-digest')))
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false }; })
      .then(function (d) {
        btn.disabled = false;
        if (d && d.ok) {
          out.innerHTML = render(d);
          btn.setAttribute('data-loaded', '1');
          btn.setAttribute('aria-expanded', 'true');
          btn.textContent = 'Hide the summary';
        } else {
          out.innerHTML = '<p class="nhmeta">' + esc(REASONS[d && d.reason] || 'The summary could not be written just now. Try again in a minute.') + '</p>';
          btn.textContent = 'Try again';
        }
      });
  });
})();
