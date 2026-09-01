"""
Commit Canvas — Test Suite
Engine correctness, edge-case repositories, story assembly, build freshness.
Run with: python -m pytest tests/ -v
"""

import json
import os
import subprocess
import sys
import tempfile
import shutil

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cc.analyzer import analyze, is_git_repo, read_raw_history, streaks  # noqa: E402
from cc.story import render_story, safe_json_payload  # noqa: E402


# ─── helpers ────────────────────────────────────────────────────────────────

def make_repo(path, commits, merges=None, tags=None):
    """commits: list of (date, message, filename, content, author)"""
    commits = list(commits)
    env = {
        **os.environ,
        "GIT_AUTHOR_NAME": "Test Author",
        "GIT_AUTHOR_EMAIL": "test@example.com",
        "GIT_COMMITTER_NAME": "Test Author",
        "GIT_COMMITTER_EMAIL": "test@example.com",
    }
    def git(*args, **kw):
        subprocess.run(["git", "-C", path] + list(args),
                       check=True, capture_output=True, env=kw.get("env", env))
    os.makedirs(path, exist_ok=True)
    git("init", "-q")
    branches = {}
    for i, c in enumerate(commits):
        date, msg, fname, content, *rest = (list(c) + [None, None, None])[:5]
        author = rest[0] or "Test Author"
        e = dict(env)
        e["GIT_AUTHOR_NAME"] = e["GIT_COMMITTER_NAME"] = author
        e["GIT_AUTHOR_EMAIL"] = e["GIT_COMMITTER_EMAIL"] = (
            author.replace(" ", ".").lower() + "@example.com")
        fp = os.path.join(path, fname)
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        with open(fp, "w", encoding="utf-8") as f:
            f.write(content)
        git("add", "-A", env=e)
        git("commit", "-q", "--allow-empty", "-m", msg, "--date", date, env=e)
    if merges:
        for branch, merge_msg, date in merges:
            git("checkout", "-q", "-b", branch)
            fp = os.path.join(path, f"{branch}.txt")
            with open(fp, "w") as f:
                f.write("branch work\n")
            git("add", "-A")
            git("commit", "-q", "-m", f"work on {branch}", "--date", date)
            git("checkout", "-q", "master")  # may be main on newer git
            git("merge", "-q", "--no-ff", "-m", merge_msg, branch,
                env={**env, "GIT_COMMITTER_DATE": date})
    if tags:
        for name, ref in tags:
            git("tag", name, ref)
    return path


@pytest.fixture
def tiny_repo(tmp_path):
    return make_repo(str(tmp_path / "tiny"), [
        ("2024-01-01T10:00:00", "first commit", "a.txt", "hello\n"),
        ("2024-01-02T11:00:00", "add feature", "b.txt", "world\n"),
        ("2024-01-03T09:00:00", "polish", "a.txt", "hello!\n"),
    ])


@pytest.fixture
def story_repo(tmp_path):
    """A repo with a real story: burst, long silence, comeback, release."""
    repo = tmp_path / "story"
    commits = [
        ("2023-01-05T10:00:00", "initial commit", "main.py", "print('hi')\n"),
        ("2023-01-06T10:00:00", "feat: core", "core.py", "x = 1\n" * 20),
        ("2023-01-07T10:00:00", "feat: more", "util.py", "y = 2\n"),
        ("2023-02-02T10:00:00", "feat: build out", "app.py", "z = 3\n" * 30),
        ("2023-02-03T10:00:00", "fix: crash", "app.py", "z = 4\n" * 30),
        ("2023-02-04T23:30:00", "feat: more more", "x.py", "a\n" * 10),
        ("2023-02-05T02:00:00", "feat: sprint day", "y.py", "b\n" * 10),
        # silence: ~5 months
        ("2023-07-20T10:00:00", "feat: the comeback", "new.py", "c\n" * 50),
        ("2023-07-21T10:00:00", "feat: comeback 2", "new2.py", "d\n" * 50),
        ("2023-07-22T10:00:00", "release prep", "ver.py", "v1\n"),
    ]
    make_repo(str(repo), commits)
    subprocess.run(["git", "-C", str(repo), "tag", "v1.0.0", "HEAD"], check=True,
                   capture_output=True)
    return str(repo)


# ─── basics ─────────────────────────────────────────────────────────────────

def test_not_a_repo(tmp_path):
    assert not is_git_repo(str(tmp_path))


def test_empty_repo_raises(tmp_path):
    repo = tmp_path / "empty"
    repo.mkdir()
    subprocess.run(["git", "-C", str(repo), "init", "-q"], check=True,
                   capture_output=True)
    with pytest.raises(ValueError):
        analyze(str(repo))


def test_tiny_repo_basics(tiny_repo):
    d = analyze(tiny_repo)
    assert d["totals"]["commits"] == 3
    assert d["totals"]["contributors"] == 1
    assert d["totals"]["active_days"] == 3
    assert d["months"][0]["files_end"] == 2
    assert d["shape"]["label"] == "Fresh Start"
    assert len(d["chapters"]) >= 1
    assert len(d["roast"]) >= 1
    assert d["meta"]["has_code_size"] is True


def test_pipe_in_commit_message(tmp_path):
    """Regression: v1 split fields on '|' and corrupted/dropped commits."""
    repo = make_repo(str(tmp_path / "pipes"), [
        ("2024-01-01T10:00:00", "fix | broken | thing", "a.txt", "1\n"),
        ("2024-01-02T10:00:00", "normal message", "b.txt", "2\n"),
    ])
    commits = read_raw_history(repo)
    assert len(commits) == 2
    assert commits[0]["subject"] == "fix | broken | thing"


def test_unicode_message_and_file(tmp_path):
    repo = make_repo(str(tmp_path / "uni"), [
        ("2024-01-01T10:00:00", "¡Añadido — módulo ñoño! 🎉", "día/árbol.txt", "hola\n"),
        ("2024-01-02T10:00:00", "обычный коммит", "файл.txt", "привет\n"),
    ])
    commits = read_raw_history(repo)
    assert commits[0]["subject"].startswith("¡Añadido")
    d = analyze(repo)
    assert d["totals"]["commits"] == 2


def test_merges_are_counted_and_kept(tmp_path):
    repo = tmp_path / "merges"
    commits = [
        ("2024-01-01T10:00:00", "base", "a.txt", "1\n"),
        ("2024-01-02T10:00:00", "main work", "b.txt", "2\n"),
        ("2024-01-03T10:00:00", "more main", "c.txt", "3\n"),
    ]
    make_repo(str(repo), commits,
              merges=[("feature", "Merge branch 'feature'", "2024-01-04T10:00:00")])
    d = analyze(str(repo))
    assert d["totals"]["commits"] == 5          # 3 + branch + merge
    assert d["totals"]["merges"] == 1


def test_tags_and_launch_chapter(story_repo):
    d = analyze(story_repo)
    assert d["totals"]["tags"] == 1
    assert any(c["kind"] == "launch" for c in d["chapters"])
    assert any(m["kind"] == "release" for m in d["milestones"])


def test_silence_and_comeback(story_repo):
    d = analyze(story_repo)
    kinds = [c["kind"] for c in d["chapters"]]
    assert "silence" in kinds
    silence = [c for c in d["chapters"] if c["kind"] == "silence"][0]
    assert any("No commits for" in f for f in silence["facts"])
    assert d["shape"]["arc"] == "return"


def test_file_deletion_tracking(tmp_path):
    repo = tmp_path / "dels"
    commits = [
        ("2024-01-01T10:00:00", "add two files", "keep.txt", "k\n", "A"),
        ("2024-01-01T10:05:00", "add temp", "tmp.txt", "t\n" * 10, "A"),
        ("2024-02-01T10:00:00", "remove temp", "keep.txt", "k\n", "A"),
    ]
    make_repo(str(repo), commits)
    subprocess.run(["git", "-C", str(repo), "rm", "-q", "tmp.txt"],
                   check=True, capture_output=True)
    env = {**os.environ,
           "GIT_AUTHOR_NAME": "A", "GIT_AUTHOR_EMAIL": "a@x.com",
           "GIT_COMMITTER_NAME": "A", "GIT_COMMITTER_EMAIL": "a@x.com",
           "GIT_COMMITTER_DATE": "2024-02-01T10:00:00"}
    subprocess.run(["git", "-C", str(repo), "commit", "-q", "-m", "delete tmp",
                    "--date", "2024-02-01T10:00:00"],
                   check=True, capture_output=True, env=env)
    d = analyze(str(repo))
    assert d["totals"]["files"] == 1
    assert d["months"][-1]["files_end"] == 1
    assert d["months"][0]["files_end"] == 2


def test_streaks():
    from datetime import date
    days = [date(2024, 1, 1), date(2024, 1, 2), date(2024, 1, 3),
            date(2024, 1, 10), date(2024, 1, 11)]
    assert streaks(days)["longest"] == 3
    assert streaks([])["longest"] == 0


def test_calendar_covers_lifetime(story_repo):
    d = analyze(story_repo)
    cal = d["calendar"]
    first = d["months"][0]["key"] + "-01"
    assert cal["start"] == first
    # Jan 5 2023 → Jul 22 2023 ≈ 199 days span (calendar starts at month start)
    assert 190 <= len(cal["days"]) <= 210
    assert sum(cal["days"]) == d["totals"]["commits"]


def test_fingerprint_fields(story_repo):
    d = analyze(story_repo)
    fp = d["fingerprint"]
    assert fp["author"] == "Test Author"
    assert fp["archetype"]["label"]
    assert len(fp["hours"]) == 24
    assert isinstance(fp["traits"], list)


def test_night_commits_counted(story_repo):
    d = analyze(story_repo)
    assert d["totals"]["night_pct"] > 0   # 23:30 + 02:00 commits exist


# ─── story assembly ─────────────────────────────────────────────────────────

def test_render_story_writes_file(tiny_repo, tmp_path):
    out = str(tmp_path / "story.html")
    d = analyze(tiny_repo)
    render_story(d, out)
    html = open(out, encoding="utf-8").read()
    assert "window.__CC_DATA__" in html
    assert "__CC_DATA__ = null" not in html
    assert "CommitCanvas" in html
    assert "http" not in html.split("<style>")[1].split("</style>")[0].replace("http://www.w3.org", "")  # no external css
    assert len(html) > 20000


def test_render_escapes_script_breakin(tmp_path):
    """A commit message must never be able to close the data tag."""
    repo = make_repo(str(tmp_path / "evil"), [
        ("2024-01-01T10:00:00", "</script><script>alert(1)</script>", "a.txt", "1\n"),
    ])
    d = analyze(repo)
    payload = safe_json_payload(d)
    assert "</script>" not in payload
    out = str(tmp_path / "s.html")
    render_story(d, out)
    html = open(out, encoding="utf-8").read()
    assert "alert(1)</script>" not in html


def test_model_is_json_serializable(story_repo):
    d = analyze(story_repo)
    json.dumps(d)  # must not raise


# ─── build freshness ────────────────────────────────────────────────────────

def test_build_outputs_fresh():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    proc = subprocess.run([sys.executable, os.path.join(root, "tools", "build.py"), "--check"],
                          capture_output=True, text=True, cwd=root)
    assert proc.returncode == 0, "canvas.html/index.html are stale — run: python tools/build.py"
