"""
Unit tests for core data schema.

These tests validate the Pydantic models that form the backbone
of the data pipeline—from raw scraping to processed analysis output.
"""

import hashlib
from datetime import datetime, timezone

import pytest

from src.schema import (
    AnalysisResult,
    Comment,
    Entity,
    ForumPost,
    NetworkEdge,
    ProcessedDocument,
    ScrapingResult,
    Topic,
)


class TestForumPost:
    """Test suite for ForumPost model."""

    def test_create_basic_post(self) -> None:
        """Verify a minimal valid post can be created."""
        post = ForumPost(
            id="post_001",
            source="reddit",
            subreddit="occult",
            title="Test Post",
            body="This is a test post about occult topics.",
            author_hash="test_author",
            timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc),
            url="https://reddit.com/r/occult/post_001",
        )
        assert post.id == "post_001"
        assert post.score == 0  # default
        assert post.metadata == {}  # default

    def test_author_hashing(self) -> None:
        """Ensure raw author names are automatically hashed."""
        raw_name = "occult_user_123"
        expected_hash = hashlib.sha256(raw_name.encode("utf-8")).hexdigest()

        post = ForumPost(
            id="post_002",
            source="reddit",
            subreddit="witchcraft",
            title="Another Post",
            body="Body text",
            author_hash=raw_name,
            timestamp=datetime.now(timezone.utc),
            url="https://reddit.com/r/witchcraft/post_002",
        )
        assert post.author_hash == expected_hash

    def test_author_hash_passthrough(self) -> None:
        """Ensure pre-hashed values are passed through unchanged."""
        pre_hashed = "a" * 64
        post = ForumPost(
            id="post_003",
            source="reddit",
            subreddit="magick",
            title="Title",
            body="Body",
            author_hash=pre_hashed,
            timestamp=datetime.now(timezone.utc),
            url="https://reddit.com/r/magick/post_003",
        )
        assert post.author_hash == pre_hashed

    def test_score_non_negative(self) -> None:
        """Verify score cannot be negative."""
        with pytest.raises(ValueError):
            ForumPost(
                id="post_004",
                source="reddit",
                subreddit="occult",
                title="Bad Post",
                body="Body",
                author_hash="author",
                timestamp=datetime.now(timezone.utc),
                url="https://reddit.com/r/occult/post_004",
                score=-5,
            )

    def test_frozen_model(self) -> None:
        """Verify posts are immutable after creation."""
        post = ForumPost(
            id="post_005",
            source="reddit",
            subreddit="occult",
            title="Immutable",
            body="Body",
            author_hash="author",
            timestamp=datetime.now(timezone.utc),
            url="https://reddit.com/r/occult/post_005",
        )
        with pytest.raises(Exception):
            post.score = 100


class TestComment:
    """Test suite for Comment model."""

    def test_create_comment(self) -> None:
        """Verify basic comment creation."""
        comment = Comment(
            id="c_001",
            post_id="post_001",
            body="This is a comment.",
            author_hash="commenter",
            timestamp=datetime.now(timezone.utc),
        )
        assert comment.parent_id is None
        assert comment.score == 0

    def test_nested_comment(self) -> None:
        """Verify reply comments have parent_id."""
        reply = Comment(
            id="c_002",
            post_id="post_001",
            parent_id="c_001",
            body="This is a reply.",
            author_hash="replier",
            timestamp=datetime.now(timezone.utc),
            score=5,
        )
        assert reply.parent_id == "c_001"
        assert reply.score == 5


class TestEntity:
    """Test suite for Entity model."""

    def test_create_entity(self) -> None:
        """Verify entity creation with contexts."""
        entity = Entity(
            name="Aleister Crowley",
            type="PERSON",
            count=42,
            contexts=["Crowley founded the A∴A∴ in 1907."],
        )
        assert entity.type == "PERSON"
        assert entity.count == 42

    def test_min_count(self) -> None:
        """Verify count must be at least 1."""
        with pytest.raises(ValueError):
            Entity(name="Test", type="CONCEPT", count=0)

    def test_empty_name(self) -> None:
        """Verify name cannot be empty."""
        with pytest.raises(ValueError):
            Entity(name="", type="DEITY")


class TestTopic:
    """Test suite for Topic model."""

    def test_create_topic(self) -> None:
        """Verify topic with word weights."""
        topic = Topic(
            id=0,
            words=["ritual", "circle", "invoke", "elemental", "guardian"],
            weights=[0.15, 0.12, 0.10, 0.08, 0.07],
            document_count=150,
        )
        assert topic.id == 0
        assert len(topic.words) == len(topic.weights)

    def test_weights_length_mismatch(self) -> None:
        """Verify weights must match words length."""
        with pytest.raises(ValueError):
            Topic(
                id=1,
                words=["word1", "word2"],
                weights=[0.5],
            )


class TestProcessedDocument:
    """Test suite for ProcessedDocument model."""

    def test_create_processed_doc(self) -> None:
        """Verify processed document creation."""
        doc = ProcessedDocument(
            post_id="post_001",
            cleaned_text="cleaned and normalized text",
            tokens=["cleaned", "normalized", "text"],
            topics=[0, 3],
            embeddings=[0.1] * 384,
        )
        assert doc.post_id == "post_001"
        assert len(doc.embeddings) == 384


class TestNetworkEdge:
    """Test suite for NetworkEdge model."""

    def test_create_edge(self) -> None:
        """Verify network edge creation."""
        edge = NetworkEdge(
            source="Aleister Crowley",
            target="Thelema",
            weight=0.85,
            edge_type="semantic",
        )
        assert edge.edge_type == "semantic"
        assert edge.weight >= 0


class TestScrapingResult:
    """Test suite for ScrapingResult container."""

    def test_total_documents(self) -> None:
        """Verify document counting."""
        post = ForumPost(
            id="p1", source="reddit", subreddit="occult",
            title="T", body="B", author_hash="a",
            timestamp=datetime.now(timezone.utc), url="https://example.com",
        )
        result = ScrapingResult(posts=[post], comments=[])
        assert result.total_documents == 1


class TestAnalysisResult:
    """Test suite for AnalysisResult container."""

    def test_empty_analysis(self) -> None:
        """Verify empty analysis result."""
        result = AnalysisResult()
        assert result.total_entities == 0
        assert result.total_topics == 0

    def test_analysis_with_data(self) -> None:
        """Verify analysis with topics and entities."""
        topic = Topic(id=0, words=["a", "b"], weights=[0.5, 0.5])
        entity = Entity(name="Test", type="CONCEPT")
        result = AnalysisResult(topics=[topic], entities=[entity])
        assert result.total_topics == 1
        assert result.total_entities == 1
