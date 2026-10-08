"""
FastAPI RAG & Semantic Search Router for AI Service.
Provides endpoints for single-turn RAG queries and multi-turn conversational RAG chat.
"""

import logging
from fastapi import APIRouter, HTTPException, status

from src.retrieval.exceptions import (
    EmptyQueryError,
    RetrievalEmbeddingError,
    RetrievalError,
    RetrievalSecurityError,
    RetrievalStorageError,
)
from src.retrieval.models import (
    RAGChatRequest,
    RAGQueryRequest,
    RAGResponse,
)
from src.retrieval.rag_pipeline import get_rag_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rag", tags=["RAG & Chat"])


@router.post(
    "/query",
    response_model=RAGResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute a tenant-isolated single-turn RAG semantic query",
)
def execute_rag_query(request: RAGQueryRequest) -> RAGResponse:
    """
    Execute semantic retrieval against tenant ChromaDB collection and generate
    a strictly grounded answer with source citations.
    """
    try:
        pipeline = get_rag_pipeline()
        result = pipeline.execute_rag(
            query=request.query,
            company_id=request.company_id,
            department_id=request.department_id,
            classification=request.classification,
            category=request.category,
            top_k=request.top_k or 5,
            score_threshold=request.score_threshold,
        )
        return result
    except (RetrievalSecurityError, EmptyQueryError) as exc:
        logger.warning("RAG Query validation error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_RAG_REQUEST", "message": str(exc)},
        )
    except RetrievalEmbeddingError as exc:
        logger.error("RAG Embedding error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "EMBEDDING_FAILED", "message": "Failed to generate search embedding"},
        )
    except RetrievalStorageError as exc:
        logger.error("RAG Storage error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "VECTORSTORE_ERROR", "message": "Vector store retrieval operation failed"},
        )
    except Exception as exc:
        logger.error("Unexpected error in RAG query: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_RAG_ERROR", "message": "An internal error occurred during RAG generation"},
        )


@router.post(
    "/chat",
    response_model=RAGResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute a multi-turn conversational RAG chat query",
)
def execute_rag_chat(request: RAGChatRequest) -> RAGResponse:
    """
    Execute a multi-turn conversational RAG query with chat history context,
    tenant isolation, and source citations.
    """
    try:
        pipeline = get_rag_pipeline()
        result = pipeline.execute_rag(
            query=request.query,
            company_id=request.company_id,
            department_id=request.department_id,
            classification=request.classification,
            category=request.category,
            top_k=request.top_k or 5,
            chat_history=request.chat_history,
            score_threshold=request.score_threshold,
        )
        return result
    except (RetrievalSecurityError, EmptyQueryError) as exc:
        logger.warning("RAG Chat validation error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_RAG_REQUEST", "message": str(exc)},
        )
    except RetrievalEmbeddingError as exc:
        logger.error("RAG Chat Embedding error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "EMBEDDING_FAILED", "message": "Failed to generate search embedding"},
        )
    except RetrievalStorageError as exc:
        logger.error("RAG Chat Storage error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "VECTORSTORE_ERROR", "message": "Vector store retrieval operation failed"},
        )
    except Exception as exc:
        logger.error("Unexpected error in RAG chat: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_RAG_ERROR", "message": "An internal error occurred during RAG generation"},
        )
