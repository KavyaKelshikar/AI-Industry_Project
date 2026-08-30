"""
vectorstore package — ChromaDB connectivity, collection management, and metadata isolation.
"""

from src.vectorstore.chroma_client import get_chroma_client, verify_chroma_connection
from src.vectorstore.collection_manager import CollectionManager, get_collection_manager
from src.vectorstore.exceptions import (
    ChromaConnectionError,
    CollectionCreationError,
    CollectionNotFoundError,
    InvalidMetadataError,
    VectorStoreError,
)
from src.vectorstore.metadata import DocumentChunkMetadata, build_tenant_filter

__all__ = [
    "get_chroma_client",
    "verify_chroma_connection",
    "CollectionManager",
    "get_collection_manager",
    "DocumentChunkMetadata",
    "build_tenant_filter",
    "VectorStoreError",
    "ChromaConnectionError",
    "CollectionNotFoundError",
    "CollectionCreationError",
    "InvalidMetadataError",
]
