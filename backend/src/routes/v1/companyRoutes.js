const express = require('express');
const companyController = require('../../controllers/companyController');
const { authenticate } = require('../../middlewares/auth');
const { enforceTenantScope } = require('../../middlewares/tenant');
const { requireAnyPermission } = require('../../middlewares/authorize');

const router = express.Router();

router.use(authenticate);
router.use(enforceTenantScope);

router.get(
  '/',
  requireAnyPermission('companies:read', 'settings:manage'),
  companyController.getCompany
);

router.put(
  '/',
  requireAnyPermission('companies:update', 'settings:manage'),
  companyController.updateCompany
);

module.exports = router;
