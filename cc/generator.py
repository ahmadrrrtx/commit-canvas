"""
Commit Canvas — HTML Generator
Renders the story template with parsed git data.
Output is a single self-contained HTML file.
"""

import os
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape


def render_story(data: dict, output_path: str, template_dir: str = None) -> str:
    """Render the story HTML from git data."""
    
    if template_dir is None:
        template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
    
    env = Environment(
        loader=FileSystemLoader(template_dir),
        autoescape=select_autoescape(['html', 'xml'])
    )
    env.globals['max'] = max
    env.globals['min'] = min
    
    # Prepare data for template — clean structure
    enriched = prepare_data(data)
    
    # Render
    template = env.get_template("story.html")
    html = template.render(**enriched)
    
    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    return output_path


def prepare_data(data: dict) -> dict:
    """Shape the data for the template — clean, safe, complete."""
    
    # Handle missing values with defaults
    repo_name = data.get('repo_name', 'My Project')
    
    # Heatmap structure
    heatmap_raw = data.get('heatmap', {})
    heatmap_weeks = heatmap_raw.get('weeks', [[0] * 7 for _ in range(52)])
    
    # Story summary from the narrative engine
    story_summary = data.get('story_summary', _default_summary(data))
    
    return {
        # Identity
        'repo_name': repo_name,
        
        # Core stats
        'total_commits': data.get('total_commits', 0),
        'total_contributors': data.get('total_contributors', 0),
        'total_active_days': data.get('total_active_days', 0),
        'longest_streak': data.get('longest_streak', 0),
        'current_streak': data.get('current_streak', 0),
        
        # Timeline
        'first_commit_date': data.get('first_commit_date', datetime.now()),
        'last_commit_date': data.get('last_commit_date', datetime.now()),
        'project_age_days': data.get('project_age_days', 0),
        'project_age_readable': data.get('project_age_readable', 'new project'),
        'avg_commits_per_day': data.get('avg_commits_per_day', 0),
        
        # Narrative engine
        'story_arc': data.get('story_arc', 'unknown'),
        'story_summary': story_summary,
        'growth_ratio': data.get('growth_ratio', 1.0),
        'phases': data.get('phases', []),
        
        # Content sections
        'commits': data.get('commits', []),
        'timeline': data.get('timeline', []),
        'milestones': data.get('milestones', []),
        'contributors': data.get('contributors', []),
        'memorable': data.get('memorable', []),
        
        # Heatmap (weeks array)
        'heatmap': {
            'weeks': heatmap_weeks,
            'month_labels': heatmap_raw.get('month_labels', [])
        },
        
        # Metadata
        'tags': data.get('tags', [])[:20],
        'branches': data.get('branches', [])[:20],
    }


def _default_summary(data: dict) -> str:
    """Generate a summary when the story engine doesn't provide one."""
    commits = data.get('total_commits', 0)
    days = data.get('total_active_days', 0)
    contributors = data.get('total_contributors', 0)
    
    if commits < 5:
        return "Just getting started. Every journey begins with a single commit."
    elif contributors > 1:
        return f"{contributors} people, {commits} commits, {days} days of collaboration."
    else:
        return f"{commits} commits over {days} days. Solo work, done with intention."