# Security Model

Security is built into every layer of the platform, focusing heavily on multi-tenant isolation, RBAC, and data privacy.

## Authentication
- **Passwords**: Hashed using `bcrypt` (12 rounds).
- **JWT Strategy**: Short-lived Access Tokens (15 min) kept in memory.
- **Refresh Token Strategy**: Long-lived (7 days) stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies to prevent XSS and CSRF.
- **Reuse Detection**: If a refresh token is reused, all tokens for that user are revoked (potential theft detected).

## Multi-Tenant Isolation
- **JWT Source of Truth**: The `companyId` is extracted strictly from the verified JWT. The backend ignores any `companyId` sent in requests.
- **Repository Enforcement**: `BaseRepository` forces `{ companyId }` as the first argument in every query.
- **ChromaDB**: Each company has an isolated physical collection (`company_{companyId}`).

## Role-Based Access Control (RBAC) & 3 Core Personas
The system defines 3 distinct core roles, with strict scoping and visibility enforcement:

1. **Super Admin (Platform-Wide)**:
   - **Credentials**: `superadmin@platform.ai` / `Password123!`
   - **Scope**: Platform-wide (`companyId: null`).
   - **Privileges**: Full wildcard permissions (`*`). Access to the **Super Admin Platform Command Center**, cross-tenant metrics, tenant provisioning, platform user management, service mesh health, and platform configuration.
   - **UI Views**: `super-admin`, `overview`, `employees`, `sources`, `settings`, `library`, `search`, `chat`, `upload`. Strictly excluded from `employee-portal`.

2. **Company Admin (Tenant-Scoped)**:
   - **Credentials**: `admin@apexengineering.demo` / `Password123!` (Slug: `apex-engineering`)
   - **Scope**: Single tenant (`companyId: <company_id>`).
   - **Privileges**: Tenant-scoped administrative rights (`documents:*`, `users:*`, `departments:*`, `settings:manage`, `knowledge-sources:*`).
   - **UI Views**: `overview`, `employees`, `sources`, `settings`, `library`, `search`, `chat`, `upload`. Strictly excluded from `super-admin` (only platform admins) and `employee-portal`.

3. **Employee (Tenant-Scoped End-User)**:
   - **Credentials**: `employee@apexengineering.demo` / `Password123!` (Slug: `apex-engineering`)
   - **Scope**: Department/tenant standard access.
   - **Privileges**: Read rights and AI chat capability (`documents:read`, `chat:use`, `knowledge-sources:read`).
   - **UI Views**: `employee-portal`, `library`, `search`, `chat`, `upload`. Strictly excluded from `super-admin`, `overview`, `employees`, `sources`, and `settings`.

- **Dynamic Roles**: Companies can also create custom tenant-specific roles mapped to granular permissions.
- **Middleware Check**: The `authorize(permission)` middleware looks up the user's `roleId` and checks against assigned permissions. Super Admin bypasses tenant constraints.

## Document Authorization (5-Step Flow)
Before the RAG pipeline queries ChromaDB, the backend verifies:
1. **Company**: `req.companyId` is active.
2. **Department**: User's department is active.
3. **Role**: User has `chat:use` permission.
4. **Classification Access**: Determines if the user can see `public`, `internal`, `confidential`, or `restricted` documents based on their role and department.
5. **Retrieval**: The AI service uses these allowed classifications and department IDs as hard metadata filters in ChromaDB.

## File Upload Security
- **Validation**: Strict MIME-type checking (not just extension).
- **Sanitization**: UUID-based stored filenames prevent path traversal attacks.
- **Limits**: Configurable maximum file sizes per company to prevent storage exhaustion.

## Audit Logging
An immutable `auditLogs` collection tracks:
- Logins, logouts, failed login attempts.
- File uploads, approvals, deletions.
- AI Queries and Responses.
- Authorization failures.
Every log contains `userId`, `companyId`, `action`, `IP`, and `timestamp`.
