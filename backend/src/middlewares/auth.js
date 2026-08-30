const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/token');
const UserRepository = require('../repositories/UserRepository');
const errorCodes = require('../utils/errorCodes');

/**
 * Authentication middleware.
 * Verifies access JWT, checks user and tenant status, and attaches authenticated user context to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new AppError(401, 'Authentication token required', true, errorCodes.UNAUTHORIZED));
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError(401, 'Access token has expired', true, errorCodes.UNAUTHORIZED));
      }
      return next(new AppError(401, 'Invalid access token', true, errorCodes.UNAUTHORIZED));
    }

    if (!decoded || !decoded.id) {
      return next(new AppError(401, 'Malformed token payload', true, errorCodes.UNAUTHORIZED));
    }

    const user = await UserRepository.findByIdWithAuth(decoded.id);
    if (!user) {
      return next(new AppError(401, 'User account no longer exists', true, errorCodes.UNAUTHORIZED));
    }

    if (user.status !== 'active') {
      return next(new AppError(401, 'User account is inactive or suspended', true, errorCodes.UNAUTHORIZED));
    }

    // Check company status if user is affiliated with a company
    if (user.companyId) {
      const company = user.companyId;
      if (company.status && company.status !== 'active') {
        return next(new AppError(401, 'Company account is inactive or suspended', true, errorCodes.UNAUTHORIZED));
      }
    }

    // Extract flat list of permission codes
    let permissions = [];
    if (user.roleId && Array.isArray(user.roleId.permissionIds)) {
      permissions = user.roleId.permissionIds.map((p) => p.code || p.name).filter(Boolean);
    }

    req.user = {
      id: user._id.toString(),
      companyId: user.companyId ? user.companyId._id.toString() : null,
      departmentId: user.departmentId ? user.departmentId._id.toString() : null,
      roleId: user.roleId ? user.roleId._id.toString() : null,
      role: user.roleId ? user.roleId.name : null,
      permissions,
      email: user.email,
      name: user.name,
      employeeId: user.employeeId || null,
    };

    req.companyId = req.user.companyId;

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  authenticate,
};
