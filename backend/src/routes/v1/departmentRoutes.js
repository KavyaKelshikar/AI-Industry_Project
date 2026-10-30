const express = require('express');
const departmentController = require('../../controllers/departmentController');
const { authenticate } = require('../../middlewares/auth');
const { enforceTenantScope } = require('../../middlewares/tenant');
const { requireAnyPermission } = require('../../middlewares/authorize');

const router = express.Router();

router.use(authenticate);
router.use(enforceTenantScope);

router.get(
  '/',
  requireAnyPermission('departments:read', 'departments:manage', 'employees:read'),
  departmentController.listDepartments
);

router.post(
  '/',
  requireAnyPermission('departments:create', 'departments:manage'),
  departmentController.createDepartment
);

router.get(
  '/:id',
  requireAnyPermission('departments:read', 'departments:manage'),
  departmentController.getDepartment
);

router.put(
  '/:id',
  requireAnyPermission('departments:update', 'departments:manage'),
  departmentController.updateDepartment
);

router.delete(
  '/:id',
  requireAnyPermission('departments:delete', 'departments:manage'),
  departmentController.deleteDepartment
);

module.exports = router;
