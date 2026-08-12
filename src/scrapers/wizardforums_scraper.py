#!/usr/bin/env python3
"""
WizardForums Scraper for Occult Corpus Research

Scrapes thread posts from wizardforums.com (XenForo-based forum).
Respects rate limits, anonymizes usernames, outputs JSONL.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import random
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
]

FORUM_ID_PATTERN = re.compile(r"/forums/[^/]+\.(\d+)/")
THREAD_ID_PATTERN = re.compile(r"/threads/[^/]+\.(\d+)/")
MEMBER_ID_PATTERN = re.compile(r"/members/[^/]+\.(\d+)/")
POST_ID_PATTERN = re.compile(r"post-(\d+)")
PAGE_PATTERN = re.compile(r"/page-(\d+)")


def _anonymize(text: str) -> str:
    """Create a deterministic hash for anonymization."""
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _safe_get_text(tag: Optional[Tag], default: str = "") -> str:
    """Safely get stripped text from a BeautifulSoup tag."""
    if tag is None:
        return default
    return tag.get_text(strip=True)


class WizardforumsScraper:
    """
    Scraper for wizardforums.com

    Example:
        scraper = WizardforumsScraper({
            "base_url": "https://wizardforums.com",
            "output_dir": "data/raw/wizardforums",
            "rate_limit": 2.0,
            "max_threads_per_forum": 50,
        })
        scraper.run()
    """

    def __init__(self, config: dict[str, Any]) -> None:
        self.base_url = config.get("base_url", "https://wizardforums.com").rstrip("/")
        self.output_dir = Path(config.get("output_dir", "data/raw/wizardforums"))
        self.rate_limit = float(config.get("rate_limit", 2.0))
        self.max_threads_per_forum = int(config.get("max_threads_per_forum", 100))
        self.max_posts_per_thread = int(config.get("max_posts_per_thread", 500))
        self.forums_filter = config.get("forums", [])  # list of forum IDs or URLs to scrape
        self.progress_file = Path(config.get("progress_file", self.output_dir / ".progress.json"))

        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
        })

        self._last_request_time: float = 0.0
        self._progress: dict[str, Any] = {}

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._load_progress()

    # ------------------------------------------------------------------ #
    # HTTP helpers
    # ------------------------------------------------------------------ #
    def _rotate_ua(self) -> None:
        self.session.headers["User-Agent"] = random.choice(USER_AGENTS)

    def _get(self, url: str, retries: int = 3) -> Optional[BeautifulSoup]:
        """Fetch URL with rate limiting and exponential backoff."""
        # Rate limit
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit:
            sleep_time = self.rate_limit - elapsed
            logger.debug("Rate limit sleeping %.2fs", sleep_time)
            time.sleep(sleep_time)

        self._rotate_ua()

        for attempt in range(retries):
            try:
                logger.debug("GET %s (attempt %d/%d)", url, attempt + 1, retries)
                resp = self.session.get(url, timeout=30)
                self._last_request_time = time.time()

                if resp.status_code == 429 or resp.status_code == 503:
                    wait = (2 ** attempt) + random.uniform(0, 1)
                    logger.warning("HTTP %d on %s — backing off %.1fs", resp.status_code, url, wait)
                    time.sleep(wait)
                    continue

                if resp.status_code != 200:
                    logger.error("HTTP %d on %s", resp.status_code, url)
                    return None

                return BeautifulSoup(resp.text, "lxml")

            except requests.RequestException as exc:
                logger.warning("Request error on %s: %s", url, exc)
                time.sleep((2 ** attempt) + random.uniform(0, 1))

        logger.error("Failed to fetch %s after %d attempts", url, retries)
        return None

    # ------------------------------------------------------------------ #
    # Progress persistence
    # ------------------------------------------------------------------ #
    def _load_progress(self) -> None:
        if self.progress_file.exists():
            try:
                with open(self.progress_file, "r", encoding="utf-8") as fh:
                    self._progress = json.load(fh)
                logger.info("Loaded progress: %d forums, %d threads completed",
                    len(self._progress.get("completed_forums", [])),
                    len(self._progress.get("completed_threads", [])),
                )
            except Exception as exc:
                logger.warning("Could not load progress file: %s", exc)
                self._progress = {"completed_forums": [], "completed_threads": []}
        else:
            self._progress = {"completed_forums": [], "completed_threads": []}

    def _save_progress(self) -> None:
        try:
            with open(self.progress_file, "w", encoding="utf-8") as fh:
                json.dump(self._progress, fh, indent=2)
        except Exception as exc:
            logger.warning("Could not save progress: %s", exc)

    def _is_thread_completed(self, thread_id: str) -> bool:
        return thread_id in self._progress.get("completed_threads", [])

    def _mark_thread_completed(self, thread_id: str) -> None:
        self._progress.setdefault("completed_threads", []).append(thread_id)
        self._save_progress()

    # ------------------------------------------------------------------ #
    # Parsing helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _extract_id(pattern: re.Pattern, url: str) -> Optional[str]:
        m = pattern.search(url)
        return m.group(1) if m else None

    @staticmethod
    def _parse_post_content(post_article: Tag) -> str:
        """Extract plain text from a post's content <article>."""
        # Remove blockquotes (they are quotes from other posts)
        for bq in post_article.find_all("blockquote"):
            bq.decompose()
        # Remove "Click to expand..." buttons
        for btn in post_article.find_all("button"):
            btn.decompose()
        # Remove "Post automatically merged:" notes and their timestamps
        for txt in post_article.find_all(string=re.compile(r"Post automatically merged")):
            parent = txt.parent
            if parent:
                parent.decompose()
        # Remove "Last edited:" lines
        for txt in post_article.find_all(string=re.compile(r"Last edited")):
            parent = txt.parent
            if parent:
                parent.decompose()
        # Get clean text
        text = post_article.get_text(separator="\n", strip=True)
        # Collapse excessive whitespace
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text

    # ------------------------------------------------------------------ #
    # Discovery
    # ------------------------------------------------------------------ #
    def get_forum_list(self) -> list[dict[str, str]]:
        """
        Get list of forums from the home page.
        Returns list of {id, name, url, category} dicts.
        """
        soup = self._get(self.base_url + "/")
        if soup is None:
            return []

        forums: list[dict[str, str]] = []
        seen_ids: set[str] = set()

        # Find all forum links — XenForo uses h3 > a for forum names on index
        for heading in soup.find_all(["h2", "h3"]):
            link = heading.find("a", href=re.compile(r"/forums/[^/]+\.\d+/"))
            if not link:
                continue

            name = link.get_text(strip=True)
            href = link.get("href", "")
            if not href:
                continue

            forum_url = urljoin(self.base_url, href)
            forum_id = self._extract_id(FORUM_ID_PATTERN, forum_url)
            if not forum_id or forum_id in seen_ids:
                continue

            seen_ids.add(forum_id)

            # Try to find the parent category (preceding h2)
            category = ""
            prev = heading.find_previous("h2")
            if prev:
                cat_link = prev.find("a")
                if cat_link:
                    category = cat_link.get_text(strip=True)

            forums.append({
                "id": forum_id,
                "name": name,
                "url": forum_url,
                "category": category,
            })

        logger.info("Discovered %d forums", len(forums))
        return forums

    def get_thread_list(self, forum_url: str, page: int = 1) -> list[dict[str, Any]]:
        """
        Get threads from a forum listing page.
        Returns list of thread dicts.
        """
        url = f"{forum_url}page-{page}" if page > 1 else forum_url
        soup = self._get(url)
        if soup is None:
            return []

        threads: list[dict[str, Any]] = []

        # Each thread block contains title, author, stats, last-post info
        # The structure varies slightly, but thread titles are in <a> linking to /threads/...
        for link in soup.find_all("a", href=THREAD_ID_PATTERN):
            href = link.get("href", "")
            thread_url = urljoin(self.base_url, href)
            thread_id = self._extract_id(THREAD_ID_PATTERN, thread_url)
            if not thread_id:
                continue

            # Skip if already done
            if self._is_thread_completed(thread_id):
                continue

            # Clean URL to base thread URL (remove /page-N, /post-XXXX, /latest)
            base_url = re.sub(r"/page-\d+|/post-\d+|/latest$", "", thread_url)

            title = link.get_text(strip=True)
            if not title:
                continue

            # Find the containing block to extract stats
            # Walk up to find a container with reply/view counts
            container = link
            replies = "0"
            views = "0"
            author = ""
            start_time = ""
            prefix = ""

            for _ in range(6):
                container = container.parent
                if container is None:
                    break

                # Look for prefix tag
                prefix_link = container.find("a", href=re.compile(r"prefix_id"))
                if prefix_link and not prefix:
                    prefix = prefix_link.get_text(strip=True)

                # Look for stats dt/dd
                dt_replies = container.find("dt", string=re.compile(r"Replies", re.I))
                if dt_replies:
                    dd = dt_replies.find_next_sibling("dd")
                    if dd:
                        replies = dd.get_text(strip=True).replace(",", "").replace("K", "000")

                dt_views = container.find("dt", string=re.compile(r"Views", re.I))
                if dt_views:
                    dd = dt_views.find_next_sibling("dd")
                    if dd:
                        views = dd.get_text(strip=True).replace(",", "").replace("K", "000")

                # Author / start time
                time_tag = container.find("time")
                if time_tag and not start_time:
                    start_time = time_tag.get_text(strip=True)

                # Author link (member link near the thread link)
                member_links = container.find_all("a", href=MEMBER_ID_PATTERN)
                for ml in member_links:
                    txt = ml.get_text(strip=True)
                    if txt and txt != title and not prefix:
                        author = txt
                        break

                if replies != "0" and views != "0":
                    break

            threads.append({
                "id": thread_id,
                "title": title,
                "url": base_url,
                "author": author,
                "start_time": start_time,
                "replies": replies,
                "views": views,
                "prefix": prefix,
            })

        # Check for next page
        has_next = False
        nav = soup.find("nav")
        if nav:
            next_link = nav.find("a", string=re.compile(r"Next"))
            if next_link:
                has_next = True

        logger.debug("Found %d threads on %s (page %d)", len(threads), forum_url, page)
        return threads, has_next

    def get_thread_posts(self, thread_url: str) -> Optional[dict[str, Any]]:
        """
        Scrape all posts from a thread (follows pagination).
        Returns a dict with thread metadata and list of posts.
        """
        all_posts: list[dict[str, Any]] = []
        thread_title = ""
        thread_id = ""
        forum_name = ""
        forum_id = ""
        current_url = thread_url
        page = 1

        while current_url and page <= 100:  # safety limit
            soup = self._get(current_url)
            if soup is None:
                break

            # Thread title (first h1)
            if not thread_title:
                h1 = soup.find("h1")
                if h1:
                    thread_title = h1.get_text(strip=True)

            # Breadcrumb for forum info
            if not forum_name:
                breadcrumb = soup.find_all("a", href=FORUM_ID_PATTERN)
                if breadcrumb:
                    last = breadcrumb[-1]
                    forum_name = last.get_text(strip=True)
                    forum_id = self._extract_id(FORUM_ID_PATTERN, last.get("href", ""))

            # Thread ID from canonical URL or page URL
            if not thread_id:
                thread_id = self._extract_id(THREAD_ID_PATTERN, current_url) or ""

            # Find all post articles
            articles = soup.find_all("article")
            posts_on_page = 0

            for article in articles:
                # Author info
                author_link = article.find("h4")
                if not author_link:
                    continue
                author_a = author_link.find("a", href=MEMBER_ID_PATTERN)
                if not author_a:
                    continue

                author_name = author_a.get_text(strip=True)
                author_profile_url = urljoin(self.base_url, author_a.get("href", ""))
                author_id = self._extract_id(MEMBER_ID_PATTERN, author_profile_url) or ""

                # Rank
                rank = ""
                rank_h5 = article.find("h5")
                if rank_h5:
                    rank = rank_h5.get_text(strip=True)

                # User stats
                user_stats: dict[str, str] = {}
                for dt in article.find_all("dt"):
                    label = dt.get_text(strip=True).rstrip(":")
                    dd = dt.find_next_sibling("dd")
                    if dd:
                        user_stats[label] = dd.get_text(strip=True)

                # Post number and URL
                post_num = ""
                post_url = ""
                post_id = ""
                for a in article.find_all("a", href=POST_ID_PATTERN):
                    href = a.get("href", "")
                    if "post-" in href:
                        post_url = urljoin(self.base_url, href)
                        post_id = self._extract_id(POST_ID_PATTERN, href) or ""
                        post_num = a.get_text(strip=True).lstrip("#")
                        break

                # Timestamp
                timestamp = ""
                time_tag = article.find("time")
                if time_tag:
                    timestamp = time_tag.get_text(strip=True)
                    # Also try datetime attribute
                    dt_attr = time_tag.get("datetime")
                    if dt_attr:
                        timestamp = dt_attr

                # Post content
                content = ""
                # The post content is in an inner <article> tag
                inner_articles = article.find_all("article", recursive=False)
                if inner_articles:
                    content = self._parse_post_content(inner_articles[0])
                else:
                    # Fallback: look for the main content block
                    content_div = article.find("div", class_=re.compile(r"message-|bbWrapper"))
                    if content_div:
                        content = content_div.get_text(separator="\n", strip=True)

                # Reactions
                reactions: list[str] = []
                reaction_section = article.find(string=re.compile(r"Reactions:"))
                if reaction_section:
                    parent = reaction_section.parent
                    if parent:
                        for a in parent.find_all("a", href=MEMBER_ID_PATTERN):
                            reactions.append(a.get_text(strip=True))

                all_posts.append({
                    "post_id": post_id,
                    "post_number": post_num,
                    "post_url": post_url,
                    "timestamp": timestamp,
                    "content": content,
                    "author_name_hash": _anonymize(author_name) if author_name else "",
                    "author_id_hash": _anonymize(author_id) if author_id else "",
                    "author_rank": rank,
                    "author_joined": user_stats.get("Joined", ""),
                    "author_messages": user_stats.get("Messages", ""),
                    "author_reaction_score": user_stats.get("Reaction score", ""),
                    "author_awards": user_stats.get("Awards", ""),
                    "reactions": reactions,
                })
                posts_on_page += 1

            logger.debug("Thread %s page %d: %d posts", thread_url, page, posts_on_page)

            # Next page
            next_url = None
            nav = soup.find("nav")
            if nav:
                next_link = nav.find("a", string=re.compile(r"Next"))
                if next_link:
                    href = next_link.get("href", "")
                    if href:
                        next_url = urljoin(self.base_url, href)

            if not next_url or next_url == current_url:
                break

            current_url = next_url
            page += 1

            if len(all_posts) >= self.max_posts_per_thread:
                logger.info("Reached max posts limit (%d) for thread %s", self.max_posts_per_thread, thread_url)
                break

        return {
            "thread_id": thread_id,
            "thread_title": thread_title,
            "thread_url": thread_url,
            "forum_name": forum_name,
            "forum_id": forum_id,
            "scrape_timestamp": datetime.now(timezone.utc).isoformat(),
            "post_count": len(all_posts),
            "posts": all_posts,
        }

    # ------------------------------------------------------------------ #
    # Scraping orchestration
    # ------------------------------------------------------------------ #
    def scrape_forum(self, forum_id: str, forum_name: str, forum_url: str, max_threads: Optional[int] = None) -> None:
        """Scrape threads from a single forum."""
        max_t = max_threads or self.max_threads_per_forum
        output_file = self.output_dir / f"forum_{forum_id}_{_anonymize(forum_name)[:8]}.jsonl"

        logger.info("Scraping forum '%s' (ID: %s) — max %d threads", forum_name, forum_id, max_t)

        threads_scraped = 0
        page = 1
        current_forum_url = forum_url

        while threads_scraped < max_t and page <= 500:
            threads, has_next = self.get_thread_list(current_forum_url, page)

            if not threads:
                logger.info("No more threads found on page %d of %s", page, forum_name)
                break

            for thread in threads:
                if threads_scraped >= max_t:
                    break

                thread_id = thread["id"]
                if self._is_thread_completed(thread_id):
                    logger.debug("Skipping already-completed thread %s", thread_id)
                    continue

                logger.info("Scraping thread '%s' (%s) — %s/%s",
                    thread["title"][:60], thread_id,
                    threads_scraped + 1, max_t,
                )

                result = self.get_thread_posts(thread["url"])
                if result is None:
                    logger.warning("Failed to scrape thread %s", thread_id)
                    continue

                # Append to JSONL
                with open(output_file, "a", encoding="utf-8") as fh:
                    fh.write(json.dumps(result, ensure_ascii=False) + "\n")

                self._mark_thread_completed(thread_id)
                threads_scraped += 1

            if not has_next:
                break

            page += 1

        logger.info("Finished forum '%s': %d threads scraped", forum_name, threads_scraped)

    def run(self) -> None:
        """Main entry point: discover forums and scrape them."""
        logger.info("=== WizardForums Scraper Starting ===")
        logger.info("Base URL: %s", self.base_url)
        logger.info("Output dir: %s", self.output_dir)

        forums = self.get_forum_list()
        if not forums:
            logger.error("No forums discovered — aborting")
            return

        # Filter if specified
        if self.forums_filter:
            forums = [f for f in forums if f["id"] in self.forums_filter or f["url"] in self.forums_filter]
            logger.info("Filtered to %d forums", len(forums))

        for forum in forums:
            if forum["id"] in self._progress.get("completed_forums", []):
                logger.info("Skipping already-completed forum %s", forum["name"])
                continue

            self.scrape_forum(forum["id"], forum["name"], forum["url"])
            self._progress.setdefault("completed_forums", []).append(forum["id"])
            self._save_progress()

        logger.info("=== WizardForums Scraper Finished ===")


# ---------------------------------------------------------------------- #
# CLI
# ---------------------------------------------------------------------- #
def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Scrape wizardforums.com")
    parser.add_argument("--config", default="config.yaml", help="Config file path")
    parser.add_argument("--output", default="data/raw/wizardforums", help="Output directory")
    parser.add_argument("--rate-limit", type=float, default=2.0, help="Seconds between requests")
    parser.add_argument("--max-threads", type=int, default=100, help="Max threads per forum")
    parser.add_argument("--forum", action="append", help="Specific forum ID(s) to scrape")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose logging")

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    config: dict[str, Any] = {
        "base_url": "https://wizardforums.com",
        "output_dir": args.output,
        "rate_limit": args.rate_limit,
        "max_threads_per_forum": args.max_threads,
    }
    if args.forum:
        config["forums"] = args.forum

    scraper = WizardforumsScraper(config)
    scraper.run()


if __name__ == "__main__":
    main()
