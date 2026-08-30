"""
Plain text (.txt) document extractor.
"""

import logging
import os
from pathlib import Path
from typing import List, Union

from src.document_processing.cleaner import clean_text
from src.document_processing.exceptions import (
    CorruptedFileError,
    EmptyDocumentError,
    ExtractorError,
)
from src.document_processing.extractor import (
    BaseExtractor,
    ExtractedDocument,
    ExtractedUnit,
    register_extractor,
)

logger = logging.getLogger(__name__)


class TXTExtractor(BaseExtractor):
    """Extractor for standard plain text (.txt) files."""

    @property
    def supported_extensions(self) -> List[str]:
        return [".txt"]

    def extract(self, file_path: Union[str, Path]) -> ExtractedDocument:
        path = Path(file_path)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(f"File not found: {path}")

        raw_content = ""
        # Try UTF-8 first, fallback to latin-1 / cp1252
        encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]
        decoded = False

        for enc in encodings:
            try:
                with open(path, "r", encoding=enc) as f:
                    raw_content = f.read()
                decoded = True
                break
            except UnicodeDecodeError:
                continue
            except Exception as exc:
                raise CorruptedFileError(f"Failed to read TXT file {path.name}: {exc}", original_error=exc)

        if not decoded:
            raise CorruptedFileError(f"Could not decode text file {path.name} with supported encodings")

        cleaned = clean_text(raw_content)
        if not cleaned:
            raise EmptyDocumentError(f"Document {path.name} contains no text content")

        unit = ExtractedUnit(
            text=cleaned,
            page=1,
            section_index=0,
            source=path.name,
            metadata={"encoding": enc, "file_size_bytes": path.stat().st_size},
        )

        return ExtractedDocument(
            file_path=str(path.resolve()),
            file_name=path.name,
            file_type="txt",
            units=[unit],
            raw_text=cleaned,
            total_pages=1,
            metadata={"source": path.name},
        )


register_extractor(".txt", TXTExtractor)
