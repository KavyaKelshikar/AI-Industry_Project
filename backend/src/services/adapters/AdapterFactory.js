const LocalFolderAdapter = require('./LocalFolderAdapter');
const AppError = require('../../utils/AppError');
const errorCodes = require('../../utils/errorCodes');

/**
 * AdapterFactory — Module 9.
 *
 * Returns the correct source adapter for a given KnowledgeSource document.
 * Future adapters are not implemented; requesting one throws a clear error.
 */

const IMPLEMENTED_ADAPTERS = ['local_folder'];

const FUTURE_ADAPTERS = [
  'google_drive',
  'onedrive',
  'sharepoint',
  'dropbox',
  's3',
  'azure_blob',
  'smb',
  'custom',
];

/**
 * Create an adapter instance for the given knowledge source.
 *
 * @param {Object} source – KnowledgeSource document
 * @returns {BaseSourceAdapter}
 */
const createAdapter = (source) => {
  if (!source || !source.type) {
    throw new AppError(400, 'Source type is required to create an adapter', true, errorCodes.BAD_REQUEST);
  }

  switch (source.type) {
    case 'local_folder':
      return new LocalFolderAdapter(source);

    case 'uploaded_file':
      // uploaded_file sources are managed through the existing document upload pipeline
      // and do not need a scan adapter — sync is not applicable
      throw new AppError(
        400,
        'Uploaded file sources do not support sync operations',
        true,
        errorCodes.BAD_REQUEST
      );

    default:
      if (FUTURE_ADAPTERS.includes(source.type)) {
        throw new AppError(
          501,
          `The ${source.type} connector is not yet implemented. This feature is planned for a future release.`,
          true,
          errorCodes.CONNECTOR_NOT_IMPLEMENTED
        );
      }
      throw new AppError(
        400,
        `Unknown source type: ${source.type}`,
        true,
        errorCodes.BAD_REQUEST
      );
  }
};

/**
 * Check whether a source type has a working adapter.
 * @param {string} type
 * @returns {boolean}
 */
const isAdapterImplemented = (type) => IMPLEMENTED_ADAPTERS.includes(type);

module.exports = {
  createAdapter,
  isAdapterImplemented,
  IMPLEMENTED_ADAPTERS,
  FUTURE_ADAPTERS,
};
