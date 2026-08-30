const crypto = require('crypto');

/**
 * UUID generation and validation helpers
 */

/**
 * Generates a random v4 UUID
 * @returns {string}
 */
const generateUUID = () => crypto.randomUUID();

/**
 * Validates if a string is a standard UUID
 * @param {string} uuid 
 * @returns {boolean}
 */
const isValidUUID = (uuid) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

module.exports = {
  generateUUID,
  isValidUUID,
};
