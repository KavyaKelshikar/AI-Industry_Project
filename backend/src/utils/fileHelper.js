const fs = require('fs');
const path = require('path');

/**
 * File system manipulation helpers
 */

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath 
 */
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Safely delete a file if it exists
 * @param {string} filePath 
 */
const safeDeleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Ignore errors during safe delete
  }
};

module.exports = {
  ensureDirectoryExists,
  safeDeleteFile,
};
