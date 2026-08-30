"""
embeddings package — Modular text embedding services and provider abstraction.
"""

from src.embeddings.base import BaseEmbeddingService
from src.embeddings.chroma_default import ChromaDefaultEmbeddingService
from src.embeddings.factory import get_embedding_service, register_embedding_provider
from src.embeddings.mock import MockEmbeddingService

__all__ = [
    "BaseEmbeddingService",
    "ChromaDefaultEmbeddingService",
    "MockEmbeddingService",
    "get_embedding_service",
    "register_embedding_provider",
]
