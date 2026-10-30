const AuditLog = require('../models/AuditLog');
const { successResponse } = require('../utils/responseHelper');

/**
 * GET /api/v1/audit-logs
 * List company audit trail with pagination and filters
 */
const listAuditLogs = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const companyId = scope.companyId || req.user.companyId;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = { companyId };
    if (req.query.action) {
      filter.action = req.query.action;
    }
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    if (req.query.resource) {
      filter.resource = req.query.resource;
    }

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'name email employeeId')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return successResponse(
      res,
      {
        items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
      'Audit logs retrieved successfully',
      200
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listAuditLogs,
};
