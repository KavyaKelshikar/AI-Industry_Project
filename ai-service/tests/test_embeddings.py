"""
Tests for Embedding service abstraction, factory, and mock provider.
"""

import pytest

from src.embeddings.base import BaseEmbeddingService
from src.embeddings.chroma_default import ChromaDefaultEmbeddingService
from src.embeddings.factory import get_embedding_service, register_embedding_provider
from src.embeddings.mock import MockEmbeddingService


class TestEmbeddingServiceAbstraction:
    def test_mock_embedding_service_dimensions(self):
        """Verify MockEmbeddingService produces vectors matching configured dimension."""
        service = MockEmbeddingService(dimension=128)
        assert service.dimension == 128
        assert service.model_name == "mock-embedding-v1"

        vectors = service.embed_documents(["First chunk", "Second chunk"])
        assert len(vectors) == 2
        assert len(vectors[0]) == 128
        assert len(vectors[1]) == 128

        query_vec = service.embed_query("Query search text")
        assert len(query_vec) == 128

    def test_mock_embedding_deterministic(self):
        """Verify mock embeddings are deterministic for identical input text."""
        service = MockEmbeddingService(dimension=64)
        vec1 = service.embed_query("Identical sentence")
        vec2 = service.embed_query("Identical sentence")
        assert vec1 == vec2

    def test_embedding_factory_resolution(self):
        """Verify get_embedding_service returns configured provider instance."""
        mock_svc = get_embedding_service(provider="mock", use_cache=False)
        assert isinstance(mock_svc, MockEmbeddingService)
        assert isinstance(mock_svc, BaseEmbeddingService)

        default_svc = get_embedding_service(provider="chroma_default", use_cache=False)
        assert isinstance(default_svc, ChromaDefaultEmbeddingService)
        assert isinstance(default_svc, BaseEmbeddingService)

    def test_custom_provider_registration(self):
        """Verify custom embedding provider can be registered dynamically."""
        class CustomTestProvider(BaseEmbeddingService):
            def embed_documents(self, texts):
                return [[0.1, 0.2] for _ in texts]

            def embed_query(self, text):
                return [0.1, 0.2]

            @property
            def model_name(self):
                return "custom-test-model"

            @property
            def dimension(self):
                return 2

        register_embedding_provider("custom_test", CustomTestProvider)
        instance = get_embedding_service(provider="custom_test", use_cache=False)
        assert isinstance(instance, CustomTestProvider)
        assert instance.dimension == 2
        assert instance.embed_query("hello") == [0.1, 0.2]
