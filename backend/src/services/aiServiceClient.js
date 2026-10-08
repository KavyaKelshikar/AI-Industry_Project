/**
 * AI Service HTTP Client — Modules 9 & 10.
 *
 * Provides resilient communication between the Node.js backend
 * and the Python/FastAPI AI Service.
 */

const http = require('http');
const config = require('../config');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const errorCodes = require('../utils/errorCodes');
const { sanitizeSyncError } = require('../utils/knowledgeSourcePathSecurity');

class AIServiceClient {
  constructor() {
    this.baseUrl = config.aiService.url || 'http://localhost:8002';
  }

  /**
   * Health probe for the AI Service.
   * Resolves to true if the service returns HTTP 200 within timeoutMs.
   *
   * @param {number} timeoutMs - Timeout in milliseconds (default: 1500ms)
   * @returns {Promise<{ ok: boolean, status: string, details?: object }>}
   */
  async checkHealth(timeoutMs = 1500) {
    return new Promise((resolve) => {
      try {
        const url = new URL('/health', this.baseUrl);
        const req = http.get(
          url.toString(),
          { timeout: timeoutMs },
          (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              if (res.statusCode === 200) {
                try {
                  const parsed = JSON.parse(data);
                  resolve({ ok: true, status: 'up', details: parsed });
                } catch {
                  resolve({ ok: true, status: 'up' });
                }
              } else {
                resolve({ ok: false, status: 'degraded', statusCode: res.statusCode });
              }
            });
          }
        );

        req.on('timeout', () => {
          req.destroy();
          resolve({ ok: false, status: 'timeout' });
        });

        req.on('error', (err) => {
          logger.debug(`AI Service health probe error: ${err.message}`);
          resolve({ ok: false, status: 'down', error: err.message });
        });
      } catch (err) {
        resolve({ ok: false, status: 'error', error: err.message });
      }
    });
  }

  /**
   * Ingest a document file into tenant ChromaDB collection.
   *
   * @param {Object} payload - IngestionRequest payload
   * @param {string} payload.file_path - Absolute server-approved path
   * @param {string} payload.document_id - MongoDB Document ID
   * @param {string} payload.company_id - Tenant Company ID
   * @param {string} [payload.department_id] - Department ID
   * @param {string} [payload.classification] - Data classification
   * @param {string} [payload.category] - Document category
   * @param {number} [timeoutMs=60000] - Ingestion timeout in ms
   * @returns {Promise<Object>} IngestionResult
   */
  async ingestDocument(payload, timeoutMs = 60000) {
    const url = `${this.baseUrl}/api/v1/ingest`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.detail?.message || data.detail || 'Document ingestion failed';
        const sanitized = sanitizeSyncError(errorMsg);
        const code = data.detail?.code || errorCodes.INTERNAL_ERROR;
        throw new AppError(response.status, sanitized, true, code);
      }

      return data;
    } catch (err) {
      if (err instanceof AppError) throw err;

      if (err.name === 'AbortError') {
        throw new AppError(504, 'AI vector ingestion service timed out', true, errorCodes.INTERNAL_ERROR);
      }

      const sanitized = sanitizeSyncError(err.message || 'AI service connection failed');
      logger.error(`AI Service Ingest Error: ${err.message}`);
      throw new AppError(503, `AI service unavailable: ${sanitized}`, true, errorCodes.INTERNAL_ERROR);
    }
  }

  /**
   * Delete all vector chunks associated with a document from ChromaDB.
   *
   * @param {string} companyId - Tenant Company ID
   * @param {string} documentId - Document ID
   * @param {number} [timeoutMs=15000] - Timeout in ms
   * @returns {Promise<Object>}
   */
  async deleteDocumentVectors(companyId, documentId, timeoutMs = 15000) {
    const url = `${this.baseUrl}/api/v1/vectors/${encodeURIComponent(companyId)}/${encodeURIComponent(documentId)}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'DELETE',
        signal: controller.signal,
      });

      clearTimeout(timer);

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.detail?.message || data.detail || 'Vector deletion failed';
        const sanitized = sanitizeSyncError(errorMsg);
        throw new AppError(response.status, sanitized, true, errorCodes.INTERNAL_ERROR);
      }

      return data;
    } catch (err) {
      if (err instanceof AppError) throw err;
      const sanitized = sanitizeSyncError(err.message);
      logger.warn(`Failed to delete vectors for document ${documentId}: ${sanitized}`);
      // Do not block database deletion if AI service is temporarily offline
      return { success: false, error: sanitized };
    }
  }

  /**
   * Execute single-turn RAG query against tenant vectors.
   *
   * @param {Object} payload - RAGQueryRequest
   * @param {string} payload.query - Search question
   * @param {string} payload.company_id - Tenant company ID
   * @param {string} [payload.department_id] - Optional department filter
   * @param {string|string[]} [payload.classification] - Allowed classifications
   * @param {string} [payload.category] - Optional category
   * @param {number} [payload.top_k=5] - Top K chunks
   * @param {number} [payload.score_threshold] - Similarity score threshold
   * @param {number} [timeoutMs=30000] - Request timeout in ms
   * @returns {Promise<Object>} RAGResponse
   */
  async queryRAG(payload, timeoutMs = 30000) {
    const url = `${this.baseUrl}/api/v1/rag/query`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.detail?.message || data.detail || 'RAG query failed';
        const sanitized = sanitizeSyncError(errorMsg);
        const code = data.detail?.code || errorCodes.INTERNAL_ERROR;
        throw new AppError(response.status, sanitized, true, code);
      }

      return data;
    } catch (err) {
      if (err instanceof AppError) throw err;

      if (err.name === 'AbortError') {
        throw new AppError(504, 'AI RAG query service timed out', true, errorCodes.INTERNAL_ERROR);
      }

      const sanitized = sanitizeSyncError(err.message || 'AI service connection failed');
      logger.error(`AI Service RAG Query Error: ${err.message}`);
      throw new AppError(503, `AI RAG service unavailable: ${sanitized}`, true, errorCodes.INTERNAL_ERROR);
    }
  }

  /**
   * Execute multi-turn conversational RAG chat against tenant vectors.
   *
   * @param {Object} payload - RAGChatRequest
   * @param {string} payload.query - Current user message
   * @param {string} payload.company_id - Tenant company ID
   * @param {Array<{role: string, content: string}>} [payload.chat_history] - Previous chat turns
   * @param {string} [payload.department_id] - Optional department filter
   * @param {string|string[]} [payload.classification] - Allowed classifications
   * @param {string} [payload.category] - Optional category
   * @param {number} [payload.top_k=5] - Top K chunks
   * @param {number} [payload.score_threshold] - Similarity score threshold
   * @param {number} [timeoutMs=30000] - Request timeout in ms
   * @returns {Promise<Object>} RAGResponse
   */
  async chatRAG(payload, timeoutMs = 30000) {
    const url = `${this.baseUrl}/api/v1/rag/chat`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.detail?.message || data.detail || 'RAG chat failed';
        const sanitized = sanitizeSyncError(errorMsg);
        const code = data.detail?.code || errorCodes.INTERNAL_ERROR;
        throw new AppError(response.status, sanitized, true, code);
      }

      return data;
    } catch (err) {
      if (err instanceof AppError) throw err;

      if (err.name === 'AbortError') {
        throw new AppError(504, 'AI RAG chat service timed out', true, errorCodes.INTERNAL_ERROR);
      }

      const sanitized = sanitizeSyncError(err.message || 'AI service connection failed');
      logger.error(`AI Service RAG Chat Error: ${err.message}`);
      throw new AppError(503, `AI RAG service unavailable: ${sanitized}`, true, errorCodes.INTERNAL_ERROR);
    }
  }
}

module.exports = new AIServiceClient();
