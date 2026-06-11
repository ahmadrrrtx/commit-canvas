# 🎨 Commit Canvas

> Turn any git repository into a beautiful, animated, shareable story page — zero cost, zero auth, one command.

```bash
pip install commit-canvas
cd your-repo
commit-canvas
# → story.html — open it in your browser
```

**No server. No database. No API keys. Just your story, told beautifully.**

---

## ✨ What It Does

Commit Canvas reads your git repository and generates a single, self-contained HTML file that tells the story of your project — complete with an animated timeline, milestone markers, activity heatmap, contributor rankings, and a shareable contribution certificate.

```
Before:                              After:
┌─ Terminal text ─┐                  ┌─ Cinematic story page ──────────────┐
│ $ git log --oneline│               │                                      │
│ a1b2c3d Fix bug    │               │  Vite — Next Gen Frontend Tooling    │
│ e4f5g6h Add feature│               │                                      │
│ i7j8k9l Merge PR   │               │  🎭 Consistent • Deliberate Work     │
│ $                 │               │                                      │
└───────────────────┘               │  50    18      3      26              │
                                    │  Commits  Days  Streak  Authors        │
                                    │                                      │
                                    │  [Animated particle field + hero]     │
                                    │  [Horizontal draggable timeline]      │
                                    │  [Milestone cards with emoji]         │
                                    │  [GitHub-style activity heatmap]      │
                                    │  [Contributors with rank badges]      │
                                    │                                      │
                                    │  ┌────────── SHAREABLE ───────────┐   │
                                    │  │ 🏆 Certificate of Achievement  │   │
                                    │  │ 50 commits · 18 active days   │   │
                                    │  │ [Share This Story] button      │   │
                                    │  └────────────────────────────────┘   │
                                    └──────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# Install
pip install commit-canvas

# Run on any repo
commit-canvas /path/to/your-repo

# Use current directory
commit-canvas .

# Custom title and output
commit-canvas . --title "My Awesome Project" --output ~/Desktop/story.html

# Auto-open in browser
commit-canvas /path/to/repo --open
```

**Output is a single `.html` file** — host it anywhere, share it anywhere, screenshot the certificate and post it on LinkedIn.

---

## 🎬 See It In Action

Live demo stories (generated with Commit Canvas):

| Project | Commits | Contributors | Story Arc | Link |
|---------|---------|-------------|-----------|------|
| **Vite** | 50 (last 50) | 26 | Burst | [Open →](/demo/vite-story.html) |
| **Commit Canvas** | 18 | 1 | Consistent | [Open →](/demo/commit-canvas-story.html) |

> ⚡ These demos use shallow clones (limited commits) for fast generation. Run on your own repos for full history.

---

## 🔍 What's Included

| Section | What You Get |
|---------|-------------|
| **Hero** | Repo name, story arc badge, animated particle field, all key stats |
| **Timeline** | Horizontal draggable monthly timeline, color-coded by activity level |
| **Milestones** | Auto-detected: first commit, version tags, peak months, comeback moments |
| **Heatmap** | GitHub-style 52-week contribution grid, hover for exact counts |
| **Contributors** | Gold/silver/bronze ranked badges, animated progress bars |
| **Certificate** | The shareable artifact — premium card with glowing gradient border |

---

## 🎨 Design Philosophy

- **Cinematic dark theme** — Premium midnight design, not another gray dashboard
- **CSS-only animations** — No framework dependencies in the output HTML
- **Self-contained** — All CSS and JS inline, zero network calls, works offline
- **Story-first** — The narrative engine gives emotional context, not just stats

---

## 🛠️ Technical Stack

```
Parser    →  Python + subprocess (reads .git directly, no GitPython needed at runtime)
Template  →  Jinja2 (clean separation of data and presentation)
Output    →  Single self-contained HTML file (no external dependencies)
Styling   →  Inline CSS (zero network requests, works offline)
Animations→  CSS keyframes + vanilla JS (smooth, lightweight)
```

---

## 🤝 Contributing

Found a bug or want a feature? Open an issue! PRs welcome.

```bash
git clone https://github.com/ahmadrrrtx/commit-canvas.git
cd commit-canvas
pip install -e .
python -m pytest tests/ -v   # Run tests
```

---

## 🌟 Why Commit Canvas?

| Other Tools | Commit Canvas |
|-------------|--------------|
| Static HTML (GitStats) | Animated cinematic pages |
| Video output (Gource) | Shareable HTML file |
| CLI-only, no visuals | Full visual story with certificate |
| Profile-wide only | Per-repository story |
| Requires API keys | Works completely offline |
| Analytics dashboards | Social proof artifact for LinkedIn/portfolio |

---

## 📝 License

MIT — Free to use, modify, and share.

---

*Built with 🔥 by [RRRTX](https://github.com/ahmadrrrtx) · Zero cost · Zero auth · Pure git*