/* Commit Canvas — shared site behavior: nav, reveals, active link. */
(function () {
  "use strict";
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* mobile nav */
  var burger = document.querySelector(".nav-burger");
  var links = document.querySelector(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.innerHTML = open
        ? '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        : '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    });
  }

  /* active nav link */
  var path = location.pathname.replace(/\/index\.html$/, "/");
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    var href = a.getAttribute("href") || "";
    var target = href.replace(/(\.\.\/)+/, "/");
    if (target !== "/" && target.length > 1 && path.indexOf(target.replace(/\/$/, "")) === 0) {
      a.setAttribute("aria-current", "page");
    } else if (target === "/" && (path === "/" || path === "")) {
      a.setAttribute("aria-current", "page");
    }
  });

  /* reveals */
  if ("IntersectionObserver" in window && !REDUCED) {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll(".rv").forEach(function (n) { obs.observe(n); });
  } else {
    document.querySelectorAll(".rv").forEach(function (n) { n.classList.add("in"); });
  }

  /* article TOC (if present) */
  var prose = document.querySelector("article.prose");
  var tocList = document.getElementById("toc-list");
  if (prose && tocList) {
    var hs = prose.querySelectorAll("h2[id]");
    hs.forEach(function (h) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      tocList.appendChild(li);
    });
    var wrap = document.getElementById("art-toc");
    if (wrap && !hs.length) wrap.style.display = "none";
  }

  /* footer year */
  document.querySelectorAll("[data-year]").forEach(function (n) {
    n.textContent = new Date().getFullYear();
  });
})();
