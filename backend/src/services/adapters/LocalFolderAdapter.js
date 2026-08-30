const fs = require('fs');
const path = require('path');
const BaseSourceAdapter = require('./BaseSourceAdapter');
const {
  isWithinApprovedBoundary,
} = require('../../utils/knowledgeSourcePathSecurity');

/**
 * Default supported file extensions for document ingestion.
 */
const DEFAULT_SUPPORTED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt', '.csv', '.xls', '.xlsx',
  '.ppt', '.pptx', '.md', '.rtf', '.json', '.xml', '.html', '.htm',
];

/**
 * LocalFolderAdapter — Module 9.
 *
 * Scans an explicitly approved local directory for supported files.
 * Security invariant: every discovered file's real path must remain
 * within the approved directory boundary.
 */
class LocalFolderAdapter extends BaseSourceAdapter {
  constructor(source) {
    super(source);
    this.approvedPath = source.approvedPath;
    this.supportedExtensions = (source.supportedFileTypes && source.supportedFileTypes.length > 0)
      ? source.supportedFileTypes.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`).toLowerCase())
      : DEFAULT_SUPPORTED_EXTENSIONS;
  }

  getAdapterType() {
    return 'local_folder';
  }

  /**
   * Test connectivity — verify the approved directory still exists.
   */
  async testConnection() {
    try {
      if (!this.approvedPath) {
        return { connected: false, message: 'No approved path configured' };
      }
      if (!fs.existsSync(this.approvedPath)) {
        return { connected: false, message: 'Approved directory no longer exists' };
      }
      const stats = fs.statSync(this.approvedPath);
      if (!stats.isDirectory()) {
        return { connected: false, message: 'Approved path is not a directory' };
      }
      return { connected: true, message: 'Directory accessible' };
    } catch (err) {
      return { connected: false, message: 'Unable to access directory' };
    }
  }

  /**
   * Recursively discover files within the approved directory.
   * Only returns files that:
   *  1. Have a supported extension
   *  2. Resolve to a real path within the approved boundary
   */
  async listFiles() {
    const files = [];
    await this._scanDir(this.approvedPath, '', files);
    return files;
  }

  /**
   * Read file contents.
   * @param {Object} fileRef – file descriptor from listFiles()
   * @returns {Promise<Buffer>}
   */
  async readFile(fileRef) {
    const fullPath = path.resolve(this.approvedPath, fileRef.relativePath);

    // Re-verify boundary at read time
    if (!isWithinApprovedBoundary(fullPath, this.approvedPath)) {
      throw new Error('File is outside the approved directory boundary');
    }

    return fs.promises.readFile(fullPath);
  }

  /**
   * Recursive directory scanner.
   *
   * @param {string} dirPath – current directory
   * @param {string} relativeBase – relative path from approved root
   * @param {Array} results – accumulator
   * @private
   */
  async _scanDir(dirPath, relativeBase, results) {
    let entries;
    try {
      entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    } catch {
      // Skip directories we cannot read
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = relativeBase ? path.join(relativeBase, entry.name) : entry.name;

      // Boundary check: reject anything that escapes via symlink/junction
      if (!isWithinApprovedBoundary(fullPath, this.approvedPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this._scanDir(fullPath, relativePath, results);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (this.supportedExtensions.includes(ext)) {
          try {
            const stats = await fs.promises.stat(fullPath);
            results.push({
              filename: entry.name,
              relativePath: relativePath.replace(/\\/g, '/'),
              absolutePath: fullPath,
              size: stats.size,
              modifiedAt: stats.mtime,
              extension: ext,
            });
          } catch {
            // Skip files we cannot stat
          }
        }
      }
    }
  }
}

module.exports = LocalFolderAdapter;
