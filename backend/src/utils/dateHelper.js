/**
 * Date manipulation and formatting helpers
 */

/**
 * Checks if a given date string is valid
 * @param {string} dateString 
 * @returns {boolean}
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Returns current timestamp in ISO format
 * @returns {string}
 */
const nowISO = () => new Date().toISOString();

module.exports = {
  isValidDate,
  nowISO,
};
