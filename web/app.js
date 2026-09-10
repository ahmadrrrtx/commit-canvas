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

  /* ── project archetype: deterministic identity, derived from real data ── */
  function projectArchetype(d) {
    var ch = d.chapters || [], t = d.totals, months = d.months || [];
    var years = months.length / 12;
    var silence = ch.filter(function (c) { return c.kind === "silence"; })
      .sort(function (a, b) { return new Date(b.end) - new Date(a.end); })[0];
    var busiest = months.reduce(function (a, b) { return (b.commits > a.commits ? b : a); }, months[0] || { commits: 0, label: "" });
    if (silence && months.length >= 6) {
      var days = Math.round((new Date(silence.end) - new Date(silence.start)) / 86400000);
      return { id: "comeback", label: "The Comeback", tag: "A project that refused to stay down.",
        why: "it went quiet for " + fN(Math.max(days, 30)) + " days — and the commits came back." };
    }
    if (t.contributors >= 50) {
      return { id: "movement", label: "The Movement", tag: "One idea, many hands.",
        why: fN(t.contributors) + " people have left commits in this history." };
    }
    if (years >= 3) {
      return { id: "marathon", label: "The Marathon", tag: "Built to outlast trends.",
        why: "the history spans " + Math.floor(years) + "+ years of continuous work." };
    }
    if (busiest && busiest.commits >= 40) {
      return { id: "sprint", label: "The Sprint", tag: "Fast, focused, shipped.",
        why: "the busiest month alone landed " + fN(busiest.commits) + " commits." };
    }
    if (t.contributors === 1) {
      return { id: "solo", label: "The Solo Build", tag: "One person, whole history.",
        why: "every single commit comes from one author." };
    }
    return { id: "steady", label: "The Steady Build", tag: "Quiet, consistent work.",
      why: fN(t.commits) + " commits at a sustainable pace." };
  }

  function hero(root, d) {
    var t = d.totals, r = d.repo, sh = d.shape;
    var sec = el("header", "hero");
    var wrap = el("div", "wrap");

    var meta = el("div", "hero-meta hero-in");
    meta.appendChild(chip('<span class="dot"></span>' + esc(sh.label), true));
    if (d.meta.source === "github") meta.appendChild(chip("analyzed from GitHub API"));
    else meta.appendChild(chip("analyzed locally · offline"));
    meta.appendChild(chip(t.merges ? fN(t.commits) + " commits · " + t.merges + " merges" : fN(t.commits) + " commits"));

    var arch = projectArchetype(d);
    var eyebrow = el("div", "hero-eyebrow hero-in d1", "Commit Canvas presents");
    var h1 = el("h1", "hero-in d1", esc(r.name));
    var archLine = el("div", "hero-arch hero-in d2", esc(arch.label));
    var sub = el("p", "hero-sub hero-in d2", esc(arch.tag) + " " + esc(sh.summary));

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

    wrap.appendChild(meta); wrap.appendChild(eyebrow); wrap.appendChild(h1);
    wrap.appendChild(archLine); wrap.appendChild(sub); wrap.appendChild(span);
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

  /* ── chapters: a real timeline, not bullets ─────────────────────── */
  function chapterSparkbar(months, i0, i1) {
    /* honest visual: monthly commits inside the chapter's own date range */
    var seg = months.slice(Math.max(0, i0), Math.min(months.length - 1, i1) + 1);
    if (seg.length < 2) return null;
    var BUCKETS = 44;
    var per = Math.ceil(seg.length / BUCKETS);
    var buckets = [];
    for (var i = 0; i < seg.length; i += per) {
      var s = 0;
      for (var k = i; k < Math.min(i + per, seg.length); k++) s += seg[k].commits;
      buckets.push(s);
    }
    var max = Math.max.apply(null, buckets) || 1;
    var W = 360, H = 56, bw = W / buckets.length;
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ch-spark" role="img" aria-label="Commit activity during this chapter">';
    buckets.forEach(function (v, i) {
      var h = Math.max(2, (v / max) * (H - 6));
      out += '<rect x="' + (i * bw + 1).toFixed(1) + '" y="' + (H - h).toFixed(1) +
        '" width="' + Math.max(1, bw - 2).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.5" class="ch-bar' + (v === max ? " ch-bar-hot" : "") + '"></rect>';
    });
    return out + "</svg>";
  }

  /* Scroll a chapter into view within its OWN scroll container only.
     scrollIntoView() also scrolls ancestor scrollports — when the story is
     embedded in the homepage frame that yanks the outer page. So we scroll
     the nearest scrollable ancestor manually instead. */
  function scrollToChapter(target) {
    if (!target) return;
    var sp = target.parentElement, cont = null;
    while (sp && sp !== document.documentElement) {
      var cs = getComputedStyle(sp);
      if (/(auto|scroll)/.test(cs.overflowY)) { cont = sp; break; }
      sp = sp.parentElement;
    }
    var behavior = REDUCED ? "auto" : "smooth";
    if (cont) {
      var top = target.getBoundingClientRect().top - cont.getBoundingClientRect().top + cont.scrollTop;
      cont.scrollTo({ top: Math.max(0, top - cont.clientHeight / 2 + target.offsetHeight / 2), behavior: behavior });
    } else if (target.scrollIntoView) {
      target.scrollIntoView({ behavior: behavior, block: "center" });
    }
  }

  function chapters(root, d) {
    var wrap = section(root, "story", "Chapter one to now", "The story, chapter by chapter",
      "Every chapter below is grounded in real git data — timestamps, tags, and commit counts. Nothing invented.");
    wrap.parentElement.classList.add("sec-story");
    var months = d.months, chs = d.chapters || [];

    /* chapter navigation — compact, clickable, scroll-aware */
    var nav = el("nav", "ch-nav");
    nav.setAttribute("aria-label", "Chapter navigation");
    chs.forEach(function (ch, i) {
      var b = el("button", "ch-nav-btn");
      b.type = "button";
      b.innerHTML = "<b>" + String(i + 1).padStart(2, "0") + "</b> " + esc(ch.title.replace(/^The /, ""));
      b.addEventListener("click", function () {
        nav.querySelectorAll(".ch-nav-btn").forEach(function (x, xi) { x.classList.toggle("on", xi === i); });
        scrollToChapter(document.getElementById("ch-" + i));
      });
      nav.appendChild(b);
    });
    wrap.appendChild(nav);

    var tl = el("div", "chapters-tl");
    chs.forEach(function (ch, i) {
      var i0 = Math.max(monthIndexOf(months, ch.start), 0);
      var i1 = Math.max(monthIndexOf(months, ch.end), i0);
      var art = el("article", "chapter ch-kind-" + ch.kind);
      art.id = "ch-" + i;
      art.setAttribute("data-ghost", String(i + 1).padStart(2, "0"));

      var when = (String(ch.start).slice(0, 7) === String(ch.end).slice(0, 7))
        ? fmtDate(ch.start, { month: "short", year: "numeric" })
        : fmtDate(ch.start, { month: "short", year: "numeric" }) + " → " + fmtDate(ch.end, { month: "short", year: "numeric" });

      var head = el("header", "ch-head");
      head.innerHTML =
        '<span class="ch-num" aria-hidden="true">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<div><h3>' + esc(ch.title) + '</h3><span class="ch-when">' + esc(when) + "</span></div>";
      var sub = el("p", "ch-sub", esc(ch.subtitle || ""));

      /* kind-specific visual — each derived from the model, never invented */
      var visual = null;
      if (ch.kind === "beginning" && months.length) {
        var m0 = months[0];
        visual = '<div class="ch-first"><span class="ch-first-date">' + esc(fmtDate(d.repo.first, { month: "long", day: "numeric", year: "numeric" })) +
          '</span><span class="ch-first-msg">“' + esc(m0.msg || "the first commit") + "”</span></div>";
      } else if (ch.kind === "silence") {
        var days = Math.max(1, Math.round((new Date(ch.end) - new Date(ch.start)) / 86400000));
        visual = '<div class="ch-silence"><b>' + fN(days) + '</b><span>days of silence</span></div>';
      } else if (ch.kind === "launch" && (d.tags || []).length) {
        var tg = d.tags;
        visual = '<div class="ch-tags"><span class="ch-tag">' + esc(tg[0].name) + '</span><span class="ch-tag-dots">…</span><span class="ch-tag ch-tag-last">' + esc(tg[tg.length - 1].name) + "</span></div>" +
          '<span class="ch-tags-note">first → latest of ' + fN(tg.length) + " releases</span>";
      } else {
        var spark = chapterSparkbar(months, i0, i1);
        if (spark) visual = '<div class="ch-viz">' + spark + "</div>";
      }

      var facts = el("ul", "ch-facts");
      (ch.facts || []).slice(0, 3).forEach(function (f) {
        facts.appendChild(el("li", f.charAt(0) === "“" ? "q" : null, esc(f)));
      });

      art.appendChild(head);
      art.appendChild(sub);
      if (visual) art.appendChild(el("div", "ch-visual", visual));
      art.appendChild(facts);
      tl.appendChild(art);
    });
    wrap.appendChild(tl);

    /* scroll-aware active chapter (subtle — no scroll-jacking) */
    if ("IntersectionObserver" in window && chs.length > 1) {
      var navBtns = nav.querySelectorAll(".ch-nav-btn");
      var spy = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var ix = +e.target.id.replace("ch-", "");
          tl.querySelectorAll(".chapter").forEach(function (c) { c.classList.remove("active"); });
          e.target.classList.add("active");
          navBtns.forEach(function (b, bi) { b.classList.toggle("on", bi === ix); });
          /* keep the active nav chip visible on mobile */
          var on = navBtns[ix];
          if (on && nav.scrollWidth > nav.clientWidth) {
            var nl = on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2;
            nav.scrollTo({ left: Math.max(0, nl), behavior: "smooth" });
          }
        });
      }, { rootMargin: "-30% 0px -55% 0px" });
      tl.querySelectorAll(".chapter").forEach(function (c) { spy.observe(c); });
    }
  }

  /* ── TIME MACHINE v2 ─────────────────────────────────────────── */

  var LANG_COLORS = {
    Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#3178c6", Rust: "#dea584",
    Go: "#00ADD8", C: "#555555", "C++": "#f34b7d", "C#": "#178600", Java: "#b07219",
    Kotlin: "#A97BFF", Swift: "#F05138", Ruby: "#701516", PHP: "#4F5D95",
    HTML: "#e34c26", CSS: "#563d7c", SCSS: "#c6538c", Vue: "#41b883",
    Svelte: "#ff3e00", Dart: "#00B4AB", Zig: "#ec915c", Lua: "#000080",
    Shell: "#89e051", Makefile: "#427819", Docker: "#2496ED", Markdown: "#083fa1",
    JSON: "#292929", YAML: "#cb171e", TOML: "#9c4221", SQL: "#e38c00",
    Elixir: "#6e4a7e", Haskell: "#5e5086", Scala: "#c22d40", Clojure: "#db5855",
    Perl: "#0298c3", R: "#198CE7", Jupyter: "#DA5B0B", Assembly: "#6E4C13",
    reST: "#6a737d", Text: "#8a919e", Config: "#8a919e", GraphQL: "#e10098",
    Proto: "#4E5D95", "Vim script": "#199f4b", Lisp: "#3fb68b", Nix: "#7e7eff",
    Solidity: "#AA6746", Other: "#7d8590",
  };

  function monthIndexOf(months, isoDate) {
    if (!isoDate) return -1;
    var key = String(isoDate).slice(0, 7);
    for (var i = 0; i < months.length; i++) if (months[i].key === key) return i;
    return -1;
  }

  function collectEvents(d) {
    /* deterministic event list: [{idx, kind, title, sub, date}] */
    var months = d.months, evts = [];
    if (!months.length) return evts;
    evts.push({
      idx: 0, kind: "beginning", title: "The Beginning",
      sub: "“" + (months[0].msg || "first commit") + "”",
      date: d.repo.first,
    });
    (d.tags || []).forEach(function (t) {
      if (!t.date) return;
      var i = monthIndexOf(months, t.date);
      if (i > 0) evts.push({ idx: i, kind: "release", title: t.name + " released", sub: "a version shipped to the world", date: t.date });
    });
    (d.chapters || []).forEach(function (c) {
      if (c.kind === "silence") {
        var i = monthIndexOf(months, c.end);
        if (i > 0) evts.push({ idx: i, kind: "comeback", title: "The Comeback", sub: c.subtitle || "the silence ends", date: c.end });
      }
      if (c.kind === "sprint") {
        var best = months.reduce(function (a, b) { return (b.commits > a.commits ? b : a); });
        var i = monthIndexOf(months, best.key + "-01");
        if (i > 0) evts.push({ idx: i, kind: "burst", title: "The Sprint", sub: best.commits + " commits in " + best.label, date: best.key + "-01" });
      }
    });
    if (d.moment && d.moment.date) {
      var i = monthIndexOf(months, d.moment.date);
      if (i > 0) evts.push({ idx: i, kind: "moment", title: d.moment.title, sub: "the moment that mattered most", date: d.moment.date });
    }
    var seen = {};
    return evts.filter(function (e) {
      var k = e.idx + ":" + e.title;
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    }).sort(function (a, b) { return a.idx - b.idx; });
  }

  function tmInsight(months, totals) {
    if (!months.length) return "";
    var counts = months.map(function (m) { return m.commits; });
    var top3 = counts.slice().sort(function (a, b) { return b - a; }).slice(0, 3);
    var share = Math.round(100 * top3.reduce(function (a, b) { return a + b; }, 0) / totals.commits);
    var best = months.reduce(function (a, b) { return (b.commits > a.commits ? b : a); });
    if (months.length >= 6 && share >= 45) {
      return "Most of this project was built in just three months — " + share + "% of all commits.";
    }
    if (best.commits >= 4 * (totals.commits / months.length)) {
      return "One month dominates: " + best.label + " alone produced " + best.commits + " commits.";
    }
    var active = months.filter(function (m) { return m.commits > 0; }).length;
    return "Work happened in " + active + " of " + months.length + " months — the gaps are part of the story too.";
  }

  /* ── project pulse: the whole life in one line ─────────────────── */
  function projectPulse(root, d) {
    var months = d.months || [];
    if (months.length < 2) return;
    var wrap = section(root, "pulse", "The whole life, one line", "Project pulse",
      "Every month of " + d.repo.name + " as a single heartbeat — quiet seasons, sprints and comebacks, all real.");
    var wide = el("div", "wrap pulse-wide");
    var W = 1080, H = 220, PADT = 18, PADB = 30, PADL = 8, PADR = 8;
    var iw = W - PADL - PADR, ih = H - PADT - PADB;
    var n = months.length;
    var maxC = Math.max.apply(null, months.map(function (m) { return m.commits; })) || 1;
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, "class": "pulse-svg", role: "img",
      "aria-label": "Project pulse: monthly commit activity across the whole history" });

    /* chapter bands (real phases as background) */
    (d.chapters || []).slice(0, 8).forEach(function (c) {
      try {
        var i0 = monthIndexOf(months, c.start), i1 = monthIndexOf(months, c.end);
        if (i1 <= i0) i1 = Math.min(i0 + 1, n - 1);
        var x0 = PADL + (i0 / (n - 1)) * iw, x1 = PADL + (i1 / (n - 1)) * iw;
        svg.appendChild(svgEl("rect", { x: x0, y: PADT, width: Math.max(1, x1 - x0), height: ih, "class": "pl-band b-" + c.kind }));
      } catch (e) {}
    });

    /* year gridlines */
    var lastYr = null;
    months.forEach(function (m, i) {
      var yr = m.key.slice(0, 4);
      if (yr !== lastYr) {
        lastYr = yr;
        var x = PADL + (i / (n - 1)) * iw;
        svg.appendChild(svgEl("line", { x1: x, y1: PADT, x2: x, y2: H - PADB, "class": "pl-grid" }));
        var t = svgEl("text", { x: x + 4, y: H - 8, "class": "pl-year" });
        t.textContent = yr;
        svg.appendChild(t);
      }
    });

    /* the pulse line */
    var pts = months.map(function (m, i) {
      return [PADL + (i / (n - 1)) * iw, PADT + ih - (m.commits / maxC) * (ih * 0.92)];
    });
    var lineD = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    svg.appendChild(svgEl("path", { d: lineD + " L" + pts[n - 1][0].toFixed(1) + " " + (PADT + ih) + " L" + pts[0][0].toFixed(1) + " " + (PADT + ih) + " Z", "class": "pl-area" }));
    svg.appendChild(svgEl("path", { d: lineD, "class": "pl-line" }));

    /* milestone ticks */
    (d.tags || []).slice(0, 40).forEach(function (tg) {
      if (!tg.date) return;
      var i = monthIndexOf(months, tg.date);
      if (i <= 0 || i >= n - 1) return;
      var x = PADL + (i / (n - 1)) * iw;
      svg.appendChild(svgEl("rect", { x: x - 1, y: H - PADB + 4, width: 2, height: 7, "class": "pl-tick" }));
    });

    /* hover inspection */
    var cursor = svgEl("line", { x1: 0, y1: PADT, x2: 0, y2: H - PADB, "class": "pl-cursor", opacity: 0 });
    var dot = svgEl("circle", { r: 4, "class": "pl-dot", opacity: 0 });
    var tip = svgEl("text", { x: 0, y: 14, "class": "pl-year", "text-anchor": "middle", opacity: 0 });
    svg.appendChild(cursor); svg.appendChild(dot); svg.appendChild(tip);
    months.forEach(function (m, i) {
      var hit = svgEl("rect", { x: PADL + (i / n) * iw - iw / n / 2, y: 0, width: iw / n + 1, height: H, "class": "pl-hit" });
      var t = el("title");
      t.textContent = m.label + " — " + m.commits + (m.commits === 1 ? " commit" : " commits");
      hit.appendChild(t);
      hit.addEventListener("mouseenter", function () {
        cursor.setAttribute("x1", pts[i][0]); cursor.setAttribute("x2", pts[i][0]); cursor.setAttribute("opacity", 1);
        dot.setAttribute("cx", pts[i][0]); dot.setAttribute("cy", pts[i][1]); dot.setAttribute("opacity", 1);
      });
      hit.addEventListener("mouseleave", function () {
        cursor.setAttribute("opacity", 0); dot.setAttribute("opacity", 0);
      });
      svg.appendChild(hit);
    });

    wide.appendChild(svg);
    wrap.appendChild(wide);

    /* derived pulse facts — honest, computed */
    var busiest = months.reduce(function (a, b) { return (b.commits > a.commits ? b : a); });
    var quiet = months.filter(function (m) { return m.commits === 0; }).length;
    var facts = el("div", "pulse-read");
    facts.innerHTML =
      '<span class="pulse-fact">busiest: <b>' + esc(busiest.label) + "</b> · " + fN(busiest.commits) + " commits</span>" +
      (quiet ? '<span class="pulse-fact">quiet months: <b>' + quiet + "</b></span>" : "") +
      '<span class="pulse-fact">span: <b>' + esc(d.repo.age_label) + "</b></span>";
    wrap.appendChild(facts);
    root.appendChild(wrap);
  }

  function timeMachine(root, d) {
    var months = d.months;
    var hasCode = d.meta.has_code_size && months.some(function (m) { return m.files_end > 0 || m.net_end > 0; });

    var wrap = section(root, "machine", "The flagship", "Time machine",
      "Drag through the life of " + d.repo.name + ". Watch commits, people, and the codebase itself appear as time moves.");
    var tm = el("div", "tm");
    wrap.appendChild(tm);

    var events = collectEvents(d);
    var multi = months.length >= 2;

    /* ── controls ── */
    var controls = el("div", "tm-controls");
    var transport = el("div", "tm-transport");

    function tbtn(label, aria, cls) {
      var b = el("button", "tm-btn " + (cls || ""));
      b.type = "button";
      b.setAttribute("aria-label", aria);
      b.innerHTML = label;
      b.title = aria;
      return b;
    }
    var bFirst = tbtn('<svg viewBox="0 0 14 14" fill="currentColor"><path d="M2 1.5v11M12 1.5L5 7l7 5.5z"/></svg>', "Jump to first month");
    var bPrev = tbtn('<svg viewBox="0 0 14 14" fill="currentColor"><path d="M10 1.5L3 7l7 5.5z"/></svg>', "Previous milestone");
    var play = tbtn('<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>', "Play the project timeline", "tm-play");
    var bNext = tbtn('<svg viewBox="0 0 14 14" fill="currentColor"><path d="M4 1.5L11 7l-7 5.5z"/></svg>', "Next milestone");
    var bLast = tbtn('<svg viewBox="0 0 14 14" fill="currentColor"><path d="M12 1.5v11M2 1.5L9 7l-7 5.5z"/></svg>', "Jump to latest month");
    var speed = tbtn("1×", "Playback speed", "tm-speed");
    transport.appendChild(bFirst); transport.appendChild(bPrev); transport.appendChild(play);
    transport.appendChild(bNext); transport.appendChild(bLast); transport.appendChild(speed);

    var scrub = el("div", "tm-scrub");
    var ticks = el("div", "tm-ticks");
    ticks.setAttribute("role", "list");
    var range = el("input");
    range.type = "range";
    range.min = 0; range.max = Math.max(months.length - 1, 0); range.value = Math.max(months.length - 1, 0);
    if (!multi) range.disabled = true;
    range.setAttribute("aria-label", "Time machine scrubber — project timeline by month");
    var dateline = el("div", "tm-date");
    scrub.appendChild(ticks); scrub.appendChild(range); scrub.appendChild(dateline);

    controls.appendChild(transport); controls.appendChild(scrub);
    tm.appendChild(controls);

    /* jump-to-story: meaningful navigation, derived from real events */
    var jumps = el("div", "tm-jumps");
    jumps.setAttribute("role", "navigation");
    jumps.setAttribute("aria-label", "Jump to story moments");

    if (months.length < 3) {
      play.style.display = "none";
      var young = el("p", "tm-young");
      young.textContent = months.length + " month" + (months.length === 1 ? "" : "s") +
        " of history — the time machine gets interesting from month three.";
      controls.appendChild(young);
    }

    /* jump chips from the real event list */
    var jumpDefs = events.slice(0, 7).map(function (e) {
      return { ix: e.idx, label: e.title };
    });
    jumpDefs.push({ ix: months.length - 1, label: "Latest" });
    var seenJ = {};
    jumpDefs.filter(function (j) { return j.ix >= 0 && !seenJ["x" + j.ix] && (seenJ["x" + j.ix] = 1); })
      .forEach(function (j) {
        var b = el("button", "tm-jump");
        b.type = "button";
        b.textContent = j.label;
        b.addEventListener("click", function () {
          setIndex(j.ix, true);
          jumps.querySelectorAll(".tm-jump").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
        });
        jumps.appendChild(b);
      });
    if (jumps.children.length > 1) tm.appendChild(jumps);

    /* milestone ticks — positionally clustered so near-simultaneous
       milestones (rapid releases) never stack into an unclickable blob */
    var tickShown = {};
    var lastPct = -10;
    events.forEach(function (e) {
      if (e.idx <= 0 || e.idx >= months.length - 1) return;
      if (tickShown[e.idx]) return;
      tickShown[e.idx] = 1;
      var pct = months.length < 2 ? 50 : (e.idx / (months.length - 1)) * 100;
      if (pct - lastPct < 1.4) return;   /* too close to the previous tick */
      lastPct = pct;
      var t = el("button", "tm-tick tick-" + e.kind);
      t.type = "button";
      t.style.left = pct + "%";
      t.title = e.title + " · " + fmtDate(e.date);
      t.setAttribute("aria-label", "Jump to " + e.title + ", " + fmtDate(e.date));
      t.addEventListener("click", function () { setIndex(e.idx, true); });
      ticks.appendChild(t);
    });

    /* ── body ── */
    var body = el("div", "tm-body");
    var counters = el("div", "tm-counters");
    body.appendChild(counters);

    var chartZone = el("div", "tm-right");
    var chart = el("div", "tm-chart");
    chartZone.appendChild(chart);

    var evtOverlay = el("div", "tm-event");
    evtOverlay.setAttribute("aria-live", "polite");
    chartZone.appendChild(evtOverlay);

    var side = el("div", "tm-side");
    var msg = el("div", "tm-msg");
    msg.innerHTML = '<span class="lbl">That month, in one commit</span><span class="msgtxt"></span>';
    side.appendChild(msg);
    var langZone = el("div", "langbars");
    side.appendChild(langZone);
    chartZone.appendChild(side);
    body.appendChild(chartZone);
    tm.appendChild(body);

    var insight = el("p", "tm-insight");
    insight.textContent = tmInsight(months, d.totals);
    tm.appendChild(insight);

    /* prefix sums (O(1) counters) */
    var cumCommits = [], cumPeople = [], cumMerges = [];
    var cc = 0, mg = 0, people = 0;
    months.forEach(function (m) {
      cc += m.commits; mg += m.merges; people += m.new_contributors || 0;
      cumCommits.push(cc); cumMerges.push(mg); cumPeople.push(people);
    });

    var defs = [
      { label: "commits", get: function (i) { return fN(cumCommits[i]); } },
      { label: "this month", get: function (i) { return fN(months[i].commits); } },
      { label: "people", get: function (i) { return fN(cumPeople[i]); } },
      { label: "merges", get: function (i) { return fN(cumMerges[i]); } },
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
      var note = el("p", "tm-note");
      note.textContent = "Code size & languages need the local CLI — every other number here is real.";
      counters.appendChild(note);
    }

    buildTimelineChart(chart, months, function (idx) { /* onChange handled globally */ });

    /* events by index */
    var evtByIndex = {};
    var eventIdxList = events.map(function (e) { return e.idx; }).filter(function (ix, i, a) { return a.indexOf(ix) === i; }).sort(function (a, b) { return a - b; });
    function prevEventIx(from) {
      for (var i = eventIdxList.length - 1; i >= 0; i--) if (eventIdxList[i] < from - 0.5) return eventIdxList[i];
      return 0;
    }
    function nextEventIx(from) {
      for (var i = 0; i < eventIdxList.length; i++) if (eventIdxList[i] > from + 0.5) return eventIdxList[i];
      return months.length - 1;
    }
    events.forEach(function (e) {
      if (!evtByIndex[e.idx]) evtByIndex[e.idx] = e;
    });

    var cur = Math.max(months.length - 1, 0);
    var raf = null, playing = false;
    var speeds = [0.5, 1, 1.5, 2];
    var speedIx = 1;

    function updateEvent(i) {
      var e = evtByIndex[i];
      if (e) {
        /* derived, honest metrics: what this month actually added */
        var m1 = months[e.idx] || months[months.length - 1];
        var m0 = months[Math.max(0, e.idx - 1)] || m1;
        var chips = [];
        if (m1.commits) chips.push("+" + fN(m1.commits) + " commits");
        if (m1.new_contributors) chips.push("+" + fN(m1.new_contributors) + " contributors");
        if (m1.files_end && m0.files_end && m1.files_end - m0.files_end) chips.push((m1.files_end - m0.files_end > 0 ? "+" : "") + fN(m1.files_end - m0.files_end) + " files");
        if (m1.net_end !== undefined && m0.net_end !== undefined && m1.net_end - m0.net_end) chips.push((m1.net_end - m0.net_end > 0 ? "+" : "") + fK(Math.abs(m1.net_end - m0.net_end)) + " lines");
        evtOverlay.innerHTML =
          '<span class="te-kind">' + esc(e.kind) + "</span>" +
          '<b class="te-title">' + esc(e.title) + "</b>" +
          '<span class="te-sub">' + esc(e.sub) + "</span>" +
          (chips.length ? '<span class="te-metrics">' + chips.slice(0, 3).map(esc).join("</span><span class='te-metrics'>") + "</span>" : "") +
          '<span class="te-date">' + esc(fmtDate(e.date)) + "</span>";
        evtOverlay.classList.add("show");
      } else {
        evtOverlay.classList.remove("show");
      }
    }

    var lastFloor = -1;
    function lerpN(a, b, t) { return a + (b - a) * t; }
    function smoothCounters(fl, t) {
      var nx = Math.min(fl + 1, months.length - 1);
      counterNodes[0].textContent = fN(lerpN(cumCommits[fl], cumCommits[nx], t));
      counterNodes[1].textContent = fN(lerpN(months[fl].commits, months[nx].commits, t));
      counterNodes[2].textContent = fN(lerpN(cumPeople[fl], cumPeople[nx], t));
      counterNodes[3].textContent = fN(lerpN(cumMerges[fl], cumMerges[nx], t));
      if (hasCode) {
        counterNodes[4].textContent = fN(lerpN(months[fl].files_end || 0, months[nx].files_end || 0, t));
        counterNodes[5].textContent = fK(lerpN(months[fl].net_end || 0, months[nx].net_end || 0, t));
      } else {
        counterNodes[4].textContent = fN(lerpN(months[fl].active_days || 0, months[nx].active_days || 0, t));
      }
    }
    function setIndex(i, fromUser) {
      cur = Math.max(0, Math.min(months.length - 1, i));
      var fl = cur | 0, t = cur - fl;
      range.value = fl;
      range.style.setProperty("--fill", (months.length < 2 ? 100 : (cur / (months.length - 1)) * 100) + "%");
      /* counters + chart pointer animate every frame — smooth, no snapping */
      smoothCounters(fl, t);
      chart.update(cur);
      /* month-anchored content swaps only when the month actually changes */
      if (fl !== lastFloor) {
        lastFloor = fl;
        var m = months[fl];
        var yr = Math.floor(fl / 12) + 1, yrs = Math.max(1, Math.ceil(months.length / 12));
        dateline.innerHTML = "<b>" + esc(m.label) + "</b><span>year " + yr + " of " + yrs + " · " + fN(cumCommits[fl]) + " commits total</span>";
        msg.querySelector(".msgtxt").textContent = m.msg ? "“" + m.msg + "”" : "—";
        renderLangs(langZone, m.langs, hasCode);
        updateEvent(fl);
      }
      if (fromUser) stop();
    }
    function stop() {
      playing = false;
      if (raf) cancelAnimationFrame(raf), raf = null;
      play.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>';
      play.setAttribute("aria-label", "Play the project timeline");
      play.title = "Play the project timeline";
    }
    function start() {
      if (!multi) return;
      playing = true;
      play.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2.5" width="3.4" height="11" rx="1"/><rect x="9.6" y="2.5" width="3.4" height="11" rx="1"/></svg>';
      play.setAttribute("aria-label", "Pause the project timeline");
      play.title = "Pause";
      var base = Math.max(months.length / 14, 1.6);   /* 1× ≈ 14s journey */
      /* smart pacing: slow down near meaningful events, cruise between them */
      var near = eventIdxList.some(function (ix) { return Math.abs(cur - ix) < 0.8; });
      var rate = base * speeds[speedIx] * (near ? 0.32 : 1);
      var last = null;
      function frame(t) {
        if (!playing) return;
        if (last === null) last = t;
        cur += (t - last) / 1000 * rate;
        last = t;
        if (cur >= months.length - 1) { setIndex(months.length - 1); stop(); return; }
        setIndex(cur);
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }
    play.addEventListener("click", function () {
      if (playing) return stop();
      if (cur >= months.length - 1) cur = 0;
      start();
    });
    bFirst.addEventListener("click", function () { setIndex(0, true); });
    bLast.addEventListener("click", function () { setIndex(months.length - 1, true); });
    bPrev.addEventListener("click", function () { setIndex(prevEventIx(cur), true); });
    bNext.addEventListener("click", function () { setIndex(nextEventIx(cur), true); });
    speed.addEventListener("click", function () {
      speedIx = (speedIx + 1) % speeds.length;
      speed.textContent = speeds[speedIx] + "×";
      speed.setAttribute("aria-label", "Playback speed: " + speeds[speedIx] + "×");
    });
    range.addEventListener("input", function () { setIndex(+range.value, true); });

    /* keyboard: ← → step months, space toggles play, home/end jump —
       active whenever the time machine is on screen and nothing else wants the keys */
    tm.setAttribute("tabindex", "-1");
    document.addEventListener("keydown", function onKey(e) {
      if (document.querySelector(".xs-overlay")) return;
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(tag) && document.activeElement !== tm) return;
      var inView = false;
      try {
        var r = tm.getBoundingClientRect();
        inView = (r.height === 0 && r.top === 0) /* no layout (tests) */ || (r.top < innerHeight && r.bottom > 0);
      } catch (err) { inView = true; }
      if (!inView) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); setIndex(cur - 1, true); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setIndex(cur + 1, true); }
      else if (e.key === " ") { e.preventDefault(); play.click(); }
      else if (e.key === "Home") { e.preventDefault(); setIndex(0, true); }
      else if (e.key === "End") { e.preventDefault(); setIndex(months.length - 1, true); }
    });

    /* export hook */
    var exBtn = el("button", "btn tm-export");
    exBtn.type = "button";
    exBtn.innerHTML = "Export animation ⤓";
    exBtn.addEventListener("click", function () { openExportStudio(d, "animation"); });
    controls.appendChild(exBtn);

    setIndex(cur);
  }

  function renderLangs(zone, langs, hasCode) {
    zone.innerHTML = "";
    if (!hasCode || !langs) return;
    var entries = Object.keys(langs).map(function (k) { return [k, langs[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
    if (!entries.length) return;
    var total = entries.reduce(function (a, e) { return a + e[1]; }, 0) || 1;
    var max = entries[0][1];
    var head = el("div", null, '<span class="lbl">The codebase, by language</span>');
    zone.appendChild(head);
    entries.forEach(function (e) {
      var row = el("div", "langbar");
      row.innerHTML =
        "<span>" + esc(e[0]) + "</span>" +
        '<div class="track"><i class="fill" style="width:' + Math.max(3, (e[1] / max) * 100) + "%;background:" + (LANG_COLORS[e[0]] || LANG_COLORS.Other) + '"></i></div>' +
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

    var lastYear = null;
    months.forEach(function (m, i) {
      var yr = m.key.slice(0, 4);
      if (yr !== lastYear) {
        lastYear = yr;
        var x = PADL + (n < 2 ? 0 : (i / (n - 1)) * iw);
        svg.appendChild(svgEl("line", { x1: x, y1: PADT, x2: x, y2: H - PADB, "class": "tmgrid", "stroke-width": 1 }));
        var t = svgEl("text", { x: x + 4, y: H - 8, "class": "tmyear", "font-size": 10 });
        t.textContent = yr;
        svg.appendChild(t);
      }
    });

    var bars = months.map(function (m, i) {
      var h = maxMonthly ? (m.commits / maxMonthly) * (ih * 0.62) : 0;
      var x = PADL + (n < 2 ? iw / 2 : (i / (n - 1)) * iw);
      var r = svgEl("rect", {
        x: x - bw / 2, y: PADT + ih - h, width: bw, height: Math.max(h, m.commits ? 1.5 : 0),
        rx: Math.min(2, bw / 3), "class": "tmb",
      });
      if (m.commits) {
        var tt = el("title");
        tt.textContent = m.label + " — " + m.commits + " commits";
        r.appendChild(tt);
      }
      svg.appendChild(r);
      return r;
    });

    var pts = cums.map(function (c, i) {
      var x = PADL + (n < 2 ? iw / 2 : (i / (n - 1)) * iw);
      var y = PADT + ih - (c / maxCum) * (ih * 0.92);
      return [x, y];
    });
    var lineD = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var areaD = lineD + " L" + pts[pts.length - 1][0].toFixed(1) + " " + (PADT + ih) + " L" + pts[0][0].toFixed(1) + " " + (PADT + ih) + " Z";
    var defs = svgEl("defs");
    var grad = svgEl("linearGradient", { id: "ccgrad", x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(svgEl("stop", { offset: "0%", "class": "tmarea-stop", "stop-opacity": 0.28 }));
    grad.appendChild(svgEl("stop", { offset: "100%", "class": "tmarea-stop", "stop-opacity": 0 }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(svgEl("path", { d: areaD, fill: "url(#ccgrad)" }));
    svg.appendChild(svgEl("path", { d: lineD, fill: "none", "class": "tmline", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));

    var pointer = svgEl("line", { x1: 0, y1: PADT, x2: 0, y2: H - PADB, "class": "tmpointer", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0.7 });
    var dot = svgEl("circle", { r: 4.5, "class": "tmdot", "stroke-width": 2 });
    svg.appendChild(pointer); svg.appendChild(dot);
    svg.appendChild(svgEl("line", { x1: PADL, y1: PADT + ih, x2: W - PADR, y2: PADT + ih, "class": "tmgrid" }));

    container.appendChild(svg);

    function update(i) {
      var x = PADL + (n < 2 ? iw / 2 : (i / (n - 1)) * iw);
      pointer.setAttribute("x1", x); pointer.setAttribute("x2", x);
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", pts[Math.round(Math.max(0, Math.min(i, n - 1)))][1]);
      var lit = Math.floor(i + 1e-4);
      for (var k = 0; k < bars.length; k++) bars[k].classList.toggle("lit", k <= lit);
      if (onChange) onChange(lit);
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
          c.className = "punch-cell lb-" + (frac > 0.66 ? "hi" : frac > 0.33 ? "md" : "lo");
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
    wrap.parentElement.classList.add("sec--extra");
    var list = el("div", "roast");
    d.roast.forEach(function (q) {
      var item = el("div", "quip");
      item.innerHTML = "<p>" + esc(q.line) + '</p><span class="evidence">' + esc(q.evidence) + "</span>";
      list.appendChild(item);
    });
    wrap.appendChild(list);
  }

  /* ── certificate + export ────────────────────────────────────── */

  function certificate(root, d) {
    var wrap = section(root, "share", "Proof of work", "The certificate",
      "Screenshot this — or open the export studio for share cards, animated GIF, video, SVG and a README block, all generated locally.");
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
    var studioBtn = el("button", "btn btn-primary");
    studioBtn.type = "button";
    studioBtn.innerHTML = "Open export studio";
    var quickBtn = el("button", "btn");
    quickBtn.type = "button";
    quickBtn.textContent = "Quick share card (PNG)";
    actions.appendChild(studioBtn); actions.appendChild(quickBtn);

    var preview = el("div", "share-preview");
    preview.style.marginTop = "24px";

    studioBtn.addEventListener("click", function () { openExportStudio(d, "image"); });
    quickBtn.addEventListener("click", function () {
      var c = drawCard(d, "og", "dark");
      preview.innerHTML = "";
      preview.appendChild(c);
      if (c.toBlob) c.toBlob(function (blob) {
        downloadBlob(blob, safeName(d) + "-share.png");
      }, "image/png");
    });

    zone.appendChild(actions);
    zone.appendChild(preview);
    wrap.appendChild(zone);
  }


  /* ── EXPORT STUDIO ────────────────────────────────────────────── */

  var THEMES = {
    dark: { bg: "#0B0C10", ink: "#E9EBF3", dim: "#9BA1B5", faint: "#687089",
            accent: "#E2FF3A", accentInk: "#151803", line: "#2E3344",
            bar: "#7b9a1d", area: "rgba(226,255,58,0.14)" },
    light: { bg: "#F7F7F2", ink: "#14161D", dim: "#4d5261", faint: "#8a8f9e",
             accent: "#7E9A00", accentInk: "#F7F7F2", line: "#d9d9cf",
             bar: "#9db32a", area: "rgba(126,154,0,0.15)" },
  };

  function fitFont(x, text, base, family, weight, maxW) {
    var size = base;
    do {
      x.font = (weight || "700") + " " + size + "px " + family;
      size -= 3;
    } while (x.measureText(text).width > maxW && size > 18);
  }

  function drawCard(d, kind, themeName) {
    var t = d.totals, r = d.repo, sh = d.shape, fp = d.fingerprint;
    var th = THEMES[themeName] || THEMES.dark;
    var W = { og: 1200, square: 1080, story: 1080, banner: 1280 }[kind] || 1200;
    var H = { og: 630, square: 1080, story: 1920, banner: 320 }[kind] || 630;
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var x = canvas.getContext && canvas.getContext("2d");
    if (!x) return canvas;
    var MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    var SANS = 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    x.fillStyle = th.bg; x.fillRect(0, 0, W, H);
    if (themeName !== "light") {
      var glow = x.createRadialGradient(W * 0.85, kind === "story" ? H * 0.1 : -H * 0.15, 10, W * 0.85, kind === "story" ? H * 0.1 : -H * 0.15, W * 0.7);
      glow.addColorStop(0, "rgba(226,255,58,0.13)");
      glow.addColorStop(1, "rgba(226,255,58,0)");
      x.fillStyle = glow; x.fillRect(0, 0, W, H);
    }
    var M = Math.round(W * (kind === "banner" ? 0.025 : 0.05));
    x.strokeStyle = th.line; x.lineWidth = Math.max(2, W / 600);
    x.strokeRect(M, M, W - M * 2, H - M * 2);

    function stat(cx, cy, val, label, vs, ls) {
      x.fillStyle = th.ink;
      x.font = "700 " + vs + "px " + MONO;
      x.fillText(val, cx, cy);
      x.fillStyle = th.faint;
      x.font = "500 " + ls + "px " + MONO;
      x.fillText(label.toUpperCase(), cx, cy + vs * 0.55);
    }
    function spark(sx, sy, sw, shh, lw) {
      var months = d.months;
      var maxC = Math.max.apply(null, months.map(function (m) { return m.commits; })) || 1;
      var step = sw / Math.max(months.length - 1, 1);
      x.beginPath();
      months.forEach(function (m, i) {
        var px = sx + i * step, py = sy + shh - (m.commits / maxC) * shh;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      });
      x.strokeStyle = th.accent; x.lineWidth = lw; x.lineJoin = "round"; x.stroke();
      x.lineTo(sx + sw, sy + shh); x.lineTo(sx, sy + shh); x.closePath();
      x.fillStyle = th.area; x.fill();
    }
    function tryLetterSpacing(v) { try { x.letterSpacing = v; } catch (e) {} }

    if (kind === "og") {
      x.fillStyle = th.faint; x.font = "600 15px " + MONO;
      tryLetterSpacing("6px");
      x.fillText("THE STORY OF", M + 40, M + 52); tryLetterSpacing("0px");
      x.fillStyle = th.ink;
      fitFont(x, r.name, 66, SANS, "800", W - (M + 40) * 2);
      x.fillText(r.name, M + 40, M + 140);
      x.fillStyle = th.accent; x.font = "700 24px " + SANS;
      x.fillText(sh.label, M + 40, M + 184);
      x.fillStyle = th.dim; x.font = "400 16px " + MONO;
      x.fillText(fmtDate(r.first) + " — " + fmtDate(r.last) + " · " + r.age_label, M + 40, M + 224);
      spark(M + 40, H - 252, W - (M + 40) * 2, 54, 3);
      var gy = H - 160, colW = (W - (M + 40) * 2) / 3;
      var stats = [[fN(t.commits), "commits"], [fN(t.contributors), "contributors"], [fN(t.active_days), "active days"],
                   [t.longest_streak + " days", "longest streak"], [t.night_pct + "%", "at night"], [fK(t.lines_added), "lines added"]];
      stats.forEach(function (s, i) {
        stat(M + 40 + (i % 3) * colW, gy + Math.floor(i / 3) * 78, s[0], s[1], 30, 12);
      });
      x.fillStyle = th.dim; x.font = "600 16px " + SANS;
      x.fillText(fp.archetype.icon + "  " + fp.archetype.label + " — " + fp.author, M + 40, H - M - 52);
      x.fillStyle = th.faint; x.font = "500 13px " + MONO;
      x.fillText("commit canvas · real git data · generated locally", M + 40, H - M - 28);
    } else if (kind === "square") {
      x.textAlign = "center";
      x.fillStyle = th.faint; x.font = "600 22px " + MONO; tryLetterSpacing("8px");
      x.fillText("THE STORY OF", W / 2, M + 110); tryLetterSpacing("0px");
      x.fillStyle = th.ink;
      fitFont(x, r.name, 92, SANS, "800", W - 260);
      x.fillText(r.name, W / 2, M + 240);
      x.fillStyle = th.accent; x.font = "700 40px " + SANS;
      x.fillText(sh.label, W / 2, M + 320);
      x.fillStyle = th.dim; x.font = "400 26px " + MONO;
      x.fillText(fmtDate(r.first) + " — " + fmtDate(r.last) + " · " + r.age_label, W / 2, M + 372);
      spark(M + 110, M + 430, W - 220, 130, 6);
      var colW2 = (W - 220) / 3, gy2 = M + 640;
      var stats2 = [[fN(t.commits), "commits"], [fN(t.active_days), "active days"], [t.longest_streak + "d", "longest streak"],
                    [fN(t.contributors), "contributors"], [t.night_pct + "%", "at night"], [fK(t.lines_added), "lines added"]];
      x.textAlign = "left";
      stats2.forEach(function (s, i) {
        stat(M + 110 + (i % 3) * colW2, gy2 + Math.floor(i / 3) * 150, s[0], s[1], 54, 19);
      });
      x.textAlign = "center";
      x.fillStyle = th.dim; x.font = "600 28px " + SANS;
      x.fillText(fp.archetype.icon + " " + fp.archetype.label, W / 2, H - M - 120);
      x.fillStyle = th.faint; x.font = "500 20px " + MONO;
      x.fillText("commit canvas · generated locally from real git data", W / 2, H - M - 74);
      x.textAlign = "left";
    } else if (kind === "story") {
      x.fillStyle = th.faint; x.font = "600 22px " + MONO; tryLetterSpacing("6px");
      x.fillText("THE STORY OF", M + 40, M + 90); tryLetterSpacing("0px");
      x.fillStyle = th.ink;
      fitFont(x, r.name, 110, SANS, "800", W - (M + 40) * 2);
      x.fillText(r.name, M + 40, M + 210);
      x.fillStyle = th.accent; x.font = "700 34px " + SANS;
      x.fillText(sh.label, M + 40, M + 280);
      x.fillStyle = th.dim; x.font = "400 24px " + MONO;
      x.fillText(fmtDate(r.first) + " — " + fmtDate(r.last) + " · " + r.age_label, M + 40, M + 336);
      var gy3 = M + 470, colW3 = (W - (M + 40) * 2) / 3;
      var stats3 = [[fN(t.commits), "commits"], [fN(t.contributors), "contributors"], [fN(t.active_days), "active days"],
                    [t.longest_streak + " days", "longest streak"], [t.night_pct + "%", "at night"], [fK(t.lines_added), "lines added"]];
      stats3.forEach(function (s, i) {
        stat(M + 40 + (i % 3) * colW3, gy3 + Math.floor(i / 3) * 170, s[0], s[1], 56, 20);
      });
      spark(M + 40, gy3 + 400, W - (M + 40) * 2, 150, 5);
      x.fillStyle = th.dim; x.font = "600 26px " + SANS;
      x.fillText(fp.archetype.icon + "  " + fp.archetype.label + " — " + fp.author, M + 40, H - M - 90);
      x.fillStyle = th.faint; x.font = "500 20px " + MONO;
      x.fillText("commit canvas · real git data · generated locally", M + 40, H - M - 48);
    } else { /* banner */
      x.fillStyle = th.ink;
      fitFont(x, r.name, 58, SANS, "800", 560);
      x.fillText(r.name, M + 36, M + 84);
      x.fillStyle = th.accent; x.font = "700 22px " + SANS;
      x.fillText(sh.label + " · " + r.age_label, M + 36, M + 126);
      x.fillStyle = th.dim; x.font = "400 15px " + MONO;
      x.fillText(fN(t.commits) + " commits · " + fN(t.contributors) + " contributors · " + t.longest_streak + "-day streak", M + 36, H - M - 42);
      spark(660, M + 46, W - 660 - (M + 40), 140, 3);
      x.fillStyle = th.faint; x.font = "500 13px " + MONO;
      x.textAlign = "right";
      x.fillText("commit canvas", W - M - 36, H - M - 42);
      x.textAlign = "left";
    }
    return canvas;
  }

  function svgTimeline(d, W, H) {
    var months = d.months, n = Math.max(months.length, 2);
    var PADL = 10, PADR = 10, PADT = 34, PADB = 26;
    var iw = W - PADL - PADR, ih = H - PADT - PADB;
    var maxM = Math.max.apply(null, months.map(function (m) { return m.commits; })) || 1;
    var cum = 0, cums = months.map(function (m) { return cum += m.commits; });
    var maxC = Math.max(cums[cums.length - 1], 1);
    var s = [];
    s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Commit timeline for ' + esc(d.repo.name) + '">');
    s.push('<rect width="' + W + '" height="' + H + '" fill="#0B0C10"/>');
    s.push('<rect x="8" y="8" width="' + (W - 16) + '" height="' + (H - 16) + '" fill="none" stroke="#2E3344" stroke-width="2" rx="12"/>');
    s.push('<text x="30" y="34" fill="#E9EBF3" font-family="ui-sans-serif,system-ui,sans-serif" font-size="21" font-weight="800">' + esc(d.repo.name) + " — " + esc(d.shape.label) + "</text>");
    s.push('<text x="' + (W - 30) + '" y="34" fill="#687089" font-family="ui-monospace,monospace" font-size="12" text-anchor="end">' + esc(fmtDate(d.repo.first)) + " → " + esc(fmtDate(d.repo.last)) + "</text>");
    var lastYear = null;
    months.forEach(function (m, i) {
      var yr = m.key.slice(0, 4);
      if (yr !== lastYear) {
        lastYear = yr;
        var gx = PADL + (i / (n - 1)) * iw;
        s.push('<line x1="' + gx.toFixed(1) + '" y1="' + PADT + '" x2="' + gx.toFixed(1) + '" y2="' + (H - PADB) + '" stroke="#232735"/>');
        s.push('<text x="' + (gx + 4).toFixed(1) + '" y="' + (H - 8) + '" fill="#687089" font-family="ui-monospace,monospace" font-size="10">' + yr + "</text>");
      }
    });
    var bw = Math.max(2, Math.min(26, iw / n - 2));
    months.forEach(function (m, i) {
      var h = (m.commits / maxM) * ih * 0.62;
      var bx = PADL + (i / (n - 1)) * iw - bw / 2;
      s.push('<rect x="' + bx.toFixed(1) + '" y="' + (PADT + ih - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(h, m.commits ? 1.5 : 0).toFixed(1) + '" rx="2" fill="#7b9a1d"/>');
    });
    var path = cums.map(function (c, i) {
      var px = PADL + (i / (n - 1)) * iw;
      var py = PADT + ih - (c / maxC) * ih * 0.92;
      return (i ? "L" : "M") + px.toFixed(1) + " " + py.toFixed(1);
    }).join(" ");
    s.push('<path d="' + path + " L" + (PADL + iw) + " " + (PADT + ih) + " L" + PADL + " " + (PADT + ih) + ' Z" fill="rgba(226,255,58,0.10)"/>');
    s.push('<path d="' + path + '" fill="none" stroke="#E2FF3A" stroke-width="2" stroke-linejoin="round"/>');
    s.push('<text x="30" y="' + (H - 8) + '" fill="#687089" font-family="ui-monospace,monospace" font-size="10">commit canvas · generated from real git data</text>');
    s.push("</svg>");
    return s.join("\n");
  }

  function readmeMarkdown(d) {
    var t = d.totals;
    var lines = [];
    lines.push("# " + d.repo.name + " — " + d.shape.label);
    lines.push("");
    lines.push("> " + d.shape.summary + " — story generated with [Commit Canvas](https://github.com/ahmadrrrtx/commit-canvas).");
    lines.push("");
    lines.push("**" + fN(t.commits) + " commits** · **" + fN(t.contributors) + " contributors** · **" +
      fN(t.active_days) + " active days** · longest streak **" + t.longest_streak + " days** · **" + d.repo.age_label + "** of history");
    if (d.chapters.length) {
      lines.push("");
      lines.push("## Chapters");
      d.chapters.forEach(function (c) {
        lines.push("- **" + c.title + "** — " + (c.facts[0] || c.subtitle || ""));
      });
    }
    lines.push("");
    lines.push("## The moment");
    lines.push("**" + d.moment.title + "** — " + d.moment.sub);
    lines.push("");
    lines.push("## Fingerprint");
    lines.push(d.fingerprint.archetype.label + " (" + d.fingerprint.archetype.icon + ") — " + d.fingerprint.archetype.tagline);
    lines.push("");
    lines.push("## Make one for your repository");
    lines.push("```bash");
    lines.push("git clone https://github.com/ahmadrrrtx/commit-canvas");
    lines.push("cd commit-canvas && ./run.sh /path/to/your-repo");
    lines.push("```");
    return lines.join("\n");
  }

  /* animator shared by GIF + WebM */
  function makeAnimator(d, W, H, themeName) {
    var th = THEMES[themeName] || THEMES.dark;
    var months = d.months, n = Math.max(months.length, 1);
    var MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    var SANS = 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif';
    var cum = 0, cums = months.map(function (m) { return cum += m.commits; });
    var people = 0, cpeople = months.map(function (m) { return people += m.new_contributors || 0; });
    var maxM = Math.max.apply(null, months.map(function (m) { return m.commits; })) || 1;
    var hasCode = d.meta.has_code_size && months.some(function (m) { return m.net_end > 0; });

    return { draw: function (x, t) {
      var PADL = Math.round(W * 0.09), PADR = Math.round(W * 0.05);
      var PADT = Math.round(H * 0.38), PADB = Math.round(H * 0.22);
      var iw = W - PADL - PADR, ih = H - PADT - PADB;
      x.fillStyle = th.bg; x.fillRect(0, 0, W, H);
      x.strokeStyle = th.line; x.lineWidth = 2;
      x.strokeRect(14, 14, W - 28, H - 28);

      x.fillStyle = th.faint; x.font = "600 " + Math.round(W / 42) + "px " + MONO;
      x.fillText("T H E   S T O R Y   O F", 40, 56);
      x.fillStyle = th.ink;
      fitFont(x, d.repo.name, Math.round(W / 12), SANS, "800", W - 320);
      x.fillText(d.repo.name, 40, 96);
      x.fillStyle = th.accent; x.font = "700 " + Math.round(W / 34) + "px " + SANS;
      x.fillText(d.shape.label, 40, H - 40);

      x.fillStyle = th.line; x.fillRect(40, H - 22, W - 80, 3);
      x.fillStyle = th.accent; x.fillRect(40, H - 22, (W - 80) * t, 3);

      var cur = t * (n - 1);
      var ci = Math.min(Math.floor(cur), n - 1);
      var month = months[Math.max(ci, 0)];

      x.fillStyle = th.ink;
      x.font = "700 " + Math.round(W / 22) + "px " + MONO;
      x.textAlign = "right";
      x.fillText(month ? month.label : "", W - 40, 96);
      x.textAlign = "left";

      var bw = Math.max(2, Math.min(30, iw / n - 2));
      var lastYear = null;
      months.forEach(function (m, i) {
        if (i > cur) return;
        var frac = i >= cur ? (cur - i) : 1;
        var h = (m.commits / maxM) * ih * 0.75 * (0.25 + 0.75 * Math.max(frac, 0));
        var bx = PADL + (i / (n - 1)) * iw - bw / 2;
        x.fillStyle = i === ci ? th.accent : th.bar;
        x.fillRect(bx, PADT + ih - h, bw, Math.max(h, m.commits ? 2 : 0));
        var yr = m.key.slice(0, 4);
        if (yr !== lastYear) {
          lastYear = yr;
          x.fillStyle = th.faint; x.font = "500 " + Math.round(W / 56) + "px " + MONO;
          x.fillText(yr, PADL + (i / (n - 1)) * iw - 10, PADT + ih + 24);
        }
      });

      x.strokeStyle = th.ink; x.lineWidth = Math.max(1.5, W / 320);
      x.beginPath();
      var started = false;
      for (var i = 0; i <= ci && i < n; i++) {
        var px = PADL + (i / (n - 1)) * iw;
        var py = PADT + ih - (cums[i] / cums[n - 1]) * ih * 0.92;
        started ? x.lineTo(px, py) : (x.moveTo(px, py), started = true);
      }
      x.globalAlpha = 0.75; x.stroke(); x.globalAlpha = 1;

      x.fillStyle = th.dim; x.font = "500 " + Math.round(W / 44) + "px " + MONO;
      var sy = PADT - 26;
      x.textAlign = "right";
      x.fillText(fN(cums[Math.max(ci, 0)]) + " commits", W - 40, sy);
      x.fillText(fN(cpeople[Math.max(ci, 0)]) + " people", W - 40, sy + Math.round(W / 30));
      if (hasCode && month) x.fillText(fN(month.files_end) + " files", W - 40, sy + 2 * Math.round(W / 30));
      x.textAlign = "left";

      if (t > 0.86) {
        var a = Math.min(1, (t - 0.86) / 0.1);
        x.fillStyle = themeName === "light" ? "rgba(247,247,242," + 0.86 * a + ")" : "rgba(11,12,16," + 0.84 * a + ")";
        x.fillRect(14, 14, W - 28, H - 28);
        x.globalAlpha = a;
        x.textAlign = "center";
        x.fillStyle = th.ink;
        x.font = "800 " + Math.round(W / 11) + "px " + SANS;
        x.fillText(fN(d.totals.commits) + " commits", W / 2, H / 2 - W / 14);
        x.fillStyle = th.accent;
        x.font = "700 " + Math.round(W / 24) + "px " + SANS;
        x.fillText(d.shape.label + " · " + d.repo.age_label, W / 2, H / 2 + W / 16);
        x.fillStyle = th.faint;
        x.font = "500 " + Math.round(W / 46) + "px " + MONO;
        x.fillText("commit canvas · your code has a story", W / 2, H / 2 + W / 9);
        x.textAlign = "left";
        x.globalAlpha = 1;
      }
    } };
  }

  function downloadBlob(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  function safeName(d) {
    return String(d.repo.name).replace(/[^\w.-]+/g, "_");
  }

  function buildStoryHTML(d) {
    var curTheme = currentTheme(document.querySelector(".cc-root")) || "midnight";
    var curDensity = currentDensity(document.querySelector(".cc-root")) || "standard";
    var inject = function (shell) {
      var json = JSON.stringify(d).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
      var html = shell.replace("/*__CC_DATA__*/null", "window.__CC_DATA__ = " + json + ";", 1);
      html = html.replace('data-theme="midnight"', 'data-theme="' + curTheme + '"', 1);
      html = html.replace('data-density="standard"', 'data-density="' + curDensity + '"', 1);
      return html;
    };
    return fetch("canvas.html")
      .then(function (r) { if (!r.ok) throw new Error("no shell"); return r.text(); })
      .then(inject)
      .catch(function () {
        /* file:// fallback — rebuild from the live document */
        var clone = document.documentElement.cloneNode(true);
        var app = clone.querySelector("#app"); if (app) app.innerHTML = "";
        var modal = clone.querySelector(".xs-overlay"); if (modal) modal.remove();
        return "<!DOCTYPE html>\n" + clone.outerHTML;
      });
  }

  function webmSupported() {
    return typeof MediaRecorder !== "undefined" &&
      typeof HTMLCanvasElement !== "undefined" &&
      HTMLCanvasElement.prototype.captureStream &&
      ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
        .some(function (t) { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } });
  }

  function openExportStudio(d, initialTab) {
    closeExportStudio();
    var ov = el("div", "xs-overlay");
    var box = el("div", "xs");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Export studio");
    var state = { theme: "dark" };

    var head = el("div", "xs-head");
    head.innerHTML = "<div><b>Export studio</b><span>everything is generated locally, on this page</span></div>";
    var closeBtn = el("button", "xs-close");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close export studio");
    closeBtn.innerHTML = "✕";
    head.appendChild(closeBtn);
    box.appendChild(head);

    var themeRow = el("div", "xs-theme");
    themeRow.innerHTML = "<span>Card theme</span>";
    var tgl = el("button", "btn xs-theme-btn");
    tgl.type = "button";
    tgl.textContent = "Dark";
    tgl.setAttribute("aria-label", "Toggle card theme");
    themeRow.appendChild(tgl);
    box.appendChild(themeRow);

    var tabs = el("div", "xs-tabs");
    tabs.setAttribute("role", "tablist");
    var TABS = [["image", "Images"], ["animation", "Animation"], ["vector", "Vector"], ["readme", "README"], ["page", "Story page"]];
    var panels = {}, tabBtns = {};
    TABS.forEach(function (tdef) {
      var b = el("button", "xs-tab");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.textContent = tdef[1];
      b.addEventListener("click", function () { showTab(tdef[0]); });
      tabs.appendChild(b);
      tabBtns[tdef[0]] = b;
      var p = el("div", "xs-panel");
      p.setAttribute("role", "tabpanel");
      p.hidden = true;
      panels[tdef[0]] = p;
    });
    box.appendChild(tabs);

    var bodyEl = el("div", "xs-body");

    /* image panel */
    var presets = [
      { id: "og", name: "X / LinkedIn", size: "1200 × 630", hint: "landscape social card" },
      { id: "square", name: "Instagram post", size: "1080 × 1080", hint: "square" },
      { id: "story", name: "Story / Shorts", size: "1080 × 1920", hint: "vertical 9:16" },
      { id: "banner", name: "README banner", size: "1280 × 320", hint: "wide, repo-friendly" },
    ];
    var imgGrid = el("div", "xs-presets");
    var previews = [];
    presets.forEach(function (p) {
      var cardEl = el("div", "xs-preset");
      var holder = el("div", "xs-preview");
      var meta = el("div", "xs-pmeta");
      meta.innerHTML = "<b>" + p.name + '</b><span class="mono">' + p.size + " · " + p.hint + "</span>";
      var btn = el("button", "btn");
      btn.type = "button";
      btn.textContent = "Download PNG";
      holder.appendChild(drawCard(d, p.id, state.theme));
      cardEl.appendChild(holder); cardEl.appendChild(meta); cardEl.appendChild(btn);
      imgGrid.appendChild(cardEl);
      previews.push({ id: p.id, holder: holder });
      btn.addEventListener("click", function () {
        var fresh = drawCard(d, p.id, state.theme);
        if (fresh.toBlob) fresh.toBlob(function (blob) { downloadBlob(blob, safeName(d) + "-" + p.id + ".png"); }, "image/png");
      });
    });
    panels.image.appendChild(imgGrid);
    panels.image.appendChild(el("p", "xs-note", "PNG cards render at full resolution — previews are scaled down to fit."));

    /* animation panel */
    var an = el("div", "xs-anim");
    var gifRow = el("div", "xs-form");
    gifRow.innerHTML =
      '<label>Duration <select data-xsopt="dur"><option>6</option><option selected>8</option><option>10</option><option>12</option></select> s</label>' +
      '<label>Size <select data-xsopt="size"><option selected value="480">480 × 240</option><option value="640">640 × 320</option></select></label>';
    var gifBtn = el("button", "btn btn-primary");
    gifBtn.type = "button";
    gifBtn.textContent = "Generate animated GIF";
    var prog = el("div", "xs-prog");
    prog.style.display = "none";
    prog.innerHTML = '<div class="xs-prog-bar"><i></i></div><span class="mono"></span>';
    gifRow.appendChild(gifBtn);
    an.appendChild(gifRow);
    an.appendChild(prog);
    var webmZone = el("div", "xs-webm");
    var webmBtn = el("button", "btn");
    webmBtn.type = "button";
    webmBtn.textContent = "Record video (WebM · 8s · 960×540)";
    webmZone.appendChild(webmBtn);
    an.appendChild(webmZone);
    an.appendChild(el("p", "xs-note",
      "The GIF plays the whole time machine as a loop. Video records as WebM — the browser-native format; convert to MP4 locally if you need it. Nothing is uploaded."));
    var gifOK = !!window.CommitCanvasGIF;
    var vidOK = webmSupported();
    if (!gifOK) {
      gifBtn.disabled = true;
      an.appendChild(el("p", "xs-note warn", "GIF encoder unavailable in this context."));
    }
    if (!vidOK) {
      webmBtn.disabled = true;
      webmZone.appendChild(el("p", "xs-note warn", "This browser can't record canvas video (MediaRecorder missing) — try Chrome or Firefox."));
    }
    panels.animation.appendChild(an);

    gifBtn.addEventListener("click", function () {
      if (!window.CommitCanvasGIF) return;
      gifBtn.disabled = true;
      var dur = parseInt((an.querySelector('[data-xsopt="dur"]') || {}).value || "8", 10);
      var w = parseInt((an.querySelector('[data-xsopt="size"]') || {}).value || "480", 10);
      var h = w / 2, fps = 12, frames = dur * fps;
      var cnv = document.createElement("canvas");
      cnv.width = w; cnv.height = h;
      var ctx = cnv.getContext("2d");
      var anim = makeAnimator(d, w, h, state.theme);
      var bar = prog.querySelector("i");
      var label = prog.querySelector("span");
      function renderFrame(i) {
        anim.draw(ctx, i / (frames - 1));
        return ctx.getImageData(0, 0, w, h);
      }
      var t0 = Date.now();
      prog.style.display = "block";
      bar.style.width = "0%";
      label.textContent = "rendering…";
      var i = 0;
      function chunk() {
        i = Math.min(frames, i + 6);
        bar.style.width = (40 * i / frames) + "%";
        label.textContent = "frame " + i + " / " + frames;
        if (i < frames) return setTimeout(chunk, 0);
        label.textContent = "encoding…";
        setTimeout(function () {
          try {
            var blob = window.CommitCanvasGIF.encodeGIF(
              { width: w, height: h, fps: fps },
              renderFrame, frames,
              function (done, total) {
                bar.style.width = (40 + 60 * done / total) + "%";
                label.textContent = "encoding " + done + " / " + total;
              });
            downloadBlob(blob, safeName(d) + "-timemachine.gif");
            label.textContent = "done in " + ((Date.now() - t0) / 1000).toFixed(1) + "s · " + (blob.size / 1024).toFixed(0) + " KB";
            bar.style.width = "100%";
          } catch (err) {
            label.textContent = "GIF failed: " + (err && err.message || err);
          }
          gifBtn.disabled = false;
        }, 0);
      }
      chunk();
    });

    webmBtn.addEventListener("click", function () {
      webmBtn.disabled = true;
      var w = 960, h = 540, dur = 8;
      var cnv = document.createElement("canvas");
      cnv.width = w; cnv.height = h;
      var ctx = cnv.getContext("2d");
      var stream = cnv.captureStream(30);
      var types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
      var mt = types.filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0];
      var rec = new MediaRecorder(stream, { mimeType: mt, videoBitsPerSecond: 6000000 });
      var chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        downloadBlob(new Blob(chunks, { type: "video/webm" }), safeName(d) + "-story.webm");
        webmBtn.disabled = false;
        webmBtn.textContent = "Record video (WebM · 8s · 960×540)";
      };
      var anim = makeAnimator(d, w, h, state.theme);
      var t0 = null;
      webmBtn.textContent = "Recording…";
      function frame(ts) {
        if (!t0) t0 = ts;
        var t = Math.min((ts - t0) / (dur * 1000), 1);
        anim.draw(ctx, t);
        if (t < 1) requestAnimationFrame(frame);
        else setTimeout(function () { rec.stop(); }, 350);
      }
      rec.start(250);
      requestAnimationFrame(frame);
    });

    /* vector panel */
    var vec = el("div", "xs-vec");
    var svgHolder = el("div", "xs-svg-preview");
    svgHolder.innerHTML = svgTimeline(d, 960, 300);
    var svgBtn = el("button", "btn btn-primary");
    svgBtn.type = "button";
    svgBtn.textContent = "Download SVG (1280 × 400)";
    svgBtn.addEventListener("click", function () {
      downloadBlob(new Blob([svgTimeline(d, 1280, 400)], { type: "image/svg+xml" }), safeName(d) + "-timeline.svg");
    });
    vec.appendChild(svgHolder); vec.appendChild(svgBtn);
    vec.appendChild(el("p", "xs-note", "A resolution-independent timeline — drops straight into a README or slide deck."));
    panels.vector.appendChild(vec);

    /* readme panel */
    var rm = el("div", "xs-readme");
    var ta = el("textarea", "xs-textarea");
    ta.setAttribute("readonly", "readonly");
    ta.setAttribute("aria-label", "Generated README markdown");
    ta.value = readmeMarkdown(d);
    var row = el("div", "xs-row");
    var copyBtn = el("button", "btn btn-primary");
    copyBtn.type = "button";
    copyBtn.textContent = "Copy markdown";
    var dlBtn = el("button", "btn");
    dlBtn.type = "button";
    dlBtn.textContent = "Download .md";
    row.appendChild(copyBtn); row.appendChild(dlBtn);
    copyBtn.addEventListener("click", function () {
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* older engines */ }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).catch(function () {});
      }
      copyBtn.textContent = "Copied ✓";
      setTimeout(function () { copyBtn.textContent = "Copy markdown"; }, 1600);
    });
    dlBtn.addEventListener("click", function () {
      downloadBlob(new Blob([ta.value], { type: "text/markdown" }), safeName(d) + "-story.md");
    });
    rm.appendChild(ta); rm.appendChild(row);
    panels.readme.appendChild(rm);

    /* page panel */
    var pg = el("div", "xs-page");
    pg.innerHTML = "<h3>The whole thing, one file</h3><p>A self-contained <code class='mono'>story.html</code> — " +
      "inline CSS, inline JS, your data baked in, zero network requests. Open it anywhere, forever.</p>";
    var pgBtn = el("button", "btn btn-primary");
    pgBtn.type = "button";
    pgBtn.textContent = "Download story.html";
    pgBtn.addEventListener("click", function () {
      pgBtn.disabled = true;
      buildStoryHTML(d).then(function (html) {
        downloadBlob(new Blob([html], { type: "text/html" }), safeName(d) + "-story.html");
      }).catch(function () {}).then(function () { pgBtn.disabled = false; });
    });
    pg.appendChild(pgBtn);
    panels.page.appendChild(pg);

    TABS.forEach(function (tdef) { bodyEl.appendChild(panels[tdef[0]]); });
    box.appendChild(bodyEl);
    ov.appendChild(box);
    document.body.appendChild(ov);

    function showTab(id) {
      TABS.forEach(function (tdef) {
        panels[tdef[0]].hidden = tdef[0] !== id;
        tabBtns[tdef[0]].setAttribute("aria-selected", tdef[0] === id ? "true" : "false");
        tabBtns[tdef[0]].classList.toggle("on", tdef[0] === id);
      });
    }
    showTab(initialTab || "image");

    tgl.addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      tgl.textContent = state.theme === "dark" ? "Dark" : "Light";
      previews.forEach(function (p) {
        p.holder.innerHTML = "";
        p.holder.appendChild(drawCard(d, p.id, state.theme));
      });
    });

    ov.addEventListener("mousedown", function (e) { if (e.target === ov) closeExportStudio(); });
    closeBtn.addEventListener("click", closeExportStudio);
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") {
        closeExportStudio();
        document.removeEventListener("keydown", onKey);
      }
    });
    var firstTab = tabs.querySelector(".xs-tab");
    if (firstTab && firstTab.focus) firstTab.focus();
    return box;
  }

  function closeExportStudio() {
    var existing = document.querySelector(".xs-overlay");
    if (existing) existing.remove();
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

    var made = el("div", "made-with");
    made.innerHTML =
      '<div class="mw-label">MADE WITH <em>COMMIT CANVAS</em></div>' +
      '<div class="mw-links">' +
      '<a href="https://ahmadrrrtx.github.io/commit-canvas/" target="_blank" rel="noopener">Create yours →</a>' +
      '<a href="https://github.com/ahmadrrrtx/commit-canvas" target="_blank" rel="noopener">View on GitHub →</a>' +
      '<button type="button" data-cc-style="1">Change theme →</button>' +
      '</div>';
    made.querySelector("[data-cc-style]").addEventListener("click", function () {
      var fab = document.querySelector(".style-fab");
      if (fab) fab.click();
    });
    root.appendChild(made);
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
    container.classList.add("cc-root");
    document.title = "The story of " + data.repo.name;

    /* presentation layer: theme + density (never touches the model) */
    var savedTheme = null, savedDensity = null;
    try {
      savedTheme = localStorage.getItem("cc-theme");
      savedDensity = localStorage.getItem("cc-density");
    } catch (e) {}
    var theme = (opts && opts.theme) || savedTheme || container.getAttribute("data-theme") || "midnight";
    var density = (opts && opts.density) || savedDensity || container.getAttribute("data-density") || "standard";
    container.setAttribute("data-theme", theme);
    container.setAttribute("data-density", density);
    if (document.body.classList.contains("cc-story")) {
      document.body.setAttribute("data-theme", theme);
      document.body.setAttribute("data-density", density);
    }

    hero(container, data);
    projectPulse(container, data);
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
    var standalone = document.body.classList.contains("cc-story");
    if (standalone && !document.querySelector(".story-bar")) storyBar(container, data);
    if (!document.querySelector(".style-fab")) {
      stylePanel(container, !standalone);
      if (standalone) {
        var acts = document.querySelector(".story-bar .sb-acts");
        if (acts) acts.insertBefore(document.querySelector(".style-fab"), acts.firstChild);
      }
    }
    activateReveals();
  }

  /* ── style panel: theme + density without re-analysis ─────────── */
  var STYLE_THEMES = [
    ["midnight", "Midnight", "#0B0C10", "#E2FF3A"],
    ["neon", "Neon", "#05060A", "#3DFFB4"],
    ["paper", "Paper", "#F6F2E9", "#9A6B0F"],
    ["terminal", "Terminal", "#070D08", "#3EFF6E"],
    ["aurora", "Aurora", "#0A0F1E", "#7DF9FF"],
    ["blueprint", "Blueprint", "#081830", "#FFD166"],
    ["mono", "Mono", "#FAFAFA", "#101010"],
    ["sunset", "Sunset", "#160D14", "#FF9E64"],
  ];
  var DENSITIES = ["compact", "standard", "cinematic"];

  function applyTheme(name, container) {
    var root = container || document.querySelector("[data-theme].cc-root") || document.body;
    root.setAttribute("data-theme", name);
    if (document.body.classList.contains("cc-story")) document.body.setAttribute("data-theme", name);
    try { localStorage.setItem("cc-theme", name); } catch (e) {}
  }
  function applyDensity(name, container) {
    var root = container || document.body;
    root.setAttribute("data-density", name);
    if (document.body.classList.contains("cc-story")) document.body.setAttribute("data-density", name);
    try { localStorage.setItem("cc-density", name); } catch (e) {}
  }
  function currentTheme(container) {
    return (container && container.getAttribute("data-theme")) ||
      (document.body.getAttribute("data-theme")) || "midnight";
  }
  function currentDensity(container) {
    return (container && container.getAttribute("data-density")) ||
      (document.body.getAttribute("data-density")) || "standard";
  }

  function storyBar(container, data) {
    var bar = el("div", "story-bar");
    var brand = el("a", "sb-brand");
    brand.href = "https://ahmadrrrtx.github.io/commit-canvas/";
    brand.target = "_blank";
    brand.rel = "noopener";
    brand.setAttribute("aria-label", "Made with Commit Canvas — visit the project");
    brand.innerHTML =
      '<svg viewBox="0 0 26 26" fill="none" aria-hidden="true">' +
      '<rect x="1" y="1" width="24" height="24" rx="6" stroke="currentColor" stroke-width="1.5" opacity=".55"/>' +
      '<path d="M6 19h6M9 19v-6h6V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>' +
      '<circle cx="6" cy="19" r="2.4" fill="var(--accent)"/>' +
      '<circle cx="12" cy="19" r="2" fill="currentColor" opacity=".6"/>' +
      '<circle cx="15" cy="13" r="2" fill="currentColor" opacity=".6"/>' +
      '<circle cx="21" cy="7" r="2.4" fill="var(--accent)"/></svg>' +
      "<span>commit canvas</span>";
    bar.appendChild(brand);

    var acts = el("div", "sb-acts");
    var share = el("button", "sb-btn");
    share.type = "button";
    share.innerHTML = "↗ Share";
    share.setAttribute("aria-label", "Share this story");
    share.addEventListener("click", function () { openExportStudio(data, "image"); });
    var exp = el("button", "sb-btn");
    exp.type = "button";
    exp.innerHTML = "⤓ Export";
    exp.setAttribute("aria-label", "Open the export studio");
    exp.addEventListener("click", function () { openExportStudio(data); });
    acts.appendChild(share);
    acts.appendChild(exp);
    bar.appendChild(acts);
    document.body.appendChild(bar);

    var onScroll = function () { bar.classList.toggle("scrolled", (window.scrollY || 0) > 24); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function stylePanel(container, dock) {
    var fab = el("button", "style-fab sb-btn" + (dock ? " dock" : ""));
    fab.type = "button";
    fab.innerHTML = '◐ <span>Style</span>';
    fab.setAttribute("aria-label", "Change story theme and density");
    var panel = el("div", "style-panel" + (dock ? " dock" : ""));
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Story style");

    var th = el("div", "style-themes");
    STYLE_THEMES.forEach(function (t) {
      var b = el("button", "style-th" + (currentTheme(container) === t[0] ? " on" : ""));
      b.type = "button";
      b.setAttribute("aria-label", "Theme: " + t[1]);
      b.title = t[1];
      b.innerHTML = '<i style="background:linear-gradient(90deg,' + t[2] + ' 55%,' + t[3] + ' 55%)"></i><span>' + t[1] + '</span>';
      b.addEventListener("click", function () {
        applyTheme(t[0], container);
        th.querySelectorAll(".style-th").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
      th.appendChild(b);
    });
    var dn = el("div", "style-dens");
    dn.setAttribute("aria-label", "Story density");
    DENSITIES.forEach(function (name) {
      var b = el("button", name === currentDensity(container) ? "on" : null);
      b.type = "button";
      b.textContent = name;
      b.addEventListener("click", function () {
        applyDensity(name, container);
        dn.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
      dn.appendChild(b);
    });
    var h1 = el("b", "sp-h", "Theme");
    var h2 = el("b", "sp-h", "Density");
    var note = el("p", "style-note", "Themes restyle instantly — the repository analysis is never re-run.");

    /* story presets — named configurations of theme + density */
    var h3 = el("b", "sp-h", "Presets");
    var pr = el("div", "style-dens style-presets");
    var PRESETS = [
      ["My story", "midnight", "standard"],
      ["Portfolio", "paper", "compact"],
      ["Cinematic", "aurora", "cinematic"],
      ["Terminal", "terminal", "standard"],
    ];
    PRESETS.forEach(function (p) {
      var b = el("button");
      b.type = "button";
      b.textContent = p[0];
      b.title = p[1] + " · " + p[2];
      b.addEventListener("click", function () {
        applyTheme(p[1], container);
        applyDensity(p[2], container);
        th.querySelectorAll(".style-th").forEach(function (x) { x.classList.toggle("on", x.getAttribute("aria-label") === "Theme: " + p[1][0].toUpperCase() + p[1].slice(1)); });
        dn.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x.textContent === p[2]); });
      });
      pr.appendChild(b);
    });
    panel.appendChild(h1); panel.appendChild(th); panel.appendChild(h2); panel.appendChild(dn);
    panel.appendChild(h3); panel.appendChild(pr); panel.appendChild(note);

    fab.addEventListener("click", function () { panel.hidden = !panel.hidden; });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !panel.contains(e.target) && e.target !== fab && !fab.contains(e.target)) panel.hidden = true;
    });
    document.body.appendChild(fab);
    document.body.appendChild(panel);
    window.__ccStyle = { applyTheme: applyTheme, applyDensity: applyDensity, THEMES: STYLE_THEMES };
  }

  window.CommitCanvas = { render: render, openExportStudio: openExportStudio, drawCard: drawCard, svgTimeline: svgTimeline, readmeMarkdown: readmeMarkdown, buildStoryHTML: buildStoryHTML, esc: esc, fN: fN, fK: fK, fmtDate: fmtDate };

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
