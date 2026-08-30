"""
ingestion package — End-to-End document vector ingestion pipeline.
"""

from src.ingestion.exceptions import (
    IngestionEmbeddingError,
    IngestionError,
    IngestionExtractionError,
    IngestionStorageError,
    MissingTenantError,
)
from src.ingestion.models import IngestionRequest, IngestionResult
from src.ingestion.pipeline import IngestionPipeline, get_ingestion_pipeline

__all__ = [
    "IngestionPipeline",
    "get_ingestion_pipeline",
    "IngestionRequest",
    "IngestionResult",
    "IngestionError",
    "MissingTenantError",
    "IngestionExtractionError",
    "IngestionEmbeddingError",
    "IngestionStorageError",
]
