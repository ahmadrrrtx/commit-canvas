#!/usr/bin/env python3
"""
Commit Canvas — Turn Git History Into a Cinematic Story Page

Usage:
    python -m cc /path/to/repo
    python cc/__main__.py . --output story.html
    ./run.sh /path/to/repo           # via helper script
"""

import argparse
import os
import sys

from cc.parser import analyze_repo
from cc.generator import render_story


def main():
    parser = argparse.ArgumentParser(
        prog="commit-canvas",
        description="Turn any git repository into a cinematic animated story page.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Quick Start:
    python -m cc .
    python -m cc /path/to/your-project
    python -m cc . --open

Output: A single self-contained HTML file. Works offline. Zero dependencies.
        """
    )
    
    parser.add_argument("repo_path", nargs="?", default=".",
        help="Path to git repository (default: current directory)")
    
    parser.add_argument("-o", "--output", default=None,
        help="Output HTML file path (default: story.html in current directory)")
    
    parser.add_argument("--title", default=None,
        help="Custom title for the story page")
    
    parser.add_argument("--open", action="store_true",
        help="Open the generated HTML file in browser after generation")
    
    args = parser.parse_args()
    
    # Resolve path
    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    
    if not os.path.isdir(os.path.join(repo_path, ".git")):
        print(f"Error: '{repo_path}' is not a git repository.")
        print("       Make sure you're pointing to a directory with a .git folder.")
        sys.exit(1)
    
    # Output path
    if args.output:
        output_path = os.path.abspath(os.path.expanduser(args.output))
    else:
        output_path = os.path.join(os.getcwd(), "story.html")
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    print(f"\n  Canvas")
    print(f"  ─────────────────────────────────")
    print(f"  Repository: {os.path.basename(repo_path)}")
    print(f"  Output:     {output_path}")
    print(f"  Analyzing...")
    
    try:
        data = analyze_repo(repo_path)
        
        if "error" in data:
            print(f"Error: {data['error']}")
            sys.exit(1)
        
        if args.title:
            data["repo_name"] = args.title
        
        render_story(data, output_path)
        
        if args.open:
            import webbrowser
            webbrowser.open(f"file://{output_path}")
        
        print(f"  ─────────────────────────────────")
        print(f"  {data['total_commits']} commits · {data['total_active_days']} days · {data['longest_streak']}-day streak")
        print(f"  Arc: {data['story_arc_label']}")
        print(f"\n  Done → {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()