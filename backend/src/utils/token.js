const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

/**
 * Generate a short-lived access JWT token.
 * @param {object} payload - Claims to include in the access token
 * @returns {string} - Signed JWT access token
 */
const generateAccessToken = (payload) => {
  if (!config.jwt.secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn || '1h',
    }
  );
};

/**
 * Generate a long-lived refresh JWT token.
 * @param {object} payload - Claims to include in the refresh token
 * @returns {string} - Signed JWT refresh token
 */
const generateRefreshToken = (payload) => {
  if (!config.jwt.refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiresIn || '7d',
    }
  );
};

/**
 * Verify and decode an access JWT token.
 * @param {string} token - Access token
 * @returns {object} - Decoded payload
 */
const verifyAccessToken = (token) => {
  if (!config.jwt.secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.verify(token, config.jwt.secret);
};

/**
 * Verify and decode a refresh JWT token.
 * @param {string} token - Refresh token
 * @returns {object} - Decoded payload
 */
const verifyRefreshToken = (token) => {
  if (!config.jwt.refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }
  return jwt.verify(token, config.jwt.refreshSecret);
};

/**
 * Compute SHA-256 hash of a token for secure database storage.
 * @param {string} token - Raw token string
 * @returns {string} - Hex-encoded SHA-256 hash
 */
const hashToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Parse expiration string (e.g. '7d', '1h', '30m') to milliseconds.
 * @param {string} expiryStr
 * @returns {number}
 */
const parseExpiresInMs = (expiryStr) => {
  if (!expiryStr) return 7 * 24 * 60 * 60 * 1000;
  const match = expiryStr.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
};

/**
 * Options for setting the HttpOnly refresh token cookie.
 * @returns {object} - Express cookie options
 */
const getRefreshTokenCookieOptions = () => {
  const maxAgeMs = parseExpiresInMs(config.jwt.refreshExpiresIn);
  return {
    httpOnly: true,
    secure: config.auth?.cookie?.secure ?? (config.env === 'production'),
    sameSite: config.auth?.cookie?.sameSite || 'strict',
    path: '/api/v1/auth',
    maxAge: maxAgeMs,
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  parseExpiresInMs,
  getRefreshTokenCookieOptions,
};
