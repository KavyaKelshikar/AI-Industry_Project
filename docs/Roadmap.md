# Development Roadmap

The project is structured into 14 distinct phases. Each phase delivers a functional, testable module before moving to the next.

## Phase 1: Docker & Scaffolding
- Project structure creation
- `docker-compose.yml` configuration (5 containers)
- FastAPI and Express.js initial setup
- Environment variables and health checks

## Phase 2: Database, Models, Seeders
- MongoDB Mongoose connection
- 12 Collection Schemas defined
- `BaseRepository` with `companyId` enforcement
- RBAC seeders (system permissions, default roles)

## Phase 3: Authentication System
- Company registration
- JWT generation and refresh token rotation
- Bcrypt password hashing
- Forgot/Reset password flows

## Phase 4: Role + Permission System
- Custom Role creation
- Permission assignment mapping
- `authorize` middleware implementation

## Phase 5: Department Management
- Department CRUD
- Soft deletion and status toggles

## Phase 6: Employee Management
- User CRUD operations
- Email invitations flow
- Role and Department assignment

## Phase 7: Storage Service & File Upload
- `StorageService` interface definition
- `LocalStorageProvider` implementation
- Multer file upload validation (type, size limits)

## Phase 8: Document CRUD & Metadata
- Document upload and metadata saving
- Admin review endpoint for AI suggestions
- Document soft deletion and archival

## Phase 9: AI Service Foundation
- Extractor Factory pattern implementation (PDF, DOCX, XLSX, etc.)
- Python FastAPI modular folder structure setup
- SentenceTransformers embedding pipeline

## Phase 10: AI Document Intelligence Pipeline (Unique Feature)
- LLM Document analysis (Type, Dept, Class, Tags, Summary)
- Integration with Admin Review queue
- ChromaDB indexing post-approval

## Phase 11: RAG Query Pipeline
- 5-step Authorization filter construction
- ChromaDB metadata-filtered similarity search
- Context building and LLM prompt generation

## Phase 12: Chat System
- Chat session CRUD
- Message persistence with source citations
- History retrieval

## Phase 13: Audit Logging & Security
- `auditLogs` integration across all controllers
- Helmet, CORS, and Rate Limiting
- HTTP Parameter Pollution prevention

## Phase 14: Integration & Polish
- E2E testing
- Demo data seeder
- Final deployment configuration
