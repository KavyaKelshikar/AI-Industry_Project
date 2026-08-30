const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const objectId = Joi.string()
  .pattern(objectIdPattern)
  .messages({ 'string.pattern.base': 'Must be a valid 24-character hexadecimal ObjectId' });

const createEmployee = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(2).max(150).required().messages({
      'any.required': 'Employee name is required',
    }),
    email: Joi.string().trim().lowercase().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Employee email address is required',
    }),
    password: Joi.string().min(8).max(128).optional().messages({
      'string.min': 'Password must be at least 8 characters long',
    }),
    employeeId: Joi.string().trim().max(50).allow('', null).optional(),
    departmentId: objectId.allow(null).optional(),
    roleId: objectId.required().messages({
      'any.required': 'Role ID is required',
    }),
    status: Joi.string().valid('active', 'inactive').default('active'),
    companyId: objectId.allow(null).optional(),
  }),
};

const updateEmployee = {
  params: Joi.object().keys({
    id: objectId.required().messages({
      'any.required': 'Employee ID is required in URL parameter',
    }),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim().min(2).max(150).optional(),
      email: Joi.string().trim().lowercase().email().optional(),
      employeeId: Joi.string().trim().max(50).allow('', null).optional(),
      departmentId: objectId.allow(null).optional(),
      roleId: objectId.optional(),
      status: Joi.string().valid('active', 'inactive').optional(),
      companyId: objectId.allow(null).optional(),
    })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update',
    }),
};

const getEmployee = {
  params: Joi.object().keys({
    id: objectId.required().messages({
      'any.required': 'Employee ID is required in URL parameter',
    }),
  }),
};

const deleteEmployee = {
  params: Joi.object().keys({
    id: objectId.required().messages({
      'any.required': 'Employee ID is required in URL parameter',
    }),
  }),
};

const employeeStatusAction = {
  params: Joi.object().keys({
    id: objectId.required().messages({
      'any.required': 'Employee ID is required in URL parameter',
    }),
  }),
};

const listEmployees = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().allow('', null).optional(),
    departmentId: objectId.optional(),
    roleId: objectId.optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    sort: Joi.string().trim().optional(),
    companyId: objectId.optional(),
  }),
};

module.exports = {
  createEmployee,
  updateEmployee,
  getEmployee,
  deleteEmployee,
  employeeStatusAction,
  listEmployees,
};
