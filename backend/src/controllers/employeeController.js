const EmployeeService = require('../services/employeeService');
const { successResponse } = require('../utils/responseHelper');

/**
 * GET /api/v1/employees
 * List employees within verified tenant scope with pagination, search, and filtering.
 */
const listEmployees = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const queryOptions = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      departmentId: req.query.departmentId,
      roleId: req.query.roleId,
      status: req.query.status,
      sort: req.query.sort,
    };

    const result = await EmployeeService.listEmployees(scope, queryOptions);
    return successResponse(res, result, 'Employees retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/employees/stats
 * Overview metrics for employee counts within verified tenant scope.
 */
const getEmployeeStats = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const stats = await EmployeeService.getEmployeeStats(scope);
    return successResponse(res, stats, 'Employee metrics retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/employees/:id
 * Retrieve single employee details.
 */
const getEmployee = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const employee = await EmployeeService.getEmployeeById(req.params.id, scope);
    return successResponse(res, employee, 'Employee details retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/employees
 * Create/provision a new employee within company.
 */
const createEmployee = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const newEmployee = await EmployeeService.createEmployee(req.body, scope, req.user);
    return successResponse(res, newEmployee, 'Employee created successfully', 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/employees/:id
 * Update employee profile, role, or department.
 */
const updateEmployee = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const updated = await EmployeeService.updateEmployee(req.params.id, req.body, scope);
    return successResponse(res, updated, 'Employee updated successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/employees/:id/activate
 * Activate employee account.
 */
const activateEmployee = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const activated = await EmployeeService.activateEmployee(req.params.id, scope);
    return successResponse(res, activated, 'Employee activated successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/employees/:id/deactivate
 * Deactivate employee account and revoke active sessions.
 */
const deactivateEmployee = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const deactivated = await EmployeeService.deactivateEmployee(req.params.id, scope);
    return successResponse(res, deactivated, 'Employee deactivated successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/v1/employees/:id
 * Remove employee from company.
 */
const deleteEmployee = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const result = await EmployeeService.deleteEmployee(req.params.id, scope);
    return successResponse(res, result, 'Employee deleted successfully', 200);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listEmployees,
  getEmployeeStats,
  getEmployee,
  createEmployee,
  updateEmployee,
  activateEmployee,
  deactivateEmployee,
  deleteEmployee,
};
