#!/usr/bin/env python3
"""
Test script for WizardForums scraper.
Verifies scraper can fetch 1-2 threads and produce valid JSONL output.
"""

import json
import logging
import tempfile
from pathlib import Path

from src.scrapers.wizardforums_scraper import WizardforumsScraper

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

TEST_THREADS = [
    "https://wizardforums.com/threads/pacts-with-unconventional-spirits.23055/",
    "https://wizardforums.com/threads/what-actually-makes-a-ritual-work.23091/",
]


def test_single_thread() -> None:
    """Test scraping a single thread."""
    with tempfile.TemporaryDirectory() as tmpdir:
        config = {
            "base_url": "https://wizardforums.com",
            "output_dir": tmpdir,
            "rate_limit": 2.0,
            "max_posts_per_thread": 200,
        }
        scraper = WizardforumsScraper(config)

        url = TEST_THREADS[0]
        logger.info("Testing thread scrape: %s", url)
        result = scraper.get_thread_posts(url)

        assert result is not None, "Scraper returned None"
        assert result["thread_id"] == "23055", f"Wrong thread ID: {result['thread_id']}"
        assert result["thread_title"] == "Pacts with unconventional spirits", \
            f"Wrong title: {result['thread_title']}"
        assert result["post_count"] > 0, "No posts found"
        assert len(result["posts"]) > 0, "Posts list empty"

        # Check first post
        first_post = result["posts"][0]
        assert first_post["post_number"] == "1", f"First post not #1: {first_post['post_number']}"
        assert first_post["content"], "First post has no content"
        assert first_post["author_name_hash"], "First post missing author hash"
        assert first_post["timestamp"], "First post missing timestamp"

        logger.info("✓ Thread %s scraped successfully: %d posts", result["thread_id"], result["post_count"])

        # Save for inspection
        out_file = Path(tmpdir) / "test_thread.jsonl"
        with open(out_file, "w", encoding="utf-8") as fh:
            fh.write(json.dumps(result, ensure_ascii=False, indent=2))
        logger.info("✓ Saved test output to %s", out_file)


def test_second_thread() -> None:
    """Test scraping another thread for consistency."""
    with tempfile.TemporaryDirectory() as tmpdir:
        config = {
            "base_url": "https://wizardforums.com",
            "output_dir": tmpdir,
            "rate_limit": 2.0,
        }
        scraper = WizardforumsScraper(config)

        url = TEST_THREADS[1]
        logger.info("Testing thread scrape: %s", url)
        result = scraper.get_thread_posts(url)

        assert result is not None, "Scraper returned None"
        assert result["thread_id"] == "23091"
        assert result["post_count"] > 0

        # Check anonymization
        for post in result["posts"]:
            assert post["author_name_hash"], "Missing author hash"
            assert post["author_id_hash"], "Missing author ID hash"
            # Hashes should be deterministic
            assert len(post["author_name_hash"]) == 16, "Hash length wrong"

        logger.info("✓ Thread %s scraped: %d posts", result["thread_id"], result["post_count"])


def test_forum_discovery() -> None:
    """Test that we can discover forums."""
    with tempfile.TemporaryDirectory() as tmpdir:
        config = {
            "base_url": "https://wizardforums.com",
            "output_dir": tmpdir,
            "rate_limit": 2.0,
        }
        scraper = WizardforumsScraper(config)

        forums = scraper.get_forum_list()
        assert len(forums) > 0, "No forums discovered"

        # Check expected forums exist
        forum_names = {f["name"] for f in forums}
        assert "General Occult Discussion" in forum_names, "Missing expected forum"

        logger.info("✓ Discovered %d forums", len(forums))
        for f in forums[:5]:
            logger.info("  - %s (ID: %s, Category: %s)", f["name"], f["id"], f["category"])


def test_jsonl_output() -> None:
    """Test JSONL output format."""
    with tempfile.TemporaryDirectory() as tmpdir:
        config = {
            "base_url": "https://wizardforums.com",
            "output_dir": tmpdir,
            "rate_limit": 2.0,
            "max_posts_per_thread": 50,
        }
        scraper = WizardforumsScraper(config)

        result = scraper.get_thread_posts(TEST_THREADS[0])
        assert result is not None

        out_file = Path(tmpdir) / "test.jsonl"
        with open(out_file, "w", encoding="utf-8") as fh:
            fh.write(json.dumps(result, ensure_ascii=False) + "\n")

        # Verify JSONL can be read back
        with open(out_file, "r", encoding="utf-8") as fh:
            lines = fh.readlines()
        assert len(lines) == 1, "Should be exactly one JSON line"

        parsed = json.loads(lines[0])
        assert parsed["thread_id"] == result["thread_id"]
        assert parsed["post_count"] == result["post_count"]

        logger.info("✓ JSONL output valid")


if __name__ == "__main__":
    logger.info("=== Running WizardForums Scraper Tests ===")

    try:
        test_forum_discovery()
    except Exception as e:
        logger.error("Forum discovery test failed: %s", e)
        raise

    try:
        test_single_thread()
    except Exception as e:
        logger.error("Single thread test failed: %s", e)
        raise

    try:
        test_second_thread()
    except Exception as e:
        logger.error("Second thread test failed: %s", e)
        raise

    try:
        test_jsonl_output()
    except Exception as e:
        logger.error("JSONL output test failed: %s", e)
        raise

    logger.info("=== All Tests Passed ===")
