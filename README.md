<div align="center">

# Commit Canvas

### Your code has a story. Show it.

Turn any git repository into a cinematic, shareable story — **chapters, a time machine, a developer fingerprint, a roast** — generated from real commit data.

One command. One self-contained HTML file. Zero cloud, zero accounts, zero dependencies.

[**→ Make yours on the web**](https://ahmadrrrtx.github.io/commit-canvas/) · [**→ See a real story (Flask, 5,600 commits)**](https://ahmadrrrtx.github.io/commit-canvas/demo/flask-story.html)

</div>

---

```bash
git clone https://github.com/ahmadrrrtx/commit-canvas
cd commit-canvas
./run.sh /path/to/your-project     # → story.html
```

## What you get

Open `story.html`. Scroll slowly.

| Section | What it shows |
|---|---|
| **Hero** | The project's story shape — *The Marathon, The Sprint, The Climb, The Return* — classified from real velocity data |
| **The Story** | Chapters grounded in evidence: *The Beginning · The Sprint · The Silence · The Grind · The Launch · The Evolution* |
| **Time Machine** ⏱️ | Press play and watch the project assemble itself — commits, contributors, files, and code growth, month by month |
| **The Rhythm** | Punch card (weekday × hour), full-lifetime calendar, streaks — the project's pulse |
| **Fingerprint** | The dominant author's git behavior as an archetype: *The Night Builder, The Shipper, The Sprinter…* |
| **The People** | Contributors ranked, badged, timed — first appearance to last |
| **The Moment & Glow Up** | The single most significant event, and *first commit → today* |
| **Roast My Git** 🔥 | Affectionately brutal observations, each one backed by a real number |
| **Certificate & Share Cards** | A screenshot-ready certificate plus downloadable cards (1200×630 and 1080×1920), drawn locally on your machine |

Every factual claim comes from your repository. Nothing is invented, nothing is random, nothing leaves your machine. The output file makes **zero network requests**.

## Two ways in

**1 · The local CLI (works with private repos, fully offline)**

```bash
./run.sh .                         # current directory
./run.sh /path/to/repo             # any repository
./run.sh . --title "My Project"    # custom title
./run.sh . --open                  # open in browser after
./run.sh . --max-commits 5000      # cap huge histories
python -m cc . --json model.json   # also export the raw analysis model
```

**2 · The web version (zero install)**

Paste any public GitHub URL on [the landing page](https://ahmadrrrtx.github.io/commit-canvas/) — the analysis runs in your browser via the GitHub API, renders the full story, and can download the same self-contained `story.html`. Private repos: use the CLI.

## How it works

```
.git folder ──▶ one git log pass ──▶ deterministic analysis ──▶ story.html
                   commits, merges, tags,       chapters · shape · rhythm
                   authors, files, lines,       fingerprint · roast · moment
                   languages, hours, days       months × snapshots (time machine)
```

- **One subprocess.** The whole history — commits, parent graphs, decorations, per-file numstat, create/delete modes — is read in a single `git log --all --numstat --summary` pass using a `\x1f` field separator (commit messages containing `|` or unicode are safe). A 30,000-commit repository analyzes in about 2 seconds.
- **Merge-aware.** Merge commits are kept and counted as part of the story, not thrown away.
- **Real snapshots.** File and line evolution is replayed chronologically with authoritative create/delete tracking, so the time machine's "state of the codebase" is measured, not guessed.
- **One renderer.** `canvas.html` is a dependency-free shell (inline CSS + JS + your data). The CLI injects the model into it; the web flow fetches the same shell in-browser. Same story, either path.
- **AI-free by design.** The narrative engine is deterministic. Every "chapter" is a rule with a timestamp behind it.

## Build & development

`canvas.html` and `index.html` are **generated** — never edit them by hand:

```bash
python tools/build.py          # rebuild from web/ sources
python tools/build.py --check  # verify committed outputs are fresh (runs in CI)
python -m pytest tests/ -v     # engine + assembly + build-freshness tests
```

Sources live in `web/`: `app.js` (story renderer), `story.css` (design system), `landing.*` (landing page), `landing.js` (in-browser GitHub analyzer).

## Design decisions

- **Dark, editorial, restrained.** One accent color. System type. Data first, beauty second.
- **Zero requests in artifacts.** Story files work offline, forever — no fonts, no CDNs, no tracking.
- **Motion with meaning.** Count-ups, scroll reveals, a playable timeline — all disabled under `prefers-reduced-motion`.
- **Accessible.** Semantic sections, labeled controls, keyboard-scrubbable timeline, sr-only chart summaries, color-independent facts.

## Why this over…?

- **GitHub Insights** — bars and counts vs. chapters, silences, comebacks, and a fingerprint
- **Gource / git-story** — renders a video; Commit Canvas renders a portable, interactive, *shareable* HTML artifact
- **github-readme-stats** — aggregate profile counters vs. the story of one repository, with evidence
- **"GitHub Wrapped" clones** — user-level API dashboards vs. repo-level, lifetime, deterministic narrative that also works offline on private code

## Contributing

```bash
git clone https://github.com/ahmadrrrtx/commit-canvas
cd commit-canvas
python -m pytest tests/ -v
python tools/build.py
```

Small, focused PRs welcome — especially new chapter rules (with tests proving they fire on real patterns).

## License

MIT — free to use, modify, share.

---

<div align="center">

*Built by [Muhammad Ahmad (RRRTX)](https://github.com/ahmadrrrtx) · Open Source · Zero cost · Zero auth · Pure git*

**[Star on GitHub](https://github.com/ahmadrrrtx/commit-canvas)** · **[Live example](https://ahmadrrrtx.github.io/commit-canvas/demo/flask-story.html)** · **[Make yours](https://ahmadrrrtx.github.io/commit-canvas/)**

</div>
