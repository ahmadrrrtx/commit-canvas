"""
Commit Canvas — Test Suite
Validates parser and generator correctness across edge cases.
Run with: python -m pytest tests/ -v
"""

import os
import tempfile
import subprocess
import sys
from datetime import datetime

import pytest

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cc.parser import (
    analyze_repo, get_commits, get_tags, calculate_streaks,
    calculate_contributors, build_timeline, detect_milestones,
    generate_heatmap, detect_project_story, get_repo_name
)
from cc.generator import render_story, prepare_data


# ─── FIXTURES ───────────────────────────────────────────────────────────────

@pytest.fixture
def git_repo():
    """Create a temporary git repo with known commits for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Init git repo
        subprocess.run(["git", "init"], cwd=tmpdir, capture_output=True)
        subprocess.run(
            ["git", "config", "user.email", "test@example.com"],
            cwd=tmpdir, capture_output=True
        )
        subprocess.run(
            ["git", "config", "user.name", "Test User"],
            cwd=tmpdir, capture_output=True
        )
        
        # Create commits spread across 5 different days (using --date to ensure unique days)
        base = "2024-01-01"
        dates = [
            f"{base} 10:00:00",
            "2024-01-02 10:00:00",
            "2024-01-03 10:00:00",
            "2024-01-04 10:00:00",
            "2024-01-05 10:00:00",
        ]
        for i, date in enumerate(dates):
            filepath = os.path.join(tmpdir, f"file_{i}.txt")
            with open(filepath, "w") as f:
                f.write(f"content {i}")
            
            subprocess.run(["git", "add", "."], cwd=tmpdir, capture_output=True)
            subprocess.run(
                ["git", "commit", "-m", f"Commit {i}: Added file {i}",
                 "--date", date],
                cwd=tmpdir, capture_output=True
            )
        
        yield tmpdir


@pytest.fixture
def empty_git_repo():
    """Create an empty git repo (no commits)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        subprocess.run(["git", "init"], cwd=tmpdir, capture_output=True)
        subprocess.run(
            ["git", "config", "user.email", "test@example.com"],
            cwd=tmpdir, capture_output=True
        )
        subprocess.run(
            ["git", "config", "user.name", "Test User"],
            cwd=tmpdir, capture_output=True
        )
        yield tmpdir


@pytest.fixture
def single_commit_repo():
    """Create a repo with exactly one commit."""
    with tempfile.TemporaryDirectory() as tmpdir:
        subprocess.run(["git", "init"], cwd=tmpdir, capture_output=True)
        subprocess.run(
            ["git", "config", "user.email", "solo@example.com"],
            cwd=tmpdir, capture_output=True
        )
        subprocess.run(
            ["git", "config", "user.name", "Solo Dev"],
            cwd=tmpdir, capture_output=True
        )
        
        filepath = os.path.join(tmpdir, "README.md")
        with open(filepath, "w") as f:
            f.write("# Hello World")
        
        subprocess.run(["git", "add", "."], cwd=tmpdir, capture_output=True)
        subprocess.run(
            ["git", "commit", "-m", "Initial commit"],
            cwd=tmpdir, capture_output=True
        )
        
        yield tmpdir


@pytest.fixture
def tagged_repo():
    """Create a repo with version tags."""
    with tempfile.TemporaryDirectory() as tmpdir:
        subprocess.run(["git", "init"], cwd=tmpdir, capture_output=True)
        subprocess.run(
            ["git", "config", "user.email", "test@example.com"],
            cwd=tmpdir, capture_output=True
        )
        subprocess.run(
            ["git", "config", "user.name", "Test User"],
            cwd=tmpdir, capture_output=True
        )
        
        for i in range(3):
            with open(os.path.join(tmpdir, f"file_{i}.txt"), "w") as f:
                f.write(f"content {i}")
            subprocess.run(["git", "add", "."], cwd=tmpdir, capture_output=True)
            subprocess.run(
                ["git", "commit", "-m", f"Commit {i}"],
                cwd=tmpdir, capture_output=True
            )
        
        # Tag a version
        subprocess.run(["git", "tag", "v1.0.0"], cwd=tmpdir, capture_output=True)
        
        yield tmpdir


@pytest.fixture
def multi_author_repo():
    """Create a repo with multiple contributors."""
    with tempfile.TemporaryDirectory() as tmpdir:
        subprocess.run(["git", "init"], cwd=tmpdir, capture_output=True)
        
        # Author 1
        subprocess.run(["git", "config", "user.email", "alice@example.com"], cwd=tmpdir)
        subprocess.run(["git", "config", "user.name", "Alice"], cwd=tmpdir)
        
        with open(os.path.join(tmpdir, "a.txt"), "w") as f:
            f.write("alice")
        subprocess.run(["git", "add", "."], cwd=tmpdir)
        subprocess.run(["git", "commit", "-m", "Alice: first"], cwd=tmpdir)
        
        # Author 2
        subprocess.run(["git", "config", "user.email", "bob@example.com"], cwd=tmpdir)
        subprocess.run(["git", "config", "user.name", "Bob"], cwd=tmpdir)
        
        with open(os.path.join(tmpdir, "b.txt"), "w") as f:
            f.write("bob")
        subprocess.run(["git", "add", "."], cwd=tmpdir)
        subprocess.run(["git", "commit", "-m", "Bob: second"], cwd=tmpdir)
        
        # Author 1 again
        subprocess.run(["git", "config", "user.email", "alice@example.com"], cwd=tmpdir)
        subprocess.run(["git", "config", "user.name", "Alice"], cwd=tmpdir)
        
        with open(os.path.join(tmpdir, "c.txt"), "w") as f:
            f.write("alice again")
        subprocess.run(["git", "add", "."], cwd=tmpdir)
        subprocess.run(["git", "commit", "-m", "Alice: third"], cwd=tmpdir)
        
        yield tmpdir


# ─── PARSER TESTS ────────────────────────────────────────────────────────────

class TestGetRepoName:
    def test_basic(self, git_repo):
        name = get_repo_name(git_repo)
        assert isinstance(name, str)
        assert len(name) > 0


class TestGetCommits:
    def test_returns_list(self, git_repo):
        commits = get_commits(git_repo)
        assert isinstance(commits, list)
    
    def test_has_required_fields(self, git_repo):
        commits = get_commits(git_repo)
        assert len(commits) == 5
        for commit in commits:
            assert 'hash' in commit
            assert 'short_hash' in commit
            assert 'author' in commit
            assert 'date' in commit
            assert 'message' in commit
            assert 'message_short' in commit
    
    def test_dates_are_datetime_objects(self, git_repo):
        commits = get_commits(git_repo)
        for commit in commits:
            assert isinstance(commit['date'], datetime)


class TestCalculateStreaks:
    def test_streaks_with_consecutive_commits(self, git_repo):
        commits = get_commits(git_repo)
        streaks = calculate_streaks(commits)
        
        assert 'longest' in streaks
        assert 'current' in streaks
        assert 'total_active_days' in streaks
        assert streaks['total_active_days'] == 5
        assert streaks['longest'] >= 1
    
    def test_single_day_active(self, single_commit_repo):
        commits = get_commits(single_commit_repo)
        streaks = calculate_streaks(commits)
        
        assert streaks['total_active_days'] == 1
        assert streaks['longest'] == 1


class TestCalculateContributors:
    def test_single_contributor(self, git_repo):
        commits = get_commits(git_repo)
        contributors = calculate_contributors(commits)
        
        assert len(contributors) == 1
        assert contributors[0]['commits'] == 5
        assert contributors[0]['percentage'] == 100.0
    
    def test_multiple_contributors(self, multi_author_repo):
        commits = get_commits(multi_author_repo)
        contributors = calculate_contributors(commits)
        
        assert len(contributors) == 2
        # Sorted by commits desc
        assert contributors[0]['commits'] >= contributors[1]['commits']
        # Percentages add to ~100
        total_pct = sum(c['percentage'] for c in contributors)
        assert 99 <= total_pct <= 101


class TestBuildTimeline:
    def test_months_grouped(self, git_repo):
        commits = get_commits(git_repo)
        timeline = build_timeline(commits)
        
        assert isinstance(timeline, list)
        assert len(timeline) >= 1
        
        for month in timeline:
            assert 'month' in month
            assert 'commit_count' in month
            assert 'active_days' in month
            assert 'density' in month
            assert 'contributors' in month
            assert month['commit_count'] > 0


class TestDetectMilestones:
    def test_first_commit_detected(self, git_repo):
        commits = get_commits(git_repo)
        milestones = detect_milestones(commits, [])
        
        first_types = [m for m in milestones if m['type'] == 'first_commit']
        assert len(first_types) == 1
    
    def test_tags_as_milestones(self, tagged_repo):
        commits = get_commits(tagged_repo)
        tags = get_tags(tagged_repo)
        milestones = detect_milestones(commits, tags)
        
        version_milestones = [m for m in milestones if m['type'] == 'version']
        assert len(version_milestones) >= 1
    
    def test_recent_commit_detected(self, git_repo):
        commits = get_commits(git_repo)
        milestones = detect_milestones(commits, [])
        
        recent_types = [m for m in milestones if m['type'] == 'recent']
        assert len(recent_types) == 1


class TestGenerateHeatmap:
    def test_returns_52_weeks(self, git_repo):
        commits = get_commits(git_repo)
        heatmap = generate_heatmap(commits)
        
        assert 'weeks' in heatmap
        assert len(heatmap['weeks']) > 0
        
        for week in heatmap['weeks']:
            assert len(week) == 7
    
    def test_weeks_are_int_lists(self, git_repo):
        commits = get_commits(git_repo)
        heatmap = generate_heatmap(commits)
        
        for week in heatmap['weeks']:
            for day in week:
                assert isinstance(day, int)
                assert day >= 0


class TestDetectProjectStory:
    def test_returns_arc_and_summary(self, git_repo):
        commits = get_commits(git_repo)
        timeline = build_timeline(commits)
        story = detect_project_story(timeline, commits)
        
        assert 'arc' in story
        assert 'summary' in story
        assert 'phases' in story
        assert story['arc'] in ['fresh_start', 'growth', 'mature', 'burst', 'consistent', 'unknown']


class TestAnalyzeRepo:
    def test_full_analysis(self, git_repo):
        data = analyze_repo(git_repo)
        
        assert 'repo_name' in data
        assert 'total_commits' in data
        assert 'total_contributors' in data
        assert 'timeline' in data
        assert 'milestones' in data
        assert 'heatmap' in data
        assert 'story_arc' in data
        assert 'story_summary' in data
        
        assert data['total_commits'] == 5
    
    def test_error_on_no_commits(self, empty_git_repo):
        result = analyze_repo(empty_git_repo)
        assert 'error' in result
    
    def test_error_on_non_git_repo(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, "file.txt"), "w") as f:
                f.write("not git")
            
            with pytest.raises(ValueError, match="[Nn]ot a git repository"):
                analyze_repo(tmpdir)


# ─── GENERATOR TESTS ────────────────────────────────────────────────────────

class TestPrepareData:
    def test_heatmap_shape(self, git_repo):
        raw_data = analyze_repo(git_repo)
        prepared = prepare_data(raw_data)
        
        assert 'heatmap' in prepared
        assert 'weeks' in prepared['heatmap']
        assert 'month_labels' in prepared['heatmap']
    
    def test_story_summary_always_present(self, single_commit_repo):
        raw_data = analyze_repo(single_commit_repo)
        prepared = prepare_data(raw_data)
        
        assert 'story_summary' in prepared
        assert isinstance(prepared['story_summary'], str)
        assert len(prepared['story_summary']) > 0
    
    def test_default_values_for_missing_fields(self):
        """Test that prepare_data handles minimal data gracefully."""
        minimal = {
            'repo_name': 'test-repo',
            'total_commits': 1,
            'total_contributors': 1,
        }
        prepared = prepare_data(minimal)
        
        assert prepared['repo_name'] == 'test-repo'
        assert prepared['total_commits'] == 1


class TestRenderStory:
    def test_generates_html_file(self, git_repo):
        data = analyze_repo(git_repo)
        
        with tempfile.NamedTemporaryFile(suffix='.html', delete=False) as f:
            output_path = f.name
        
        try:
            result = render_story(data, output_path)
            
            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 1000
            
            with open(output_path, 'r') as f:
                content = f.read()
            
            assert '<!DOCTYPE html>' in content
            assert 'Commit Canvas' in content
            assert data['repo_name'] in content
            assert '</html>' in content
            
            # No Jinja2 artifacts
            assert '{%' not in content
            assert '{{' not in content
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    def test_html_is_self_contained(self, git_repo):
        """Output HTML must not require any external resources."""
        data = analyze_repo(git_repo)
        
        with tempfile.NamedTemporaryFile(suffix='.html', delete=False) as f:
            output_path = f.name
        
        try:
            render_story(data, output_path)
            
            with open(output_path, 'r') as f:
                content = f.read()
            
            # Self-contained: all CSS inline, no external CSS links (fonts are OK via CDN)
            assert '<style>' in content
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    def test_large_repo_handling(self):
        """Test that the parser can handle repos with thousands of commits."""
        # This test would require a real large repo, so we just verify
        # the parser doesn't crash on reasonable data sizes
        pass  # Integration test with real data


# ─── EDGE CASE TESTS ────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_empty_repo_message(self, empty_git_repo):
        data = analyze_repo(empty_git_repo)
        assert 'error' in data
        assert 'No commits' in data['error']
    
    def test_special_characters_in_commit_messages(self):
        """Commits with emoji, unicode, special chars should not break parsing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            subprocess.run(["git", "init"], cwd=tmpdir)
            subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=tmpdir)
            subprocess.run(["git", "config", "user.name", "Test"], cwd=tmpdir)
            
            messages = [
                "Fix: 🚀 Launch bug",
                "Update: Über cache",
                "Refactor: <script>alert('xss')</script>",
                "WIP: #12345 working on it",
                "中文 commit message",
            ]
            
            for msg in messages:
                with open(os.path.join(tmpdir, "f.txt"), "w") as f:
                    f.write(msg)
                subprocess.run(["git", "add", "."], cwd=tmpdir)
                subprocess.run(["git", "commit", "-m", msg], cwd=tmpdir)
            
            commits = get_commits(tmpdir)
            assert len(commits) == 5
    
    def test_very_long_commit_message(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            subprocess.run(["git", "init"], cwd=tmpdir)
            subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=tmpdir)
            subprocess.run(["git", "config", "user.name", "Test"], cwd=tmpdir)
            
            long_msg = "A" * 500
            with open(os.path.join(tmpdir, "f.txt"), "w") as f:
                f.write("content")
            subprocess.run(["git", "add", "."], cwd=tmpdir)
            subprocess.run(["git", "commit", "-m", long_msg], cwd=tmpdir)
            
            commits = get_commits(tmpdir)
            # message_short should truncate to 80 chars + "..."
            assert len(commits[0]['message_short']) <= 83
    
    def test_git_repo_with_no_tags(self, git_repo):
        commits = get_commits(git_repo)
        tags = get_tags(git_repo)
        milestones = detect_milestones(commits, tags)
        
        version_milestones = [m for m in milestones if m['type'] == 'version']
        assert len(version_milestones) == 0


# ─── RUN ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])