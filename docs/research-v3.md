# Commit Canvas — V3 Research: "The Story Engine"

*Internal research document backing the v3 release decisions. Sources: competitor
sites/docs as noted; all claims on the public `/compare/` page are limited to
what is verified here.*

## Competitor matrix (verified)

| Product | Main purpose | Visualization | Storytelling | Animation | Export | Shareability | Offline | CLI | Best for |
| ------- | ------------ | ------------- | ------------ | --------- | ------ | ------------ | ------- | --- | -------- |
| **Commit Canvas** | Git history → cinematic story | Narrative sections, pulse, timeline, fingerprint | Core product: chapters, moments, archetypes | Time machine (scrub + play) | PNG, GIF, WebM, SVG, MD, JSON, self-contained HTML | One portable HTML file, social cards | ✓ (CLI, zero requests) | ✓ | Telling a project's story |
| GitHub Insights | Repo activity analytics | Graphs, contributors, network | — | — | — (hosted only) | URL only | — | — | Monitoring a hosted repo's activity |
| Gource | VCS history animation | Animated file-tree with avatars | — | ✓ (real-time playback) | Video via ppm pipe + external encoder | Video files | ✓ | ✓ | Dramatic videos of a codebase growing |
| GitStock | Last-100-commits chart | Candle chart of commits | — | Timeline replay | Image, SVG URL, Markdown embed, MP4 | Embeds + video | — (GitHub API, public repos) | — | Quick look at recent commit intensity |
| GitDiagram | Repo → architecture diagram | Interactive AI-generated diagrams | — | — | — | URL | — (AI backend, public repos) | — | Understanding code structure today |
| github-readme-stats | Profile stat cards | SVG stat cards | — | — | SVG (URL-param themed) | README embeds | — | — | Profile decoration |
| Remotion Unwrapped | Year-in-review video | Video scenes | Year framing | ✓ | Video (render pipeline) | Video | — | — (TS code) | Wrapped-style videos, dev effort |
| gilot | Git log analysis | 4 static engineering graphs | — | — | Images | Images | ✓ | ✓ | Team engineering metrics |
| DigestDiff | AI summaries of history | Text | AI prose | — | — | — | — | — | Quick AI summaries |

## What each does better (honest)

- **GitHub Insights**: zero friction, always current, authoritative.
- **Gource**: spatial animation is genuinely hypnotic; multi-VCS support.
- **GitStock**: dead-simple embeds; MP4 export; zero-thought UX.
- **github-readme-stats**: themes proved people love recoloring shareable cards — validation for our theme system.
- **GitDiagram**: solves structure (today), we solve time (history).

## What Commit Canvas already does better

Narrative engine (chapters/moments), full-lifetime (not last-100), offline +
private repos via CLI, one self-contained HTML file, deterministic
evidence-grounded claims, export studio, developer fingerprint, zero
dependencies, zero accounts.

## What nobody does properly

- **Themed, cinematic, one-file story pages** with narrative + interactive time
  machine. Gource = video only; GitStock = one chart, 100 commits; Insights =
  hosted dashboard; Unwrapped = heavy render pipeline.
- **Project identity** (archetype like "The Comeback") as a shareable artifact.
- **A recognizable signature visual** for a project's whole life (→ Project Pulse).

## Feature priorities for v3

1. Theme system (8 editions + picker + post-generation switching) — architecture
   already separates model (JSON) from renderer (app.js), so this is a
   presentation-layer feature. ✓ aligns with zero-backend philosophy.
2. Project Pulse — signature whole-life visualization.
3. Story density (compact / standard / cinematic).
4. Jump-to-story navigation in the time machine.
5. Project archetype identity + shareable cover.
6. "Made with Commit Canvas" story footer.
7. Website: star CTA, Why Commit Canvas? article, /compare/ page.
8. Repo: README + pyproject + CI + templates + security docs.

## Technical architecture decisions

- Themes = `body[data-theme]` token overrides in story.css; charts refactored
  from hardcoded hex to CSS variables. No JS re-analysis on theme switch —
  re-render from the in-memory model only.
- Density = `body[data-density]` CSS layer; never removes sections the model
  guarantees (honesty), only presentation depth.
- Pulse = SVG area/path from `months[].commits`, chapter-segmented, milestone
  ticks, hover inspection; O(n) once, no per-frame work.
- Exports unchanged in philosophy: browser-native only (no MP4 encoder shipped);
  WebM→MP4 conversion documented for those who need it.
- Packaging: move to `pyproject.toml` (setuptools backend), keep `run.sh`,
  keep stdlib-only runtime.

## Design direction

"Apple keynote × Spotify Wrapped × git culture." Dark default (midnight),
typography-led (mono), accent used sparingly. Light themes (paper, mono) must
remain premium — editorial, not white-default. Every theme keeps the same
layout skeleton so the story reads identically; only the edition changes.
