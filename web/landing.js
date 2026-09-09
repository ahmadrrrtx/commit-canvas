/* ══════════════════════════════════════════════════════════════════
   Commit Canvas — Landing Behavior
   1. Mounts a real embedded story (Flask) as the live example.
   2. Analyzes any public GitHub repo entirely in the browser via the
      GitHub REST API (no backend, nothing stored) and renders the full
      story with the same renderer the CLI file uses.
   3. Assembles a downloadable story.html from canvas.html + the data.
   ══════════════════════════════════════════════════════════════════ */
/* ── choose your story: theme cards ─────────────────────────────── */
var LP_THEMES = [
  ["midnight", "Midnight", "#0B0C10", "#E2FF3A"],
  ["neon", "Neon", "#05060A", "#3DFFB4"],
  ["paper", "Paper", "#F6F2E9", "#9A6B0F"],
  ["terminal", "Terminal", "#070D08", "#3EFF6E"],
  ["aurora", "Aurora", "#0A0F1E", "#7DF9FF"],
  ["blueprint", "Blueprint", "#081830", "#FFD166"],
  ["mono", "Mono", "#FAFAFA", "#101010"],
  ["sunset", "Sunset", "#160D14", "#FF9E64"],
];
function buildThemeRow(mount) {
  var row = document.getElementById("lp-theme-row");
  if (!row) return;
  var cur = null;
  try { cur = localStorage.getItem("cc-theme") || "midnight"; } catch (e) { cur = "midnight"; }
  LP_THEMES.forEach(function (t) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "lp-theme" + (cur === t[0] ? " on" : "");
    b.setAttribute("aria-label", "Theme: " + t[1]);
    b.title = t[1];
    b.innerHTML = '<i style="background:linear-gradient(120deg,' + t[2] + ' 55%,' + t[3] + ' 55%)"></i><span>' + t[1] + '</span>';
    b.addEventListener("click", function () {
      try { localStorage.setItem("cc-theme", t[0]); } catch (e) {}
      row.querySelectorAll(".lp-theme").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      var root = document.querySelector(".cc-root");
      if (root && window.__ccStyle) window.__ccStyle.applyTheme(t[0], root);
    });
    row.appendChild(b);
  });
}

(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  /* ── landing reveals ─────────────────────────────────────────── */

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !REDUCED) {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll(".lp-rv").forEach(function (n) { obs.observe(n); });
  } else {
    document.querySelectorAll(".lp-rv").forEach(function (n) { n.classList.add("in"); });
  }

  /* ── live example mount (real flask data, inlined at build) ──── */

  if (window.__CC_DEMO__) {
    try {
      var _themeSel = null;
      try { _themeSel = localStorage.getItem("cc-theme") || "midnight"; } catch (e) { _themeSel = "midnight"; }
      buildThemeRow($("demo-mount"));
      window.CommitCanvas.render($("demo-mount"), window.__CC_DEMO__, { theme: _themeSel });
      var dm = $("demo-meta");
      if (dm) dm.textContent = window.__CC_DEMO__.totals.commits.toLocaleString("en-US") + " commits · " + window.__CC_DEMO__.repo.age_label;
    } catch (e) { /* demo mount failure is non-fatal */ }
  }

  /* ── URL parsing ─────────────────────────────────────────────── */

  function parseRepo(input) {
    var s = String(input || "").trim();
    if (!s) return null;
    s = s.replace(/^git@github\.com:/, "https://github.com/")
         .replace(/\.git$/, "");
    var m = s.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
    if (m) return { owner: m[1], repo: m[2].replace(/\/.*$/, "") };
    m = s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
    if (m) return { owner: m[1], repo: m[2] };
    return null;
  }

  /* ── GitHub fetch layer ──────────────────────────────────────── */

  var API = "https://api.github.com";
  var MAX_PAGES = 10; // 1000 commits — keeps inside rate limits

  function api(url) {
    return fetch(url, { headers: { Accept: "application/vnd.github+json" } }).then(function (r) {
      if (r.ok) return r.json();
      if (r.status === 404) throw new ApiError("not_found", r);
      if (r.status === 403 || r.status === 429) throw new ApiError("rate", r);
      if (r.status === 409) throw new ApiError("empty", r);
      throw new ApiError("http", r);
    });
  }

  function ApiError(kind, resp) { this.kind = kind; this.resp = resp; this.name = "ApiError"; }
  ApiError.prototype = Object.create(Error.prototype);

  function fetchCommits(target, onProgress) {
    var all = [];
    function page(n) {
      var url = API + "/repos/" + target.owner + "/" + target.repo +
        "/commits?per_page=100&page=" + n;
      return api(url).then(function (json) {
        onProgress(json.length, all.length + json.length, n);
        all = all.concat(json);
        if (json.length === 100 && n < MAX_PAGES) return page(n + 1);
        return all;
      });
    }
    return page(1);
  }

  /* ── analysis (mirrors cc/analyzer.py rules, minus code-size) ── */

  function analyzeGithub(target, meta, commits, tags, releases) {
    var list = commits.map(function (c) {
      var a = c.commit.author;
      return {
        author: (c.author && c.author.login) ? c.author.login : a.name,
        date: new Date(a.date),
        msg: (a.message || "").split("\n")[0],
        parents: (c.parents || []).length,
      };
    }).sort(function (a, b) { return a.date - b.date; });

    var n = list.length;
    var dayCounts = {}, hourCounts = new Array(24).fill(0), wdCounts = new Array(7).fill(0);
    var grid = []; for (var w = 0; w < 7; w++) grid.push(new Array(24).fill(0));
    var authors = {}, months = {}, first, last;

    list.forEach(function (c) {
      var d = c.date;
      var dk = d.toISOString().slice(0, 10);
      dayCounts[dk] = (dayCounts[dk] || 0) + 1;
      hourCounts[d.getHours()]++;
      wdCounts[d.getDay() === 0 ? 6 : d.getDay() - 1]++;
      grid[d.getDay() === 0 ? 6 : d.getDay() - 1][d.getHours()]++;
      authors[c.author] = (authors[c.author] || 0) + 1;
      var mk = d.toISOString().slice(0, 7);
      (months[mk] = months[mk] || []).push(c);
      if (!first) first = c; last = c;
    });

    var contributorList = Object.keys(authors).map(function (k) { return { name: k, commits: authors[k] }; })
      .sort(function (a, b) { return b.commits - a.commits; });

    /* streaks */
    var dayKeys = Object.keys(dayCounts).sort();
    var longest = 1, run = 1;
    for (var i = 1; i < dayKeys.length; i++) {
      var gap = (new Date(dayKeys[i]) - new Date(dayKeys[i - 1])) / 86400000;
      if (gap === 1) { run++; longest = Math.max(longest, run); } else run = 1;
    }

    /* months */
    var monthList = [], seenPeople = {}, peopleSeen = 0;
    var mk = Object.keys(months).sort();
    mk.forEach(function (key) {
      var g = months[key];
      var mday = {}, mauth = {}, merges = 0;
      g.forEach(function (c) {
        var dk = c.date.toISOString().slice(0, 10);
        mday[dk] = (mday[dk] || 0) + 1;
        mauth[c.author] = 1;
        if (c.parents > 1) merges++;
      });
      var newP = 0; Object.keys(mauth).forEach(function (a) { if (!seenPeople[a]) { seenPeople[a] = 1; newP++; } });
      peopleSeen += newP;
      var peakKey = Object.keys(mday).sort(function (a, b) { return mday[b] - mday[a]; })[0];
      monthList.push({
        key: key,
        label: new Date(key + "-01T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
        commits: g.length,
        active_days: Object.keys(mday).length,
        merges: merges,
        contributors: Object.keys(mauth).length,
        new_contributors: newP,
        add: 0, del: 0, files_end: 0, net_end: 0,
        langs: {},
        dirs: [],
        peak_day: peakKey,
        peak_day_commits: mday[peakKey] || 0,
        msg: pickMsg(g),
      });
    });

    var totals = {
      commits: n,
      merges: list.filter(function (c) { return c.parents > 1; }).length,
      contributors: contributorList.length,
      active_days: dayKeys.length,
      longest_streak: dayKeys.length ? longest : 0,
      tags: tags.length,
      night_pct: pct(hourCounts.slice(22).concat(hourCounts.slice(0, 5)), n),
      weekend_pct: pct([wdCounts[5], wdCounts[6]], n),
      biggest_day: Math.max.apply(null, Object.keys(dayCounts).map(function (k) { return dayCounts[k]; }).concat([0])),
    };

    var firstDate = first ? first.date.toISOString() : new Date().toISOString();
    var lastDate = last ? last.date.toISOString() : new Date().toISOString();
    var ageDays = Math.round((new Date(lastDate) - new Date(firstDate)) / 86400000);

    return {
      meta: {
        v: 2, generated: new Date().toISOString().slice(0, 19),
        source: "github", generator: "Commit Canvas 2.0 (web)",
        has_code_size: false,
        notes: (n >= 1000 ? ["Analysis limited to the 1,000 most recent commits (API pagination cap)."] : []),
      },
      repo: {
        name: meta.full_name || target.owner + "/" + target.repo,
        first: firstDate, last: lastDate,
        age_days: ageDays,
        age_label: ageLabel(ageDays),
        branches: 0,
      },
      totals: totals,
      shape: detectShape(monthList, n),
      months: monthList,
      chapters: buildChapters(monthList, list, releases, tags),
      clock: {
        hours: hourCounts, weekdays: wdCounts, grid: grid,
        peak_hour: hourCounts.indexOf(Math.max.apply(null, hourCounts)),
        peak_weekday: wdCounts.indexOf(Math.max.apply(null, wdCounts)),
      },
      calendar: calendar(dayCounts),
      fingerprint: fingerprint(contributorList[0], list, totals, tags, monthList, releases, n),
      contributors: contributorList.slice(0, 12).map(function (c, i) {
        return {
          name: c.name, commits: c.commits,
          pct: Math.round(1000 * c.commits / n) / 10,
          first: "", last: "",
          badge: i === 0 ? "lead" : (c.commits / n >= 0.1 ? "core" : c.commits >= 5 ? "regular" : "guest"),
        };
      }),
      langs: [], areas: [],
      milestones: milestones(list, releases, tags, dayCounts),
      moment: findMoment(list, dayCounts, releases),
      glowup: glowupWeb(list, first, last),
      roast: roastWeb(list, monthList, contributorList),
      tags: tags.slice(0, 24).map(function (t) { return { name: t.name, date: "" }; }),
    };
  }

  function pct(part, total) { return total ? Math.round(100 * (Array.isArray(part) ? part.reduce(function (a, b) { return a + b; }, 0) : part) / total) : 0; }

  function ageLabel(days) {
    if (days < 45) return days + (days === 1 ? " day" : " days");
    if (days < 365) return Math.round(days / 30) + " mo";
    var y = Math.floor(days / 365), m = Math.round((days % 365) / 30);
    return y + (y === 1 ? " year" : " years") + (m ? " " + m + " mo" : "");
  }

  function pickMsg(group) {
    var best = null, score = -1;
    group.forEach(function (c) {
      var s = c.msg || "";
      if (!s || /^merge/i.test(s)) return;
      var sc = Math.min(s.length, 80) * 0.2;
      if (/^(feat|add|create|build|implement|new|release|v?\d+)/i.test(s)) sc += 30;
      if (!/^(fix|chore|refactor)/i.test(s)) sc += 10;
      if (sc > score) { score = sc; best = s; }
    });
    return (best || (group.length ? group[0].msg : "") || "").slice(0, 90);
  }

  function calendar(dayCounts) {
    var keys = Object.keys(dayCounts).sort();
    if (!keys.length) return { start: null, days: [] };
    var start = new Date(keys[0] + "T00:00:00Z");
    start.setUTCDate(1);
    var end = new Date(keys[keys.length - 1] + "T00:00:00Z");
    var days = [];
    for (var d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      var dk = d.toISOString().slice(0, 10);
      days.push(dayCounts[dk] || 0);
    }
    return { start: start.toISOString().slice(0, 10), days: days };
  }

  function median(a) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

  function detectShape(months, n) {
    if (months.length <= 1 || n < 5 || (n < 60 && (new Date(list[list.length-1].date) - new Date(list[0].date)) / 86400000 < 90)) return { arc: "fresh", label: "Fresh Start", summary: n + " commits and counting — this story is just opening." };
    var counts = months.map(function (m) { return m.commits; });
    var med = median(counts), half = Math.floor(counts.length / 2);
    var fv = counts.slice(0, half).reduce(function (a, b) { return a + b; }, 0) / Math.max(half, 1);
    var lv = counts.slice(half).reduce(function (a, b) { return a + b; }, 0) / Math.max(counts.length - half, 1);
    var top = Math.max.apply(null, counts);
    var comeback = 0;
    for (var i = 1; i < months.length; i++) {
      var da = new Date(months[i - 1].key + "-01T00:00:00Z"), db = new Date(months[i].key + "-01T00:00:00Z");
      if ((db - da) / 86400000 > 45) comeback = Math.max(comeback, months[i].commits);
    }
    if (comeback >= Math.max(3, med * 0.5) && longestMonthGap(months) >= 60) return { arc: "return", label: "The Return", summary: "It went quiet. Then it came back. Projects don't do that by accident." };
    if (top >= 4 * med && top >= 15) return { arc: "sprint", label: "The Sprint", summary: "Built in bursts of deep focus — the history remembers every surge." };
    if (lv >= 1.8 * fv) return { arc: "climb", label: "The Climb", summary: "It started quiet and kept accelerating. Momentum you can see." };
    if (fv >= 1.8 * lv) return { arc: "fade", label: "The Slow Fade", summary: "The early energy was real. What comes next is the interesting part." };
    if (counts.length >= 6 && top < 3 * med) return { arc: "marathon", label: "The Marathon", summary: "No drama, no spikes — just showing up, month after month." };
    return { arc: "journey", label: "The Journey", summary: "Quiet parts, loud parts, and everything in between." };
  }

  function longestMonthGap(months) {
    var g = 0;
    for (var i = 1; i < months.length; i++) {
      var a = new Date(months[i - 1].key + "-01T00:00:00Z"), b = new Date(months[i].key + "-01T00:00:00Z");
      g = Math.max(g, Math.round((b - a) / 86400000) - 30);
    }
    return g;
  }

  function buildChapters(months, list, releases, tags) {
    var chapters = [];
    var first = list[0];
    chapters.push({
      kind: "beginning", title: "The Beginning", subtitle: "where every project starts",
      start: first.date.toISOString(), end: first.date.toISOString(),
      facts: ["First commit: \u201C" + (first.msg || "").slice(0, 90) + "\u201D",
              "Made by " + first.author + " on " + first.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })],
    });
    var med = median(months.map(function (m) { return m.commits; }));
    var bursts = months.filter(function (m) { return m.commits >= Math.max(2.5 * med, 10); });
    if (bursts.length && months.length >= 3) {
      var best = bursts.slice().sort(function (a, b) { return b.commits - a.commits; })[0];
      chapters.push({
        kind: "sprint", title: "The Sprint", subtitle: "when the project swallowed the calendar",
        start: bursts[0].key + "-01", end: bursts[bursts.length - 1].key + "-01",
        facts: [bursts.reduce(function (a, m) { return a + m.commits; }, 0).toLocaleString("en-US") + " commits across " + bursts.length + " peak month" + (bursts.length > 1 ? "s" : ""),
                "Best month: " + best.label + " — " + best.commits + " commits",
                "Peak day: " + best.peak_day + " with " + best.peak_day_commits + " commits",
                "\u201C" + best.msg + "\u201D"],
      });
    }
    /* silence */
    var gap = null;
    for (var i = 1; i < months.length; i++) {
      var a = new Date(months[i - 1].key + "-01T00:00:00Z"), b = new Date(months[i].key + "-01T00:00:00Z");
      var gd = Math.round((b - a) / 86400000) - 30;
      if (gd >= 21 && (!gap || gd > gap.days)) gap = { days: gd, after: months[i], key: months[i - 1].key };
    }
    if (gap) {
      chapters.push({
        kind: "silence", title: "The Silence", subtitle: gap.days + " days of nothing",
        start: gap.key + "-28", end: gap.after.key + "-01",
        facts: ["No commits for " + gap.days + " days",
                "Then " + gap.after.label + " brought " + gap.after.commits + " commits",
                "\u201C" + gap.after.msg + "\u201D — the commit that ended it"],
      });
    }
    if (releases.length) {
      chapters.push({
        kind: "launch", title: "The Launch", subtitle: "moments shipped to the world",
        start: releases[0].published_at || "", end: releases[0].published_at || "",
        facts: [releases.length + " public release" + (releases.length > 1 ? "s" : "") + " on GitHub",
                "Latest: " + releases[0].name_or_tag + " — " + new Date(releases[0].published_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })],
      });
    }
    if (months.length >= 4) {
      var recent = months.slice(-3);
      var rc = recent.reduce(function (a, m) { return a + m.commits; }, 0);
      chapters.push({
        kind: "evolution", title: "The Evolution", subtitle: "where the story stands now",
        start: recent[0].key + "-01", end: months[months.length - 1].key + "-01",
        facts: ["Last " + recent.length + " active months: " + rc + " commits",
                (rc / recent.length >= 1.5 * (list.length / months.length)) ? "Velocity is climbing — this project is accelerating" : "Cruising at roughly its lifetime pace"],
      });
    }
    chapters.sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    return chapters.slice(0, 8);
  }

  function fingerprint(lead, list, totals, tags, months, releases, n) {
    if (!lead) return { author: "unknown", commits: 0, pct: 0, active_since: "", archetype: { id: "steady", label: "The Steady Hand", icon: "🧭", tagline: "" }, runners: [], traits: [], hours: new Array(24).fill(0), footnote: "" };
    var mine = list.filter(function (c) { return c.author === lead.name; });
    var hours = new Array(24).fill(0), weekend = 0, night = 0, fixes = 0;
    var daySet = {};
    mine.forEach(function (c) {
      hours[c.date.getHours()]++;
      var wd = c.date.getDay(); if (wd === 0 || wd === 6) weekend++;
      var h = c.date.getHours(); if (h >= 22 || h < 5) night++;
      if (/^(fix|fixup|hotfix|patch|bugfix)/i.test(c.msg)) fixes++;
      daySet[c.date.toISOString().slice(0, 10)] = 1;
    });
    var pctNight = Math.round(100 * night / Math.max(mine.length, 1));
    var pctWeekend = Math.round(100 * weekend / Math.max(mine.length, 1));
    var morning = hours.slice(5, 12).reduce(function (a, b) { return a + b; }, 0) / Math.max(mine.length, 1);
    var peakHour = hours.indexOf(Math.max.apply(null, hours));
    var counts = months.map(function (m) { return m.commits; });
    var burst = median(counts) ? Math.max.apply(null, counts) / median(counts) : 1;
    var dayKeys = Object.keys(daySet).sort();
    var streak = 1, run = 1;
    for (var i = 1; i < dayKeys.length; i++) {
      if ((new Date(dayKeys[i]) - new Date(dayKeys[i - 1])) / 86400000 === 1) { run++; streak = Math.max(streak, run); } else run = 1;
    }

    var arcs = [
      ["night", "The Night Builder", "🌙", "Most of this repository was written while the world slept.", pctNight >= 30, pctNight],
      ["early", "The Early Riser", "🌅", "Fresh commits in the morning — this is a discipline, not a hobby.", morning >= 0.45, Math.round(100 * morning)],
      ["weekend", "The Weekend Hacker", "🛠️", "The week is for meetings. The weekend is for shipping.", pctWeekend >= 30, pctWeekend],
      ["sprinter", "The Sprinter", "⚡", "Long quiet, then an avalanche. Inspiration-driven velocity.", burst >= 4, Math.round(burst * 10) / 10],
      ["marathoner", "The Marathoner", "🏃", "Showing up consistently beats showing up intensely.", streak >= 10 && mine.length >= 40, streak],
      ["shipper", "The Shipper", "🚀", "Tags, releases, versions — this work gets finished and sent out.", releases.length >= 2, releases.length],
      ["lone", "The Lone Wolf", "🐺", "One name on every commit. A one-person project, fully owned.", totals.contributors === 1 && n >= 25, n],
    ].filter(function (a) { return a[4]; }).sort(function (a, b) { return b[5] - a[5]; });

    var primary = arcs[0] || ["steady", "The Steady Hand", "🧭", "No wild spikes, no ghost towns — even, dependable rhythm."];
    function hourLabel(h) { if (h < 5) return "night"; if (h < 12) return "morning"; if (h < 18) return "afternoon"; if (h < 22) return "evening"; return "night"; }
    return {
      author: lead.name,
      commits: mine.length,
      pct: Math.round(1000 * mine.length / Math.max(n, 1)) / 10,
      active_since: "",
      archetype: { id: primary[0], label: primary[1], icon: primary[2], tagline: primary[3] },
      runners: arcs.slice(1, 3).map(function (a) { return a[1]; }),
      traits: [
        pctNight >= 15 ? pctNight + "% of commits landed between 10pm and 5am" : null,
        "Peak coding hour: " + (peakHour < 10 ? "0" : "") + peakHour + ":00 — a " + hourLabel(peakHour) + " builder",
        pctWeekend >= 20 ? "Weekend share: " + pctWeekend + "%" : null,
        streak >= 3 ? "Longest streak: " + streak + " active days in a row" : null,
        fixes >= 5 ? fixes + " fix-commits and counting" : null,
      ].filter(Boolean).slice(0, 4),
      hours: hours,
      footnote: "A fingerprint of Git behavior — not a personality test.",
    };
  }

  function milestones(list, releases, tags, dayCounts) {
    var ms = [{
      kind: "first", title: "First commit", sub: "\u201C" + (list[0].msg || "").slice(0, 80) + "\u201D",
      date: list[0].date.toISOString(), who: list[0].author,
    }];
    var keys = Object.keys(dayCounts);
    var bestKey = keys.sort(function (a, b) { return dayCounts[b] - dayCounts[a]; })[0];
    if (bestKey) ms.push({ kind: "burst", title: "Biggest day — " + dayCounts[bestKey] + " commits", sub: new Date(bestKey + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }), date: bestKey, who: "" });
    ms.push({ kind: "latest", title: "Latest commit", sub: "\u201C" + (list[list.length - 1].msg || "").slice(0, 80) + "\u201D", date: list[list.length - 1].date.toISOString(), who: list[list.length - 1].author });
    ms.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    return ms;
  }

  function findMoment(list, dayCounts, releases) {
    var keys = Object.keys(dayCounts);
    var bestKey = keys.sort(function (a, b) { return dayCounts[b] - dayCounts[a]; })[0];
    var avg = list.length / Math.max(keys.length, 1);
    var cands = [{
      score: dayCounts[bestKey] / Math.max(avg, 0.5),
      title: dayCounts[bestKey] + " commits in a single day",
      sub: new Date(bestKey + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) + " — the most intense day this project ever had.",
      date: bestKey, kind: "burst",
    }];
    if (releases.length) {
      cands.push({ score: 1.4, title: "Release " + releases[0].name_or_tag, sub: "Shipped " + new Date(releases[0].published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + " — " + releases.length + " releases and counting.", date: releases[0].published_at, kind: "release" });
    }
    cands.sort(function (a, b) { return b.score - a.score; });
    return cands[0];
  }

  function glowupWeb(list, first, last) {
    var cutoffA = new Date(first.date).getTime() + 30 * 86400000;
    var cutoffB = new Date(last.date).getTime() - 30 * 86400000;
    var earlyN = list.filter(function (c) { return c.date.getTime() <= cutoffA; }).length;
    var lateN = list.filter(function (c) { return c.date.getTime() >= cutoffB; }).length;
    return {
      then: {
        date: first.date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        commits: earlyN, lines: null, files: null, langs: null,
        msg: (first.msg || "").slice(0, 80),
      },
      now: {
        date: last.date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        commits: lateN, lines: null, files: null, langs: null,
        msg: (last.msg || "").slice(0, 80), top_lang: null,
      },
    };
  }

  function roastWeb(list, months, contributorList) {
    var n = list.length, roast = [];
    var vague = {};
    list.forEach(function (c) {
      var s = (c.msg || "").trim().toLowerCase().replace(/[.!]+$/, "");
      if (["fix", "fixed", "update", "updated", "changes", "wip", "stuff", "test", "asdf", "misc", "final", "final fix", "please work", "why", "idk", "hmm", "oops"].indexOf(s) >= 0) vague[s] = (vague[s] || 0) + 1;
    });
    var vk = Object.keys(vague).sort(function (a, b) { return vague[b] - vague[a]; })[0];
    if (vk && vague[vk] >= 2) roast.push({ line: vague[vk] + " commits just named \u201C" + vk + "\u201D. Bold naming choices.", evidence: vague[vk] + "× \u201C" + vk + "\u201D" });
    var avgLen = list.reduce(function (a, c) { return a + (c.msg || "").length; }, 0) / n;
    if (avgLen < 16) roast.push({ line: "Average commit message: " + Math.round(avgLen) + " characters. Mysterious.", evidence: "avg " + Math.round(avgLen) + " chars/message" });
    var gap = longestMonthGap(months);
    if (gap >= 45) {
      var after = null;
      for (var i = 1; i < months.length; i++) {
        var a = new Date(months[i - 1].key + "-01T00:00:00Z"), b = new Date(months[i].key + "-01T00:00:00Z");
        if (Math.round((b - a) / 86400000) - 30 === gap) after = months[i];
      }
      if (after) roast.push({ line: "Disappeared for " + gap + " days, came back with " + after.commits + " commits in a month. Guilt is a sprint tool.", evidence: gap + "-day gap" });
    }
    var owl = list.filter(function (c) { var h = c.date.getHours(); return h >= 2 && h < 5; }).length;
    if (owl >= 8) roast.push({ line: owl + " commits between 2 and 5 AM. Sleep is apparently a suggestion.", evidence: owl + " commits at 2–5 AM" });
    if (contributorList.length === 1 && n >= 20) roast.push({ line: "All " + n + " commits are one person. It's you, your keyboard, and the void.", evidence: "single contributor" });
    if (!roast.length) roast.push({ line: "Honestly? This history is suspiciously disciplined. No notes. Respect.", evidence: "clean record" });
    return roast.slice(0, 4);
  }

  /* ── UI flow ─────────────────────────────────────────────────── */

  var form = $("try-form"), input = $("repo-input"), goBtn = $("go-btn"),
      errBox = $("lp-error"), loading = $("lp-loading");

  function showError(title, hint) {
    errBox.style.display = "block";
    errBox.innerHTML = "<b>" + title + "</b>" + (hint ? "<small>" + hint + "</small>" : "");
  }
  function hideError() { errBox.style.display = "none"; }

  function setLoading(step, state) {
    var li = loading.querySelector('[data-step="' + step + '"]');
    if (!li) return;
    li.classList.remove("on", "done");
    if (state) li.classList.add(state);
  }
  function loadingVisible(v) { loading.style.display = v ? "block" : "none"; }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    hideError();
    var target = parseRepo(input.value);
    if (!target) {
      showError("That doesn't look like a GitHub repository.",
        "Try a full URL like https://github.com/owner/repo — or owner/repo.");
      input.focus();
      return;
    }
    run(target);
  });

  var currentData = null;

  function run(target) {
    goBtn.disabled = true;
    goBtn.textContent = "Analyzing…";
    loadingVisible(true);
    ["repo", "commits", "analysis", "render"].forEach(function (s) { setLoading(s, null); });

    var meta, commits, tags = [], releases = [];

    setLoading("repo", "on");
    api(API + "/repos/" + target.owner + "/" + target.repo)
      .catch(function (err) {
        if (err instanceof ApiError && err.kind === "not_found")
          throw new UserError("Repository not found — or it's private.",
            "Private repositories need the local CLI: ./run.sh /path/to/repo (still 100% offline).");
        throw wrapNet(err);
      })
      .then(function (m) {
        meta = m;
        setLoading("repo", "done");
        setLoading("commits", "on");
        return fetchCommits(target, function (got, total, page) {
          var li = loading.querySelector('[data-step="commits"]');
          if (li) li.lastChild.textContent = " Fetching commit history… " + total.toLocaleString("en-US") + " so far (page " + page + ")";
        }).then(function (c) {
          commits = c;
          var li = loading.querySelector('[data-step="commits"]');
          if (li) li.lastChild.textContent = " Fetching commit history…";
        });
      })
      .catch(function (err) {
        if (err instanceof ApiError && err.kind === "empty")
          throw new UserError("This repository has no commits yet.", "An empty repository has no story — make the first commit and come back.");
        if (err instanceof ApiError && err.kind === "rate") {
          var reset = err.resp && err.resp.headers && err.resp.headers.get("x-ratelimit-reset");
          var when = reset ? new Date(+reset * 1000).toLocaleTimeString() : "within the hour";
          throw new UserError("GitHub's anonymous API limit was hit (60 requests/hour).",
            "It resets around " + when + ". Meanwhile, the local CLI has no limits at all: ./run.sh /path/to/repo");
        }
        throw wrapNet(err);
      })
      .then(function () {
        setLoading("commits", "done");
        setLoading("analysis", "on");
        return Promise.all([
          api(API + "/repos/" + target.owner + "/" + target.repo + "/tags?per_page=100").catch(function () { return []; }),
          api(API + "/repos/" + target.owner + "/" + target.repo + "/releases?per_page=30").catch(function () { return []; }),
        ]);
      })
      .then(function (both) {
        tags = both[0]; releases = both[1];
        var rel = releases.map(function (r) { return { name_or_tag: r.name || r.tag_name, published_at: r.published_at }; })
          .sort(function (a, b) { return new Date(b.published_at) - new Date(a.published_at); });
        releases = rel;
        setLoading("analysis", "done");
        setLoading("render", "on");
        return new Promise(function (res) { setTimeout(res, REDUCED ? 0 : 250); });
      })
      .then(function () {
        var data = analyzeGithub(target, meta, commits, tags, releases);
        currentData = data;
        try {
          var _t = null;
          try { _t = localStorage.getItem("cc-theme"); } catch (e) {}
          window.CommitCanvas.render($("result-mount"), data, { theme: _t || undefined });
        } catch (err) {
          throw new UserError("Something broke while drawing the story.", String(err && err.message || err));
        }
        setLoading("render", "done");
        $("result-title").textContent = "The story of " + data.repo.name;
        $("result-sec").hidden = false;
        $("result-sec").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
        setTimeout(function () { loadingVisible(false); }, 600);
      })
      .catch(function (err) {
        loadingVisible(false);
        if (err instanceof UserError) showError(err.message, err.hint);
        else showError("Couldn't analyze that repository.", String(err && err.message || err) + " — check the URL, or use the local CLI for private repos.");
      })
      .then(function () {
        goBtn.disabled = false;
        goBtn.textContent = "Analyze →";
      });
  }

  function UserError(message, hint) { this.name = "UserError"; this.message = message; this.hint = hint; }
  UserError.prototype = Object.create(Error.prototype);
  function wrapNet(err) {
    if (err instanceof TypeError) return new UserError("Network request failed.", "You may be offline, or the API is unreachable. The CLI version works fully offline: ./run.sh /path/to/repo");
    return err;
  }

  /* ── download story.html (same shell the CLI uses) ───────────── */

  $("download-story").addEventListener("click", function () {
    if (!currentData) return;
    var btn = this;
    btn.disabled = true;
    fetch("canvas.html").then(function (r) {
      if (!r.ok) throw new Error("shell fetch failed");
      return r.text();
    }).then(function (shell) {
      var json = JSON.stringify(currentData)
        .replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
      var html = shell.replace("/*__CC_DATA__*/null", "window.__CC_DATA__ = " + json + ";", 1);
      var blob = new Blob([html], { type: "text/html" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = currentData.repo.name.replace(/[^\w.-]+/g, "_") + "-story.html";
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    }).catch(function () {
      showError("Couldn't fetch the story shell for download.",
        "This works on the live site. Locally, use the CLI instead: ./run.sh /path/to/repo");
    }).then(function () { btn.disabled = false; });
  });

  $("new-analysis").addEventListener("click", function () {
    $("result-sec").hidden = true;
    input.value = "";
    input.focus();
    window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
  });

  /* exposed for testing */
  window.CommitCanvasWeb = { analyzeGithub: analyzeGithub, parseRepo: parseRepo };
})();
