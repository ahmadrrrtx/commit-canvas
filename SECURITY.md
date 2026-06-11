# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Currently supported |
| < 1.0   | ❌ Not supported       |

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