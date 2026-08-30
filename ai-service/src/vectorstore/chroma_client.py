"""
ChromaDB connection module for the AI Service.

Provides a singleton HttpClient configured from environment variables
and a heartbeat-based connectivity check. Collections are NOT created
here — they belong in a later phase.
"""

import logging
from typing import Optional

import chromadb
from src.config import settings

logger = logging.getLogger(__name__)

_chroma_client: Optional[chromadb.ClientAPI] = None


def get_chroma_client() -> chromadb.HttpClient:
    """
    Return a singleton ChromaDB HttpClient.

    The client is lazily initialised on first call and reused for the
    lifetime of the process.
    """
    global _chroma_client

    if _chroma_client is None:
        _chroma_client = chromadb.HttpClient(
            host=settings.CHROMADB_HOST,
            port=settings.CHROMADB_PORT,
        )
        logger.info(
            "ChromaDB client configured for %s:%s",
            settings.CHROMADB_HOST,
            settings.CHROMADB_PORT,
        )

    return _chroma_client


async def verify_chroma_connection() -> bool:
    """
    Verify ChromaDB connectivity by calling the heartbeat endpoint.

    Returns True on success, False on failure. Never raises.
    """
    try:
        client = get_chroma_client()
        client.heartbeat()
        logger.info("ChromaDB connection verified (heartbeat OK)")
        return True
    except Exception as exc:
        logger.error("ChromaDB connection failed: %s", exc)
        return False
