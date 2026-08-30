# API Design

All backend APIs are versioned under `/api/v1/`.

## General Conventions

- **Success response**: `{ "success": true, "data": { ... }, "message": "..." }`
- **Paginated success response**: `{ "success": true, "data": [], "meta": { ... }, "message": "..." }`
- **Error response**: `{ "success": false, "error": { "code": "...", "message": "..." } }`
- **Authentication**: Bearer access token in the `Authorization` header. Refresh tokens will use an `HttpOnly` cookie when authentication is implemented.

## Permission Convention

Permission codes use lowercase `<resource>:<action>` tokens. Resource and action tokens use kebab-case where needed.

Examples: `companies:read`, `departments:create`, `documents:upload`, `chat:read-own`, and `audit-logs:read`.

## Authorization & Multi-Tenancy Architecture (Module 6)

### Pipeline Flow:
```text
Request
   ↓
authenticate              (Module 5: JWT verification → User lookup → Active status check → Populates req.user)
   ↓
enforceTenantScope        (Module 6: Anti-tampering check → Binds trusted req.tenantScope & req.companyId)
   ↓
requirePermission / requireRole  (Module 6: RBAC evaluation & wildcard expansion)
   ↓
requireDepartmentAccess   (Module 6: Department member check when resource is department-scoped)
   ↓
Controller → Repository (Using verified req.tenantScope)
```

### Permission Hierarchy:
1. `*`: Global wildcard — satisfies any required permission.
2. `<module>:*`: Module-level wildcard (e.g. `documents:*` satisfies `documents:read`, `documents:upload`, `documents:delete`).
3. `<module>:<action>`: Exact permission match (e.g. `documents:read`).

Multi-permission middleware checks enforce **AND** logic (the caller must satisfy all required permissions).

### Error Semantics (401 vs 403):
| Situation | HTTP Status | Error Code | Description |
|-----------|-------------|------------|-------------|
| Missing / invalid / expired JWT | `401 Unauthorized` | `UNAUTHORIZED` | Authentication header missing or token verification failed |
| Inactive user account | `401 Unauthorized` | `UNAUTHORIZED` | User status is `inactive` or `suspended` |
| Inactive company tenant | `401 Unauthorized` | `UNAUTHORIZED` | Tenant status is `inactive` or `suspended` |
| Insufficient permissions | `403 Forbidden` | `INSUFFICIENT_PERMISSIONS` | Authenticated user lacks required permission(s) |
| Forbidden role | `403 Forbidden` | `FORBIDDEN_ROLE` | Authenticated user role is not in the allowed list |
| Client-forged `companyId` | `403 Forbidden` | `TENANT_MISMATCH` | Client supplied `companyId` differing from verified `req.user.companyId` |
| Department boundary violation | `403 Forbidden` | `DEPARTMENT_ACCESS_DENIED` | Employee attempting access to another department's resource |
| Cross-tenant resource violation | `403 Forbidden` | `CROSS_TENANT_FORBIDDEN` | Accessing resource belonging to another tenant |

### Super Admin Scoping:
- **Global administrative operations**: Scoped without tenant filter (`req.tenantScope = {}`).
- **Targeted tenant operations**: Scoped explicitly to target tenant (`req.tenantScope = { companyId: targetCompanyId }`).

## 0. Health Endpoint (`/api/v1/health`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Aggregate platform health status | No |

**Response body** (`data` field):

```json
{
  "status": "healthy | degraded",
  "version": "1.0.0",
  "environment": "development",
  "uptime": 12345,
  "timestamp": "2026-08-11T18:00:00.000Z",
  "services": {
    "backend": "up",
    "mongodb": "connected | disconnected | connecting | disconnecting",
    "chromadb": "connected | disconnected | error"
  }
}
```

- `status` is **healthy** only when all services report connected; otherwise **degraded**.
- `uptime` is the Node.js process uptime in seconds.

## 1. Authentication Endpoints (`/api/v1/auth`)

Rate limited to configured threshold (default: 20 attempts per 15 minutes) for sensitive endpoints (`/register`, `/login`, `/refresh-token`).

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new company and initial Company Admin | No (Rate-limited) |
| POST | `/login` | Authenticate user credentials, return access token & set HttpOnly refresh cookie | No (Rate-limited) |
| POST | `/refresh-token` | Rotate refresh token with token theft / reuse detection | Cookie (Rate-limited) |
| POST | `/logout` | Revoke refresh token and clear cookie | Yes |
| POST | `/forgot-password` | Request password reset email | No |
| POST | `/reset-password/:token` | Reset password | No |
| GET | `/me` | Get authenticated user profile and permissions | Yes (`Bearer <token>`) |

### Token Security & Lifecycle:
- **Access Tokens**: Short-lived JWTs (default: 1 hour) passed in the `Authorization: Bearer <token>` header.
- **Refresh Tokens**: Long-lived JWTs (default: 7 days) stored securely as SHA-256 hashes in MongoDB. In production, refresh tokens are delivered **strictly via `HttpOnly`, `SameSite=Strict`, `Secure=true`, `Path=/api/v1/auth`** cookies.
- **Token Rotation**: Every `/refresh-token` call immediately revokes the used refresh token and issues a fresh pair.
- **Theft & Reuse Detection**: If an already-revoked refresh token is re-submitted, the system detects a token replay/theft attack and **immediately invalidates all active sessions for that user**.

## 2. Company Endpoints (`/api/v1/company`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get company details | Yes (`companies:read`) |
| PUT | `/` | Update company profile | Yes (`companies:update`) |

## 3. Department Endpoints (`/api/v1/departments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create department | Yes (`departments:create`) |
| GET | `/` | List all departments | Yes (`departments:read`) |
| PUT | `/:id` | Update department | Yes (`departments:update`) |
| DELETE | `/:id` | Delete/disable department | Yes (`departments:delete`) |

## 4. Employee Management Endpoints (`/api/v1/employees`)

Company Administrators manage employees within their verified company tenant boundary. Super Admin can manage globally or scope to a specific tenant. Cross-tenant modifications and entity tampering are strictly rejected server-side.

| Method | Endpoint | Description | Auth & Permission Required |
|--------|----------|-------------|----------------------------|
| GET | `/api/v1/employees` | List company employees with search (`search`), filters (`departmentId`, `roleId`, `status`), and pagination (`page`, `limit`) | Yes (`employees:read` or `users:read`) |
| GET | `/api/v1/employees/stats` | Overview metrics for employee totals, active accounts, and inactive accounts | Yes (`employees:read` or `users:read`) |
| GET | `/api/v1/employees/:id` | Get employee details (excluding password hashes) | Yes (`employees:read` or `users:read`) |
| POST | `/api/v1/employees` | Provision a new employee within company | Yes (`employees:create` or `users:create`) |
| PATCH | `/api/v1/employees/:id` | Update employee profile, role, or department | Yes (`employees:update` or `users:update`) |
| PATCH | `/api/v1/employees/:id/activate` | Activate employee account | Yes (`employees:update` or `users:update`) |
| PATCH | `/api/v1/employees/:id/deactivate` | Deactivate employee account & revoke active refresh tokens | Yes (`employees:update` or `users:update`) |
| DELETE | `/api/v1/employees/:id` | Delete employee record and revoke all sessions | Yes (`employees:delete` or `users:delete`) |

### Security & Integrity Rules:
- **Tenant Scope Enforcement**: `companyId` is derived strictly from the authenticated token via `req.tenantScope`. Spoofed `companyId` parameters return `403 TENANT_MISMATCH`.
- **Cross-Tenant Entity Validation**: Assigning a role or department belonging to another tenant returns `403 FORBIDDEN`.
- **Sensitive Fields Redaction**: Password hashes and refresh token hashes are never exposed in responses.
- **Deactivation Session Termination**: Deactivating an employee immediately revokes active refresh tokens and prevents subsequent login attempts with `401 UNAUTHORIZED`.

## 5. Document & Ingestion Endpoints (`/api/v1/documents`)

The Document Processing & AI Vector Pipeline operationalizes documents discovered via Knowledge Source sync or uploaded via application. It handles text extraction (PDF, DOCX, TXT), whitespace normalization, deterministic chunking with page provenance, SentenceTransformers embedding generation, and tenant-isolated vector upserting into ChromaDB (`company_{company_id}`).

| Method | Endpoint | Description | Auth & Permission Required |
|--------|----------|-------------|----------------------------|
| GET | `/api/v1/documents/stats` | Aggregate metrics (total, pending, processing, indexed, error, totalChunks, totalVectors) | Yes (`documents:read` or `documents:process` or `documents:manage`) |
| GET | `/api/v1/documents` | List tenant documents with search (`search`), filter (`indexingStatus`, `knowledgeSourceId`, `fileType`, `status`), and pagination (`page`, `limit`) | Yes (`documents:read` or `documents:process` or `documents:manage`) |
| GET | `/api/v1/documents/:id` | Get single document details with vector telemetry (sanitized, no server paths) | Yes (`documents:read` or `documents:process` or `documents:manage`) |
| POST | `/api/v1/documents/:id/process` | Trigger AI vector ingestion or retry for a single document | Yes (`documents:process` or `documents:upload` or `documents:manage`) |
| POST | `/api/v1/documents/batch-process` | Batch process all pending/failed documents for a specific Knowledge Source | Yes (`documents:process` or `documents:upload` or `documents:manage`) |
| DELETE | `/api/v1/documents/:id` | Delete document record and purge associated vector chunks from ChromaDB | Yes (`documents:delete` or `documents:manage`) |
| POST | `/api/v1/documents/upload` | Upload document (multipart) | Yes (`documents:upload`) |
| PUT | `/api/v1/documents/:id/review` | Approve/edit AI suggestions | Yes (`documents:review`) |
| GET | `/api/v1/documents/:id/download` | Download raw file | Yes (`documents:download`) |

### Document Security & Processing Lifecycle:
- **Indexing Status Lifecycle**: Dedicated `indexingStatus: ['pending', 'processing', 'indexed', 'error']` operating alongside administrative `Document.status`.
- **Approved Boundary Validation**: Path resolution strictly traces `Tenant -> KnowledgeSource.approvedPath -> Document.sourceRelativePath` and verifies boundary containment before dispatching to the AI Service.
- **Idempotency & Vector Cleanup**: Re-ingesting a modified document deletes/replaces outdated vector chunks in ChromaDB, preventing duplicate embeddings.
- **Sanitized Telemetry**: Chunk counts, vector counts, embedding models, and timestamps are returned, while raw filesystem paths and internal error traces are stripped and redacted.

## 6. Chat Endpoints (`/api/v1/chat`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Query the RAG pipeline | Yes (`chat:use`) |
| GET | `/sessions` | List the caller's chat sessions | Yes (`chat:read-own`) |
| GET | `/sessions/:id` | Get the caller's session messages | Yes (`chat:read-own`) |
| DELETE | `/sessions/:id` | Delete the caller's chat session | Yes (`chat:read-own`) |

## 7. Role, Audit, and Analytics Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/roles` | List roles | Yes (`roles:manage`) |
| POST | `/api/v1/roles` | Create custom role | Yes (`roles:manage`) |
| GET | `/api/v1/audit-logs` | View audit trail | Yes (`audit-logs:read`) |
| GET | `/api/v1/admin/analytics` | View company analytics | Yes (`analytics:read`) |

## 8. Knowledge Source Management Endpoints (`/api/v1/knowledge-sources`)

Company Administrators explicitly approve and manage external and local knowledge sources that the AI platform is authorized to ingest. The platform enforces strict boundary limits to prevent unrestricted filesystem access.

| Method | Endpoint | Description | Auth & Permission Required |
|--------|----------|-------------|----------------------------|
| GET | `/api/v1/knowledge-sources` | List tenant knowledge sources with search (`search`), type (`type`), status (`status`), and pagination (`page`, `limit`) | Yes (`knowledge-sources:read` or `knowledge-sources:manage`) |
| GET | `/api/v1/knowledge-sources/stats` | Aggregate metric counts (total, active, syncing, failed, totalDocuments) | Yes (`knowledge-sources:read` or `knowledge-sources:manage`) |
| GET | `/api/v1/knowledge-sources/:id` | Get single knowledge source details (sanitized, no path leaks) | Yes (`knowledge-sources:read` or `knowledge-sources:manage`) |
| POST | `/api/v1/knowledge-sources` | Create and approve a new knowledge source | Yes (`knowledge-sources:create` or `knowledge-sources:manage`) |
| PATCH | `/api/v1/knowledge-sources/:id` | Update knowledge source name, description, or configuration | Yes (`knowledge-sources:update` or `knowledge-sources:manage`) |
| DELETE | `/api/v1/knowledge-sources/:id` | Delete knowledge source and unlink associated documents | Yes (`knowledge-sources:delete` or `knowledge-sources:manage`) |
| POST | `/api/v1/knowledge-sources/:id/sync` | Trigger document synchronization and deduplicated ingestion | Yes (`knowledge-sources:sync` or `knowledge-sources:manage`) |
| PATCH | `/api/v1/knowledge-sources/:id/activate` | Activate knowledge source | Yes (`knowledge-sources:update` or `knowledge-sources:manage`) |
| PATCH | `/api/v1/knowledge-sources/:id/deactivate` | Deactivate knowledge source (prevents syncing) | Yes (`knowledge-sources:update` or `knowledge-sources:manage`) |

### Security & Path Approval Invariants:
- **Tenant Scope Enforcement**: `companyId` is strictly derived from the authenticated token. Manipulated `companyId` parameters return `403 TENANT_MISMATCH`.
- **Approved Path Resolution**: For `local_folder`, the backend validates directory existence, resolves symlinks, checks against dangerous system directory blocklists, and generates an `approvedPath`.
- **Boundary Enforcement**: Every discovered file must reside inside the approved directory root. Symlink escapes return errors and are skipped.
- **Deduplication Engine**: Sync computes SHA-256 hashes of files; unchanged files are skipped, modified files update existing documents, and new files create records linked via `knowledgeSourceId`.
- **Sanitized Responses**: Raw filesystem paths, tokens, and connector secrets are never returned to the frontend or logged.
