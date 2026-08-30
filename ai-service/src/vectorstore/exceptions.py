"""
Exceptions for ChromaDB vectorstore operations.
"""


class VectorStoreError(Exception):
    """Base exception for all vectorstore operations."""

    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(message)
        self.original_error = original_error


class ChromaConnectionError(VectorStoreError):
    """Raised when the ChromaDB server is unreachable."""

    pass


class CollectionNotFoundError(VectorStoreError):
    """Raised when a requested ChromaDB collection does not exist."""

    pass


class CollectionCreationError(VectorStoreError):
    """Raised when a ChromaDB collection fails to be created."""

    pass


class InvalidMetadataError(VectorStoreError):
    """Raised when document chunk metadata is invalid for ChromaDB storage."""

    pass
