# Commit Canvas

<div align="center">

### Turn your git history into something worth sharing.

One command. A single HTML file. Your project's story — cinematic, animated, designed to be screenshotted and posted anywhere.

```bash
git clone https://github.com/ahmadrrrtx/commit-canvas.git
cd commit-canvas
./run.sh /path/to/your-project
# → story.html — open it in your browser
```

**No account. No API key. No server. No cost.**

[Live Demo (Vite)](https://ahmadrrrtx.github.io/commit-canvas/demo/vite-story.html)
· [Live Demo (Commit Canvas)](https://ahmadrrrtx.github.io/commit-canvas/demo/commit-canvas-story.html)
· [Landing Page](https://ahmadrrrtx.github.io/commit-canvas/)

</div>

---

## What this actually is

It's a single HTML file that tells your project's story. Not a chart. Not a dashboard. Not a badge. A designed piece of work that represents the work you did.

The page opens with a cinematic title reveal. Below that, the narrative engine classifies your project as "The Marathon", "The Climb", "The Sprint", or "The Return" — based on your actual commit patterns, not just raw counts.

Scrolling through the page feels like moving through a film strip. An animated timeline draws itself. Milestone cards surface your first commit, your releases, your comeback moments. An activity ring replaces the generic GitHub heatmap with something iconic. Contributors are ranked with gold, silver, and bronze badges.

At the bottom: a proof-of-work certificate. Screenshot it. Post it on LinkedIn. Share it anywhere.

---

## Getting started

### Option 1 — Clone and run (instant, zero setup)

```bash
git clone https://github.com/ahmadrrrtx/commit-canvas.git
cd commit-canvas
./run.sh /path/to/your-project
```

That's it. Works immediately. No `pip install`, no account, no nothing.

### Option 2 — Python (if you prefer)

```bash
python -m cc .
python -m cc /path/to/repo --title "My Project" --open
```

### Options for customization

```bash
./run.sh .                          # current directory
./run.sh /path/to/repo              # specific repo
./run.sh . --open                   # auto-open in browser
./run.sh . -o my-story.html         # custom output name
./run.sh . --title "My Project"     # custom project name
```

---

## What you get

| Section | What it shows |
|---------|--------------|
| **Hero** | Cinematic title reveal, story arc label, animated stats |
| **Timeline** | Monthly film strip, self-drawing as you scroll, drag to explore |
| **Turning Points** | First commit, releases, comebacks, peak months |
| **Activity Ring** | SVG circle — your consistency pattern, at a glance |
| **Contributors** | Gold/silver/bronze ranking with animated progress bars |
| **Certificate** | Shareable proof-of-work card — designed to be screenshotted |

---

## Story arcs

The narrative engine classifies your project by its actual shape:

| Arc | What it means |
|-----|--------------|
| **The Marathon** | Consistent work over a long time. Not flashy. Just showed up. |
| **The Climb** | Started quiet, got louder. Real momentum building. |
| **The Sprint** | Built in intense sessions. Deep work, compressed into bursts. |
| **The Return** | Projects die when makers stop. This one didn't. That means something. |
| **The Foundation** | Started strong, found its rhythm. Mature, stable, proven. |
| **Fresh Start** | Just begun. Every great project starts here. |

---

## Requirements

- Python 3.8+
- git (already on every developer's machine)

No packages to install. No accounts to create.

---

## Install as a command (optional)

If you want `commit-canvas` available from anywhere:

```bash
pip install git+https://github.com/ahmadrrrtx/commit-canvas.git
# then use anywhere:
commit-canvas .
```

Or in editable mode from a clone:

```bash
git clone https://github.com/ahmadrrrtx/commit-canvas.git
cd commit-canvas
pip install -e .
```

---

## The output artifact

The HTML file is fully self-contained. All CSS is inline. All JavaScript is inline. Zero network requests. Works completely offline. Copy it anywhere — GitHub Pages, Vercel, Netlify, your portfolio, email it, screenshot it.

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

*Built by [Muhammad Ahmad (RRRTX)](https://github.com/ahmadrrrtx) · Open Source · Zero cost · Zero auth · Pure git*