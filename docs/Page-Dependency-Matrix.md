# Page Dependency Matrix

This matrix maps out the exact dependencies of every frontend page, helping to determine the strict implementation order. (e.g., You cannot build the Dashboard until Login is built; you cannot build Chat until Upload is built).

| Page | Dependent APIs | Collections Used | Auth State | Roles / Permissions | AI Services Interacted | Page Dependencies |
|------|---------------|------------------|------------|---------------------|----------------------|-------------------|
| **1. Login** | `POST /api/v1/auth/login`<br>`POST /auth/forgot-password` | `users`, `refreshTokens` | Unauthenticated | Public (None) | None | None |
| **2. Employee Dashboard** | `GET /api/v1/users/me`<br>`GET /documents/recent`<br>`GET /chat/recent` | `users`, `documents`, `chatSessions` | Authenticated | All Roles<br>(No specific permission) | None | **Login** (Requires Auth Context) |
| **3. Admin Overview** | `GET /api/v1/admin/analytics`<br>`GET /audit-logs/recent` | `documents`, `users`, `auditLogs`, `chatSessions` | Authenticated | Admin Role<br>`analytics:read` | None | **Login**, **Dashboard** |
| **4. Knowledge Library** | `GET /api/v1/documents`<br>`POST /documents/:id/insights` | `documents`, `departments` | Authenticated | All Roles<br>`documents:read` | Document Comparison & Summarization (LLM) | **Login** |
| **5. Upload Knowledge** | `POST /api/v1/documents/upload` | `documents` | Authenticated | Admin/Manager<br>`documents:upload` | AI Document Intelligence (Auto-Tagging, Classification, Summary) | **Login**, **Knowledge Library** (To view uploaded docs) |
| **6. AI Chat** | `POST /api/v1/chat`<br>`GET /chat/sessions/:id` | `chatSessions`, `chatMessages`, ChromaDB | Authenticated | All Roles<br>`chat:use` | Embedding Generation, Vector Search, LLM RAG Generation | **Login**, **Upload Knowledge** (Needs data to search) |
| **7. Semantic Search** | `POST /api/v1/search/semantic` | `documents`, ChromaDB | Authenticated | All Roles<br>`documents:read` | Vector Search | **Login**, **Upload Knowledge**, **Knowledge Library** |
| **8. System Settings** | `GET/POST /api/v1/departments`<br>`GET/POST /api/v1/roles`<br>`GET/POST /api/v1/users` | `companies`, `departments`, `roles`, `permissions`, `users` | Authenticated | Admin Role<br>`settings:manage`, `roles:manage`, `users:read`, `users:create`, `users:update`, `users:delete` | None | **Login**, **Admin Overview** |

---

## Implementation Order Derived from Matrix

Based on the Page Dependencies column, the exact order of UI and Backend implementation must be:

1. **Login & Auth System**: (Zero dependencies). Everything else requires an authenticated user.
2. **System Settings (Users, Roles, Departments)**: Must exist to assign roles to users so we can test RBAC for the other pages.
3. **Upload Knowledge**: Documents must be uploaded and processed by the AI pipeline before they can be searched or chatted with.
4. **Knowledge Library & Semantic Search**: Built to view and filter the documents uploaded in Step 3.
5. **AI Chat**: The pinnacle feature. Relies on documents uploaded in Step 3 and the vector database being populated.
6. **Dashboard & Admin Overview**: Finally, build the analytics and dashboards that aggregate data from all the above modules.
