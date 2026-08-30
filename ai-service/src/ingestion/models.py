"""
Data models for document ingestion pipeline inputs and output metrics.
"""

from pathlib import Path
from typing import Any, Dict, Optional, Union
from pydantic import BaseModel, Field, field_validator


class IngestionRequest(BaseModel):
    """
    Input request parameters for ingesting a document into vector storage.
    """

    file_path: Union[str, Path] = Field(..., description="Path to the document file")
    document_id: str = Field(..., min_length=1, description="MongoDB Document unique identifier")
    company_id: str = Field(..., min_length=1, description="Tenant/Company identifier for data isolation")
    department_id: Optional[str] = Field(None, description="Department identifier if scoped")
    classification: Optional[str] = Field(None, description="Data classification level")
    category: Optional[str] = Field(None, description="Document category/type")
    source: Optional[str] = Field(None, description="Source filename or origin path")
    collection_name: Optional[str] = Field(None, description="Override target ChromaDB collection name")
    batch_size: Optional[int] = Field(None, ge=1, description="Override batch size for embedding/upsert")

    @field_validator("document_id", "company_id")
    @classmethod
    def validate_required_identifiers(cls, value: str) -> str:
        if not value or not str(value).strip():
            raise ValueError("Identifier cannot be empty or whitespace only")
        return str(value).strip()


class IngestionResult(BaseModel):
    """
    Structured outcome metrics returned after document ingestion.
    """

    document_id: str = Field(..., description="Document identifier")
    company_id: str = Field(..., description="Tenant identifier")
    collection_name: str = Field(..., description="Target ChromaDB collection")
    chunks_count: int = Field(0, ge=0, description="Total chunks extracted and processed")
    vectors_stored: int = Field(0, ge=0, description="Total vectors persisted in ChromaDB")
    embedding_model: str = Field(..., description="Embedding model identifier used")
    status: str = Field("success", description="Status of ingestion: 'success' or 'failed'")
    duration_ms: float = Field(0.0, ge=0.0, description="Pipeline processing duration in milliseconds")
    error_message: Optional[str] = Field(None, description="Error explanation if status is failed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional ingestion statistics")
