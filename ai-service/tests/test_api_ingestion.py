"""
Tests for Ingestion & Vector Deletion API Router endpoints.
"""

import os
import tempfile
import docx
import fitz
import pytest
from fastapi import HTTPException

from src.api.ingestion_routes import ingest_document, delete_document_vectors
from src.ingestion.models import IngestionRequest
from src.main import health_check


@pytest.fixture
def temp_dir():
    with tempfile.TemporaryDirectory() as tmp:
        yield tmp


class TestAPIIngestion:
    def test_health_check_endpoint(self):
        res = health_check()
        assert "status" in res

    def test_ingest_txt_file_via_api(self, temp_dir):
        file_path = os.path.join(temp_dir, "sample.txt")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("Industrial Safety Guidelines: Section 1. All personnel must wear hard hats.")

        req = IngestionRequest(
            file_path=file_path,
            document_id="doc_txt_101",
            company_id="company_alpha",
            department_id="dept_ops",
            classification="internal",
            category="safety",
        )

        res = ingest_document(req)
        assert res.status == "success"
        assert res.document_id == "doc_txt_101"
        assert res.company_id == "company_alpha"
        assert res.chunks_count > 0
        assert res.vectors_stored > 0

    def test_ingest_pdf_file_via_api(self, temp_dir):
        file_path = os.path.join(temp_dir, "sample.pdf")
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "PDF Document Content for Ingestion Test.")
        doc.save(file_path)
        doc.close()

        req = IngestionRequest(
            file_path=file_path,
            document_id="doc_pdf_102",
            company_id="company_alpha",
        )

        res = ingest_document(req)
        assert res.status == "success"
        assert res.chunks_count >= 1

    def test_ingest_docx_file_via_api(self, temp_dir):
        file_path = os.path.join(temp_dir, "sample.docx")
        doc = docx.Document()
        doc.add_paragraph("DOCX Content for Ingestion Pipeline.")
        doc.save(file_path)

        req = IngestionRequest(
            file_path=file_path,
            document_id="doc_docx_103",
            company_id="company_beta",
        )

        res = ingest_document(req)
        assert res.status == "success"
        assert res.chunks_count >= 1

    def test_ingest_nonexistent_file_raises_http_422(self):
        req = IngestionRequest(
            file_path="non_existent_random_file.pdf",
            document_id="doc_bad_104",
            company_id="company_alpha",
        )
        with pytest.raises(HTTPException) as exc_info:
            ingest_document(req)
        assert exc_info.value.status_code == 422
        assert exc_info.value.detail["code"] == "EXTRACTION_FAILED"

    def test_ingest_empty_document_raises_http_422(self, temp_dir):
        file_path = os.path.join(temp_dir, "empty.txt")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("   \n\n  \t ")

        req = IngestionRequest(
            file_path=file_path,
            document_id="doc_empty_105",
            company_id="company_alpha",
        )
        with pytest.raises(HTTPException) as exc_info:
            ingest_document(req)
        assert exc_info.value.status_code == 422
        assert exc_info.value.detail["code"] == "EXTRACTION_FAILED"

    def test_delete_vectors_via_api(self, temp_dir):
        # 1. Ingest first
        file_path = os.path.join(temp_dir, "to_delete.txt")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("This file vectors will be deleted.")

        req = IngestionRequest(
            file_path=file_path,
            document_id="doc_del_106",
            company_id="company_alpha",
        )
        ingest_res = ingest_document(req)
        assert ingest_res.status == "success"

        # 2. Delete vectors
        del_res = delete_document_vectors("company_alpha", "doc_del_106")
        assert del_res["success"] is True
        assert del_res["document_id"] == "doc_del_106"
        assert del_res["company_id"] == "company_alpha"
        assert del_res["vectors_deleted"] >= 1

    def test_delete_vectors_idempotent_for_missing_document(self):
        del_res = delete_document_vectors("company_alpha", "non_existent_doc_999")
        assert del_res["success"] is True
        assert del_res["vectors_deleted"] == 0

    def test_delete_vectors_missing_identifiers_raises_http_400(self):
        with pytest.raises(HTTPException) as exc_info:
            delete_document_vectors("", "doc_1")
        assert exc_info.value.status_code == 400

        with pytest.raises(HTTPException) as exc_info:
            delete_document_vectors("company_1", "")
        assert exc_info.value.status_code == 400
