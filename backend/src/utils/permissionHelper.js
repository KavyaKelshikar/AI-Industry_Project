/**
 * Permission evaluation and hierarchy matching helper.
 */

/**
 * Check if a single user permission satisfies a required permission.
 * Hierarchy:
 *  1. '*' -> matches everything
 *  2. '<module>:*' -> matches all actions under '<module>:<action>'
 *  3. '<module>:<action>' -> matches exact '<module>:<action>'
 *
 * @param {string} userPermission - Permission assigned to the user
 * @param {string} requiredPermission - Required permission for the resource/action
 * @returns {boolean}
 */
const matchPermission = (userPermission, requiredPermission) => {
  if (!userPermission || !requiredPermission) return false;

  const uPerm = userPermission.toLowerCase().trim();
  const rPerm = requiredPermission.toLowerCase().trim();

  // 1. Global wildcard
  if (uPerm === '*') return true;

  // 2. Exact match
  if (uPerm === rPerm) return true;

  // 3. Module-level wildcard (e.g. 'documents:*' matches 'documents:read')
  if (uPerm.endsWith(':*')) {
    const userModule = uPerm.slice(0, -2);
    const requiredModule = rPerm.split(':')[0];
    if (userModule === requiredModule) return true;
  }

  return false;
};

/**
 * Check if a user's permissions array satisfies ALL required permissions.
 *
 * @param {Array<string>} userPermissions - List of permissions held by user
 * @param {Array<string>|string} requiredPermissions - One or more permissions required
 * @returns {boolean}
 */
const hasPermission = (userPermissions = [], ...requiredPermissions) => {
  if (!Array.isArray(userPermissions) || userPermissions.length === 0) {
    return false;
  }

  // Flatten in case an array was passed as an argument
  const flatRequired = requiredPermissions.flat().filter(Boolean);
  if (flatRequired.length === 0) {
    return true; // No permissions required
  }

  // Global wildcard bypasses everything
  if (userPermissions.includes('*')) {
    return true;
  }

  // Every required permission must be matched by at least one user permission
  return flatRequired.every((reqPerm) =>
    userPermissions.some((userPerm) => matchPermission(userPerm, reqPerm))
  );
};

/**
 * Check if a user's permissions array satisfies ANY of the candidate permissions.
 *
 * @param {Array<string>} userPermissions - List of permissions held by user
 * @param {Array<string>|string} candidatePermissions - Candidate permissions
 * @returns {boolean}
 */
const hasAnyPermission = (userPermissions = [], ...candidatePermissions) => {
  if (!Array.isArray(userPermissions) || userPermissions.length === 0) {
    return false;
  }
  const flatCandidates = candidatePermissions.flat().filter(Boolean);
  if (flatCandidates.length === 0) return true;
  if (userPermissions.includes('*')) return true;

  return flatCandidates.some((candPerm) =>
    userPermissions.some((userPerm) => matchPermission(userPerm, candPerm))
  );
};

/**
 * Check if a user's role satisfies any of the allowed roles.
 * Super Admin is automatically allowed unless explicitly restricted.
 *
 * @param {string} userRole - User's role name
 * @param {Array<string>} allowedRoles - Allowed role names
 * @returns {boolean}
 */
const hasRole = (userRole, ...allowedRoles) => {
  if (!userRole) return false;

  const flatRoles = allowedRoles.flat().filter(Boolean);
  if (flatRoles.length === 0) return true;

  // Super Admin has global bypass
  if (userRole === 'Super Admin') return true;

  return flatRoles.includes(userRole);
};

module.exports = {
  matchPermission,
  hasPermission,
  hasAnyPermission,
  hasRole,
};
