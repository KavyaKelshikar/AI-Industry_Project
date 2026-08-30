const Joi = require('joi');

const register = {
  body: Joi.object().keys({
    companyName: Joi.string().trim().min(2).max(100).required().messages({
      'any.required': 'Company name is required',
    }),
    companySlug: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .required()
      .messages({
        'string.pattern.base': 'Company slug must contain lowercase letters, numbers, and hyphens only',
        'any.required': 'Company slug is required',
      }),
    companyCode: Joi.string()
      .trim()
      .uppercase()
      .min(2)
      .max(20)
      .required()
      .messages({
        'any.required': 'Company code is required',
      }),
    companyEmail: Joi.string().trim().lowercase().email().optional(),
    name: Joi.string().trim().min(2).max(150).required().messages({
      'any.required': 'Administrator name is required',
    }),
    email: Joi.string().trim().lowercase().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email address is required',
    }),
    password: Joi.string().min(8).max(128).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required',
    }),
    address: Joi.string().trim().max(300).allow('', null).optional(),
    logo: Joi.string().trim().allow('', null).optional(),
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().trim().lowercase().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email address is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
    companySlug: Joi.string().trim().lowercase().optional(),
    companyCode: Joi.string().trim().uppercase().optional(),
  }),
};

const refreshToken = {
  body: Joi.object().keys({
    refreshToken: Joi.string().trim().optional(),
  }),
};

module.exports = {
  register,
  login,
  refreshToken,
};
