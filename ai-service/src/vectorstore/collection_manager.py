"""
ChromaDB Collection Management Service/Repository layer.

Provides idempotent collection creation, retrieval, existence checks,
metadata inspection, and count operations.
"""

import logging
from typing import Any, Dict, List, Optional

import chromadb
from chromadb.api.models.Collection import Collection

from src.config import settings
from src.vectorstore.chroma_client import get_chroma_client
from src.vectorstore.exceptions import (
    CollectionCreationError,
    CollectionNotFoundError,
    VectorStoreError,
)

logger = logging.getLogger(__name__)


class CollectionManager:
    """
    Service layer responsible for ChromaDB collection lifecycle and query operations.
    """

    def __init__(self, client: Optional[chromadb.ClientAPI] = None):
        """
        Initialise with a ChromaDB client. If none is passed, lazily obtains
        the singleton client from chroma_client module.
        """
        self._client = client

    @property
    def client(self) -> chromadb.ClientAPI:
        """Obtain the active ChromaDB client."""
        if self._client is None:
            self._client = get_chroma_client()
        return self._client

    def get_or_create_collection(
        self,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        embedding_function: Optional[Any] = None,
    ) -> Collection:
        """
        Idempotently get or create a collection.

        If the collection exists, it is reused. No duplicate collections are created.
        If the collection does not exist, it is created with the given metadata
        and embedding function.

        Args:
            name: Collection name. Defaults to settings.CHROMA_DEFAULT_COLLECTION.
            metadata: Optional collection-level metadata dictionary (e.g. {"hnsw:space": "cosine"}).
            embedding_function: Optional Chroma-compatible embedding function.

        Returns:
            The Collection instance.
        """
        collection_name = name or settings.CHROMA_DEFAULT_COLLECTION

        try:
            # Check if it already exists to log appropriately
            already_exists = self.collection_exists(collection_name)
            
            kwargs: Dict[str, Any] = {"name": collection_name}
            if metadata is not None:
                kwargs["metadata"] = metadata
            if embedding_function is not None:
                kwargs["embedding_function"] = embedding_function

            collection = self.client.get_or_create_collection(**kwargs)

            if already_exists:
                logger.info(
                    "Reused existing ChromaDB collection: '%s' (id=%s)",
                    collection_name,
                    collection.id,
                )
            else:
                logger.info(
                    "Created new ChromaDB collection: '%s' (id=%s)",
                    collection_name,
                    collection.id,
                )

            return collection
        except Exception as exc:
            logger.error("Failed to get_or_create collection '%s': %s", collection_name, exc)
            raise CollectionCreationError(
                f"Failed to get or create ChromaDB collection '{collection_name}': {exc}",
                original_error=exc,
            )

    def get_collection(
        self,
        name: Optional[str] = None,
        embedding_function: Optional[Any] = None,
    ) -> Collection:
        """
        Retrieve an existing collection by name.

        Args:
            name: Collection name. Defaults to settings.CHROMA_DEFAULT_COLLECTION.
            embedding_function: Optional Chroma-compatible embedding function.

        Raises:
            CollectionNotFoundError: If the collection does not exist.
        """
        collection_name = name or settings.CHROMA_DEFAULT_COLLECTION

        try:
            kwargs: Dict[str, Any] = {"name": collection_name}
            if embedding_function is not None:
                kwargs["embedding_function"] = embedding_function

            return self.client.get_collection(**kwargs)
        except Exception as exc:
            logger.warning("Collection '%s' not found: %s", collection_name, exc)
            raise CollectionNotFoundError(
                f"ChromaDB collection '{collection_name}' not found: {exc}",
                original_error=exc,
            )

    def collection_exists(self, name: str) -> bool:
        """
        Check whether a collection with the given name currently exists.
        """
        try:
            collections = self.client.list_collections()
            collection_names = [
                col.name if hasattr(col, "name") else str(col)
                for col in collections
            ]
            return name in collection_names
        except Exception as exc:
            logger.error("Error checking collection existence for '%s': %s", name, exc)
            raise VectorStoreError(
                f"Failed to inspect collection list: {exc}",
                original_error=exc,
            )

    def get_collection_count(self, name: Optional[str] = None) -> int:
        """
        Return the total number of document chunks/items in the specified collection.
        """
        collection = self.get_collection(name)
        try:
            return collection.count()
        except Exception as exc:
            logger.error("Failed to get count for collection '%s': %s", name, exc)
            raise VectorStoreError(
                f"Failed to get count for collection '{name}': {exc}",
                original_error=exc,
            )

    def get_collection_info(self, name: Optional[str] = None) -> Dict[str, Any]:
        """
        Return metadata, item count, and identifiers for a collection.
        """
        collection_name = name or settings.CHROMA_DEFAULT_COLLECTION
        collection = self.get_collection(collection_name)
        try:
            return {
                "name": collection.name,
                "id": str(collection.id),
                "count": collection.count(),
                "metadata": collection.metadata or {},
            }
        except Exception as exc:
            logger.error("Failed to inspect collection info for '%s': %s", collection_name, exc)
            raise VectorStoreError(
                f"Failed to retrieve info for collection '{collection_name}': {exc}",
                original_error=exc,
            )

    def list_collections(self) -> List[str]:
        """
        List the names of all collections in ChromaDB.
        """
        try:
            collections = self.client.list_collections()
            return [
                col.name if hasattr(col, "name") else str(col)
                for col in collections
            ]
        except Exception as exc:
            logger.error("Failed to list collections: %s", exc)
            raise VectorStoreError(
                f"Failed to list ChromaDB collections: {exc}",
                original_error=exc,
            )

    def delete_collection(self, name: str) -> bool:
        """
        Delete a collection by name idempotently.
        Returns True if deleted, False if collection did not exist.
        """
        if not self.collection_exists(name):
            logger.info("Collection '%s' does not exist, nothing to delete", name)
            return False

        try:
            self.client.delete_collection(name=name)
            logger.info("Deleted ChromaDB collection '%s'", name)
            return True
        except Exception as exc:
            logger.error("Failed to delete collection '%s': %s", name, exc)
            raise VectorStoreError(
                f"Failed to delete ChromaDB collection '{name}': {exc}",
                original_error=exc,
            )

    @staticmethod
    def get_company_collection_name(company_id: str) -> str:
        """
        Generate tenant-isolated collection name according to standard convention.
        """
        clean_id = company_id.strip().lower()
        return f"company_{clean_id}"

    def get_or_create_company_collection(
        self,
        company_id: str,
        metadata: Optional[Dict[str, Any]] = None,
        embedding_function: Optional[Any] = None,
    ) -> Collection:
        """
        Idempotently get or create a tenant-specific collection.
        """
        collection_name = self.get_company_collection_name(company_id)
        tenant_meta = {"companyId": company_id}
        if metadata:
            tenant_meta.update(metadata)
        return self.get_or_create_collection(
            name=collection_name,
            metadata=tenant_meta,
            embedding_function=embedding_function,
        )

    def delete_document_vectors(self, company_id: str, document_id: str) -> int:
        """
        Delete all vector chunks associated with a specific document from the tenant collection.
        Idempotent: if collection or vectors don't exist, returns 0 cleanly.
        """
        collection_name = self.get_company_collection_name(company_id)
        if not self.collection_exists(collection_name):
            logger.info("Collection '%s' does not exist, nothing to delete for document '%s'", collection_name, document_id)
            return 0

        try:
            collection = self.get_collection(collection_name)
            initial_count = collection.count()
            collection.delete(where={"documentId": document_id})
            remaining_count = collection.count()
            deleted_count = max(0, initial_count - remaining_count)
            logger.info(
                "Deleted vectors for document '%s' in collection '%s' (purged ~%s vectors)",
                document_id,
                collection_name,
                deleted_count,
            )
            return deleted_count
        except Exception as exc:
            logger.error(
                "Error deleting vectors for document '%s' in collection '%s': %s",
                document_id,
                collection_name,
                exc,
            )
            raise VectorStoreError(
                f"Failed to delete document vectors from ChromaDB: {exc}",
                original_error=exc,
            )


_collection_manager: Optional[CollectionManager] = None


def get_collection_manager(client: Optional[chromadb.ClientAPI] = None) -> CollectionManager:
    """
    Obtain or instantiate the CollectionManager instance.
    """
    global _collection_manager
    if client is not None:
        return CollectionManager(client=client)
    if _collection_manager is None:
        _collection_manager = CollectionManager()
    return _collection_manager
