/**
 * RAG Controller — Module 11 Phase 2.
 *
 * Exposes endpoints for executing tenant-isolated RAG search and chat queries.
 */

const ragService = require('../services/ragService');

class RAGController {
  /**
   * Execute single-turn semantic search and RAG answer generation.
   * POST /api/v1/rag/query
   */
  async query(req, res, next) {
    try {
      const { query, top_k, score_threshold, departmentId, category } = req.body;

      const result = await ragService.processQuery({
        user: req.user,
        query,
        top_k,
        score_threshold,
        departmentId,
        category,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Execute multi-turn conversational RAG chat query.
   * POST /api/v1/rag/chat
   */
  async chat(req, res, next) {
    try {
      const { query, chat_history, top_k, score_threshold, departmentId, category } = req.body;

      const result = await ragService.processChat({
        user: req.user,
        query,
        chat_history,
        top_k,
        score_threshold,
        departmentId,
        category,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new RAGController();
