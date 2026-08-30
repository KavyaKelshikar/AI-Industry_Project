"""
retrieval package — Vector similarity search and tenant-isolated retrieval foundation.
"""

from src.retrieval.exceptions import (
    EmptyQueryError,
    RetrievalEmbeddingError,
    RetrievalError,
    RetrievalSecurityError,
    RetrievalStorageError,
)
from src.retrieval.models import RetrievalQuery, RetrievalResult, RetrievedChunk
from src.retrieval.retriever import VectorRetriever, get_vector_retriever

__all__ = [
    "VectorRetriever",
    "get_vector_retriever",
    "RetrievalQuery",
    "RetrievedChunk",
    "RetrievalResult",
    "RetrievalError",
    "RetrievalSecurityError",
    "EmptyQueryError",
    "RetrievalEmbeddingError",
    "RetrievalStorageError",
]
