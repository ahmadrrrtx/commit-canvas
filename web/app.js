/* ══════════════════════════════════════════════════════════════════
   Commit Canvas — Story Renderer (v2)
   Renders the analyzed repository model entirely client-side.
   No libraries. No network. Works from a local file, offline, forever.

   Entry point: CommitCanvas.render(container, data, opts)
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── tiny helpers ─────────────────────────────────────────────── */

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function fN(n) { return Number(n || 0).toLocaleString("en-US"); }
  function fK(n) {
    n = Number(n || 0);
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e4) return Math.round(n / 1e3) + "k";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    return fN(n);
  }
  function fmtDate(iso, opts) {
    try { return new Date(iso).toLocaleDateString("en-US", opts || { month: "short", day: "numeric", year: "numeric" }); }
    catch (e) { return iso; }
  }
  function svgEl(name, attrs) {
    var n = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function countUp(node, target, suffix, dur) {
    if (REDUCED || !isFinite(target)) { node.textContent = fN(target) + (suffix || ""); return; }
    suffix = suffix || "";
    var t0 = null, durMs = dur || 950;
    function frame(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / durMs, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = fN(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ── sections ─────────────────────────────────────────────────── */

  function hero(root, d) {
    var t = d.totals, r = d.repo, sh = d.shape;
    var sec = el("header", "hero");
    var wrap = el("div", "wrap");

    var meta = el("div", "hero-meta hero-in");
    meta.appendChild(chip('<span class="dot"></span>' + esc(sh.label), true));
    if (d.meta.source === "github") meta.appendChild(chip("analyzed from GitHub API"));
    else meta.appendChild(chip("analyzed locally · offline"));
    meta.appendChild(chip(t.merges ? fN(t.commits) + " commits · " + t.merges + " merges" : fN(t.commits) + " commits"));

    var h1 = el("h1", "hero-in d1", esc(r.name));

    var span = el("div", "datespan hero-in d2");
    span.innerHTML =
      '<span>' + fmtDate(r.first) + '</span>' +
      '<span aria-hidden="true">——</span>' +
      '<span>' + fmtDate(r.last) + '</span>' +
      '<span aria-hidden="true">·</span>' +
      '<span>' + esc(r.age_label) + " old</span>";

    var shape = el("div", "shape hero-in d3");
    shape.innerHTML = '<p>' + esc(sh.summary) + "</p>";

    var stats = el("div", "hero-stats hero-in d4");
    var cells = [
      [t.contributors, "", t.contributors === 1 ? "contributor" : "contributors"],
      [t.active_days, "", "active days"],
      [t.longest_streak, "d", "longest streak"],
      [t.tags, "", t.tags === 1 ? "release" : "releases"],
    ];
    if (d.meta.has_code_size && t.net_lines) {
      cells.push([t.lines_added, "", "lines added"]);
      cells.push([t.files, "", "files now"]);
    } else {
      cells.push([t.night_pct, "%", "night commits"]);
      cells.push([t.biggest_day, "", "commits on the busiest day"]);
    }
    cells.forEach(function (c) {
      var s = el("div", "hero-stat");
      var b = el("b", null, "0");
      s.appendChild(b);
      s.appendChild(el("span", null, esc(c[2])));
      stats.appendChild(s);
      countUp(b, c[0], c[1]);
    });

    var cue = el("a", "scroll-cue hero-in d5");
    cue.href = "#story";
    cue.setAttribute("aria-label", "Scroll to the story");
    cue.innerHTML = 'Read the story <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1v10M2 7l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

    wrap.appendChild(meta); wrap.appendChild(h1); wrap.appendChild(span);
    wrap.appendChild(shape); wrap.appendChild(stats); wrap.appendChild(cue);
    sec.appendChild(wrap);
    root.appendChild(sec);
  }

  function chip(inner, accent) {
    var c = el("span", "chip" + (accent ? " chip-accent" : ""));
    c.innerHTML = inner;
    return c;
  }

  function section(root, id, eyebrow, title, lead) {
    var sec = el("section", "sec reveal");
    sec.id = id;
    var wrap = el("div", "wrap");
    var head = el("div", "sec-head");
    head.appendChild(el("span", "eyebrow", esc(eyebrow)));
    head.appendChild(el("h2", null, esc(title)));
    if (lead) head.appendChild(el("p", "lead", esc(lead)));
    wrap.appendChild(head);
    sec.appendChild(wrap);
    root.appendChild(sec);
    return wrap;
  }

  var CHAPTER_GLYPHS = {
    beginning: "◦", sprint: "⚡", silence: "◌", grind: "▶",
    launch: "🚀", evolution: "◈",
  };

  function chapters(root, d) {
    var wrap = section(root, "story", "Chapter one to now", "The story, chapter by chapter",
      "Every chapter below is grounded in real git data — timestamps, tags, and commit counts. Nothing invented.");
    var list = el("div", "chapters");
    d.chapters.forEach(function (ch) {
      var c = el("article", "chapter");
      var when = (ch.start && ch.start.slice(0, 7)) === (ch.end && ch.end.slice(0, 7))
        ? fmtDate(ch.start, { month: "short", year: "numeric" })
        : fmtDate(ch.start, { month: "short", year: "numeric" }) + " – " + fmtDate(ch.end, { month: "short", year: "numeric" });
      var facts = el("ul", "facts");
      (ch.facts || []).forEach(function (f, i) {
        facts.appendChild(el("li", f.charAt(0) === "“" ? "q" : null, esc(f)));
      });
      c.innerHTML =
        '<div class="glyph" aria-hidden="true">' + (CHAPTER_GLYPHS[ch.kind] || "·") + "</div>" +
        '<div><h3>' + esc(ch.title) + ' <span class="when">' + esc(when) + "</span></h3>" +
        '<p class="sub">' + esc(ch.subtitle || "") + "</p></div>";
      c.appendChild(facts);
      list.appendChild(c);
    });
    wrap.appendChild(list);
  }

  /* ── TIME MACHINE ─────────────────────────────────────────────── */

  function timeMachine(root, d) {
    var months = d.months;
    var hasCode = d.meta.has_code_size && months.some(function (m) { return m.files_end > 0 || m.net_end > 0; });

    var wrap = section(root, "machine", "The flagship", "Time machine",
      "Drag through the life of " + d.repo.name + ". Watch commits, people, and the codebase itself appear as time moves.");
    var tm = el("div", "tm");
    wrap.appendChild(tm);

    /* controls */
    var controls = el("div", "tm-controls");
    var play = el("button", "tm-play");
    play.type = "button";
    play.setAttribute("aria-label", "Play the project timeline");
    play.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>';
    if (months.length < 3) {
      play.style.display = "none";
      var young = el("p", null);
      young.style.cssText = "font-family:var(--mono);font-size:12px;color:var(--ink-3);flex:1 1 200px";
      young.textContent = months.length + " month" + (months.length === 1 ? "" : "s") +
        " of history — the time machine gets interesting from month three.";
      controls.appendChild(young);
    }
    var scrub = el("div", "tm-scrub");
    var range = el("input");
    range.type = "range";
    range.min = 0; range.max = Math.max(months.length - 1, 0); range.value = Math.max(months.length - 1, 0);
    if (months.length < 2) range.disabled = true;
    range.setAttribute("aria-label", "Time machine scrubber — project timeline by month");
    var dateline = el("div", "tm-date");
    dateline.innerHTML = "<b>" + esc(months[months.length - 1].label) + "</b><span>present day</span>";
    scrub.appendChild(range); scrub.appendChild(dateline);
    controls.appendChild(play); controls.appendChild(scrub);
    tm.appendChild(controls);

    /* body: counters + chart */
    var body = el("div", "tm-body");
    var counters = el("div", "tm-counters");
    body.appendChild(counters);

    var chartZone = el("div", null);
    var chart = el("div", "tm-chart");
    chartZone.appendChild(chart);
    var side = el("div", "tm-side");
    var msg = el("div", "tm-msg");
    msg.innerHTML = '<span class="lbl">That month, in one commit</span><span class="msgtxt"></span>';
    side.appendChild(msg);
    var langZone = el("div", "langbars");
    side.appendChild(langZone);
    chartZone.appendChild(side);
    chartZone.style.display = "flex";
    chartZone.style.flexDirection = "column";
    body.appendChild(chartZone);
    tm.appendChild(body);

    /* prefix sums */
    var cumCommits = [], cumPeople = [];
    var cc = 0, cp = 0, seen = 0;
    months.forEach(function (m) {
      cc += m.commits; cp = Math.max(cp, seen + m.contributors);
      seen += m.new_contributors || 0; cp = seen;
      cumCommits.push(cc); cumPeople.push(cp);
    });

    /* counters definition */
    var defs = [
      { label: "commits", get: function (i) { return fN(cumCommits[i]); }, plus: null },
      { label: "commits this month", get: function (i) { return fN(months[i].commits); } },
      { label: "people", get: function (i) { return fN(cumPeople[i]); } },
      { label: "merges", get: function (i) { return fN(months.slice(0, i + 1).reduce(function (a, m) { return a + m.merges; }, 0)); } },
    ];
    if (hasCode) {
      defs.push({ label: "files", get: function (i) { return fN(months[i].files_end); } });
      defs.push({ label: "lines of code", get: function (i) { return fK(months[i].net_end); } });
    } else {
      defs.push({ label: "active days / mo", get: function (i) { return fN(months[i].active_days); } });
    }
    var counterNodes = [];
    defs.forEach(function (def) {
      var c = el("div", "tm-counter");
      c.innerHTML = "<span>" + esc(def.label) + "</span>";
      var b = el("b", null, "—");
      c.appendChild(b);
      counters.appendChild(c);
      counterNodes.push(b);
    });
    if (!hasCode) {
      var note = el("p", null);
      note.style.cssText = "grid-column:1/-1;font-family:var(--mono);font-size:11px;color:var(--ink-3)";
      note.textContent = "Code size & languages need the local CLI — every other number here is real.";
      counters.appendChild(note);
    }

    buildTimelineChart(chart, months, function (idx) {
      var m = months[idx];
      dateline.innerHTML = "<b>" + esc(m.label) + "</b><span>" + fN(cumCommits[idx]) + " commits total</span>";
      defs.forEach(function (def, i) { counterNodes[i].textContent = def.get(idx); });
      msg.querySelector(".msgtxt").textContent = m.msg ? "“" + m.msg + "”" : "—";
      renderLangs(langZone, m.langs, hasCode);
    });

    var cur = Math.max(months.length - 1, 0);
    var raf = null, playing = false;

    function setIndex(i, fromUser) {
      cur = Math.max(0, Math.min(months.length - 1, i | 0));
      range.value = cur;
      range.style.setProperty("--fill", (months.length < 2 ? 100 : (cur / (months.length - 1)) * 100) + "%");
      chart.update(cur);
      if (fromUser) stop();
    }
    function stop() {
      playing = false;
      if (raf) cancelAnimationFrame(raf), raf = null;
      play.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>';
      play.setAttribute("aria-label", "Play the project timeline");
    }
    function start() {
      if (months.length < 2) return;
      playing = true;
      play.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="3" y="2.5" width="3.4" height="11" rx="1"/><rect x="9.6" y="2.5" width="3.4" height="11" rx="1"/></svg>';
      play.setAttribute("aria-label", "Pause the project timeline");
      var speed = Math.max(months.length / 14, 1.6); // full journey ≈ 14s
      var last = null;
      function frame(t) {
        if (!playing) return;
        if (last === null) last = t;
        cur += (t - last) / 1000 * speed;
        last = t;
        if (cur >= months.length - 1) { setIndex(months.length - 1); stop(); return; }
        setIndex(cur);
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }
    play.addEventListener("click", function () { playing ? stop() : (cur >= months.length - 1 && (cur = 0), start()); });
    range.addEventListener("input", function () { setIndex(+range.value, true); });
    setIndex(cur);
  }

  function renderLangs(zone, langs, hasCode) {
    zone.innerHTML = "";
    if (!hasCode || !langs) return;
    var entries = Object.keys(langs).map(function (k) { return [k, langs[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
    var max = entries.length ? entries[0][1] : 1;
    var total = entries.reduce(function (a, e) { return a + e[1]; }, 0) || 1;
    var palette = { Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#3178c6", Rust: "#dea584", Go: "#00ADD8", HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051", Markdown: "#083fa1", Other: "#7d8590" };
    if (!entries.length) return;
    var head = el("div", null, '<span class="lbl" style="font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)">The codebase, by language</span>');
    zone.appendChild(head);
    entries.forEach(function (e) {
      var row = el("div", "langbar");
      row.innerHTML =
        "<span>" + esc(e[0]) + "</span>" +
        '<div class="track"><i class="fill" style="width:' + Math.max(3, (e[1] / max) * 100) + "%;background:" + (palette[e[0]] || "#7d8590") + '"></i></div>' +
        '<span class="pc">' + Math.round((e[1] / total) * 100) + "%</span>";
      zone.appendChild(row);
    });
  }

  function buildTimelineChart(container, months, onChange) {
    var W = 720, H = 230, PADB = 26, PADT = 14, PADL = 6, PADR = 6;
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "Timeline chart: monthly commits as bars and cumulative commits as a line" });
    var iw = W - PADL - PADR, ih = H - PADT - PADB;
    var n = months.length;
    var maxMonthly = Math.max.apply(null, months.map(function (m) { return m.commits; }));
    var cum = 0, cums = months.map(function (m) { return cum += m.commits; });
    var maxCum = Math.max(cums[n - 1], 1);
    var bw = Math.max(2, Math.min(26, iw / n - 2));

    /* year gridlines */
    var lastYear = null;
    months.forEach(function (m, i) {
      var yr = m.key.slice(0, 4);
      if (yr !== lastYear) {
        lastYear = yr;
        var x = PADL + (n < 2 ? 0 : (i / (n - 1)) * iw);
        svg.appendChild(svgEl("line", { x1: x, y1: PADT, x2: x, y2: H - PADB, stroke: "#232735", "stroke-width": 1 }));
        var t = svgEl("text", { x: x + 4, y: H - 8, fill: "#687089", "font-size": 10, "font-family": "ui-monospace,Menlo,monospace" });
        t.textContent = yr;
        svg.appendChild(t);
      }
    });

    /* monthly bars */
    var bars = months.map(function (m, i) {
      var h = maxMonthly ? (m.commits / maxMonthly) * (ih * 0.62) : 0;
      var x = PADL + (n < 2 ? iw / 2 : (i / (n - 1)) * iw);
      var r = svgEl("rect", {
        x: x - bw / 2, y: PADT + ih - h, width: bw, height: Math.max(h, m.commits ? 1.5 : 0),
        rx: Math.min(2, bw / 3), fill: "#2E3344",
      });
      svg.appendChild(r);
      return r;
    });

    /* cumulative area + line */
    var pts = cums.map(function (c, i) {
      var x = PADL + (n < 2 ? iw / 2 : (i / (n - 1)) * iw);
      var y = PADT + ih - (c / maxCum) * (ih * 0.92);
      return [x, y];
    });
    var lineD = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var areaD = lineD + " L" + pts[pts.length - 1][0].toFixed(1) + " " + (PADT + ih) + " L" + pts[0][0].toFixed(1) + " " + (PADT + ih) + " Z";
    var defs = svgEl("defs");
    var grad = svgEl("linearGradient", { id: "ccgrad", x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#E2FF3A", "stop-opacity": 0.28 }));
    grad.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#E2FF3A", "stop-opacity": 0 }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(svgEl("path", { d: areaD, fill: "url(#ccgrad)" }));
    svg.appendChild(svgEl("path", { d: lineD, fill: "none", stroke: "#E2FF3A", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));

    /* pointer */
    var pointer = svgEl("line", { x1: 0, y1: PADT, x2: 0, y2: H - PADB, stroke: "#E9EBF3", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0.7 });
    var dot = svgEl("circle", { r: 4.5, fill: "#E2FF3A", stroke: "#0B0C10", "stroke-width": 2 });
    svg.appendChild(pointer); svg.appendChild(dot);

    /* baseline */
    svg.appendChild(svgEl("line", { x1: PADL, y1: PADT + ih, x2: W - PADR, y2: PADT + ih, stroke: "#232735" }));

    container.appendChild(svg);

    function update(i) {
      var x = PADL + (n < 2 ? iw / 2 : (i / (n - 1)) * iw);
      pointer.setAttribute("x1", x); pointer.setAttribute("x2", x);
      dot.setAttribute("cx", x); dot.setAttribute("cy", pts[Math.max(0, Math.min(i, n - 1))][1]);
      for (var k = 0; k < bars.length; k++) bars[k].setAttribute("fill", k <= i ? "#7b9a1d" : "#2E3344");
      if (onChange) onChange(i);
    }
    container.update = update;
    return update;
  }

  /* ── rhythm ───────────────────────────────────────────────────── */

  function rhythm(root, d) {
    var t = d.totals, clock = d.clock;
    var wrap = section(root, "rhythm", "When the work happened", "The rhythm",
      "Every repository has a pulse — favorite hours, heavy weekdays, quiet seasons.");

    var grid = el("div", "rhythm-grid");

    /* punchcard */
    var p1 = el("div", "panel");
    var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    var maxCell = 1;
    clock.grid.forEach(function (row) { row.forEach(function (v) { maxCell = Math.max(maxCell, v); }); });
    var ph = clock.peak_hour, pd = clock.peak_weekday;
    p1.innerHTML = "<h3>The punch card</h3><p class='psub'>peak: " + days[pd] + " around " + (ph < 10 ? "0" : "") + ph + ":00</p>";
    var pw = el("div", "punch-wrap");
    var punch = el("div", "punch");
    var summary = "Heat map of commits by weekday and hour. Peak activity " + days[pd] + " near " + ph + ":00. ";
    clock.grid.forEach(function (row, di) {
      punch.appendChild(el("div", "plabel", days[di]));
      var prow = el("div", "prow");
      row.forEach(function (v, hi) {
        var frac = v / maxCell;
        var c = el("div", "punch-cell");
        var size = 26 + frac * 74;
        c.style.width = size + "%";
        c.style.margin = "0 auto";
        c.style.borderRadius = "50%";
        c.style.aspectRatio = "1";
        if (v) {
          c.style.background = frac > 0.66 ? "#E2FF3A" : frac > 0.33 ? "#9db32a" : "#5c6b1f";
          c.title = days[di] + " " + (hi < 10 ? "0" : "") + hi + ":00 — " + v + " commits";
        }
        prow.appendChild(c);
      });
      punch.appendChild(prow);
    });
    var hrs = el("div", "plabel");
    hrs.style.height = "0";
    punch.appendChild(el("div", null, ""));
    var hourRow = el("div", null);
    hourRow.style.gridColumn = "2";
    var hlabels = el("div", "phours");
    for (var h = 0; h < 24; h += 3) hlabels.appendChild(el("span", null, h + ""));
    hourRow.appendChild(hlabels);
    punch.appendChild(hourRow);
    pw.appendChild(punch);
    p1.appendChild(pw);
    var sr = el("p", "sr-only", summary);
    p1.appendChild(sr);

    /* calendar */
    var p2 = el("div", "panel");
    var cal = d.calendar;
    var maxDay = 1;
    cal.days.forEach(function (v) { maxDay = Math.max(maxDay, v); });
    var totalCommits = fN(t.commits);
    p2.innerHTML = "<h3>The whole life, at a glance</h3><p class='psub'>every day from first commit to last</p>";
    var scroll = el("div", "cal-scroll");
    var byYear = {};
    var startMs = new Date(cal.start).getTime();
    cal.days.forEach(function (v, i) {
      var dt = new Date(startMs + i * 86400000);
      var y = dt.getFullYear();
      (byYear[y] = byYear[y] || []).push([dt, v]);
    });
    var activeYearDays = {};
    Object.keys(byYear).forEach(function (y) {
      activeYearDays[y] = byYear[y].filter(function (x) { return x[1] > 0; }).length;
    });
    Object.keys(byYear).forEach(function (y) {
      var yr = el("div", "cal-year");
      yr.innerHTML = "<div class='yl'><span>" + y + "</span><span>" + activeYearDays[y] + " active days</span></div>";
      var row = el("div", "cal-row");
      byYear[y].forEach(function (pair) {
        var v = pair[1];
        var lvl = v === 0 ? 0 : v <= maxDay * 0.25 ? 1 : v <= maxDay * 0.5 ? 2 : v <= maxDay * 0.75 ? 3 : 4;
        var cell = el("div", "cal-cell c" + lvl);
        if (v) cell.title = pair[0].toISOString().slice(0, 10) + " — " + v + " commits";
        row.appendChild(cell);
      });
      yr.appendChild(row);
      scroll.appendChild(yr);
    });
    p2.appendChild(scroll);
    var legend = el("div", "cal-legend");
    legend.innerHTML = "less " +
      '<span class="cal-cell c0"></span><span class="cal-cell c1"></span><span class="cal-cell c2"></span><span class="cal-cell c3"></span><span class="cal-cell c4"></span>' +
      " more";
    p2.appendChild(legend);
    p2.appendChild(el("p", "sr-only",
      "Calendar of daily commits across the project life. " + totalCommits + " commits over " + cal.days.length + " days. Busiest day had " + t.biggest_day + " commits."));

    grid.appendChild(p1); grid.appendChild(p2);
    wrap.appendChild(grid);

    var sf = el("div", "streak-facts");
    var items = [
      [t.longest_streak + " days", "longest streak"],
      [t.active_days, "total active days"],
      [t.night_pct + "%", "commits at night (10pm–5am)"],
      [t.weekend_pct + "%", "weekend commits"],
    ];
    items.forEach(function (it) {
      sf.appendChild(el("div", "sf", "<b>" + it[0] + "</b><span>" + it[1] + "</span>"));
    });
    wrap.appendChild(sf);
  }

  /* ── fingerprint ──────────────────────────────────────────────── */

  function fingerprint(root, d) {
    var fp = d.fingerprint;
    var wrap = section(root, "fingerprint", "Git behavior, honestly measured", "The developer fingerprint",
      "Derived from " + fp.commits + " commits by the most active author — behavior, not psychology.");

    var box = el("div", "fp");
    var left = el("div", "fp-archetype");
    left.innerHTML =
      '<div class="a-icon" aria-hidden="true">' + fp.archetype.icon + "</div>" +
      "<h3>" + esc(fp.archetype.label) + "</h3>" +
      '<p class="a-tag">' + esc(fp.archetype.tagline) + "</p>" +
      '<p class="fp-who"><b>' + esc(fp.author) + "</b> · " + fp.pct + "% of commits · since " + esc(fp.active_since) + "</p>";
    if (fp.runners && fp.runners.length) {
      var r = el("div", "fp-runners");
      fp.runners.forEach(function (name) { r.appendChild(chip(esc(name))); });
      left.appendChild(r);
    }
    left.appendChild(el("p", "fp-note", esc(fp.footnote || "")));

    var side = el("div", "fp-side");
    var hours = el("div", null);
    hours.innerHTML = "<h3 style='font-size:15px;margin-bottom:12px'>Favorite hours <span style='color:var(--ink-3);font-family:var(--mono);font-size:11px'>(commits by hour)</span></h3>";
    var bars = el("div", "hourbars");
    var maxH = Math.max.apply(null, fp.hours.concat([1]));
    var peak = fp.hours.indexOf(Math.max.apply(null, fp.hours));
    fp.hours.forEach(function (v, i) {
      var b = el("div", (i === peak ? "hot" : ""));
      b.style.height = Math.max(2, (v / maxH) * 100) + "%";
      b.title = (i < 10 ? "0" : "") + i + ":00 — " + v + " commits";
      bars.appendChild(b);
    });
    hours.appendChild(bars);
    var scale = el("div", "hour-scale");
    scale.innerHTML = "<span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>";
    hours.appendChild(scale);
    side.appendChild(hours);

    var traits = el("ul", "fp-traits");
    (fp.traits || []).forEach(function (tr) { traits.appendChild(el("li", null, esc(tr))); });
    side.appendChild(traits);

    box.appendChild(left); box.appendChild(side);
    wrap.appendChild(box);
  }

  /* ── people ───────────────────────────────────────────────────── */

  function people(root, d) {
    var wrap = section(root, "people", "The humans behind the hashes", "The people",
      d.totals.contributors === 1
        ? "One name on every commit. Full ownership."
        : d.totals.contributors + " people wrote this story.");
    var list = el("div", "people");
    d.contributors.forEach(function (p, i) {
      var row = el("div", "person");
      var nameZone = el("div", "pname");
      nameZone.innerHTML = esc(p.name) + (p.badge ? '<span class="badge ' + p.badge + '">' + p.badge + "</span>" : "") +
        "<small>" + esc(p.first) + " → " + esc(p.last) + "</small>";
      var zone = el("div", "pbar-zone");
      var bar = el("div", "pbar");
      var fill = el("i");
      fill.style.width = Math.max(2, p.pct) + "%";
      bar.appendChild(fill);
      zone.appendChild(bar);
      zone.appendChild(el("span", "pct", p.pct + "%"));
      row.appendChild(el("span", "rank", String(i + 1).padStart(2, "0")));
      row.appendChild(nameZone);
      row.appendChild(zone);
      row.appendChild(el("span", "rank", fN(p.commits)));
      list.appendChild(row);
    });
    wrap.appendChild(list);
  }

  /* ── moment + glow up ─────────────────────────────────────────── */

  function momentAndGlowup(root, d) {
    var wrap = section(root, "moment", "Evidence, dramatized", "The moment & the glow up",
      "One event that changed the project most — and how far it has come since day one.");
    var duo = el("div", "duo");

    var m = d.moment;
    var mc = el("div", "moment");
    mc.innerHTML =
      '<span class="m-kind">' + esc(m.kind === "burst" ? "the biggest day" : m.kind === "release" ? "the release" : m.kind === "commit" ? "the commit" : "the turning point") + "</span>" +
      "<h3>" + esc(m.title) + "</h3>" +
      "<p>" + esc(m.sub) + "</p>" +
      '<p class="m-date">' + esc(fmtDate(m.date, { weekday: undefined, month: "long", day: "numeric", year: "numeric" })) + "</p>";
    duo.appendChild(mc);

    var g = d.glowup || { then: {}, now: {} };
    var gc = el("div", "glowup");
    gc.style.gap = "10px";
    function glowCard(label, obj) {
        var c = el("div", "glow-card");
        var main = obj.lines != null ? obj.lines + " lines"
          : obj.commits != null ? fN(obj.commits) + " commits" : "—";
        var sub = [obj.files != null ? fN(obj.files) + " files" : null,
                   obj.langs != null ? obj.langs + " languages" : null]
                   .filter(Boolean).join(" · ");
        c.innerHTML = '<div class="when">' + esc(label) + " · " + esc(obj.date || "") + "</div>" +
          "<b>" + esc(main) + "</b><span>" + esc(sub) + "</span>";
        return c;
    }
    gc.appendChild(glowCard("first commit", g.then || {}));
    var arrow = el("div", "glow-arrow", "→");
    gc.appendChild(arrow);
    gc.appendChild(glowCard("today", g.now || {}));
    gc.appendChild(el("p", null,
      '<span style="color:var(--ink-3);font-family:var(--mono);font-size:12px">' +
      esc((g.then && g.then.msg) || "") + "</span>"));
    duo.appendChild(gc);

    wrap.appendChild(duo);
  }

  /* ── roast ────────────────────────────────────────────────────── */

  function roast(root, d) {
    var wrap = section(root, "roast", "Affectionately brutal", "Roast my git",
      "Every burn below is backed by a real number from the history. Nothing personal — it's in the data.");
    var list = el("div", "roast");
    d.roast.forEach(function (q) {
      var item = el("div", "quip");
      item.innerHTML = "<p>" + esc(q.line) + '</p><span class="evidence">' + esc(q.evidence) + "</span>";
      list.appendChild(item);
    });
    wrap.appendChild(list);
  }

  /* ── certificate + share cards ────────────────────────────────── */

  function certificate(root, d) {
    var wrap = section(root, "share", "Proof of work", "The certificate",
      "Screenshot this, or download a share card built for social feeds — both generated locally, on this page.");
    var t = d.totals, r = d.repo, fp = d.fingerprint;

    var zone = el("div", "cert-zone");
    var cert = el("div", "cert");
    cert.innerHTML =
      '<span class="c-eyebrow">Certificate of persistent work</span>' +
      "<h3>" + esc(r.name) + "</h3>" +
      '<p class="c-shape">' + esc(d.shape.label) + "</p>" +
      '<div class="c-stats">' +
      "<div><b>" + fN(t.commits) + "</b><span>commits</span></div>" +
      "<div><b>" + fN(t.active_days) + "</b><span>active days</span></div>" +
      "<div><b>" + t.longest_streak + "</b><span>day streak</span></div>" +
      "<div><b>" + r.age_label.replace(" old", "") + "</b><span>of history</span></div>" +
      "</div>" +
      '<p class="c-fp">Fingerprint: <b>' + esc(fp.archetype.label) + "</b> · " + esc(fp.author) + "</p>" +
      '<p class="c-foot">commit canvas · generated locally from real git data · no cloud</p>';
    zone.appendChild(cert);

    var actions = el("div", "share-actions");
    var b1 = el("button", "btn btn-primary", "Download share card · 1200×630");
    var b2 = el("button", "btn", "Story card · 1080×1920");
    b1.type = b2.type = "button";
    actions.appendChild(b1); actions.appendChild(b2);

    var preview = el("div", "share-preview");
    preview.style.marginTop = "24px";

    function download(canvas, name) {
      canvas.toBlob(function (blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      }, "image/png");
    }
    b1.addEventListener("click", function () {
      var c = drawShareCard(d, "og");
      preview.innerHTML = "";
      preview.appendChild(c);
      download(c, d.repo.name.replace(/[^\w.-]+/g, "_") + "-commit-canvas.png");
    });
    b2.addEventListener("click", function () {
      var c = drawShareCard(d, "story");
      preview.innerHTML = "";
      preview.appendChild(c);
      download(c, d.repo.name.replace(/[^\w.-]+/g, "_") + "-commit-canvas-story.png");
    });

    zone.appendChild(actions);
    zone.appendChild(preview);
    wrap.appendChild(zone);
  }

  function drawShareCard(d, kind) {
    var t = d.totals, r = d.repo, sh = d.shape, fp = d.fingerprint;
    var W = kind === "story" ? 1080 : 1200, H = kind === "story" ? 1920 : 630;
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var x = canvas.getContext("2d");
    var MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    var SANS = 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    x.fillStyle = "#0B0C10"; x.fillRect(0, 0, W, H);
    var glow = x.createRadialGradient(W * 0.85, kind === "story" ? H * 0.12 : -H * 0.2, 10, W * 0.85, kind === "story" ? H * 0.12 : -H * 0.2, kind === "story" ? W * 0.9 : W * 0.7);
    glow.addColorStop(0, "rgba(226,255,58,0.14)");
    glow.addColorStop(1, "rgba(226,255,58,0)");
    x.fillStyle = glow; x.fillRect(0, 0, W, H);

    var M = kind === "story" ? 84 : 60;
    x.strokeStyle = "#2E3344"; x.lineWidth = 2;
    x.strokeRect(M, M, W - M * 2, H - M * 2);

    x.fillStyle = "#687089";
    x.font = "600 " + (kind === "story" ? 22 : 15) + "px " + MONO;
    x.letterSpacing = "6px";
    x.fillText("THE STORY OF", M + 40, M + (kind === "story" ? 90 : 52));
    x.letterSpacing = "0px";

    /* repo name — fit to width */
    var size = kind === "story" ? 110 : 66;
    x.fillStyle = "#E9EBF3";
    var name = r.name;
    do {
      x.font = "800 " + size + "px " + SANS;
      size -= 4;
    } while (x.measureText(name).width > W - (M + 40) * 2 - 20 && size > 24);
    var nameY = M + (kind === "story" ? 210 : 140);
    x.fillText(name, M + 40, nameY);

    x.fillStyle = "#E2FF3A";
    x.font = "700 " + (kind === "story" ? 34 : 24) + "px " + SANS;
    x.fillText(sh.label, M + 40, nameY + (kind === "story" ? 70 : 44));

    x.fillStyle = "#9BA1B5";
    x.font = "400 " + (kind === "story" ? 24 : 16) + "px " + MONO;
    x.fillText(fmtDate(r.first) + " — " + fmtDate(r.last) + " · " + r.age_label, M + 40, nameY + (kind === "story" ? 126 : 80));

    /* stats grid */
    var stats = [
      [fN(t.commits), "commits"],
      [fN(t.contributors), t.contributors === 1 ? "contributor" : "contributors"],
      [fN(t.active_days), "active days"],
      [t.longest_streak + " days", "longest streak"],
      [t.night_pct + "%", "at night"],
      [fK(t.lines_added), "lines added"],
    ];
    var gy = kind === "story" ? nameY + 260 : H - 170;
    var colW = (W - (M + 40) * 2) / 3;
    stats.forEach(function (s, i) {
      var cx = M + 40 + (i % 3) * colW;
      var cy = gy + Math.floor(i / 3) * (kind === "story" ? 170 : 78);
      x.fillStyle = "#E9EBF3";
      x.font = "700 " + (kind === "story" ? 56 : 30) + "px " + MONO;
      x.fillText(s[0], cx, cy);
      x.fillStyle = "#687089";
      x.font = "500 " + (kind === "story" ? 20 : 12) + "px " + MONO;
      x.letterSpacing = "2px";
      x.fillText(s[1].toUpperCase(), cx, cy + (kind === "story" ? 36 : 20));
      x.letterSpacing = "0px";
    });

    /* sparkline of monthly commits */
    var months = d.months;
    var sw = W - (M + 40) * 2, shh = kind === "story" ? 150 : 56;
    var sy = kind === "story" ? gy + 420 : gy - 90;
    var maxC = Math.max.apply(null, months.map(function (m) { return m.commits; }));
    var step = sw / Math.max(months.length - 1, 1);
    x.beginPath();
    months.forEach(function (m, i) {
      var px = M + 40 + i * step;
      var py = sy + shh - (m.commits / (maxC || 1)) * shh;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    });
    x.strokeStyle = "#E2FF3A"; x.lineWidth = kind === "story" ? 5 : 3;
    x.lineJoin = "round"; x.stroke();
    x.lineTo(M + 40 + sw, sy + shh); x.lineTo(M + 40, sy + shh); x.closePath();
    x.fillStyle = "rgba(226,255,58,0.12)"; x.fill();

    /* fingerprint + footer */
    x.fillStyle = "#9BA1B5";
    x.font = "600 " + (kind === "story" ? 26 : 16) + "px " + SANS;
    var fpLine = fp.archetype.icon + "  " + fp.archetype.label + " — " + fp.author;
    x.fillText(fpLine, M + 40, H - M - (kind === "story" ? 90 : 52));
    x.fillStyle = "#687089";
    x.font = "500 " + (kind === "story" ? 20 : 13) + "px " + MONO;
    x.fillText("commit canvas · real git data · generated locally", M + 40, H - M - (kind === "story" ? 48 : 28));

    return canvas;
  }

  /* ── footer ───────────────────────────────────────────────────── */

  function footer(root, d) {
    var foot = el("footer", "foot reveal");
    var wrap = el("div", "wrap");
    var grid = el("div", "foot-grid");
    var left = el("div");
    left.innerHTML = '<div class="brand">' + esc(d.repo.name) + " · the story</div>" +
      '<p style="margin-top:8px">Rendered from ' + fN(d.totals.commits) + " commits. No cloud, no tracking, no requests left this file.</p>";
    var right = el("div");
    right.innerHTML =
      "<p style='margin-bottom:8px'>Make one for your repository:</p>" +
      '<code class="cmd">git clone https://github.com/ahmadrrrtx/commit-canvas<br>cd commit-canvas &amp;&amp; ./run.sh /path/to/repo</code>';
    grid.appendChild(left); grid.appendChild(right);
    wrap.appendChild(grid);

    if (d.meta.notes && d.meta.notes.length) {
      var notes = el("div", "meta-notes");
      d.meta.notes.forEach(function (n) { notes.appendChild(el("span", null, "· " + esc(n))); });
      wrap.appendChild(notes);
    }
    var gen = el("p", "meta-notes");
    gen.appendChild(el("span", null, d.meta.generator + " · generated " + (d.meta.generated || "")));
    wrap.appendChild(gen);
    foot.appendChild(wrap);
    root.appendChild(foot);
  }

  /* ── dot nav + reveal ─────────────────────────────────────────── */

  function dotNav(root, d) {
    if (!("IntersectionObserver" in window)) return;
    var ids = ["story", "machine", "rhythm", "fingerprint", "people", "moment", "roast", "share"];
    var nav = el("nav", "dotnav");
    nav.setAttribute("aria-label", "Sections");
    var links = {};
    ids.forEach(function (id) {
      var a = el("a");
      a.href = "#" + id;
      a.title = id;
      a.setAttribute("aria-label", "Jump to " + id);
      links[id] = a;
      nav.appendChild(a);
    });
    root.appendChild(nav);
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          for (var k in links) links[k].classList.toggle("on", k === e.target.id);
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    ids.forEach(function (id) {
      var target = document.getElementById(id);
      if (target) obs.observe(target);
    });
  }

  function activateReveals() {
    var nodes = document.querySelectorAll(".reveal");
    if (REDUCED || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("in"); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    nodes.forEach(function (n) { obs.observe(n); });
  }

  /* ── public API ───────────────────────────────────────────────── */

  function render(container, data, opts) {
    opts = opts || {};
    container.innerHTML = "";
    document.title = "The story of " + data.repo.name;
    hero(container, data);
    chapters(container, data);
    timeMachine(container, data);
    rhythm(container, data);
    fingerprint(container, data);
    people(container, data);
    momentAndGlowup(container, data);
    roast(container, data);
    certificate(container, data);
    footer(container, data);
    dotNav(container, data);
    activateReveals();
  }

  window.CommitCanvas = { render: render, drawShareCard: drawShareCard, esc: esc, fN: fN, fK: fK, fmtDate: fmtDate };

  /* auto-mount when embedded as a story file */
  var mount = document.getElementById("app");
  if (mount && window.__CC_DATA__ && window.__CC_DATA__.repo) {
    try { render(mount, window.__CC_DATA__); }
    catch (err) {
      mount.innerHTML = "<div class='wrap' style='padding:20vh 24px'><h1>Something broke while drawing this story.</h1><p style='color:#9BA1B5;margin-top:12px'>" +
        String(err && err.message ? err.message : err) + "</p></div>";
    }
  }
})();
