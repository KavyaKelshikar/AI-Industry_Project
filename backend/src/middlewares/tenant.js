const AppError = require('../utils/AppError');
const errorCodes = require('../utils/errorCodes');
const { isSuperAdmin, getTenantScope } = require('../utils/tenantHelper');

/**
 * Enforce strict server-side tenant isolation.
 *
 * Prevents tenant manipulation via request body, query parameters, URL path parameters, or headers.
 * Injects verified `req.tenantScope` and `req.companyId` for use in controllers and repositories.
 */
const enforceTenantScope = (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required before tenant scoping', true, errorCodes.UNAUTHORIZED));
    }

    // Inspect any client-supplied companyId inputs
    const clientSuppliedCompanyId =
      (req.params && req.params.companyId) ||
      (req.query && req.query.companyId) ||
      (req.body && req.body.companyId) ||
      req.headers['x-company-id'] ||
      null;

    if (isSuperAdmin(req.user)) {
      // Super Admin can optionally target a specific company tenant, or operate globally
      req.tenantScope = getTenantScope(req.user, clientSuppliedCompanyId);
      req.companyId = clientSuppliedCompanyId || null;
      return next();
    }

    // Non-Super-Admin user: strictly enforce user's authenticated tenant
    if (clientSuppliedCompanyId && String(clientSuppliedCompanyId) !== String(req.user.companyId)) {
      return next(
        new AppError(
          403,
          'Cross-tenant access forbidden: manipulated companyId rejected',
          true,
          errorCodes.TENANT_MISMATCH
        )
      );
    }

    // Bind trusted server-side tenant scope
    req.tenantScope = { companyId: req.user.companyId };
    req.companyId = req.user.companyId;

    // Sanitize request body to prevent overriding companyId with spoofed values
    if (req.body && typeof req.body === 'object') {
      req.body.companyId = req.user.companyId;
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  enforceTenantScope,
};
