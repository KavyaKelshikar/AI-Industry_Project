const BaseRepository = require('./BaseRepository');
const Department = require('../models/Department');

class DepartmentRepository extends BaseRepository {
  constructor() {
    super(Department);
  }

  /**
   * Find a department by name within a specific company.
   */
  async findByCompanyAndName(companyId, name) {
    if (!companyId || !name) return null;
    return this.model
      .findOne({
        companyId,
        name: name.trim(),
      })
      .lean();
  }

  /**
   * Find all active departments belonging to a company.
   */
  async findActiveDepartmentsByCompany(companyId) {
    if (!companyId) return [];
    return this.model
      .find({
        companyId,
        status: 'active',
      })
      .sort({ name: 1 })
      .lean();
  }
}

module.exports = new DepartmentRepository();
