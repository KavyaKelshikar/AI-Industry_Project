const BaseRepository = require('./BaseRepository');
const Document = require('../models/Document');

/**
 * DocumentRepository — Module 10.
 *
 * Extends BaseRepository with tenant-scoped document queries,
 * indexing status updates, and telemetry tracking.
 */
class DocumentRepository extends BaseRepository {
  constructor() {
    super(Document);
  }

  /**
   * List documents belonging to a company with pagination, filtering, and search.
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
      knowledgeSourceId = null,
      indexingStatus = null,
      status = null,
      fileType = null,
      sort = '-createdAt',
    } = queryOptions;

    const filter = { ...scope };

    if (knowledgeSourceId) {
      filter.knowledgeSourceId = knowledgeSourceId;
    }
    if (indexingStatus) {
      filter.indexingStatus = indexingStatus;
    }
    if (status) {
      filter.status = status;
    }
    if (fileType) {
      filter.fileType = fileType.toLowerCase().replace('.', '');
    }
    if (search && search.trim()) {
      filter.originalFilename = { $regex: search.trim(), $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('uploadedBy', 'name email')
        .populate('knowledgeSourceId', 'name type')
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
   * Find a single document by ID within trusted tenant scope.
   */
  async findByIdScoped(id, scope = {}) {
    return this.model
      .findOne(this.buildScopedFilter({ _id: id }, scope))
      .populate('uploadedBy', 'name email')
      .populate('knowledgeSourceId', 'name type approvedPath')
      .lean();
  }

  /**
   * Find pending documents for a specific knowledge source within tenant scope.
   */
  async findPendingBySource(knowledgeSourceId, scope = {}) {
    const filter = this.buildScopedFilter(
      {
        knowledgeSourceId,
        indexingStatus: { $in: ['pending', 'error'] },
      },
      scope
    );
    return this.model.find(filter).lean();
  }

  /**
   * Update indexing status and processing telemetry atomically.
   */
  async updateIndexingStatus(id, updateData, scope = {}) {
    return this.model
      .findOneAndUpdate(
        this.buildScopedFilter({ _id: id }, scope),
        { $set: updateData },
        { new: true }
      )
      .populate('uploadedBy', 'name email')
      .populate('knowledgeSourceId', 'name type')
      .lean();
  }

  /**
   * Delete a document by ID within trusted scope.
   */
  async deleteDocument(id, scope = {}) {
    return this.model.findOneAndDelete(this.buildScopedFilter({ _id: id }, scope)).lean();
  }

  /**
   * Count documents by company with optional additional filter.
   */
  async countByCompany(scope = {}, additionalFilter = {}) {
    return this.model.countDocuments(this.buildScopedFilter(additionalFilter, scope));
  }
}

module.exports = new DocumentRepository();
