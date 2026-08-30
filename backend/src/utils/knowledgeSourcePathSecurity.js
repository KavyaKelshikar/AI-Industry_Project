const fs = require('fs');
const path = require('path');
const AppError = require('./AppError');
const errorCodes = require('./errorCodes');

/**
 * Knowledge Source Path Security — Module 9.
 *
 * Layered security for local-folder knowledge sources:
 *   1. Path normalisation and traversal detection
 *   2. Dangerous/system directory blocklist
 *   3. Real-path resolution (detects symlink escapes)
 *   4. Boundary enforcement (files must stay inside approved dir)
 *   5. Error sanitisation (never leak absolute paths or secrets)
 */

// ── Dangerous directory patterns ──
// These are matched against the normalised, lowercase, forward-slash path.
const DANGEROUS_PATH_PATTERNS = [
  // Windows system directories
  /^[a-z]:[/\\]windows/i,
  /^[a-z]:[/\\]program files/i,
  /^[a-z]:[/\\]program files \(x86\)/i,
  /^[a-z]:[/\\]programdata/i,
  /[/\\]system32/i,
  /[/\\]syswow64/i,
  // Windows root drives without a subdirectory
  /^[a-z]:[/\\]?$/i,
  // Unix system directories
  /^\/etc(\/|$)/,
  /^\/root(\/|$)/,
  /^\/var(\/|$)/,
  /^\/usr(\/|$)/,
  /^\/bin(\/|$)/,
  /^\/sbin(\/|$)/,
  /^\/boot(\/|$)/,
  /^\/dev(\/|$)/,
  /^\/proc(\/|$)/,
  /^\/sys(\/|$)/,
  /^\/tmp(\/|$)/,
  // Home directory roots (but not subdirectories selected by the admin)
  /^[a-z]:[/\\]users[/\\]?$/i,
  /^\/home[/\\]?$/,
  // Node/project internals
  /[/\\]node_modules(\/|$)/,
  /[/\\]\.git(\/|$)/,
  /[/\\]\.env/,
  /[/\\]\.ssh(\/|$)/,
];

/**
 * Check whether a resolved absolute path falls inside a dangerous location.
 * @param {string} resolvedPath
 * @returns {boolean}
 */
const isDangerousPath = (resolvedPath) => {
  const normalised = resolvedPath.replace(/\\/g, '/');
  return DANGEROUS_PATH_PATTERNS.some((pattern) => pattern.test(normalised));
};

/**
 * Detect path-traversal attempts in raw input.
 * @param {string} rawPath
 * @returns {boolean}
 */
const hasTraversal = (rawPath) => {
  if (!rawPath || typeof rawPath !== 'string') return true;
  const normalised = rawPath.replace(/\\/g, '/');
  // Reject explicit traversal sequences
  if (normalised.includes('..')) return true;
  // Reject null bytes
  if (rawPath.includes('\0')) return true;
  return false;
};

/**
 * Validate and resolve a local folder path submitted by the client.
 *
 * Returns the server-approved absolute path.  Throws an AppError on any
 * security violation.
 *
 * @param {string} rawPath – the user-submitted folder path
 * @returns {string} approved absolute path
 */
const validateLocalFolderPath = (rawPath) => {
  if (!rawPath || typeof rawPath !== 'string' || rawPath.trim().length === 0) {
    throw new AppError(400, 'Folder path is required', true, errorCodes.INVALID_SOURCE_PATH);
  }

  const trimmed = rawPath.trim();

  // 1. Traversal detection on raw input
  if (hasTraversal(trimmed)) {
    throw new AppError(
      400,
      'Path traversal is not allowed',
      true,
      errorCodes.PATH_TRAVERSAL_DETECTED
    );
  }

  // 2. Resolve to an absolute path
  const resolved = path.resolve(trimmed);

  // 3. Dangerous directory check
  if (isDangerousPath(resolved)) {
    throw new AppError(
      403,
      'Access to system or protected directories is not permitted',
      true,
      errorCodes.UNSAFE_DIRECTORY
    );
  }

  // 4. Verify path exists
  if (!fs.existsSync(resolved)) {
    throw new AppError(
      400,
      'The specified folder path does not exist on the server',
      true,
      errorCodes.INVALID_SOURCE_PATH
    );
  }

  // 5. Verify it is a directory
  const stats = fs.statSync(resolved);
  if (!stats.isDirectory()) {
    throw new AppError(
      400,
      'The specified path is not a directory',
      true,
      errorCodes.INVALID_SOURCE_PATH
    );
  }

  // 6. Resolve the real path (follows symlinks to detect escape)
  const realPath = fs.realpathSync(resolved);
  if (isDangerousPath(realPath)) {
    throw new AppError(
      403,
      'Symbolic link resolves to a protected directory',
      true,
      errorCodes.UNSAFE_DIRECTORY
    );
  }

  return realPath;
};

/**
 * Verify that a file's real path stays within the approved directory boundary.
 * Prevents symlink/junction escape attacks at scan time.
 *
 * @param {string} filePath – absolute path of discovered file
 * @param {string} approvedDir – the approved directory boundary
 * @returns {boolean}
 */
const isWithinApprovedBoundary = (filePath, approvedDir) => {
  try {
    const realFile = fs.realpathSync(filePath);
    const realDir = fs.realpathSync(approvedDir);
    // Both paths normalised with forward slashes for comparison
    const normFile = realFile.replace(/\\/g, '/').toLowerCase();
    const normDir = realDir.replace(/\\/g, '/').toLowerCase();
    // File's real path must start with the approved dir (plus separator or end)
    return normFile.startsWith(normDir + '/') || normFile === normDir;
  } catch {
    return false;
  }
};

/**
 * Sanitise an error message so it never exposes filesystem paths, credentials,
 * tokens, or other sensitive implementation details to the frontend.
 *
 * @param {Error|string} error
 * @returns {string}
 */
const sanitizeSyncError = (error) => {
  if (!error) return 'Unknown sync error';
  const raw = typeof error === 'string' ? error : error.message || 'Unknown error';

  // Strip anything that looks like an absolute path
  let sanitised = raw
    .replace(/[A-Z]:\\[^\s'"]+/gi, '[path]')
    .replace(/\/(?:home|usr|var|etc|tmp|root|mnt|opt)[^\s'""]*/gi, '[path]');

  // Strip anything that looks like a credential or token
  sanitised = sanitised
    .replace(/(?:password|secret|token|apikey|api_key|credential)[=:]\s*\S+/gi, '[redacted]')
    .replace(/Bearer\s+\S+/gi, '[redacted]');

  // Limit length
  if (sanitised.length > 500) {
    sanitised = sanitised.substring(0, 497) + '...';
  }

  return sanitised;
};

module.exports = {
  validateLocalFolderPath,
  isWithinApprovedBoundary,
  isDangerousPath,
  hasTraversal,
  sanitizeSyncError,
  DANGEROUS_PATH_PATTERNS,
};
