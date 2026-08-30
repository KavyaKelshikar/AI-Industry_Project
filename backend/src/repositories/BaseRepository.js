/**
 * BaseRepository
 * 
 * Provides foundational CRUD operations for Mongoose models.
 * Designed to be extended by model-specific repositories.
 */

class BaseRepository {
  /**
   * Initialize the repository with a Mongoose model
   * @param {Object} model - The Mongoose model
   */
  constructor(model) {
    if (!model) {
      throw new Error('Model is required for BaseRepository');
    }
    this.model = model;
  }

  /**
   * Combine an application filter with an optional trusted scope.
   *
   * This phase deliberately does not enforce a tenant scope: authentication
   * and tenant isolation belong to Module 6. The API is nevertheless ready
   * for that module: a trusted scope such as `{ companyId: req.companyId }`
   * can be supplied as the final argument and always overrides same-named
   * fields in the caller-provided filter or data.
   */
  buildScopedFilter(filter = {}, scope = {}) {
    if (!this.isPlainObject(filter) || !this.isPlainObject(scope)) {
      throw new Error('Repository filters and scopes must be plain objects');
    }

    return { ...filter, ...scope };
  }

  isPlainObject(value) {
    return value !== null
      && typeof value === 'object'
      && !Array.isArray(value)
      && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  }

  /**
   * Parse request query strings into MongoDB query objects
   * Handles safe filtering (gt, gte, lt, lte, in), sorting, and field selection
   * @param {Object} reqQuery - The raw query object from Express req.query
   * @returns {Object} { filter, sort, projection }
   */
  parseQueryParams(reqQuery) {
    const queryObj = { ...reqQuery };
    
    // 1. Remove pagination, sorting, and field selection from the basic filter
    const excludedFields = ['page', 'limit', 'sort', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 2. Safe Advanced Filtering
    // Convert { price: { gte: '10' } } to { price: { $gte: '10' } }
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|in)\b/g, match => `$${match}`);
    const filter = JSON.parse(queryStr);

    // 3. Sorting
    // Default sort by newest first, otherwise parse comma-separated fields
    let sort = '-createdAt';
    if (reqQuery.sort) {
      sort = reqQuery.sort.split(',').join(' ');
    }

    // 4. Field Selection (Projection)
    // Parse comma-separated fields to space-separated string for Mongoose
    let projection = null;
    if (reqQuery.fields) {
      projection = reqQuery.fields.split(',').join(' ');
    }

    return { filter, sort, projection };
  }

  /**
   * Create a new document
   * @param {Object} data - The data to create
   * @returns {Promise<Object>} The created document
   */
  async create(data, scope = {}) {
    return await this.model.create(this.buildScopedFilter(data, scope));
  }

  /**
   * Find a document by its ID
   * @param {String} id - The document ID
   * @param {Object} [projection] - Fields to include or exclude
   * @param {Object} [options] - Additional query options
   * @returns {Promise<Object|null>} The document or null
   */
  async findById(id, projection = null, options = {}, scope = {}) {
    return await this.model.findOne(
      this.buildScopedFilter({ _id: id }, scope),
      projection,
      options
    ).lean();
  }

  /**
   * Find a single document matching the query
   * @param {Object} query - The search query
   * @param {Object} [projection] - Fields to include or exclude
   * @param {Object} [options] - Additional query options
   * @returns {Promise<Object|null>} The document or null
   */
  async findOne(query, projection = null, options = {}, scope = {}) {
    return await this.model.findOne(this.buildScopedFilter(query, scope), projection, options).lean();
  }

  /**
   * Find multiple documents matching the query
   * @param {Object} query - The search query
   * @param {Object} [projection] - Fields to include or exclude
   * @param {Object} [options] - Additional query options
   * @returns {Promise<Array>} Array of documents
   */
  async findMany(query = {}, projection = null, options = {}, scope = {}) {
    return await this.model.find(this.buildScopedFilter(query, scope), projection, options).lean();
  }

  /**
   * Find multiple documents with pagination
   * @param {Object} query - The search query
   * @param {Object} [pagination] - Pagination options
   * @param {Number} [pagination.page=1] - Page number
   * @param {Number} [pagination.limit=10] - Number of items per page
   * @param {Object} [projection] - Fields to include or exclude
   * @param {Object} [options] - Additional query options (like sort)
   * @returns {Promise<Object>} Object containing data array and meta pagination info
   */
  async findPaginated(
    query = {},
    { page = 1, limit = 10 } = {},
    projection = null,
    options = {},
    scope = {}
  ) {
    const skip = (page - 1) * limit;
    const scopedQuery = this.buildScopedFilter(query, scope);

    const [data, total] = await Promise.all([
      this.model.find(scopedQuery, projection, options).skip(skip).limit(limit).lean(),
      this.model.countDocuments(scopedQuery)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        skip,
        totalPages
      }
    };
  }

  /**
   * Update a single document by its ID
   * @param {String} id - The document ID
   * @param {Object} updateData - The data to update
   * @param {Object} [options] - Additional query options (new: true by default)
   * @returns {Promise<Object|null>} The updated document or null
   */
  async update(id, updateData, options = { new: true }, scope = {}) {
    return await this.model.findOneAndUpdate(
      this.buildScopedFilter({ _id: id }, scope),
      updateData,
      options
    ).lean();
  }

  /**
   * Delete a single document by its ID
   * @param {String} id - The document ID
   * @returns {Promise<Object|null>} The deleted document or null
   */
  async delete(id, scope = {}) {
    return await this.model.findOneAndDelete(this.buildScopedFilter({ _id: id }, scope)).lean();
  }
}

module.exports = BaseRepository;
