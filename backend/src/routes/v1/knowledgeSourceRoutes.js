const express = require('express');
const knowledgeSourceController = require('../../controllers/knowledgeSourceController');
const { authenticate } = require('../../middlewares/auth');
const { enforceTenantScope } = require('../../middlewares/tenant');
const { requireAnyPermission } = require('../../middlewares/authorize');
const validate = require('../../middlewares/validate');
const { knowledgeSourceValidation } = require('../../validators');

const router = express.Router();

// Apply authentication and strict tenant boundary scoping to all knowledge source routes
router.use(authenticate);
router.use(enforceTenantScope);

/**
 * GET /api/v1/knowledge-sources/stats
 * Aggregate metrics for knowledge sources
 */
router.get(
  '/stats',
  requireAnyPermission('knowledge-sources:read', 'knowledge-sources:manage'),
  knowledgeSourceController.getSourceStats
);

/**
 * GET /api/v1/knowledge-sources
 * List knowledge sources with search, filtering, and pagination
 */
router.get(
  '/',
  requireAnyPermission('knowledge-sources:read', 'knowledge-sources:manage'),
  validate(knowledgeSourceValidation.listSources),
  knowledgeSourceController.listSources
);

/**
 * GET /api/v1/knowledge-sources/:id
 * Retrieve a single knowledge source
 */
router.get(
  '/:id',
  requireAnyPermission('knowledge-sources:read', 'knowledge-sources:manage'),
  validate(knowledgeSourceValidation.getSource),
  knowledgeSourceController.getSource
);

/**
 * POST /api/v1/knowledge-sources
 * Create a new knowledge source
 */
router.post(
  '/',
  requireAnyPermission('knowledge-sources:create', 'knowledge-sources:manage'),
  validate(knowledgeSourceValidation.createSource),
  knowledgeSourceController.createSource
);

/**
 * PATCH /api/v1/knowledge-sources/:id
 * Update an existing knowledge source
 */
router.patch(
  '/:id',
  requireAnyPermission('knowledge-sources:update', 'knowledge-sources:manage'),
  validate(knowledgeSourceValidation.updateSource),
  knowledgeSourceController.updateSource
);

/**
 * DELETE /api/v1/knowledge-sources/:id
 * Delete a knowledge source
 */
router.delete(
  '/:id',
  requireAnyPermission('knowledge-sources:delete', 'knowledge-sources:manage'),
  validate(knowledgeSourceValidation.deleteSource),
  knowledgeSourceController.deleteSource
);

/**
 * POST /api/v1/knowledge-sources/:id/sync
 * Trigger sync for a knowledge source
 */
router.post(
  '/:id/sync',
  requireAnyPermission('knowledge-sources:sync', 'knowledge-sources:manage'),
  validate(knowledgeSourceValidation.syncSource),
  knowledgeSourceController.syncSource
);

/**
 * PATCH /api/v1/knowledge-sources/:id/activate
 * Activate a knowledge source
 */
router.patch(
  '/:id/activate',
  requireAnyPermission('knowledge-sources:update', 'knowledge-sources:manage'),
  validate(knowledgeSourceValidation.sourceStatusAction),
  knowledgeSourceController.activateSource
);

/**
 * PATCH /api/v1/knowledge-sources/:id/deactivate
 * Deactivate a knowledge source
 */
router.patch(
  '/:id/deactivate',
  requireAnyPermission('knowledge-sources:update', 'knowledge-sources:manage'),
  validate(knowledgeSourceValidation.sourceStatusAction),
  knowledgeSourceController.deactivateSource
);

module.exports = router;
