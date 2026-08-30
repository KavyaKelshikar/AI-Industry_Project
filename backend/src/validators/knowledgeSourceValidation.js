const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const objectId = Joi.string()
  .pattern(objectIdPattern)
  .messages({ 'string.pattern.base': 'Must be a valid 24-character hexadecimal ObjectId' });

/**
 * Allowed source type values for request validation.
 * Future connectors are included so the enum is validated on input,
 * but the service layer will reject unsupported types at runtime.
 */
const SOURCE_TYPES = [
  'uploaded_file',
  'local_folder',
  'google_drive',
  'onedrive',
  'sharepoint',
  'dropbox',
  's3',
  'azure_blob',
  'smb',
  'custom',
];

const SOURCE_STATUSES = ['active', 'inactive', 'syncing', 'error'];

// ── Request schemas ──

const createSource = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(2).max(200).required().messages({
      'any.required': 'Source name is required',
      'string.min': 'Source name must be at least 2 characters',
      'string.max': 'Source name must not exceed 200 characters',
    }),
    type: Joi.string()
      .valid(...SOURCE_TYPES)
      .required()
      .messages({
        'any.required': 'Source type is required',
        'any.only': `Source type must be one of: ${SOURCE_TYPES.join(', ')}`,
      }),
    description: Joi.string().trim().max(1000).allow('', null).optional(),
    configuration: Joi.object().optional().default({}),
    folderPath: Joi.string().trim().max(1000).allow('', null).optional(),
    supportedFileTypes: Joi.array().items(Joi.string().trim().lowercase()).optional(),
    // companyId is allowed in body for tenant middleware compatibility but always overridden
    companyId: objectId.allow(null).optional(),
  }),
};

const updateSource = {
  params: Joi.object().keys({
    id: objectId.required().messages({
      'any.required': 'Knowledge source ID is required',
    }),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim().min(2).max(200).optional(),
      description: Joi.string().trim().max(1000).allow('', null).optional(),
      configuration: Joi.object().optional(),
      folderPath: Joi.string().trim().max(1000).allow('', null).optional(),
      supportedFileTypes: Joi.array().items(Joi.string().trim().lowercase()).optional(),
      companyId: objectId.allow(null).optional(),
    })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update',
    }),
};

const getSource = {
  params: Joi.object().keys({
    id: objectId.required().messages({
      'any.required': 'Knowledge source ID is required',
    }),
  }),
};

const deleteSource = {
  params: Joi.object().keys({
    id: objectId.required().messages({
      'any.required': 'Knowledge source ID is required',
    }),
  }),
};

const syncSource = {
  params: Joi.object().keys({
    id: objectId.required().messages({
      'any.required': 'Knowledge source ID is required',
    }),
  }),
};

const sourceStatusAction = {
  params: Joi.object().keys({
    id: objectId.required().messages({
      'any.required': 'Knowledge source ID is required',
    }),
  }),
};

const listSources = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().allow('', null).optional(),
    type: Joi.string()
      .valid(...SOURCE_TYPES)
      .optional(),
    status: Joi.string()
      .valid(...SOURCE_STATUSES)
      .optional(),
    sort: Joi.string().trim().optional(),
    companyId: objectId.optional(),
  }),
};

module.exports = {
  createSource,
  updateSource,
  getSource,
  deleteSource,
  syncSource,
  sourceStatusAction,
  listSources,
};
