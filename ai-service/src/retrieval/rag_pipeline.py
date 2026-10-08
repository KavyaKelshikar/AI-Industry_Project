"""
Enterprise RAG Pipeline Orchestrator.
Coordinates vector similarity retrieval, tenant isolation, prompt construction,
and LLM synthesis with grounded source citations.
"""

import logging
import time
from typing import Any, Dict, List, Optional, Union

from src.llm.client import BaseLLMClient, get_llm_client
from src.prompts.rag_prompts import build_rag_prompt
from src.retrieval.exceptions import RetrievalError, RetrievalSecurityError
from src.retrieval.models import (
    ChatMessageItem,
    RAGChatRequest,
    RAGQueryRequest,
    RAGResponse,
    RetrievedChunk,
    SourceCitation,
)
from src.retrieval.retriever import VectorRetriever, get_vector_retriever

logger = logging.getLogger(__name__)

NO_INFO_PHRASE = "The available company documentation does not provide enough information to answer this question."


class RAGPipeline:
    """
    Orchestrates the complete RAG lifecycle:
    Query -> Tenant Retrieval -> Context Formulation -> LLM Grounding -> Citations.
    """

    def __init__(
        self,
        retriever: Optional[VectorRetriever] = None,
        llm_client: Optional[BaseLLMClient] = None,
    ):
        self._retriever = retriever
        self._llm_client = llm_client

    @property
    def retriever(self) -> VectorRetriever:
        if self._retriever is None:
            self._retriever = get_vector_retriever()
        return self._retriever

    @property
    def llm_client(self) -> BaseLLMClient:
        if self._llm_client is None:
            self._llm_client = get_llm_client()
        return self._llm_client

    def execute_rag(
        self,
        query: str,
        company_id: str,
        department_id: Optional[str] = None,
        classification: Optional[Union[str, List[str]]] = None,
        category: Optional[str] = None,
        top_k: int = 5,
        chat_history: Optional[List[Union[ChatMessageItem, Dict[str, Any]]]] = None,
        score_threshold: Optional[float] = None,
    ) -> RAGResponse:
        """
        Execute an end-to-end RAG query against the tenant's vector database.
        """
        start_time = time.perf_counter()

        if not company_id or not str(company_id).strip():
            raise RetrievalSecurityError("company_id is strictly required for RAG operations")

        clean_company_id = str(company_id).strip()
        clean_query = str(query).strip() if query else ""

        if not clean_query:
            raise RetrievalError("Query string cannot be empty")

        bounded_top_k = max(1, min(20, top_k or 5))

        logger.info(
            "Executing RAG pipeline for tenant '%s', top_k=%s: '%s'",
            clean_company_id,
            bounded_top_k,
            clean_query,
        )

        # 1. Vector Retrieval via Tenant-Isolated Retriever
        retrieval_result = self.retriever.retrieve(
            query=clean_query,
            company_id=clean_company_id,
            department_id=department_id,
            classification=classification,
            category=category,
            top_k=bounded_top_k,
            score_threshold=score_threshold,
        )

        chunks = retrieval_result.chunks

        # 2. Handle Zero or Irrelevant Results Cleanly
        if not chunks:
            logger.info("No matching chunks found for query in tenant '%s'", clean_company_id)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return RAGResponse(
                query=clean_query,
                company_id=clean_company_id,
                answer=NO_INFO_PHRASE,
                sources=[],
                retrieved_count=0,
                duration_ms=elapsed_ms,
                llm_provider=self.llm_client.provider_name,
                grounded=False,
                metadata={
                    "retrieval_ms": retrieval_result.duration_ms,
                    "embedding_model": retrieval_result.embedding_model,
                },
            )

        # 3. Format Source Citations
        citations: List[SourceCitation] = []
        for c in chunks:
            # Create a concise snippet if chunk is long
            snippet_text = c.text.strip()
            if len(snippet_text) > 300:
                snippet_text = snippet_text[:297] + "..."

            citation = SourceCitation(
                documentId=c.documentId,
                source=c.source,
                snippet=snippet_text,
                similarity=c.similarity,
                page=c.page,
                chunkIndex=c.chunkIndex,
                classification=c.classification,
                category=c.category,
                departmentId=c.departmentId,
            )
            citations.append(citation)

        # 4. Assemble Grounding Prompts
        history_dicts = []
        if chat_history:
            for item in chat_history:
                if isinstance(item, ChatMessageItem):
                    history_dicts.append({"role": item.role, "content": item.content})
                elif isinstance(item, dict):
                    history_dicts.append(item)

        system_prompt, user_prompt = build_rag_prompt(
            query=clean_query,
            chunks=chunks,
            chat_history=history_dicts,
        )

        # 5. LLM Answer Synthesis
        try:
            raw_answer = self.llm_client.generate(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.1,  # Low temperature for factual precision
                max_tokens=1024,
            )
        except Exception as exc:
            logger.error("LLM generation failed: %s", exc)
            # Graceful fallback: synthesize directly using deterministic extractor
            from src.llm.client import DeterministicGroundingLLMClient
            fallback_client = DeterministicGroundingLLMClient()
            raw_answer = fallback_client.generate(
                prompt=user_prompt,
                system_prompt=system_prompt,
            )

        clean_answer = raw_answer.strip() if raw_answer else NO_INFO_PHRASE
        is_grounded = NO_INFO_PHRASE.lower() not in clean_answer.lower()

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return RAGResponse(
            query=clean_query,
            company_id=clean_company_id,
            answer=clean_answer,
            sources=citations if is_grounded else [],
            retrieved_count=len(chunks),
            duration_ms=elapsed_ms,
            llm_provider=self.llm_client.provider_name,
            grounded=is_grounded,
            metadata={
                "retrieval_ms": retrieval_result.duration_ms,
                "embedding_model": retrieval_result.embedding_model,
                "chunks_evaluated": len(chunks),
            },
        )


_rag_pipeline: Optional[RAGPipeline] = None


def get_rag_pipeline(
    retriever: Optional[VectorRetriever] = None,
    llm_client: Optional[BaseLLMClient] = None,
) -> RAGPipeline:
    """
    Obtain or instantiate a singleton RAGPipeline.
    """
    global _rag_pipeline
    if any(x is not None for x in (retriever, llm_client)):
        return RAGPipeline(retriever=retriever, llm_client=llm_client)
    if _rag_pipeline is None:
        _rag_pipeline = RAGPipeline()
    return _rag_pipeline
