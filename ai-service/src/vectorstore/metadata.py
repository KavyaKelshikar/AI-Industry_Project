"""
Metadata schemas and multi-tenant filter builders for ChromaDB vector operations.
"""

import logging
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, field_validator

from src.vectorstore.exceptions import InvalidMetadataError

logger = logging.getLogger(__name__)


class DocumentChunkMetadata(BaseModel):
    """
    Structured metadata schema for individual document chunks.
    Guarantees tenant isolation and document traceability in ChromaDB.
    """

    documentId: str = Field(..., min_length=1, description="Unique ID of the parent document in MongoDB")
    companyId: str = Field(..., min_length=1, description="Tenant/Company identifier for data isolation")
    chunkId: str = Field(..., min_length=1, description="Unique ID for this specific chunk")
    departmentId: Optional[str] = Field(None, description="Department ID for role/department filtering")
    source: Optional[str] = Field(None, description="Source filename or origin path")
    page: Optional[int] = Field(None, ge=1, description="Page number of origin (1-indexed)")
    chunkIndex: Optional[int] = Field(None, ge=0, description="Sequential index of the chunk in the document")
    classification: Optional[str] = Field(None, description="Data classification e.g. public, internal, confidential")
    category: Optional[str] = Field(None, description="Document category e.g. Policy, SOP, Manual")

    @field_validator("documentId", "companyId", "chunkId")
    @classmethod
    def validate_non_empty_strings(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Identifier fields cannot be empty or whitespace only")
        return value.strip()

    def to_chroma_metadata(self) -> Dict[str, Union[str, int, float, bool]]:
        """
        Convert to a ChromaDB-compatible flat metadata dictionary.
        ChromaDB only accepts non-null primitive scalar types: str, int, float, bool.
        Ensures 'classification' always has a queryable value (defaults to 'internal')
        so that $in filters on classification never miss chunks with unset values.
        """
        raw_dict = self.model_dump(exclude_none=True)
        chroma_dict: Dict[str, Union[str, int, float, bool]] = {}

        for key, value in raw_dict.items():
            if isinstance(value, (str, int, float, bool)):
                chroma_dict[key] = value
            else:
                chroma_dict[key] = str(value)

        # Guarantee classification is always present for filter matching
        if "classification" not in chroma_dict:
            chroma_dict["classification"] = "internal"

        return chroma_dict

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DocumentChunkMetadata":
        """Construct and validate metadata from a raw dictionary."""
        try:
            return cls(**data)
        except Exception as exc:
            raise InvalidMetadataError(f"Invalid document chunk metadata: {exc}", original_error=exc)


def build_tenant_filter(
    company_id: str,
    department_id: Optional[str] = None,
    classification: Optional[Union[str, List[str]]] = None,
    category: Optional[str] = None,
    document_id: Optional[str] = None,
    additional_filters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build a multi-tenant isolation filter for ChromaDB vector queries.

    Guarantees that `companyId` is always enforced as a strict equality constraint,
    preventing any cross-tenant vector leakage.

    Args:
        company_id: The required tenant/company identifier.
        department_id: Optional department identifier for scoped queries.
        classification: Optional classification string or list of allowed classifications.
        category: Optional category string.
        document_id: Optional document ID to filter chunks of a specific document.
        additional_filters: Optional additional equality/in constraints.

    Returns:
        A ChromaDB `where` query dictionary.
    """
    if not company_id or not company_id.strip():
        raise ValueError("company_id is strictly required for tenant-isolated ChromaDB queries")

    clauses: List[Dict[str, Any]] = [
        {"companyId": {"$eq": company_id.strip()}}
    ]

    if department_id:
        clauses.append({"departmentId": {"$eq": department_id.strip()}})

    if document_id:
        clauses.append({"documentId": {"$eq": document_id.strip()}})

    if category:
        clauses.append({"category": {"$eq": category.strip()}})

    if classification:
        if isinstance(classification, list):
            if len(classification) == 1:
                clauses.append({"classification": {"$eq": classification[0]}})
            elif len(classification) > 1:
                clauses.append({"classification": {"$in": classification}})
        elif isinstance(classification, str):
            clauses.append({"classification": {"$eq": classification.strip()}})

    if additional_filters:
        for k, v in additional_filters.items():
            if k not in ("companyId", "departmentId", "documentId", "classification", "category"):
                if isinstance(v, list):
                    clauses.append({k: {"$in": v}})
                elif isinstance(v, (str, int, float, bool)):
                    clauses.append({k: {"$eq": v}})
                elif isinstance(v, dict):
                    clauses.append({k: v})

    if len(clauses) == 1:
        return clauses[0]

    return {"$and": clauses}
