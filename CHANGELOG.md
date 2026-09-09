# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0] — 2026-09-09

The Story Engine release — Commit Canvas becomes a storytelling platform.

### Added
- **Themes**: eight visual editions (Midnight, Neon, Paper, Terminal, Aurora, Blueprint, Mono, Sunset). Select before generating on the website, via `--theme` in the CLI, or switch live inside any story — presentation is a separate layer from analysis, so switching never re-runs the model.
- **Story density**: `--density compact|standard|cinematic` controls section depth and spacing.
- **Project pulse**: the whole history as one signature heartbeat line — chapter bands, milestone ticks, hover inspection.
- **Project archetype**: every story now identifies the project (The Comeback, The Marathon, The Movement…) with the evidence that earned the label.
- **Story cover hero**: "Commit Canvas presents" eyebrow, archetype title, derived subtitle.
- **Jump-to-story**: milestone chips in the time machine (Beginning → First release → … → Latest).
- **Made with Commit Canvas** signature footer on every story, linking back to the project.
- Website: theme picker, live GitHub star count in the nav, `/compare/` page (fact-checked against Gource/GitStock/GitHub docs), "Why Commit Canvas?" essay.
- Repository: `pyproject.toml` packaging, issue templates, PR template, enhanced CI (themed generation + website freshness checks), security boundaries documentation, README with Mermaid architecture diagrams.

### Changed
- Charts now read theme variables instead of hardcoded colors — every visualization follows the active edition.
- Time-machine milestone ticks cluster positionally (rapid releases no longer stack).
- `prev`/`next` transport buttons jump between milestones instead of single months.

### Fixed
- Punch-card cells keep their layout class when themed.

---

## [2.1.0] — 2026-09-01

The "say it anywhere" release — a full export studio, a sharper time machine, and a project website.

### Added
- **Export studio** (in every story): share-card PNGs (Open Graph, terminal, certificate, quote card), animated GIF export (fully client-side — no server ever sees your data), Markdown summary, and JSON data export.
- **Time machine v2**: milestone ticks on the scrubber, keyboard support (arrow keys, space, home/end), a speed control (0.5× / 1× / 1.5×), transport buttons, and a live insight line that narrates what changed each month.
- **Project website** (this site): landing page with a live embedded Flask story, feature pages, journal, examples, changelog, privacy & terms — all static, zero trackers.
- `--json` output now includes the exact analysis the renderer consumes (handy for tests and CI).
- GitHub Pages deployment with custom 404, sitemap.xml and robots.txt.

### Changed
- Sharing now renders cards locally to canvas — no external image service, no data leaves the page.
- Refreshed hero and section typography across the story.

### Fixed
- Calendar heatmap no longer stretches wide repos beyond the viewport on small screens (grid `min-width` bug).
- Transport controls now fit 320 px phones.

---

## [2.0.0] — 2026-09-01

The "your code has a story" release — a full product rebuild around one renderer, one model, and two entry points (CLI + web).

### 🎉 Added

- **Time Machine** — the flagship: scrub or autoplay through the repository's life; commits, contributors, file counts, net lines, and language mix update per month, with a representative commit for each month.
- **Story engine v2** — evidence-grounded chapters: The Beginning, The Sprint, The Silence, The Grind, The Launch, The Evolution. Every fact string traces to real timestamps/counts.
- **Developer fingerprint** — archetype system (Night Builder, Early Riser, Weekend Hacker, Sprinter, Marathoner, Shipper, Cleaner, Lone Wolf, Steady Hand) computed from the dominant author's git behavior, framed as behavior — not psychology.
- **Roast My Git** — deterministic, evidence-backed quips (vague commit names, giant commits, disappearances, 2–5 AM activity…).
- **The Moment & Glow Up** — the highest-scoring event in the project's life (biggest day / biggest commit / release) and first-commit → today.
- **Share cards** — 1200×630 and 1080×1920 PNG cards drawn client-side on canvas, plus a screenshot-ready certificate.
- **Web version** — paste a public GitHub URL on the landing page; the analysis runs fully in-browser (GitHub REST API), renders the same story, and assembles the same downloadable `story.html`. Mirrors the Python narrative rules in JS.
- **Landing page v2** — real embedded Flask story as the live demo, animated commit-graph hero, honest privacy section, `tools/build.py --check` keeps generated files honest in CI.
- **Full-lifetime calendar** + weekday×hour punch card, replacing the old last-52-weeks heatmap.
- `--json` CLI flag to export the raw analysis model; `--max-commits` cap for huge repos.

### 🔧 Changed / Fixed

- **True zero dependencies** — v1 shipped `run.sh` claiming "needs only git + python3" but the generator imported Jinja2 (and setup.py declared GitPython, unused). v2 renders by injecting JSON into a static shell: stdlib only.
- **Parser correctness** — v1 split git log fields on `|`, silently dropping/corrupting commits whose messages contained pipes. Now uses `\x1f` separators + `errors="replace"`.
- **Merge commits preserved** — v1 passed `--no-merges`, losing the branch/merge story. Merges are now counted and shown.
- **Tags read in one subprocess** — v1 ran one `git log` per tag (O(N) subprocesses). Now a single `for-each-ref`.
- **O(n) heatmap** — v1's heatmap was O(commits × 365) and anchored to *today* (old repos rendered an empty grid). Now a single-pass lifetime calendar.
- **File/line evolution** — replayed chronologically with `--summary` create/delete-mode authority (numstat alone cannot distinguish a file deletion from a pure line-shrink).
- New design system (`web/story.css`): editorial dark, one accent, system type, reduced-motion support, semantic sections, sr-only chart summaries.

### 🗑️ Removed

- Jinja2 template pipeline (`cc/templates/`), `cc/parser.py`, `cc/generator.py`, unused requirements.

---

## [1.0.0] — 2026-06-11

### 🎉 Added

- **Core Parser** (`cc/parser.py`):
  - Commit extraction using `%at` (author timestamps)
  - Streak calculation (longest streak, current streak, active days)
  - Contributor ranking with percentage breakdown
  - Monthly timeline grouping with density scores
  - Auto-detected milestones (first commit, version tags, bursts, comebacks)
  - 52-week contribution heatmap generation
  - Story arc detection engine (fresh_start, growth, mature, burst, consistent)

- **HTML Generator** (`cc/generator.py`):
  - Jinja2-powered template rendering
  - Full data shaping for template compatibility

- **Elite Template** (`cc/templates/story.html`):
  - Cinematic dark theme (1442+ lines of CSS/JS)
  - Ambient gradient breathing + grid texture background (no particles)
  - Scroll-triggered CSS animations via Intersection Observer
  - Horizontal draggable timeline with density bars
  - GitHub-style 52-week activity heatmap
  - Ranked contributors with animated progress bars
  - Shareable contribution certificate with glowing gradient border
  - Responsive design (mobile, tablet, desktop)

- **CLI Entry Point** (`cc/__main__.py`):
  - `commit-canvas [repo_path] [--output] [--title] [--open]`
  - Progress output with stats summary

- **Test Suite** (`tests/test_commit_canvas.py`):
  - 28 comprehensive tests covering all modules
  - Fixtures for git_repo, empty_git_repo, single_commit_repo, tagged_repo, multi_author_repo
  - Edge case coverage (special chars, long messages, no tags)

- **PyPI Packaging** (`setup.py`, `requirements.txt`):
  - `pip install commit-canvas` ready
  - Entry point: `commit-canvas` command
  - Proper metadata, classifiers, keywords

- **GitHub Actions CI** (`.github/workflows/test.yml`):
  - Automated pytest on push and PR to main

- **Documentation**:
  - Full README with architecture diagrams, feature tables, CLI reference
  - CONTRIBUTING.md with development guide
  - CODE_OF_CONDUCT.md

### 🔧 Fixed

- Timestamps used `%ct` (committer time) → switched to `%at` (author time) for accurate streak detection
- Jinja2 missing `max`/`min` globals → added to environment globals
- Test fixture commits on same day → staggered via `--date` flags
- Error message regex case sensitivity → fixed with case-insensitive pattern

---

## [0.0.0] — 2026-06-11 (Concept)

- Project idea: Turn git history into a cinematic animated HTML page
- Gap identified: No tool produces animated, story-structured, shareable HTML for individual repos
- Research completed: Competitor landscape analyzed, saturation confirmed