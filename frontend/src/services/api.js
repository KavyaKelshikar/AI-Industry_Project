/**
 * Secure Frontend API Service.
 *
 * Security Constraints:
 * 1. Refresh tokens are stored ONLY as HttpOnly cookies (managed by the browser).
 *    Never stored in localStorage or sessionStorage.
 * 2. Access tokens are kept strictly in memory (closure state).
 * 3. Every request includes `credentials: 'include'`.
 * 4. Transparent silent token refresh on 401 errors.
 */

const API_BASE = '/api/v1';

// In-memory token storage (lost on page reload for security; refreshed automatically via cookie)
let inMemoryAccessToken = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = () => {
  return inMemoryAccessToken;
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
};

/**
 * Base HTTP request wrapper with silent refresh and credentials inclusion.
 */
async function request(endpoint, options = {}, isRetry = false) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Attach memory-held Bearer access token if present
  if (inMemoryAccessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
  }

  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include', // Ensure HttpOnly cookies are transmitted
  };

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json().catch(() => ({}));

    // Handle 401 Unauthorized with silent token refresh attempt (unless already refreshing or logging in)
    if (
      response.status === 401 &&
      !isRetry &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/refresh-token') &&
      !endpoint.includes('/auth/register')
    ) {
      try {
        // Attempt silent refresh using HttpOnly cookie
        const refreshRes = await refreshToken();
        if (refreshRes && refreshRes.data && refreshRes.data.accessToken) {
          setAccessToken(refreshRes.data.accessToken);
          // Retry the original request once with the new access token
          return await request(endpoint, options, true);
        }
      } catch (refreshErr) {
        clearAccessToken();
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      ...data,
    };
  } catch (networkError) {
    return {
      ok: false,
      status: 0,
      error: {
        code: 'NETWORK_ERROR',
        message: networkError.message || 'Network request failed',
      },
    };
  }
}

/**
 * Platform Health Check (Aggregate)
 */
export async function getHealth() {
  return request('/health', { method: 'GET' });
}

/**
 * User & Tenant Registration
 */
export async function register(payload) {
  const res = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.ok && res.data?.accessToken) {
    setAccessToken(res.data.accessToken);
  }
  return res;
}

/**
 * User Login
 */
export async function login(payload) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.ok && res.data?.accessToken) {
    setAccessToken(res.data.accessToken);
  }
  return res;
}

/**
 * Get Authenticated User Profile & Permissions
 */
export async function getMe() {
  return request('/auth/me', { method: 'GET' });
}

/**
 * Rotate Refresh Token via HttpOnly Cookie
 */
export async function refreshToken() {
  const res = await request('/auth/refresh-token', { method: 'POST' });
  if (res.ok && res.data?.accessToken) {
    setAccessToken(res.data.accessToken);
  } else {
    clearAccessToken();
  }
  return res;
}

/**
 * Logout (Revokes server token & clears cookies + memory token)
 */
export async function logout() {
  const res = await request('/auth/logout', { method: 'POST' });
  clearAccessToken();
  return res;
}

/**
 * ── Module 8: Employee Management API Functions ──
 */

/**
 * Get paginated list of employees with optional search & filters
 */
export async function getEmployees(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.departmentId) query.append('departmentId', params.departmentId);
  if (params.roleId) query.append('roleId', params.roleId);
  if (params.status) query.append('status', params.status);
  if (params.sort) query.append('sort', params.sort);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return request(`/employees${qs}`, { method: 'GET' });
}

/**
 * Get employee overview count stats
 */
export async function getEmployeeStats() {
  return request('/employees/stats', { method: 'GET' });
}

/**
 * Get single employee details
 */
export async function getEmployee(id) {
  return request(`/employees/${id}`, { method: 'GET' });
}

/**
 * Create/provision a new employee
 */
export async function createEmployee(payload) {
  return request('/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Update employee details
 */
export async function updateEmployee(id, payload) {
  return request(`/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Activate employee account
 */
export async function activateEmployee(id) {
  return request(`/employees/${id}/activate`, { method: 'PATCH' });
}

/**
 * Deactivate employee account
 */
export async function deactivateEmployee(id) {
  return request(`/employees/${id}/deactivate`, { method: 'PATCH' });
}

/**
 * Delete employee record
 */
export async function deleteEmployee(id) {
  return request(`/employees/${id}`, { method: 'DELETE' });
}

/**
 * ── Module 9: Knowledge Source Management API Functions ──
 */

/**
 * Get paginated list of knowledge sources with optional filters
 */
export async function getKnowledgeSources(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.type) query.append('type', params.type);
  if (params.status) query.append('status', params.status);
  if (params.sort) query.append('sort', params.sort);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return request(`/knowledge-sources${qs}`, { method: 'GET' });
}

/**
 * Get knowledge source aggregate statistics
 */
export async function getKnowledgeSourceStats() {
  return request('/knowledge-sources/stats', { method: 'GET' });
}

/**
 * Get a single knowledge source
 */
export async function getKnowledgeSource(id) {
  return request(`/knowledge-sources/${id}`, { method: 'GET' });
}

/**
 * Create a new knowledge source
 */
export async function createKnowledgeSource(payload) {
  return request('/knowledge-sources', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Update a knowledge source
 */
export async function updateKnowledgeSource(id, payload) {
  return request(`/knowledge-sources/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a knowledge source
 */
export async function deleteKnowledgeSource(id) {
  return request(`/knowledge-sources/${id}`, { method: 'DELETE' });
}

/**
 * Trigger sync for a knowledge source
 */
export async function syncKnowledgeSource(id) {
  return request(`/knowledge-sources/${id}/sync`, { method: 'POST' });
}

/**
 * Activate a knowledge source
 */
export async function activateKnowledgeSource(id) {
  return request(`/knowledge-sources/${id}/activate`, { method: 'PATCH' });
}

/**
 * Deactivate a knowledge source
 */
export async function deactivateKnowledgeSource(id) {
  return request(`/knowledge-sources/${id}/deactivate`, { method: 'PATCH' });
}

/**
 * ── Module 10: Document Ingestion & AI Processing API Functions ──
 */

/**
 * Get paginated list of documents with optional filters
 */
export async function getDocuments(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.knowledgeSourceId) query.append('knowledgeSourceId', params.knowledgeSourceId);
  if (params.indexingStatus) query.append('indexingStatus', params.indexingStatus);
  if (params.status) query.append('status', params.status);
  if (params.fileType) query.append('fileType', params.fileType);
  if (params.sort) query.append('sort', params.sort);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return request(`/documents${qs}`, { method: 'GET' });
}

/**
 * Get document aggregate processing statistics
 */
export async function getDocumentStats() {
  return request('/documents/stats', { method: 'GET' });
}

/**
 * Get a single document details and telemetry
 */
export async function getDocument(id) {
  return request(`/documents/${id}`, { method: 'GET' });
}

/**
 * Trigger AI vector ingestion or retry for a single document
 */
export async function processDocument(id) {
  return request(`/documents/${id}/process`, { method: 'POST' });
}

/**
 * Batch process all pending documents for a knowledge source
 */
export async function batchProcessDocuments(knowledgeSourceId) {
  return request('/documents/batch-process', {
    method: 'POST',
    body: JSON.stringify({ knowledgeSourceId }),
  });
}

/**
 * Delete a document and purge its vectors from ChromaDB
 */
export async function deleteDocument(id) {
  return request(`/documents/${id}`, { method: 'DELETE' });
}

/**
 * ── Module 11: RAG Query & Conversational AI Assistant API Functions ──
 */

/**
 * Execute single-turn semantic search and grounded answer generation.
 * Enforces security by omitting any client-controlled companyId.
 * @param {Object} payload - { query: string, top_k?: number, score_threshold?: number, departmentId?: string, category?: string }
 */
export async function queryRAG(payload = {}) {
  const safePayload = { ...payload };
  delete safePayload.companyId;
  delete safePayload.company_id;
  return request('/rag/query', {
    method: 'POST',
    body: JSON.stringify(safePayload),
  });
}

/**
 * Execute multi-turn conversational RAG chat query with history.
 * Enforces security by omitting any client-controlled companyId.
 * @param {Object} payload - { query: string, chat_history?: Array<{role: string, content: string}>, top_k?: number, score_threshold?: number, departmentId?: string, category?: string }
 */
export async function chatRAG(payload = {}) {
  const safePayload = { ...payload };
  delete safePayload.companyId;
  delete safePayload.company_id;
  return request('/rag/chat', {
    method: 'POST',
    body: JSON.stringify(safePayload),
  });
}


