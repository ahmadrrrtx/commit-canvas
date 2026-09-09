# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.x     | ✅ Currently supported |
| 2.x     | ✅ Maintained (critical fixes only) |
| 1.x     | ❌ Not supported     |

---

## Reporting a Vulnerability

If you discover a security vulnerability in Commit Canvas, please report it responsibly:

1. **Email**: Send details to `ahmadrrrtx@gmail.com` with subject "SECURITY: Commit Canvas"
2. **Do NOT** open a public GitHub issue for security vulnerabilities
3. **Include** in your report:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

---

## What to Expect

- **Acknowledgment**: Within 24-48 hours
- **Initial Response**: Within 1 week with assessment
- **Resolution**: As quickly as possible, depending on severity

---

## Security Design Notes

Commit Canvas is designed with security in mind:

| Concern | How It's Handled |
|---------|-----------------|
| **Data Access** | Only reads local `.git` directory — no network requests |
| **External APIs** | Zero — works completely offline |
| **Credential Storage** | None — no auth, no tokens, no secrets |
| **Output HTML** | Self-contained — no external script loading |
| **User Input** | Escaped via Jinja2 autoescape for HTML safety |

---

*Thank you for helping keep Commit Canvas secure!*

## Security Boundaries

Commit Canvas is deliberately architected so there is very little to attack:

- **The CLI makes zero network requests.** It reads a local `.git` directory and writes one HTML file. There is no server, database, telemetry, or update check — verifiable in the source (`cc/`).
- **The generated story file makes zero network requests.** All rendering, charting and exports run locally in the browser. The only exception: stories analyzed *via the website* fetch GitHub's public API at analysis time, in your browser, with no credentials.
- **Untrusted commit metadata is escaped.** Author names and commit messages come from the repository being analyzed and are HTML-escaped and JSON-escaped before embedding. A malicious repository cannot inject scripts into a generated story. If you find an injection path, report it — this is a boundary we defend.
- **Shell execution is a single fixed `git log` invocation.** No repository content is ever passed to a shell; arguments are fixed flags. Paths are passed to the subprocess via argument lists, not shell strings.
- **No archive extraction, no temp-file execution.** The tool writes exactly one file, to a path you choose.

## Data Handling

- Nothing you analyze is uploaded, stored, or logged anywhere.
- The web version talks only to `api.github.com` (public, anonymous, no key).
- Generated files contain commit metadata (authors, dates, messages) from the analyzed repository — share them only if you're comfortable making that metadata public.
