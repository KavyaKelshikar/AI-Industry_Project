const rateLimit = require('express-rate-limit');
const config = require('../config');
const { errorResponse } = require('../utils/responseHelper');

/**
 * Strict rate limiter applied specifically to sensitive authentication endpoints
 * (POST /login, POST /register, POST /refresh-token).
 */
const authRateLimiter = rateLimit({
  windowMs: config.auth?.rateLimit?.windowMs || 15 * 60 * 1000, // 15 minutes default
  max: config.auth?.rateLimit?.max || 20, // 20 requests per windowMs default
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many authentication attempts. Please try again later.',
      429,
      'TOO_MANY_REQUESTS'
    );
  },
  skip: () => {
    // In test environment when explicitly disabled, allow tests to run rapidly
    return process.env.NODE_ENV === 'test' && process.env.ENABLE_AUTH_RATE_LIMIT !== 'true';
  },
});

module.exports = authRateLimiter;
