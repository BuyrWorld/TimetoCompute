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
    var list = root.querySelector("[data-sector-list]");
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
    if (!rows.length) line.textContent = "Nothing in this window.";
    else if (pos > neg) line.textContent = "The wire leans upbeat this " + when + " — " + pos + " upbeat, " + neg + " downbeat, " + neither + " neither. A reading of headlines, not advice.";
    else if (neg > pos) line.textContent = "The wire leans downbeat this " + when + " — " + pos + " upbeat, " + neg + " downbeat, " + neither + " neither. A reading of headlines, not advice.";
    else line.textContent = "The wire does not lean this " + when + " — " + pos + " upbeat, " + neg + " downbeat, " + neither + " neither. A reading of headlines, not advice.";
    count.textContent = "Each headline is counted once, from a fixed word list. This is not a forecast.";

    list.replaceChildren();
    names.forEach(function (ticker) {
      var hit = rows.find(function (item) {
        return (item.symbols || []).indexOf(ticker) !== -1 || (item.headline || "").indexOf(ticker) !== -1;
      });
      var li = document.createElement("li");
      var label = document.createElement("b");
      label.textContent = ticker;
      li.appendChild(label);
      if (!hit) {
        var quiet = document.createElement("span");
        quiet.className = "d";
        quiet.textContent = " Nothing in this window.";
        li.appendChild(quiet);
      } else {
        var a = document.createElement("a");
        a.href = hit.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = " " + hit.headline;
        li.appendChild(a);
      }
      list.appendChild(li);
    });
  }

  roots.forEach(function (root) {
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
