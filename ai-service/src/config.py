"""
Centralised configuration module for the AI Service.
All environment values are accessed through the Settings class
so no file ever reads os.environ directly.
"""

import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

REQUIRED_VARS = [
    "APP_ENV",
    "APP_PORT",
]


def validate_env():
    """Validate that all critical environment variables are present."""
    missing = [var for var in REQUIRED_VARS if not os.getenv(var)]
    if missing:
        raise RuntimeError(
            f"Missing required environment variables:\n  " + "\n  ".join(missing)
        )


class Settings:
    """Single source of truth for all configuration values."""

    # Application
    ENV: str = os.getenv("APP_ENV", "development")
    PORT: int = int(os.getenv("APP_PORT", "8000"))
    HOST: str = os.getenv("APP_HOST", "0.0.0.0")

    # LLM
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Vector Database
    CHROMADB_HOST: str = os.getenv("CHROMADB_HOST", "localhost")
    CHROMADB_PORT: int = int(os.getenv("CHROMADB_PORT", "8000"))
    CHROMA_DEFAULT_COLLECTION: str = os.getenv("CHROMA_DEFAULT_COLLECTION", "document_chunks")

    # Embedding Configuration
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "chroma_default")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    EMBEDDING_DIMENSION: int = int(os.getenv("EMBEDDING_DIMENSION", "384"))

    # Document Processing & Chunking
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "500"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "100"))
    INGESTION_BATCH_SIZE: int = int(os.getenv("INGESTION_BATCH_SIZE", "64"))

    # Vector Retrieval
    DEFAULT_TOP_K: int = int(os.getenv("DEFAULT_TOP_K", "5"))
    DEFAULT_SIMILARITY_THRESHOLD: Optional[float] = (
        float(os.getenv("DEFAULT_SIMILARITY_THRESHOLD"))
        if os.getenv("DEFAULT_SIMILARITY_THRESHOLD")
        else None
    )

    # Backend
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:5000")

    # Storage
    STORAGE_LOCAL_PATH: str = os.getenv("STORAGE_LOCAL_PATH", "../storage/uploads")


# Validate on import
validate_env()

settings = Settings()
