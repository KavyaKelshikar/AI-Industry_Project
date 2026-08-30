"""
PDF document extractor using PyMuPDF (fitz) with page-level provenance.
"""

import logging
from pathlib import Path
from typing import List, Union
import fitz  # PyMuPDF

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


class PDFExtractor(BaseExtractor):
    """Extractor for PDF documents capturing page numbers and text per page."""

    @property
    def supported_extensions(self) -> List[str]:
        return [".pdf"]

    def extract(self, file_path: Union[str, Path]) -> ExtractedDocument:
        path = Path(file_path)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(f"PDF file not found: {path}")

        try:
            doc = fitz.open(path)
        except Exception as exc:
            raise CorruptedFileError(f"Failed to open/parse PDF file {path.name}: {exc}", original_error=exc)

        units: List[ExtractedUnit] = []
        raw_texts: List[str] = []
        total_pages = len(doc)

        try:
            for page_index in range(total_pages):
                page_num = page_index + 1
                try:
                    page = doc[page_index]
                    page_raw = page.get_text("text") or ""
                except Exception as page_exc:
                    logger.warning("Error reading page %s of %s: %s", page_num, path.name, page_exc)
                    page_raw = ""

                cleaned_page = clean_text(page_raw)
                if cleaned_page:
                    unit = ExtractedUnit(
                        text=cleaned_page,
                        page=page_num,
                        section_index=page_index,
                        source=path.name,
                        metadata={"page_number": page_num},
                    )
                    units.append(unit)
                    raw_texts.append(cleaned_page)
        finally:
            doc.close()

        full_text = "\n\n".join(raw_texts).strip()
        if not full_text:
            raise EmptyDocumentError(f"PDF document {path.name} contains no readable text")

        return ExtractedDocument(
            file_path=str(path.resolve()),
            file_name=path.name,
            file_type="pdf",
            units=units,
            raw_text=full_text,
            total_pages=total_pages,
            metadata={"source": path.name, "total_pages": total_pages},
        )


register_extractor(".pdf", PDFExtractor)
