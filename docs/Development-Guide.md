# Development Guide

## Project Structure
The repository is a monorepo containing three main applications:
- `frontend/`: React + TypeScript (UI Layer)
- `backend/`: Node.js + Express (API & Business Logic Layer)
- `ai-service/`: Python + FastAPI (AI & Vector Search Layer)

## Coding Standards
- **Backend**: Use `const`/`let`, async/await, and arrow functions. Keep controllers thin; place business logic in `services/`. Always use the `BaseRepository` for database queries to ensure `companyId` isolation.
- **AI Service**: Use Python 3.11+ type hints. Use Pydantic models for request/response validation.
- **Frontend**: Functional components with hooks. Use Tailwind utility classes.

## Naming Conventions
- **Files**: CamelCase for classes/models (e.g., `UserService.js`, `User.js`), kebab-case for utilities (e.g., `token-utils.js`).
- **Variables/Functions**: camelCase.
- **Constants/Enums**: UPPER_SNAKE_CASE.

## How to Add New APIs (Backend)
1. Define the Joi validation schema in `validators/`.
2. Create/Update a service method in `services/`.
3. Create a controller method in `controllers/` to handle the request/response.
4. Add the route in `routes/` and attach middlewares (`authenticate`, `authorize`, `validate`).

## How to Add New AI Extractors
1. Navigate to `ai-service/src/extractors/`.
2. Create a new class extending `BaseExtractor`.
3. Implement the `extract_text(file_path)` method.
4. Register the new extractor in `ExtractorFactory`.

## Unified Development Startup
Run the single command from the project root to start all 5 services simultaneously:
```bash
npm run dev
# or
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```
This script:
1. Verifies Docker and boots MongoDB (`localhost:27017`) and ChromaDB (`localhost:8000`).
2. Launches Python AI Service FastAPI on `http://localhost:8002`.
3. Launches Node.js Express Backend on `http://localhost:5000`.
4. Launches React Vite Frontend on `http://localhost:5173`.
5. Probes aggregate health at `GET /api/v1/health` and renders a live status matrix.

## Running Tests
- **Backend Tests (Jest)**:
  ```bash
  npm test --prefix backend
  ```
- **AI Service Tests (Pytest)**:
  ```bash
  npm run test:ai
  # or
  powershell -Command "Set-Location 'ai-service'; & 'venv/Scripts/python.exe' -m pytest tests/ -v"
  ```
- **Live Authentication E2E Lifecycle**:
  ```bash
  node backend/tests/verify_auth_e2e.js
  ```
- **Live Employee Management E2E Lifecycle**:
  ```bash
  node backend/tests/verify_employee_e2e.js
  ```
- **Live Knowledge Source Management E2E Lifecycle**:
  ```bash
  node backend/tests/verify_knowledge_source_e2e.js
  ```
- **Live Document Ingestion & AI Vector Pipeline E2E Lifecycle**:
  ```bash
  node backend/tests/verify_document_processing_e2e.js
  ```

## Enterprise Knowledge Source Manager (Module 9)
The Knowledge Source Manager provides tenant-isolated, explicitly approved source management:
- **Approved Local Folders**: Paths are validated, resolved to real canonical paths, checked against protected/system directory patterns, and bound to a strict directory boundary. Traversal and symlink escapes are rejected.
- **Sync & Deduplication Lifecycle**: Sync engine discovers supported file types, computes SHA-256 content hashes, skips unchanged files, updates changed records, and creates new `Document` entries referencing `knowledgeSourceId`.
- **Connector Extensibility**: Extensible adapter interface (`BaseSourceAdapter`) allows future connectors (`google_drive`, `onedrive`, `s3`, etc.) to be integrated via `AdapterFactory`. Unimplemented connectors report `501 CONNECTOR_NOT_IMPLEMENTED`.
- **RBAC & Tenant Isolation**: All endpoints require `knowledge-sources:read|create|update|delete|sync|manage` permissions and derive tenant boundary from `req.tenantScope`.

## Document Ingestion & AI Vector Pipeline Engine (Module 10)
The Document Ingestion & AI Vector Pipeline operationalizes discovered or uploaded documents:
- **Secure File Path Resolution**: Client requests provide only the document ID. Backend reconstructs and verifies the full file path against `Tenant -> KnowledgeSource.approvedPath -> Document.sourceRelativePath` before sending to the AI Service.
- **AI Vector Ingestion Pipeline**: Ingestion endpoint (`POST /api/v1/ingest`) in FastAPI extracts raw text from PDF, DOCX, and TXT, normalizes whitespace, splits into chunks with page numbers, generates 384-dimensional SentenceTransformers embeddings (`all-MiniLM-L6-v2`), and upserts into ChromaDB collection `company_{company_id}`.
- **Dedicated Indexing Lifecycle**: Uses `indexingStatus: ['pending', 'processing', 'indexed', 'error']` alongside administrative `Document.status`.
- **Idempotency & Vector Cleanup**: Re-ingesting a document replaces outdated vector chunks. Document deletion triggers vector purge from ChromaDB via `DELETE /api/v1/vectors/{company_id}/{document_id}`.


