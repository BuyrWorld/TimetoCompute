/* Edge Lab browser controller. Loaded by app.js on /lab/ only.
   Kept separate so the homepage does not pay for the simulation code. */
(function () {
  'use strict';
  if (!document.getElementById('labAnswer')) return;

  var CFG = (function () {
    var el = document.getElementById('t2c-config');
    try { return el ? JSON.parse(el.textContent) : {}; } catch (e) { return {}; }
  })();
  var LAB = window.T2C_LAB;              // engine + data, injected by the build
  if (!LAB) return;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var money = function (m) {
    if (m === null || m === undefined || !isFinite(m)) return 'Not available';
    if (Math.abs(m) >= 1000) return '$' + (m / 1000).toFixed(2) + 'bn';
    return '$' + m.toFixed(0) + 'm';
  };
  var pctf = function (x, dp) { return x === null || x === undefined ? '—' : (x * 100).toFixed(dp || 0) + '%'; };

  /* ---- state ---- */
  var state = {
    mode: 'requires',
    companyId: ($('labCompany') || {}).value || LAB.companies[0].id,
    price: null,
    quarters: 12,
    preset: 'base',
    shift: 0,
    assumptions: null,
    stress: null
  };

  var PRESETS = {
    verified: { utilisation: 0.90, ebitdaMarginDelta: -0.05, evEbitdaMultiple: 10, capexOverrun: 0.05,
      note: 'Only what the evidence supports, with cautious operating assumptions.' },
    conservative: { utilisation: 0.85, ebitdaMarginDelta: -0.10, evEbitdaMultiple: 8, capexOverrun: 0.15,
      note: 'Slower ramp, thinner margin, lower multiple, meaningful overrun.' },
    base: { utilisation: 0.95, ebitdaMarginDelta: 0, evEbitdaMultiple: 14, capexOverrun: 0,
      note: 'Company-disclosed contract terms at planning-level operating assumptions.' },
    optimistic: { utilisation: 0.98, ebitdaMarginDelta: 0.05, evEbitdaMultiple: 18, capexOverrun: 0,
      note: 'Full utilisation, stronger margin, a higher multiple. Deliberately generous.' }
  };

  function company() {
    return LAB.companies.filter(function (c) { return c.id === state.companyId; })[0];
  }

  /**
   * The tranches actually fed to the engine.
   *
   * Capacity with no evidenced date is passed through untouched — the engine
   * already earns nothing from a tranche with no revenue date, and the panel below
   * names that capacity rather than letting it vanish silently.
   *
   * The delivery slider moves only what has NOT been delivered. Shifting capacity
   * that a company has already been paid for would be modelling the past.
   */
  function tranchesFor(c) {
    if (!state.shift) return c.tranches;
    var e = LAB.engine;
    return c.tranches.map(function (t) {
      if (t.delivered || !t.revenueFrom) return t;
      var moved = e.quarterEnd(e.addQuarters(e.quarterOf(t.revenueFrom), state.shift));
      var out = {};
      for (var k in t) out[k] = t[k];
      out.revenueFrom = moved;
      out.acceptedAt = moved;
      out.energisedAt = moved;
      return out;
    });
  }

  var BASIS = {
    'evidenced-gate': { tone: 'ok', label: 'Evidenced' },
    'evidenced-undated': { tone: 'warn', label: 'Evidenced, undated' },
    'evidenced-window': { tone: 'ok', label: 'Guided window' },
    'upper-bound': { tone: 'warn', label: 'Upper bound' },
    'no-window': { tone: 'unknown', label: 'No date on record' },
    'no-site': { tone: 'unknown', label: 'No site named' },
    'none': { tone: 'unknown', label: 'No evidence' }
  };

  function assumptionsFor() {
    var c = company();
    var p = PRESETS[state.preset];
    var baseMargin = LAB.defaults.ebitdaMargin[c.model] || 0.6;
    return {
      utilisation: p.utilisation,
      ebitdaMargin: Math.max(0.05, Math.min(0.95, baseMargin + p.ebitdaMarginDelta)),
      maintenanceCapexPctOfRevenue: LAB.defaults.maintenanceCapexPctOfRevenue,
      interestRate: LAB.defaults.interestRate,
      debtShareOfCapex: LAB.defaults.debtShareOfCapex,
      capexOverrun: p.capexOverrun,
      valuationMethod: 'evEbitda',
      evEbitdaMultiple: p.evEbitdaMultiple,
      evRevenueMultiple: LAB.defaults.evRevenueMultiple,
      discountRate: LAB.defaults.discountRate
    };
  }

  /* ---- rendering ---- */

  function renderAnswer() {
    var c = company();
    var a = assumptionsFor();
    var run = LAB.engine.runScenario({
      tranches: tranchesFor(c), assumptions: a, balance: c.balance,
      startQuarter: LAB.startQuarter, quarters: state.quarters
    });

    if (!run.available) {
      $('labAnswer').innerHTML =
        '<div class="unavail"><h3>This company cannot be modelled yet</h3><p>' +
        esc(run.missing.join('. ')) + '</p></div>';
      $('labResults').innerHTML = '';
      return;
    }

    var v = run.valuation;
    var rr = v.runRate;

    if (state.mode === 'requires' || state.mode === 'target') {
      var targetEv = state.price && c.balance.sharesOutstandingM
        ? state.price * c.balance.sharesOutstandingM
        : null;

      if (targetEv === null) {
        $('labAnswer').innerHTML =
          '<div class="answercard answercard-ask">' +
          '<div class="answerkicker">' + esc(c.name) + '</div>' +
          '<h3>Enter a price to see what it would require</h3>' +
          '<p>T2C does not source share counts or balance sheets, so a per-share question needs two ' +
          'numbers from you. Add them under Advanced assumptions and the requirement appears here.</p>' +
          '</div>';
      } else {
        var solved = LAB.engine.solveFor({
          variable: 'billableMwMultiplier', targetEquityValueM: targetEv,
          tranches: tranchesFor(c), assumptions: a, balance: c.balance,
          startQuarter: LAB.startQuarter, quarters: state.quarters
        });

        if (!solved.solved) {
          $('labAnswer').innerHTML =
            '<div class="answercard answercard-none">' +
            '<div class="answerkicker">' + esc(c.name) + ' at $' + state.price + '</div>' +
            '<h3>No amount of delivery reaches this valuation on these assumptions</h3>' +
            '<p>' + esc(solved.reason) + '.</p>' +
            '<p class="answernote">Modelled equity value ranges from ' + money(solved.range && solved.range.min) +
            ' to ' + money(solved.range && solved.range.max) + ' across the searched range. ' +
            'Raising the multiple or the margin under Advanced assumptions would change this.</p></div>';
        } else {
          var baseMw = c.totalTrancheMw;
          var requiredMw = baseMw * solved.value;
          var verdict = LAB.engine.classifyRequirement({
            requiredMw: requiredMw, evidencedMw: c.evidencedMw, contractedMw: c.contractedMw
          });
          var vspec = LAB.engine.REQUIREMENT_VERDICT[verdict];

          $('labAnswer').innerHTML =
            '<div class="answercard">' +
            '<div class="answerkicker">' + esc(c.name) + ' at $' + state.price + ' per share</div>' +
            '<h3>Would need roughly <b>' + Math.round(requiredMw) + ' MW</b> billable by ' +
            esc(LAB.horizonLabel(state.quarters)) + '</h3>' +
            '<div class="verdict verdict-' + vspec.tone + '">' + esc(vspec.label) + '</div>' +
            '<dl class="answerfacts">' +
            '<dt>Evidenced today</dt><dd>' + (c.evidencedMw === null ? 'Not disclosed' : c.evidencedMw + ' MW switched on') + '</dd>' +
            '<dt>Customers have signed for</dt><dd>' + (c.contractedMw === null ? 'Not disclosed' : c.contractedMw + ' MW') + '</dd>' +
            '<dt>Requirement vs contracted</dt><dd>' + (c.contractedMw ? (requiredMw / c.contractedMw).toFixed(2) + '×' : '—') + '</dd>' +
            '</dl>' +
            '<p class="answernote">Solved by holding every other assumption constant: ' +
            pctf(a.utilisation) + ' utilisation, ' + pctf(a.ebitdaMargin) + ' EBITDA margin, ' +
            a.evEbitdaMultiple + '× EV/EBITDA. This is what <em>would need to be true</em> — not what the ' +
            'market believes.</p></div>';
        }
      }
    } else {
      $('labAnswer').innerHTML =
        '<div class="answercard">' +
        '<div class="answerkicker">' + esc(c.name) + ' — modelled scenario</div>' +
        '<h3>' + money(v.equityValueM) + ' equity value</h3>' +
        '<dl class="answerfacts">' +
        '<dt>Run-rate revenue</dt><dd>' + money(rr.revenueM) + '</dd>' +
        '<dt>Run-rate EBITDA</dt><dd>' + money(rr.ebitdaM) + '</dd>' +
        '<dt>Method</dt><dd>' + esc(v.methodLabel) + ' at ' + a.evEbitdaMultiple + '×</dd>' +
        '<dt>Per share</dt><dd>' + (run.perShare.available ? '$' + run.perShare.perShare : 'Needs a share count') + '</dd>' +
        '</dl></div>';
    }

    renderResults(run, a, c);
  }

  function renderResults(run, a, c) {
    var rows = run.projection.rows;
    var f = run.funding;

    var chart = rows.map(function (r) {
      var max = Math.max.apply(null, rows.map(function (x) { return x.billableMw || 0; })) || 1;
      var h = Math.round(((r.billableMw || 0) / max) * 100);
      return '<div class="qbar" title="' + esc(r.label) + ': ' + (r.billableMw || 0) + ' MW billable, ' +
        money(r.revenueM) + ' revenue">' +
        '<i style="height:' + h + '%"></i><span>' + esc(r.label.replace(' 20', "'")) + '</span></div>';
    }).join('');

    var sim = LAB.engine.simulate({
      tranches: tranchesFor(c), assumptions: a, balance: c.balance,
      startQuarter: LAB.startQuarter, quarters: state.quarters,
      paths: 2000, seed: 20260815,
      currentPrice: state.price
    });

    var stressRows = Object.keys(LAB.engine.STRESS_TESTS).map(function (key) {
      var s = LAB.engine.stress({
        test: key, tranches: tranchesFor(c), assumptions: a, balance: c.balance,
        startQuarter: LAB.startQuarter, quarters: state.quarters
      });
      if (!s.available) return '';
      return '<button class="stresschip" type="button" data-stress="' + key + '">' +
        '<span class="stresslabel">' + esc(s.label) + '</span>' +
        '<span class="stressdelta ' + (s.deltaM < 0 ? 'is-down' : '') + '">' +
        (s.deltaPct === null ? '—' : (s.deltaPct * 100).toFixed(0) + '%') + '</span></button>';
    }).join('');

    $('labResults').innerHTML =
      '<section class="block"><div class="blockhead"><h2>Billable capacity by quarter</h2>' +
      '<span class="blockmeta">Gate-respecting: revenue only after acceptance</span></div>' +
      '<div class="blockbody"><div class="qchart" role="img" aria-label="' +
      esc(rows.map(function (r) { return r.label + ': ' + (r.billableMw || 0) + ' MW'; }).join('; ')) +
      '">' + chart + '</div></div></section>' +

      '<div class="grid2">' +
      '<section class="block"><div class="blockhead"><h2>Funding</h2></div><div class="blockbody">' +
      '<dl class="answerfacts">' +
      '<dt>Peak cash deficit</dt><dd>' + money(f.peakDeficitM) + '</dd>' +
      '<dt>Existing cash applied</dt><dd>' + (f.existingCashM === null ? 'Not supplied' : money(f.existingCashM)) + '</dd>' +
      '<dt>Funding gap</dt><dd>' + money(f.fundingGapM) + '</dd>' +
      '<dt>Assumed debt</dt><dd>' + money(f.debtM) + '</dd>' +
      '<dt>Assumed equity</dt><dd>' + money(f.equityM) + '</dd>' +
      '<dt>Dilution</dt><dd>' + (f.dilutionPct === null ? 'Needs a share count and issue price' : pctf(f.dilutionPct, 1)) + '</dd>' +
      '</dl></div></section>' +

      '<section class="block"><div class="blockhead"><h2>Outcome range</h2>' +
      '<span class="blockmeta">' + sim.paths + ' seeded paths</span></div><div class="blockbody">' +
      (sim.available
        ? '<dl class="answerfacts">' +
          '<dt>10th percentile</dt><dd>' + money(sim.equityValueM.p10) + '</dd>' +
          '<dt>Median</dt><dd>' + money(sim.equityValueM.p50) + '</dd>' +
          '<dt>90th percentile</dt><dd>' + money(sim.equityValueM.p90) + '</dd>' +
          '<dt>Chance of a funding shortfall</dt><dd>' +
          (sim.fundingShortfallAvailable ? pctf(sim.probabilityFundingShortfall) : 'Needs a cash balance') + '</dd>' +
          (sim.probabilityAbovePrice !== null
            ? '<dt>Chance above $' + state.price + '</dt><dd>' + pctf(sim.probabilityAbovePrice) + '</dd>' : '') +
          '</dl><p class="blocknote">' + esc(sim.caution) + '</p>'
        : '<p class="blocknote">Not enough inputs to simulate.</p>') +
      '</div></section></div>' +

      '<section class="block"><div class="blockhead"><h2>Stress tests</h2>' +
      '<span class="blockmeta">Change in modelled equity value</span></div>' +
      '<div class="blockbody"><div class="stressrow">' + stressRows + '</div></div></section>';
  }

  function renderAssumptions() {
    var a = assumptionsFor();
    var c = company();
    var rows = [
      ['Utilisation', pctf(a.utilisation), LAB.provenance.utilisation],
      ['EBITDA margin', pctf(a.ebitdaMargin), LAB.provenance.ebitdaMargin],
      ['EV/EBITDA multiple', a.evEbitdaMultiple + '×', LAB.provenance.evEbitdaMultiple],
      ['Capex overrun', pctf(a.capexOverrun), 'Model input.'],
      ['Debt share of funding', pctf(a.debtShareOfCapex), LAB.provenance.debtShareOfCapex],
      ['Interest rate', pctf(a.interestRate, 1), LAB.provenance.interestRate]
    ].map(function (r) {
      return '<div class="assumprow"><div class="assumplabel">' + esc(r[0]) + '</div>' +
        '<div class="assumpvalue">' + esc(r[1]) + '</div>' +
        '<div class="assumpnote">' + esc(r[2]) + '</div></div>';
    }).join('');

    var contracts = (c.contractEconomics || []).map(function (e) {
      return '<div class="assumprow"><div class="assumplabel">' + esc(e.label) + '</div>' +
        '<div class="assumpvalue">$' + e.displayPerMwYearM + 'm / MW / yr</div>' +
        '<div class="assumpnote">' + esc(e.derivation) + '</div></div>';
    }).join('');

    $('labAssumptions').innerHTML =
      '<p class="blocknote"><b>' + esc(PRESETS[state.preset].note) + '</b></p>' +
      '<div class="assumpgroup"><h4>Revenue, derived from disclosure</h4>' +
      (contracts || '<p class="blocknote">No contract discloses value, megawatts and term together.</p>') + '</div>' +
      '<div class="assumpgroup"><h4>Model inputs — not sourced facts</h4>' + rows + '</div>' +
      '<div class="assumpgroup"><h4>Balance sheet — your figures</h4>' +
      '<div class="labbalance">' +
      '<div class="fld"><label for="balShares">Diluted shares <span class="fldunit">millions</span></label>' +
      '<input type="number" id="balShares" step="1" value="' + (c.balance.sharesOutstandingM || '') + '" /></div>' +
      '<div class="fld"><label for="balCash">Cash <span class="fldunit">$m</span></label>' +
      '<input type="number" id="balCash" step="10" value="' + (c.balance.cashM || '') + '" /></div>' +
      '<div class="fld"><label for="balDebt">Debt <span class="fldunit">$m</span></label>' +
      '<input type="number" id="balDebt" step="10" value="' + (c.balance.debtM || '') + '" /></div>' +
      '<div class="fld"><label for="balIssue">Equity issue price <span class="fldunit">USD</span></label>' +
      '<input type="number" id="balIssue" step="0.5" value="' + (c.balance.equityIssuePrice || '') + '" /></div>' +
      '</div><p class="blocknote">T2C does not source balance-sheet data, so these are yours to set. ' +
      'Per-share outputs stay unavailable until a share count is entered — they are never guessed.</p></div>';

    ['balShares', 'balCash', 'balDebt', 'balIssue'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', function () {
        var c2 = company();
        var v = parseFloat(el.value);
        var key = { balShares: 'sharesOutstandingM', balCash: 'cashM', balDebt: 'debtM', balIssue: 'equityIssuePrice' }[id];
        c2.balance[key] = isFinite(v) ? v : null;
        schedule();
      });
    });
  }

  /**
   * What the model is standing on, before any of its output.
   *
   * Every tranche is listed with the date it earns from and where that date came
   * from, and capacity T2C cannot date is shown as a running total rather than
   * quietly contributing nothing. A reader who disagrees with a date can see
   * exactly which one to argue with.
   */
  function renderWhat() {
    var c = company();
    var host = $('labWhat');
    if (!host) return;
    var t = tranchesFor(c);

    var rows = t.map(function (tr) {
      var b = BASIS[tr.dateBasis] || BASIS.none;
      return '<tr>' +
        '<td>' + esc(tr.label) + '</td>' +
        '<td>' + Math.round(tr.capacityMw) + ' MW</td>' +
        '<td>$' + tr.revenuePerMwYearM.toFixed(2) + 'm</td>' +
        '<td>' + (tr.revenueFrom ? esc(tr.revenueFrom) : '<span class="nd">Never, on this evidence</span>') + '</td>' +
        '<td class="prov"><span class="basis basis-' + b.tone + '">' + esc(b.label) + '</span>' +
        '<span class="basisnote">' + esc(tr.dateNote) + '</span></td>' +
        '</tr>';
    }).join('');

    var earning = t.filter(function (x) { return x.revenueFrom; })
      .reduce(function (a2, x) { return a2 + x.capacityMw; }, 0);

    host.innerHTML =
      '<details class="advanced" id="whatBlock"' + (c.undatedMw ? ' open' : '') + '>' +
      '<summary>What this model is standing on ' +
      '<span class="advsub">' + Math.round(earning) + ' MW dated' +
      (c.undatedMw ? ', ' + Math.round(c.undatedMw) + ' MW with no date' : '') + '</span></summary>' +
      '<div class="advbody">' +
      (c.undatedMw
        ? '<p class="blocknote warnnote"><b>' + Math.round(c.undatedMw) + ' MW of contracted capacity ' +
          'has no delivery date on record.</b> It earns nothing in every figure below. That is a gap in ' +
          'what the company has disclosed, not a judgement about the capacity.</p>'
        : '') +
      '<div class="tw"><table><thead><tr>' +
      '<th>Tranche</th><th>Capacity</th><th>Rate / MW / yr</th>' +
      '<th>Earns from</th><th class="prov">Where that date comes from</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
      '<p class="blocknote">Rates are arithmetic from each contract\'s own disclosed value, megawatts ' +
      'and term. No peer average is ever substituted for a rate a company has not disclosed.</p>' +
      '</div></details>';
  }

  /* ---- debounce so dragging an input does not run 40 simulations ---- */
  var pending = null;
  function schedule() {
    if (pending) clearTimeout(pending);
    pending = setTimeout(function () { renderAnswer(); renderAssumptions(); renderWhat(); }, 180);
  }

  /* ---- wiring ---- */
  document.querySelectorAll('.mode[data-lab]').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.mode[data-lab]').forEach(function (x) {
        x.classList.remove('is-active'); x.setAttribute('aria-selected', 'false');
      });
      b.classList.add('is-active'); b.setAttribute('aria-selected', 'true');
      state.mode = b.dataset.lab;
      var odds = document.getElementById('odds');
      if (odds) odds.hidden = state.mode !== 'odds';
      var main = document.getElementById('labResults');
      var ans = document.getElementById('labAnswer');
      if (main) main.hidden = state.mode === 'odds';
      if (ans) ans.hidden = state.mode === 'odds';
      if (state.mode !== 'odds') schedule();
    });
  });

  if ($('labCompany')) $('labCompany').addEventListener('change', function (e) {
    state.companyId = e.target.value; schedule();
  });
  if ($('labPrice')) $('labPrice').addEventListener('input', function (e) {
    var v = parseFloat(e.target.value); state.price = isFinite(v) ? v : null; schedule();
  });
  if ($('labHorizon')) $('labHorizon').addEventListener('change', function (e) {
    state.quarters = parseInt(e.target.value, 10) || 12; schedule();
  });
  if ($('labPreset')) $('labPreset').addEventListener('change', function (e) {
    state.preset = e.target.value; schedule();
  });
  if ($('labShift')) $('labShift').addEventListener('input', function (e) {
    state.shift = parseInt(e.target.value, 10) || 0;
    var out = $('labShiftOut');
    if (out) {
      out.textContent = state.shift === 0 ? 'on schedule'
        : state.shift > 0
          ? state.shift + (state.shift === 1 ? ' quarter later' : ' quarters later')
          : Math.abs(state.shift) + (state.shift === -1 ? ' quarter earlier' : ' quarters earlier');
    }
    schedule();
  });

  // Deep link: /lab/?company=iren, so "Open in Edge Lab" on a company page lands
  // on that company rather than on whichever one happens to be first.
  (function () {
    var want = new URLSearchParams(location.search).get('company');
    if (!want) return;
    var match = LAB.companies.filter(function (c) {
      return c.id === want || c.ticker.toLowerCase() === want.toLowerCase();
    })[0];
    if (!match) return;
    state.companyId = match.id;
    if ($('labCompany')) $('labCompany').value = match.id;
  })();

  // Deep link: /lab/#odds opens Market odds, preserving the legacy route.
  if (location.hash === '#odds') {
    var oddsBtn = document.querySelector('.mode[data-lab="odds"]');
    if (oddsBtn) oddsBtn.click();
  } else {
    var oddsSection = document.getElementById('odds');
    if (oddsSection) oddsSection.hidden = true;
  }

  renderAnswer();
  renderAssumptions();
  renderWhat();
})();
