# Detailed Implementation Order

This document breaks the entire Enterprise AI Knowledge Management Platform down into extremely granular, single-objective phases. Each phase is designed to take 30-90 minutes and ends with a pause for review.

---

## Phase 1
- **Objective**: Backend Scaffolding & Environment Setup
- **Why it comes now**: We must establish the base Express server before writing any logic.
- **Files to create**: `backend/src/server.js`, `backend/src/app.js`, `backend/.env`, `backend/package.json`
- **Files to modify**: None
- **APIs involved**: None
- **Database models involved**: None
- **AI components involved**: None
- **Dependencies**: `express`, `cors`, `dotenv`, `helmet`
- **Expected output**: A running Express server on port 5000 that responds to a health check (`/health`).
- **Testing checklist**: 
  - [ ] Server starts without errors.
  - [ ] Health check endpoint returns 200 OK.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 2
- **Objective**: MongoDB Connection & Global Error Handling
- **Why it comes now**: A reliable database connection and centralized error catching must exist before creating models or routes.
- **Files to create**: `backend/src/config/db.js`, `backend/src/middlewares/errorHandler.js`
- **Files to modify**: `backend/src/app.js`
- **APIs involved**: None
- **Database models involved**: None
- **AI components involved**: None
- **Dependencies**: `mongoose`
- **Expected output**: Server successfully connects to MongoDB and handles uncaught exceptions gracefully.
- **Testing checklist**: 
  - [ ] DB connection log appears on startup.
  - [ ] Throwing a mock error returns a formatted JSON error response.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 3
- **Objective**: Tenant & Identity Database Models
- **Why it comes now**: Core data schemas are required to handle multi-tenancy and users.
- **Files to create**: `models/Company.js`, `models/Department.js`, `models/Permission.js`, `models/Role.js`, `models/User.js`
- **Files to modify**: None
- **APIs involved**: None
- **Database models involved**: Company, Department, Permission, Role, User
- **AI components involved**: None
- **Dependencies**: `mongoose`, `bcrypt`
- **Expected output**: Mongoose schemas compiled without errors, with proper indexes and virtuals.
- **Testing checklist**: 
  - [ ] Models import successfully into the app.
  - [ ] Pre-save hooks for passwords (bcrypt) are in place.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 4
- **Objective**: Content & Logging Database Models
- **Why it comes now**: The remaining schemas for documents, RAG chat, and security auditing must be established.
- **Files to create**: `models/Document.js`, `models/ChatSession.js`, `models/ChatMessage.js`, `models/AuditLog.js`, `models/RefreshToken.js`
- **Files to modify**: None
- **APIs involved**: None
- **Database models involved**: Document, ChatSession, ChatMessage, AuditLog, RefreshToken
- **AI components involved**: None
- **Dependencies**: `mongoose`
- **Expected output**: Remaining Mongoose schemas compiled and ready.
- **Testing checklist**: 
  - [ ] TTL indexes for RefreshTokens and AuditLogs correctly defined.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 5
- **Objective**: Base Repository for Tenant Isolation
- **Why it comes now**: We must ensure no developer can accidentally query data without `companyId` filtering.
- **Files to create**: `backend/src/repositories/BaseRepository.js`
- **Files to modify**: None
- **APIs involved**: None
- **Database models involved**: All
- **AI components involved**: None
- **Dependencies**: None
- **Expected output**: A reusable class with `find`, `findOne`, `create`, `update` that strictly injects `{ companyId }` into queries.
- **Testing checklist**: 
  - [ ] Class instantiation works.
  - [ ] Code review confirms `companyId` is hard-merged into filters.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 6
- **Objective**: System Seeders
- **Why it comes now**: We need an initial Company, Admin User, and default Permissions to actually test authentication.
- **Files to create**: `backend/src/seeders/runSeeder.js`, `backend/src/seeders/data.js`
- **Files to modify**: `backend/package.json` (add seed script)
- **APIs involved**: None
- **Database models involved**: Company, Role, Permission, User
- **AI components involved**: None
- **Dependencies**: None
- **Expected output**: Running `npm run seed` populates the database with 1 admin, 1 company, and default permissions.
- **Testing checklist**: 
  - [ ] Database contains the seeded data.
  - [ ] Passwords are hashed.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 7
- **Objective**: Authentication Service & Login API
- **Why it comes now**: We need to authenticate our seeded admin to test the rest of the application.
- **Files to create**: `services/AuthService.js`, `controllers/AuthController.js`, `routes/authRoutes.js`, `middlewares/validateSchema.js`, `validators/authValidators.js`
- **Files to modify**: `app.js` (mount routes)
- **APIs involved**: `POST /api/v1/auth/login`
- **Database models involved**: User, RefreshToken
- **AI components involved**: None
- **Dependencies**: `jsonwebtoken`, `joi`, `cookie-parser`
- **Expected output**: Working login endpoint that returns an Access Token and sets an HttpOnly Refresh Token cookie.
- **Testing checklist**: 
  - [ ] Correct credentials return tokens.
  - [ ] Incorrect credentials return 401.
  - [ ] Refresh token is saved in DB.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 8
- **Objective**: RBAC & Tenant Isolation Middlewares
- **Why it comes now**: Before creating business APIs (like uploading documents), we must protect them with our security model.
- **Files to create**: `middlewares/authenticate.js`, `middlewares/authorize.js`, `middlewares/tenantIsolation.js`
- **Files to modify**: None
- **APIs involved**: All protected APIs
- **Database models involved**: User, Role
- **AI components involved**: None
- **Dependencies**: `jsonwebtoken`
- **Expected output**: Middlewares that reject requests lacking valid JWTs or correct permissions.
- **Testing checklist**: 
  - [ ] Missing token returns 401.
  - [ ] Valid token injects `req.user` and `req.companyId`.
  - [ ] Missing permission returns 403 Forbidden.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 9
- **Objective**: Storage Service Abstraction
- **Why it comes now**: We must implement local storage to accept document uploads in the next phase.
- **Files to create**: `providers/StorageService.js`, `providers/LocalStorageProvider.js`, `config/storage.js`
- **Files to modify**: None
- **APIs involved**: None
- **Database models involved**: None
- **AI components involved**: None
- **Dependencies**: `fs`, `path`
- **Expected output**: A unified `storageProvider.upload()` method that saves to a Docker-compatible volume directory.
- **Testing checklist**: 
  - [ ] Provider successfully writes a test string to disk and returns the path.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 10
- **Objective**: Document Upload API
- **Why it comes now**: Users need to upload files so the AI can process them.
- **Files to create**: `routes/documentRoutes.js`, `controllers/DocumentController.js`, `services/DocumentService.js`, `middlewares/upload.js`
- **Files to modify**: `app.js`
- **APIs involved**: `POST /api/v1/documents/upload`
- **Database models involved**: Document
- **AI components involved**: None
- **Dependencies**: `multer`, `uuid`
- **Expected output**: File uploads save to disk and create a `pending` document record in MongoDB.
- **Testing checklist**: 
  - [ ] Uploading a PDF saves to DB with status `pending`.
  - [ ] Exceeding max size returns 400.
  - [ ] Invalid MIME type returns 400.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 11
- **Objective**: AI Service Scaffolding
- **Why it comes now**: We have a backend that stores files; now we need the Python service to read and analyze them.
- **Files to create**: `ai-service/main.py`, `ai-service/requirements.txt`, `ai-service/src/api/routes.py`
- **Files to modify**: None
- **APIs involved**: Internal `GET /health` on Python server
- **Database models involved**: None
- **AI components involved**: FastAPI setup
- **Dependencies**: `fastapi`, `uvicorn`, `pydantic`
- **Expected output**: A running FastAPI server on port 8000.
- **Testing checklist**: 
  - [ ] FastAPI boots successfully.
  - [ ] Localhost:8000/docs shows Swagger UI.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 12
- **Objective**: Document Text Extraction
- **Why it comes now**: The AI needs raw text to run its intelligence pipeline.
- **Files to create**: `ai-service/src/extractors/base.py`, `ai-service/src/extractors/pdf_extractor.py`, `ai-service/src/extractors/factory.py`
- **Files to modify**: None
- **APIs involved**: None
- **Database models involved**: None
- **AI components involved**: Text Extraction
- **Dependencies**: `pdfplumber` (or `PyPDF2`)
- **Expected output**: A python function that takes a file path and returns clean text.
- **Testing checklist**: 
  - [ ] Extracts text from a sample PDF successfully.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 13
- **Objective**: AI Document Intelligence Service
- **Why it comes now**: We must auto-generate metadata before vectorizing the document.
- **Files to create**: `ai-service/src/classifiers/document_intelligence.py`, `ai-service/src/llm/client.py`
- **Files to modify**: `ai-service/src/api/routes.py`
- **APIs involved**: Internal `POST /ai/analyze`
- **Database models involved**: None
- **AI components involved**: LLM Prompting, JSON Parsing
- **Dependencies**: `langchain`, `google-generativeai` (or OpenAI)
- **Expected output**: LLM analyzes text and returns JSON with category, tags, and summary.
- **Testing checklist**: 
  - [ ] Calling the endpoint with text returns valid JSON metadata.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 14
- **Objective**: Admin Review Endpoints
- **Why it comes now**: Admins must approve the AI's suggestions before they are indexed.
- **Files to create**: None
- **Files to modify**: `controllers/DocumentController.js`, `routes/documentRoutes.js`
- **APIs involved**: `GET /api/v1/documents/pending`, `PUT /api/v1/documents/:id/review`
- **Database models involved**: Document
- **AI components involved**: None
- **Dependencies**: None
- **Expected output**: Admins can fetch pending documents and approve them (changing status to `approved`).
- **Testing checklist**: 
  - [ ] Admin can fetch the pending document.
  - [ ] Approving updates the DB status successfully.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 15
- **Objective**: Vector Database Setup & Embedding
- **Why it comes now**: Approved documents must be indexed for semantic search.
- **Files to create**: `ai-service/src/vectorstore/chroma_client.py`, `ai-service/src/embeddings/generator.py`
- **Files to modify**: `ai-service/src/api/routes.py`
- **APIs involved**: Internal `POST /ai/embed`
- **Database models involved**: Document
- **AI components involved**: ChromaDB, SentenceTransformers
- **Dependencies**: `chromadb`, `sentence-transformers`
- **Expected output**: Approved documents are chunked, embedded, and saved in a Chroma collection named `company_{id}`.
- **Testing checklist**: 
  - [ ] Endpoint successfully stores embeddings.
  - [ ] Collection count increases.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 16
- **Objective**: RAG Authorization Filter
- **Why it comes now**: We must ensure users only retrieve vectors they are permitted to see.
- **Files to create**: `backend/src/services/RAGPipelineService.js`
- **Files to modify**: None
- **APIs involved**: None
- **Database models involved**: User, Department, Role
- **AI components involved**: None
- **Dependencies**: None
- **Expected output**: A JS function that looks at `req.user` and builds a JSON filter object for ChromaDB (e.g. `{ "departmentId": { "$in": [...] } }`).
- **Testing checklist**: 
  - [ ] Correct filters generated based on mock user roles.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 17
- **Objective**: RAG Retrieve & Generate (Chat API)
- **Why it comes now**: The core feature of the platform. Bringing together user intent, vector search, and LLM generation.
- **Files to create**: `ai-service/src/retrievers/rag_search.py`, `backend/src/controllers/ChatController.js`, `backend/src/routes/chatRoutes.js`
- **Files to modify**: `app.js`
- **APIs involved**: `POST /api/v1/chat`
- **Database models involved**: ChatSession, ChatMessage
- **AI components involved**: RAG, LLM Context Injection
- **Dependencies**: None
- **Expected output**: User asks a question -> Backend builds Auth filter -> AI queries ChromaDB -> LLM answers using context -> Saves to MongoDB -> Returns to user.
- **Testing checklist**: 
  - [ ] Chat endpoint returns answer with citations.
  - [ ] Unauthorized docs are completely ignored by the AI.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 18
- **Objective**: Audit Logging Implementation
- **Why it comes now**: Security compliance requires all core actions (Upload, Chat, Approve) to be tracked.
- **Files to create**: `backend/src/services/AuditService.js`
- **Files to modify**: `DocumentController.js`, `ChatController.js`, `AuthController.js`
- **APIs involved**: All core APIs
- **Database models involved**: AuditLog
- **AI components involved**: None
- **Dependencies**: None
- **Expected output**: DB automatically records logins, uploads, and queries.
- **Testing checklist**: 
  - [ ] `auditLogs` collection populates automatically when actions occur.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 19
- **Objective**: Frontend Vite + React Setup
- **Why it comes now**: The backend is functional; we must port the static HTML into a working SPA.
- **Files to create**: React scaffolding inside `frontend/`
- **Files to modify**: None
- **APIs involved**: None
- **Database models involved**: None
- **AI components involved**: None
- **Dependencies**: `vite`, `react`, `react-router-dom`, `tailwindcss`, `axios`
- **Expected output**: A running React dev server containing the base Tailwind configuration from the HTML.
- **Testing checklist**: 
  - [ ] `npm run dev` works.
  - [ ] Tailwind styles apply correctly.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 20
- **Objective**: Frontend Axios & Auth Context
- **Why it comes now**: The frontend must handle JWT tokens before any secure pages can be rendered.
- **Files to create**: `frontend/src/context/AuthContext.jsx`, `frontend/src/api/axios.js`
- **Files to modify**: `frontend/src/App.jsx`
- **APIs involved**: `/api/v1/auth/refresh-token`
- **Database models involved**: None
- **AI components involved**: None
- **Dependencies**: `axios`, `react-router-dom`
- **Expected output**: Axios automatically attaches Bearer tokens and handles 401 retries.
- **Testing checklist**: 
  - [ ] Mock login saves token to state.
  - [ ] 401 triggers refresh automatically.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 21
- **Objective**: Frontend Login & Protected Routes
- **Why it comes now**: Users must be able to log in to access the rest of the application.
- **Files to create**: `frontend/src/pages/Login.jsx`, `frontend/src/components/ProtectedRoute.jsx`
- **Files to modify**: `App.jsx`
- **APIs involved**: `POST /api/v1/auth/login`
- **Database models involved**: None
- **AI components involved**: None
- **Dependencies**: None
- **Expected output**: The static Login HTML is now a functional React component tied to our backend API.
- **Testing checklist**: 
  - [ ] Successful login redirects to Dashboard.
  - [ ] Unauthenticated access to `/dashboard` redirects to `/login`.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 22
- **Objective**: Frontend Knowledge Library & Upload
- **Why it comes now**: We need the UI to view documents and trigger uploads.
- **Files to create**: `frontend/src/pages/KnowledgeLibrary.jsx`, `frontend/src/pages/Upload.jsx`
- **Files to modify**: `App.jsx`
- **APIs involved**: `GET /api/v1/documents`, `POST /api/v1/documents/upload`
- **Database models involved**: None
- **AI components involved**: None
- **Dependencies**: None
- **Expected output**: The static Library and Upload HTML are functional React pages fetching real data.
- **Testing checklist**: 
  - [ ] Document list renders real data.
  - [ ] Uploading a file hits the backend and shows success toast.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 23
- **Objective**: Frontend AI Chat Integration
- **Why it comes now**: We need to connect the user-facing chat UI to the RAG pipeline.
- **Files to create**: `frontend/src/pages/Chat.jsx`, `frontend/src/components/ChatBubble.jsx`
- **Files to modify**: `App.jsx`
- **APIs involved**: `POST /api/v1/chat`
- **Database models involved**: None
- **AI components involved**: LLM Responses, Citations
- **Dependencies**: None
- **Expected output**: A working chat interface where users can ask questions and see AI responses with source citations.
- **Testing checklist**: 
  - [ ] Sending a message shows a loading state.
  - [ ] AI response is appended to the UI.
  - [ ] Citations are clickable.
- **STOP AND WAIT FOR APPROVAL**

---

## Phase 24
- **Objective**: Docker Integration & E2E Verification
- **Why it comes now**: We must prove the entire platform runs flawlessly in the isolated containerized environment.
- **Files to create**: `frontend/Dockerfile`, `backend/Dockerfile`, `ai-service/Dockerfile`, `docker-compose.yml`
- **Files to modify**: None
- **APIs involved**: All
- **Database models involved**: All
- **AI components involved**: All
- **Dependencies**: Docker
- **Expected output**: Running `docker compose up` starts all 5 services seamlessly.
- **Testing checklist**: 
  - [ ] No container crash loops.
  - [ ] Frontend can communicate with Backend via internal routing/proxy.
- **STOP AND WAIT FOR APPROVAL**
