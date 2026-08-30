const BaseRepository = require('./BaseRepository');
const Role = require('../models/Role');

class RoleRepository extends BaseRepository {
  constructor() {
    super(Role);
  }

  /**
   * Find a role by name within a company or globally (companyId: null).
   */
  async findByNameAndCompany(name, companyId = null) {
    if (!name) return null;
    return this.model
      .findOne({
        name: name.trim(),
        companyId: companyId || null,
        status: 'active',
      })
      .populate('permissionIds')
      .lean();
  }

  /**
   * Find a system-wide default role (companyId: null) by name.
   */
  async findSystemRole(name) {
    if (!name) return null;
    return this.model
      .findOne({
        name: name.trim(),
        companyId: null,
        status: 'active',
      })
      .populate('permissionIds')
      .lean();
  }
  /**
   * Find all active roles accessible to a company (including global system roles).
   */
  async findCompanyRoles(companyId) {
    const query = {
      $or: [{ companyId: null }, { companyId }],
      status: 'active',
    };
    return this.model.find(query).populate('permissionIds').sort({ name: 1 }).lean();
  }

  /**
   * Create a custom role for a company.
   */
  async createCompanyRole({ companyId, name, description = '', permissionIds = [] }) {
    return this.model.create({
      companyId,
      name: name.trim(),
      description: description.trim(),
      permissionIds,
      status: 'active',
    });
  }

  /**
   * Update permissions on an existing company role.
   */
  async updateRolePermissions(roleId, permissionIds, companyId) {
    return this.model
      .findOneAndUpdate(
        { _id: roleId, companyId },
        { permissionIds },
        { new: true }
      )
      .populate('permissionIds')
      .lean();
  }
}

module.exports = new RoleRepository();
