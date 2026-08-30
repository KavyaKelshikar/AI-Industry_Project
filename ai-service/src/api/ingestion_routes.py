"""
FastAPI Ingestion & Vector Management Router for AI Service.
Provides endpoints for document vectorization and tenant-scoped vector deletion.
"""

import logging
from fastapi import APIRouter, HTTPException, status
from src.ingestion.exceptions import (
    IngestionEmbeddingError,
    IngestionExtractionError,
    IngestionStorageError,
    MissingTenantError,
)
from src.ingestion.models import IngestionRequest, IngestionResult
from src.ingestion.pipeline import get_ingestion_pipeline
from src.vectorstore.collection_manager import get_collection_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Ingestion"])


@router.post(
    "/ingest",
    response_model=IngestionResult,
    status_code=status.HTTP_200_OK,
    summary="Ingest a document into tenant ChromaDB vector collection",
)
def ingest_document(request: IngestionRequest) -> IngestionResult:
    """
    Execute full text extraction, cleaning, chunking, embedding,
    and vector persistence for a document.
    """
    try:
        pipeline = get_ingestion_pipeline()
        result = pipeline.ingest_document(request)
        return result
    except MissingTenantError as exc:
        logger.warning("Missing tenant error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "MISSING_TENANT", "message": str(exc)},
        )
    except IngestionExtractionError as exc:
        logger.warning("Extraction error for document '%s': %s", request.document_id, exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "EXTRACTION_FAILED", "message": str(exc)},
        )
    except IngestionEmbeddingError as exc:
        logger.error("Embedding generation error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "EMBEDDING_FAILED", "message": str(exc)},
        )
    except IngestionStorageError as exc:
        logger.error("Vector storage error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "STORAGE_FAILED", "message": str(exc)},
        )
    except Exception as exc:
        logger.error("Unexpected ingestion error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_INGESTION_ERROR", "message": str(exc)},
        )


@router.delete(
    "/vectors/{company_id}/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete all vector chunks for a document from tenant collection",
)
def delete_document_vectors(company_id: str, document_id: str):
    """
    Delete all vector embeddings belonging to a specific document
    from the company-scoped ChromaDB collection.
    """
    if not company_id or not company_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_TENANT", "message": "company_id is required"},
        )
    if not document_id or not document_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_DOCUMENT", "message": "document_id is required"},
        )

    try:
        col_mgr = get_collection_manager()
        deleted_count = col_mgr.delete_document_vectors(
            company_id=company_id.strip(),
            document_id=document_id.strip(),
        )
        return {
            "success": True,
            "company_id": company_id.strip(),
            "document_id": document_id.strip(),
            "vectors_deleted": deleted_count,
        }
    except Exception as exc:
        logger.error("Error deleting vectors: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "VECTOR_DELETION_FAILED", "message": str(exc)},
        )
