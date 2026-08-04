# Architecture Decision Record: 004 Document Intelligence

## Context
Organizing enterprise documents requires high-quality metadata (tags, categories, summaries). Relying on humans to manually input this data leads to incomplete metadata, which severely degrades the quality of RAG search results.

## Decision
We introduced an **AI Document Intelligence Pipeline** prior to vector embedding.
1. Uploaded documents have their text extracted.
2. An LLM analyzes the text and predicts metadata (category, department, classification, tags, summary).
3. These suggestions are held in a `pending_review` state.
4. An Administrator reviews, edits, and approves the metadata.
5. Only after approval are the embeddings generated and indexed.

## Consequences
- **Positive**: Ensures high-quality, consistent metadata across the platform.
- **Positive**: Acts as a major differentiator for the project, showcasing advanced AI workflow orchestration.
- **Positive**: Human-in-the-loop ensures the AI doesn't misclassify sensitive documents.
- **Negative**: Document availability is delayed until an admin approves it.
