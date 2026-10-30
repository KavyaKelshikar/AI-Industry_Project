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

---

## 9. Semantic Search Page (stitch_industrial_knowledge_intelligence (6))

↓

**Required APIs**
- `POST /api/v1/rag/query` (semantic vector search with filters)

↓

**Required Controllers**
- `RagController`

↓

**Required Services**
- `RagService` (Vector query orchestration, answer generation)

↓

**Required Repositories**
- `DocumentRepository`, `KnowledgeSourceRepository`

↓

**Required Models**
- `Document`, `KnowledgeSource`

↓

**Required AI Service**
- `/api/query` (ChromaDB vector search + LLM answer generation)
- Embedding model for query vectorization

↓

**Required Middleware**
- `authenticate`, `tenantIsolation`

↓

**Database Collections Used**
- `documents`, `knowledgeSources`
- ChromaDB vector collections

↓

**Authorization Rules**
- Requires authenticated user with read access to knowledge base.

↓

**Dependencies**
- `axios` (AI service communication), ChromaDB client

↓

**Frontend State**
- `searchQuery`, `searchResults`, `searchLoading`, `searchError`, `searchInsight`
- Filter state: `searchDeptFilter`, `searchFileTypeFilter`

↓

**Frontend API Function**
- `semanticSearch(params)` in `api.js`

---

## 10. Sidebar Navigation Architecture & Role-Based Access Scoping

**UI Reference**: Stitch 4 Enterprise Sidebar Layout (`stitch_industrial_knowledge_intelligence (4)`)

**Layout Structure**
- Fixed/collapsible left sidebar (`.stitch-sidebar`) replacing top horizontal tab navigation bar.
- App workspace layout (`.stitch-layout`, `.stitch-main-area`, `.stitch-page-content`).

**Role-Based Visibility Matrix**
| Navigation Section | Super Admin | Company Admin | Employee Role |
| :--- | :---: | :---: | :---: |
| **Admin Overview** (`overview`) | **Visible** | **Visible** | **Hidden** |
| **Super Admin Platform** (`super-admin`) | **Visible** | **Hidden / Restricted** | **Strictly Hidden** |
| **Employee Portal** (`employee-portal`) | **Strictly Hidden** | **Strictly Hidden** | **Visible** |
| **Semantic Search** (`search`) | **Visible** | **Visible** | **Visible** |
| **AI Knowledge Chat** (`chat`) | **Visible** | **Visible** | **Visible** |
| **Knowledge Library** (`library`) | **Visible** | **Visible** | **Visible** |
| **Upload Knowledge** (`upload`) | **Visible** | **Visible** | **Visible** |
| **Employees Directory** (`employees`) | **Visible** | **Visible** | **Hidden** |
| **Knowledge Sources** (`sources`) | **Visible** | **Visible** | **Hidden** |
| **Settings & Security** (`settings`) | **Visible** | **Visible** | **Hidden** |

**Access Enforcement Rules**
- When user is in Admin mode, `employee-portal` is strictly excluded from sidebar and any navigation attempts redirect to `overview`.
- When user is in Employee mode, administrative tools (`overview`, `employees`, `sources`, `settings`, `super-admin`) are strictly excluded from sidebar and any navigation attempts redirect to `employee-portal`.
- Super Admin console is accessible via the `PLATFORM` nav group with dedicated security badges, guarded by `isSuperAdmin && isAdmin`.
- Interactive mode switcher pill allows testing both views directly in the UI.

---

## 11. Super Admin Platform Control Suite

**Role Scope**: `Super Admin` (`superadmin@platform.ai`, `companyId: null`)
**Sidebar Isolation Rule**: When in Super Admin mode, the sidebar displays **ONLY** platform control actions and hides all company/tenant workspace links (`overview`, `employee-portal`, `search`, `chat`, `library`, `upload`, `employees`, `sources`, `settings`).

### Dedicated Functional Routes:
1. **Command Center (`super-admin`)**:
   - Hero summary with KPI metrics (Total Tenants, Platform Users, Global Documents, Total Vectors, Mesh Health, Platform State).
   - Quick platform actions to register tenant, create platform user, export audit reports, and inspect mesh health.
2. **Tenant Workspaces (`sa-tenants`)**:
   - Filterable & searchable multi-tenant directory with active/suspended status indicators.
   - **Interactive Modal**: "Provision New Tenant" modal with validation, plan assignment, admin email, and live addition to active tenant list.
   - Live status toggling (Active ↔ Suspended).
3. **Platform Users (`sa-users`)**:
   - Cross-tenant user directory with role badges (`Super Admin`, `Company Admin`, `Employee`) and company tags.
   - **Interactive Modal**: "Create Platform User" modal with automated audit logging.
   - Live actions: Quick Password Reset dispatch and account status toggle.
4. **Service Mesh Health (`sa-infrastructure`)**:
   - Service nodes: Node.js API Gateway, FastAPI AI Engine, MongoDB Atlas, ChromaDB Vector Store.
   - **Live Mesh Probe**: "Trigger Deep Mesh Probe" button that performs live round-trip probe against `/api/v1/health`, calculates real-time latency (ms), and renders the raw service telemetry JSON.
5. **Global Platform Settings (`sa-config`)**:
   - Live editable configuration: Default AI LLM model (`gemini-2.5-flash`), Max Document Upload Size (MB), Default Vector Chunk Size, Retrieval Top-K, Platform Session Timeout, and OCR Preprocessing Engine.
   - Functional "Save Platform Configuration" with persistent state and audit log dispatch.
6. **Platform Audit Trail (`sa-audit`)**:
   - Real-time audit log stream tracking all administrative actions (user status changes, config updates, tenant provisioning, vector purges).
   - Real-time search filter by actor, action type, or target resource.
   - **Export Feature**: Functional "Export Audit Trail (JSON)" button triggering a formatted client-side file download.
7. **Danger Zone (`sa-danger`)**:
   - **Global Maintenance Mode**: Interactive switch toggling platform maintenance mode, displaying a persistent amber/red alert banner across the entire application.
   - **Vector Purge**: Interactive confirmation modal for ChromaDB vector wipe and re-initialization.
   - **Factory Reset**: Revert platform configurations to factory defaults.




