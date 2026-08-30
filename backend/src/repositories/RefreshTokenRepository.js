const BaseRepository = require('./BaseRepository');
const RefreshToken = require('../models/RefreshToken');

class RefreshTokenRepository extends BaseRepository {
  constructor() {
    super(RefreshToken);
  }

  /**
   * Create and store a new refresh token record.
   */
  async createToken(
    { userId, companyId, tokenHash, expiresAt, device = null },
    session = null
  ) {
    const data = {
      userId,
      companyId,
      tokenHash,
      expiresAt,
      device,
      revoked: false,
    };
    const options = session ? { session } : {};
    const created = await this.model.create([data], options);
    return created[0].toObject ? created[0].toObject() : created[0];
  }

  /**
   * Find a refresh token by its SHA-256 hash.
   */
  async findByTokenHash(tokenHash) {
    if (!tokenHash) return null;
    return this.model.findOne({ tokenHash }).lean();
  }

  /**
   * Mark a specific refresh token as revoked.
   */
  async revokeToken(tokenHash) {
    if (!tokenHash) return null;
    return this.model
      .findOneAndUpdate(
        { tokenHash, revoked: false },
        { revoked: true, revokedAt: new Date() },
        { new: true }
      )
      .lean();
  }

  /**
   * Revoke ALL active refresh tokens belonging to a user (used on theft detection or logout-all).
   */
  async revokeAllUserTokens(userId) {
    if (!userId) return 0;
    const res = await this.model.updateMany(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() }
    );
    return res.modifiedCount || 0;
  }
}

module.exports = new RefreshTokenRepository();
