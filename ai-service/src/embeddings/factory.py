"""
Factory for creating and configuring embedding service instances.
"""

import logging
from typing import Dict, Optional, Type

from src.config import settings
from src.embeddings.base import BaseEmbeddingService
from src.embeddings.chroma_default import ChromaDefaultEmbeddingService
from src.embeddings.mock import MockEmbeddingService

logger = logging.getLogger(__name__)

_REGISTRY: Dict[str, Type[BaseEmbeddingService]] = {
    "chroma_default": ChromaDefaultEmbeddingService,
    "default": ChromaDefaultEmbeddingService,
    "all-minilm": ChromaDefaultEmbeddingService,
    "mock": MockEmbeddingService,
    "test": MockEmbeddingService,
}

_cached_service: Optional[BaseEmbeddingService] = None


def get_embedding_service(
    provider: Optional[str] = None,
    model_name: Optional[str] = None,
    use_cache: bool = True,
) -> BaseEmbeddingService:
    """
    Get or instantiate an embedding service based on provider configuration.

    Args:
        provider: Provider name (e.g. 'chroma_default', 'mock'). Defaults to settings.EMBEDDING_PROVIDER.
        model_name: Model name. Defaults to settings.EMBEDDING_MODEL.
        use_cache: Whether to return singleton cached instance.

    Returns:
        Instance conforming to BaseEmbeddingService.
    """
    global _cached_service

    selected_provider = (provider or settings.EMBEDDING_PROVIDER).strip().lower()
    selected_model = model_name or settings.EMBEDDING_MODEL

    if use_cache and _cached_service is not None and provider is None and model_name is None:
        return _cached_service

    service_cls = _REGISTRY.get(selected_provider)
    if not service_cls:
        logger.warning(
            "Unknown embedding provider '%s', falling back to 'chroma_default'",
            selected_provider,
        )
        service_cls = ChromaDefaultEmbeddingService

    logger.info(
        "Instantiating embedding service: provider=%s, model=%s",
        selected_provider,
        selected_model,
    )
    try:
        instance = service_cls(model_name=selected_model)
    except TypeError:
        instance = service_cls()

    if use_cache and provider is None and model_name is None:
        _cached_service = instance

    return instance


def register_embedding_provider(name: str, service_cls: Type[BaseEmbeddingService]) -> None:
    """Register a custom embedding provider class at runtime."""
    _REGISTRY[name.strip().lower()] = service_cls
