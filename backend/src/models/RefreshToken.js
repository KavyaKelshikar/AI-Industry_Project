const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    tokenHash: {
      type: String,
      required: [true, 'Refresh token hash is required'],
      // Only the hashed token is stored for security
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      // TTL index to automatically purge expired tokens from the DB
    },
    device: {
      type: String,
      trim: true,
      // Optional: to track which device/browser this token belongs to
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    // Use timestamps to automatically get createdAt
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes keep future token operations tenant-aware.
refreshTokenSchema.index({ companyId: 1, userId: 1, revoked: 1 });
refreshTokenSchema.index({ companyId: 1, expiresAt: 1 });
// Explicit schema-level TTL index
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
