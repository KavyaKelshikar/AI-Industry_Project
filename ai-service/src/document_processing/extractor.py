"""
Common extractor interfaces, data models, and factory for document text extraction.
"""

from abc import ABC, abstractmethod
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Type, Union
from pydantic import BaseModel, Field

from src.document_processing.exceptions import (
    ExtractorError,
    UnsupportedFileTypeError,
)

logger = logging.getLogger(__name__)


class ExtractedUnit(BaseModel):
    """
    Represents an extracted segment (e.g. a page, paragraph, or section) with source provenance.
    """

    text: str = Field(..., description="Raw or cleaned text of this unit")
    page: Optional[int] = Field(None, ge=1, description="1-indexed page number where available")
    section_index: int = Field(0, ge=0, description="Sequential section/paragraph/page index")
    source: Optional[str] = Field(None, description="Source filename or origin path")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional extractor metadata")


class ExtractedDocument(BaseModel):
    """
    Structured container for the full extracted output of a document.
    """

    file_path: str = Field(..., description="Original file path")
    file_name: str = Field(..., description="Base filename")
    file_type: str = Field(..., description="Normalized file format e.g. pdf, docx, txt")
    units: List[ExtractedUnit] = Field(default_factory=list, description="Extracted constituent units")
    raw_text: str = Field("", description="Full concatenated text of all units")
    total_pages: Optional[int] = Field(None, description="Total pages if known")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Document-level metadata")

    @property
    def is_empty(self) -> bool:
        """Returns True if document has no non-whitespace text."""
        return not bool(self.raw_text and self.raw_text.strip())


class BaseExtractor(ABC):
    """
    Abstract interface for format-specific document text extractors.
    """

    @abstractmethod
    def extract(self, file_path: Union[str, Path]) -> ExtractedDocument:
        """
        Extract text and provenance metadata from the target file.

        Args:
            file_path: Path to the target document.

        Returns:
            ExtractedDocument populated with units and full text.

        Raises:
            FileNotFoundError: If the file does not exist.
            EmptyDocumentError: If the file has no extractable text.
            CorruptedFileError: If the file format is invalid or unreadable.
            ExtractorError: For unexpected extraction failures.
        """
        pass

    @property
    @abstractmethod
    def supported_extensions(self) -> List[str]:
        """List of lowercase file extensions supported by this extractor (e.g. ['.pdf'])."""
        pass


_EXTRACTOR_REGISTRY: Dict[str, Type[BaseExtractor]] = {}


def register_extractor(extension: str, extractor_cls: Type[BaseExtractor]) -> None:
    """Register an extractor class for a specific file extension (e.g. '.pdf')."""
    ext = extension.strip().lower()
    if not ext.startswith("."):
        ext = f".{ext}"
    _EXTRACTOR_REGISTRY[ext] = extractor_cls


def get_extractor(file_path_or_extension: Union[str, Path]) -> BaseExtractor:
    """
    Resolve and instantiate the appropriate extractor based on file extension.

    Args:
        file_path_or_extension: File path or extension string (e.g. 'doc.pdf' or '.pdf').

    Returns:
        Instance of BaseExtractor.

    Raises:
        UnsupportedFileTypeError: If no extractor is registered for the extension.
    """
    path_str = str(file_path_or_extension)
    _, ext = os.path.splitext(path_str.lower())
    if not ext and path_str.startswith("."):
        ext = path_str.lower()

    extractor_cls = _EXTRACTOR_REGISTRY.get(ext)
    if not extractor_cls:
        supported = list(_EXTRACTOR_REGISTRY.keys())
        raise UnsupportedFileTypeError(
            f"Unsupported file type '{ext}'. Supported formats: {supported}"
        )

    return extractor_cls()
