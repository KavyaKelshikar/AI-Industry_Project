const express = require('express');
const roleController = require('../../controllers/roleController');
const { authenticate } = require('../../middlewares/auth');
const { enforceTenantScope } = require('../../middlewares/tenant');
const { requireAnyPermission } = require('../../middlewares/authorize');

const router = express.Router();

router.use(authenticate);
router.use(enforceTenantScope);

router.get(
  '/',
  requireAnyPermission('roles:manage', 'employees:read', 'users:read'),
  roleController.listRoles
);

router.get(
  '/permissions',
  requireAnyPermission('roles:manage'),
  roleController.listPermissions
);

router.post(
  '/',
  requireAnyPermission('roles:manage'),
  roleController.createRole
);

router.get(
  '/:id',
  requireAnyPermission('roles:manage'),
  roleController.getRole
);

router.put(
  '/:id',
  requireAnyPermission('roles:manage'),
  roleController.updateRole
);

module.exports = router;
