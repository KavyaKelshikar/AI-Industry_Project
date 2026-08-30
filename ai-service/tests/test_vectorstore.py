"""
Tests for ChromaDB client connection, CollectionManager, and error handling.
"""

from unittest.mock import MagicMock, patch
import pytest
import chromadb
from chromadb.config import Settings as ChromaSettings

from src.vectorstore.chroma_client import get_chroma_client, verify_chroma_connection
from src.vectorstore.collection_manager import CollectionManager, get_collection_manager
from src.vectorstore.exceptions import (
    CollectionCreationError,
    CollectionNotFoundError,
    VectorStoreError,
)
from src.embeddings.mock import MockEmbeddingService


@pytest.fixture
def in_memory_chroma_client():
    """Provides an isolated in-memory ChromaDB client for fast unit tests."""
    return chromadb.Client(ChromaSettings(is_persistent=False, anonymized_telemetry=False))


@pytest.fixture
def collection_manager(in_memory_chroma_client):
    """CollectionManager instance using the isolated in-memory client."""
    return CollectionManager(client=in_memory_chroma_client)


@pytest.fixture
def mock_embedder():
    return MockEmbeddingService(dimension=64)


class TestChromaAvailability:
    @pytest.mark.asyncio
    async def test_verify_chroma_connection_success(self):
        """Verify heartbeat check returns True when ChromaDB is responsive."""
        mock_client = MagicMock()
        mock_client.heartbeat.return_value = 1234567890
        with patch("src.vectorstore.chroma_client.get_chroma_client", return_value=mock_client):
            is_connected = await verify_chroma_connection()
            assert is_connected is True
            mock_client.heartbeat.assert_called_once()

    @pytest.mark.asyncio
    async def test_verify_chroma_connection_failure_handled_gracefully(self):
        """Verify heartbeat check returns False and does not raise on connection failure."""
        mock_client = MagicMock()
        mock_client.heartbeat.side_effect = Exception("Connection refused")
        with patch("src.vectorstore.chroma_client.get_chroma_client", return_value=mock_client):
            is_connected = await verify_chroma_connection()
            assert is_connected is False


class TestCollectionManager:
    def test_create_collection(self, collection_manager, mock_embedder):
        """Test creating a new collection with metadata and embedding function."""
        col_name = "test_docs"
        col = collection_manager.get_or_create_collection(
            name=col_name,
            metadata={"description": "Test Collection"},
            embedding_function=mock_embedder.get_chroma_embedding_function(),
        )
        assert col is not None
        assert col.name == col_name
        assert collection_manager.collection_exists(col_name) is True

    def test_collection_idempotency_reuse(self, collection_manager, mock_embedder):
        """Test that get_or_create_collection reuses existing collection without duplicate errors."""
        col_name = "idempotent_test"
        ef = mock_embedder.get_chroma_embedding_function()

        # First call creates
        col1 = collection_manager.get_or_create_collection(name=col_name, embedding_function=ef)
        # Add a dummy record
        col1.add(ids=["chunk-1"], documents=["Sample text content"], metadatas=[{"companyId": "comp-1"}])

        # Second call must reuse the existing collection with the data intact
        col2 = collection_manager.get_or_create_collection(name=col_name, embedding_function=ef)
        assert col1.id == col2.id
        assert col2.count() == 1

        # Verify collection list contains exactly 1 entry of this name
        collections = collection_manager.list_collections()
        assert collections.count(col_name) == 1

    def test_get_collection_info_and_count(self, collection_manager, mock_embedder):
        """Test collection count and metadata inspection."""
        col_name = "info_test"
        ef = mock_embedder.get_chroma_embedding_function()
        col = collection_manager.get_or_create_collection(
            name=col_name,
            metadata={"domain": "industrial"},
            embedding_function=ef,
        )
        col.add(
            ids=["c1", "c2"],
            documents=["First chunk", "Second chunk"],
            metadatas=[{"companyId": "c1", "chunkId": "1"}, {"companyId": "c1", "chunkId": "2"}],
        )

        assert collection_manager.get_collection_count(col_name) == 2
        info = collection_manager.get_collection_info(col_name)
        assert info["name"] == col_name
        assert info["count"] == 2
        assert info["metadata"]["domain"] == "industrial"

    def test_get_nonexistent_collection_raises_not_found(self, collection_manager):
        """Test that get_collection on a non-existent name raises CollectionNotFoundError."""
        with pytest.raises(CollectionNotFoundError):
            collection_manager.get_collection("does_not_exist_collection_xyz")

    def test_delete_collection_idempotent(self, collection_manager, mock_embedder):
        """Test deleting a collection idempotently."""
        col_name = "to_delete"
        collection_manager.get_or_create_collection(
            name=col_name,
            embedding_function=mock_embedder.get_chroma_embedding_function(),
        )
        assert collection_manager.collection_exists(col_name) is True

        # First deletion -> returns True
        assert collection_manager.delete_collection(col_name) is True
        assert collection_manager.collection_exists(col_name) is False

        # Second deletion -> returns False gracefully
        assert collection_manager.delete_collection(col_name) is False

    def test_company_collection_helper(self, collection_manager, mock_embedder):
        """Test multi-tenant company collection helpers."""
        company_id = "tenant-corp-99"
        expected_name = "company_tenant-corp-99"

        assert collection_manager.get_company_collection_name(company_id) == expected_name

        col = collection_manager.get_or_create_company_collection(
            company_id=company_id,
            embedding_function=mock_embedder.get_chroma_embedding_function(),
        )
        assert col.name == expected_name
        assert collection_manager.collection_exists(expected_name) is True


class TestChromaUnavailableFailure:
    def test_client_failure_raises_clean_exception(self):
        """Test that underlying client network/runtime exceptions are wrapped cleanly."""
        mock_client = MagicMock()
        mock_client.list_collections.side_effect = Exception("ChromaDB daemon unreachable at port 8000")
        mgr = CollectionManager(client=mock_client)

        with pytest.raises(VectorStoreError) as exc_info:
            mgr.collection_exists("test_col")
        assert "Failed to inspect collection list" in str(exc_info.value)
