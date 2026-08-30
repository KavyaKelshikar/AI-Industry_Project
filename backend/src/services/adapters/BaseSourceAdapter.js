/**
 * BaseSourceAdapter — Module 9.
 *
 * Abstract base class that defines the interface every knowledge source
 * adapter must implement.  Concrete adapters (LocalFolderAdapter, future
 * GoogleDriveAdapter, etc.) extend this class.
 */
class BaseSourceAdapter {
  /**
   * @param {Object} source – the KnowledgeSource document from MongoDB
   */
  constructor(source) {
    if (new.target === BaseSourceAdapter) {
      throw new Error('BaseSourceAdapter is abstract and cannot be instantiated directly');
    }
    this.source = source;
  }

  /**
   * Return the adapter type identifier.
   * @returns {string}
   */
  getAdapterType() {
    throw new Error('getAdapterType() must be implemented by subclass');
  }

  /**
   * Test whether the source is reachable / valid.
   * @returns {Promise<{ connected: boolean, message: string }>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by subclass');
  }

  /**
   * Discover and list files available from this source.
   * Returns an array of file descriptors.
   *
   * @returns {Promise<Array<{
   *   filename: string,
   *   relativePath: string,
   *   absolutePath: string,
   *   size: number,
   *   modifiedAt: Date,
   *   extension: string,
   * }>>}
   */
  async listFiles() {
    throw new Error('listFiles() must be implemented by subclass');
  }

  /**
   * Read a specific file from the source.
   * @param {Object} fileRef – a file descriptor returned by listFiles()
   * @returns {Promise<Buffer>}
   */
  async readFile(fileRef) {
    throw new Error('readFile() must be implemented by subclass');
  }
}

module.exports = BaseSourceAdapter;
