const express = require('express');
const auditLogController = require('../../controllers/auditLogController');
const { authenticate } = require('../../middlewares/auth');
const { enforceTenantScope } = require('../../middlewares/tenant');
const { requireAnyPermission } = require('../../middlewares/authorize');

const router = express.Router();

router.use(authenticate);
router.use(enforceTenantScope);

router.get(
  '/',
  requireAnyPermission('audit-logs:read', 'settings:manage'),
  auditLogController.listAuditLogs
);

module.exports = router;
