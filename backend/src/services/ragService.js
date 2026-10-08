/**
 * RAG Service — Module 11 Phase 2.
 *
 * Core business orchestration for enterprise RAG queries and conversational chat.
 * Enforces server-side tenant isolation, role-based classification scoping,
 * and department-level access filtering before calling the AI Service.
 */

const aiServiceClient = require('./aiServiceClient');
const AppError = require('../utils/AppError');
const errorCodes = require('../utils/errorCodes');
const logger = require('../utils/logger');
const { isSuperAdmin } = require('../utils/tenantHelper');

class RAGService {
  /**
   * Derive trusted tenant and permission filters based on authenticated user context.
   *
   * @private
   * @param {Object} user - req.user object from authenticate middleware
   * @param {string} [requestedDeptId] - Optional client requested department filter
   * @returns {{ companyId: string, departmentId: string|null, classifications: string[] }}
   */
  _deriveSecurityScope(user, requestedDeptId = null) {
    if (!user || !user.companyId) {
      throw new AppError(401, 'Tenant company identity is required for RAG operations', true, errorCodes.UNAUTHORIZED);
    }

    const companyId = user.companyId.toString();
    const isAdmin = isSuperAdmin(user) || user.role === 'Company Admin';

    // 1. Classification Scoping: Admins get confidential access; regular users limited to public/internal
    const classifications = isAdmin
      ? ['public', 'internal', 'confidential']
      : ['public', 'internal'];

    // 2. Department Scoping:
    // Admins can query any department or omit for company-wide.
    // Regular employees are constrained to their own assigned department.
    let departmentId = null;
    if (isAdmin) {
      departmentId = requestedDeptId || null;
    } else {
      departmentId = user.departmentId ? user.departmentId.toString() : null;
    }

    return {
      companyId,
      departmentId,
      classifications,
    };
  }

  /**
   * Process a single-turn RAG search and generation query.
   *
   * @param {Object} params
   * @param {Object} params.user - Authenticated user context
   * @param {string} params.query - User question text
   * @param {number} [params.top_k=5] - Max vector chunks to retrieve
   * @param {number} [params.score_threshold] - Similarity score threshold
   * @param {string} [params.departmentId] - Optional department filter
   * @param {string} [params.category] - Optional category filter
   * @returns {Promise<Object>} Normalized RAG response with answer and citations
   */
  async processQuery({ user, query, top_k = 5, score_threshold, departmentId, category }) {
    const scope = this._deriveSecurityScope(user, departmentId);

    const payload = {
      query: query.trim(),
      company_id: scope.companyId,
      department_id: scope.departmentId,
      classification: scope.classifications,
      category: category ? category.trim() : undefined,
      top_k: Math.min(Math.max(1, top_k || 5), 20),
      score_threshold: typeof score_threshold === 'number' ? score_threshold : undefined,
    };

    logger.info(`Processing RAG query for tenant ${scope.companyId}, user ${user.id}: "${query.slice(0, 60)}..."`);

    const result = await aiServiceClient.queryRAG(payload);

    return {
      query: result.query || query,
      companyId: scope.companyId,
      answer: result.answer,
      sources: result.sources || [],
      grounded: Boolean(result.grounded),
      retrievedCount: result.retrieved_count || 0,
      durationMs: result.duration_ms || 0,
      llmProvider: result.llm_provider || 'ai-service',
      metadata: result.metadata || {},
    };
  }

  /**
   * Process a multi-turn conversational RAG chat query.
   *
   * @param {Object} params
   * @param {Object} params.user - Authenticated user context
   * @param {string} params.query - Latest user message
   * @param {Array<{role: string, content: string}>} [params.chat_history=[]] - Previous conversation turns
   * @param {number} [params.top_k=5] - Max vector chunks to retrieve
   * @param {number} [params.score_threshold] - Similarity score threshold
   * @param {string} [params.departmentId] - Optional department filter
   * @param {string} [params.category] - Optional category filter
   * @returns {Promise<Object>} Normalized RAG response with answer and citations
   */
  async processChat({ user, query, chat_history = [], top_k = 5, score_threshold, departmentId, category }) {
    const scope = this._deriveSecurityScope(user, departmentId);

    const formattedHistory = Array.isArray(chat_history)
      ? chat_history.slice(-10).map((turn) => ({
          role: String(turn.role).toLowerCase(),
          content: String(turn.content).trim(),
        }))
      : [];

    const payload = {
      query: query.trim(),
      company_id: scope.companyId,
      chat_history: formattedHistory,
      department_id: scope.departmentId,
      classification: scope.classifications,
      category: category ? category.trim() : undefined,
      top_k: Math.min(Math.max(1, top_k || 5), 20),
      score_threshold: typeof score_threshold === 'number' ? score_threshold : undefined,
    };

    logger.info(`Processing RAG chat for tenant ${scope.companyId}, user ${user.id}: "${query.slice(0, 60)}..."`);

    const result = await aiServiceClient.chatRAG(payload);

    return {
      query: result.query || query,
      companyId: scope.companyId,
      answer: result.answer,
      sources: result.sources || [],
      grounded: Boolean(result.grounded),
      retrievedCount: result.retrieved_count || 0,
      durationMs: result.duration_ms || 0,
      llmProvider: result.llm_provider || 'ai-service',
      metadata: result.metadata || {},
    };
  }
}

module.exports = new RAGService();
