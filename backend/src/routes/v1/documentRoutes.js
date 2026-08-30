const express = require('express');
const documentController = require('../../controllers/documentController');
const { authenticate } = require('../../middlewares/auth');
const { enforceTenantScope } = require('../../middlewares/tenant');
const { requireAnyPermission } = require('../../middlewares/authorize');
const validate = require('../../middlewares/validate');
const { documentValidation } = require('../../validators');

const router = express.Router();

// Apply authentication and strict tenant boundary scoping to all document routes
router.use(authenticate);
router.use(enforceTenantScope);

/**
 * GET /api/v1/documents/stats
 * Aggregate metrics for documents and vector indexing
 */
router.get(
  '/stats',
  requireAnyPermission('documents:read', 'documents:process', 'documents:manage'),
  documentController.getDocumentStats
);

/**
 * GET /api/v1/documents
 * List tenant documents with filtering, search, and pagination
 */
router.get(
  '/',
  requireAnyPermission('documents:read', 'documents:process', 'documents:manage'),
  validate(documentValidation.listDocuments),
  documentController.listDocuments
);

/**
 * POST /api/v1/documents/batch-process
 * Batch process all pending documents for a specific Knowledge Source
 */
router.post(
  '/batch-process',
  requireAnyPermission('documents:process', 'documents:upload', 'documents:manage'),
  validate(documentValidation.batchProcess),
  documentController.batchProcess
);

/**
 * GET /api/v1/documents/:id
 * Retrieve a single document and its processing metrics
 */
router.get(
  '/:id',
  requireAnyPermission('documents:read', 'documents:process', 'documents:manage'),
  validate(documentValidation.getDocument),
  documentController.getDocument
);

/**
 * POST /api/v1/documents/:id/process
 * Trigger AI vector ingestion or retry for a document
 */
router.post(
  '/:id/process',
  requireAnyPermission('documents:process', 'documents:upload', 'documents:manage'),
  validate(documentValidation.processDocument),
  documentController.processDocument
);

/**
 * DELETE /api/v1/documents/:id
 * Delete a document and purge its vectors from ChromaDB
 */
router.delete(
  '/:id',
  requireAnyPermission('documents:delete', 'documents:manage'),
  validate(documentValidation.deleteDocument),
  documentController.deleteDocument
);

module.exports = router;
