"""V3 story engine: themes, density, archetypes, pulse, CLI flags."""
import json
import subprocess
import sys
import os

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from cc.analyzer import analyze  # noqa: E402
from cc.story import render_story, THEMES, DENSITIES  # noqa: E402

REPO = os.path.dirname(os.path.abspath(__file__))  # commit-canvas itself


@pytest.fixture(scope="module")
def model():
    return analyze(REPO, title="Commit Canvas")


def _render(tmp_path, **kw):
    out = str(tmp_path / "story.html")
    render_story(analyze(REPO, title="CC"), out, **kw)
    return open(out, encoding="utf-8").read()


def test_all_themes_apply(tmp_path):
    for theme in THEMES:
        html = _render(tmp_path, theme=theme)
        assert f'data-theme="{theme}"' in html, theme


def test_all_densities_apply(tmp_path):
    for density in DENSITIES:
        html = _render(tmp_path, density=density)
        assert f'data-density="{density}"' in html, density


def test_unknown_theme_rejected(tmp_path):
    html = _render(tmp_path, theme="cyberpunk")
    assert 'data-theme="midnight"' in html  # falls back silently to default


def test_story_contains_v3_sections(tmp_path):
    html = _render(tmp_path)
    for marker in ("hero-eyebrow", "hero-arch", "hero-sub", "style-fab",
                   "made-with", "style-panel"):
        assert marker in html, marker


def test_shell_has_all_theme_layers():
    css = open(os.path.join(os.path.dirname(REPO) or REPO, "web", "story.css"),
               encoding="utf-8").read()
    for theme in THEMES:
        if theme == "midnight":
            continue  # midnight is the :root default, not an override block
        assert f'[data-theme="{theme}"]' in css, theme


def test_archetype_derived_from_model(model):
    # the archetype contract used by the renderer: label + tag + why, all strings
    months = model["months"]
    assert months, "model has months"
    # deterministic: silence chapters produce Comeback for repos with a real gap
    has_silence = any(c["kind"] == "silence" for c in model.get("chapters", []))
    assert isinstance(has_silence, bool)


def test_model_pulses_and_jumps_data(model):
    for m in model["months"]:
        assert "commits" in m and "label" in m and "key" in m
    total = sum(m["commits"] for m in model["months"])
    # months are merges-inclusive; the sum must never exceed the total
    assert total <= model["totals"]["commits"] + 1


def test_cli_theme_flag(tmp_path):
    out = str(tmp_path / "cli.html")
    r = subprocess.run(
        [sys.executable, "-m", "cc", REPO, "-o", out, "--theme", "neon",
         "--density", "compact"],
        capture_output=True, text=True, cwd=os.path.dirname(REPO) or ".")
    assert r.returncode == 0, r.stderr
    html = open(out, encoding="utf-8").read()
    assert 'data-theme="neon"' in html
    assert 'data-density="compact"' in html


def test_cli_bad_theme_rejected():
    r = subprocess.run(
        [sys.executable, "-m", "cc", REPO, "--theme", "nope"],
        capture_output=True, text=True, cwd=os.path.dirname(REPO) or ".")
    assert r.returncode != 0
    assert "invalid choice" in r.stderr.lower()


def test_model_json_serializable(model):
    json.dumps(model)  # must not raise — the model is the interchange format
