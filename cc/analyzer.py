"""
Commit Canvas — Repository Analysis Engine
===========================================
Reads a local git repository in a *single* pass and produces a JSON-ready
model of its entire story: chapters, milestones, monthly evolution,
developer fingerprint, roast material — all deterministic, all grounded
in real repository evidence. No AI, no network, no guesses.

Design notes
------------
* One `git log` subprocess for everything (commits, parents, decorations,
  per-file numstat). One `git for-each-ref` for tag dates. That's it.
* Fields are separated by \\x1f (ASCII unit separator) — commit messages
  can contain `|`, newlines are impossible in `%s`, but \\x1f is the one
  character git promises not to emit inside these fields.
* Merge commits are KEPT (they carry branch/merge truth); numstat simply
  doesn't emit rows for them, which is exactly what we want.
* Monthly snapshots approximate "state of the codebase at month end" by
  replaying numstat adds/removes chronologically. Renames are disabled
  (--no-renames) for speed and determinism.
"""

import os
import re
import subprocess
from collections import defaultdict
from datetime import datetime, timedelta, date
from statistics import median
from typing import List, Dict, Tuple, Optional

SEP = "\x1f"
LOG_FORMAT = (
    "%x1f%H%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%s%x1f%D"
)

# ─── Language palette (deliberately small, consistent) ──────────────────────

_LANG_COLORS = {
    "JavaScript": "#f1e05a", "TypeScript": "#3178c6", "Python": "#3572A5",
    "Rust": "#dea584", "Go": "#00ADD8", "C": "#555555", "C++": "#f34b7d",
    "C#": "#178600", "Java": "#b07219", "Kotlin": "#A97BFF", "Swift": "#F05138",
    "Ruby": "#701516", "PHP": "#4F5D95", "HTML": "#e34c26", "CSS": "#563d7c",
    "SCSS": "#c6538c", "Vue": "#41b883", "Svelte": "#ff3e00", "Dart": "#00B4AB",
    "Zig": "#ec915c", "Lua": "#000080", "Shell": "#89e051", "Makefile": "#427819",
    "Docker": "#2496ED", "Markdown": "#083fa1", "JSON": "#292929",
    "YAML": "#cb171e", "TOML": "#9c4221", "SQL": "#e38c00", "Elixir": "#6e4a7e",
    "reST": "#141414", "Text": "#8a919e", "Config": "#8a919e",
    "GraphQL": "#e10098", "Proto": "#4E5D95", "Vim script": "#199f4b",
    "Lisp": "#3fb68b", "Nix": "#7e7eff", "Solidity": "#AA6746",
    "Haskell": "#5e5086", "Scala": "#c22d40", "Clojure": "#db5855",
    "Perl": "#0298c3", "R": "#198CE7", "Jupyter": "#DA5B0B", "Assembly": "#6E4C13",
}

_EXT_TO_LANG = {
    ".js": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
    ".jsx": "JavaScript", ".ts": "TypeScript", ".tsx": "TypeScript",
    ".py": "Python", ".pyi": "Python", ".rs": "Rust", ".go": "Go",
    ".c": "C", ".h": "C", ".cpp": "C++", ".cc": "C++", ".hpp": "C++",
    ".cs": "C#", ".java": "Java", ".kt": "Kotlin", ".swift": "Swift",
    ".rb": "Ruby", ".php": "PHP", ".html": "HTML", ".htm": "HTML",
    ".css": "CSS", ".scss": "SCSS", ".sass": "SCSS", ".less": "CSS",
    ".vue": "Vue", ".svelte": "Svelte", ".dart": "Dart", ".zig": "Zig",
    ".lua": "Lua", ".sh": "Shell", ".bash": "Shell", ".zsh": "Shell",
    "makefile": "Makefile", ".mk": "Makefile", "dockerfile": "Docker",
    ".md": "Markdown", ".markdown": "Markdown", ".json": "JSON",
    ".yml": "YAML", ".yaml": "YAML", ".toml": "TOML", ".ini": "TOML",
    ".sql": "SQL", ".ex": "Elixir", ".exs": "Elixir", ".hs": "Haskell",
    ".scala": "Scala", ".clj": "Clojure", ".pl": "Perl", ".r": "R",
    ".ipynb": "Jupyter", ".asm": "Assembly", ".s": "Assembly",
    ".rst": "reST", ".adoc": "Text", ".txt": "Text", ".text": "Text",
    ".cfg": "Config", ".conf": "Config", ".env": "Config",
    ".tsx": "TypeScript", ".graphql": "GraphQL", ".proto": "Proto",
    ".vim": "Vim script", ".emacs": "Lisp", ".el": "Lisp",
    ".bat": "Shell", ".ps1": "Shell", ".nix": "Nix", ".sol": "Solidity",
    ".m": "C", ".mm": "C++", ".tf": "TOML", ".editorconfig": "Config",
}


def _lang_for(path: str) -> str:
    name = path.rsplit("/", 1)[-1].lower()
    if name in _EXT_TO_LANG:
        return _EXT_TO_LANG[name]
    dot = name.rfind(".")
    if dot >= 0 and name[dot:] in _EXT_TO_LANG:
        return _EXT_TO_LANG[name[dot:]]
    return "Other"


def _lang_color(lang: str) -> str:
    return _LANG_COLORS.get(lang, "#7d8590")


# ─── Git plumbing ───────────────────────────────────────────────────────────

def run_git(repo_path: str, *args) -> str:
    proc = subprocess.run(
        ["git", "-c", "core.quotepath=off"] + list(args),
        cwd=repo_path, capture_output=True, text=True, errors="replace",
    )
    if proc.returncode != 0:
        msg = (proc.stderr or proc.stdout or "").strip().splitlines()
        raise RuntimeError(msg[0] if msg else f"git {' '.join(args[:2])} failed")
    return proc.stdout


def is_git_repo(path: str) -> bool:
    try:
        proc = subprocess.run(["git", "rev-parse", "--git-dir"], cwd=path,
                              capture_output=True, text=True, errors="replace")
        return proc.returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def read_raw_history(repo_path: str) -> List[dict]:
    """Single pass over the full history. Returns commits in ascending
    commit order (oldest first), each carrying its numstat rows and
    create/delete-mode facts (from --summary, which is unambiguous,
    unlike numstat alone)."""
    out = run_git(repo_path, "log", "--all", "--no-renames", "--numstat",
                  "--summary", f"--format={LOG_FORMAT}")
    commits: List[dict] = []
    cur = None
    for line in out.split("\n"):
        if line.startswith(SEP):
            parts = line.split(SEP)
            if len(parts) < 7:
                continue
            if len(parts) < 8:
                parts.append("")
            _, h, parents, an, ae, at, subj, deco = parts[:8]
            ts = int(at)
            cur = {
                "hash": h, "short": h[:7],
                "parents": parents.split(),
                "author": an.strip(), "email": ae.strip(),
                "ts": ts,
                "dt": datetime.fromtimestamp(ts),
                "subject": subj.strip(),
                "decorations": deco.strip(),
                "files": [],       # (added, deleted, path)
                "created": [],     # paths created in this commit
                "deleted": [],     # paths deleted in this commit
            }
            commits.append(cur)
        elif cur is None:
            continue
        elif line.startswith(" create mode "):
            cur["created"].append(_mode_path(line))
        elif line.startswith(" delete mode "):
            cur["deleted"].append(_mode_path(line))
        elif "\t" in line:
            bits = line.split("\t", 2)
            if len(bits) == 3:
                a, d, path = bits
                if a.strip() == "-" or d.strip() == "-":   # binary
                    cur["files"].append((0, 0, path))
                else:
                    try:
                        cur["files"].append((int(a), int(d), path))
                    except ValueError:
                        pass
    commits.sort(key=lambda c: (c["ts"], c["hash"]))
    return commits


def _mode_path(line: str) -> str:
    """' create mode 100644 src/app.py' → 'src/app.py'"""
    parts = line.split(" ", 3)
    return parts[3].strip().strip('"') if len(parts) == 4 else ""


def read_tag_dates(repo_path: str) -> Dict[str, int]:
    """tag name → unix ts (annotated tagger date, else commit date).
    Format: '<unix> <name>' — unix ts never contains spaces, names may."""
    out = run_git(repo_path, "for-each-ref", "refs/tags",
                  "--sort=creatordate",
                  "--format=%(creatordate:unix) %(refname:short)")
    tags = {}
    for line in out.strip().split("\n"):
        if not line or " " not in line:
            continue
        ts_str, name = line.split(" ", 1)
        if ts_str.isdigit() and name.strip():
            tags[name.strip()] = int(ts_str)
    return tags


def repo_display_name(repo_path: str) -> str:
    base = os.path.basename(os.path.abspath(repo_path))
    return base.strip() or "repository"


# ─── Helpers ────────────────────────────────────────────────────────────────

def _fmt_n(n: int) -> str:
    return f"{n:,}"


def _fmt_lines(n: int) -> str:
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    if n >= 10_000:
        return f"{round(n/1000)}k"
    if n >= 1000:
        return f"{n/1000:.1f}k"
    return _fmt_n(n)


def _month_key(dt: datetime) -> str:
    return f"{dt.year:04d}-{dt.month:02d}"


def _month_label(key: str) -> str:
    y, m = key.split("-")
    return datetime(int(y), int(m), 1).strftime("%b %Y")


def _human_gap(days: int) -> str:
    if days < 40:
        return f"{days} days"
    if days < 365:
        return f"{days // 7} weeks"
    y, rem = days // 365, (days % 365) // 30
    return f"{y} year{'s' if y > 1 else ''}" + (f", {rem} month{'s' if rem > 1 else ''}" if rem else "")


def _age_label(days: int) -> str:
    if days < 45:
        return f"{days} day{'s' if days != 1 else ''}"
    if days < 365:
        return f"{days // 30} month{'s' if days // 30 != 1 else ''}"
    y, m = days // 365, (days % 365) // 30
    return f"{y} year{'s' if y > 1 else ''}" + (f" {m} mo" if m else "")


def _is_merge(c: dict) -> bool:
    return len(c["parents"]) >= 2


def _snapshot(file_lines: Dict[str, int]) -> dict:
    """Month-end state: file count, net lines, top-8 languages."""
    langs: Dict[str, int] = defaultdict(int)
    for p, ln in file_lines.items():
        if ln:
            langs[_lang_for(p)] += ln
    return {
        "files": len(file_lines),
        "net": sum(file_lines.values()),
        "langs": dict(sorted(langs.items(), key=lambda kv: -kv[1])[:8]),
    }


_MSG_RE_FIX = re.compile(r"^(fix|fixup|hotfix|patch|bugfix)\b", re.I)
_MSG_RE_WIP = re.compile(r"^(wip|work in progress|temp|test|asdf|stuff|misc|blah|update|updates|changed?)\b", re.I)
_MSG_RE_CLEAN = re.compile(r"^(chore|refactor|clean|cleanup|tidy|remove|delete|revert|format|lint)\b", re.I)
_MSG_RE_FEAT = re.compile(r"^(feat|feature|add|create|build|implement|init|initial|new|make|write|introduce)\b", re.I)


# ─── Streaks ────────────────────────────────────────────────────────────────

def streaks(active_days: List[date]) -> dict:
    if not active_days:
        return {"longest": 0, "active": len(active_days)}
    longest = run = 1
    for i in range(1, len(active_days)):
        if (active_days[i] - active_days[i - 1]).days == 1:
            run += 1
            longest = max(longest, run)
        else:
            run = 1
    return {"longest": longest, "active": len(active_days)}


# ─── Main analysis ──────────────────────────────────────────────────────────

def analyze(repo_path: str, title: Optional[str] = None,
            max_commits: Optional[int] = None) -> dict:
    if not is_git_repo(repo_path):
        raise ValueError(f"'{repo_path}' is not a git repository")

    notes: List[str] = []
    if os.path.exists(os.path.join(repo_path, ".git", "shallow")):
        notes.append("Shallow clone detected — history may be truncated.")
    if max_commits:
        notes.append(f"Analysis limited to the {max_commits} most recent commits.")

    commits = read_raw_history(repo_path)
    if max_commits and len(commits) > max_commits:
        commits = commits[-max_commits:]
    if not commits:
        raise ValueError("No commits found — this repository has no history yet.")

    tag_dates = read_tag_dates(repo_path)

    # ── replay history chronologically ─────────────────────────────────
    file_lines: Dict[str, int] = {}      # path → net lines (alive files only)
    lang_lines: Dict[str, int] = defaultdict(int)
    dir_commits: Dict[str, int] = defaultdict(int)
    dir_files: Dict[str, set] = defaultdict(set)

    author_stats: Dict[str, dict] = {}
    day_counts: Dict[date, int] = defaultdict(int)
    hour_counts = [0] * 24
    weekday_counts = [0] * 7
    clock_grid = [[0] * 24 for _ in range(7)]
    month_groups: Dict[str, List[dict]] = defaultdict(list)
    month_snapshots: Dict[str, dict] = {}
    cur_month: Optional[str] = None
    tag_commits: List[dict] = []          # commits that carry a tag decoration
    branch_names: set = set()
    biggest_commit = None
    total_add = total_del = merges = 0

    for c in commits:
        merges += 1 if _is_merge(c) else 0
        d = c["dt"]
        mk = _month_key(d)
        if mk != cur_month:
            if cur_month is not None:
                month_snapshots[cur_month] = _snapshot(file_lines)
            cur_month = mk
        day_counts[d.date()] += 1
        hr, wd = d.hour, d.weekday()
        hour_counts[hr] += 1
        weekday_counts[wd] += 1
        clock_grid[wd][hr] += 1
        month_groups[_month_key(d)].append(c)

        a = author_stats.setdefault(c["author"], {
            "name": c["author"], "commits": 0, "first": d, "last": d,
            "hours": [0] * 24, "weekdays": [0] * 7, "night": 0, "weekend": 0,
            "fix": 0, "feat": 0, "clean": 0, "streak_days": set(),
        })
        a["commits"] += 1
        a["first"] = min(a["first"], d)
        a["last"] = max(a["last"], d)
        a["hours"][hr] += 1
        a["weekdays"][wd] += 1
        a["streak_days"].add(d.date())
        is_night = hr >= 22 or hr < 5
        a["night"] += 1 if is_night else 0
        a["weekend"] += 1 if wd >= 5 else 0
        subj = c["subject"].lower()
        if _MSG_RE_FIX.match(subj):
            a["fix"] += 1
        if _MSG_RE_FEAT.match(subj):
            a["feat"] += 1
        if _MSG_RE_CLEAN.match(subj):
            a["clean"] += 1

        added = removed = 0
        top_dirs_touched = set()
        deleted_set = set(c["deleted"])
        for (ad, de, path) in c["files"]:
            added += ad
            removed += de
            top = path.split("/", 1)[0] if "/" in path else "(root)"
            top_dirs_touched.add(top)
            if path in deleted_set:
                continue
            lang = _lang_for(path)
            was_alive = path in file_lines
            if not was_alive:
                dir_files[top].add(path)
            file_lines[path] = file_lines.get(path, 0) + ad - de
            if file_lines[path] == 0 and ad == 0 and de > 0:
                file_lines.pop(path, None)   # fully shrunk away
        for path in deleted_set:            # authoritative deletions
            if path in file_lines:
                top = path.split("/", 1)[0] if "/" in path else "(root)"
                dir_files[top].discard(path)
                file_lines.pop(path, None)
        for t in top_dirs_touched:
            dir_commits[t] += 1

        total_add += added
        total_del += removed
        if biggest_commit is None or added > biggest_commit[0]:
            biggest_commit = (added, c)
        c["_add"], c["_del"] = added, removed

        for deco in [x.strip() for x in c["decorations"].split(",")]:
            if deco.startswith("tag:"):
                c["_tag"] = deco[4:].strip()
                tag_commits.append(c)
            elif deco and not deco.startswith("HEAD") and "/" not in deco:
                branch_names.add(deco)

    # ── months (snapshots taken during the replay above) ──────────────
    if cur_month is not None:
        month_snapshots[cur_month] = _snapshot(file_lines)

    months = []
    seen_authors: set = set()
    for key in sorted(month_groups.keys()):
        group = month_groups[key]
        m_day_counts: Dict[date, int] = defaultdict(int)
        m_authors: Dict[str, int] = defaultdict(int)
        m_dirs: Dict[str, int] = defaultdict(int)
        m_add = m_del = m_merges = 0
        for c in group:
            m_day_counts[c["dt"].date()] += 1
            m_authors[c["author"]] += 1
            m_merges += 1 if _is_merge(c) else 0
            m_add += c["_add"]
            m_del += c["_del"]
            for (ad, de, path) in c["files"]:
                top = path.split("/", 1)[0] if "/" in path else "(root)"
                m_dirs[top] += 1
        new_authors = sorted(a for a in m_authors if a not in seen_authors)
        seen_authors.update(m_authors.keys())
        peak_day = max(m_day_counts, key=lambda k: m_day_counts[k])
        top_dirs = sorted(m_dirs.items(), key=lambda kv: -kv[1])[:5]
        snap = month_snapshots.get(key, {"files": 0, "net": 0, "langs": {}})
        months.append({
            "key": key,
            "label": _month_label(key),
            "commits": len(group),
            "active_days": len(m_day_counts),
            "merges": m_merges,
            "contributors": len(m_authors),
            "new_contributors": len(new_authors),
            "add": m_add,
            "del": m_del,
            "files_end": snap["files"],
            "net_end": snap["net"],
            "langs": snap["langs"],
            "dirs": [[d, n] for d, n in top_dirs],
            "peak_day": peak_day.isoformat(),
            "peak_day_commits": m_day_counts[peak_day],
            "msg": _representative_message(group),
        })

    # language totals at final state (alive files only)
    for p, ln in file_lines.items():
        if ln:
            lang_lines[_lang_for(p)] += ln

    # ── global stats ───────────────────────────────────────────────────
    active_days_sorted = sorted(day_counts.keys())
    st = streaks(active_days_sorted)
    first_c, last_c = commits[0], commits[-1]
    age_days = max((last_c["dt"] - first_c["dt"]).days, 0)
    n_commits = len(commits)
    night_commits = sum(hour_counts[h] for h in list(range(22, 24)) + list(range(0, 5)))
    weekend_commits = sum(weekday_counts[d] for d in (5, 6))

    contributors = sorted(author_stats.values(), key=lambda a: -a["commits"])
    for rank, a in enumerate(contributors):
        pct = round(100 * a["commits"] / n_commits, 1)
        a["pct"] = pct
        a["badge"] = ("lead" if rank == 0 and pct >= 25 else
                      "core" if pct >= 10 else
                      "regular" if a["commits"] >= 5 else "guest")

    # tags (real dates via for-each-ref, matched to commits when possible)
    tags = sorted(
        ({"name": name, "ts": ts} for name, ts in tag_dates.items()),
        key=lambda t: t["ts"])
    tag_by_commit = {c.get("_tag"): c for c in tag_commits}

    # ── narrative layers ───────────────────────────────────────────────
    shape = detect_shape(months, n_commits, age_days)
    chapters = build_chapters(commits, months, tags, tag_by_commit,
                              day_counts, file_lines, lang_lines, contributors)
    lead = contributors[0]
    fingerprint = build_fingerprint(lead, n_commits, len(contributors),
                                    tags, tag_by_commit, months)
    roast = build_roast(commits, months, contributors, day_counts,
                        biggest_commit, tags)
    moment = find_moment(commits, day_counts, biggest_commit, tags, tag_by_commit)
    glowup = build_glowup(commits, months, lang_lines, file_lines)
    milestones = build_milestones(commits, tags, tag_by_commit, day_counts,
                                  chapters)

    calendar = build_calendar(active_days_sorted, day_counts)

    langs_total = sum(v for v in lang_lines.values() if v > 0) or 1
    langs = sorted(((k, v) for k, v in lang_lines.items() if v > 0),
                   key=lambda kv: -kv[1])[:10]
    dirs = sorted(((k, len(v)) for k, v in dir_files.items()),
                  key=lambda kv: -kv[1])[:8]
    dir_commit_list = sorted(dir_commits.items(), key=lambda kv: -kv[1])[:8]

    return {
        "meta": {
            "v": 2,
            "generated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            "source": "local",
            "generator": "Commit Canvas 2.0",
            "notes": notes,
            "has_code_size": True,
        },
        "repo": {
            "name": title or repo_display_name(repo_path),
            "first": first_c["dt"].isoformat(),
            "last": last_c["dt"].isoformat(),
            "age_days": age_days,
            "age_label": _age_label(age_days),
            "branches": len(branch_names),
        },
        "totals": {
            "commits": n_commits,
            "merges": merges,
            "contributors": len(contributors),
            "active_days": st["active"],
            "longest_streak": st["longest"],
            "tags": len(tags),
            "lines_added": total_add,
            "lines_removed": total_del,
            "net_lines": max(sum(file_lines.values()), 0),
            "files": len(file_lines),
            "night_pct": round(100 * night_commits / n_commits),
            "weekend_pct": round(100 * weekend_commits / n_commits),
            "biggest_day": max(day_counts.values()),
            "biggest_day_date": max(day_counts, key=day_counts.get).isoformat(),
            "avg_msg_len": round(sum(len(c["subject"]) for c in commits) / n_commits),
        },
        "shape": shape,
        "months": months,
        "chapters": chapters,
        "clock": {
            "hours": hour_counts,
            "weekdays": weekday_counts,
            "grid": clock_grid,
            "peak_hour": hour_counts.index(max(hour_counts)),
            "peak_weekday": weekday_counts.index(max(weekday_counts)),
        },
        "calendar": calendar,
        "fingerprint": fingerprint,
        "contributors": [{
            "name": a["name"], "commits": a["commits"], "pct": a["pct"],
            "first": a["first"].strftime("%b %Y"),
            "last": a["last"].strftime("%b %Y"),
            "badge": a["badge"],
        } for a in contributors[:12]],
        "langs": [{"name": k, "lines": v,
                   "pct": round(100 * v / langs_total),
                   "color": _lang_color(k)} for k, v in langs],
        "areas": [{"name": d, "files": f, "commits": dict(dir_commit_list).get(d, 0)}
                  for d, f in dirs],
        "milestones": milestones,
        "moment": moment,
        "glowup": glowup,
        "roast": roast,
        "tags": [{"name": t["name"],
                  "date": datetime.fromtimestamp(t["ts"]).strftime("%Y-%m-%d")}
                 for t in tags[:24]],
    }


# ─── Sub-engines ────────────────────────────────────────────────────────────

def _representative_message(group: List[dict]) -> str:
    """Pick the most story-worthy subject of the month (deterministic)."""
    best, best_score = None, -1
    for c in group:
        s = c["subject"]
        if not s or _is_merge(c) or s.startswith("Merge "):
            continue
        low = s.lower()
        score = min(len(s), 80) * 0.2
        if _MSG_RE_FEAT.match(low):
            score += 30
        if re.match(r"^(release|v?\d+\.\d+)", low):
            score += 40
        if not _MSG_RE_FIX.match(low) and not _MSG_RE_CLEAN.match(low):
            score += 10
        if score > best_score:
            best, best_score = s, score
    if best is None and group:
        best = group[0]["subject"]
    return (best or "")[:90]


def detect_shape(months: List[dict], n_commits: int, age_days: int) -> dict:
    """The story arc of the whole project — from real velocity data."""
    if (len(months) <= 1 or n_commits < 5
            or (n_commits < 60 and age_days < 90)):
        label, arc = "Fresh Start", "fresh"
    else:
        counts = [m["commits"] for m in months]
        med = median(counts)
        half = len(counts) // 2
        first_v = sum(counts[:half]) / max(half, 1)
        late_v = sum(counts[half:]) / max(len(counts) - half, 1)
        top = max(counts)
        gaps = _longest_gap_days(months)
        med_v = med if med else 0
        if gaps >= 60 and _comeback_strength(months) >= max(3, med_v * 0.5):
            label, arc = "The Return", "return"
        elif top >= 4 * med and top >= 15:
            label, arc = "The Sprint", "sprint"
        elif late_v >= 1.8 * first_v:
            label, arc = "The Climb", "climb"
        elif first_v >= 1.8 * late_v:
            label, arc = "The Slow Fade", "fade"
        elif len(counts) >= 6 and max(counts) < 3 * med:
            label, arc = "The Marathon", "marathon"
        else:
            label, arc = "The Journey", "journey"

    summaries = {
        "fresh": f"{n_commits} commits and counting — this story is just opening.",
        "return": "It went quiet. Then it came back. Projects don't do that by accident.",
        "sprint": "Built in bursts of deep focus — the history remembers every surge.",
        "climb": "It started quiet and kept accelerating. Momentum you can see.",
        "fade": "The early energy was real. What comes next is the interesting part.",
        "marathon": "No drama, no spikes — just showing up, month after month.",
        "journey": "Quiet parts, loud parts, and everything in between.",
    }
    return {"arc": arc if arc in summaries else "journey",
            "label": label,
            "summary": summaries.get(arc, summaries["journey"])}


def _longest_gap_days(months: List[dict]) -> int:
    if len(months) < 2:
        return 0
    def mt(key):
        y, m = key.split("-")
        return date(int(y), int(m), 1)
    longest = 0
    for i in range(1, len(months)):
        a, b = mt(months[i - 1]["key"]), mt(months[i]["key"])
        longest = max(longest, (b - a).days - 30)
    return max(longest, 0)


def _comeback_strength(months: List[dict]) -> int:
    """Biggest month that follows a skipped (commit-less) month."""
    if len(months) < 2:
        return 0
    def mt(key):
        y, m = key.split("-")
        return date(int(y), int(m), 1)
    best = 0
    for i in range(1, len(months)):
        skipped = (mt(months[i]["key"]) - mt(months[i - 1]["key"])).days > 45
        if skipped:                       # at least one fully silent month between
            best = max(best, months[i]["commits"])
    return best


def build_chapters(commits, months, tags, tag_by_commit, day_counts,
                   file_lines, lang_lines, contributors) -> List[dict]:
    chapters: List[dict] = []
    counts = [m["commits"] for m in months]
    med = median(counts) if counts else 0

    # 1 — The Beginning
    first = commits[0]
    facts = [f"First commit: “{first['subject'][:90]}”",
             f"Made by {first['author']} on {first['dt'].strftime('%b %d, %Y')}"]
    if file_lines:
        facts.append(f"Today it stands at {_fmt_n(len(file_lines))} files")
    chapters.append({
        "kind": "beginning", "title": "The Beginning",
        "subtitle": "where every project starts",
        "start": first["dt"].isoformat(), "end": first["dt"].isoformat(),
        "facts": facts,
    })

    # 2 — The Sprint (burst months)
    burst_months = [m for m in months
                    if m["commits"] >= max(2.5 * med, 10)]
    if len(burst_months) >= 1 and len(months) >= 3:
        total = sum(m["commits"] for m in burst_months)
        best = max(burst_months, key=lambda m: m["commits"])
        chapters.append({
            "kind": "sprint", "title": "The Sprint",
            "subtitle": "when the project swallowed the calendar",
            "start": burst_months[0]["key"] + "-01",
            "end": burst_months[-1]["key"] + "-01",
            "facts": [
                f"{_fmt_n(total)} commits in {len(burst_months)} peak month{'s' if len(burst_months) > 1 else ''}",
                f"Best month: {best['label']} — {best['commits']} commits, {best['active_days']} active days",
                f"Peak day: {best['peak_day']} with {best['peak_day_commits']} commits",
                f"“{best['msg']}”",
            ],
        })

    # 3 — The Silence + Comeback (largest gap between active months)
    gap = _largest_silence(months)
    if gap and gap["days"] >= 21:
        silence_facts = [f"No commits for {_human_gap(gap['days'])} — {gap['from']} to {gap['to']}"]
        # observed silence, not explained silence: the history proves absence
        # of commits, never absence of work — say exactly that and stop.
        boundary = "The history records the absence — not the reason."
        after = gap["after_month"]
        if after and after["commits"] >= 5:
            silence_facts.append(
                f"Then {after['label']} brought {after['commits']} commits")
            chapters.append({
                "kind": "silence", "title": "The Silence",
                "subtitle": f"{_human_gap(gap['days'])} with no commits",
                "start": gap["from"], "end": gap["to"],
                "facts": silence_facts + [
                    f"“{after['msg']}” — the commit that ended it",
                    boundary,
                ],
            })
        else:
            chapters.append({
                "kind": "silence", "title": "The Silence",
                "subtitle": f"{_human_gap(gap['days'])} with no commits",
                "start": gap["from"], "end": gap["to"],
                "facts": silence_facts + [boundary],
            })

    # 4 — The Grind (longest run of consecutive active months)
    run = _longest_active_run(months)
    if run and run["len"] >= 4:
        span = months[run["start"]:run["end"] + 1]
        total = sum(m["commits"] for m in span)
        people = max(m["contributors"] for m in span)
        chapters.append({
            "kind": "grind", "title": "The Grind",
            "subtitle": "the stretch that built the thing",
            "start": span[0]["key"] + "-01", "end": span[-1]["key"] + "-01",
            "facts": [
                f"{run['len']} consecutive months of work",
                f"{_fmt_n(total)} commits, up to {people} contributor{'s' if people != 1 else ''}",
                f"Longest daily streak in this era: {max(m['peak_day_commits'] for m in span)} commits in one day",
            ],
        })

    # 5 — The Launch (releases)
    if tags:
        first_tag = tags[0]
        last_tag = tags[-1]
        fd = datetime.fromtimestamp(first_tag["ts"])
        facts = [f"First release: {first_tag['name']} — {fd.strftime('%b %d, %Y')}",
                 f"{len(tags)} tag{'s' if len(tags) > 1 else ''} across the project's life"]
        if len(tags) > 1:
            ld = datetime.fromtimestamp(last_tag["ts"])
            facts.append(f"Latest: {last_tag['name']} ({ld.strftime('%b %d, %Y')})")
        chapters.append({
            "kind": "launch", "title": "The Launch",
            "subtitle": "moments shipped to the world",
            "start": fd.isoformat(), "end": fd.isoformat(),
            "facts": facts,
        })

    # 6 — The Evolution (recent era vs lifetime)
    if len(months) >= 4:
        recent = months[-3:]
        recent_c = sum(m["commits"] for m in recent)
        lifetime_avg = (sum(counts) / len(counts)) or 1
        recent_avg = recent_c / len(recent)
        ratio = recent_avg / lifetime_avg
        top_lang = max(lang_lines, key=lambda k: lang_lines[k]) if lang_lines else None
        facts = [f"Last {len(recent)} active months: {recent_c} commits "
                 f"({round(recent_avg, 1)}/month vs {round(lifetime_avg, 1)} lifetime)"]
        if ratio >= 1.5:
            facts.append("Velocity is climbing — this project is accelerating")
        elif ratio <= 0.6:
            facts.append("Quieter lately — maintenance mode, or the calm before something")
        else:
            facts.append("Cruising at roughly its lifetime pace")
        if top_lang and top_lang != "Other":
            facts.append(f"Written mostly in {top_lang} "
                         f"({_fmt_lines(max(lang_lines[top_lang], 0))} lines)")
        chapters.append({
            "kind": "evolution", "title": "The Evolution",
            "subtitle": "where the story stands now",
            "start": recent[0]["key"] + "-01", "end": months[-1]["key"] + "-01",
            "facts": facts,
        })

    chapters.sort(key=lambda ch: (0 if ch["kind"] == "beginning" else 1, ch["start"]))
    return chapters[:8]


def _largest_silence(months: List[dict]) -> Optional[dict]:
    if len(months) < 2:
        return None
    def mt(key):
        y, m = key.split("-")
        return date(int(y), int(m), 1)
    best = None
    for i in range(1, len(months)):
        a, b = mt(months[i - 1]["key"]), mt(months[i]["key"])
        gap_days = (b - a).days - 30   # approximate calendar-month gap
        if gap_days >= 14 and (best is None or gap_days > best["days"]):
            best = {
                "days": gap_days,
                "from": months[i - 1]["key"] + "-28",
                "to": months[i]["key"] + "-01",
                "after_month": months[i],
            }
    return best


def _longest_active_run(months: List[dict]) -> Optional[dict]:
    if not months:
        return None
    def mt(key):
        y, m = key.split("-")
        return date(int(y), int(m), 1)
    best_run, cur_start, prev = None, 0, None
    for i, m in enumerate(months):
        if prev is not None:
            delta = (mt(m["key"]) - prev).days
            if delta > 45:  # missed a month → run broken
                cur_start = i
        if best_run is None or (i - cur_start) > (best_run["end"] - best_run["start"]):
            best_run = {"start": cur_start, "end": i, "len": i - cur_start + 1}
        prev = mt(m["key"])
    return best_run if best_run and best_run["len"] >= 2 else None


def build_fingerprint(lead: dict, total_commits: int, n_contributors: int,
                      tags, tag_by_commit, months) -> dict:
    n = max(lead["commits"], 1)
    night_pct = round(100 * lead["night"] / n)
    weekend_pct = round(100 * lead["weekend"] / n)
    peak_hour = lead["hours"].index(max(lead["hours"]))
    morning = sum(lead["hours"][5:12]) / n
    day = sum(lead["hours"][12:18]) / n
    evening = sum(lead["hours"][18:22]) / n
    st = streaks(sorted(lead["streak_days"]))
    counts = [m["commits"] for m in months]
    med = median(counts) if counts else 0
    top = max(counts) if counts else 0
    burst_ratio = (top / med) if med else 1

    tagged_by_lead = sum(
        1 for c in tag_by_commit.values() if c and c["author"] == lead["name"])
    fix_pct = round(100 * lead["fix"] / n)
    clean_pct = round(100 * lead["clean"] / n)

    archetypes = [
        ("night", "The Night Builder", "🌙",
         "Most of this repository was written while the world slept.",
         night_pct >= 30, night_pct),
        ("early", "The Early Riser", "🌅",
         "Fresh commits in the morning — this is a discipline, not a hobby.",
         morning >= 0.45, round(100 * morning)),
        ("weekend", "The Weekend Hacker", "🛠️",
         "The week is for meetings. The weekend is for shipping.",
         weekend_pct >= 30, weekend_pct),
        ("sprinter", "The Sprinter", "⚡",
         "Long quiet, then an avalanche. Inspiration-driven velocity.",
         burst_ratio >= 4, round(burst_ratio * 10) / 10),
        ("marathoner", "The Marathoner", "🏃",
         "Showing up consistently beats showing up intensely.",
         st["longest"] >= 10 and n >= 40, st["longest"]),
        ("shipper", "The Shipper", "🚀",
         "Tags, releases, versions — this work gets finished and sent out.",
         tagged_by_lead >= 2, tagged_by_lead),
        ("cleaner", "The Cleaner", "🧹",
         "A meaningful share of this history is fixing and tidying. Respect.",
         clean_pct >= 20 or fix_pct >= 30, max(clean_pct, fix_pct)),
        ("lone", "The Lone Wolf", "🐺",
         "One name on every commit. A one-person project, fully owned.",
         n_contributors == 1 and total_commits >= 25, total_commits),
    ]
    hit = [a for a in archetypes if a[4]]
    hit.sort(key=lambda a: -a[5])
    primary = hit[0] if hit else (
        "steady", "The Steady Hand", "🧭",
        "No wild spikes, no ghost towns — even, dependable rhythm.", True, 0)
    runners = [a[1] for a in hit[1:3]]

    def hour_label(h):
        if 5 <= h < 12: return "morning"
        if 12 <= h < 18: return "afternoon"
        if 18 <= h < 22: return "evening"
        return "night"

    traits = [
        (f"{night_pct}% of commits landed between 10pm and 5am", night_pct >= 15),
        (f"Peak coding hour: {peak_hour}:00 — a {hour_label(peak_hour)} builder", True),
        (f"Weekend share: {weekend_pct}%", weekend_pct >= 20),
        (f"Longest streak: {st['longest']} active days in a row", st["longest"] >= 3),
        (f"{lead['fix']} fix-commits and counting", lead["fix"] >= 5),
        (f"Committed on {st['active']} different days", True),
    ]
    return {
        "author": lead["name"],
        "commits": lead["commits"],
        "pct": lead["pct"],
        "active_since": lead["first"].strftime("%b %Y"),
        "archetype": {
            "id": primary[0], "label": primary[1], "icon": primary[2],
            "tagline": primary[3],
        },
        "runners": runners,
        "traits": [t for t, show in traits if show][:4],
        "hours": lead["hours"],
        "footnote": "A fingerprint of Git behavior — not a personality test.",
    }


def build_roast(commits, months, contributors, day_counts, biggest_commit,
                tags) -> List[dict]:
    n = len(commits)
    roast = []
    vague = {}
    for c in commits:
        s = c["subject"].strip().lower().rstrip(".!")
        if s in ("fix", "fixed", "update", "updated", "changes", "wip",
                 "stuff", "test", "asdf", "misc", "final", "final fix",
                 "please work", "why", "idk", "hmm", "oops", "fuck"):
            vague[s] = vague.get(s, 0) + 1
    if vague:
        word, cnt = max(vague.items(), key=lambda kv: kv[1])
        if cnt >= 2:
            roast.append({
                "line": f"{cnt} commits just named “{word}”. Bold naming choices.",
                "evidence": f"{cnt}× “{word}” in history",
            })
    avg_len = sum(len(c["subject"]) for c in commits) / n
    if avg_len < 16:
        roast.append({
            "line": f"Average commit message: {round(avg_len)} characters. Mysterious.",
            "evidence": f"avg {round(avg_len)} chars/message",
        })
    if biggest_commit and biggest_commit[0] >= 1500:
        c = biggest_commit[1]
        roast.append({
            "line": f"One commit added {biggest_commit[0]:,} lines in one go. Code review: ¯\\_(ツ)_/¯",
            "evidence": f"{c['short']} +{biggest_commit[0]:,}",
        })
    gap = _largest_silence(months)
    if gap and gap["days"] >= 45:
        after = gap["after_month"]
        roast.append({
            "line": (f"Disappeared for {_human_gap(gap['days'])}, "
                     f"came back with {after['commits']} commits in a month. Guilt is a sprint tool."),
            "evidence": f"{gap['days']}-day gap",
        })
    night_owl = sum(1 for c in commits if c["dt"].hour >= 2 and c["dt"].hour < 5)
    if night_owl >= 8:
        roast.append({
            "line": f"{night_owl} commits between 2 and 5 AM. Sleep is apparently a suggestion.",
            "evidence": f"{night_owl} commits at 2–5 AM",
        })
    if len(contributors) == 1 and n >= 20:
        roast.append({
            "line": f"All {n} commits are one person. It's you, your keyboard, and the void.",
            "evidence": "single contributor",
        })
    finals = [t["name"].lower() for t in tags if "final" in t["name"].lower()]
    if finals:
        roast.append({
            "line": f"Tagged “final”. It never is. It never was.",
            "evidence": f"tags: {', '.join(finals[:3])}",
        })
    if not roast:
        roast.append({
            "line": "Honestly? This history is suspiciously disciplined. No notes. Respect.",
            "evidence": "clean record",
        })
    return roast[:4]


def find_moment(commits, day_counts, biggest_commit, tags, tag_by_commit) -> dict:
    if not day_counts:
        return {"title": "The first commit", "sub": "Every story starts somewhere.",
                "date": commits[0]["dt"].isoformat(), "kind": "beginning"}
    avg_daily = len(commits) / max(len(day_counts), 1)
    best_day = max(day_counts, key=day_counts.get)
    best_day_n = day_counts[best_day]

    candidates = [{
        "kind": "burst",
        "score": best_day_n / max(avg_daily, 0.5),
        "title": f"{best_day_n} commits in a single day",
        "sub": f"{best_day.strftime('%A, %B %d, %Y')} — the most intense day this project ever had.",
        "date": best_day.isoformat(),
    }]
    if biggest_commit and biggest_commit[0] >= 500:
        c = biggest_commit[1]
        candidates.append({
            "kind": "commit",
            "score": biggest_commit[0] / 1500,
            "title": f"The {biggest_commit[0]:,}-line commit",
            "sub": f"“{c['subject'][:80]}” — {c['author']}, {c['dt'].strftime('%b %Y')}.",
            "date": c["dt"].isoformat(),
        })
    if tags:
        t = tags[-1]
        td = datetime.fromtimestamp(t["ts"])
        candidates.append({
            "kind": "release",
            "score": 1.4,
            "title": f"Release {t['name']}",
            "sub": f"Shipped {td.strftime('%B %d, %Y')} — {len(tags)} releases and counting.",
            "date": td.isoformat(),
        })
    candidates.sort(key=lambda c: -c["score"])
    return candidates[0]


def build_glowup(commits, months, lang_lines, file_lines) -> dict:
    first = commits[0]
    last = commits[-1]
    now_langs = sum(1 for v in lang_lines.values() if v > 0)
    then_langs = len({_lang_for(f[2]) for f in first["files"]}) or None
    then = {
        "date": first["dt"].strftime("%b %Y"),
        "files": len(first["files"]) or None,
        "lines": _fmt_lines(sum(f[0] for f in first["files"])) if first["files"] else None,
        "langs": then_langs,
        "msg": first["subject"][:80],
    }
    now_files = len(file_lines)
    top_lang = max(lang_lines, key=lambda k: lang_lines[k]) if lang_lines else None
    now = {
        "date": last["dt"].strftime("%b %Y"),
        "files": now_files or None,
        "lines": _fmt_lines(max(sum(v for v in lang_lines.values() if v > 0), 0)) if lang_lines else None,
        "langs": now_langs or None,
        "msg": last["subject"][:80],
        "top_lang": top_lang if top_lang and top_lang != "Other" else None,
    }
    return {"then": then, "now": now}


def build_milestones(commits, tags, tag_by_commit, day_counts, chapters) -> List[dict]:
    ms: List[dict] = []
    first = commits[0]
    ms.append({
        "kind": "first", "title": "First commit",
        "sub": f"“{first['subject'][:80]}”", "date": first["dt"].isoformat(),
        "who": first["author"],
    })
    shown_tags = 0
    last_year_shown = None
    for t in tags:
        d = datetime.fromtimestamp(t["ts"])
        if shown_tags >= 6 and len(tags) > 8:
            if t is not tags[-1]:
                continue
        ms.append({
            "kind": "release", "title": f"{t['name']} released",
            "sub": d.strftime("%B %Y"), "date": d.isoformat(), "who": "",
        })
        shown_tags += 1
    best_day = max(day_counts, key=day_counts.get)
    ms.append({
        "kind": "burst", "title": f"Biggest day — {day_counts[best_day]} commits",
        "sub": best_day.strftime("%B %d, %Y"), "date": best_day.isoformat(), "who": "",
    })
    last = commits[-1]
    ms.append({
        "kind": "latest", "title": "Latest commit",
        "sub": f"“{last['subject'][:80]}”", "date": last["dt"].isoformat(),
        "who": last["author"],
    })
    ms.sort(key=lambda m: m["date"])
    return ms


def build_calendar(active_days: List[date], day_counts) -> dict:
    if not active_days:
        return {"start": None, "days": []}
    start = active_days[0].replace(day=1)
    end = active_days[-1]
    counts = []
    cur = start
    while cur <= end:
        counts.append(day_counts.get(cur, 0))
        cur += timedelta(days=1)
    return {"start": start.isoformat(), "days": counts}
