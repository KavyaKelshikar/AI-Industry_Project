const BaseRepository = require('./BaseRepository');
const Company = require('../models/Company');

class CompanyRepository extends BaseRepository {
  constructor() {
    super(Company);
  }

  /**
   * Find a company by its unique slug.
   */
  async findBySlug(slug) {
    if (!slug) return null;
    return this.model.findOne({ slug: slug.toLowerCase().trim() }).lean();
  }

  /**
   * Find a company by its unique company code.
   */
  async findByCode(companyCode) {
    if (!companyCode) return null;
    return this.model.findOne({ companyCode: companyCode.toUpperCase().trim() }).lean();
  }
}

module.exports = new CompanyRepository();
