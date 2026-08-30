const express = require('express');
const authController = require('../../controllers/authController');
const validate = require('../../middlewares/validate');
const { authValidation } = require('../../validators');
const { authenticate } = require('../../middlewares/auth');
const authRateLimiter = require('../../middlewares/authRateLimiter');

const router = express.Router();

router.post(
  '/register',
  authRateLimiter,
  validate(authValidation.register),
  authController.register
);

router.post(
  '/login',
  authRateLimiter,
  validate(authValidation.login),
  authController.login
);

router.post(
  '/refresh-token',
  authRateLimiter,
  validate(authValidation.refreshToken),
  authController.refreshToken
);

router.post('/logout', authenticate, authController.logout);

router.get('/me', authenticate, authController.getMe);

module.exports = router;
