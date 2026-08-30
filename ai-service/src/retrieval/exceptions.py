"""
Exceptions for vector retrieval operations.
"""


class RetrievalError(Exception):
    """Base exception for all vector retrieval failures."""

    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(message)
        self.original_error = original_error


class RetrievalSecurityError(RetrievalError):
    """Raised when tenant security rules are violated (e.g. missing companyId)."""

    pass


class EmptyQueryError(RetrievalError):
    """Raised when an empty or whitespace-only search query is supplied."""

    pass


class RetrievalEmbeddingError(RetrievalError):
    """Raised when embedding query generation fails."""

    pass


class RetrievalStorageError(RetrievalError):
    """Raised when querying the vector database fails."""

    pass
