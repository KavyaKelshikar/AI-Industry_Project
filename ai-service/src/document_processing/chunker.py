"""
Deterministic document chunking module with provenance tracking and metadata alignment.
"""

import hashlib
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from src.config import settings
from src.document_processing.cleaner import clean_text
from src.document_processing.exceptions import InvalidChunkingConfigError
from src.document_processing.extractor import ExtractedDocument, ExtractedUnit
from src.vectorstore.metadata import DocumentChunkMetadata

logger = logging.getLogger(__name__)


class DocumentChunk(BaseModel):
    """
    Representation of a single chunk of text with document and tenant context.
    """

    chunkId: str = Field(..., description="Deterministic unique identifier for this chunk")
    documentId: str = Field(..., description="ID of the parent document")
    companyId: str = Field(..., description="Tenant ID")
    chunkIndex: int = Field(..., ge=0, description="Sequential 0-indexed position in document")
    text: str = Field(..., description="The chunk text content")
    departmentId: Optional[str] = Field(None, description="Department ID if assigned")
    source: Optional[str] = Field(None, description="Source filename")
    page: Optional[int] = Field(None, ge=1, description="Page number of origin")
    classification: Optional[str] = Field(None, description="Access classification")
    category: Optional[str] = Field(None, description="Document category")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional custom attributes")

    def to_metadata(self) -> DocumentChunkMetadata:
        """
        Convert this chunk's attributes into the standard vectorstore DocumentChunkMetadata.
        """
        return DocumentChunkMetadata(
            documentId=self.documentId,
            companyId=self.companyId,
            chunkId=self.chunkId,
            departmentId=self.departmentId,
            source=self.source,
            page=self.page,
            chunkIndex=self.chunkIndex,
            classification=self.classification,
            category=self.category,
        )


class DocumentChunker:
    """
    Deterministic text and document chunker with boundary-aware splitting.
    """

    def __init__(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ):
        """
        Initialise chunker with size and overlap limits.

        Args:
            chunk_size: Target maximum characters per chunk. Defaults to settings.CHUNK_SIZE.
            chunk_overlap: Number of characters to overlap between chunks. Defaults to settings.CHUNK_OVERLAP.

        Raises:
            InvalidChunkingConfigError: If chunk_size <= 0 or chunk_overlap < 0 or chunk_overlap >= chunk_size.
        """
        self.chunk_size = chunk_size if chunk_size is not None else settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap if chunk_overlap is not None else settings.CHUNK_OVERLAP

        self._validate_config()

    def _validate_config(self) -> None:
        if not isinstance(self.chunk_size, int) or self.chunk_size <= 0:
            raise InvalidChunkingConfigError(
                f"chunk_size must be a positive integer, got {self.chunk_size}"
            )
        if not isinstance(self.chunk_overlap, int) or self.chunk_overlap < 0:
            raise InvalidChunkingConfigError(
                f"chunk_overlap must be a non-negative integer, got {self.chunk_overlap}"
            )
        if self.chunk_overlap >= self.chunk_size:
            raise InvalidChunkingConfigError(
                f"chunk_overlap ({self.chunk_overlap}) must be strictly less than chunk_size ({self.chunk_size})"
            )

    @staticmethod
    def generate_chunk_id(document_id: str, chunk_index: int, text: str) -> str:
        """
        Generate a deterministic unique chunk ID based on documentId, index, and text content hash.
        """
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()[:8]
        return f"{document_id.strip()}_c{chunk_index}_{content_hash}"

    def _split_text_into_segments(self, text: str) -> List[str]:
        """
        Split a single continuous string into chunks of at most `chunk_size`
        with `chunk_overlap`, respecting paragraph, sentence, and word boundaries.
        """
        cleaned = clean_text(text)
        if not cleaned:
            return []

        if len(cleaned) <= self.chunk_size:
            return [cleaned]

        chunks: List[str] = []
        start = 0
        text_len = len(cleaned)

        while start < text_len:
            end = start + self.chunk_size

            if end >= text_len:
                chunk_str = cleaned[start:].strip()
                if chunk_str:
                    chunks.append(chunk_str)
                break

            # Find optimal split point near `end`
            # 1. Look for paragraph break \n\n
            split_pos = -1
            segment = cleaned[start:end]

            last_para = segment.rfind("\n\n")
            if last_para != -1 and last_para >= self.chunk_overlap:
                split_pos = start + last_para + 2
            else:
                # 2. Look for sentence boundary
                for sep in [". ", "? ", "! ", "\n"]:
                    last_sep = segment.rfind(sep)
                    if last_sep != -1 and last_sep >= self.chunk_overlap:
                        split_pos = start + last_sep + len(sep)
                        break

            # 3. Look for word boundary (space)
            if split_pos == -1:
                last_space = segment.rfind(" ")
                if last_space != -1 and last_space >= self.chunk_overlap:
                    split_pos = start + last_space + 1

            # 4. Fallback to hard split at chunk_size
            if split_pos == -1 or split_pos <= start:
                split_pos = end

            chunk_str = cleaned[start:split_pos].strip()
            if chunk_str:
                chunks.append(chunk_str)

            # Advance start pointer accounting for overlap
            new_start = split_pos - self.chunk_overlap
            if new_start <= start:
                new_start = split_pos
            start = new_start

        return chunks

    def chunk_text(
        self,
        text: str,
        document_id: str,
        company_id: str,
        department_id: Optional[str] = None,
        source: Optional[str] = None,
        page: Optional[int] = None,
        classification: Optional[str] = None,
        category: Optional[str] = None,
    ) -> List[DocumentChunk]:
        """
        Chunk a raw string into structured DocumentChunks.
        """
        if not document_id or not document_id.strip():
            raise ValueError("document_id cannot be empty")
        if not company_id or not company_id.strip():
            raise ValueError("company_id cannot be empty")

        segments = self._split_text_into_segments(text)
        chunks: List[DocumentChunk] = []

        for idx, seg in enumerate(segments):
            chunk_id = self.generate_chunk_id(document_id, idx, seg)
            chunk = DocumentChunk(
                chunkId=chunk_id,
                documentId=document_id.strip(),
                companyId=company_id.strip(),
                chunkIndex=idx,
                text=seg,
                departmentId=department_id.strip() if department_id else None,
                source=source,
                page=page,
                classification=classification,
                category=category,
            )
            chunks.append(chunk)

        return chunks

    def chunk_document(
        self,
        extracted_doc: ExtractedDocument,
        document_id: str,
        company_id: str,
        department_id: Optional[str] = None,
        classification: Optional[str] = None,
        category: Optional[str] = None,
    ) -> List[DocumentChunk]:
        """
        Chunk an ExtractedDocument while maintaining page-level / section-level provenance.
        """
        if not document_id or not document_id.strip():
            raise ValueError("document_id cannot be empty")
        if not company_id or not company_id.strip():
            raise ValueError("company_id cannot be empty")

        if extracted_doc.is_empty:
            return []

        chunks: List[DocumentChunk] = []
        global_index = 0

        for unit in extracted_doc.units:
            unit_segments = self._split_text_into_segments(unit.text)
            for seg in unit_segments:
                chunk_id = self.generate_chunk_id(document_id, global_index, seg)
                chunk = DocumentChunk(
                    chunkId=chunk_id,
                    documentId=document_id.strip(),
                    companyId=company_id.strip(),
                    chunkIndex=global_index,
                    text=seg,
                    departmentId=department_id.strip() if department_id else None,
                    source=unit.source or extracted_doc.file_name,
                    page=unit.page,
                    classification=classification,
                    category=category,
                    metadata={"section_index": unit.section_index},
                )
                chunks.append(chunk)
                global_index += 1

        return chunks
