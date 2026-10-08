"""
LLM Provider Abstraction Layer for Enterprise RAG.
Supports Google Gemini with resilient timeouts, credential sanitization,
and a deterministic grounding fallback for testing/offline environments.
"""

import abc
import json
import logging
import re
import time
from typing import Any, Dict, List, Optional
import httpx

from src.config import settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Base exception for LLM generation failures."""

    def __init__(self, message: str, original_error: Optional[Exception] = None):
        super().__init__(message)
        self.original_error = original_error


class LLMProviderUnavailableError(LLMError):
    """Raised when the LLM provider cannot be contacted or credentials are invalid."""
    pass


class BaseLLMClient(abc.ABC):
    """
    Abstract interface for LLM generation engines.
    """

    @property
    @abc.abstractmethod
    def provider_name(self) -> str:
        """Name of the LLM provider."""
        pass

    @abc.abstractmethod
    def is_available(self) -> bool:
        """Check if provider is configured and available."""
        pass

    @abc.abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        """
        Generate a completion for the given prompt and system instructions.

        Args:
            prompt: User/context prompt.
            system_prompt: Optional system grounding instruction.
            temperature: Sampling temperature (0.0 to 1.0).
            max_tokens: Maximum tokens in completion.

        Returns:
            Generated text answer.

        Raises:
            LLMError: If generation fails.
        """
        pass


class GeminiLLMClient(BaseLLMClient):
    """
    Google Gemini LLM provider using REST API with strict error sanitization.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "gemini-1.5-flash",
        timeout_seconds: float = 30.0,
    ):
        self._api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model_name = model_name
        self.timeout_seconds = timeout_seconds

    @property
    def provider_name(self) -> str:
        return f"google-gemini ({self.model_name})"

    def is_available(self) -> bool:
        return bool(self._api_key and str(self._api_key).strip())

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        if not self.is_available():
            raise LLMProviderUnavailableError("Gemini API key is not configured or is empty")

        clean_api_key = str(self._api_key).strip()
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent"
            f"?key={clean_api_key}"
        )

        contents: List[Dict[str, Any]] = [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ]

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": max(0.0, min(1.0, temperature)),
                "maxOutputTokens": max(10, min(4096, max_tokens)),
            },
        }

        if system_prompt:
            payload["systemInstruction"] = {
                "parts": [{"text": system_prompt}]
            }

        start_time = time.perf_counter()
        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

            if response.status_code != 200:
                # Sanitize response to never leak API key or internal URLs
                status_code = response.status_code
                error_body = response.text
                sanitized_msg = f"Gemini API returned HTTP {status_code}"
                try:
                    err_json = response.json()
                    if "error" in err_json and "message" in err_json["error"]:
                        sanitized_msg += f": {err_json['error']['message']}"
                except Exception:
                    pass

                # Strip out any potential key reflection
                sanitized_msg = sanitized_msg.replace(clean_api_key, "[REDACTED_API_KEY]")
                logger.error("Gemini API error: %s", sanitized_msg)
                raise LLMError(f"LLM generation failed: {sanitized_msg}")

            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                logger.warning("Gemini returned empty candidate list")
                return "The available company documentation does not provide enough information to answer this question."

            first_cand = candidates[0]
            content = first_cand.get("content", {})
            parts = content.get("parts", [])
            if not parts or "text" not in parts[0]:
                return "The available company documentation does not provide enough information to answer this question."

            ans_text = parts[0]["text"].strip()
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.info("Gemini generation completed in %sms", elapsed_ms)
            return ans_text

        except httpx.TimeoutException as exc:
            logger.error("Gemini API call timed out after %ss", self.timeout_seconds)
            raise LLMError(f"LLM request timed out after {self.timeout_seconds}s", original_error=exc)
        except httpx.RequestError as exc:
            safe_err = str(exc).replace(clean_api_key, "[REDACTED]")
            logger.error("Gemini request network error: %s", safe_err)
            raise LLMProviderUnavailableError(f"LLM network communication failed: {safe_err}", original_error=exc)
        except LLMError:
            raise
        except Exception as exc:
            safe_err = str(exc).replace(clean_api_key, "[REDACTED]")
            logger.error("Unexpected error in Gemini generation: %s", safe_err)
            raise LLMError(f"Unexpected error during LLM generation: {safe_err}", original_error=exc)


class DeterministicGroundingLLMClient(BaseLLMClient):
    """
    Deterministic factual extractor and summarizer used when external LLM
    credentials are absent or for offline test verification.
    Extracts statements strictly from structured context blocks.
    """

    @property
    def provider_name(self) -> str:
        return "deterministic-grounding-engine"

    def is_available(self) -> bool:
        return True

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        """
        Synthesizes a grounded answer strictly from the structured context.
        """
        # Look for structured Context marker in prompt
        context_match = re.search(r"=== CONTEXT FROM VERIFIED DOCUMENTS ===\s*(.*?)\s*=== END OF CONTEXT ===", prompt, re.DOTALL)
        if not context_match:
            # Check if there is raw context text
            context_text = prompt
        else:
            context_text = context_match.group(1).strip()

        if not context_text or "No matching documents found" in context_text:
            return "The available company documentation does not provide enough information to answer this question."

        # Extract source chunks
        source_blocks = re.findall(
            r"\[Source\s+(\d+)\]\s*\((.*?)\)\s*\n(.*?)(?=(?:\[Source\s+\d+\]|=== END OF CONTEXT ===|$))",
            context_text,
            re.DOTALL,
        )

        if not source_blocks:
            # If plain text context
            cleaned_lines = [
                l.strip()
                for l in context_text.splitlines()
                if l.strip() and not l.startswith("===") and not l.startswith("---")
            ]
            if not cleaned_lines:
                return "The available company documentation does not provide enough information to answer this question."
            return "Based on company documentation:\n" + "\n".join(cleaned_lines[:5])

        # Synthesize points from source blocks
        extracted_points: List[str] = []
        for idx_str, meta_info, chunk_content in source_blocks:
            clean_chunk = chunk_content.strip()
            lines = [l.strip() for l in clean_chunk.splitlines() if l.strip()]
            for line in lines[:2]:
                if len(line) > 15 and line not in extracted_points:
                    extracted_points.append(f"• {line} [Source {idx_str}]")

        if not extracted_points:
            return "The available company documentation does not provide enough information to answer this question."

        header = "Based on company documentation:\n"
        return header + "\n".join(extracted_points[:6])


_global_llm_client: Optional[BaseLLMClient] = None


def get_llm_client(force_gemini: bool = False, force_deterministic: bool = False) -> BaseLLMClient:
    """
    Obtain the configured LLM client instance.
    If Gemini API key is configured and available, returns GeminiLLMClient;
    otherwise gracefully falls back to DeterministicGroundingLLMClient.
    """
    global _global_llm_client

    if force_deterministic:
        return DeterministicGroundingLLMClient()

    if force_gemini:
        return GeminiLLMClient()

    if _global_llm_client is None:
        raw_key = (settings.GEMINI_API_KEY or "").strip()
        if raw_key and not raw_key.startswith("your_"):
            logger.info("Initializing Gemini LLM provider")
            _global_llm_client = GeminiLLMClient()
        else:
            logger.info("GEMINI_API_KEY not set or is placeholder; using deterministic grounding engine")
            _global_llm_client = DeterministicGroundingLLMClient()

    return _global_llm_client
