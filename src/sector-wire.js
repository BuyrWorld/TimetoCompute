(function () {
  var roots = document.querySelectorAll("[data-sector]");
  if (!roots.length) return;

  var DOWN = /\b(fear|fears|rattle|overvalued|concerns?|downgrades?|warnings?|warns?|risk|plung\w*|drops?|weak|miss(?:ed|es)?|delays?|delayed|slipped|cuts?|lawsuit|probes?|selloff|sell-off)\b/i;
  var UP = /\b(benefit|great news|surges?|records?|upgrades?|raises?|raised|beats?|wins?|secured|growth|growing|on track|energis\w*|energiz\w*|accepts?|accepted)\b/i;
  var span = { hour: 3600, day: 86400, week: 604800 };
  var names = ["IREN", "CRWV", "NBIS", "APLD", "WULF", "CIFR"];
  var items = [];

  function lean(text) {
    if (DOWN.test(text)) return -1;
    if (UP.test(text)) return 1;
    return 0;
  }

  function inWindow(root) {
    var key = root.getAttribute("data-window") || "day";
    var cut = Date.now() / 1000 - span[key];
    return items.filter(function (item) { return (item.datetime || 0) >= cut; });
  }

  function paint(root) {
    var rows = inWindow(root);
    var line = root.querySelector("[data-sector-line]");
    var count = root.querySelector("[data-sector-count]");
    var pos = 0;
    var neg = 0;
    var scored = 0;
    rows.forEach(function (item) {
      var n = lean(item.headline || "");
      if (n > 0) { pos += 1; scored += 1; }
      else if (n < 0) { neg += 1; scored += 1; }
    });
    var when = { hour: "hour", day: "day", week: "week" }[root.getAttribute("data-window") || "day"];
    var neither = rows.length - scored;
    if (!rows.length) line.textContent = "Quiet";
    else if (pos > neg) line.textContent = "Upbeat";
    else if (neg > pos) line.textContent = "Downbeat";
    else line.textContent = "Even";
    count.textContent = rows.length
      ? (pos + " upbeat, " + neg + " downbeat, " + neither + " neither, this " + when + ". A reading of headlines, not advice. Not a forecast and not advice.")
      : "Nothing in this window. Not a forecast and not advice.";

    names.forEach(function (ticker) {
      var tile = root.querySelector('[data-ticker="' + ticker + '"]');
      if (!tile) return;
      var mark = tile.querySelector("[data-mark]");
      var blurb = tile.querySelector("[data-line]");
      var mine = rows.filter(function (item) {
        return (item.symbols || []).indexOf(ticker) !== -1 || (item.headline || "").indexOf(ticker) !== -1;
      });
      var up = 0;
      var down = 0;
      mine.forEach(function (item) {
        var n = lean(item.headline || "");
        if (n > 0) up += 1;
        else if (n < 0) down += 1;
      });
      var word = !mine.length ? "Flat" : up > down ? "Up" : down > up ? "Down" : "Flat";
      mark.textContent = word;
      mark.setAttribute("data-tone", word === "Up" ? "ok" : word === "Down" ? "bad" : "unknown");
      if (!mine.length) blurb.textContent = "Nothing in this window.";
      else {
        blurb.textContent = "";
        var a = document.createElement("a");
        a.href = mine[0].url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = mine[0].headline;
        blurb.appendChild(a);
      }
    });
  }

  roots.forEach(function (root) {
    root.addEventListener("click", function (event) {
      var hit = event.target.closest(".vhit");
      if (!hit || !root.contains(hit)) return;
      var open = hit.getAttribute("aria-expanded") === "true";
      root.querySelectorAll(".vhit").forEach(function (button) {
        button.setAttribute("aria-expanded", "false");
        var more = button.parentElement.querySelector(".vmore");
        if (more) more.hidden = true;
      });
      if (!open) {
        hit.setAttribute("aria-expanded", "true");
        var more = hit.parentElement.querySelector(".vmore");
        if (more) more.hidden = false;
      }
    });
    root.querySelectorAll("[data-tape]").forEach(function (button) {
      button.addEventListener("click", function () {
        root.setAttribute("data-window", button.getAttribute("data-tape"));
        root.querySelectorAll("[data-tape]").forEach(function (other) {
          other.setAttribute("aria-pressed", String(other === button));
        });
        paint(root);
      });
    });
  });

  fetch("/api/news?symbols=" + names.join(","))
    .then(function (response) { return response.json(); })
    .then(function (data) {
      items = data.items || [];
      roots.forEach(paint);
    })
    .catch(function () {
      roots.forEach(function (root) {
        var line = root.querySelector("[data-sector-line]");
        if (line) line.textContent = "The wire did not load.";
      });
    });
}());
