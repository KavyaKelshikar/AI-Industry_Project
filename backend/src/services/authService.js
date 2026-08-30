const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const errorCodes = require('../utils/errorCodes');
const logger = require('../utils/logger');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  parseExpiresInMs,
} = require('../utils/token');
const config = require('../config');

const UserRepository = require('../repositories/UserRepository');
const CompanyRepository = require('../repositories/CompanyRepository');
const RoleRepository = require('../repositories/RoleRepository');
const RefreshTokenRepository = require('../repositories/RefreshTokenRepository');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const Company = require('../models/Company');
const User = require('../models/User');

class AuthService {
  /**
   * Helper to ensure the default "Company Admin" role exists.
   */
  async _getOrCreateCompanyAdminRole(session = null) {
    let role = await Role.findOne({ name: 'Company Admin', companyId: null }).session(session);
    if (!role) {
      const allPermissions = await Permission.find({}).session(session);
      const permIds = allPermissions.map((p) => p._id);
      const created = await Role.create(
        [
          {
            name: 'Company Admin',
            description: 'Full administrative access for a specific company tenant.',
            companyId: null,
            permissionIds: permIds,
            status: 'active',
          },
        ],
        session ? { session } : {}
      );
      role = created[0];
    }
    return role;
  }

  /**
   * Register a new company and its initial Company Administrator.
   */
  async register({
    companyName,
    companySlug,
    companyCode,
    companyEmail = null,
    email,
    password,
    name,
    address = '',
    logo = '',
    device = null,
  }) {
    const cleanSlug = companySlug.toLowerCase().trim();
    const cleanCode = companyCode.toUpperCase().trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanCompEmail = companyEmail ? companyEmail.toLowerCase().trim() : cleanEmail;

    // 1. Uniqueness checks
    const existingSlug = await CompanyRepository.findBySlug(cleanSlug);
    if (existingSlug) {
      throw new AppError(409, 'A company with this slug already exists', true, errorCodes.BAD_REQUEST);
    }

    const existingCode = await CompanyRepository.findByCode(cleanCode);
    if (existingCode) {
      throw new AppError(409, 'A company with this company code already exists', true, errorCodes.BAD_REQUEST);
    }

    const adminRole = await this._getOrCreateCompanyAdminRole();

    // 2. Multi-tenant atomic creation
    // Support MongoDB transactions where available; fallback to explicit cleanup on standalone
    let company = null;
    let user = null;
    let session = null;

    try {
      if (mongoose.connection.client && mongoose.connection.client.topology && mongoose.connection.client.topology.description.type !== 'Single') {
        session = await mongoose.startSession();
        session.startTransaction();
      }
    } catch (err) {
      session = null;
    }

    try {
      const hashedPassword = await hashPassword(password);

      // Create company
      const companyData = {
        name: companyName.trim(),
        slug: cleanSlug,
        companyCode: cleanCode,
        email: cleanCompEmail,
        address: address ? address.trim() : '',
        logo: logo || '',
        status: 'active',
      };

      if (session) {
        const createdComp = await Company.create([companyData], { session });
        company = createdComp[0];

        const userData = {
          companyId: company._id,
          roleId: adminRole._id,
          name: name.trim(),
          email: cleanEmail,
          passwordHash: hashedPassword,
          status: 'active',
        };
        const createdUser = await User.create([userData], { session });
        user = createdUser[0];

        await session.commitTransaction();
      } else {
        // Fallback for standalone MongoDB
        company = await Company.create(companyData);
        try {
          user = await User.create({
            companyId: company._id,
            roleId: adminRole._id,
            name: name.trim(),
            email: cleanEmail,
            passwordHash: hashedPassword,
            status: 'active',
          });
        } catch (userErr) {
          // Explicit rollback of orphaned company
          await Company.findByIdAndDelete(company._id);
          if (userErr.code === 11000) {
            throw new AppError(409, 'User with this email already exists in this company', true, errorCodes.BAD_REQUEST);
          }
          throw userErr;
        }
      }
    } catch (err) {
      if (session) {
        await session.abortTransaction();
      }
      if (err instanceof AppError) throw err;
      if (err.code === 11000) {
        throw new AppError(409, 'Duplicate key constraint violation during registration', true, errorCodes.BAD_REQUEST);
      }
      throw err;
    } finally {
      if (session) {
        session.endSession();
      }
    }

    // 3. Issue Token Pair
    const tokenPayload = {
      id: user._id.toString(),
      companyId: company._id.toString(),
      roleId: adminRole._id.toString(),
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const tokenHash = hashToken(refreshToken);
    const maxAgeMs = parseExpiresInMs(config.jwt.refreshExpiresIn);
    const expiresAt = new Date(Date.now() + maxAgeMs);

    await RefreshTokenRepository.createToken({
      userId: user._id,
      companyId: company._id,
      tokenHash,
      expiresAt,
      device,
    });

    const populatedUser = await UserRepository.findByIdWithAuth(user._id);

    return {
      user: this._sanitizeUser(populatedUser),
      company: {
        id: company._id.toString(),
        name: company.name,
        slug: company.slug,
        companyCode: company.companyCode,
        email: company.email,
        status: company.status,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticate user with credentials and optional company scoping.
   */
  async login({ email, password, companySlug = null, companyCode = null, device = null }) {
    const cleanEmail = email.toLowerCase().trim();

    let targetCompany = null;
    let user = null;

    if (companySlug) {
      targetCompany = await CompanyRepository.findBySlug(companySlug);
      if (!targetCompany) {
        throw new AppError(401, 'Invalid company or credentials', true, errorCodes.UNAUTHORIZED);
      }
      user = await UserRepository.findByEmailAndCompany(cleanEmail, targetCompany._id, true);
    } else if (companyCode) {
      targetCompany = await CompanyRepository.findByCode(companyCode);
      if (!targetCompany) {
        throw new AppError(401, 'Invalid company or credentials', true, errorCodes.UNAUTHORIZED);
      }
      user = await UserRepository.findByEmailAndCompany(cleanEmail, targetCompany._id, true);
    } else {
      // Find all accounts matching this email across companies
      const matchingUsers = await UserRepository.findByEmail(cleanEmail, true);
      if (matchingUsers.length === 0) {
        throw new AppError(401, 'Invalid email or password', true, errorCodes.UNAUTHORIZED);
      }
      if (matchingUsers.length > 1) {
        throw new AppError(
          400,
          'Multiple accounts found for this email. Please specify companySlug or companyCode.',
          true,
          errorCodes.BAD_REQUEST
        );
      }
      user = matchingUsers[0];
    }

    if (!user) {
      throw new AppError(401, 'Invalid email or password', true, errorCodes.UNAUTHORIZED);
    }

    // Check user active status
    if (user.status !== 'active') {
      throw new AppError(401, 'Your account is inactive or suspended. Please contact support.', true, errorCodes.UNAUTHORIZED);
    }

    // Check company active status (if company-affiliated)
    if (user.companyId) {
      const comp = targetCompany || (await Company.findById(user.companyId).lean());
      if (!comp || comp.status !== 'active') {
        throw new AppError(401, 'Company account is inactive or suspended.', true, errorCodes.UNAUTHORIZED);
      }
    }

    // Verify password
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'Invalid email or password', true, errorCodes.UNAUTHORIZED);
    }

    // Generate Token Pair
    const tokenPayload = {
      id: user._id.toString(),
      companyId: user.companyId ? user.companyId.toString() : null,
      roleId: user.roleId ? user.roleId.toString() : null,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const tokenHash = hashToken(refreshToken);
    const maxAgeMs = parseExpiresInMs(config.jwt.refreshExpiresIn);
    const expiresAt = new Date(Date.now() + maxAgeMs);

    await RefreshTokenRepository.createToken({
      userId: user._id,
      companyId: user.companyId,
      tokenHash,
      expiresAt,
      device,
    });

    const populatedUser = await UserRepository.findByIdWithAuth(user._id);

    return {
      user: this._sanitizeUser(populatedUser),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotate refresh token and issue new token pair with reuse/theft detection.
   */
  async refreshTokens({ rawRefreshToken, device = null }) {
    if (!rawRefreshToken) {
      throw new AppError(401, 'Refresh token required', true, errorCodes.UNAUTHORIZED);
    }

    // 1. Verify token signature
    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch (err) {
      throw new AppError(401, 'Invalid or expired refresh token', true, errorCodes.UNAUTHORIZED);
    }

    // 2. Hash token to look up database record
    const incomingTokenHash = hashToken(rawRefreshToken);
    const tokenRecord = await RefreshTokenRepository.findByTokenHash(incomingTokenHash);

    if (!tokenRecord) {
      throw new AppError(401, 'Refresh token not recognized or already purged', true, errorCodes.UNAUTHORIZED);
    }

    // 3. REUSE DETECTION (Token Theft Mitigation)
    if (tokenRecord.revoked) {
      logger.warn(
        `[SECURITY WARNING] Revoked refresh token reuse detected for userId: ${tokenRecord.userId}. Revoking all sessions!`
      );
      // Immediately revoke all active tokens for this user across all devices
      await RefreshTokenRepository.revokeAllUserTokens(tokenRecord.userId);
      throw new AppError(
        401,
        'Revoked refresh token reuse detected. All sessions have been terminated for security. Please log in again.',
        true,
        errorCodes.UNAUTHORIZED
      );
    }

    // 4. Expiration check
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      throw new AppError(401, 'Refresh token has expired. Please log in again.', true, errorCodes.UNAUTHORIZED);
    }

    // 5. Verify user and tenant are still active
    const user = await UserRepository.findByIdWithAuth(tokenRecord.userId);
    if (!user || user.status !== 'active') {
      throw new AppError(401, 'User account is inactive or no longer exists', true, errorCodes.UNAUTHORIZED);
    }

    if (user.companyId && user.companyId.status && user.companyId.status !== 'active') {
      throw new AppError(401, 'Company account is inactive or suspended', true, errorCodes.UNAUTHORIZED);
    }

    // 6. Revoke the old token (Rotation)
    await RefreshTokenRepository.revokeToken(incomingTokenHash);

    // 7. Issue new token pair
    const tokenPayload = {
      id: user._id.toString(),
      companyId: user.companyId ? user.companyId._id.toString() : null,
      roleId: user.roleId ? user.roleId._id.toString() : null,
      email: user.email,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    const newTokenHash = hashToken(newRefreshToken);
    const maxAgeMs = parseExpiresInMs(config.jwt.refreshExpiresIn);
    const expiresAt = new Date(Date.now() + maxAgeMs);

    await RefreshTokenRepository.createToken({
      userId: user._id,
      companyId: user.companyId ? user.companyId._id : null,
      tokenHash: newTokenHash,
      expiresAt,
      device,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Log out and revoke a refresh token.
   */
  async logout({ userId, rawRefreshToken = null }) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await RefreshTokenRepository.revokeToken(tokenHash);
    } else if (userId) {
      await RefreshTokenRepository.revokeAllUserTokens(userId);
    }
    return { success: true };
  }

  /**
   * Get authenticated user profile with permissions and company metadata.
   */
  async getMe(userId) {
    const user = await UserRepository.findByIdWithAuth(userId);
    if (!user) {
      throw new AppError(404, 'User profile not found', true, errorCodes.NOT_FOUND);
    }
    return this._sanitizeUser(user);
  }

  /**
   * Format and sanitize user object to prevent leaking sensitive fields.
   */
  _sanitizeUser(user) {
    let permissions = [];
    if (user.roleId && Array.isArray(user.roleId.permissionIds)) {
      permissions = user.roleId.permissionIds.map((p) => p.code || p.name).filter(Boolean);
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      status: user.status,
      employeeId: user.employeeId || null,
      profilePicture: user.profilePicture || '',
      company: user.companyId
        ? {
            id: user.companyId._id ? user.companyId._id.toString() : user.companyId.toString(),
            name: user.companyId.name || '',
            slug: user.companyId.slug || '',
            companyCode: user.companyId.companyCode || '',
          }
        : null,
      department: user.departmentId
        ? {
            id: user.departmentId._id ? user.departmentId._id.toString() : user.departmentId.toString(),
            name: user.departmentId.name || '',
          }
        : null,
      role: user.roleId
        ? {
            id: user.roleId._id ? user.roleId._id.toString() : user.roleId.toString(),
            name: user.roleId.name || '',
          }
        : null,
      permissions,
      createdAt: user.createdAt,
    };
  }
}

module.exports = new AuthService();
