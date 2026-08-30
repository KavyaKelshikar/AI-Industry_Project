"""
Tests for DocumentChunkMetadata validation and multi-tenant filter building.
"""

import pytest
from pydantic import ValidationError

from src.vectorstore.exceptions import InvalidMetadataError
from src.vectorstore.metadata import DocumentChunkMetadata, build_tenant_filter


class TestDocumentChunkMetadata:
    def test_valid_metadata_serialization(self):
        """Verify valid chunk metadata converts to ChromaDB scalar dictionary."""
        meta = DocumentChunkMetadata(
            documentId="doc-12345",
            companyId="tenant-corp-1",
            departmentId="dept-eng",
            chunkId="chunk-001",
            source="safety_manual.pdf",
            page=3,
            chunkIndex=0,
            classification="internal",
            category="SOP",
        )
        chroma_dict = meta.to_chroma_metadata()

        assert chroma_dict["documentId"] == "doc-12345"
        assert chroma_dict["companyId"] == "tenant-corp-1"
        assert chroma_dict["departmentId"] == "dept-eng"
        assert chroma_dict["chunkId"] == "chunk-001"
        assert chroma_dict["source"] == "safety_manual.pdf"
        assert chroma_dict["page"] == 3
        assert chroma_dict["chunkIndex"] == 0
        assert chroma_dict["classification"] == "internal"
        assert chroma_dict["category"] == "SOP"

    def test_minimal_required_fields(self):
        """Verify metadata requires documentId, companyId, and chunkId."""
        meta = DocumentChunkMetadata(
            documentId="doc-999",
            companyId="company-abc",
            chunkId="c-1",
        )
        chroma_dict = meta.to_chroma_metadata()
        assert chroma_dict == {
            "documentId": "doc-999",
            "companyId": "company-abc",
            "chunkId": "c-1",
        }
        # None values are excluded so ChromaDB does not reject them
        assert "departmentId" not in chroma_dict
        assert "page" not in chroma_dict

    def test_missing_or_empty_required_fields_fails(self):
        """Verify validation errors when companyId or documentId is missing or blank."""
        with pytest.raises(ValidationError):
            DocumentChunkMetadata(
                documentId="",
                companyId="comp-1",
                chunkId="c-1",
            )

        with pytest.raises(ValidationError):
            DocumentChunkMetadata(
                documentId="doc-1",
                companyId="   ",
                chunkId="c-1",
            )

    def test_from_dict_helper(self):
        """Verify from_dict constructor handles valid and invalid dicts."""
        data = {
            "documentId": "d-1",
            "companyId": "c-1",
            "chunkId": "ck-1",
            "page": 2,
        }
        meta = DocumentChunkMetadata.from_dict(data)
        assert meta.page == 2

        with pytest.raises(InvalidMetadataError):
            DocumentChunkMetadata.from_dict({"documentId": "d-1"})


class TestTenantFilterBuilder:
    def test_single_tenant_filter(self):
        """Verify basic single-clause tenant filter."""
        where = build_tenant_filter(company_id="comp-123")
        assert where == {"companyId": {"$eq": "comp-123"}}

    def test_multi_clause_tenant_filter(self):
        """Verify multi-criteria filter with department and document isolation."""
        where = build_tenant_filter(
            company_id="comp-123",
            department_id="dept-456",
            document_id="doc-789",
        )
        assert "$and" in where
        assert len(where["$and"]) == 3
        assert {"companyId": {"$eq": "comp-123"}} in where["$and"]
        assert {"departmentId": {"$eq": "dept-456"}} in where["$and"]
        assert {"documentId": {"$eq": "doc-789"}} in where["$and"]

    def test_classification_in_filter(self):
        """Verify classification list generates $in operator."""
        where = build_tenant_filter(
            company_id="comp-123",
            classification=["public", "internal"],
        )
        assert "$and" in where
        assert {"classification": {"$in": ["public", "internal"]}} in where["$and"]

    def test_missing_company_id_raises_value_error(self):
        """Verify that omitting company_id strictly raises ValueError."""
        with pytest.raises(ValueError) as exc:
            build_tenant_filter(company_id="")
        assert "company_id is strictly required" in str(exc.value)
