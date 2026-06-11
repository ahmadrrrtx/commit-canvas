# Commit Canvas

**Turn your git history into something worth sharing.**

One command. A single HTML file. Your project's story, told like it deserves to be told.

```
git clone https://github.com/ahmadrrrtx/commit-canvas.git
cd commit-canvas
./run.sh /path/to/your-project
# → opens story.html
```

No account. No API key. No server. No cost. Just your work, in a form people can actually see.

---

## What you get

A self-contained HTML file that opens in any browser. It tells your project's story with:

- **Cinematic title reveal** — the repo name types itself in, line draws beneath it
- **Story arc detection** — understands whether your project is "The Marathon", "The Climb", "The Sprint", "The Return"
- **Animated timeline** — drags like a film strip, nodes reveal as you scroll
- **Turning points** — first commit, releases, comeback moments, peak months
- **Activity ring** — a single visualization that captures consistency vs chaos
- **Ranked contributors** — gold, silver, bronze, with animated progress bars
- **The artifact** — a shareable proof-of-work card designed to be screenshotted and posted on LinkedIn

---

## Usage

### From a cloned repo (works immediately)

```bash
./run.sh                           # current directory
./run.sh /path/to/project          # specific repo
./run.sh . --open                  # open in browser
./run.sh . -o my-story.html        # custom output
```

### With Python

```bash
python -m cc .
python -m cc /path/to/repo --title "My Project" --open
```

---

## The output

The HTML file is fully self-contained — no external requests, works offline, no dependencies to load. Open it, scroll through it, screenshot the certificate at the bottom and post it anywhere.

**This is the artifact.** Not a chart. Not a dashboard. Not a badge. A designed piece of work that represents the work you did.

---

## Live demos

| Repo | Commits | Story Arc | Try |
|------|---------|-----------|-----|
| Vite | 50 recent | The Sprint | [View](https://ahmadrrrtx.github.io/commit-canvas/demo/vite-story.html) |
| Commit Canvas | 18 | The Marathon | [View](https://ahmadrrrtx.github.io/commit-canvas/demo/commit-canvas-story.html) |

---

## Story arcs

The narrative engine doesn't just show stats — it detects the shape of your project:

| Arc | What it means |
|-----|--------------|
| **The Marathon** | Consistent work over a long time. Not flashy. Just showed up. |
| **The Climb** | Started quiet, got louder. Real momentum building. |
| **The Sprint** | Built in intense bursts. Deep work sessions. |
| **The Return** | Projects die when makers stop. This one didn't. |
| **The Foundation** | Started strong, found its rhythm. Mature and stable. |
| **Fresh Start** | Just begun. Every great project starts here. |

---

## Requirements

- Python 3.8+
- git (already installed on every developer's machine)

That's it. No packages to install, no accounts to create.

---

## Install (optional)

If you want `commit-canvas` available from anywhere on your system:

```bash
pip install git+https://github.com/ahmadrrrtx/commit-canvas.git
```

Or in editable mode from a clone:

```bash
pip install -e .
```

Then `commit-canvas .` works from anywhere.

---

## Contributing

```bash
git clone https://github.com/ahmadrrrtx/commit-canvas.git
cd commit-canvas
pip install -e .
pip install pytest
python -m pytest tests/ -v
```

---

## License

MIT — free to use, modify, share.

---

*Built by [RRRTX](https://github.com/ahmadrrrtx) · Zero cost · Zero auth · Pure git*