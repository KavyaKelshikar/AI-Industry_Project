"""
Tests for text cleaner and normalization.
"""

from src.document_processing.cleaner import clean_text


class TestTextCleaner:
    def test_whitespace_normalization(self):
        raw = "This   is   a    sentence\twith\t\ttabs   and    spaces."
        expected = "This is a sentence with tabs and spaces."
        assert clean_text(raw) == expected

    def test_blank_line_handling(self):
        raw = "Paragraph 1\n\n\n\n\nParagraph 2\r\n\r\n\r\nParagraph 3"
        expected = "Paragraph 1\n\nParagraph 2\n\nParagraph 3"
        assert clean_text(raw) == expected

    def test_trailing_leading_line_whitespace(self):
        raw = "   First line with trailing spaces   \n   Second line with leading spaces   "
        expected = "First line with trailing spaces\nSecond line with leading spaces"
        assert clean_text(raw) == expected

    def test_preserves_meaningful_punctuation_and_numbers(self):
        raw = "Item #1: Voltage = 240V ± 5%, Temp: -10°C to +50°C. Ref: SOP-2026.08."
        assert clean_text(raw) == raw

    def test_empty_and_whitespace_only(self):
        assert clean_text("") == ""
        assert clean_text(None) == ""
        assert clean_text("    \n\n \t\t  ") == ""
