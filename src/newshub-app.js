/* AI news hub: live stories, who they name, which operators they touch.
   A story counts only if its headline names a company on the map or a model
   provider; "touches" follows disclosed links up to two hops to reach the
   operators (neoclouds and AI-infrastructure builders). */
(function () {
  var D = window.T2C_NEWS;
  var list = document.getElementById('nhStories');
  if (!D || !list) return;

  var byId = {};
  D.companies.forEach(function (c) { byId[c.id] = c; });
  var count = document.getElementById('nhCount');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function reEsc(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function rx(words) { return new RegExp('\\b(' + words.map(reEsc).join('|') + ')\\b', 'i'); }

  /* How a headline names a company: full name, the name without a generic
     suffix, or the ticker. Never the first word alone. */
  var matchers = D.companies.filter(function (c) { return c.stage !== 'applications'; }).map(function (c) {
    var short = c.name.replace(/\s+(Technologies|Energy|Services|Electronics|Group|Systems USA|Manufacturing)$/, '');
    var words = [c.name];
    if (short !== c.name && short.length > 3) words.push(short);
    // Tickers match case-sensitively: "FIX" is Comfort Systems, "fix" is a verb.
    var tick = c.ticker && c.ticker.length > 2 ? new RegExp('\\b' + reEsc(c.ticker) + '\\b') : null;
    var name = rx(words);
    return { id: c.id, re: { test: function (h) { return name.test(h) || (tick ? tick.test(h) : false); } } };
  });
  var modelRe = rx([].concat.apply(D.providers.map(function (p) { return p.name; }),
    D.providers.map(function (p) { return p.models; })).concat(['Claude', 'Gemini', 'GPT', 'Grok', 'Muse', 'Qwen', 'DeepSeek', 'Mistral', 'Llama']));

  function neighbours(id) {
    var out = [];
    D.links.forEach(function (l) {
      if (l.from === id) out.push({ id: l.to, what: l.what, dir: 'down', kind: l.kind });
      if (l.to === id) out.push({ id: l.from, what: l.what, dir: 'up', kind: l.kind });
    });
    return out;
  }

  /* Operators reached from a named company, with the path that reaches them. */
  function touchedOperators(named) {
    var found = {};
    named.forEach(function (id) {
      if (byId[id].stage === 'operators') return;
      neighbours(id).forEach(function (n1) {
        if (byId[n1.id] && byId[n1.id].stage === 'operators' && named.indexOf(n1.id) < 0 && !found[n1.id]) {
          found[n1.id] = byId[id].name + ': ' + n1.what;
        }
        if (byId[n1.id] && byId[n1.id].stage !== 'operators') {
          neighbours(n1.id).forEach(function (n2) {
            /* Two hops only along one direction: TSMC -> NVIDIA -> CoreWeave is a
               supply chain; AMD -> OpenAI <- CoreWeave is two suppliers sharing a
               customer, and is not a link between them. */
            // Credit backing is the exception: Google guaranteeing Fluidstack's lease
            // reaches the landlord (TeraWulf) whichever way the link is drawn.
            if (n2.dir !== n1.dir && n1.kind !== 'backing') return;
            if (byId[n2.id] && byId[n2.id].stage === 'operators' && named.indexOf(n2.id) < 0 && !found[n2.id]) {
              found[n2.id] = 'via ' + byId[n1.id].name;
            }
          });
        }
      });
    });
    return Object.keys(found).map(function (k) { return { id: k, why: found[k] }; });
  }

  function stageIndex(stage) {
    for (var i = 0; i < D.stages.length; i++) if (D.stages[i].stages.indexOf(stage) > -1) return i;
    return -1;
  }

  var DOWN = /\b(fears?|concerns?|downgrades?|warns?|plung\w*|drops?|falls?|miss(?:ed|es)?|delays?|delayed|cuts?|lawsuit|probes?|sell-?off|shortage)\b/i;
  var UP = /\b(surges?|record|upgrades?|raises?|beats?|wins?|secures?|signs?|launch\w*|expands?|deal|partners?|growth)\b/i;
  function tone(h) { return DOWN.test(h) ? 'down' : UP.test(h) ? 'up' : 'flat'; }

  var stories = [];
  var showAll = false;
  var classify = window.T2C_classifyNews || function () { return 'industry'; };

  var current = 'all';
  function render(filter) {
    current = filter;
    var industry = stories.filter(function (s) { return s.cls === 'industry'; });
    var pool = showAll ? stories : industry;
    var hidden = stories.length - industry.length;
    var more = document.getElementById('nhMore');
    if (more) {
      more.hidden = !hidden;
      more.textContent = showAll ? 'Hide market commentary' : 'Show ' + hidden + ' market-commentary stor' + (hidden === 1 ? 'y' : 'ies');
      more.setAttribute('aria-pressed', String(showAll));
    }
    var rows = pool.filter(function (s) {
      if (filter === 'all') return true;
      if (filter === 'neocloud') return s.ops.length || s.named.some(function (id) { return byId[id].stage === 'operators'; });
      if (filter === 'models') return s.model;
      if (filter.indexOf('stage-') === 0) return s.stages.indexOf(+filter.slice(6)) > -1;
      return true;
    });
    if (count) count.textContent = rows.length + ' stor' + (rows.length === 1 ? 'y' : 'ies');
    var limit = +(list.getAttribute('data-limit') || 40);
    list.innerHTML = rows.length ? rows.slice(0, limit).map(function (s) {
      var st = D.stages[s.stages.filter(function (x) { return x > -1; })[0]];
      var when = s.datetime ? new Date(s.datetime * 1000).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      return '<li class="nhstory nhtone-' + s.tone + '">' +
        (st ? '<span class="nhhex" data-frame="' + esc(st.frame) + '" title="' + esc(st.label) + '"><img src="' + esc(st.art) +
          '" alt="" width="44" height="44" loading="lazy" decoding="async" /></span>' : '<span class="nhhex nhhex-none" aria-hidden="true"></span>') +
        '<div class="nhstorymain">' +
          (st ? '<span class="nhstage">' + esc(st.label) + '</span>' : (s.model ? '<span class="nhstage">Models</span>' : '')) +
          '<a class="nhstoryh" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.headline) + '</a>' +
          '<span class="nhwhen">' + esc(s.source || '') + (when ? ' · ' + esc(when) : '') +
            ' · <span class="nhtone">' + (s.tone === 'up' ? 'Upbeat headline' : s.tone === 'down' ? 'Downbeat headline' : 'Neutral headline') + '</span></span>' +
          (s.named.length ? '<p class="nhtags"><span class="nhtagk">Names</span>' + s.named.map(function (id) {
            var c = byId[id];
            return c.href ? '<a class="nhtag press" href="' + esc(c.href) + '">' + esc(c.name) + '</a>' : '<span class="nhtag">' + esc(c.name) + '</span>';
          }).join('') + '</p>' : '') +
          (s.ops.length ? '<p class="nhtags"><span class="nhtagk">Touches</span>' + s.ops.map(function (o) {
            var c = byId[o.id];
            return '<a class="nhtag nhtag-op press" href="' + esc(c.href || '/') + '" title="' + esc(o.why) + '">' + esc(c.name) +
              '<span class="nhwhy">' + esc(o.why) + '</span></a>';
          }).join('') + '</p>' : '') +
        '</div>' +
        (s.image ? '<img class="nhimg" src="' + esc(s.image) + '" alt="" loading="lazy" decoding="async" width="120" height="80" />' : '') +
      '</li>';
    }).join('') : '<li class="nhempty">No story in this part of the chain in the last few days.</li>';
  }

  var moreBtn = document.getElementById('nhMore');
  if (moreBtn) moreBtn.addEventListener('click', function () { showAll = !showAll; render(current); });

  var filters = document.querySelectorAll('[data-filter]');
  filters.forEach(function (b) {
    b.addEventListener('click', function () {
      filters.forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      render(b.getAttribute('data-filter'));
    });
  });

  var mk = document.querySelectorAll('[data-mkind]');
  mk.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-mkind');
      mk.forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      document.querySelectorAll('.nhmodel').forEach(function (m) { m.hidden = k !== 'all' && m.getAttribute('data-kind') !== k; });
      document.querySelectorAll('.nhprov').forEach(function (p) {
        p.hidden = !p.querySelector('.nhmodel:not([hidden])');
      });
    });
  });

  fetch('/api/news?symbols=' + encodeURIComponent(list.getAttribute('data-tickers')))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) {
      var seen = {};
      stories = (j.items || []).map(function (n) {
        var h = n.headline || '';
        var named = matchers.filter(function (m) { return m.re.test(h); }).map(function (m) { return m.id; });
        var model = modelRe.test(h);
        if (!named.length && !model) return null;
        var key = h.toLowerCase().replace(/\W+/g, ' ').trim();
        if (seen[key]) return null;
        seen[key] = true;
        return {
          // Yahoo sends one generic house image for every story; that is not story art.
          headline: h, url: n.url, source: n.source, datetime: n.datetime,
          image: n.image && !/s\.yimg\.com\/.*yahoo_finance/i.test(n.image) ? n.image : null,
          named: named, model: model, tone: tone(h), ops: touchedOperators(named), cls: classify(h),
          stages: named.map(function (id) { return stageIndex(byId[id].stage); })
        };
      }).filter(Boolean);
      /* Industry news first, newest first within each class; commentary only
         appears when asked for. */
      var rank = { industry: 0, other: 1, commentary: 2 };
      stories.sort(function (a, b) { return (rank[a.cls] - rank[b.cls]) || ((b.datetime || 0) - (a.datetime || 0)); });
      render('all');
    })
    .catch(function () {
      if (count) count.textContent = 'Unavailable';
      list.innerHTML = '<li class="nhempty">Live news is unavailable right now. The sourced record alongside is unaffected.</li>';
    });
})();
