#!/usr/bin/env python3
"""
Commit Canvas — Build Tool
Assembles every generated artifact in the repository:

  canvas.html            — story shell (CLI injects data; web flow fetches it)
  cc/canvas.html         — packaged copy for pip installs
  index.html             — landing page (inlines renderer + real embedded demo)
  <route>/index.html     — site pages (features, journal, creator, …)
  journal/<slug>/        — article pages
  404.html               — custom not-found page
  sitemap.xml, robots.txt

Usage:
    python tools/build.py            # rebuild outputs
    python tools/build.py --check    # verify committed outputs are fresh (CI)
    python tools/build.py --assets   # regenerate OG images (needs Pillow)

Sources live in web/. Never edit generated files by hand.
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "web")
BASE = "https://ahmadrrrtx.github.io/commit-canvas/"
VERSION = "2.1.0"


def read(*parts):
    with open(os.path.join(*parts), "r", encoding="utf-8") as f:
        return f.read()


def inject(html, marker, content):
    if marker not in html:
        raise RuntimeError(f"marker {marker} missing from template")
    return html.replace(marker, content, 1)


def safe_payload(obj):
    raw = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return raw.replace("<", "\\u003c").replace(">", "\\u003e")


# ─── shared chrome ──────────────────────────────────────────────────────────

BRAND_SVG = (
    '<svg viewBox="0 0 26 26" fill="none" aria-hidden="true" style="width:24px;height:24px;display:block">'
    '<rect x="1" y="1" width="24" height="24" rx="6" stroke="#2E3344" stroke-width="1.5"/>'
    '<path d="M6 19h6M9 19v-6h6V7" stroke="#2E3344" stroke-width="1.8" stroke-linecap="round"/>'
    '<circle cx="6" cy="19" r="2.4" fill="#E2FF3A"/>'
    '<circle cx="12" cy="19" r="2" fill="#687089"/>'
    '<circle cx="15" cy="13" r="2" fill="#687089"/>'
    '<circle cx="21" cy="7" r="2.4" fill="#E2FF3A"/></svg>'
)


def nav_html(p):
    gh = "https://github.com/ahmadrrrtx/commit-canvas"
    return f'''<header class="nav">
  <div class="nav-in">
    <a class="brand" href="{p}/">{BRAND_SVG}<span>commit canvas</span></a>
    <button class="nav-burger" type="button" aria-expanded="false" aria-label="Toggle navigation">
      <svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
    <nav class="nav-links" aria-label="Main">
      <a href="{p}/features/">Features</a>
      <a href="{p}/how-it-works/">How it works</a>
      <a href="{p}/journal/">Journal</a>
      <a href="{p}/creator/">Creator</a>
      <a href="{gh}" target="_blank" rel="noopener">GitHub</a>
      <a class="nav-cta" href="{p}/#try">Create yours</a>
    </nav>
  </div>
</header>'''


def footer_html(p):
    gh = "https://github.com/ahmadrrrtx/commit-canvas"

    def li(label, href):
        ext = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
        return f'<li><a href="{href}"{ext}>{label}</a></li>'

    cols = [
        ("Product", [
            ("Create a story", f"{p}/#try"),
            ("Time machine", f"{p}/features/#time-machine"),
            ("Examples", f"{p}/examples/"),
            ("Exports", f"{p}/features/#exports"),
            ("Changelog", f"{p}/changelog/"),
        ]),
        ("Explore", [
            ("How it works", f"{p}/how-it-works/"),
            ("Journal", f"{p}/journal/"),
            ("Creator", f"{p}/creator/"),
            ("Privacy", f"{p}/privacy/"),
            ("Terms", f"{p}/terms/"),
        ]),
        ("Developers", [
            ("GitHub", gh),
            ("CLI usage", f"{p}/how-it-works/#cli"),
            ("Contributing", gh + "/blob/main/CONTRIBUTING.md"),
            ("Build & tests", gh + "#build--development"),
            ("Report an issue", gh + "/issues"),
        ]),
        ("Connect", [
            ("GitHub", "https://github.com/ahmadrrrtx"),
            ("LinkedIn", "https://www.linkedin.com/in/ahmadrrrtx"),
            ("Medium", "https://medium.com/@ahmadrrrtx333"),
            ("Hashnode", "https://hashnode.com/@ahmadrrrtx"),
            ("DEV", "https://dev.to/ahmad_rrrtx"),
            ("Indie Hackers", "https://www.indiehackers.com/ahmad_rrrtx"),
            ("daily.dev", "https://daily.dev/ahmadrrtx"),
        ]),
    ]
    col_html = ""
    for title, links in cols:
        items = "".join(li(label, href) for label, href in links)
        col_html += ('<div class="foot-col"><b>' + title +
                     '</b><ul style="list-style:none;margin:0;padding:0">' + items + "</ul></div>")
    return f'''<footer class="foot">
  <div class="foot-grid">
    <div class="foot-brand">
      <a class="brand" href="{p}/" style="text-decoration:none">{BRAND_SVG}<span>commit canvas</span></a>
      <p>Your code has a story. Free, open source (MIT), and private by architecture — no cloud, no accounts, zero requests in the output.</p>
    </div>
    {col_html}
  </div>
  <div class="foot-base">
    <span>© <span data-year="">2026</span> Muhammad Ahmad · MIT · v{VERSION}</span>
    <span>made with git · <a href="{gh}">ahmadrrrtx/commit-canvas</a></span>
  </div>
</footer>'''


def head_html(meta, p):
    canonical = BASE + meta["path"]
    og_image = BASE + meta.get("og_image", "assets/og-preview.png")
    og_type = "article" if meta.get("article") else "website"
    return f'''<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{meta['title']}</title>
<meta name="description" content="{meta['description']}">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{meta['title']}">
<meta property="og:description" content="{meta['description']}">
<meta property="og:type" content="{og_type}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{og_image}">
<meta property="og:site_name" content="Commit Canvas">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{meta['title']}">
<meta name="twitter:description" content="{meta['description']}">
<meta name="twitter:image" content="{og_image}">
<link rel="icon" type="image/svg+xml" href="{p}/favicon.svg">'''


def page_html(meta, body, p, extra_head=""):
    site_css = read(WEB, "site.css")
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
{head_html(meta, p)}
{extra_head}
<style>
{site_css}
</style>
</head>
<body class="site">
{nav_html(p)}
<main>
{body}
</main>
{footer_html(p)}
<script>
{read(WEB, "site.js")}
</script>
</body>
</html>'''


# ─── article registry ───────────────────────────────────────────────────────

ARTICLES = [
    {
        "slug": "your-git-history-is-a-story",
        "title": "Your git history is a story — you just can't see it yet",
        "description": "Every repository quietly records a narrative: beginnings, sprints, silences and comebacks. The problem was never the data — it's that nobody renders it.",
        "date": "2026-09-01",
        "kind": "Essay",
        "standfirst": "Why contribution graphs flatten exactly the interesting parts of your repository's history.",
    },
    {
        "slug": "what-your-commit-timestamps-say-about-how-you-build",
        "title": "What your commit timestamps say about how you build",
        "description": "Favorite hour, weekend share, streaks and burst ratios — what commit metadata honestly measures, and where its limits are.",
        "date": "2026-09-01",
        "kind": "Essay",
        "standfirst": "Hours, streaks, bursts — and the difference between behavior and personality.",
    },
    {
        "slug": "how-to-read-the-evolution-of-a-codebase",
        "title": "How to read the evolution of a codebase",
        "description": "A practical checklist for reading repository history — with real findings from Flask and Requests.",
        "date": "2026-09-01",
        "kind": "Guide",
        "standfirst": "A practical checklist, with real findings from Flask and Requests.",
    },
    {
        "slug": "building-commit-canvas-from-git-log-to-story",
        "title": "Building Commit Canvas: from git log to story",
        "description": "The idea was simple. The audit was not. Inside the bugs v1 was hiding and the rebuild that fixed them.",
        "date": "2026-09-01",
        "kind": "Build log",
        "standfirst": "The audit that found my own bugs, and the rebuild that fixed them.",
    },
]


def reading_time(html):
    text = re.sub(r"<[^>]+>", " ", html)
    words = len(text.split())
    return max(2, round(words / 200))


def article_jsonld(a, url):
    return json.dumps({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": a["title"],
        "description": a["description"],
        "datePublished": a["date"],
        "author": {"@type": "Person", "name": "Muhammad Ahmad",
                   "url": BASE + "creator/"},
        "mainEntityOfPage": url,
        "image": BASE + f"assets/og/{a['slug']}.png",
        "publisher": {"@type": "Organization", "name": "Commit Canvas", "url": BASE},
    }, ensure_ascii=False)


# ─── site pages ─────────────────────────────────────────────────────────────

def build_site_pages():
    outputs = {}

    simple = [
        ("features", "features.html", "Features — Commit Canvas",
         "Story engine, repository time machine, developer fingerprint, roast mode and a full export studio — every feature grounded in real git data."),
        ("how-it-works", "how-it-works.html", "How it works — Commit Canvas",
         "One careful pass over real git history, a deterministic analysis engine, and a self-contained interactive story. No cloud, no accounts."),
        ("examples", "examples.html", "Examples — Commit Canvas",
         "Real Commit Canvas stories generated from real repositories — including Flask's 16-year, 5,600-commit history."),
        ("creator", "creator.html", "The person behind the canvas — Commit Canvas",
         "Muhammad Ahmad — developer and creator of Commit Canvas. The idea, the build, and what I care about."),
        ("changelog", "changelog.html", "Changelog — Commit Canvas",
         "Commit Canvas has a story too — product evolution from v1.0 through the v2.0 rebuild to the v2.1 export studio."),
        ("privacy", "privacy.html", "Privacy — Commit Canvas",
         "No server, no database, no accounts. The CLI works fully offline; the web version talks only to GitHub's public API. Verify in the source."),
        ("terms", "terms.html", "Terms — Commit Canvas",
         "MIT-licensed open source. Simple, honest terms for a simple tool."),
    ]
    for route, fname, title, desc in simple:
        body = read(WEB, "pages", fname).replace("{{ROOT}}", "../")
        meta = {"path": f"{route}/", "title": title, "description": desc}
        outputs[os.path.join(route, "index.html")] = page_html(meta, body, "..")

    cards = ""
    for a in ARTICLES:
        rt = reading_time(read(WEB, "journal", a["slug"] + ".html"))
        cards += ('<a class="j-card rv" href="../journal/' + a["slug"] + '/">\n'
                  '  <span class="j-meta"><span>' + a["kind"] + '</span><span>' + a["date"] +
                  '</span><span>' + str(rt) + ' min</span></span>\n'
                  '  <h2 class="card-h">' + a["title"] + '</h2>\n'
                  '  <p>' + a["standfirst"] + '</p>\n'
                  '  <span class="j-read">Read →</span><span class="j-dot" aria-hidden="true"></span>\n'
                  '</a>')
    jbody = read(WEB, "pages", "journal.html").replace("{{JOURNAL_CARDS}}", cards).replace("{{ROOT}}", "../")
    jmeta = {"path": "journal/", "title": "Journal — Commit Canvas",
             "description": "Essays on code, time and stories: what git history contains, how to read it, and the building of Commit Canvas."}
    outputs[os.path.join("journal", "index.html")] = page_html(jmeta, jbody, "..")

    for a in ARTICLES:
        html = read(WEB, "journal", a["slug"] + ".html")
        rt = reading_time(html)
        url = BASE + "journal/" + a["slug"] + "/"
        html = (html
                .replace("{{DATE}}", a["date"])
                .replace("{{READING_TIME}}", str(rt))
                .replace("{{URL}}", url)
                .replace("{{ROOT}}", "../../"))
        meta = {"path": "journal/" + a["slug"] + "/", "title": a["title"] + " — Commit Canvas",
                "description": a["description"], "og_image": "assets/og/" + a["slug"] + ".png",
                "article": True}
        jsonld = '<script type="application/ld+json">\n' + article_jsonld(a, url) + "\n</script>"
        outputs[os.path.join("journal", a["slug"], "index.html")] = page_html(meta, html, "../..", jsonld)

    nf = read(WEB, "pages", "404.html").replace("{{ROOT}}", "/commit-canvas/")
    meta = {"path": "404.html", "title": "This commit doesn't exist — Commit Canvas",
            "description": "404 — the page you're looking for isn't in this history."}
    outputs["404.html"] = page_html(meta, nf, "/commit-canvas")

    return outputs


# ─── canvas + landing ───────────────────────────────────────────────────────

def build_canvas():
    shell = read(WEB, "shell.html")
    html = inject(shell, "/*__STORY_CSS__*/", read(WEB, "story.css"))
    html = inject(html, "/*__GIF_JS__*/", read(WEB, "gif.js"))
    html = inject(html, "/*__APP_JS__*/", read(WEB, "app.js"))
    return html.replace("__REPO_NAME__", "a repository")


def build_landing():
    tpl = read(WEB, "landing.html")
    html = inject(tpl, "/*__LANDING_CSS__*/", read(WEB, "landing.css"))
    html = inject(html, "/*__SITE_CSS__*/", read(WEB, "site.css"))
    html = inject(html, "/*__STORY_CSS__*/", read(WEB, "story.css"))
    html = inject(html, "/*__GIF_JS__*/", read(WEB, "gif.js"))
    html = inject(html, "/*__APP_JS__*/", read(WEB, "app.js"))
    html = inject(html, "/*__LANDING_JS__*/", read(WEB, "landing.js"))
    html = inject(html, "/*__SITE_JS__*/", read(WEB, "site.js"))
    html = html.replace("<!--__NAV__-->", nav_html("."))
    html = html.replace("<!--__FOOTER__-->", footer_html("."))

    demo_path = os.path.join(WEB, "demo-data", "flask.json")
    if os.path.isfile(demo_path):
        demo = json.loads(read(WEB, "demo-data", "flask.json"))
        demo["meta"]["notes"] = demo["meta"].get("notes", []) + [
            "Embedded live example — regenerate with: python -m cc /path/to/flask --json web/demo-data/flask.json"
        ]
        html = inject(html, "/*__FLASK_DATA__*/null",
                      "window.__CC_DEMO__ = " + safe_payload(demo) + ";")
    else:
        html = inject(html, "/*__FLASK_DATA__*/null", "null;")
    return html


# ─── sitemap + robots ───────────────────────────────────────────────────────

def build_sitemap():
    routes = ["", "features/", "how-it-works/", "examples/", "creator/",
              "journal/", "changelog/", "privacy/", "terms/",
              "demo/flask-story.html"]
    for a in ARTICLES:
        routes.append("journal/" + a["slug"] + "/")
    urls = "".join("  <url><loc>" + BASE + r + "</loc></url>\n" for r in routes)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + urls + "</urlset>\n")


ROBOTS = ("User-agent: *\n"
          "Allow: /\n\n"
          "Sitemap: " + BASE + "sitemap.xml\n")


# ─── OG images (optional, needs Pillow) ─────────────────────────────────────

def build_og_images():
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("  Pillow not installed — skipping OG images (pip install pillow)")
        return
    FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    FM = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
    os.makedirs(os.path.join(ROOT, "assets", "og"), exist_ok=True)
    for a in ARTICLES:
        W, H = 1200, 630
        img = Image.new("RGB", (W, H), (11, 12, 16))
        d = ImageDraw.Draw(img)
        for r in range(500, 0, -4):
            alpha = int(16 * (1 - r / 500))
            d.ellipse([W - 360 - r, -260 - r, W - 360 + r, -260 + r],
                      fill=(11 + alpha, 12 + alpha, 16 + alpha * 3))
        M = 56
        d.rectangle([M, M, W - M, H - M], outline=(46, 51, 68), width=2)
        d.text((M + 40, M + 44), "C O M M I T   C A N V A S   ·   J O U R N A L",
               font=ImageFont.truetype(FM, 20), fill=(107, 112, 137))
        font = ImageFont.truetype(FB, 58)
        words = a["title"].split()
        lines, cur = [], ""
        for w_ in words:
            trial = (cur + " " + w_).strip()
            if d.textlength(trial, font=font) > W - (M + 40) * 2 and cur:
                lines.append(cur)
                cur = w_
            else:
                cur = trial
        lines.append(cur)
        y = M + 150
        for ln in lines[:4]:
            d.text((M + 36, y), ln, font=font, fill=(233, 235, 243))
            y += 76
        d.text((M + 40, H - M - 78), a["kind"] + " · " + a["date"],
               font=ImageFont.truetype(FM, 22), fill=(226, 255, 58))
        d.text((M + 40, H - M - 44), "ahmadrrrtx.github.io/commit-canvas",
               font=ImageFont.truetype(FM, 19), fill=(107, 112, 137))
        path = os.path.join(ROOT, "assets", "og", a["slug"] + ".png")
        img.save(path, optimize=True)
        print("  og image: assets/og/" + a["slug"] + ".png")


# ─── main ───────────────────────────────────────────────────────────────────

def main():
    check = "--check" in sys.argv
    assets = "--assets" in sys.argv

    if assets:
        build_og_images()
        if not check:
            return 0

    canvas = build_canvas()
    outputs = {
        "canvas.html": canvas,
        os.path.join("cc", "canvas.html"): canvas,
        "index.html": build_landing(),
        "sitemap.xml": build_sitemap(),
        "robots.txt": ROBOTS,
    }
    outputs.update(build_site_pages())

    stale = []
    for name, content in outputs.items():
        path = os.path.join(ROOT, name)
        if check:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    if f.read() != content:
                        stale.append(name)
            except FileNotFoundError:
                stale.append(name + " (missing)")
        else:
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print("  built " + name + " (" + f"{len(content):,}" + " bytes)")
    if check:
        if stale:
            print("  STALE (rebuild with `python tools/build.py`): " + ", ".join(stale))
            sys.exit(1)
        print("  outputs fresh ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
