const express = require('express');
const employeeController = require('../../controllers/employeeController');
const { authenticate } = require('../../middlewares/auth');
const { enforceTenantScope } = require('../../middlewares/tenant');
const { requireAnyPermission } = require('../../middlewares/authorize');
const validate = require('../../middlewares/validate');
const { employeeValidation } = require('../../validators');

const router = express.Router();

// Apply authentication and strict tenant boundary scoping to all employee routes
router.use(authenticate);
router.use(enforceTenantScope);

/**
 * GET /api/v1/employees/stats
 * Overview metrics for employee counts
 */
router.get(
  '/stats',
  requireAnyPermission('employees:read', 'users:read', 'employees:manage'),
  employeeController.getEmployeeStats
);

/**
 * GET /api/v1/employees
 * List employees with search, filtering, and pagination
 */
router.get(
  '/',
  requireAnyPermission('employees:read', 'users:read', 'employees:manage'),
  validate(employeeValidation.listEmployees),
  employeeController.listEmployees
);

/**
 * GET /api/v1/employees/:id
 * Retrieve single employee details
 */
router.get(
  '/:id',
  requireAnyPermission('employees:read', 'users:read', 'employees:manage'),
  validate(employeeValidation.getEmployee),
  employeeController.getEmployee
);

/**
 * POST /api/v1/employees
 * Create/provision a new employee
 */
router.post(
  '/',
  requireAnyPermission('employees:create', 'users:create', 'employees:manage'),
  validate(employeeValidation.createEmployee),
  employeeController.createEmployee
);

/**
 * PATCH /api/v1/employees/:id
 * Update employee details, role, or department
 */
router.patch(
  '/:id',
  requireAnyPermission('employees:update', 'users:update', 'employees:manage'),
  validate(employeeValidation.updateEmployee),
  employeeController.updateEmployee
);

/**
 * PATCH /api/v1/employees/:id/activate
 * Activate employee account
 */
router.patch(
  '/:id/activate',
  requireAnyPermission('employees:update', 'users:update', 'employees:manage'),
  validate(employeeValidation.employeeStatusAction),
  employeeController.activateEmployee
);

/**
 * PATCH /api/v1/employees/:id/deactivate
 * Deactivate employee account
 */
router.patch(
  '/:id/deactivate',
  requireAnyPermission('employees:update', 'users:update', 'employees:manage'),
  validate(employeeValidation.employeeStatusAction),
  employeeController.deactivateEmployee
);

/**
 * DELETE /api/v1/employees/:id
 * Remove employee from company
 */
router.delete(
  '/:id',
  requireAnyPermission('employees:delete', 'users:delete', 'employees:manage'),
  validate(employeeValidation.deleteEmployee),
  employeeController.deleteEmployee
);

module.exports = router;
