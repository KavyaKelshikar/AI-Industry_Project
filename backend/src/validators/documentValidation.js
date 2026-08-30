const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const objectId = Joi.string()
  .pattern(objectIdPattern)
  .messages({ 'string.pattern.base': 'Must be a valid 24-character hexadecimal ObjectId' });

const INDEXING_STATUSES = ['pending', 'processing', 'indexed', 'error'];
const DOCUMENT_STATUSES = ['pending', 'processing', 'pending_review', 'approved', 'rejected', 'error'];

const listDocuments = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().allow('', null).optional(),
    knowledgeSourceId: objectId.optional(),
    indexingStatus: Joi.string().valid(...INDEXING_STATUSES).optional(),
    status: Joi.string().valid(...DOCUMENT_STATUSES).optional(),
    fileType: Joi.string().trim().lowercase().optional(),
    sort: Joi.string().trim().optional(),
    companyId: objectId.optional(),
  }),
};

const getDocument = {
  params: Joi.object().keys({
    id: objectId.required().messages({
      'any.required': 'Document ID is required in URL parameter',
    }),
  }),
};

const processDocument = {
  params: Joi.object().keys({
    id: objectId.required().messages({
      'any.required': 'Document ID is required in URL parameter',
    }),
  }),
};

const batchProcess = {
  body: Joi.object().keys({
    knowledgeSourceId: objectId.required().messages({
      'any.required': 'Knowledge source ID is required for batch processing',
    }),
    companyId: objectId.allow(null).optional(),
  }),
};

const deleteDocument = {
  params: Joi.object().keys({
    id: objectId.required().messages({
      'any.required': 'Document ID is required in URL parameter',
    }),
  }),
};

module.exports = {
  listDocuments,
  getDocument,
  processDocument,
  batchProcess,
  deleteDocument,
};
