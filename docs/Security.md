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

## Role-Based Access Control (RBAC)
- **Dynamic Roles**: Companies can create custom roles mapped to specific permissions (e.g., `documents:upload`, `users:create`).
- **Middleware Check**: The `authorize(permission)` middleware looks up the user's `roleId` and checks against assigned permissions.

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
