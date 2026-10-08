const express = require('express');
const ragController = require('../../controllers/ragController');
const { authenticate } = require('../../middlewares/auth');
const { enforceTenantScope } = require('../../middlewares/tenant');
const { requirePermission } = require('../../middlewares/authorize');
const validate = require('../../middlewares/validate');
const { ragValidation } = require('../../validators');

const router = express.Router();

// Apply authentication and strict tenant boundary scoping to all RAG routes
router.use(authenticate);
router.use(enforceTenantScope);

/**
 * POST /api/v1/rag/query
 * Execute a single-turn RAG search and grounded answer generation query.
 */
router.post(
  '/query',
  requirePermission('chat:use'),
  validate(ragValidation.ragQuery),
  ragController.query
);

/**
 * POST /api/v1/rag/chat
 * Execute a multi-turn conversational RAG query with conversation history.
 */
router.post(
  '/chat',
  requirePermission('chat:use'),
  validate(ragValidation.ragChat),
  ragController.chat
);

module.exports = router;
