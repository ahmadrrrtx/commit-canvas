"""
Commit Canvas — Story Assembler
Injects the analyzed JSON model into the self-contained `canvas.html`
shell. The shell renders everything client-side (SVG charts, time
machine, fingerprint, share cards) with zero network requests.

No third-party dependencies: pure stdlib.
"""

import json
import os
import re

_HERE = os.path.dirname(os.path.abspath(__file__))
SHELL_FILENAME = "canvas.html"

# The shell is committed at the repo root so the landing page can fetch
# it in-browser too (one renderer, many entry points).
SHELL_CANDIDATES = [
    os.path.join(_HERE, "canvas.html"),
    os.path.join(os.path.dirname(_HERE), "canvas.html"),
    os.path.join(os.path.dirname(_HERE), "web", "shell.html"),
]

PLACEHOLDER = "/*__CC_DATA__*/null"


def load_shell() -> str:
    for path in SHELL_CANDIDATES:
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
    raise FileNotFoundError(
        "canvas.html shell not found — run `python tools/build.py` to build it."
    )


def safe_json_payload(data: dict) -> str:
    """JSON that is safe to embed inside a <script> tag."""
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    # break any sequence that could close the script tag early
    raw = raw.replace("<", "\\u003c").replace(">", "\\u003e")
    raw = raw.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    return raw


def render_story(data: dict, output_path: str, shell: str = None) -> str:
    shell = shell if shell is not None else load_shell()
    if PLACEHOLDER not in shell:
        raise RuntimeError(
            "Shell is missing its data placeholder — rebuild canvas.html "
            "with `python tools/build.py`."
        )
    payload = "window.__CC_DATA__ = " + safe_json_payload(data) + ";"
    html = shell.replace(PLACEHOLDER, payload, 1)

    # personalize <title> + meta so the artifact is shareable as-is
    name = str(data.get("repo", {}).get("name", "a repository"))
    esc_name = (name.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace('"', "&quot;"))
    shape = str(data.get("shape", {}).get("label", ""))
    html = html.replace(
        "<title>The story of a repository</title>",
        f"<title>The story of {esc_name}</title>", 1)
    html = html.replace(
        'content="a repository — a cinematic story generated from real git history. '
        'Chapters, a time machine, and a developer fingerprint. Made with Commit Canvas."',
        f'content="{esc_name} — {shape}. A cinematic story generated from real git history. '
        f'Made with Commit Canvas."', 1)
    html = html.replace('property="og:title" content="The story of a repository"',
                        f'property="og:title" content="The story of {esc_name}"', 1)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)
    return output_path
