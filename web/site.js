/* Commit Canvas — shared site behavior.
   Nav (glass on scroll, mobile panel), staggered reveals, animated counters,
   article TOC + scrollspy + reading progress, copy buttons, toasts,
   back-to-top, iframe loading overlays. Vanilla, zero deps. */
(function () {
  "use strict";
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ── nav: glass on scroll ─────────────────────────────────────── */
  var nav = $(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", (window.scrollY || 0) > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ── mobile nav panel ─────────────────────────────────────────── */
  var burger = $(".nav-burger");
  var links = $(".nav-links");
  if (burger && links) {
    $$("a", links).forEach(function (a, i) { a.style.setProperty("--ni", i); });
    var closeNav = function () {
      links.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      burger.innerHTML = '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    };
    burger.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !links.classList.contains("open");
      links.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
      burger.innerHTML = open
        ? '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        : '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    });
    document.addEventListener("click", function (e) {
      if (links.classList.contains("open") && !links.contains(e.target) && e.target !== burger) closeNav();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
    $$("a", links).forEach(function (a) { a.addEventListener("click", closeNav); });
  }

  /* ── active nav link ──────────────────────────────────────────── */
  var path = location.pathname.replace(/\/index\.html$/, "/");
  $$(".nav-links a").forEach(function (a) {
    var href = a.getAttribute("href") || "";
    var target = href.replace(/(\.\.\/)+/, "/").split("#")[0];
    if (target !== "/" && target.length > 1 && path.indexOf(target.replace(/\/$/, "")) === 0) {
      a.setAttribute("aria-current", "page");
    } else if (target === "/" && (path === "/" || path === "")) {
      a.setAttribute("aria-current", "page");
    }
  });

  /* ── staggered reveals ────────────────────────────────────────── */
  $$("[data-stagger], .grid-2, .grid-3, .steps, .j-grid, .social-grid, .cl, .faq").forEach(function (wrap) {
    $$(".rv", wrap).forEach(function (n, i) { n.style.setProperty("--rv-i", Math.min(i, 7)); });
  });
  if ("IntersectionObserver" in window && !REDUCED) {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    $$(".rv").forEach(function (n) { obs.observe(n); });
  } else {
    $$(".rv").forEach(function (n) { n.classList.add("in"); });
  }

  /* ── animated counters ([data-count]) ─────────────────────────── */
  function fmt(v) { return Math.round(v).toLocaleString("en-US"); }
  var counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !REDUCED) {
    var cObs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        cObs.unobserve(e.target);
        var el = e.target, end = parseFloat(el.getAttribute("data-count")) || 0, t0 = null;
        var step = function (t) {
          if (t0 === null) t0 = t;
          var p = Math.min((t - t0) / 900, 1), ease = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(end * ease);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (n) { cObs.observe(n); });
  } else {
    counters.forEach(function (n) { n.textContent = fmt(parseFloat(n.getAttribute("data-count")) || 0); });
  }

  /* ── article TOC + scrollspy + reading progress ───────────────── */
  var prose = $("article.prose");
  var tocList = $("#toc-list");
  if (prose && tocList) {
    var hs = $$("h2[id]", prose);
    hs.forEach(function (h) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      tocList.appendChild(li);
    });
    var wrap = $("#art-toc");
    if (wrap && !hs.length) wrap.style.display = "none";
    if (hs.length && "IntersectionObserver" in window) {
      var spy = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          $$("#toc-list a").forEach(function (a) {
            a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id);
          });
        });
      }, { rootMargin: "-18% 0px -70% 0px" });
      hs.forEach(function (h) { spy.observe(h); });
    }
    /* reading progress */
    var bar = document.createElement("div");
    bar.className = "read-progress";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = "<b></b>";
    document.body.appendChild(bar);
    var fill = $("b", bar);
    var prog = function () {
      var r = prose.getBoundingClientRect();
      var total = r.height - window.innerHeight + 120;
      var done = Math.min(Math.max(-r.top + 60, 0), Math.max(total, 1));
      fill.style.width = (done / Math.max(total, 1) * 100).toFixed(1) + "%";
    };
    window.addEventListener("scroll", prog, { passive: true });
    window.addEventListener("resize", prog);
    prog();
  }

  /* ── toast ────────────────────────────────────────────────────── */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "cc-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = '<span class="tick">✓</span> ' + msg;
    requestAnimationFrame(function () { toastEl.classList.add("show"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* ── copy buttons on code blocks ──────────────────────────────── */
  function addCopy(pre) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "copy";
    btn.setAttribute("aria-label", "Copy code to clipboard");
    pre.appendChild(btn);
    btn.addEventListener("click", function () {
      var code = $("code", pre) || pre;
      var text = code.textContent || "";
      var done = function () { toast("Copied to clipboard"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(); });
      } else fallback();
      function fallback() {
        try {
          var ta = document.createElement("textarea");
          ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select();
          document.execCommand("copy"); ta.remove(); done();
        } catch (err) { toast("Copy not available here"); }
      }
    });
  }
  $$(".site .prose pre, .prose pre, .term").forEach(addCopy);

  /* ── iframe loading overlays ──────────────────────────────────── */
  $$("iframe").forEach(function (fr) {
    var w = fr.parentElement;
    if (!w || !w.classList.contains("frame-wrap")) return;
    var hide = function () { w.classList.add("done"); };
    if (fr.dataset.loaded !== undefined) hide();
    fr.addEventListener("load", hide);
    /* safety: never spin forever */
    setTimeout(hide, 9000);
  });

  /* ── back-to-top ──────────────────────────────────────────────── */
  var top = document.createElement("button");
  top.type = "button";
  top.className = "top-btn";
  top.setAttribute("aria-label", "Back to top");
  top.innerHTML = '<svg viewBox="0 0 18 18" fill="none" style="width:15px;height:15px" aria-hidden="true"><path d="M9 15V3.5M4 8l5-4.5L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(top);
  var topVis = function () { top.classList.toggle("show", (window.scrollY || 0) > 620); };
  topVis();
  window.addEventListener("scroll", topVis, { passive: true });
  top.addEventListener("click", function () {
    if (REDUCED || !window.scrollTo) { window.scrollTo(0, 0); return; }
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); }
  });


  /* ── star CTA ─────────────────────────────────────────────────────
     Deliberately no live count: the site promises "no cloud", and a
     page-load fetch would eat the user's anonymous GitHub API quota
     (60/hr) before they can analyze their first repository. Static,
     honest label instead. */

  /* ── footer year ──────────────────────────────────────────────── */
  $$("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
})();
