#!/usr/bin/env python3
"""
Commit Canvas — Build Tool
Assembles the two shipped, fully self-contained HTML files:

  canvas.html  — the story shell (the CLI injects data into this exact file;
                 the web flow fetches it to build downloads)
  index.html   — the landing page (inlines the same renderer + a real
                 embedded demo story from web/demo-data/flask.json)

Usage:
    python tools/build.py           # rebuild outputs
    python tools/build.py --check   # verify committed outputs are fresh

Source of truth lives in web/. Never edit canvas.html / index.html by hand.
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "web")


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


def build_canvas():
    shell = read(WEB, "shell.html")
    css = read(WEB, "story.css")
    js = read(WEB, "app.js")
    html = inject(shell, "/*__STORY_CSS__*/", css)
    html = inject(html, "/*__APP_JS__*/", js)
    html = html.replace("__REPO_NAME__", "a repository")
    return html


def build_landing():
    tpl = read(WEB, "landing.html")
    lcss = read(WEB, "landing.css")
    scss = read(WEB, "story.css")
    ajs = read(WEB, "app.js")
    ljs = read(WEB, "landing.js")
    html = inject(tpl, "/*__LANDING_CSS__*/", lcss)
    html = inject(html, "/*__STORY_CSS__*/", scss)
    html = inject(html, "/*__APP_JS__*/", ajs)
    html = inject(html, "/*__LANDING_JS__*/", ljs)

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


def main():
    check = "--check" in sys.argv
    canvas = build_canvas()
    outputs = {
        "canvas.html": canvas,                           # served copy (website / web flow)
        os.path.join("cc", "canvas.html"): canvas,       # packaged copy (pip installs)
        "index.html": build_landing(),
    }
    stale = []
    for name, content in outputs.items():
        path = os.path.join(ROOT, name)
        if check:
            with open(path, "r", encoding="utf-8") as f:
                if f.read() != content:
                    stale.append(name)
        else:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"  built {name} ({len(content):,} bytes)")
    if check:
        if stale:
            print("  STALE (rebuild with `python tools/build.py`): " + ", ".join(stale))
            sys.exit(1)
        print("  outputs fresh ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
