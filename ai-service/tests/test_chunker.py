"""
Tests for DocumentChunker, deterministic chunk IDs, and metadata alignment.
"""

import pytest

from src.document_processing.chunker import DocumentChunk, DocumentChunker
from src.document_processing.exceptions import InvalidChunkingConfigError
from src.document_processing.extractor import ExtractedDocument, ExtractedUnit
from src.vectorstore.metadata import DocumentChunkMetadata


class TestDocumentChunker:
    def test_chunk_short_text(self):
        """Short text (< chunk_size) returns single chunk at index 0."""
        chunker = DocumentChunker(chunk_size=200, chunk_overlap=20)
        chunks = chunker.chunk_text(
            text="Short notice for team.",
            document_id="doc-1",
            company_id="comp-100",
            department_id="dept-ops",
            source="notice.txt",
        )
        assert len(chunks) == 1
        assert chunks[0].chunkIndex == 0
        assert chunks[0].text == "Short notice for team."
        assert chunks[0].documentId == "doc-1"
        assert chunks[0].companyId == "comp-100"
        assert chunks[0].departmentId == "dept-ops"
        assert chunks[0].source == "notice.txt"

    def test_chunk_long_text_with_overlap(self):
        """Long text splits into multiple chunks with overlap."""
        text = (
            "Paragraph one contains important instructions about industrial machines. "
            "Please follow every security step carefully.\n\n"
            "Paragraph two describes emergency shutoff procedures. "
            "The red switch must be pressed immediately in case of power surge.\n\n"
            "Paragraph three covers regular preventative maintenance and inspection schedules."
        )
        chunker = DocumentChunker(chunk_size=120, chunk_overlap=20)
        chunks = chunker.chunk_text(
            text=text,
            document_id="doc-2",
            company_id="comp-100",
        )

        assert len(chunks) > 1
        # Sequential indices: 0, 1, 2, ...
        for i, chunk in enumerate(chunks):
            assert chunk.chunkIndex == i
            assert len(chunk.text) > 0

    def test_deterministic_chunk_ids(self):
        """Identical inputs produce identical chunk IDs and ordering."""
        text = "Deterministic chunking verification test."
        chunker1 = DocumentChunker(chunk_size=50, chunk_overlap=10)
        chunker2 = DocumentChunker(chunk_size=50, chunk_overlap=10)

        chunks1 = chunker1.chunk_text(text, document_id="doc-det", company_id="comp-1")
        chunks2 = chunker2.chunk_text(text, document_id="doc-det", company_id="comp-1")

        assert len(chunks1) == len(chunks2)
        for c1, c2 in zip(chunks1, chunks2):
            assert c1.chunkId == c2.chunkId
            assert c1.chunkIndex == c2.chunkIndex
            assert c1.text == c2.text

    def test_invalid_chunking_config_raises_error(self):
        """Invalid size/overlap raises InvalidChunkingConfigError."""
        with pytest.raises(InvalidChunkingConfigError):
            DocumentChunker(chunk_size=0, chunk_overlap=0)

        with pytest.raises(InvalidChunkingConfigError):
            DocumentChunker(chunk_size=-100, chunk_overlap=10)

        with pytest.raises(InvalidChunkingConfigError):
            DocumentChunker(chunk_size=100, chunk_overlap=100)

        with pytest.raises(InvalidChunkingConfigError):
            DocumentChunker(chunk_size=100, chunk_overlap=150)

    def test_empty_text_returns_empty_list(self):
        chunker = DocumentChunker(chunk_size=200, chunk_overlap=20)
        chunks = chunker.chunk_text(
            text="",
            document_id="doc-empty",
            company_id="comp-1",
        )
        assert chunks == []

    def test_chunk_extracted_document_page_provenance(self):
        """ExtractedDocument preserves page numbers across resulting chunks."""
        extracted_doc = ExtractedDocument(
            file_path="/tmp/manual.pdf",
            file_name="manual.pdf",
            file_type="pdf",
            total_pages=2,
            units=[
                ExtractedUnit(text="Page 1 safety guide instructions.", page=1, section_index=0, source="manual.pdf"),
                ExtractedUnit(text="Page 2 shutdown manual instructions.", page=2, section_index=1, source="manual.pdf"),
            ],
            raw_text="Page 1 safety guide instructions.\n\nPage 2 shutdown manual instructions.",
        )

        chunker = DocumentChunker(chunk_size=200, chunk_overlap=20)
        chunks = chunker.chunk_document(
            extracted_doc=extracted_doc,
            document_id="doc-manual",
            company_id="comp-tenant",
            department_id="dept-safety",
            classification="internal",
        )

        assert len(chunks) == 2
        assert chunks[0].page == 1
        assert chunks[0].chunkIndex == 0
        assert chunks[1].page == 2
        assert chunks[1].chunkIndex == 1

    def test_compatibility_with_document_chunk_metadata(self):
        """Verify DocumentChunk converts to Phase 4.6 DocumentChunkMetadata."""
        chunk = DocumentChunk(
            chunkId="doc-1_c0_a1b2c3d4",
            documentId="doc-1",
            companyId="tenant-corp",
            chunkIndex=0,
            text="Clean sample chunk text.",
            departmentId="dept-ops",
            source="guide.pdf",
            page=4,
            classification="confidential",
            category="SOP",
        )

        meta = chunk.to_metadata()
        assert isinstance(meta, DocumentChunkMetadata)
        assert meta.documentId == "doc-1"
        assert meta.companyId == "tenant-corp"
        assert meta.chunkId == "doc-1_c0_a1b2c3d4"
        assert meta.page == 4
        assert meta.classification == "confidential"

        # Check ChromaDB flat metadata compatibility
        chroma_dict = meta.to_chroma_metadata()
        assert chroma_dict["documentId"] == "doc-1"
        assert chroma_dict["companyId"] == "tenant-corp"
        assert chroma_dict["chunkId"] == "doc-1_c0_a1b2c3d4"
        assert chroma_dict["page"] == 4
