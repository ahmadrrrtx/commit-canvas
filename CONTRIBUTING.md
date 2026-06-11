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

## 🧪 Testing Guidelines

- All new features **must** include tests
- All bug fixes **should** include a regression test
- Run `python -m pytest tests/ -v` before submitting PR
- Tests should be deterministic (no flaky tests)

### Writing Tests

```python
# Use fixtures for repo setup
def test_new_feature(git_repo):
    from cc.parser import new_function
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