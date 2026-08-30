const AppError = require('./AppError');
const errorCodes = require('./errorCodes');

/**
 * Check if the user has system-wide Super Admin privileges.
 * @param {object} reqUser - The verified req.user object
 * @returns {boolean}
 */
const isSuperAdmin = (reqUser) => {
  if (!reqUser) return false;
  return reqUser.role === 'Super Admin' || (!reqUser.companyId && reqUser.permissions?.includes('*'));
};

/**
 * Extract verified tenant scope for database repository operations.
 * Prevents client-side companyId manipulation and handles Super Admin scoping properly.
 *
 * @param {object} reqUser - The verified req.user object from authenticate
 * @param {string|null} targetCompanyId - Optional target company requested by client/query
 * @returns {object} - Repository scope query, e.g. { companyId: '...' } or {}
 */
const getTenantScope = (reqUser, targetCompanyId = null) => {
  if (!reqUser) {
    throw new AppError(401, 'Authentication required for tenant scoping', true, errorCodes.UNAUTHORIZED);
  }

  // 1. Super Admin handling
  if (isSuperAdmin(reqUser)) {
    if (targetCompanyId) {
      return { companyId: targetCompanyId };
    }
    // Global administrative query (unscoped)
    return {};
  }

  // 2. Regular tenant user handling
  if (!reqUser.companyId) {
    throw new AppError(403, 'User is not affiliated with a valid company tenant', true, errorCodes.FORBIDDEN);
  }

  // If a client explicitly supplied a companyId (in body, query, or params), verify it matches
  if (targetCompanyId && String(targetCompanyId) !== String(reqUser.companyId)) {
    throw new AppError(
      403,
      'Cross-tenant access forbidden: requested company does not match authenticated tenant',
      true,
      errorCodes.TENANT_MISMATCH
    );
  }

  // Strictly enforce authenticated user's companyId
  return { companyId: reqUser.companyId };
};

/**
 * Validate that a resource belongs to the authenticated user's tenant.
 *
 * @param {string|object} resourceCompanyId - The companyId on the retrieved document
 * @param {object} reqUser - The verified req.user object
 * @returns {boolean}
 */
const validateTenantOwnership = (resourceCompanyId, reqUser) => {
  if (!reqUser) return false;
  if (isSuperAdmin(reqUser)) return true;
  if (!resourceCompanyId || !reqUser.companyId) return false;

  const resCompId = resourceCompanyId._id
    ? resourceCompanyId._id.toString()
    : resourceCompanyId.toString();

  return resCompId === reqUser.companyId.toString();
};

module.exports = {
  isSuperAdmin,
  getTenantScope,
  validateTenantOwnership,
};
