"""
Tests for LLM Provider Abstraction, Credential Handling, and Grounding Fallback.
"""

import pytest
from src.llm.client import (
    DeterministicGroundingLLMClient,
    GeminiLLMClient,
    LLMError,
    LLMProviderUnavailableError,
    get_llm_client,
)


def test_deterministic_grounding_with_context():
    """Verify deterministic grounding extracts facts and cites source."""
    client = DeterministicGroundingLLMClient()
    prompt = """
=== CONTEXT FROM VERIFIED DOCUMENTS ===
[Source 1] (Document: test.pdf, Ref ID: doc-1)
Boiler pressure must be monitored every 2 hours.
=== END OF CONTEXT ===

User Question: What is boiler pressure protocol?
"""
    answer = client.generate(prompt)
    assert "Boiler pressure must be monitored" in answer
    assert "[Source 1]" in answer


def test_deterministic_grounding_insufficient_context():
    """Verify fallback response when context is empty."""
    client = DeterministicGroundingLLMClient()
    prompt = "=== CONTEXT FROM VERIFIED DOCUMENTS ===\nNo matching documents found.\n=== END OF CONTEXT ==="
    answer = client.generate(prompt)
    assert "The available company documentation does not provide enough information" in answer


def test_gemini_missing_credentials():
    """Verify Gemini client raises safe exception when API key is missing."""
    client = GeminiLLMClient(api_key="")
    assert not client.is_available()
    with pytest.raises(LLMProviderUnavailableError) as exc_info:
        client.generate("Hello")
    assert "Gemini API key is not configured" in str(exc_info.value)


def test_gemini_sanitizes_errors_and_keys(monkeypatch):
    """Verify error messages never leak secret API keys."""
    secret_key = "secret_ai_key_987654321"
    client = GeminiLLMClient(api_key=secret_key, timeout_seconds=0.001)

    with pytest.raises(LLMError) as exc_info:
        client.generate("Test prompt")

    err_str = str(exc_info.value)
    # The secret API key must never appear in the error string
    assert secret_key not in err_str


def test_get_llm_client_factory():
    """Verify factory returns deterministic client when no key configured."""
    client = get_llm_client(force_deterministic=True)
    assert isinstance(client, DeterministicGroundingLLMClient)
    assert client.is_available()


def test_gemini_model_configuration(monkeypatch):
    """Verify Gemini client respects configured model name and fallback to Settings."""
    from src.config import settings

    # Default should match settings.GEMINI_MODEL
    client_default = GeminiLLMClient(api_key="test-key")
    assert client_default.model_name == settings.GEMINI_MODEL
    assert "gemini-3.5-flash" in client_default.provider_name

    # Explicit model should override settings
    client_custom = GeminiLLMClient(api_key="test-key", model_name="custom-gemini-model")
    assert client_custom.model_name == "custom-gemini-model"
    assert "custom-gemini-model" in client_custom.provider_name
