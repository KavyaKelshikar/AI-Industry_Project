const Company = require('../models/Company');
const { AppError } = require('../utils/errorHandler');
const { successResponse, errorCodes } = require('../utils/responseHelper');

/**
 * GET /api/v1/company
 * Retrieve details for current tenant company
 */
const getCompany = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const companyId = scope.companyId || req.user.companyId;

    const company = await Company.findById(companyId).lean();
    if (!company) {
      throw new AppError(404, 'Company not found', true, errorCodes.NOT_FOUND);
    }

    return successResponse(res, company, 'Company details retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/v1/company
 * Update company profile and limits
 */
const updateCompany = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const companyId = scope.companyId || req.user.companyId;

    const company = await Company.findById(companyId);
    if (!company) {
      throw new AppError(404, 'Company not found', true, errorCodes.NOT_FOUND);
    }

    const { name, address, logo, settings } = req.body;
    if (name && name.trim()) company.name = name.trim();
    if (address !== undefined) company.address = address.trim();
    if (logo !== undefined) company.logo = logo.trim();
    if (settings && typeof settings === 'object') {
      company.settings = { ...company.settings, ...settings };
    }

    await company.save();
    return successResponse(res, company, 'Company profile updated successfully', 200);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCompany,
  updateCompany,
};
