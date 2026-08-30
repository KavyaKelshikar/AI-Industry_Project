const BaseRepository = require('./BaseRepository');
const Permission = require('../models/Permission');

class PermissionRepository extends BaseRepository {
  constructor() {
    super(Permission);
  }

  /**
   * Find a permission by its unique code (e.g. 'documents:read').
   */
  async findByCode(code) {
    if (!code) return null;
    return this.model.findOne({ code: code.toLowerCase().trim() }).lean();
  }

  /**
   * Find multiple permissions by their codes.
   */
  async findByCodes(codesArray = []) {
    if (!Array.isArray(codesArray) || codesArray.length === 0) return [];
    const cleanCodes = codesArray.map((c) => c.toLowerCase().trim()).filter(Boolean);
    return this.model.find({ code: { $in: cleanCodes } }).lean();
  }

  /**
   * Find all permissions belonging to a specific module.
   */
  async findByModule(moduleName) {
    if (!moduleName) return [];
    return this.model.find({ module: moduleName.toLowerCase().trim() }).lean();
  }

  /**
   * Retrieve all registered system permissions.
   */
  async getAllPermissions() {
    return this.model.find({}).sort({ module: 1, action: 1 }).lean();
  }
}

module.exports = new PermissionRepository();
