/* Is a headline industry news, or market commentary?
 *
 * The company-news feed is mostly stock-picking content ("Here's what $10,000
 * invested in Nvidia could be worth", "Where will Broadcom be in 5 years?").
 * It names real companies, so it passed the old filter, and it buried the
 * stories that actually move the supply chain: a 300 MW site energised, a
 * data-centre project cancelled, a financing closed.
 *
 * Two tests, in order:
 *   1. COMMENTARY — a buy/sell/valuation, "where the stock could go", "for
 *      investors" or question framing. Hidden by default, never deleted: the
 *      page says how many it hid and offers them back.
 *   2. INDUSTRY — names something that happened to capacity, supply, a deal,
 *      a launch, financing or a result. Shown.
 * Anything neither is "other", and is treated like commentary.
 *
 * Shared by the browser (window.T2C_classifyNews) and the tests (module.exports).
 */
(function (root) {
  var COMMENTARY = [
    /\bcould be worth\b/i, /\bworth (in|by) \d/i, /\bwhere will .{1,60} (be|stock be) in \d+ years?\b/i,
    /\bwhere the stock could go\b/i, /\bstock could (go|be|soar|double)\b/i, /\bstocks? (that )?could\b/i,
    /\bshould (you|investors) (buy|sell|worry)\b/i, /\bis .{1,40} a (buy|sell)\b/i, /\bbuy(ing)? the dip\b/i,
    /\bbetter (buy|stock)\b/i, /\b(stocks?|etfs?) to (watch|buy|own)\b/i, /\btop \d+ .{0,40}stocks\b/i,
    /\b\d+ (high quality|oversold|top|ai|founder led|dividend|growth|fastest-growing) .{0,30}stocks\b/i,
    /\bhere are \d+ stocks\b/i, /\bhere'?s (the price|why|what history|what to know)\b/i, /\bwhat to know\b/i,
    /\bthings to (monitor|watch|know)\b/i, /\bi'?d buy\b/i, /\bi'?m (still )?(buying|loading)\b/i,
    /\bload(ing)? up\b/i, /\btime to (buy|sell|load)\b/i, /\bprediction:/i, /\bhistory (says|shows|suggests)\b/i,
    /\bstock-split\b/i, /\b(over|under)valued\b/i, /\bbargain\b/i, /\bfully priced\b/i, /\bred flag\b/i,
    /\bskyrocket\b/i, /\bdividend income\b/i, /\bpriced for\b/i, /\bupside\b/i, /\bmillionaire\b/i,
    /\bbillionaires?\b/i, /\bwall street week ahead\b/i, /\bthe next (palantir|nvidia|amazon)\b/i,
    /\bmay be (a bargain|overvalued|undervalued|fully priced)\b/i, /\bfutures loom\b/i,
    /\bfrom worst to first\b/i, /\branked\b/i, /\bwatch\b:/i,
    /\bhere'?s what .{0,40}(imply|implies|means)\b/i, /\b(bond|stock|investment) ideas\b/i, /\banalysts?'? (price )?targets?\b/i,
    /\bfor .{0,30}investors\b/i, /\bcase for investing\b/i, /\binvestment narrative\b/i, /\binvestors (worry|cheer|should)\b/i,
    // Questions are opinion pieces ("Can X make up for Y?").
    /\?\s*$/, /\?\s+(plus|here|and)\b/i, /^(can|will|is|should|what|why|how|does|did) /i
  ];
  var INDUSTRY = new RegExp('(' + [
    '\\b\\d+(\\.\\d+)?\\s?(mw|gw|megawatts?|gigawatts?)\\b',
    '\\$\\d[\\d.,]*\\s?(billion|bn|million|m)\\b',
    '\\b(data ?cent(er|re)s?|campus|capex|backlog|contracts?|agreements?|lease[sd]?|deals?|orders?|' +
      'acquir\\w*|acquisition|merger|partnership|launch(es|ed)?|unveil(s|ed)?|releases?|shipments?|' +
      'energi[sz]\\w*|on[- ]site power|power (deal|supply|purchase|plant)|ppa|nuclear|substation|' +
      'financing|notes offering|credit (line|facility)|loan|ipo|earnings|results|guidance|' +
      'cancel\\w*|walk(s|ed)? away|delay(s|ed)?|halt\\w*|export (curbs?|controls?|ban)|tariffs?|hbm|wafers?|' +
      'foundry|fabs?|shortage|supply|packaging|secures?|signs?|wins?|closes?|starts?|opens?|expands?|breaks ground)\\b'
  ].join('|') + ')', 'i');

  function classify(headline) {
    var h = String(headline || '');
    for (var i = 0; i < COMMENTARY.length; i++) if (COMMENTARY[i].test(h)) return 'commentary';
    return INDUSTRY.test(h) ? 'industry' : 'other';
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { classify: classify };
  else root.T2C_classifyNews = classify;
})(this);
