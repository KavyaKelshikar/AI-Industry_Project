const BaseRepository = require('./BaseRepository');
const User = require('../models/User');
require('../models/Company');
require('../models/Department');
require('../models/Role');
require('../models/Permission');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Find a user by email within a specific company (case-insensitive email).
   */
  async findByEmailAndCompany(email, companyId, includePassword = false) {
    if (!email || !companyId) return null;
    const query = {
      email: email.toLowerCase().trim(),
      companyId,
    };
    let q = this.model.findOne(query);
    if (includePassword) {
      q = q.select('+passwordHash');
    }
    return q.lean();
  }

  /**
   * Find all user accounts matching an email address across any company.
   */
  async findByEmail(email, includePassword = false) {
    if (!email) return [];
    let q = this.model.find({ email: email.toLowerCase().trim() });
    if (includePassword) {
      q = q.select('+passwordHash');
    }
    return q.lean();
  }

  /**
   * Find a user by ID with populated Role, Permissions, Company, and Department.
   */
  async findByIdWithAuth(userId) {
    if (!userId) return null;
    return this.model
      .findById(userId)
      .populate({
        path: 'roleId',
        populate: {
          path: 'permissionIds',
          model: 'Permission',
        },
      })
      .populate('companyId')
      .populate('departmentId')
      .lean();
  }

  /**
   * Find paginated employees matching company scope and optional search/filter criteria.
   *
   * @param {Object} scope - Tenant scope (e.g. { companyId: '...' } or {})
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<{ items: Array, pagination: Object }>}
   */
  async findEmployeesByCompany(scope = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      departmentId = null,
      roleId = null,
      status = null,
      sort = '-createdAt',
    } = options;

    const query = { ...scope };

    if (status) {
      query.status = status;
    }

    if (departmentId) {
      query.departmentId = departmentId;
    }

    if (roleId) {
      query.roleId = roleId;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { employeeId: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      this.model
        .find(query)
        .select('-passwordHash')
        .populate({
          path: 'roleId',
          select: 'name description status',
        })
        .populate({
          path: 'departmentId',
          select: 'name description status',
        })
        .populate({
          path: 'companyId',
          select: 'name slug companyCode',
        })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.model.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 0;

    return {
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages,
      },
    };
  }

  /**
   * Find a single employee by ID within trusted scope.
   */
  async findEmployeeById(id, scope = {}) {
    if (!id) return null;
    const scopedFilter = this.buildScopedFilter({ _id: id }, scope);
    return this.model
      .findOne(scopedFilter)
      .select('-passwordHash')
      .populate({
        path: 'roleId',
        select: 'name description permissionIds status',
        populate: {
          path: 'permissionIds',
          model: 'Permission',
          select: 'code module action name',
        },
      })
      .populate({
        path: 'departmentId',
        select: 'name description status',
      })
      .populate({
        path: 'companyId',
        select: 'name slug companyCode',
      })
      .lean();
  }

  /**
   * Create a new employee record.
   */
  async createEmployee(data, scope = {}) {
    const payload = this.buildScopedFilter(data, scope);
    const user = await this.model.create(payload);
    return this.findEmployeeById(user._id, scope);
  }

  /**
   * Update employee details.
   */
  async updateEmployee(id, updateData, scope = {}) {
    const scopedFilter = this.buildScopedFilter({ _id: id }, scope);
    await this.model.updateOne(scopedFilter, { $set: updateData });
    return this.findEmployeeById(id, scope);
  }

  /**
   * Activate employee account.
   */
  async activateEmployee(id, scope = {}) {
    return this.updateEmployee(id, { status: 'active' }, scope);
  }

  /**
   * Deactivate employee account.
   */
  async deactivateEmployee(id, scope = {}) {
    return this.updateEmployee(id, { status: 'inactive' }, scope);
  }

  /**
   * Delete an employee record.
   */
  async deleteEmployee(id, scope = {}) {
    const scopedFilter = this.buildScopedFilter({ _id: id }, scope);
    return this.model.findOneAndDelete(scopedFilter).lean();
  }

  /**
   * Count employees in scope.
   */
  async countEmployees(scope = {}) {
    return this.model.countDocuments(scope);
  }
}

module.exports = new UserRepository();
