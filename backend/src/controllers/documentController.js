const DocumentProcessingService = require('../services/documentProcessingService');
const { successResponse } = require('../utils/responseHelper');

/**
 * GET /api/v1/documents/stats
 * Aggregate metrics for document processing and vector storage.
 */
const getDocumentStats = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const stats = await DocumentProcessingService.getDocumentStats(scope);
    return successResponse(res, stats, 'Document processing metrics retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/documents
 * List documents with filtering, search, and pagination.
 */
const listDocuments = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const queryOptions = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      knowledgeSourceId: req.query.knowledgeSourceId,
      indexingStatus: req.query.indexingStatus,
      status: req.query.status,
      fileType: req.query.fileType,
      sort: req.query.sort,
    };

    const result = await DocumentProcessingService.listDocuments(scope, queryOptions);
    return successResponse(
      res,
      result,
      'Documents retrieved successfully',
      200
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/documents/:id
 * Retrieve a single document and its processing telemetry.
 */
const getDocument = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const doc = await DocumentProcessingService.getDocumentById(req.params.id, scope);
    return successResponse(res, doc, 'Document details retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/documents/:id/process
 * Trigger AI vector ingestion or retry for a document.
 */
const processDocument = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const processed = await DocumentProcessingService.processDocument(req.params.id, scope, req.user);
    return successResponse(res, processed, 'Document processed and indexed successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/documents/batch-process
 * Batch process all pending documents for a specific Knowledge Source.
 */
const batchProcess = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const result = await DocumentProcessingService.batchProcessPending(
      req.body.knowledgeSourceId,
      scope,
      req.user
    );
    return successResponse(res, result, 'Batch document processing completed', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/v1/documents/:id
 * Delete a document and purge its vectors from ChromaDB.
 */
const deleteDocument = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const result = await DocumentProcessingService.deleteDocument(req.params.id, scope);
    return successResponse(res, result, 'Document and associated vectors deleted successfully', 200);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getDocumentStats,
  listDocuments,
  getDocument,
  processDocument,
  batchProcess,
  deleteDocument,
};
