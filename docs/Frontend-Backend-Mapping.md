# Complete Frontend-to-Backend Implementation Blueprint

This document provides a precise mapping of every Stitch AI frontend page to the corresponding backend architecture required to power it. It serves as our implementation blueprint.

---

## 1. Login Page (stitch_industrial_knowledge_intelligence (2))

↓

**Required APIs**
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/forgot-password`

↓

**Required Controllers**
- `AuthController`

↓

**Required Services**
- `AuthService` (Password hashing, JWT generation)

↓

**Required Repositories**
- `UserRepository`, `RefreshTokenRepository`

↓

**Required Models**
- `User`, `RefreshToken`

↓

**Required AI Service**
- None

↓

**Required Middleware**
- `validateSchema(loginSchema)`

↓

**Database Collections Used**
- `users`, `refreshTokens`

↓

**Authorization Rules**
- Public endpoint (No JWT required)

↓

**Dependencies**
- `bcrypt`, `jsonwebtoken`, `joi`

---

## 2. Employee Dashboard (stitch_industrial_knowledge_intelligence)

↓

**Required APIs**
- `GET /api/v1/users/me` (Profile Data)
- `GET /api/v1/documents/recent` (Recent uploads)
- `GET /api/v1/chat/recent` (Recent chat sessions)

↓

**Required Controllers**
- `UserController`, `DashboardController`

↓

**Required Services**
- `UserService`, `DocumentService`, `ChatService`

↓

**Required Repositories**
- `UserRepository`, `DocumentRepository`, `ChatRepository`

↓

**Required Models**
- `User`, `Document`, `ChatSession`

↓

**Required AI Service**
- None directly on dashboard load

↓

**Required Middleware**
- `authenticate`, `tenantIsolation`

↓

**Database Collections Used**
- `users`, `documents`, `chatSessions`

↓

**Authorization Rules**
- Any authenticated user. `companyId` injection mandatory.

↓

**Dependencies**
- None specific

---

## 3. Admin Overview (stitch_industrial_knowledge_intelligence (1))

↓

**Required APIs**
- `GET /api/v1/admin/analytics` (Stats: Total Docs, AI Queries, User Activity)
- `GET /api/v1/audit-logs/recent`

↓

**Required Controllers**
- `AdminAnalyticsController`

↓

**Required Services**
- `AnalyticsService`

↓

**Required Repositories**
- `DocumentRepository`, `UserRepository`, `AuditLogRepository`

↓

**Required Models**
- `Document`, `User`, `AuditLog`

↓

**Required AI Service**
- None directly

↓

**Required Middleware**
- `authenticate`, `authorize('analytics:read')`, `tenantIsolation`

↓

**Database Collections Used**
- `documents`, `users`, `auditLogs`

↓

**Authorization Rules**
- Requires `analytics:read` permission in the user's assigned role.

↓

**Dependencies**
- MongoDB Aggregation Pipeline

---

## 4. Knowledge Library (stitch_industrial_knowledge_intelligence (8))

↓

**Required APIs**
- `GET /api/v1/documents` (Query params: search, category, department)
- `POST /api/v1/documents/:id/insights/generate`

↓

**Required Controllers**
- `DocumentController`

↓

**Required Services**
- `DocumentService`, `AIInsightService`

↓

**Required Repositories**
- `DocumentRepository`, `DepartmentRepository`

↓

**Required Models**
- `Document`, `Department`

↓

**Required AI Service**
- Document comparison/summarization endpoints (Python FastAPI)

↓

**Required Middleware**
- `authenticate`, `authorize('documents:read')`, `tenantIsolation`

↓

**Database Collections Used**
- `documents`, `departments`

↓

**Authorization Rules**
- User can only view documents classified for their department or public access level.

↓

**Dependencies**
- Axios (for internal Node → Python calls)

---

## 5. Upload Knowledge (stitch_industrial_knowledge_intelligence (5))

↓

**Required APIs**
- `POST /api/v1/documents/upload`

↓

**Required Controllers**
- `DocumentController`

↓

**Required Services**
- `StorageService` (Strategy Pattern), `DocumentProcessingService`

↓

**Required Repositories**
- `DocumentRepository`

↓

**Required Models**
- `Document`

↓

**Required AI Service**
- Triggers AI Document Intelligence Pipeline (Extraction → Classification → Summary)

↓

**Required Middleware**
- `authenticate`, `authorize('documents:upload')`, `tenantIsolation`, `uploadValidator` (Multer)

↓

**Database Collections Used**
- `documents`

↓

**Authorization Rules**
- Requires `documents:upload` permission.

↓

**Dependencies**
- `multer` (multipart/form-data), `uuid`

---

## 6. AI Chat (stitch_industrial_knowledge_intelligence (3))

↓

**Required APIs**
- `POST /api/v1/chat` (Send message, stream response)
- `GET /api/v1/chat/sessions/:id` (Load history)

↓

**Required Controllers**
- `ChatController`

↓

**Required Services**
- `ChatService`, `RAGPipelineService`

↓

**Required Repositories**
- `ChatRepository`

↓

**Required Models**
- `ChatSession`, `ChatMessage`

↓

**Required AI Service**
- Embedding Generation (`SentenceTransformers`)
- Vector Search (`ChromaDB`)
- LLM Generation (`LangChain`)

↓

**Required Middleware**
- `authenticate`, `authorize('chat:use')`, `tenantIsolation`, `ragFilterBuilder`

↓

**Database Collections Used**
- `chatSessions`, `chatMessages`, ChromaDB Vectors

↓

**Authorization Rules**
- Strictly enforced metadata filters built before vector search.

↓

**Dependencies**
- Server-Sent Events (SSE) for streaming

---

## 7. Semantic Search (stitch_industrial_knowledge_intelligence (6))

↓

**Required APIs**
- `POST /api/v1/search/semantic`

↓

**Required Controllers**
- `SearchController`

↓

**Required Services**
- `RAGPipelineService` (Retriever module only)

↓

**Required Repositories**
- `DocumentRepository` (To enrich vector results with metadata)

↓

**Required Models**
- `Document`

↓

**Required AI Service**
- Embedding Generation (`SentenceTransformers`)
- Vector Search (`ChromaDB`)

↓

**Required Middleware**
- `authenticate`, `authorize('documents:read')`, `tenantIsolation`, `ragFilterBuilder`

↓

**Database Collections Used**
- ChromaDB Vectors, `documents`

↓

**Authorization Rules**
- Strict metadata filtering applied to search.

↓

**Dependencies**
- None specific

---

## 8. System Settings (stitch_industrial_knowledge_intelligence (7))

↓

**Required APIs**
- `GET/POST/PUT /api/v1/departments`
- `GET/POST/PUT /api/v1/roles`
- `GET/POST/PUT /api/v1/users`
- `PUT /api/v1/company/settings`

↓

**Required Controllers**
- `CompanyController`, `DepartmentController`, `RoleController`, `UserController`

↓

**Required Services**
- `CompanyService`, `RoleService`, `UserService`

↓

**Required Repositories**
- `CompanyRepository`, `DepartmentRepository`, `RoleRepository`, `UserRepository`, `PermissionRepository`

↓

**Required Models**
- `Company`, `Department`, `Role`, `User`, `Permission`

↓

**Required AI Service**
- None

↓

**Required Middleware**
- `authenticate`, `authorize('settings:manage')`, `tenantIsolation`, `validateSchema`

↓

**Database Collections Used**
- `companies`, `departments`, `roles`, `permissions`, `users`

↓

**Authorization Rules**
- Requires `settings:manage` permission.

↓

**Dependencies**
- `joi` (strict validation for complex nested settings)
