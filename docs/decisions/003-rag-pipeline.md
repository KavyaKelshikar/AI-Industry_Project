# Architecture Decision Record: 003 RAG Pipeline

## Context
Retrieval-Augmented Generation (RAG) is prone to data leakage if the vector search retrieves documents the user shouldn't see. Filtering results *after* retrieval wastes LLM context windows and can still leak data.

## Decision
Authorization is strictly enforced **before** vector retrieval using ChromaDB metadata filtering.
1. The Node.js backend calculates the exact department IDs and classifications the user is allowed to see.
2. It sends this as an explicit filter to the AI Service.
3. The AI Service uses ChromaDB's `where` clause to physically exclude unauthorized chunks from the similarity search.

## Consequences
- **Positive**: Zero chance of data leakage to unauthorized users. The LLM never sees restricted data.
- **Positive**: Faster vector searches because the search space is narrowed by metadata.
- **Negative**: ChromaDB metadata schemas must perfectly align with MongoDB authorization schemas.
