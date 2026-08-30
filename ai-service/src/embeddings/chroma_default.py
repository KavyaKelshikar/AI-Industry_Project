"""
Default ChromaDB embedding service implementation using all-MiniLM-L6-v2.
"""

import logging
from typing import Any, List, Optional

from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

from src.config import settings
from src.embeddings.base import BaseEmbeddingService

logger = logging.getLogger(__name__)


class ChromaDefaultEmbeddingService(BaseEmbeddingService):
    """
    Embedding service using ChromaDB's built-in DefaultEmbeddingFunction (all-MiniLM-L6-v2 ONNX).
    """

    def __init__(self, model_name: Optional[str] = None):
        self._model_name = model_name or settings.EMBEDDING_MODEL
        self._dimension = settings.EMBEDDING_DIMENSION
        self._ef: Optional[DefaultEmbeddingFunction] = None

    def _get_ef(self) -> DefaultEmbeddingFunction:
        if self._ef is None:
            logger.info("Initializing ChromaDB DefaultEmbeddingFunction (%s)", self._model_name)
            self._ef = DefaultEmbeddingFunction()
        return self._ef

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple document chunks."""
        if not texts:
            return []
        ef = self._get_ef()
        embeddings = ef(texts)
        return [[float(val) for val in vec] for vec in embeddings]

    def embed_query(self, text: str) -> List[float]:
        """Generate embedding for a single search query."""
        ef = self._get_ef()
        embeddings = ef([text])
        return [float(val) for val in embeddings[0]]

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def dimension(self) -> int:
        return self._dimension

    def get_chroma_embedding_function(self) -> Any:
        """Return the native Chroma EmbeddingFunction instance."""
        return self._get_ef()
