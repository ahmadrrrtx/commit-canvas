# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - Cinematic dark theme (1800+ lines of CSS/JS)
  - Animated particle field (40 ambient particles)
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