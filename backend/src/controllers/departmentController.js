const Department = require('../models/Department');
const { AppError } = require('../utils/errorHandler');
const { successResponse, errorCodes } = require('../utils/responseHelper');

/**
 * GET /api/v1/departments
 * List company departments with optional status and search filtering
 */
const listDepartments = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const filter = { ...scope };

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.search && req.query.search.trim()) {
      filter.name = { $regex: req.query.search.trim(), $options: 'i' };
    }

    const departments = await Department.find(filter).sort({ name: 1 }).lean();
    return successResponse(res, departments, 'Departments retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/departments
 * Create a new department within company boundary
 */
const createDepartment = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      throw new AppError(400, 'Department name is required', true, errorCodes.INVALID_INPUT);
    }

    const companyId = scope.companyId || req.user.companyId;
    const existing = await Department.findOne({
      companyId,
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
    });
    if (existing) {
      throw new AppError(409, `Department with name '${name.trim()}' already exists`, true, errorCodes.CONFLICT);
    }

    const dept = await Department.create({
      companyId,
      name: name.trim(),
      description: description ? description.trim() : '',
      status: 'active',
      createdBy: req.user.id || req.user._id,
    });

    return successResponse(res, dept, 'Department created successfully', 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/departments/:id
 * Retrieve single department
 */
const getDepartment = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const dept = await Department.findOne({ _id: req.params.id, ...scope }).lean();
    if (!dept) {
      throw new AppError(404, 'Department not found', true, errorCodes.NOT_FOUND);
    }
    return successResponse(res, dept, 'Department retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/v1/departments/:id
 * Update department name, description, or status
 */
const updateDepartment = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const { name, description, status } = req.body;

    const dept = await Department.findOne({ _id: req.params.id, ...scope });
    if (!dept) {
      throw new AppError(404, 'Department not found', true, errorCodes.NOT_FOUND);
    }

    if (name && name.trim()) {
      const companyId = scope.companyId || req.user.companyId;
      const dup = await Department.findOne({
        _id: { $ne: dept._id },
        companyId,
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
      });
      if (dup) {
        throw new AppError(409, `Department with name '${name.trim()}' already exists`, true, errorCodes.CONFLICT);
      }
      dept.name = name.trim();
    }

    if (description !== undefined) {
      dept.description = description.trim();
    }
    if (status && ['active', 'inactive'].includes(status)) {
      dept.status = status;
    }

    await dept.save();
    return successResponse(res, dept, 'Department updated successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/v1/departments/:id
 * Soft delete or toggle department
 */
const deleteDepartment = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const dept = await Department.findOne({ _id: req.params.id, ...scope });
    if (!dept) {
      throw new AppError(404, 'Department not found', true, errorCodes.NOT_FOUND);
    }

    dept.status = 'inactive';
    await dept.save();
    return successResponse(res, { id: dept._id, status: dept.status }, 'Department deactivated successfully', 200);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listDepartments,
  createDepartment,
  getDepartment,
  updateDepartment,
  deleteDepartment,
};
