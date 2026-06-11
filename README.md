# Commit Canvas

<div align="center">

### Your git history deserves to be seen, not just read.

One command. A single HTML file. Every commit you've ever made — transformed into a cinematic, animated, shareable story page.

```
git clone https://github.com/ahmadrrrtx/commit-canvas.git
cd commit-canvas
./run.sh .
# → story.html — open it in your browser
```

**No account. No API key. No server. No cost. Zero network requests.**

**[Live Story: Vite](https://ahmadrrrtx.github.io/commit-canvas/demo/vite-story.html)**
**[Live Story: Commit Canvas](https://ahmadrrrtx.github.io/commit-canvas/demo/commit-canvas-story.html)**
**[Landing Page](https://ahmadrrrtx.github.io/commit-canvas/)**

</div>

---

## The story, not the stats

GitHub shows you data. Commit Canvas shows you a story.

Not a chart. Not a dashboard. Not a badge. A designed piece of work that represents the work you did.

The page opens with a cinematic title reveal. Below that, the narrative engine classifies your project as **"The Marathon"**, **"The Climb"**, **"The Sprint"**, or **"The Return"** — based on your actual commit patterns, not just raw counts.

Scrolling through the page feels like moving through a film strip:

- An animated timeline draws itself as you scroll
- Milestone cards surface your first commit, your releases, your comeback moments
- An activity ring replaces the generic GitHub heatmap with something iconic
- Contributors are ranked with gold, silver, and bronze badges

And at the bottom: a **proof-of-work certificate**. Screenshot it. Post it on LinkedIn. Share it anywhere.

---

## Getting started

### The zero-dependency path (main flow)

```bash
git clone https://github.com/ahmadrrrtx/commit-canvas.git
cd commit-canvas
./run.sh /path/to/your-project
```

That's it. Works immediately. `run.sh` is a shell script — it needs nothing but `git` and `python3`, which are already on every developer's machine.

Options:
```bash
./run.sh .                          # current directory
./run.sh /path/to/repo              # specific repo
./run.sh . --open                   # auto-open in browser
./run.sh . -o my-story.html         # custom output name
./run.sh . --title "My Project"     # custom project name
```

### The Python path (if you prefer)

```bash
python -m cc .
python -m cc /path/to/repo --open --title "My Project"
```

### Install globally (optional)

If you want `commit-canvas` available from anywhere:

```bash
pip install git+https://github.com/ahmadrrrtx/commit-canvas.git
# then use anywhere:
commit-canvas .
```

---

## What you get

A fully self-contained HTML file. All CSS inline. All JavaScript inline. Zero network requests. Works completely offline.

| Section | What it shows |
|---------|--------------|
| **Hero** | Cinematic title reveal, story arc label, animated stats |
| **Timeline** | Monthly film strip — self-drawing as you scroll, drag to explore |
| **Turning Points** | First commit, releases, comebacks, peak months |
| **Activity Ring** | SVG circle — your consistency pattern at a glance |
| **The Team** | Gold/silver/bronze contributor ranking with animated bars |
| **Proof of Work** | Shareable certificate — designed to be screenshotted |

---

## Story arcs — the narrative engine

The tool reads your commit patterns and tells you what kind of project you have:

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

- **Python** 3.8+
- **git** (already on your machine)

No packages to install. No accounts to create. No API keys. No cloud. No cost.

---

## Why this over...

**vs GitHub Insights** — GitHub shows bars. We show a story. A title reveal, a detected arc, a certificate.

**vs CLI tools (GitStats, git-quick-stats)** — Terminal text has zero shareability. One screenshot of a Commit Canvas story says more than a hundred CLI outputs.

**vs Video tools (Gource, git-story)** — They produce MP4s. Ours produces a portable HTML file you can embed anywhere.

**vs Profile tools (github-readme-stats)** — They show all repos combined. Commit Canvas tells the story of one specific project.

---

## The output

The HTML file is a single, self-contained artifact. Copy it anywhere — GitHub Pages, Vercel, Netlify, your portfolio, email it, screenshot it. It's yours.

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

<div align="center">

*Built by [Muhammad Ahmad (RRRTX)](https://github.com/ahmadrrrtx) · Open Source · Zero cost · Zero auth · Pure git*

**[Star on GitHub](https://github.com/ahmadrrrtx/commit-canvas)** · **[See a live story](https://ahmadrrrtx.github.io/commit-canvas/demo/vite-story.html)** · **[Landing page](https://ahmadrrrtx.github.io/commit-canvas/)**

</div>