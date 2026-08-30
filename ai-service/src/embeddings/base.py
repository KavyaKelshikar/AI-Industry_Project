"""
Base abstraction for vector embedding services.
"""

from abc import ABC, abstractmethod
from typing import Any, List, Optional


class BaseEmbeddingService(ABC):
    """
    Abstract Base Class for text embedding providers.
    Decouples document processing & RAG retrieval from specific embedding models.
    """

    def __init__(self, model_name: Optional[str] = None, **kwargs):
        self._model_name = model_name

    @abstractmethod
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embedding vectors for a list of document chunk texts.

        Args:
            texts: List of string chunks to embed.

        Returns:
            List of float vectors, where each vector matches the model's dimension.
        """
        pass

    @abstractmethod
    def embed_query(self, text: str) -> List[float]:
        """
        Generate an embedding vector for a single query text.

        Args:
            text: Query string to embed.

        Returns:
            Float vector matching the model's dimension.
        """
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Name or identifier of the embedding model."""
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Dimensionality of the generated embedding vectors."""
        pass

    def get_chroma_embedding_function(self) -> Optional[Any]:
        """
        Return an embedding function compatible with ChromaDB collection API,
        or None if embeddings will be passed explicitly.
        """
        return None
