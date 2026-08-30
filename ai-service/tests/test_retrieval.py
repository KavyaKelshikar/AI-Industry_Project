"""
Tests for VectorRetriever and tenant-isolated retrieval foundation.
"""

from unittest.mock import MagicMock
import chromadb
from chromadb.config import Settings as ChromaSettings
import pytest

from src.embeddings.mock import MockEmbeddingService
from src.retrieval.exceptions import (
    EmptyQueryError,
    RetrievalEmbeddingError,
    RetrievalError,
    RetrievalSecurityError,
    RetrievalStorageError,
)
from src.retrieval.models import RetrievalQuery, RetrievalResult, RetrievedChunk
from src.retrieval.retriever import VectorRetriever
from src.vectorstore.chroma_client import verify_chroma_connection
from src.vectorstore.collection_manager import CollectionManager


@pytest.fixture
def in_memory_client():
    return chromadb.Client(ChromaSettings(is_persistent=False, anonymized_telemetry=False))


@pytest.fixture
def collection_manager(in_memory_client):
    return CollectionManager(client=in_memory_client)


@pytest.fixture
def mock_embedder():
    return MockEmbeddingService(dimension=64)


@pytest.fixture
def retriever(collection_manager, mock_embedder):
    return VectorRetriever(
        collection_manager=collection_manager,
        embedding_service=mock_embedder,
        default_top_k=3,
    )


@pytest.fixture
def populated_retriever(collection_manager, mock_embedder):
    """
    Populates two distinct company collections with department-scoped chunks.
    """
    # Company A Collection
    col_a = collection_manager.get_or_create_collection(
        name="company_comp-a",
        metadata={"companyId": "comp-a"},
    )
    col_a.add(
        ids=["chunk-a-hr-1", "chunk-a-it-1", "chunk-a-fin-1"],
        documents=[
            "HR policy on annual leave and employee benefits.",
            "IT guidelines for password security and VPN access.",
            "Finance quarterly expense budget report.",
        ],
        embeddings=mock_embedder.embed_documents([
            "HR policy on annual leave and employee benefits.",
            "IT guidelines for password security and VPN access.",
            "Finance quarterly expense budget report.",
        ]),
        metadatas=[
            {"companyId": "comp-a", "documentId": "doc-a1", "departmentId": "HR", "classification": "internal", "category": "Policy", "page": 1},
            {"companyId": "comp-a", "documentId": "doc-a2", "departmentId": "IT", "classification": "internal", "category": "SOP", "page": 2},
            {"companyId": "comp-a", "documentId": "doc-a3", "departmentId": "Finance", "classification": "confidential", "category": "Report", "page": 1},
        ],
    )

    # Company B Collection
    col_b = collection_manager.get_or_create_collection(
        name="company_comp-b",
        metadata={"companyId": "comp-b"},
    )
    col_b.add(
        ids=["chunk-b-hr-1"],
        documents=["Company B HR holiday schedule."],
        embeddings=mock_embedder.embed_documents(["Company B HR holiday schedule."]),
        metadatas=[
            {"companyId": "comp-b", "documentId": "doc-b1", "departmentId": "HR", "classification": "public", "category": "Policy", "page": 1}
        ],
    )

    return VectorRetriever(
        collection_manager=collection_manager,
        embedding_service=mock_embedder,
        default_top_k=5,
    )


class TestVectorRetrieverCore:
    def test_successful_retrieval_and_structured_output(self, populated_retriever):
        result = populated_retriever.retrieve(
            query="employee vacation leave",
            company_id="comp-a",
            top_k=2,
        )

        assert isinstance(result, RetrievalResult)
        assert result.company_id == "comp-a"
        assert result.collection_name == "company_comp-a"
        assert result.total_found > 0
        assert len(result.chunks) <= 2

        chunk = result.chunks[0]
        assert isinstance(chunk, RetrievedChunk)
        assert chunk.companyId == "comp-a"
        assert chunk.documentId != ""
        assert chunk.text != ""
        assert chunk.similarity is not None
        assert 0.0 <= chunk.similarity <= 1.0

    def test_no_results_for_empty_or_nonexistent_collection(self, retriever):
        # Non-existent collection returns empty result cleanly
        result = retriever.retrieve(
            query="any query",
            company_id="nonexistent-company",
        )
        assert isinstance(result, RetrievalResult)
        assert result.total_found == 0
        assert result.chunks == []


class TestTenantIsolation:
    def test_company_a_query_never_returns_company_b_data(self, populated_retriever):
        """Verify strict tenant isolation: query for company A only searches company A."""
        result_a = populated_retriever.retrieve(
            query="HR policy",
            company_id="comp-a",
        )

        for chunk in result_a.chunks:
            assert chunk.companyId == "comp-a"
            assert chunk.chunkId != "chunk-b-hr-1"

    def test_company_b_query_only_returns_company_b_data(self, populated_retriever):
        """Verify query for company B only returns company B chunks."""
        result_b = populated_retriever.retrieve(
            query="holiday schedule",
            company_id="comp-b",
        )

        for chunk in result_b.chunks:
            assert chunk.companyId == "comp-b"
            assert chunk.chunkId == "chunk-b-hr-1"

    def test_missing_company_id_strictly_raises_security_error(self, retriever):
        with pytest.raises(RetrievalSecurityError):
            retriever.retrieve(query="search text", company_id="")

        with pytest.raises(RetrievalSecurityError):
            retriever.retrieve(query="search text", company_id="   ")


class TestDepartmentAndMetadataFiltering:
    def test_department_filter_scopes_results(self, populated_retriever):
        """Querying with departmentId='HR' returns only HR chunks."""
        res_hr = populated_retriever.retrieve(
            query="guidelines report policy",
            company_id="comp-a",
            department_id="HR",
        )

        assert res_hr.total_found >= 1
        for chunk in res_hr.chunks:
            assert chunk.departmentId == "HR"

    def test_unrestricted_company_query_returns_all_departments(self, populated_retriever):
        """Omitting departmentId allows retrieval across all company departments."""
        res_all = populated_retriever.retrieve(
            query="guidelines report policy",
            company_id="comp-a",
            top_k=5,
        )

        dept_ids = {chunk.departmentId for chunk in res_all.chunks}
        assert len(dept_ids) > 1

    def test_classification_filter(self, populated_retriever):
        """Querying with classification='confidential' returns only confidential chunks."""
        res = populated_retriever.retrieve(
            query="budget",
            company_id="comp-a",
            classification="confidential",
        )
        assert res.total_found == 1
        assert res.chunks[0].classification == "confidential"
        assert res.chunks[0].departmentId == "Finance"

    def test_category_filter(self, populated_retriever):
        """Querying with category='SOP' returns only SOP chunks."""
        res = populated_retriever.retrieve(
            query="security",
            company_id="comp-a",
            category="SOP",
        )
        assert res.total_found == 1
        assert res.chunks[0].category == "SOP"
        assert res.chunks[0].departmentId == "IT"


class TestConfigurationAndThresholding:
    def test_top_k_parameter_limits_result_count(self, populated_retriever):
        res = populated_retriever.retrieve(
            query="all docs",
            company_id="comp-a",
            top_k=1,
        )
        assert len(res.chunks) == 1

    def test_retrieval_query_model_input(self, populated_retriever):
        """VectorRetriever accepts structured RetrievalQuery model."""
        req = RetrievalQuery(
            query="leave policy",
            company_id="comp-a",
            department_id="HR",
            top_k=2,
        )
        res = populated_retriever.retrieve(req)
        assert res.total_found >= 1
        assert res.chunks[0].departmentId == "HR"


class TestFailureHandling:
    def test_empty_query_raises_empty_query_error(self, retriever):
        with pytest.raises(EmptyQueryError):
            retriever.retrieve(query="", company_id="comp-a")

        with pytest.raises(EmptyQueryError):
            retriever.retrieve(query="   ", company_id="comp-a")

    def test_invalid_top_k_raises_error(self, retriever):
        with pytest.raises(RetrievalError):
            retriever.retrieve(query="query", company_id="comp-a", top_k=0)

    def test_embedding_failure_raises_retrieval_embedding_error(self, collection_manager):
        failing_embedder = MagicMock()
        failing_embedder.embed_query.side_effect = RuntimeError("Embedding service unavailable")
        failing_embedder.model_name = "failing-model"

        col = collection_manager.get_or_create_collection("company_comp-fail")
        col.add(ids=["1"], documents=["text"], embeddings=[[0.1] * 64])

        ret = VectorRetriever(
            collection_manager=collection_manager,
            embedding_service=failing_embedder,
        )
        with pytest.raises(RetrievalEmbeddingError):
            ret.retrieve(query="test", company_id="comp-fail")

    def test_storage_failure_raises_retrieval_storage_error(self, mock_embedder):
        mock_mgr = MagicMock()
        mock_mgr.collection_exists.return_value = True
        mock_col = MagicMock()
        mock_col.count.return_value = 5
        mock_col.query.side_effect = RuntimeError("ChromaDB query execution error")
        mock_mgr.get_collection.return_value = mock_col
        mock_mgr.get_company_collection_name.return_value = "company_comp-err"

        ret = VectorRetriever(
            collection_manager=mock_mgr,
            embedding_service=mock_embedder,
        )
        with pytest.raises(RetrievalStorageError):
            ret.retrieve(query="test", company_id="comp-err")


class TestLiveChromaRetrievalIntegration:
    @pytest.mark.asyncio
    async def test_live_chroma_retrieval_if_available(self):
        """Integration test against live ChromaDB instance if reachable."""
        is_live = await verify_chroma_connection()
        if not is_live:
            pytest.skip("ChromaDB daemon is not reachable on localhost:8000; skipping live retrieval integration test.")

        retriever = VectorRetriever()
        result = retriever.retrieve(
            query="test integration search",
            company_id="live-tenant-001",
        )
        assert isinstance(result, RetrievalResult)
