#!/usr/bin/env python3
"""
Commit Canvas — Turn Git History Into a Beautiful Story
CLI entry point.
Usage:
    python commit_canvas.py /path/to/repo
    python commit_canvas.py . --output my-story.html
"""

import argparse
import os
import sys
from pathlib import Path

from cc.parser import analyze_repo
from cc.generator import render_story


def main():
    parser = argparse.ArgumentParser(
        prog="commit-canvas",
        description="Turn your git history into a beautiful animated story page.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    commit-canvas /path/to/repo              # Generate story.html in current dir
    commit-canvas . --output my-story.html   # Use current repo, custom output name
    commit-canvas /path/to/repo --output ~/desktop/story.html

Output is a single self-contained HTML file.
No server. No database. No API keys. Just your story.
        """
    )
    
    parser.add_argument(
        "repo_path",
        nargs="?",
        default=".",
        help="Path to git repository (default: current directory)"
    )
    
    parser.add_argument(
        "-o", "--output",
        default=None,
        help="Output HTML file path (default: story.html in current directory)"
    )
    
    parser.add_argument(
        "--title",
        default=None,
        help="Custom repo title for the story page"
    )
    
    parser.add_argument(
        "--open",
        action="store_true",
        help="Open the generated HTML file in browser"
    )
    
    args = parser.parse_args()
    
    # Resolve repo path
    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    
    if not os.path.isdir(os.path.join(repo_path, ".git")):
        print(f"❌ Error: '{repo_path}' is not a git repository.")
        print("   Make sure you're pointing to a directory with a .git folder.")
        sys.exit(1)
    
    # Determine output path
    if args.output:
        output_path = os.path.abspath(os.path.expanduser(args.output))
    else:
        output_path = os.path.join(os.getcwd(), "story.html")
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    print(f"\n🎨 Commit Canvas")
    print(f"   Repository: {repo_path}")
    print(f"   Output: {output_path}")
    print(f"   Analyzing git history...")
    
    try:
        # Analyze repository
        data = analyze_repo(repo_path)
        
        if "error" in data:
            print(f"❌ Error: {data['error']}")
            sys.exit(1)
        
        print(f"   Found {data['total_commits']} commits by {data['total_contributors']} contributor(s)")
        print(f"   Project age: {data['project_age_readable']}")
        
        # Override title if provided
        if args.title:
            data["repo_name"] = args.title
        
        # Generate HTML
        render_story(data, output_path)
        
        # Open in browser if requested
        if args.open:
            import webbrowser
            webbrowser.open(f"file://{output_path}")
        
        print(f"\n✨ Done. Open {output_path} in your browser to see your story.")
        
    except FileNotFoundError as e:
        print(f"❌ Error: Could not read repository data — {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()