# AI Architecture

The AI Service is a dedicated Python FastAPI microservice responsible for document intelligence, embedding generation, and Retrieval-Augmented Generation (RAG).

## Document Processing & Ingestion Foundation
The `document_processing` package provides modular extractors, text cleaning, and deterministic chunking.

### Extractors (`src/document_processing/`)
- **Common Interface**: `BaseExtractor` defines standard `extract(file_path)` returning structured `ExtractedDocument` and `ExtractedUnit` objects with source provenance.
- **Supported Formats**:
  - `PDFExtractor` (`pdf_extractor.py`): Uses PyMuPDF (`fitz`) to extract text with 1-indexed page provenance.
  - `DOCXExtractor` (`docx_extractor.py`): Uses `python-docx` to extract structured paragraphs and tables with position tracking.
  - `TXTExtractor` (`txt_extractor.py`): Reads UTF-8 plain text with fallback encoding support (`latin-1`, `cp1252`).
- **Resolver**: `get_extractor(file_path_or_extension)` routes requests by extension and raises `UnsupportedFileTypeError` for unhandled types.

### Text Cleaner (`src/document_processing/cleaner.py`)
- Normalizes unicode whitespace, collapses multi-spaces and tabs, normalizes line endings (`\n`), and standardizes paragraph boundaries (`\n\n`) without destroying punctuation, numeric data, or semantic meaning.

### Deterministic Chunker (`src/document_processing/chunker.py`)
- **Model**: `DocumentChunk` with `to_metadata()` generating Phase 4.6 `DocumentChunkMetadata`.
- **Configurable**: Configured via `CHUNK_SIZE` (default: 500) and `CHUNK_OVERLAP` (default: 100).
- **Deterministic IDs**: Generates `{documentId}_c{index}_{hash}` to ensure repeatable identifiers.
- **Boundary-Aware**: Splits text respecting paragraph, sentence, and word boundaries.

## End-to-End Vector Ingestion Pipeline
The `ingestion` package (`src/ingestion/`) orchestrates the complete flow from raw files to tenant-isolated vector persistence:

1. **API Ingestion Endpoint (`POST /api/v1/ingest`)**:
   - Accepts validated JSON payload (`file_path`, `document_id`, `company_id`, optional `department_id`, `classification`, `category`, `source`).
   - Resolves extractor for PDF, DOCX, or TXT via `get_extractor()`.
   - Cleans text and splits into deterministic chunks with page/paragraph provenance.
   - Computes 384-dim SentenceTransformers embeddings via the configured `BaseEmbeddingService`.
   - Persists vectors and metadata into the company collection (`company_{company_id}`) via `collection.upsert()`. Re-ingestion updates existing vectors without duplicating records.
   - Returns telemetry: `chunks_count`, `vectors_stored`, `embedding_model`, `status`, `duration_ms`.

2. **Vector Deletion Endpoint (`DELETE /api/v1/vectors/{company_id}/{document_id}`)**:
   - Purges all vector chunks matching `documentId` within the tenant's collection `company_{company_id}` using `collection.delete(where={"documentId": document_id})`.
   - Idempotent: returns `vectors_deleted` and does not error if no vectors exist for the specified document.

3. **Strict Tenant Security**: `company_id` is strictly validated and enforced on every chunk and vector payload; ingestion fails immediately if tenant identity is missing.

## Vector Retrieval Foundation
The `retrieval` package (`src/retrieval/`) provides tenant-isolated semantic search:

1. **Query Embedding**: Natural language query is converted to an embedding vector via `BaseEmbeddingService.embed_query()`.
2. **Strict Tenant Scoping**: Requires `companyId` for every search request, targeting `company_{companyId}` collection with mandatory `companyId` `$eq` metadata filter.
3. **Metadata Filtering**: Supports optional scoping by `departmentId`, `classification`, `category`, and `documentId`. Unrestricted searches query across all company documents.
4. **Scoring & Thresholding**: Returns ranked `RetrievedChunk` objects with raw distance and normalized similarity scores (`0.0` to `1.0`), supporting configurable `DEFAULT_TOP_K` and `DEFAULT_SIMILARITY_THRESHOLD`.
5. **Clean Zero-Match Handling**: Non-existent collections or zero-match queries return empty `RetrievalResult` objects without throwing unhandled exceptions.

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

### ChromaDB Connection & Collection Management (AI Service)
- **Client Module**: `ai-service/src/vectorstore/chroma_client.py`
  - Singleton `chromadb.HttpClient` lazily initialised from `CHROMADB_HOST` / `CHROMADB_PORT` environment variables via `get_chroma_client()`.
  - Heartbeat verification via `verify_chroma_connection()`.
- **Collection Management**: `ai-service/src/vectorstore/collection_manager.py`
  - `CollectionManager` repository service providing idempotent collection creation/retrieval via `get_or_create_collection()` and `get_or_create_company_collection()`.
  - Collection existence checks (`collection_exists`), metadata inspection (`get_collection_info`), and count reporting (`get_collection_count`).
  - Strict tenant collection naming convention: `company_{companyId}`.
- **Document Chunk Metadata Schema**: `ai-service/src/vectorstore/metadata.py`
  - `DocumentChunkMetadata`: Strongly-typed Pydantic model enforcing `documentId`, `companyId`, `chunkId`, optional `departmentId`, `source`, `page`, `chunkIndex`, `classification`, and `category`.
  - `to_chroma_metadata()`: Sanitizes metadata to flat ChromaDB-compatible primitive scalar types (`str`, `int`, `float`, `bool`).
  - `build_tenant_filter()`: Enforces multi-tenant query isolation (`companyId` `$eq` clause merged with optional department, document, and classification filters).

## Embedding Service Architecture
- **Abstraction Module**: `ai-service/src/embeddings/base.py`
  - `BaseEmbeddingService` interface defining `embed_documents()`, `embed_query()`, `model_name`, `dimension`, and ChromaDB embedding function adapters.
- **Providers**:
  - `ChromaDefaultEmbeddingService` (`ai-service/src/embeddings/chroma_default.py`): Built-in ONNX `all-MiniLM-L6-v2` (384-dim).
  - `MockEmbeddingService` (`ai-service/src/embeddings/mock.py`): Deterministic hashing-based vector generator for fast, isolated unit testing without ML model downloads.
- **Factory**: `ai-service/src/embeddings/factory.py`
  - `get_embedding_service(provider, model_name)`: Environment-driven provider resolution via `EMBEDDING_PROVIDER` and `EMBEDDING_MODEL` settings.

## Future AI Roadmap
The architecture is modularized to support future additions:
- **OCR**: Adding `TesseractExtractor` to the `ExtractorFactory`.
- **Multiple LLMs**: The `LLMService` is abstracted to easily swap Gemini for OpenAI, Groq, or local Ollama models.
- **Knowledge Graphs**: Future integration points in the `retrievers/` module.
