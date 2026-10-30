const Role = require('../models/Role');
const Permission = require('../models/Permission');
const { AppError } = require('../utils/errorHandler');
const { successResponse, errorCodes } = require('../utils/responseHelper');

/**
 * GET /api/v1/roles
 * List roles applicable to current tenant (system default roles + tenant custom roles)
 */
const listRoles = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const companyId = scope.companyId || req.user.companyId;

    const roles = await Role.find({
      $or: [{ companyId: null }, { companyId }],
      status: 'active',
    })
      .populate('permissionIds', 'code module action displayName description')
      .sort({ companyId: 1, name: 1 })
      .lean();

    return successResponse(res, roles, 'Roles retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/roles/permissions
 * List all available system permissions
 */
const listPermissions = async (req, res, next) => {
  try {
    const permissions = await Permission.find({}).sort({ module: 1, action: 1 }).lean();
    return successResponse(res, permissions, 'Permissions retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/roles
 * Create a custom company role
 */
const createRole = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const companyId = scope.companyId || req.user.companyId;
    const { name, description, permissionIds } = req.body;

    if (!name || !name.trim()) {
      throw new AppError(400, 'Role name is required', true, errorCodes.INVALID_INPUT);
    }

    const existing = await Role.findOne({
      companyId,
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
    });
    if (existing) {
      throw new AppError(409, `Role with name '${name.trim()}' already exists`, true, errorCodes.CONFLICT);
    }

    const role = await Role.create({
      companyId,
      name: name.trim(),
      description: description ? description.trim() : '',
      permissionIds: Array.isArray(permissionIds) ? permissionIds : [],
      status: 'active',
    });

    const populated = await Role.findById(role._id).populate('permissionIds', 'code displayName');
    return successResponse(res, populated, 'Custom role created successfully', 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/roles/:id
 * Retrieve a specific role
 */
const getRole = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const companyId = scope.companyId || req.user.companyId;

    const role = await Role.findOne({
      _id: req.params.id,
      $or: [{ companyId: null }, { companyId }],
    })
      .populate('permissionIds', 'code module action displayName')
      .lean();

    if (!role) {
      throw new AppError(404, 'Role not found', true, errorCodes.NOT_FOUND);
    }

    return successResponse(res, role, 'Role details retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/v1/roles/:id
 * Update custom role
 */
const updateRole = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const companyId = scope.companyId || req.user.companyId;

    const role = await Role.findOne({
      _id: req.params.id,
      companyId, // cannot modify system-wide roles (companyId: null)
    });

    if (!role) {
      throw new AppError(404, 'Custom role not found or cannot be modified', true, errorCodes.NOT_FOUND);
    }

    const { name, description, permissionIds, status } = req.body;

    if (name && name.trim()) {
      const dup = await Role.findOne({
        _id: { $ne: role._id },
        companyId,
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
      });
      if (dup) {
        throw new AppError(409, `Role with name '${name.trim()}' already exists`, true, errorCodes.CONFLICT);
      }
      role.name = name.trim();
    }

    if (description !== undefined) role.description = description.trim();
    if (Array.isArray(permissionIds)) role.permissionIds = permissionIds;
    if (status && ['active', 'inactive'].includes(status)) role.status = status;

    await role.save();
    const updated = await Role.findById(role._id).populate('permissionIds', 'code displayName');
    return successResponse(res, updated, 'Role updated successfully', 200);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listRoles,
  listPermissions,
  createRole,
  getRole,
  updateRole,
};
