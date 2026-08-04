# API Design

All backend APIs are explicitly versioned using `/api/v1/`.

## General Conventions
- **Success Response**: `{ "success": true, "data": { ... }, "message": "..." }`
- **Error Response**: `{ "success": false, "error": { "code": "...", "message": "..." } }`
- **Authentication**: Bearer Token in `Authorization` header. Refresh token in `HttpOnly` cookie.

## 1. Authentication Endpoints (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new company and admin | No |
| POST | `/login` | Authenticate user, return tokens | No |
| POST | `/refresh-token` | Rotate refresh token | Cookie |
| POST | `/logout` | Revoke refresh token | Yes |
| POST | `/forgot-password` | Request password reset email | No |
| POST | `/reset-password/:token` | Reset password | No |
| GET | `/me` | Get profile and permissions | Yes |

## 2. Company Endpoints (`/api/v1/company`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get company details | Yes (`company:read`) |
| PUT | `/` | Update company profile | Yes (`company:update`) |

## 3. Department Endpoints (`/api/v1/departments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create department | Yes (`departments:create`) |
| GET | `/` | List all departments | Yes (`departments:read`) |
| PUT | `/:id` | Update department | Yes (`departments:update`) |
| DELETE | `/:id` | Delete/Disable department | Yes (`departments:delete`) |

## 4. User Endpoints (`/api/v1/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create employee | Yes (`users:create`) |
| GET | `/` | List employees | Yes (`users:read`) |
| PUT | `/:id` | Update employee | Yes (`users:update`) |
| DELETE | `/:id` | Deactivate employee | Yes (`users:delete`) |

## 5. Document Endpoints (`/api/v1/documents`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/upload` | Upload document (multipart) | Yes (`documents:upload`) |
| GET | `/` | List documents (auth filtered) | Yes (`documents:read`) |
| GET | `/:id` | Get document details | Yes (`documents:read`) |
| PUT | `/:id/review` | Approve/edit AI suggestions | Yes (`documents:review`) |
| DELETE | `/:id` | Delete document & embeddings | Yes (`documents:delete`) |
| GET | `/:id/download`| Download raw file | Yes (`documents:download`) |

## 6. Chat Endpoints (`/api/v1/chat`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Query RAG pipeline | Yes (`chat:use`) |
| GET | `/sessions` | List chat sessions | Yes (`chat:read_own`) |
| GET | `/sessions/:id`| Get session messages | Yes (`chat:read_own`) |
| DELETE | `/sessions/:id`| Delete chat session | Yes (`chat:read_own`) |

## 7. Role & Audit Endpoints (`/api/v1/roles`, `/api/v1/audit-logs`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/roles` | List roles | Yes (`roles:manage`) |
| POST | `/roles` | Create custom role | Yes (`roles:manage`) |
| GET | `/audit-logs`| View audit trail | Yes (`audit:read`) |
