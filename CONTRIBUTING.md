# Contributing to Commit Canvas

Thank you for your interest in contributing! This document covers everything you need to know to get involved.

---

## 🎯 How Can I Help?

- 🐛 **Bug Reports** — Something not working? Open an issue with details.
- 💡 **Feature Ideas** — Have a cool idea? Share it in an issue.
- 📖 **Documentation** — Improve docs, add examples, fix typos.
- 🎨 **Design** — Better visuals, new themes, improved animations.
- 🧪 **Testing** — Write tests for new or existing functionality.
- 🔧 **Code** — Implement features, refactor, optimize.

---

## 🛠️ Development Setup

```bash
# Clone the repository
git clone https://github.com/ahmadrrrtx/commit-canvas.git
cd commit-canvas

# Install in editable mode (with dev dependencies)
pip install -e .

# Install test dependencies
pip install pytest

# Run tests
python -m pytest tests/ -v
```

---

## 🏗️ How It Works Internally

The codebase is deliberately small — four files carry the product:

| File | Role |
| --- | --- |
| `cc/analyzer.py` | Single-pass git log parser → story model (dict). Deterministic, evidence-grounded. |
| `cc/story.py` | Model → HTML: loads the shell, injects the JSON payload, sets theme/density. |
| `web/app.js` | The renderer: builds every section from the model. Also runs in the browser (website flow). |
| `web/story.css` | The design system + 8 theme token layers. |

**The core principle: analysis and presentation are separate layers.** The story model is pure data (JSON-serializable — that's what `--json` writes). The renderer never re-derives facts; CSS themes never touch data. This is why themes switch instantly and why the same model can be re-rendered by future renderers.

**Adding a theme:** add a `[data-theme="name"] { --tokens… }` block in `web/story.css`, add it to `THEMES` in `web/app.js`, the CLI choices in `cc/__main__.py`, `THEMES` in `cc/story.py`, and the landing picker list in `web/landing.js`. Rebuild with `python tools/build.py`.

**Adding a story section:** write a `function sectionName(root, d)` in `web/app.js`, call it in `render()`, use only model data (never fabricate — if the data doesn't support a claim, don't render it), and extend `web/story.css`. Then rebuild and regenerate the demo stories.

**Website:** all site pages live in `web/pages/`, are assembled by `tools/build.py`, and must stay fresh (`python tools/build.py --check` runs in CI).

---

## 🧪 Testing Guidelines

- All new features **must** include tests
- All bug fixes **should** include a regression test
- Run `python -m pytest tests/ -v` before submitting PR
- Tests should be deterministic (no flaky tests)

### Writing Tests

```python
# Use fixtures for repo setup
def test_new_feature(git_repo):
    from cc.analyzer import new_function
    result = new_function(git_repo)
    assert result == expected
```

---

## 🌿 Branch Strategy

```
main          ← stable, always deployable
├── feature/  ← your new feature work
├── fix/      ← bug fixes
├── docs/     ← documentation improvements
└── refactor/ ← code refactoring (no behavior change)
```

### Creating a PR

1. Fork the repo and create a branch:
   ```bash
   git checkout -b feature/my-awesome-feature
   ```

2. Make your changes and commit:
   ```bash
   git commit -m "feat: add awesome feature"
   ```

3. Push and open a Pull Request:
   ```bash
   git push origin feature/my-awesome-feature
   ```

4. Wait for review — I'll get back to you within 48 hours.

---

## 📐 Code Style

- **Python**: Follow PEP 8, use `black` for formatting
- **JavaScript**: Vanilla JS only, no frameworks in output
- **CSS**: BEM-style naming, CSS variables for theming

---

## 🔍 Before Submitting

- [ ] All tests pass: `python -m pytest tests/ -v`
- [ ] No new linting errors
- [ ] New features have docstrings
- [ ] Commits are descriptive and atomic
- [ ] PR description explains **what** and **why**, not just **how**

---

## 💬 Questions?

- Open an issue for bugs or feature requests
- Star the repo if you find it useful!
- Share your generated story pages — I'd love to see them

---

*Thank you for making Commit Canvas better!* ✨