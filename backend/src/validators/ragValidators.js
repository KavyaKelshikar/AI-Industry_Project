const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const objectId = Joi.string()
  .pattern(objectIdPattern)
  .messages({ 'string.pattern.base': 'Must be a valid 24-character hexadecimal ObjectId' });

const chatMessageSchema = Joi.object().keys({
  role: Joi.string().valid('user', 'assistant', 'system').required().messages({
    'any.only': 'Chat message role must be user, assistant, or system',
    'any.required': 'Chat message role is required',
  }),
  content: Joi.string().trim().min(1).max(2000).required().messages({
    'string.empty': 'Chat message content cannot be empty',
    'string.max': 'Chat message content cannot exceed 2000 characters',
    'any.required': 'Chat message content is required',
  }),
});

const ragQuery = {
  body: Joi.object().keys({
    query: Joi.string().trim().min(1).max(1000).required().messages({
      'string.empty': 'Search query cannot be empty',
      'string.max': 'Search query cannot exceed 1000 characters',
      'any.required': 'Search query is required',
    }),
    top_k: Joi.number().integer().min(1).max(20).default(5).messages({
      'number.min': 'top_k must be at least 1',
      'number.max': 'top_k cannot exceed 20',
    }),
    score_threshold: Joi.number().min(0.0).max(1.0).optional().messages({
      'number.min': 'score_threshold must be between 0.0 and 1.0',
      'number.max': 'score_threshold must be between 0.0 and 1.0',
    }),
    departmentId: objectId.optional(),
    category: Joi.string().trim().max(100).optional(),
    companyId: objectId.allow(null).optional(),
  }),
};

const ragChat = {
  body: Joi.object().keys({
    query: Joi.string().trim().min(1).max(1000).required().messages({
      'string.empty': 'Chat message cannot be empty',
      'string.max': 'Chat message cannot exceed 1000 characters',
      'any.required': 'Chat message is required',
    }),
    top_k: Joi.number().integer().min(1).max(20).default(5).messages({
      'number.min': 'top_k must be at least 1',
      'number.max': 'top_k cannot exceed 20',
    }),
    score_threshold: Joi.number().min(0.0).max(1.0).optional().messages({
      'number.min': 'score_threshold must be between 0.0 and 1.0',
      'number.max': 'score_threshold must be between 0.0 and 1.0',
    }),
    chat_history: Joi.array().items(chatMessageSchema).max(10).default([]).messages({
      'array.max': 'chat_history cannot exceed 10 messages',
    }),
    departmentId: objectId.optional(),
    category: Joi.string().trim().max(100).optional(),
    companyId: objectId.allow(null).optional(),
  }),
};

module.exports = {
  ragQuery,
  ragChat,
};
