#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  Commit Canvas — Run directly from cloned repo
#
#  Usage:
#    ./run.sh                       # current directory
#    ./run.sh /path/to/project      # specific repo
#    ./run.sh . --open              # open in browser
#    ./run.sh . -o story.html       # custom output
#
#  Requirements: Python 3.8+ and git (already on your machine)
#  ════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_PATH="${1:-.}"

# Parse remaining args for python
shift 2>/dev/null || true

python3 "$SCRIPT_DIR/cc/__main__.py" "$REPO_PATH" "$@"