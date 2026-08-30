"""
Vector retrieval service implementing tenant-isolated semantic search over ChromaDB.
"""

import logging
import time
from typing import Any, Dict, List, Optional, Union

from src.config import settings
from src.embeddings.base import BaseEmbeddingService
from src.embeddings.factory import get_embedding_service
from src.retrieval.exceptions import (
    EmptyQueryError,
    RetrievalEmbeddingError,
    RetrievalError,
    RetrievalSecurityError,
    RetrievalStorageError,
)
from src.retrieval.models import RetrievalQuery, RetrievalResult, RetrievedChunk
from src.vectorstore.collection_manager import CollectionManager, get_collection_manager
from src.vectorstore.exceptions import VectorStoreError
from src.vectorstore.metadata import build_tenant_filter

logger = logging.getLogger(__name__)


class VectorRetriever:
    """
    Service responsible for executing vector similarity searches against tenant collections.
    """

    def __init__(
        self,
        collection_manager: Optional[CollectionManager] = None,
        embedding_service: Optional[BaseEmbeddingService] = None,
        default_top_k: Optional[int] = None,
        default_similarity_threshold: Optional[float] = None,
    ):
        self._collection_manager = collection_manager
        self._embedding_service = embedding_service
        self.default_top_k = default_top_k or settings.DEFAULT_TOP_K
        self.default_similarity_threshold = (
            default_similarity_threshold
            if default_similarity_threshold is not None
            else settings.DEFAULT_SIMILARITY_THRESHOLD
        )

    @property
    def collection_manager(self) -> CollectionManager:
        if self._collection_manager is None:
            self._collection_manager = get_collection_manager()
        return self._collection_manager

    @property
    def embedding_service(self) -> BaseEmbeddingService:
        if self._embedding_service is None:
            self._embedding_service = get_embedding_service()
        return self._embedding_service

    def retrieve(
        self,
        query: Union[str, RetrievalQuery],
        company_id: Optional[str] = None,
        department_id: Optional[str] = None,
        classification: Optional[Union[str, List[str]]] = None,
        category: Optional[str] = None,
        document_id: Optional[str] = None,
        top_k: Optional[int] = None,
        score_threshold: Optional[float] = None,
        collection_name: Optional[str] = None,
        additional_filters: Optional[Dict[str, Any]] = None,
    ) -> RetrievalResult:
        """
        Execute tenant-isolated vector retrieval for a query.

        Args:
            query: Natural language query string or structured RetrievalQuery object.
            company_id: Tenant identifier (required if query is str).
            department_id: Optional department filter.
            classification: Optional classification filter.
            category: Optional category filter.
            document_id: Optional document filter.
            top_k: Optional override for max number of chunks to return.
            score_threshold: Optional similarity threshold or maximum distance.
            collection_name: Optional collection name override.
            additional_filters: Optional extra metadata constraints.

        Returns:
            RetrievalResult containing ranked RetrievedChunk items.

        Raises:
            RetrievalSecurityError: If company_id is missing or blank.
            EmptyQueryError: If query text is empty.
            RetrievalEmbeddingError: If query embedding generation fails.
            RetrievalStorageError: If vector database search fails.
        """
        start_time = time.perf_counter()

        # 1. Normalize Query Input
        if isinstance(query, RetrievalQuery):
            q_text = query.query
            comp_id = query.company_id
            dept_id = query.department_id
            class_filter = query.classification
            cat_filter = query.category
            doc_id = query.document_id
            k = query.top_k if query.top_k is not None else (
                top_k if top_k is not None else self.default_top_k
            )
            threshold = query.score_threshold if query.score_threshold is not None else (
                score_threshold if score_threshold is not None else self.default_similarity_threshold
            )
            col_override = query.collection_name or collection_name
            extra_filters = query.additional_filters or additional_filters
        else:
            q_text = str(query) if query is not None else ""
            comp_id = company_id
            dept_id = department_id
            class_filter = classification
            cat_filter = category
            doc_id = document_id
            k = top_k if top_k is not None else self.default_top_k
            threshold = score_threshold if score_threshold is not None else self.default_similarity_threshold
            col_override = collection_name
            extra_filters = additional_filters

        # 2. Strict Security Validation
        if not comp_id or not str(comp_id).strip():
            raise RetrievalSecurityError("company_id is strictly required for vector retrieval")

        clean_company_id = str(comp_id).strip()

        # 3. Query Validation
        if not q_text or not q_text.strip():
            raise EmptyQueryError("Search query cannot be empty or whitespace only")

        clean_query = q_text.strip()

        if k < 1:
            raise RetrievalError(f"top_k must be a positive integer >= 1, got {k}")

        target_collection_name = (
            col_override
            or self.collection_manager.get_company_collection_name(clean_company_id)
        )

        logger.info(
            "Executing vector retrieval: query='%s', tenant='%s', collection='%s', top_k=%s",
            clean_query,
            clean_company_id,
            target_collection_name,
            k,
        )

        # 4. Check Collection Existence
        try:
            if not self.collection_manager.collection_exists(target_collection_name):
                logger.info(
                    "Collection '%s' does not exist; returning 0 results",
                    target_collection_name,
                )
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return RetrievalResult(
                    query=clean_query,
                    company_id=clean_company_id,
                    collection_name=target_collection_name,
                    chunks=[],
                    total_found=0,
                    embedding_model=self.embedding_service.model_name,
                    duration_ms=duration_ms,
                )

            collection = self.collection_manager.get_collection(target_collection_name)
            total_items = collection.count()
            if total_items == 0:
                logger.info("Collection '%s' is empty; returning 0 results", target_collection_name)
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return RetrievalResult(
                    query=clean_query,
                    company_id=clean_company_id,
                    collection_name=target_collection_name,
                    chunks=[],
                    total_found=0,
                    embedding_model=self.embedding_service.model_name,
                    duration_ms=duration_ms,
                )
        except Exception as exc:
            logger.error("Failed to inspect ChromaDB collection '%s': %s", target_collection_name, exc)
            raise RetrievalStorageError(
                f"Failed to access vector collection '{target_collection_name}': {exc}",
                original_error=exc,
            )

        # 5. Embed Query
        try:
            query_embedding = self.embedding_service.embed_query(clean_query)
        except Exception as exc:
            logger.error("Failed to generate embedding for query '%s': %s", clean_query, exc)
            raise RetrievalEmbeddingError(
                f"Query embedding generation failed: {exc}",
                original_error=exc,
            )

        # 6. Build Strict Multi-Tenant Filter
        try:
            where_filter = build_tenant_filter(
                company_id=clean_company_id,
                department_id=dept_id,
                classification=class_filter,
                category=cat_filter,
                document_id=doc_id,
                additional_filters=extra_filters,
            )
        except Exception as exc:
            logger.error("Failed to build tenant filter: %s", exc)
            raise RetrievalError(f"Invalid filter parameters: {exc}", original_error=exc)

        # 7. Execute ChromaDB Query
        n_results = min(k, total_items)
        try:
            search_response = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_filter,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            logger.error("Vector search failed on collection '%s': %s", target_collection_name, exc)
            raise RetrievalStorageError(
                f"Vector search failed in ChromaDB: {exc}",
                original_error=exc,
            )

        # 8. Parse Results into Structured Chunks
        retrieved_chunks: List[RetrievedChunk] = []

        ids_list = search_response.get("ids", [[]])[0] if search_response.get("ids") else []
        docs_list = search_response.get("documents", [[]])[0] if search_response.get("documents") else []
        metas_list = search_response.get("metadatas", [[]])[0] if search_response.get("metadatas") else []
        dists_list = search_response.get("distances", [[]])[0] if search_response.get("distances") else []

        for idx, chunk_id in enumerate(ids_list):
            doc_text = docs_list[idx] if idx < len(docs_list) else ""
            meta = metas_list[idx] if idx < len(metas_list) and metas_list[idx] else {}
            dist = dists_list[idx] if idx < len(dists_list) else None

            # Calculate normalized similarity score from distance
            # For cosine distance, distance is in [0, 2]; similarity = max(0, 1 - distance)
            sim_score = None
            if dist is not None:
                sim_score = round(max(0.0, min(1.0, 1.0 - dist)), 4)

            # Apply score threshold if specified
            if threshold is not None and threshold > 0.0:
                if sim_score is not None and sim_score < threshold:
                    continue

            chunk = RetrievedChunk(
                chunkId=str(chunk_id),
                documentId=str(meta.get("documentId", "")),
                companyId=str(meta.get("companyId", clean_company_id)),
                text=doc_text,
                distance=round(dist, 6) if dist is not None else None,
                similarity=sim_score,
                departmentId=meta.get("departmentId"),
                source=meta.get("source"),
                page=meta.get("page"),
                chunkIndex=meta.get("chunkIndex"),
                classification=meta.get("classification"),
                category=meta.get("category"),
                metadata=meta,
            )
            retrieved_chunks.append(chunk)

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        logger.info(
            "Retrieval completed for tenant '%s': found %s matching chunks in %sms",
            clean_company_id,
            len(retrieved_chunks),
            duration_ms,
        )

        return RetrievalResult(
            query=clean_query,
            company_id=clean_company_id,
            collection_name=target_collection_name,
            chunks=retrieved_chunks,
            total_found=len(retrieved_chunks),
            embedding_model=self.embedding_service.model_name,
            duration_ms=duration_ms,
        )


_retriever: Optional[VectorRetriever] = None


def get_vector_retriever(
    collection_manager: Optional[CollectionManager] = None,
    embedding_service: Optional[BaseEmbeddingService] = None,
    default_top_k: Optional[int] = None,
    default_similarity_threshold: Optional[float] = None,
) -> VectorRetriever:
    """
    Obtain or instantiate a VectorRetriever instance.
    """
    global _retriever
    if any(x is not None for x in (collection_manager, embedding_service, default_top_k, default_similarity_threshold)):
        return VectorRetriever(
            collection_manager=collection_manager,
            embedding_service=embedding_service,
            default_top_k=default_top_k,
            default_similarity_threshold=default_similarity_threshold,
        )
    if _retriever is None:
        _retriever = VectorRetriever()
    return _retriever
