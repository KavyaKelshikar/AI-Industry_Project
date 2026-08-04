# Architecture Decision Record: 002 RBAC Design

## Context
The platform requires granular access control. Different employees have different responsibilities. Hardcoding roles (e.g., `if (user.role === 'admin')`) is brittle and prevents companies from creating custom hierarchies.

## Decision
We implemented a dynamic **Role-Based Access Control (RBAC)** system.
1. The system defines immutable `permissions` (e.g., `documents:upload`, `users:create`).
2. Companies create dynamic `roles` that contain an array of permission IDs.
3. Users are assigned a `roleId`.
4. An `authorize(permission)` middleware resolves the user's role and checks for the required permission before allowing route access.

## Consequences
- **Positive**: Highly extensible. Companies can create custom roles (e.g., "Auditor" with read-only access).
- **Positive**: Future features only require seeding a new permission, rather than updating massive `if/else` role blocks.
- **Negative**: Requires an additional database lookup during authorization (mitigated by in-memory caching of role-permissions).
