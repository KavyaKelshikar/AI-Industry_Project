"""
document_processing package — Extraction, cleaning, and chunking foundation for knowledge documents.
"""

from src.document_processing.cleaner import clean_text
from src.document_processing.chunker import DocumentChunk, DocumentChunker
from src.document_processing.docx_extractor import DOCXExtractor
from src.document_processing.exceptions import (
    ChunkingError,
    CorruptedFileError,
    DocumentProcessingError,
    EmptyDocumentError,
    ExtractorError,
    InvalidChunkingConfigError,
    UnsupportedFileTypeError,
)
from src.document_processing.extractor import (
    BaseExtractor,
    ExtractedDocument,
    ExtractedUnit,
    get_extractor,
    register_extractor,
)
from src.document_processing.pdf_extractor import PDFExtractor
from src.document_processing.txt_extractor import TXTExtractor

__all__ = [
    "clean_text",
    "DocumentChunk",
    "DocumentChunker",
    "BaseExtractor",
    "ExtractedUnit",
    "ExtractedDocument",
    "get_extractor",
    "register_extractor",
    "TXTExtractor",
    "PDFExtractor",
    "DOCXExtractor",
    "DocumentProcessingError",
    "ExtractorError",
    "UnsupportedFileTypeError",
    "CorruptedFileError",
    "EmptyDocumentError",
    "ChunkingError",
    "InvalidChunkingConfigError",
]
