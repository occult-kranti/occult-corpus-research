"""
Reddit Scraper for Occult Corpus Research
=========================================

A robust Reddit data collection pipeline designed for research purposes.
Supports both PRAW (Reddit API) and direct HTTP scraping as fallback.

Features:
    - OAuth authentication via PRAW
    - HTTP fallback scraping
    - Rate limiting with exponential backoff
    - Progress tracking with resume capability
    - Username anonymization (SHA-256 hashing)
    - JSONL output format
    - Command-line interface
    - YAML configuration

Usage:
    python reddit_scraper.py --config config.yaml --subreddit occult --sort hot --limit 100

Author: Occult Corpus Research Team
"""

import argparse
import hashlib
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Union
from urllib.parse import urljoin

import requests
import yaml
from tqdm import tqdm

# Optional PRAW import - graceful degradation if not installed
try:
    import praw
    from praw.models import Submission, Comment
    PRAW_AVAILABLE = True
except ImportError:
    PRAW_AVAILABLE = False
    praw = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("reddit_scraper")


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_SUBREDDITS = [
    "occult",
    "witchcraft",
    "magick",
    "LeftHandPath",
    "chaosmagick",
    "hermeticism",
    "demonolatryPractices",
]

VALID_SORT_METHODS = ["hot", "top", "new"]
VALID_TIME_FILTERS = ["all", "year", "month", "week", "day"]

REDDIT_OAUTH_RATE_LIMIT = 60  # requests per minute
REQUEST_DELAY = 1.0  # seconds between requests (conservative)
MAX_RETRIES = 5
BACKOFF_BASE = 2.0

DEFAULT_CONFIG = {
    "reddit": {
        "client_id": "",
        "client_secret": "",
        "user_agent": "OccultCorpusResearch/1.0 (Research Data Collection)",
        "username": "",
        "password": "",
    },
    "scraping": {
        "subreddits": DEFAULT_SUBREDDITS,
        "sort": "hot",
        "time_filter": "all",
        "limit": 100,
        "max_comments_per_post": 100,
        "request_delay": REQUEST_DELAY,
        "max_retries": MAX_RETRIES,
        "backoff_base": BACKOFF_BASE,
    },
    "output": {
        "directory": "data/raw/reddit",
        "format": "jsonl",
        "anonymize_usernames": True,
        "include_metadata": True,
    },
    "resume": {
        "enabled": True,
        "progress_file": ".scrape_progress.json",
    },
}


# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

@dataclass
class RedditPost:
    """Represents a scraped Reddit post."""
    id: str
    title: str
    selftext: str
    author: str
    score: int
    num_comments: int
    permalink: str
    created_utc: float
    subreddit: str
    url: str = ""
    comments: list[dict] = field(default_factory=list)
    scraped_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self, anonymize: bool = True) -> dict:
        """Convert post to dictionary for serialization."""
        author_hash = hashlib.sha256(self.author.encode()).hexdigest()[:16] if anonymize and self.author else self.author
        return {
            "id": self.id,
            "title": self.title,
            "selftext": self.selftext,
            "author": author_hash,
            "score": self.score,
            "num_comments": self.num_comments,
            "permalink": self.permalink,
            "created_utc": self.created_utc,
            "subreddit": self.subreddit,
            "url": self.url,
            "comments": [
                {
                    "id": c.get("id"),
                    "body": c.get("body"),
                    "author": hashlib.sha256(c.get("author", "").encode()).hexdigest()[:16] if anonymize else c.get("author"),
                    "score": c.get("score"),
                    "created_utc": c.get("created_utc"),
                    "parent_id": c.get("parent_id"),
                }
                for c in self.comments
            ],
            "scraped_at": self.scraped_at,
        }


# ---------------------------------------------------------------------------
# Progress Tracker
# ---------------------------------------------------------------------------

class ProgressTracker:
    """Tracks scraping progress to enable resume capability."""

    def __init__(self, progress_file: str):
        self.progress_file = Path(progress_file)
        self.scraped_ids: set[str] = set()
        self.load()

    def load(self) -> None:
        """Load progress from file."""
        if self.progress_file.exists():
            try:
                with open(self.progress_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.scraped_ids = set(data.get("scraped_ids", []))
                logger.info(f"Loaded progress: {len(self.scraped_ids)} posts already scraped")
            except Exception as e:
                logger.warning(f"Could not load progress file: {e}")
                self.scraped_ids = set()

    def save(self) -> None:
        """Save progress to file."""
        try:
            with open(self.progress_file, "w", encoding="utf-8") as f:
                json.dump({"scraped_ids": sorted(self.scraped_ids)}, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save progress: {e}")

    def is_scraped(self, post_id: str) -> bool:
        """Check if a post has already been scraped."""
        return post_id in self.scraped_ids

    def mark_scraped(self, post_id: str) -> None:
        """Mark a post as scraped."""
        self.scraped_ids.add(post_id)

    def get_stats(self) -> dict:
        """Return progress statistics."""
        return {"total_scraped": len(self.scraped_ids)}


# ---------------------------------------------------------------------------
# HTTP Fallback Scraper
# ---------------------------------------------------------------------------

class HTTPScraper:
    """Fallback scraper using direct HTTP requests to Reddit's JSON API."""

    BASE_URL = "https://www.reddit.com"
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    def __init__(self, delay: float = REQUEST_DELAY, max_retries: int = MAX_RETRIES):
        self.delay = delay
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)
        self.last_request_time: Optional[float] = None

    def _rate_limit(self) -> None:
        """Enforce rate limiting between requests."""
        if self.last_request_time is not None:
            elapsed = time.time() - self.last_request_time
            if elapsed < self.delay:
                time.sleep(self.delay - elapsed)
        self.last_request_time = time.time()

    def _request(self, url: str, **kwargs) -> Optional[dict]:
        """Make a rate-limited request with exponential backoff."""
        for attempt in range(self.max_retries):
            self._rate_limit()
            try:
                response = self.session.get(url, timeout=30, **kwargs)
                if response.status_code == 429:
                    wait = BACKOFF_BASE ** attempt + (attempt * 0.5)
                    logger.warning(f"Rate limited (429). Backing off for {wait:.1f}s...")
                    time.sleep(wait)
                    continue
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as e:
                wait = BACKOFF_BASE ** attempt
                logger.warning(f"Request failed (attempt {attempt + 1}/{self.max_retries}): {e}. Retrying in {wait:.1f}s...")
                time.sleep(wait)
        logger.error(f"Max retries exceeded for URL: {url}")
        return None

    def fetch_subreddit(self, name: str, sort: str = "hot", limit: int = 100,
                        time_filter: str = "all", after: Optional[str] = None) -> Optional[dict]:
        """Fetch posts from a subreddit via Reddit's JSON API."""
        url = f"{self.BASE_URL}/r/{name}/{sort}.json"
        params = {"limit": min(limit, 100), "raw_json": 1}
        if sort == "top" and time_filter:
            params["t"] = time_filter
        if after:
            params["after"] = after

        logger.debug(f"Fetching: {url} with params {params}")
        return self._request(url, params=params)

    def fetch_comments(self, post_id: str, subreddit: str) -> Optional[dict]:
        """Fetch comments for a specific post."""
        url = f"{self.BASE_URL}/r/{subreddit}/comments/{post_id}.json"
        return self._request(url, params={"limit": 100, "raw_json": 1})

    def parse_posts(self, data: dict, subreddit: str) -> list[RedditPost]:
        """Parse Reddit JSON response into RedditPost objects."""
        posts = []
        if not data or "data" not in data:
            return posts

        children = data["data"].get("children", [])
        for child in children:
            if child.get("kind") != "t3":
                continue
            post_data = child.get("data", {})
            post = RedditPost(
                id=post_data.get("id", ""),
                title=post_data.get("title", ""),
                selftext=post_data.get("selftext", ""),
                author=post_data.get("author", "[deleted]"),
                score=post_data.get("score", 0),
                num_comments=post_data.get("num_comments", 0),
                permalink=post_data.get("permalink", ""),
                created_utc=post_data.get("created_utc", 0.0),
                subreddit=subreddit,
                url=post_data.get("url", ""),
            )
            posts.append(post)
        return posts

    def parse_comments(self, data: list) -> list[dict]:
        """Parse comments from Reddit's nested JSON structure."""
        comments = []
        if not data or len(data) < 2:
            return comments

        def extract_comments(node: dict):
            if not node or not isinstance(node, dict):
                return
            kind = node.get("kind")
            comment_data = node.get("data", {})
            if kind == "t1":
                comments.append({
                    "id": comment_data.get("id"),
                    "body": comment_data.get("body", ""),
                    "author": comment_data.get("author", "[deleted]"),
                    "score": comment_data.get("score", 0),
                    "created_utc": comment_data.get("created_utc", 0.0),
                    "parent_id": comment_data.get("parent_id"),
                })
            # Recurse into replies
            replies = comment_data.get("replies")
            if isinstance(replies, dict) and "data" in replies:
                for child in replies["data"].get("children", []):
                    extract_comments(child)

        comment_listing = data[1]
        if comment_listing.get("kind") == "Listing":
            for child in comment_listing["data"].get("children", []):
                extract_comments(child)
        return comments


# ---------------------------------------------------------------------------
# Main Reddit Scraper
# ---------------------------------------------------------------------------

class RedditScraper:
    """
    Main Reddit scraper supporting both PRAW and HTTP fallback.

    Attributes:
        config: Configuration dictionary
        use_praw: Whether PRAW is available and configured
        reddit: PRAW Reddit instance (if using PRAW)
        http: HTTPScraper instance (fallback)
        progress: ProgressTracker for resume capability
    """

    def __init__(self, config: dict):
        """
        Initialize the Reddit scraper.

        Args:
            config: Configuration dictionary with reddit, scraping, output, and resume sections
        """
        self.config = {**DEFAULT_CONFIG, **config}
        self.use_praw = False
        self.reddit: Optional[Any] = None
        self.http = HTTPScraper(
            delay=self.config["scraping"].get("request_delay", REQUEST_DELAY),
            max_retries=self.config["scraping"].get("max_retries", MAX_RETRIES),
        )
        self.progress = ProgressTracker(
            self.config["resume"].get("progress_file", ".scrape_progress.json")
        )

        # Setup output directory
        self.output_dir = Path(self.config["output"].get("directory", "data/raw/reddit"))
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Attempt PRAW authentication
        self.authenticate()

    def authenticate(self) -> Any:
        """
        Authenticate with Reddit using PRAW if available.

        Returns:
            PRAW Reddit instance or None if authentication fails
        """
        if not PRAW_AVAILABLE:
            logger.info("PRAW not installed. Using HTTP fallback.")
            return None

        reddit_config = self.config.get("reddit", {})
        client_id = reddit_config.get("client_id", "")
        client_secret = reddit_config.get("client_secret", "")

        if not client_id or not client_secret:
            logger.info("Reddit API credentials not configured. Using HTTP fallback.")
            return None

        try:
            self.reddit = praw.Reddit(
                client_id=client_id,
                client_secret=client_secret,
                user_agent=reddit_config.get("user_agent", DEFAULT_CONFIG["reddit"]["user_agent"]),
                username=reddit_config.get("username", ""),
                password=reddit_config.get("password", ""),
            )
            # Test authentication
            self.reddit.user.me()
            self.use_praw = True
            logger.info("Successfully authenticated with Reddit via PRAW")
            return self.reddit
        except Exception as e:
            logger.warning(f"PRAW authentication failed: {e}. Using HTTP fallback.")
            self.use_praw = False
            self.reddit = None
            return None

    def scrape_subreddit(self, name: str, sort: str = "hot", limit: int = 100,
                         time_filter: str = "all") -> list[RedditPost]:
        """
        Scrape posts from a subreddit.

        Args:
            name: Subreddit name (without r/ prefix)
            sort: Sort method - "hot", "top", or "new"
            limit: Maximum number of posts to fetch
            time_filter: Time filter for "top" sort - "all", "year", "month", "week", "day"

        Returns:
            List of RedditPost objects
        """
        if sort not in VALID_SORT_METHODS:
            raise ValueError(f"Invalid sort method: {sort}. Must be one of {VALID_SORT_METHODS}")
        if time_filter not in VALID_TIME_FILTERS:
            raise ValueError(f"Invalid time filter: {time_filter}. Must be one of {VALID_TIME_FILTERS}")

        logger.info(f"Scraping r/{name} | sort={sort} | limit={limit} | time={time_filter}")

        if self.use_praw:
            return self._scrape_with_praw(name, sort, limit, time_filter)
        else:
            return self._scrape_with_http(name, sort, limit, time_filter)

    def _scrape_with_praw(self, name: str, sort: str, limit: int, time_filter: str) -> list[RedditPost]:
        """Scrape using PRAW library."""
        posts = []
        subreddit = self.reddit.subreddit(name)

        try:
            if sort == "hot":
                submissions = subreddit.hot(limit=limit)
            elif sort == "top":
                submissions = subreddit.top(time_filter=time_filter, limit=limit)
            elif sort == "new":
                submissions = subreddit.new(limit=limit)
            else:
                submissions = subreddit.hot(limit=limit)

            for submission in tqdm(submissions, total=limit, desc=f"r/{name}"):
                if self.progress.is_scraped(submission.id):
                    continue

                post = self._praw_submission_to_post(submission, name)
                posts.append(post)
                self.progress.mark_scraped(submission.id)

                # Rate limiting
                time.sleep(self.config["scraping"].get("request_delay", REQUEST_DELAY))

        except Exception as e:
            logger.error(f"Error scraping r/{name} with PRAW: {e}")

        return posts

    def _scrape_with_http(self, name: str, sort: str, limit: int, time_filter: str) -> list[RedditPost]:
        """Scrape using HTTP fallback."""
        posts = []
        after = None
        remaining = limit

        with tqdm(total=limit, desc=f"r/{name}") as pbar:
            while remaining > 0:
                batch_size = min(remaining, 100)
                data = self.http.fetch_subreddit(name, sort, batch_size, time_filter, after)

                if not data:
                    logger.warning("No data returned, stopping.")
                    break

                batch = self.http.parse_posts(data, name)
                if not batch:
                    break

                for post in batch:
                    if self.progress.is_scraped(post.id):
                        continue
                    posts.append(post)
                    self.progress.mark_scraped(post.id)
                    pbar.update(1)
                    remaining -= 1

                # Pagination
                after = data["data"].get("after")
                if not after:
                    break

        return posts

    def _praw_submission_to_post(self, submission: Any, subreddit: str) -> RedditPost:
        """Convert PRAW submission to RedditPost."""
        return RedditPost(
            id=submission.id,
            title=submission.title,
            selftext=submission.selftext,
            author=str(submission.author) if submission.author else "[deleted]",
            score=submission.score,
            num_comments=submission.num_comments,
            permalink=submission.permalink,
            created_utc=submission.created_utc,
            subreddit=subreddit,
            url=submission.url,
        )

    def scrape_comments(self, post_id: str, subreddit: str) -> list[dict]:
        """
        Scrape comments for a specific post.

        Args:
            post_id: Reddit post ID
            subreddit: Subreddit name

        Returns:
            List of comment dictionaries
        """
        if self.use_praw:
            try:
                submission = self.reddit.submission(id=post_id)
                submission.comments.replace_more(limit=0)  # Skip "more" objects
                comments = []
                for comment in submission.comments.list():
                    comments.append({
                        "id": comment.id,
                        "body": comment.body,
                        "author": str(comment.author) if comment.author else "[deleted]",
                        "score": comment.score,
                        "created_utc": comment.created_utc,
                        "parent_id": comment.parent_id,
                    })
                time.sleep(self.config["scraping"].get("request_delay", REQUEST_DELAY))
                return comments
            except Exception as e:
                logger.error(f"Error fetching comments via PRAW: {e}")
                return []
        else:
            data = self.http.fetch_comments(post_id, subreddit)
            if data and len(data) >= 2:
                return self.http.parse_comments(data)
            return []

    def save_posts(self, posts: list[RedditPost], filepath: str,
                   subreddit: str, sort_method: str) -> None:
        """
        Save posts to JSONL file with metadata.

        Args:
            posts: List of RedditPost objects
            filepath: Output file path
            subreddit: Subreddit name for metadata
            sort_method: Sort method for metadata
        """
        anonymize = self.config["output"].get("anonymize_usernames", True)
        include_metadata = self.config["output"].get("include_metadata", True)

        with open(filepath, "w", encoding="utf-8") as f:
            for post in posts:
                record = post.to_dict(anonymize=anonymize)
                if include_metadata:
                    record["_metadata"] = {
                        "scrape_date": datetime.now(timezone.utc).isoformat(),
                        "subreddit": subreddit,
                        "sort_method": sort_method,
                        "source": "praw" if self.use_praw else "http",
                    }
                f.write(json.dumps(record, ensure_ascii=False) + "\n")

        logger.info(f"Saved {len(posts)} posts to {filepath}")

    def run(self, subreddits: Optional[list[str]] = None,
            sort: Optional[str] = None,
            limit: Optional[int] = None,
            time_filter: Optional[str] = None) -> dict:
        """
        Run the full scraping pipeline.

        Args:
            subreddits: List of subreddit names (uses config default if None)
            sort: Sort method (uses config default if None)
            limit: Post limit per subreddit (uses config default if None)
            time_filter: Time filter for top sort (uses config default if None)

        Returns:
            Dictionary with scraping statistics
        """
        subreddits = subreddits or self.config["scraping"].get("subreddits", DEFAULT_SUBREDDITS)
        sort = sort or self.config["scraping"].get("sort", "hot")
        limit = limit or self.config["scraping"].get("limit", 100)
        time_filter = time_filter or self.config["scraping"].get("time_filter", "all")

        stats = {
            "total_posts": 0,
            "total_comments": 0,
            "subreddits": {},
            "started_at": datetime.now(timezone.utc).isoformat(),
        }

        for subreddit in subreddits:
            logger.info(f"\n{'='*50}")
            logger.info(f"Processing r/{subreddit}")
            logger.info(f"{'='*50}")

            # Check for existing file to resume
            safe_name = re.sub(r"[^\w]", "_", subreddit)
            filename = f"{safe_name}_{sort}_{time_filter}_{datetime.now():%Y%m%d}.jsonl"
            filepath = self.output_dir / filename

            # Scrape posts
            posts = self.scrape_subreddit(subreddit, sort, limit, time_filter)

            # Scrape comments for each post
            max_comments = self.config["scraping"].get("max_comments_per_post", 100)
            for post in tqdm(posts, desc="Comments", leave=False):
                if post.num_comments > 0:
                    comments = self.scrape_comments(post.id, subreddit)
                    post.comments = comments[:max_comments]

            # Save results
            if posts:
                self.save_posts(posts, str(filepath), subreddit, sort)
                stats["total_posts"] += len(posts)
                stats["total_comments"] += sum(len(p.comments) for p in posts)
                stats["subreddits"][subreddit] = {
                    "posts": len(posts),
                    "comments": sum(len(p.comments) for p in posts),
                    "file": str(filepath),
                }
            else:
                logger.warning(f"No posts found for r/{subreddit}")
                stats["subreddits"][subreddit] = {"posts": 0, "comments": 0, "file": None}

            # Save progress after each subreddit
            self.progress.save()

        stats["ended_at"] = datetime.now(timezone.utc).isoformat()
        logger.info(f"\n{'='*50}")
        logger.info("Scraping complete!")
        logger.info(f"Total posts: {stats['total_posts']}")
        logger.info(f"Total comments: {stats['total_comments']}")
        logger.info(f"{'='*50}")

        return stats


def load_config(config_path: str) -> dict:
    """Load configuration from YAML file."""
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def create_sample_config(path: str) -> None:
    """Create a sample configuration file."""
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(DEFAULT_CONFIG, f, default_flow_style=False, sort_keys=False)
    logger.info(f"Created sample config: {path}")


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

def main():
    """Command-line interface for the Reddit scraper."""
    parser = argparse.ArgumentParser(
        description="Reddit Scraper for Occult Corpus Research",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --config config.yaml
  %(prog)s --subreddit occult --sort top --limit 50 --time-filter year
  %(prog)s --subreddit witchcraft,magick --sort hot --limit 200
        """,
    )
    parser.add_argument("--config", "-c", type=str, default="config.yaml",
                        help="Path to YAML configuration file")
    parser.add_argument("--subreddit", "-s", type=str,
                        help="Comma-separated list of subreddits to scrape")
    parser.add_argument("--sort", type=str, choices=VALID_SORT_METHODS, default="hot",
                        help="Sort method for posts")
    parser.add_argument("--limit", "-l", type=int, default=100,
                        help="Maximum number of posts per subreddit")
    parser.add_argument("--time-filter", "-t", type=str, choices=VALID_TIME_FILTERS, default="all",
                        help="Time filter for 'top' sort")
    parser.add_argument("--output-dir", "-o", type=str, default="data/raw/reddit",
                        help="Output directory for scraped data")
    parser.add_argument("--create-config", action="store_true",
                        help="Create a sample configuration file and exit")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Enable verbose logging")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    if args.create_config:
        create_sample_config("config.yaml")
        return

    # Load or create config
    if os.path.exists(args.config):
        config = load_config(args.config)
        logger.info(f"Loaded configuration from {args.config}")
    else:
        logger.warning(f"Config file not found: {args.config}. Using defaults.")
        config = DEFAULT_CONFIG.copy()

    # Override config with CLI arguments
    if args.output_dir:
        config.setdefault("output", {})["directory"] = args.output_dir

    # Parse subreddits
    subreddits = None
    if args.subreddit:
        subreddits = [s.strip() for s in args.subreddit.split(",")]

    # Run scraper
    scraper = RedditScraper(config)
    stats = scraper.run(
        subreddits=subreddits,
        sort=args.sort,
        limit=args.limit,
        time_filter=args.time_filter,
    )

    # Print summary
    print("\n" + "="*60)
    print("SCRAPING SUMMARY")
    print("="*60)
    print(f"Total Posts:    {stats['total_posts']}")
    print(f"Total Comments: {stats['total_comments']}")
    print(f"Started:        {stats['started_at']}")
    print(f"Ended:          {stats['ended_at']}")
    print("\nPer Subreddit:")
    for sub, data in stats["subreddits"].items():
        print(f"  r/{sub:<20} | Posts: {data['posts']:<5} | Comments: {data['comments']:<5}")
    print("="*60)


# ---------------------------------------------------------------------------
# Sample Run
# ---------------------------------------------------------------------------

def sample_run():
    """
    Run a small sample scrape to verify the pipeline works.
    Fetches 10 posts from r/occult using HTTP fallback (no API credentials needed).
    """
    print("\n" + "="*60)
    print("SAMPLE RUN: Fetching 10 posts from r/occult")
    print("="*60 + "\n")

    config = DEFAULT_CONFIG.copy()
    config["output"]["directory"] = "data/raw/reddit/sample"
    config["scraping"]["limit"] = 10

    scraper = RedditScraper(config)
    posts = scraper.scrape_subreddit("occult", sort="hot", limit=10)

    print(f"\nFetched {len(posts)} posts:\n")
    for i, post in enumerate(posts[:5], 1):
        print(f"{i}. {post.title[:80]}{'...' if len(post.title) > 80 else ''}")
        print(f"   Score: {post.score} | Comments: {post.num_comments} | Author: {post.author[:20]}")
        print()

    # Save sample
    if posts:
        sample_file = Path(config["output"]["directory"]) / "sample_run.jsonl"
        sample_file.parent.mkdir(parents=True, exist_ok=True)
        scraper.save_posts(posts, str(sample_file), "occult", "hot")
        print(f"Sample saved to: {sample_file}")

    return posts


if __name__ == "__main__":
    # Check if user wants sample run
    if len(sys.argv) > 1 and sys.argv[1] == "--sample":
        sample_run()
    else:
        main()
