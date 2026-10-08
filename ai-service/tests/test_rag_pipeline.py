"""
Tests for Enterprise RAG Pipeline, Tenant Isolation, Filtering, and Provenance Citations.
"""

import chromadb
from chromadb.config import Settings as ChromaSettings
import pytest

from src.embeddings.mock import MockEmbeddingService
from src.llm.client import DeterministicGroundingLLMClient
from src.retrieval.exceptions import RetrievalError, RetrievalSecurityError
from src.retrieval.models import ChatMessageItem
from src.retrieval.rag_pipeline import RAGPipeline
from src.retrieval.retriever import VectorRetriever
from src.vectorstore.collection_manager import CollectionManager
from src.vectorstore.metadata import DocumentChunkMetadata


@pytest.fixture
def chroma_env():
    """Create an isolated in-memory collection manager and retriever for tests."""
    client = chromadb.Client(ChromaSettings(is_persistent=False, anonymized_telemetry=False))
    manager = CollectionManager(client=client)
    embedder = MockEmbeddingService(dimension=64)
    retriever = VectorRetriever(collection_manager=manager, embedding_service=embedder)
    llm = DeterministicGroundingLLMClient()
    pipeline = RAGPipeline(retriever=retriever, llm_client=llm)
    return {
        "manager": manager,
        "retriever": retriever,
        "pipeline": pipeline,
        "embedder": embedder,
    }


def test_rag_pipeline_successful_grounded_answer(chroma_env):
    """Verify RAG retrieval returns grounded answer with full source citations."""
    manager = chroma_env["manager"]
    pipeline = chroma_env["pipeline"]
    embedder = chroma_env["embedder"]

    # Ingest document into company-100
    col = manager.get_or_create_company_collection("company-100")
    meta = DocumentChunkMetadata(
        documentId="doc-sop-1",
        companyId="company-100",
        chunkId="chunk-sop-1",
        source="manufacturing_guide.pdf",
        page=2,
        classification="internal",
        category="SOP",
    )
    text = "Conveyor belts must be inspected every morning before the shift begins."
    vecs = embedder.embed_documents([text])

    col.add(
        ids=["chunk-sop-1"],
        documents=[text],
        embeddings=vecs,
        metadatas=[meta.to_chroma_metadata()],
    )

    response = pipeline.execute_rag(
        query="When should conveyor belts be inspected?",
        company_id="company-100",
        top_k=3,
    )

    assert response.grounded is True
    assert response.retrieved_count == 1
    assert "Conveyor belts must be inspected" in response.answer
    assert len(response.sources) == 1
    citation = response.sources[0]
    assert citation.documentId == "doc-sop-1"
    assert citation.source == "manufacturing_guide.pdf"
    assert citation.page == 2
    assert citation.classification == "internal"


def test_rag_pipeline_empty_retrieval(chroma_env):
    """Verify empty collection returns ungrounded fallback message."""
    pipeline = chroma_env["pipeline"]

    response = pipeline.execute_rag(
        query="What is the quantum flux capacitor limit?",
        company_id="company-empty",
    )

    assert response.grounded is False
    assert response.retrieved_count == 0
    assert "The available company documentation does not provide enough information" in response.answer
    assert response.sources == []


def test_rag_pipeline_tenant_isolation(chroma_env):
    """Verify Company A cannot retrieve Company B vectors under any circumstances."""
    manager = chroma_env["manager"]
    pipeline = chroma_env["pipeline"]
    embedder = chroma_env["embedder"]

    # Ingest secret doc in company-A
    col_a = manager.get_or_create_company_collection("company-A")
    meta_a = DocumentChunkMetadata(
        documentId="secret-doc",
        companyId="company-A",
        chunkId="secret-chunk-1",
        source="classified_plans.pdf",
    )
    text_a = "The secret merger project codename is BlueHorizon."
    col_a.add(
        ids=["secret-chunk-1"],
        documents=[text_a],
        embeddings=embedder.embed_documents([text_a]),
        metadatas=[meta_a.to_chroma_metadata()],
    )

    # Query from company-B
    response = pipeline.execute_rag(
        query="What is the secret merger project codename?",
        company_id="company-B",
    )

    assert response.grounded is False
    assert response.retrieved_count == 0
    assert "BlueHorizon" not in response.answer


def test_rag_pipeline_department_filtering(chroma_env):
    """Verify department filter restricts retrieval to authorized department chunks."""
    manager = chroma_env["manager"]
    pipeline = chroma_env["pipeline"]
    embedder = chroma_env["embedder"]

    col = manager.get_or_create_company_collection("company-dept")
    meta_eng = DocumentChunkMetadata(
        documentId="eng-doc",
        companyId="company-dept",
        chunkId="eng-chunk",
        departmentId="dept-engineering",
        source="eng_guide.pdf",
    )
    text_eng = "Engineering deployment pipeline uses GitHub Actions and Docker."

    meta_hr = DocumentChunkMetadata(
        documentId="hr-doc",
        companyId="company-dept",
        chunkId="hr-chunk",
        departmentId="dept-hr",
        source="hr_policy.pdf",
    )
    text_hr = "HR annual performance evaluations are conducted every December."

    col.add(
        ids=["eng-chunk", "hr-chunk"],
        documents=[text_eng, text_hr],
        embeddings=embedder.embed_documents([text_eng, text_hr]),
        metadatas=[meta_eng.to_chroma_metadata(), meta_hr.to_chroma_metadata()],
    )

    # Search with engineering filter
    res_eng = pipeline.execute_rag(
        query="What tools are used for evaluations or deployments?",
        company_id="company-dept",
        department_id="dept-engineering",
    )
    assert res_eng.retrieved_count == 1
    assert "GitHub Actions" in res_eng.answer
    assert "evaluations" not in res_eng.answer

    # Search with HR filter
    res_hr = pipeline.execute_rag(
        query="What tools are used for evaluations or deployments?",
        company_id="company-dept",
        department_id="dept-hr",
    )
    assert res_hr.retrieved_count == 1
    assert "evaluations" in res_hr.answer
    assert "GitHub Actions" not in res_hr.answer


def test_rag_pipeline_classification_filtering(chroma_env):
    """Verify public users cannot retrieve confidential classified documents."""
    manager = chroma_env["manager"]
    pipeline = chroma_env["pipeline"]
    embedder = chroma_env["embedder"]

    col = manager.get_or_create_company_collection("company-class")
    meta_conf = DocumentChunkMetadata(
        documentId="conf-doc",
        companyId="company-class",
        chunkId="conf-chunk",
        classification="confidential",
        source="executive_salaries.pdf",
    )
    text_conf = "Executive bonus pool for Q4 is set at 2 million dollars."

    meta_pub = DocumentChunkMetadata(
        documentId="pub-doc",
        companyId="company-class",
        chunkId="pub-chunk",
        classification="public",
        source="holiday_calendar.pdf",
    )
    text_pub = "The company observes 10 paid public holidays every year."

    col.add(
        ids=["conf-chunk", "pub-chunk"],
        documents=[text_conf, text_pub],
        embeddings=embedder.embed_documents([text_conf, text_pub]),
        metadatas=[meta_conf.to_chroma_metadata(), meta_pub.to_chroma_metadata()],
    )

    # Search allowed only public documents
    res_pub = pipeline.execute_rag(
        query="What is the policy or bonus pool?",
        company_id="company-class",
        classification="public",
    )
    assert res_pub.retrieved_count == 1
    assert "paid public holidays" in res_pub.answer
    assert "bonus pool" not in res_pub.answer


def test_rag_pipeline_chat_history(chroma_env):
    """Verify chat history turns are accepted and formatted into context."""
    manager = chroma_env["manager"]
    pipeline = chroma_env["pipeline"]
    embedder = chroma_env["embedder"]

    col = manager.get_or_create_company_collection("company-chat")
    meta = DocumentChunkMetadata(
        documentId="chat-doc",
        companyId="company-chat",
        chunkId="c1",
        source="server_setup.pdf",
    )
    text = "Database port is 5432 and Redis port is 6379."
    col.add(
        ids=["c1"],
        documents=[text],
        embeddings=embedder.embed_documents([text]),
        metadatas=[meta.to_chroma_metadata()],
    )

    history = [
        ChatMessageItem(role="user", content="What port does the database use?"),
        ChatMessageItem(role="assistant", content="The database uses port 5432."),
    ]

    response = pipeline.execute_rag(
        query="And what about Redis?",
        company_id="company-chat",
        chat_history=history,
    )
    assert response.grounded is True
    assert "6379" in response.answer


def test_rag_pipeline_missing_company_id(chroma_env):
    """Verify security validation when company ID is missing."""
    pipeline = chroma_env["pipeline"]
    with pytest.raises(RetrievalSecurityError):
        pipeline.execute_rag(query="test", company_id="")


def test_rag_pipeline_empty_query(chroma_env):
    """Verify query validation when query is empty."""
    pipeline = chroma_env["pipeline"]
    with pytest.raises(RetrievalError):
        pipeline.execute_rag(query="", company_id="comp-1")
