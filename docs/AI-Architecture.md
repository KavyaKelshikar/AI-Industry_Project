# AI Architecture

The AI Service is a dedicated Python FastAPI microservice responsible for document intelligence, embedding generation, and Retrieval-Augmented Generation (RAG).

## AI Document Intelligence Pipeline

Before generating embeddings, the AI analyzes the document to assist administrators in organizing knowledge.

1. **Extraction**: The `ExtractorFactory` uses file-specific libraries (`pdfplumber`, `python-docx`, etc.) to extract raw text.
2. **Analysis**: The text (first ~3000 chars) is sent to an LLM with a specific JSON-output prompt.
3. **Predictions**: The LLM predicts:
   - Document Category (Policy, SOP, Manual, etc.)
   - Suggested Department ID
   - Suggested Classification (Public, Internal, Confidential)
   - Relevant Tags
   - Short Summary
4. **Admin Review**: These suggestions are saved in MongoDB. The document waits in a `pending_review` queue.
5. **Approval**: An admin reviews, edits, and approves the metadata.
6. **Processing**: Once approved, the document is chunked, embedded, and stored in ChromaDB.

## RAG Pipeline (Retrieval-Augmented Generation)

1. **Filter Construction**: The Node.js backend constructs a metadata filter based on the user's department and role (e.g., `{"classification": {"$in": ["public", "internal"]}}`).
2. **Semantic Search**: The AI Service embeds the user's question and queries ChromaDB using the backend's authorization filter.
3. **Context Assembly**: Top-K chunks (default: 5) exceeding the relevance threshold (e.g., 0.3) are retrieved.
4. **LLM Generation**: The system prompt forces the LLM to answer **ONLY** using the provided chunks.
5. **Citations**: The response is returned alongside the exact source chunks and filenames for verification.

## Vector Database (ChromaDB)
- **Collections**: One collection per company (`company_{companyId}`).
- **Embeddings**: `all-MiniLM-L6-v2` via `SentenceTransformers` (local, fast, free).
- **Metadata Security**: ChromaDB metadata only stores IDs (`companyId`, `departmentId`, `documentId`). No readable business names are stored in the vector database to prevent data leakage.

## Future AI Roadmap
The architecture is modularized to support future additions:
- **OCR**: Adding `TesseractExtractor` to the `ExtractorFactory`.
- **Multiple LLMs**: The `LLMService` is abstracted to easily swap Gemini for OpenAI, Groq, or local Ollama models.
- **Knowledge Graphs**: Future integration points in the `retrievers/` module.
