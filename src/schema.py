"""
Core data models for the Occult Corpus Research project.

This module defines the foundational data structures used throughout the pipeline,
from raw scraped forum data to processed NLP outputs and analysis artifacts.
"""

from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ForumPost(BaseModel):
    """
    Represents a scraped forum or Reddit post.

    Attributes:
        id: Unique identifier for the post.
        source: Platform name (e.g., 'reddit', 'wizardforums').
        subreddit: Subreddit or forum category name.
        title: Post title.
        body: Raw post body text.
        author_hash: SHA-256 hash of the author's username for anonymization.
        timestamp: UTC datetime when the post was created.
        score: Upvote count or equivalent score.
        url: Direct URL to the post.
        metadata: Additional platform-specific metadata.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str = Field(..., description="Unique post identifier")
    source: str = Field(..., description="Platform source (reddit, wizardforums)")
    subreddit: str = Field(..., description="Subreddit or forum name")
    title: str = Field(..., description="Post title")
    body: str = Field(..., description="Raw post body text")
    author_hash: str = Field(..., description="SHA-256 hashed author identifier")
    timestamp: datetime = Field(..., description="UTC creation timestamp")
    score: int = Field(default=0, ge=0, description="Score/upvote count")
    url: str = Field(..., description="Direct URL to the post")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Extra metadata")

    @field_validator("author_hash", mode="before")
    @classmethod
    def _hash_author(cls, value: str) -> str:
        """
        Ensure author identifiers are hashed for anonymity.

        If a raw username is passed, hash it. If already a 64-char hex string,
        assume it's already hashed and return as-is.
        """
        if len(value) == 64 and all(c in "0123456789abcdef" for c in value.lower()):
            return value.lower()
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    def __repr__(self) -> str:
        return f"ForumPost(id={self.id}, source={self.source}, subreddit={self.subreddit})"


class Comment(BaseModel):
    """
    Represents a comment on a forum post.

    Attributes:
        id: Unique comment identifier.
        post_id: ID of the parent post.
        parent_id: ID of the parent comment (for nested threads).
        body: Raw comment text.
        author_hash: SHA-256 hash of the author's username.
        timestamp: UTC datetime when the comment was created.
        score: Upvote count or equivalent score.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str = Field(..., description="Unique comment identifier")
    post_id: str = Field(..., description="Parent post ID")
    parent_id: Optional[str] = Field(default=None, description="Parent comment ID for nesting")
    body: str = Field(..., description="Comment body text")
    author_hash: str = Field(..., description="SHA-256 hashed author identifier")
    timestamp: datetime = Field(..., description="UTC creation timestamp")
    score: int = Field(default=0, ge=0, description="Score/upvote count")

    @field_validator("author_hash", mode="before")
    @classmethod
    def _hash_author(cls, value: str) -> str:
        """Hash raw author names; pass through existing hashes."""
        if len(value) == 64 and all(c in "0123456789abcdef" for c in value.lower()):
            return value.lower()
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    def __repr__(self) -> str:
        return f"Comment(id={self.id}, post_id={self.post_id})"


class ProcessedDocument(BaseModel):
    """
    Represents a fully processed document ready for analysis.

    This is the output of the preprocessing pipeline, containing cleaned text,
    tokens, extracted entities, topic assignments, and vector embeddings.

    Attributes:
        post_id: Reference to the original ForumPost.id.
        cleaned_text: Deduplicated, normalized, PII-scrubbed text.
        tokens: List of processed tokens (lemmatized, stopwords removed).
        entities: Named entities extracted from the document.
        topics: Topic IDs assigned by the topic model.
        embeddings: Dense vector representation of the document.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    post_id: str = Field(..., description="Reference to original post ID")
    cleaned_text: str = Field(..., description="Normalized and cleaned text")
    tokens: list[str] = Field(default_factory=list, description="Processed tokens")
    entities: list[Entity] = Field(default_factory=list, description="Extracted named entities")
    topics: list[int] = Field(default_factory=list, description="Assigned topic IDs")
    embeddings: list[float] = Field(default_factory=list, description="Document vector embedding")

    def __repr__(self) -> str:
        return (
            f"ProcessedDocument(post_id={self.post_id}, "
            f"tokens={len(self.tokens)}, entities={len(self.entities)}, topics={self.topics})"
        )


class Entity(BaseModel):
    """
    Represents a named entity extracted from a document.

    Attributes:
        name: Canonical entity name (e.g., 'Aleister Crowley').
        type: Entity type (e.g., 'PERSON', 'ORG', 'CONCEPT', 'DEITY').
        count: Frequency of occurrence across the corpus.
        contexts: Surrounding text snippets for each occurrence.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    name: str = Field(..., min_length=1, description="Canonical entity name")
    type: str = Field(..., description="Entity type category")
    count: int = Field(default=1, ge=1, description="Frequency in corpus")
    contexts: list[str] = Field(default_factory=list, description="Contextual snippets")

    def __repr__(self) -> str:
        return f"Entity(name={self.name}, type={self.type}, count={self.count})"


class Topic(BaseModel):
    """
    Represents a topic discovered by topic modeling.

    Attributes:
        id: Numeric topic identifier.
        words: Top words defining the topic.
        weights: Probability/importance weights for each word.
        document_count: Number of documents assigned to this topic.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    id: int = Field(..., ge=0, description="Topic identifier")
    words: list[str] = Field(..., min_length=1, description="Top topic words")
    weights: list[float] = Field(..., description="Word importance weights")
    document_count: int = Field(default=0, ge=0, description="Documents in topic")

    @field_validator("weights")
    @classmethod
    def _weights_match_words(cls, values: list[float], info: Any) -> list[float]:
        """Ensure weights list length matches words list length."""
        words = info.data.get("words", [])
        if len(values) != len(words):
            raise ValueError("weights must have same length as words")
        return values

    def __repr__(self) -> str:
        return f"Topic(id={self.id}, words={self.words[:3]}..., docs={self.document_count})"


class ScrapingResult(BaseModel):
    """
    Container for a batch scraping operation result.

    Attributes:
        posts: List of scraped posts.
        comments: List of scraped comments.
        errors: Any errors encountered during scraping.
        scraped_at: Timestamp of when scraping completed.
    """

    model_config = ConfigDict(frozen=False, extra="forbid")

    posts: list[ForumPost] = Field(default_factory=list)
    comments: list[Comment] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    scraped_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def total_documents(self) -> int:
        """Return total number of posts + comments."""
        return len(self.posts) + len(self.comments)

    def __repr__(self) -> str:
        return (
            f"ScrapingResult(posts={len(self.posts)}, comments={len(self.comments)}, "
            f"errors={len(self.errors)})"
        )


class NetworkEdge(BaseModel):
    """
    Represents an edge in a co-occurrence or semantic network.

    Attributes:
        source: Source node identifier.
        target: Target node identifier.
        weight: Edge weight (co-occurrence count or similarity score).
        edge_type: Type of relationship (e.g., 'cooccurrence', 'semantic').
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    weight: float = Field(..., ge=0.0, description="Edge weight")
    edge_type: str = Field(default="cooccurrence", description="Relationship type")

    def __repr__(self) -> str:
        return f"NetworkEdge({self.source} -> {self.target}, weight={self.weight:.3f})"


class AnalysisResult(BaseModel):
    """
    Container for the complete analysis output of a corpus.

    Attributes:
        topics: Discovered topics.
        entities: Extracted entities with frequencies.
        network_edges: Edges for network visualization.
        documents: Processed documents.
        analyzed_at: Timestamp of analysis completion.
    """

    model_config = ConfigDict(frozen=False, extra="forbid")

    topics: list[Topic] = Field(default_factory=list)
    entities: list[Entity] = Field(default_factory=list)
    network_edges: list[NetworkEdge] = Field(default_factory=list)
    documents: list[ProcessedDocument] = Field(default_factory=list)
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def total_entities(self) -> int:
        """Return total unique entities."""
        return len(self.entities)

    @property
    def total_topics(self) -> int:
        """Return total discovered topics."""
        return len(self.topics)

    def __repr__(self) -> str:
        return (
            f"AnalysisResult(topics={self.total_topics}, entities={self.total_entities}, "
            f"documents={len(self.documents)})"
        )
