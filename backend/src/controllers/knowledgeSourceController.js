const KnowledgeSourceService = require('../services/knowledgeSourceService');
const { successResponse } = require('../utils/responseHelper');

/**
 * GET /api/v1/knowledge-sources/stats
 * Aggregate metrics for knowledge sources within verified tenant scope.
 */
const getSourceStats = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const stats = await KnowledgeSourceService.getSourceStats(scope);
    return successResponse(res, stats, 'Knowledge source metrics retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/knowledge-sources
 * List knowledge sources within verified tenant scope with pagination and filtering.
 */
const listSources = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const queryOptions = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      type: req.query.type,
      status: req.query.status,
      sort: req.query.sort,
    };

    const result = await KnowledgeSourceService.listSources(scope, queryOptions);
    // Sanitize each source in the list
    const sanitizedItems = result.items.map((s) => KnowledgeSourceService._sanitizeSource(s));
    return successResponse(
      res,
      { items: sanitizedItems, pagination: result.pagination },
      'Knowledge sources retrieved successfully',
      200
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/knowledge-sources/:id
 * Retrieve a single knowledge source.
 */
const getSource = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const source = await KnowledgeSourceService.getSourceById(req.params.id, scope);
    return successResponse(res, source, 'Knowledge source retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/knowledge-sources
 * Create a new knowledge source.
 */
const createSource = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const source = await KnowledgeSourceService.createSource(req.body, scope, req.user);
    return successResponse(res, source, 'Knowledge source created successfully', 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/knowledge-sources/:id
 * Update an existing knowledge source.
 */
const updateSource = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const source = await KnowledgeSourceService.updateSource(req.params.id, req.body, scope, req.user);
    return successResponse(res, source, 'Knowledge source updated successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/v1/knowledge-sources/:id
 * Delete a knowledge source.
 */
const deleteSource = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const result = await KnowledgeSourceService.deleteSource(req.params.id, scope);
    return successResponse(res, result, 'Knowledge source deleted successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/knowledge-sources/:id/sync
 * Trigger sync for a knowledge source.
 */
const syncSource = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const result = await KnowledgeSourceService.syncSource(req.params.id, scope, req.user);
    return successResponse(res, result, 'Knowledge source sync completed', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/knowledge-sources/:id/activate
 * Activate a knowledge source.
 */
const activateSource = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const source = await KnowledgeSourceService.activateSource(req.params.id, scope);
    return successResponse(res, source, 'Knowledge source activated successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/knowledge-sources/:id/deactivate
 * Deactivate a knowledge source.
 */
const deactivateSource = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const source = await KnowledgeSourceService.deactivateSource(req.params.id, scope);
    return successResponse(res, source, 'Knowledge source deactivated successfully', 200);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSourceStats,
  listSources,
  getSource,
  createSource,
  updateSource,
  deleteSource,
  syncSource,
  activateSource,
  deactivateSource,
};
