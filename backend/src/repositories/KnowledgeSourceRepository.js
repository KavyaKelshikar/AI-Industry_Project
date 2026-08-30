const BaseRepository = require('./BaseRepository');
const KnowledgeSource = require('../models/KnowledgeSource');

/**
 * KnowledgeSourceRepository — Module 9.
 *
 * Extends BaseRepository with tenant-scoped knowledge source operations.
 */
class KnowledgeSourceRepository extends BaseRepository {
  constructor() {
    super(KnowledgeSource);
  }

  /**
   * Find knowledge sources belonging to a company with pagination, filtering, and search.
   *
   * @param {Object} scope – trusted tenant scope, e.g. { companyId: '...' }
   * @param {Object} queryOptions – pagination and filter options
   * @returns {Object} { items, pagination }
   */
  async findByCompany(scope = {}, queryOptions = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      type = null,
      status = null,
      sort = '-createdAt',
    } = queryOptions;

    const filter = { ...scope };

    if (type) {
      filter.type = type;
    }
    if (status) {
      filter.status = status;
    }
    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Find a single source by ID within trusted scope.
   */
  async findByIdScoped(id, scope = {}) {
    return this.model
      .findOne(this.buildScopedFilter({ _id: id }, scope))
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();
  }

  /**
   * Create a knowledge source.
   */
  async createSource(data, scope = {}) {
    const doc = await this.model.create(this.buildScopedFilter(data, scope));
    return this.findByIdScoped(doc._id, scope);
  }

  /**
   * Update a knowledge source by ID within trusted scope.
   */
  async updateSource(id, data, scope = {}) {
    return this.model
      .findOneAndUpdate(
        this.buildScopedFilter({ _id: id }, scope),
        { $set: data },
        { new: true }
      )
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();
  }

  /**
   * Delete a knowledge source by ID within trusted scope.
   */
  async deleteSource(id, scope = {}) {
    return this.model.findOneAndDelete(this.buildScopedFilter({ _id: id }, scope)).lean();
  }

  /**
   * Update sync status fields atomically.
   */
  async updateSyncStatus(id, statusData, scope = {}) {
    return this.model
      .findOneAndUpdate(
        this.buildScopedFilter({ _id: id }, scope),
        { $set: statusData },
        { new: true }
      )
      .lean();
  }

  /**
   * Count sources by company with optional additional filter.
   */
  async countByCompany(scope = {}, additionalFilter = {}) {
    return this.model.countDocuments(this.buildScopedFilter(additionalFilter, scope));
  }

  /**
   * Detect duplicate source by name and type within a company.
   *
   * @param {string} companyId
   * @param {string} name
   * @param {string|null} excludeId – ObjectId to exclude (for updates)
   * @returns {Object|null}
   */
  async findDuplicate(companyId, name, excludeId = null) {
    const filter = {
      companyId,
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    return this.model.findOne(filter).lean();
  }
}

module.exports = new KnowledgeSourceRepository();
