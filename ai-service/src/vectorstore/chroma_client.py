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


def get_chroma_client() -> chromadb.ClientAPI:
    """
    Return a singleton ChromaDB client.

    Connects to remote ChromaDB HttpClient if available; falls back seamlessly
    to local PersistentClient if remote server is unreachable.
    """
    global _chroma_client

    if _chroma_client is None:
        try:
            client = chromadb.HttpClient(
                host=settings.CHROMADB_HOST,
                port=settings.CHROMADB_PORT,
            )
            client.heartbeat()
            _chroma_client = client
            logger.info(
                "ChromaDB HttpClient connected to %s:%s",
                settings.CHROMADB_HOST,
                settings.CHROMADB_PORT,
            )
        except Exception as exc:
            logger.warning(
                "Remote ChromaDB at %s:%s unavailable (%s). Using local PersistentClient.",
                settings.CHROMADB_HOST,
                settings.CHROMADB_PORT,
                exc,
            )
            _chroma_client = chromadb.PersistentClient(path="./chroma_data")
            logger.info("ChromaDB PersistentClient initialized at ./chroma_data")

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
