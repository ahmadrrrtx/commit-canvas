"""
Commit Canvas — Git Repository Parser (Elite Edition)
Extracts meaningful story data from any git repository.
Zero API calls. Works offline. Reads only local .git data.
"""

import os
import subprocess
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional


# ─── UTILITIES ──────────────────────────────────────────────────────────────

def run_git_command(repo_path: str, *args) -> str:
    """Run a git command and return output."""
    result = subprocess.run(
        ["git"] + list(args),
        cwd=repo_path,
        capture_output=True,
        text=True
    )
    return result.stdout.strip()


def get_repo_name(repo_path: str) -> str:
    """Get repo name from directory."""
    return os.path.basename(os.path.abspath(repo_path)).strip()


# ─── COMMIT EXTRACTION ─────────────────────────────────────────────────────

def get_commits(repo_path: str, limit: int = None) -> list[dict]:
    """Extract all commits with metadata."""
    output = run_git_command(
        repo_path,
        "log",
        "--all",
        "--format=%H|%P|%an|%ae|%at|%s",
        "--no-merges",
        *([f"--max-count={limit}"] if limit else [])
    )
    
    if not output:
        return []
    
    commits = []
    for line in output.split("\n"):
        if not line.strip():
            continue
        
        parts = line.split("|", 5)
        if len(parts) < 5:
            continue
        
        hash_val, parents_str, author_name, author_email, timestamp, message = parts
        commits.append({
            "hash": hash_val,
            "short_hash": hash_val[:7],
            "parents": parents_str.split() if parents_str else [],
            "author": author_name.strip(),
            "email": author_email.strip(),
            "date": datetime.fromtimestamp(int(timestamp)),
            "timestamp": int(timestamp),
            "message": message.strip(),
            "message_short": message.strip()[:80] + ("..." if len(message) > 80 else "")
        })
    
    return commits


def get_tags(repo_path: str) -> list[dict]:
    """Extract version tags with their commit dates."""
    output = run_git_command(repo_path, "tag", "--sort=-v:refname")
    
    tags = []
    for tag in output.split("\n"):
        if not tag.strip():
            continue
        
        tag_date_str = run_git_command(repo_path, "log", "-1", "--format=%ct", tag)
        if tag_date_str:
            try:
                dt = datetime.fromtimestamp(int(tag_date_str))
                tags.append({
                    "name": tag.strip(),
                    "date": dt,
                    "is_version": bool(
                        tag.strip().startswith("v") and 
                        any(c.isdigit() for c in tag)
                    )
                })
            except ValueError:
                pass
    
    return tags


def get_branches(repo_path: str) -> list[str]:
    """Get all branch names."""
    output = run_git_command(repo_path, "branch", "-a")
    return [b.strip().replace("  ", "").replace("* ", "") 
            for b in output.split("\n") if b.strip()]


# ─── STREAKS ───────────────────────────────────────────────────────────────

def calculate_streaks(commits: list[dict]) -> dict:
    """Calculate commit streaks (consecutive days of activity)."""
    active_days = sorted(set(c["date"].date() for c in commits))
    
    if not active_days:
        return {"longest": 0, "current": 0, "total_active_days": 0}
    
    longest = 1
    current = 1
    
    for i in range(1, len(active_days)):
        if (active_days[i] - active_days[i-1]).days == 1:
            longest = max(longest, current + 1)
            current += 1
        else:
            current = 1
    
    # Current streak from today going backwards
    today = datetime.now().date()
    current_streak = 0
    for i in range(len(active_days)):
        if (today - active_days[-(i+1)]).days <= 1:
            current_streak += 1
        else:
            break
    
    return {
        "longest": longest,
        "current": current_streak,
        "total_active_days": len(active_days)
    }


# ─── CONTRIBUTORS ───────────────────────────────────────────────────────────

def calculate_contributors(commits: list[dict]) -> list[dict]:
    """Rank contributors by commit count."""
    stats = defaultdict(lambda: {
        "name": "", "commits": 0, 
        "first_date": None, "last_date": None, "commits_per_month": []
    })
    
    for commit in commits:
        author = commit["author"]
        stats[author]["name"] = author
        stats[author]["commits"] += 1
        
        if stats[author]["first_date"] is None or commit["date"] < stats[author]["first_date"]:
            stats[author]["first_date"] = commit["date"]
        if stats[author]["last_date"] is None or commit["date"] > stats[author]["last_date"]:
            stats[author]["last_date"] = commit["date"]
    
    total = len(commits)
    contributors = []
    
    for name, s in stats.items():
        s["percentage"] = round((s["commits"] / total) * 100, 1)
        # Months active
        months = set(c["date"].strftime("%Y-%m") for c in commits if c["author"] == name)
        s["months_active"] = len(months)
        contributors.append(s)
    
    contributors.sort(key=lambda x: x["commits"], reverse=True)
    return contributors


# ─── TIMELINE ─────────────────────────────────────────────────────────────

def build_timeline(commits: list[dict]) -> list[dict]:
    """Group commits into monthly clusters with enriched metadata."""
    monthly = defaultdict(list)
    
    for commit in commits:
        key = commit["date"].strftime("%Y-%m")
        monthly[key].append(commit)
    
    timeline = []
    months_sorted = sorted(monthly.keys())
    
    for month_key in months_sorted:
        group = monthly[month_key]
        year, mon = month_key.split("-")
        date = datetime(int(year), int(mon), 1)
        
        active_days = len(set(c["date"].date() for c in group))
        density = len(group) / max(active_days, 1)
        authors = set(c["author"] for c in group)
        
        # Find peak day in this month
        day_counts = defaultdict(int)
        for c in group:
            day_counts[c["date"].date()] += 1
        peak_day = max(day_counts, key=day_counts.get) if day_counts else date.date()
        
        timeline.append({
            "month": date.strftime("%B %Y"),
            "month_key": month_key,
            "date": date,
            "commit_count": len(group),
            "active_days": active_days,
            "density": round(density, 2),
            "contributors": len(authors),
            "author_list": list(authors),
            "peak_day": peak_day,
            "commits": group,
            "first_message": group[0]["message_short"]
        })
    
    return timeline


# ─── MILESTONES ─────────────────────────────────────────────────────────────

def detect_milestones(commits: list[dict], tags: list[dict]) -> list[dict]:
    """Detect meaningful milestones in the project history."""
    milestones = []
    
    if not commits:
        return milestones
    
    # First commit
    milestones.append({
        "type": "first_commit",
        "title": "The Beginning",
        "subtitle": commits[-1]["message_short"],
        "date": commits[-1]["date"],
        "hash": commits[-1]["short_hash"],
        "icon": "🚀"
    })
    
    # Version tags
    for tag in tags:
        if tag["is_version"] and tag["date"]:
            matching = [c for c in commits 
                       if abs((c["date"] - tag["date"]).total_seconds()) < 86400 * 3]
            desc = matching[0]["message_short"] if matching else f"Released {tag['name']}"
            milestones.append({
                "type": "version",
                "title": tag["name"],
                "subtitle": desc,
                "date": tag["date"],
                "hash": matching[0]["short_hash"] if matching else "",
                "icon": "🏷️"
            })
    
    # Activity bursts (months with >2x average)
    monthly = defaultdict(int)
    for commit in commits:
        monthly[commit["date"].strftime("%Y-%m")] += 1
    
    if monthly:
        avg = sum(monthly.values()) / len(monthly)
        
        for month_key, count in monthly.items():
            if count >= avg * 2.5 and count >= 5:
                year, mon = month_key.split("-")
                burst_date = datetime(int(year), int(mon), 1)
                
                month_commits = [c for c in commits 
                                if c["date"].strftime("%Y-%m") == month_key]
                
                if len(month_commits) > 3:
                    milestones.append({
                        "type": "burst",
                        "title": f"Peak Month — {count} commits",
                        "subtitle": f"Happened in {burst_date.strftime('%B %Y')}",
                        "date": burst_date,
                        "hash": month_commits[0]["short_hash"],
                        "icon": "⚡"
                    })
    
    # Long gaps (resurrection moments)
    if len(commits) > 10:
        commits_sorted = sorted(commits, key=lambda c: c["timestamp"])
        for i in range(1, len(commits_sorted)):
            gap_days = (commits_sorted[i]["date"] - commits_sorted[i-1]["date"]).days
            if gap_days >= 90:  # 3+ months gap
                milestones.append({
                    "type": "comeback",
                    "title": f"Return after {gap_days} days",
                    "subtitle": commits_sorted[i]["message_short"],
                    "date": commits_sorted[i]["date"],
                    "hash": commits_sorted[i]["short_hash"],
                    "icon": "🔄"
                })
    
    # Most recent
    milestones.append({
        "type": "recent",
        "title": "Latest Work",
        "subtitle": commits[0]["message_short"],
        "date": commits[0]["date"],
        "hash": commits[0]["short_hash"],
        "icon": "✨"
    })
    
    # Sort by date
    milestones.sort(key=lambda x: x["date"])
    return milestones


# ─── HEATMAP ──────────────────────────────────────────────────────────────

def generate_heatmap(commits: list[dict]) -> dict:
    """Generate enriched 52-week heatmap data."""
    today = datetime.now()
    start = today - timedelta(weeks=52)
    start = start - timedelta(days=(start.weekday() + 1) % 7)
    
    weeks = []
    month_labels = []
    last_month = None
    
    current = start
    while current <= today:
        week = []
        month_shown = False
        
        for day in range(7):
            day_date = current + timedelta(days=day)
            count = sum(1 for c in commits if c["date"].date() == day_date.date())
            week.append(count)
            
            if not month_shown and current.month != last_month:
                last_month = current.month
                month_labels.append(current.strftime("%b"))
                month_shown = True
        
        weeks.append(week)
        current += timedelta(days=7)
    
    return {
        "weeks": weeks,
        "month_labels": month_labels[:52]
    }


# ─── STORY ENGINE ──────────────────────────────────────────────────────────

def detect_project_story(timeline: list[dict], commits: list[dict]) -> dict:
    """
    The narrative engine — detects the overall story arc of the project.
    This is what makes Commit Canvas different from every other git tool.
    """
    if not timeline:
        return {"arc": "unknown", "phases": [], "summary": ""}
    
    if len(timeline) == 1:
        return {
            "arc": "fresh_start",
            "phases": [{"name": "The Beginning", "start": timeline[0]["month"]}],
            "summary": "Just getting started. The first commit is always the hardest."
        }
    
    # Analyze activity pattern
    densities = [t["density"] for t in timeline]
    commit_counts = [t["commit_count"] for t in timeline]
    
    early = timeline[:max(3, len(timeline)//4)]
    late = timeline[-max(3, len(timeline)//4):]
    
    early_avg = sum(t["commit_count"] for t in early) / max(len(early), 1)
    late_avg = sum(t["commit_count"] for t in late) / max(len(late), 1)
    
    # Detect the arc
    if late_avg > early_avg * 2:
        arc = "growth"
        summary = "Started quiet, got louder. This project gained momentum."
    elif late_avg < early_avg * 0.5:
        arc = "mature"
        summary = "Started fast, found its rhythm. A mature project with steady work."
    elif max(densities) > 3 * (sum(densities) / len(densities)):
        arc = "burst"
        summary = "Has moments of intense activity. Built in bursts."
    else:
        arc = "consistent"
        summary = "Showed up regularly. This was deliberate, consistent work."
    
    # Detect phases
    phases = []
    avg = sum(commit_counts) / len(commit_counts)
    
    for t in timeline:
        if t["commit_count"] > avg * 2:
            phases.append({"type": "surge", "month": t["month"], "count": t["commit_count"]})
        elif t["commit_count"] < avg * 0.3 and t["commit_count"] > 1:
            phases.append({"type": "quiet", "month": t["month"], "count": t["commit_count"]})
    
    return {
        "arc": arc,
        "phases": phases,
        "summary": summary,
        "early_avg": round(early_avg, 1),
        "late_avg": round(late_avg, 1),
        "growth_ratio": round(late_avg / max(early_avg, 0.1), 1)
    }


# ─── MOST MEMORABLE COMMITS ─────────────────────────────────────────────────

def find_memorable_commits(commits: list[dict]) -> list[dict]:
    """Find the commits that tell a story — large commits, interesting messages."""
    if not commits:
        return []
    
    memorable = []
    
    for commit in commits:
        score = 0
        reasons = []
        
        # Long commit messages often mean meaningful work
        if len(commit["message"]) > 100:
            score += 1
            reasons.append("detailed message")
        
        # First word patterns that suggest milestones
        first_word = commit["message"].split()[0].lower() if commit["message"] else ""
        milestone_words = ["initial", "first", "released", "v", "add", "build", "create", "implement"]
        if any(first_word.startswith(m) for m in milestone_words):
            score += 1
            reasons.append("milestone prefix")
        
        # Very short messages often mean quick wins
        if len(commit["message"]) < 20 and len(commit["message"]) > 3:
            score += 0.5
            reasons.append("concise")
        
        if score >= 1:
            memorable.append({
                "hash": commit["short_hash"],
                "date": commit["date"],
                "message": commit["message_short"],
                "author": commit["author"],
                "score": score,
                "reasons": reasons
            })
    
    # Return top 5 most memorable, sorted by date
    memorable.sort(key=lambda x: (x["score"], x["date"].timestamp()), reverse=True)
    return memorable[:5]


# ─── MAIN ANALYSIS ────────────────────────────────────────────────────────

def analyze_repo(repo_path: str) -> dict:
    """Main entry point — analyze a git repository and return full story data."""
    
    if not os.path.isdir(os.path.join(repo_path, ".git")):
        raise ValueError(f"Not a git repository: {repo_path}")
    
    commits = get_commits(repo_path)
    
    if not commits:
        return {"error": "No commits found in repository"}
    
    tags = get_tags(repo_path)
    branches = get_branches(repo_path)
    contributors = calculate_contributors(commits)
    streaks = calculate_streaks(commits)
    timeline = build_timeline(commits)
    milestones = detect_milestones(commits, tags)
    heatmap = generate_heatmap(commits)
    story = detect_project_story(timeline, commits)
    memorable = find_memorable_commits(commits)
    
    total_days = (commits[0]["date"] - commits[-1]["date"]).days
    
    return {
        # Identity
        "repo_name": get_repo_name(repo_path),
        "repo_path": os.path.abspath(repo_path),
        
        # Core stats
        "total_commits": len(commits),
        "total_contributors": len(contributors),
        "total_active_days": streaks["total_active_days"],
        "longest_streak": streaks["longest"],
        "current_streak": streaks["current"],
        
        # Timeline
        "first_commit_date": commits[-1]["date"],
        "last_commit_date": commits[0]["date"],
        "project_age_days": total_days,
        "project_age_readable": _format_duration(total_days),
        "avg_commits_per_day": round(len(commits) / max(total_days, 1), 2),
        
        # Story engine
        "story_arc": story["arc"],
        "story_summary": story["summary"],
        "growth_ratio": story.get("growth_ratio", 1.0),
        "phases": story.get("phases", []),
        
        # Content
        "commits": commits,
        "timeline": timeline,
        "milestones": milestones,
        "contributors": contributors,
        "heatmap": heatmap,
        "memorable": memorable,
        
        # Metadata
        "tags": tags[:20],
        "branches": branches[:20]
    }


def _format_duration(days: int) -> str:
    """Format days into human readable duration."""
    if days < 7:
        return f"{days} day{'s' if days != 1 else ''}"
    elif days < 30:
        weeks = days // 7
        return f"{weeks} week{'s' if weeks != 1 else ''}"
    elif days < 365:
        months = days // 30
        return f"{months} month{'s' if months != 1 else ''}"
    else:
        years = days // 365
        remaining = (days % 365) // 30
        if remaining > 0:
            return f"{years}y {remaining}m"
        return f"{years} year{'s' if years != 1 else ''}"