"""
Data models for vector similarity retrieval requests and structured responses.
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
