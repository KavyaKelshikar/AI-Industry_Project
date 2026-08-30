const AuthService = require('../services/authService');
const { successResponse } = require('../utils/responseHelper');
const { getRefreshTokenCookieOptions } = require('../utils/token');

/**
 * POST /api/v1/auth/register
 * Register a new tenant company and the initial Company Administrator.
 */
const register = async (req, res, next) => {
  try {
    const { companyName, companySlug, companyCode, companyEmail, email, password, name, address, logo } = req.body;
    const device = req.headers['user-agent'] || null;

    const result = await AuthService.register({
      companyName,
      companySlug,
      companyCode,
      companyEmail,
      email,
      password,
      name,
      address,
      logo,
      device,
    });

    // Set secure HttpOnly cookie for refresh token
    res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());

    const responseData = {
      user: result.user,
      company: result.company,
      accessToken: result.accessToken,
    };

    // Include refresh token in response body during development/test only
    if (process.env.NODE_ENV !== 'production') {
      responseData.refreshToken = result.refreshToken;
    }

    return successResponse(res, responseData, 'Company and Administrator registered successfully', 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/auth/login
 * Authenticate user credentials and return tokens.
 */
const login = async (req, res, next) => {
  try {
    const { email, password, companySlug, companyCode } = req.body;
    const device = req.headers['user-agent'] || null;

    const result = await AuthService.login({
      email,
      password,
      companySlug,
      companyCode,
      device,
    });

    // Set secure HttpOnly cookie for refresh token
    res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());

    const responseData = {
      user: result.user,
      accessToken: result.accessToken,
    };

    // Include refresh token in response body during development/test only
    if (process.env.NODE_ENV !== 'production') {
      responseData.refreshToken = result.refreshToken;
    }

    return successResponse(res, responseData, 'Login successful', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/auth/refresh-token
 * Rotate refresh token and return new access token.
 */
const refreshToken = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const device = req.headers['user-agent'] || null;

    const result = await AuthService.refreshTokens({
      rawRefreshToken,
      device,
    });

    // Set rotated secure HttpOnly cookie for new refresh token
    res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());

    const responseData = {
      accessToken: result.accessToken,
    };

    if (process.env.NODE_ENV !== 'production') {
      responseData.refreshToken = result.refreshToken;
    }

    return successResponse(res, responseData, 'Token refreshed successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 * Revoke refresh token and clear cookie.
 */
const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const userId = req.user?.id;

    await AuthService.logout({
      userId,
      rawRefreshToken,
    });

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });

    return successResponse(res, null, 'Logged out successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/auth/me
 * Return authenticated user profile and permissions.
 */
const getMe = async (req, res, next) => {
  try {
    const userProfile = await AuthService.getMe(req.user.id);
    return successResponse(res, userProfile, 'Profile retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
};
