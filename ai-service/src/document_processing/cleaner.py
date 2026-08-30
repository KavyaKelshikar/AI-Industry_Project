"""
Text cleaning and normalization utilities for extracted document content.
"""

import re
from typing import Optional


def clean_text(text: Optional[str]) -> str:
    """
    Clean and normalize raw extracted document text.

    - Normalizes non-breaking spaces and erratic unicode whitespace.
    - Collapses multiple horizontal spaces and tabs into a single space.
    - Normalizes newline characters (CRLF / CR -> LF).
    - Removes trailing/leading whitespace from each line.
    - Limits consecutive blank lines to at most one blank line (preserving paragraph breaks: \n\n).
    - Preserves sentence punctuation, case, numbers, bullet characters, and semantic formatting.

    Args:
        text: Raw input text string.

    Returns:
        Cleaned, normalized string. Returns empty string if input is None or whitespace.
    """
    if not text:
        return ""

    # Replace non-breaking spaces and special spaces with standard space
    cleaned = text.replace("\u00a0", " ").replace("\u200b", "").replace("\ufeff", "")

    # Normalize line endings to \n
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")

    # Replace tabs and multiple horizontal whitespace (excluding newlines) with single space
    cleaned = re.sub(r"[^\S\n]+", " ", cleaned)

    # Strip trailing and leading horizontal whitespace from each line
    lines = [line.strip() for line in cleaned.split("\n")]

    # Rejoin lines
    rejoined = "\n".join(lines)

    # Collapse 3 or more consecutive newlines into 2 (\n\n represents paragraph boundary)
    rejoined = re.sub(r"\n{3,}", "\n\n", rejoined)

    # Strip overall leading/trailing whitespace
    return rejoined.strip()
