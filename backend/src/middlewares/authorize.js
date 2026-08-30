const AppError = require('../utils/AppError');
const errorCodes = require('../utils/errorCodes');
const { hasPermission, hasAnyPermission, hasRole } = require('../utils/permissionHelper');
const { isSuperAdmin } = require('../utils/tenantHelper');

/**
 * Middleware that requires the authenticated user to hold specific permissions.
 *
 * @param  {...string} requiredPermissions - One or more permission codes required (e.g. 'documents:read')
 */
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required before permission check', true, errorCodes.UNAUTHORIZED));
    }

    const authorized = hasPermission(req.user.permissions, ...requiredPermissions);
    if (!authorized) {
      return next(
        new AppError(
          403,
          'Insufficient permissions to perform this action',
          true,
          errorCodes.INSUFFICIENT_PERMISSIONS
        )
      );
    }

    return next();
  };
};

/**
 * Middleware that requires the authenticated user to hold at least ONE of the candidate permissions.
 *
 * @param  {...string} candidatePermissions - Candidate permissions
 */
const requireAnyPermission = (...candidatePermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required before permission check', true, errorCodes.UNAUTHORIZED));
    }

    const authorized = hasAnyPermission(req.user.permissions, ...candidatePermissions);
    if (!authorized) {
      return next(
        new AppError(
          403,
          'Insufficient permissions to perform this action',
          true,
          errorCodes.INSUFFICIENT_PERMISSIONS
        )
      );
    }

    return next();
  };
};

/**
 * Middleware that requires the authenticated user to have one of the specified roles.
 * Super Admin is automatically permitted.
 *
 * @param  {...string} requiredRoles - One or more role names (e.g. 'Company Admin', 'Employee')
 */
const requireRole = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required before role check', true, errorCodes.UNAUTHORIZED));
    }

    const authorized = hasRole(req.user.role, ...requiredRoles);
    if (!authorized) {
      return next(
        new AppError(
          403,
          'Access forbidden for your current role',
          true,
          errorCodes.FORBIDDEN_ROLE
        )
      );
    }

    return next();
  };
};

/**
 * Middleware that enforces department-level access scoping.
 * Super Admin and Company Admin have company-wide access.
 * Regular employees must belong to the requested department.
 *
 * @param {string|Function} departmentExtractor - Parameter name or getter function for departmentId
 */
const requireDepartmentAccess = (departmentExtractor = 'departmentId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required before department check', true, errorCodes.UNAUTHORIZED));
    }

    // Super Admin and Company Admin can access all departments in the company
    if (isSuperAdmin(req.user) || req.user.role === 'Company Admin') {
      return next();
    }

    let targetDeptId = null;
    if (typeof departmentExtractor === 'function') {
      targetDeptId = departmentExtractor(req);
    } else {
      targetDeptId =
        (req.params && req.params[departmentExtractor]) ||
        (req.query && req.query[departmentExtractor]) ||
        (req.body && req.body[departmentExtractor]) ||
        null;
    }

    // If resource is department-specific, user must belong to that department
    if (targetDeptId && String(targetDeptId) !== String(req.user.departmentId)) {
      return next(
        new AppError(
          403,
          'Access denied: this resource is restricted to members of the specified department',
          true,
          errorCodes.DEPARTMENT_ACCESS_DENIED
        )
      );
    }

    return next();
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireDepartmentAccess,
};
