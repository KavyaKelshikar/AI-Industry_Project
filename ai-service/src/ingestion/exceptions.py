"""
Exceptions for document ingestion pipeline operations.
"""


class IngestionError(Exception):
    """Base exception for all ingestion pipeline failures."""

    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(message)
        self.original_error = original_error


class MissingTenantError(IngestionError):
    """Raised when companyId is missing, empty, or invalid during vector ingestion."""

    pass


class IngestionExtractionError(IngestionError):
    """Raised when document extraction fails during the ingestion pipeline."""

    pass


class IngestionEmbeddingError(IngestionError):
    """Raised when embedding generation fails during ingestion."""

    pass


class IngestionStorageError(IngestionError):
    """Raised when persisting vectors and metadata to ChromaDB fails."""

    pass
