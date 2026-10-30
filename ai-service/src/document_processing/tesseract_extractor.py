"""
OCR document and image extractor using Tesseract and Pillow (PIL).
Supports scanned images (.png, .jpg, .jpeg, .tiff, .bmp, .webp).
"""

import logging
import os
from pathlib import Path
import shutil
from typing import List, Union
from PIL import Image

try:
    import pytesseract
except ImportError:
    pytesseract = None

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


def _configure_tesseract_cmd() -> bool:
    """
    Attempt to locate tesseract executable and configure pytesseract.
    Returns True if an executable is found and configured, False otherwise.
    """
    if pytesseract is None:
        return False

    # 1. Custom env var
    env_path = os.getenv("TESSERACT_PATH")
    if env_path and os.path.exists(env_path):
        pytesseract.pytesseract.tesseract_cmd = env_path
        return True

    # 2. Check standard system PATH
    if shutil.which("tesseract"):
        return True

    # 3. Check common Windows installation paths
    common_win_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
    ]
    for win_path in common_win_paths:
        if os.path.exists(win_path):
            pytesseract.pytesseract.tesseract_cmd = win_path
            return True

    return False


class TesseractExtractor(BaseExtractor):
    """
    Extractor for image files utilizing Tesseract OCR to convert visual text
    into grounded documents for RAG embedding.
    """

    SUPPORTED_EXTS = [".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"]

    @property
    def supported_extensions(self) -> List[str]:
        return self.SUPPORTED_EXTS

    def extract(self, file_path: Union[str, Path]) -> ExtractedDocument:
        path = Path(file_path)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(f"Image file not found: {path}")

        try:
            image = Image.open(path)
        except Exception as exc:
            raise CorruptedFileError(
                f"Failed to open/parse image file {path.name}: {exc}", original_error=exc
            )

        tesseract_available = _configure_tesseract_cmd()
        raw_text = ""

        if not tesseract_available:
            mock_allowed = os.getenv("OCR_MOCK_FALLBACK", "false").lower() in ("true", "1")
            if mock_allowed:
                logger.warning(
                    "Tesseract binary not found; using mock fallback text for %s", path.name
                )
                raw_text = f"[OCR Extracted from {path.name}]: Document visual data placeholder."
            else:
                raise ExtractorError(
                    f"Tesseract OCR is not installed or not in PATH for file '{path.name}'. "
                    "Install Tesseract-OCR or configure TESSERACT_PATH environment variable."
                )
        else:
            try:
                raw_text = pytesseract.image_to_string(image)
            except Exception as exc:
                raise ExtractorError(
                    f"Tesseract OCR extraction failed on {path.name}: {exc}", original_error=exc
                )

        cleaned = clean_text(raw_text or "")
        if not cleaned:
            raise EmptyDocumentError(f"Image {path.name} contains no readable text via OCR")

        unit = ExtractedUnit(
            text=cleaned,
            page=1,
            section_index=0,
            source=path.name,
            metadata={"source": path.name, "page": 1, "extractor": "tesseract_ocr"},
        )

        return ExtractedDocument(
            file_path=str(path.resolve()),
            file_name=path.name,
            file_type=path.suffix.lstrip(".").lower() or "image",
            units=[unit],
            raw_text=cleaned,
            total_pages=1,
            metadata={
                "source": path.name,
                "extractor": "tesseract_ocr",
                "total_pages": 1,
            },
        )


# Register all supported image formats
for ext in TesseractExtractor.SUPPORTED_EXTS:
    register_extractor(ext, TesseractExtractor)
