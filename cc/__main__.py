#!/usr/bin/env python3
"""
Commit Canvas — turn a git repository into a cinematic, shareable story.

Usage:
    python -m cc .                       # analyze current repo → story.html
    python -m cc /path/to/project        # analyze another repo
    python -m cc . --open                # open in browser afterwards
    python -m cc . --title "My Project"  # custom title
    python -m cc . -o out/story.html     # custom output path

Zero dependencies. Python 3.8+ and git. No network, ever.
"""

import argparse
import json
import os
import sys
import time

from cc.analyzer import analyze, is_git_repo
from cc.story import render_story

_STEPS = [
    ("Reading history", "every commit, every branch, every merge"),
    ("Tracing the timeline", "months, milestones, turning points"),
    ("Measuring the codebase", "files, lines, languages over time"),
    ("Finding the chapters", "beginnings, sprints, silences, comebacks"),
    ("Painting the canvas", "one self-contained HTML file"),
]


def _progress(lines_shown, label, detail):
    print(f"  {label.lower().ljust(26)} {detail}")
    return lines_shown + 1


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="commit-canvas",
        description="Turn any git repository into a cinematic, shareable story page.",
    )
    parser.add_argument("repo_path", nargs="?", default=".",
                        help="path to a git repository (default: current directory)")
    parser.add_argument("-o", "--output", default=None,
                        help="output HTML path (default: ./story.html)")
    parser.add_argument("--title", default=None,
                        help="custom project title shown on the story page")
    parser.add_argument("--open", action="store_true",
                        help="open the result in your browser")
    parser.add_argument("--max-commits", type=int, default=None,
                        help="analyze only the N most recent commits (huge repos)")
    parser.add_argument("--json", default=None, dest="json_out",
                        help="also write the raw analysis model as JSON (used by the landing page build)")
    parser.add_argument("--theme", default=None,
                        choices=["midnight", "neon", "paper", "terminal", "aurora", "blueprint", "mono", "sunset"],
                        help="visual edition for the generated story (default: midnight)")
    parser.add_argument("--density", default=None,
                        choices=["compact", "standard", "cinematic"],
                        help="story detail level (default: standard)")
    args = parser.parse_args(argv)

    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))

    print()
    print("  ┌──────────────────────────────────────────┐")
    print("  │   Commit Canvas · your code has a story  │")
    print("  └──────────────────────────────────────────┘")
    print()

    if not os.path.isdir(repo_path):
        print(f"  ✖ '{repo_path}' does not exist.")
        sys.exit(1)
    if not is_git_repo(repo_path):
        print(f"  ✖ '{repo_path}' is not a git repository.")
        print("    cd into a project with a .git folder, or pass its path:")
        print("    python -m cc /path/to/your/project")
        sys.exit(1)

    output_path = (os.path.abspath(os.path.expanduser(args.output))
                   if args.output else os.path.join(os.getcwd(), "story.html"))

    t0 = time.time()
    shown = 0
    for label, detail in _STEPS[:2]:
        shown = _progress(shown, label, detail)

    try:
        data = analyze(repo_path, title=args.title, max_commits=args.max_commits)
    except ValueError as e:
        print(f"\n  ✖ {e}\n")
        print("    · an empty repository has no story yet — make a commit first")
        print("    · if this is a fresh clone, check you're in the right folder\n")
        sys.exit(1)

    for label, detail in _STEPS[2:4]:
        shown = _progress(shown, label, detail)

    render_story(data, output_path, theme=args.theme, density=args.density)
    _progress(shown, *_STEPS[4])

    if args.json_out:
        json_path = os.path.abspath(os.path.expanduser(args.json_out))
        os.makedirs(os.path.dirname(json_path), exist_ok=True)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  model → {json_path}")

    t = data["totals"]
    print()
    print(f"  {t['commits']:,} commits · {t['contributors']} contributor"
          f"{'s' if t['contributors'] != 1 else ''} · {t['active_days']} active days")
    print(f"  {data['repo']['age_label']} old · story shape: {data['shape']['label']}")
    print(f"  Fingerprint: {data['fingerprint']['archetype']['label']}")
    print()
    print(f"  Done in {time.time() - t0:.1f}s → {output_path}")
    print("  Open it. Scroll slowly. Screenshot the certificate.")
    print()

    if args.open:
        import webbrowser
        webbrowser.open(f"file://{output_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
