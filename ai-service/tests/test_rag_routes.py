"""
Tests for FastAPI RAG Route Handlers (/api/v1/rag/query and /api/v1/rag/chat).
"""

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from src.api.rag_routes import execute_rag_chat, execute_rag_query
from src.embeddings.factory import get_embedding_service
from src.retrieval.models import (
    ChatMessageItem,
    RAGChatRequest,
    RAGQueryRequest,
)
from src.vectorstore.collection_manager import get_collection_manager
from src.vectorstore.metadata import DocumentChunkMetadata


@pytest.fixture(autouse=True)
def setup_test_vectors():
    """Seed test vector chunk into ChromaDB for API route tests."""
    mgr = get_collection_manager()
    embedder = get_embedding_service()
    col = mgr.get_or_create_company_collection("comp-api-test")

    meta = DocumentChunkMetadata(
        documentId="doc-api-1",
        companyId="comp-api-test",
        chunkId="chunk-api-1",
        source="api_docs.pdf",
        page=1,
        classification="internal",
    )
    text = "API rate limit is 100 requests per minute per user."
    col.add(
        ids=["chunk-api-1"],
        documents=[text],
        embeddings=embedder.embed_documents([text]),
        metadatas=[meta.to_chroma_metadata()],
    )
    yield


def test_rag_query_endpoint_success():
    """Verify execute_rag_query returns structured RAGResponse."""
    req = RAGQueryRequest(
        query="What is the API rate limit?",
        company_id="comp-api-test",
        top_k=3,
    )
    res = execute_rag_query(req)
    assert res.company_id == "comp-api-test"
    assert res.grounded is True
    assert len(res.sources) > 0
    assert res.sources[0].documentId == "doc-api-1"
    assert res.sources[0].source == "api_docs.pdf"
    assert "rate limit" in res.answer


def test_rag_chat_endpoint_success():
    """Verify execute_rag_chat returns 200 and processes chat history."""
    req = RAGChatRequest(
        query="Can you remind me of the limit?",
        company_id="comp-api-test",
        top_k=3,
        chat_history=[
            ChatMessageItem(role="user", content="How fast can I call the API?"),
            ChatMessageItem(role="assistant", content="Let me check the documentation."),
        ],
    )
    res = execute_rag_chat(req)
    assert res.company_id == "comp-api-test"
    assert res.grounded is True


def test_rag_query_validation_rejections():
    """Verify Pydantic model rejects missing company_id, empty query, or out-of-bounds top_k."""
    with pytest.raises(ValidationError):
        RAGQueryRequest(query="", company_id="comp-1")

    with pytest.raises(ValidationError):
        RAGQueryRequest(query="valid query", company_id="")

    with pytest.raises(ValidationError):
        RAGQueryRequest(query="valid query", company_id="comp-1", top_k=100)


def test_rag_query_empty_retrieval_returns_ungrounded_response():
    """Verify querying tenant with no documents returns ungrounded answer."""
    req = RAGQueryRequest(
        query="What is the quantum protocol?",
        company_id="comp-nonexistent",
    )
    res = execute_rag_query(req)
    assert res.grounded is False
    assert res.retrieved_count == 0
    assert "The available company documentation does not provide enough information" in res.answer
