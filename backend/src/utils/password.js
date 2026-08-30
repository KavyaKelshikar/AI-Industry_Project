const bcrypt = require('bcryptjs');
const config = require('../config');

/**
 * Hash a plaintext password using bcrypt with configured salt rounds.
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} - Password hash
 */
const hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const saltRounds = config.auth?.bcryptSaltRounds || 10;
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
};

/**
 * Compare a plaintext password with a bcrypt hash.
 * @param {string} password - Plaintext password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if matching, false otherwise
 */
const comparePassword = async (password, hash) => {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
