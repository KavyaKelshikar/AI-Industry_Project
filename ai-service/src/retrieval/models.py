"""
Data models for vector similarity retrieval requests, structured responses,
and enterprise RAG generation requests/responses.
"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, field_validator


class RetrievalQuery(BaseModel):
    """
    Input query parameters for vector retrieval.
    """

    query: str = Field(..., min_length=1, description="Natural language search query text")
    company_id: str = Field(..., min_length=1, description="Tenant/Company identifier for isolation")
    department_id: Optional[str] = Field(None, description="Optional department filter")
    classification: Optional[Union[str, List[str]]] = Field(None, description="Optional classification filter")
    category: Optional[str] = Field(None, description="Optional document category filter")
    document_id: Optional[str] = Field(None, description="Optional document filter")
    top_k: Optional[int] = Field(None, ge=1, le=100, description="Max number of chunks to retrieve")
    score_threshold: Optional[float] = Field(None, description="Similarity score threshold or maximum distance")
    collection_name: Optional[str] = Field(None, description="Override target ChromaDB collection name")
    additional_filters: Optional[Dict[str, Any]] = Field(None, description="Additional metadata filters")

    @field_validator("query", "company_id")
    @classmethod
    def validate_non_empty_strings(cls, value: str) -> str:
        if not value or not str(value).strip():
            raise ValueError("Field cannot be empty or whitespace only")
        return str(value).strip()


class RetrievedChunk(BaseModel):
    """
    A single retrieved chunk with vector similarity score and full provenance.
    """

    chunkId: str = Field(..., description="Unique chunk identifier")
    documentId: str = Field(..., description="Parent document identifier")
    companyId: str = Field(..., description="Tenant identifier")
    text: str = Field(..., description="The chunk text content")
    distance: Optional[float] = Field(None, description="Raw vector distance metric")
    similarity: Optional[float] = Field(None, description="Normalized similarity score (0.0 to 1.0)")
    departmentId: Optional[str] = Field(None, description="Department if assigned")
    source: Optional[str] = Field(None, description="Source filename")
    page: Optional[int] = Field(None, ge=1, description="Page number of origin")
    chunkIndex: Optional[int] = Field(None, ge=0, description="Chunk sequential index")
    classification: Optional[str] = Field(None, description="Access classification")
    category: Optional[str] = Field(None, description="Document category")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional custom chunk metadata")


class RetrievalResult(BaseModel):
    """
    Structured outcome container returned after a vector search.
    """

    query: str = Field(..., description="Original search query")
    company_id: str = Field(..., description="Tenant identifier")
    collection_name: str = Field(..., description="Queried collection name")
    chunks: List[RetrievedChunk] = Field(default_factory=list, description="Ranked list of retrieved chunks")
    total_found: int = Field(0, ge=0, description="Number of matching chunks retrieved")
    embedding_model: str = Field(..., description="Embedding model identifier used")
    duration_ms: float = Field(0.0, ge=0.0, description="Search duration in milliseconds")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional query statistics")


# ==========================================
# RAG Models (Module 11)
# ==========================================


class ChatMessageItem(BaseModel):
    """A single turn in conversational history."""

    role: str = Field(..., description="Message author role: user, assistant, or system")
    content: str = Field(..., max_length=2000, description="Message content")

    @field_validator("role")
    @classmethod
    def validate_role(cls, val: str) -> str:
        clean = val.strip().lower()
        if clean not in ("user", "assistant", "system", "ai"):
            raise ValueError("Role must be 'user', 'assistant', or 'system'")
        return "assistant" if clean == "ai" else clean


class SourceCitation(BaseModel):
    """Detailed attribution citation for a statement derived from retrieved documentation."""

    documentId: str = Field(..., description="Parent document identifier in MongoDB")
    source: Optional[str] = Field(None, description="Source document filename or path")
    snippet: str = Field(..., description="Exact context snippet used by AI")
    similarity: Optional[float] = Field(None, description="Relevance score (0.0 to 1.0)")
    page: Optional[int] = Field(None, description="Origin page number")
    chunkIndex: Optional[int] = Field(None, description="Sequential chunk index")
    classification: Optional[str] = Field(None, description="Document data classification")
    category: Optional[str] = Field(None, description="Document category")
    departmentId: Optional[str] = Field(None, description="Department ID constraint if set")


class RAGQueryRequest(BaseModel):
    """Request payload for semantic vector search + single-turn RAG generation."""

    query: str = Field(..., min_length=1, max_length=1000, description="User question or search query")
    company_id: str = Field(..., min_length=1, description="Strict tenant identifier")
    department_id: Optional[str] = Field(None, description="Optional department filter")
    classification: Optional[Union[str, List[str]]] = Field(None, description="Optional classification filter")
    category: Optional[str] = Field(None, description="Optional category filter")
    top_k: Optional[int] = Field(5, ge=1, le=20, description="Max vector chunks to retrieve (bounded 1-20)")
    score_threshold: Optional[float] = Field(None, ge=0.0, le=1.0, description="Similarity score threshold")

    @field_validator("query", "company_id")
    @classmethod
    def validate_non_empty_strings(cls, value: str) -> str:
        if not value or not str(value).strip():
            raise ValueError("Field cannot be empty or whitespace only")
        return str(value).strip()


class RAGChatRequest(BaseModel):
    """Request payload for multi-turn conversational RAG chat."""

    query: str = Field(..., min_length=1, max_length=1000, description="Latest user message")
    company_id: str = Field(..., min_length=1, description="Strict tenant identifier")
    department_id: Optional[str] = Field(None, description="Optional department filter")
    classification: Optional[Union[str, List[str]]] = Field(None, description="Optional classification filter")
    category: Optional[str] = Field(None, description="Optional category filter")
    top_k: Optional[int] = Field(5, ge=1, le=20, description="Max vector chunks to retrieve (bounded 1-20)")
    chat_history: Optional[List[ChatMessageItem]] = Field(default_factory=list, description="Recent conversation turns (max 10)")
    score_threshold: Optional[float] = Field(None, ge=0.0, le=1.0, description="Similarity score threshold")

    @field_validator("query", "company_id")
    @classmethod
    def validate_non_empty_strings(cls, value: str) -> str:
        if not value or not str(value).strip():
            raise ValueError("Field cannot be empty or whitespace only")
        return str(value).strip()

    @field_validator("chat_history")
    @classmethod
    def validate_history_length(cls, history: Optional[List[ChatMessageItem]]) -> List[ChatMessageItem]:
        if not history:
            return []
        # Strictly bound history to at most 10 turns
        return history[-10:]


class RAGResponse(BaseModel):
    """Structured response container for RAG answers with full provenance."""

    query: str = Field(..., description="Original user query")
    company_id: str = Field(..., description="Tenant identifier")
    answer: str = Field(..., description="Synthesized grounded answer")
    sources: List[SourceCitation] = Field(default_factory=list, description="Direct citations supporting the answer")
    retrieved_count: int = Field(0, description="Number of vector chunks retrieved")
    duration_ms: float = Field(0.0, description="Total pipeline latency in milliseconds")
    llm_provider: str = Field(..., description="LLM provider engine used")
    grounded: bool = Field(True, description="True if answer is backed by retrieved company documents")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Telemetry and execution stats")
