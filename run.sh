#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  Commit Canvas — Run directly from cloned repo
#
#  Zero dependencies. Needs only: git + python3.
#
#  Usage:
#    ./run.sh                       # current directory
#    ./run.sh /path/to/project      # specific repo
#    ./run.sh . --open              # open in browser
#    ./run.sh . -o my-story.html    # custom output name
#
#  Requirements: Python 3.8+ and git (already on your machine)
#  ════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_PATH="${1:-.}"

# Check for python3
if ! command -v python3 &> /dev/null; then
    echo ""
    echo "  ✖ python3 not found."
    echo "    Install Python 3.8+ to run Commit Canvas."
    echo "    → https://www.python.org/downloads/"
    echo ""
    exit 1
fi

# Check for git
if ! command -v git &> /dev/null; then
    echo ""
    echo "  ✖ git not found."
    echo "    Git is required to read repository history."
    echo "    → https://git-scm.com/downloads"
    echo ""
    exit 1
fi

# Parse remaining args for python
shift 2>/dev/null || true

PYTHONPATH="$SCRIPT_DIR" python3 "$SCRIPT_DIR/cc/__main__.py" "$REPO_PATH" "$@"