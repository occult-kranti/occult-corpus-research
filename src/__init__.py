"""
Occult Corpus Research package.

A computational research platform for analyzing occult discourse
in online communities through NLP and network analysis.
"""

__version__ = "0.1.0"

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

__all__ = [
    "ForumPost",
    "Comment",
    "ProcessedDocument",
    "Entity",
    "Topic",
    "NetworkEdge",
    "ScrapingResult",
    "AnalysisResult",
]
