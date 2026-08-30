"""
Mock embedding service for isolated testing and offline development.
"""

import hashlib
import math
from typing import Any, List, Optional

from src.embeddings.base import BaseEmbeddingService


class MockEmbeddingService(BaseEmbeddingService):
    """
    Deterministic mock embedding service that generates normalized float vectors
    based on string hashing without downloading ML models or requiring internet.
    """

    def __init__(self, model_name: str = "mock-embedding-v1", dimension: int = 384):
        self._model_name = model_name
        self._dimension = dimension

    def _generate_vector(self, text: str) -> List[float]:
        """Generate a deterministic normalized pseudo-embedding vector for text."""
        # Use SHA-256 to seed values
        raw_bytes = hashlib.sha256(text.encode("utf-8")).digest()
        vec = []
        for i in range(self._dimension):
            byte_val = raw_bytes[i % len(raw_bytes)]
            val = ((byte_val + i) % 100) / 100.0 - 0.5
            vec.append(val)

        # Normalize vector
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [round(x / norm, 6) for x in vec]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._generate_vector(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._generate_vector(text)

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def dimension(self) -> int:
        return self._dimension

    def get_chroma_embedding_function(self) -> Optional[Any]:
        from chromadb.api.types import Documents, EmbeddingFunction, Embeddings

        class _ChromaMockEF(EmbeddingFunction[Documents]):
            def __init__(self, parent: "MockEmbeddingService"):
                self.parent = parent

            def __call__(self, input: Documents) -> Embeddings:
                return self.parent.embed_documents(input)

            @staticmethod
            def name() -> str:
                return "mock_embedding_function"

            def get_config(self) -> dict:
                return {"model": self.parent.model_name, "dimension": self.parent.dimension}

            @classmethod
            def build_from_config(cls, config: dict) -> "_ChromaMockEF":
                parent = MockEmbeddingService(
                    model_name=config.get("model", "mock-embedding-v1"),
                    dimension=config.get("dimension", 384),
                )
                return cls(parent)

        return _ChromaMockEF(self)
