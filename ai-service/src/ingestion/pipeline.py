"""
End-to-End Vector Ingestion Pipeline orchestrating extraction, cleaning, chunking,
embedding generation, and idempotent ChromaDB vector persistence.
"""

import logging
import time
from typing import List, Optional

from src.config import settings
from src.document_processing.chunker import DocumentChunk, DocumentChunker
from src.document_processing.exceptions import (
    DocumentProcessingError,
    EmptyDocumentError,
    ExtractorError,
)
from src.document_processing.extractor import get_extractor
from src.embeddings.base import BaseEmbeddingService
from src.embeddings.factory import get_embedding_service
from src.ingestion.exceptions import (
    IngestionEmbeddingError,
    IngestionError,
    IngestionExtractionError,
    IngestionStorageError,
    MissingTenantError,
)
from src.ingestion.models import IngestionRequest, IngestionResult
from src.vectorstore.collection_manager import CollectionManager, get_collection_manager
from src.vectorstore.exceptions import VectorStoreError

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """
    Orchestrates end-to-end vector ingestion:
    Document -> Extract -> Clean -> Chunk -> Embed -> Store (Upsert) in ChromaDB.
    """

    def __init__(
        self,
        collection_manager: Optional[CollectionManager] = None,
        embedding_service: Optional[BaseEmbeddingService] = None,
        chunker: Optional[DocumentChunker] = None,
        batch_size: Optional[int] = None,
    ):
        self._collection_manager = collection_manager
        self._embedding_service = embedding_service
        self._chunker = chunker or DocumentChunker()
        self._batch_size = batch_size or settings.INGESTION_BATCH_SIZE

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

    def ingest_document(self, request: IngestionRequest) -> IngestionResult:
        """
        Execute the full ingestion pipeline for a document file.

        Args:
            request: IngestionRequest specification.

        Returns:
            IngestionResult with processing counts and metrics.

        Raises:
            MissingTenantError: If company_id is missing or blank.
            IngestionExtractionError: If file extraction/reading fails.
            IngestionEmbeddingError: If vector generation fails.
            IngestionStorageError: If vector persistence fails.
        """
        start_time = time.perf_counter()

        # 1. Security & Parameter Validation
        if not request.company_id or not request.company_id.strip():
            raise MissingTenantError("company_id is strictly required for vector ingestion")
        if not request.document_id or not request.document_id.strip():
            raise IngestionError("document_id is strictly required for vector ingestion")

        company_id = request.company_id.strip()
        document_id = request.document_id.strip()
        batch_size = request.batch_size or self._batch_size

        # Resolve target collection name (default: tenant-isolated collection)
        target_collection_name = (
            request.collection_name
            or self.collection_manager.get_company_collection_name(company_id)
        )

        logger.info(
            "Starting ingestion for document '%s' (tenant='%s', target_collection='%s')",
            document_id,
            company_id,
            target_collection_name,
        )

        # 2. Text Extraction
        try:
            extractor = get_extractor(request.file_path)
            extracted_doc = extractor.extract(request.file_path)
        except EmptyDocumentError as exc:
            logger.warning("Document '%s' contains no extractable text: %s", document_id, exc)
            raise IngestionExtractionError(
                f"Document '{document_id}' is empty or contains no readable text: {exc}",
                original_error=exc,
            )
        except (ExtractorError, FileNotFoundError, Exception) as exc:
            logger.error("Extraction failed for document '%s': %s", document_id, exc)
            raise IngestionExtractionError(
                f"Extraction failed for document '{document_id}': {exc}",
                original_error=exc,
            )

        # 3. Deterministic Chunking
        try:
            chunks: List[DocumentChunk] = self._chunker.chunk_document(
                extracted_doc=extracted_doc,
                document_id=document_id,
                company_id=company_id,
                department_id=request.department_id,
                classification=request.classification,
                category=request.category,
            )
        except Exception as exc:
            logger.error("Chunking failed for document '%s': %s", document_id, exc)
            raise IngestionExtractionError(
                f"Chunking failed for document '{document_id}': {exc}",
                original_error=exc,
            )

        if not chunks:
            raise IngestionExtractionError(
                f"Document '{document_id}' produced 0 chunks after processing"
            )

        # 4. Target Collection Retrieval
        try:
            collection = self.collection_manager.get_or_create_collection(
                name=target_collection_name,
                metadata={"companyId": company_id},
            )
        except (VectorStoreError, Exception) as exc:
            logger.error(
                "Failed to access ChromaDB collection '%s': %s",
                target_collection_name,
                exc,
            )
            raise IngestionStorageError(
                f"Failed to access ChromaDB collection '{target_collection_name}': {exc}",
                original_error=exc,
            )

        # 5. Batch Embedding & Idempotent Vector Upsert
        total_vectors_stored = 0
        total_chunks = len(chunks)

        for i in range(0, total_chunks, batch_size):
            chunk_batch = chunks[i : i + batch_size]
            batch_texts = [c.text for c in chunk_batch]

            # Generate Embeddings
            try:
                embeddings = self.embedding_service.embed_documents(batch_texts)
            except Exception as exc:
                logger.error("Embedding generation failed for document '%s': %s", document_id, exc)
                raise IngestionEmbeddingError(
                    f"Embedding generation failed: {exc}",
                    original_error=exc,
                )

            if len(embeddings) != len(chunk_batch):
                raise IngestionEmbeddingError(
                    f"Embedding count mismatch: expected {len(chunk_batch)}, got {len(embeddings)}"
                )

            # Prepare ChromaDB Payload
            ids = [c.chunkId for c in chunk_batch]
            metadatas = [c.to_metadata().to_chroma_metadata() for c in chunk_batch]

            # Idempotent Upsert
            try:
                collection.upsert(
                    ids=ids,
                    documents=batch_texts,
                    embeddings=embeddings,
                    metadatas=metadatas,
                )
                total_vectors_stored += len(ids)
            except Exception as exc:
                logger.error(
                    "Failed to upsert vector batch (%s-%s) for document '%s': %s",
                    i,
                    i + len(chunk_batch),
                    document_id,
                    exc,
                )
                raise IngestionStorageError(
                    f"ChromaDB storage failed: {exc}",
                    original_error=exc,
                )

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        logger.info(
            "Ingestion completed for document '%s': %s chunks, %s vectors in %sms",
            document_id,
            total_chunks,
            total_vectors_stored,
            duration_ms,
        )

        return IngestionResult(
            document_id=document_id,
            company_id=company_id,
            collection_name=target_collection_name,
            chunks_count=total_chunks,
            vectors_stored=total_vectors_stored,
            embedding_model=self.embedding_service.model_name,
            status="success",
            duration_ms=duration_ms,
            metadata={
                "file_name": extracted_doc.file_name,
                "file_type": extracted_doc.file_type,
                "total_pages": extracted_doc.total_pages,
            },
        )


_ingestion_pipeline: Optional[IngestionPipeline] = None


def get_ingestion_pipeline(
    collection_manager: Optional[CollectionManager] = None,
    embedding_service: Optional[BaseEmbeddingService] = None,
    chunker: Optional[DocumentChunker] = None,
    batch_size: Optional[int] = None,
) -> IngestionPipeline:
    """
    Obtain or instantiate an IngestionPipeline instance.
    """
    global _ingestion_pipeline
    if any(x is not None for x in (collection_manager, embedding_service, chunker, batch_size)):
        return IngestionPipeline(
            collection_manager=collection_manager,
            embedding_service=embedding_service,
            chunker=chunker,
            batch_size=batch_size,
        )
    if _ingestion_pipeline is None:
        _ingestion_pipeline = IngestionPipeline()
    return _ingestion_pipeline
