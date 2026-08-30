"""
Exceptions for document extraction, cleaning, and chunking operations.
"""


class DocumentProcessingError(Exception):
    """Base exception for all document processing operations."""

    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(message)
        self.original_error = original_error


class ExtractorError(DocumentProcessingError):
    """Raised when text extraction from a document fails."""

    pass


class UnsupportedFileTypeError(ExtractorError):
    """Raised when an unsupported file format is provided."""

    pass


class CorruptedFileError(ExtractorError):
    """Raised when a document file is corrupted, malformed, or unreadable."""

    pass


class EmptyDocumentError(ExtractorError):
    """Raised when a document contains no extractable text content."""

    pass


class ChunkingError(DocumentProcessingError):
    """Raised when document chunking fails."""

    pass


class InvalidChunkingConfigError(ChunkingError):
    """Raised when chunk size or overlap parameters are invalid."""

    pass
