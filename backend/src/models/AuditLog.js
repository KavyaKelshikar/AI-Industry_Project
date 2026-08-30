const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // Nullable for system-level background actions
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      // e.g., 'DOCUMENT_UPLOAD', 'USER_LOGIN'
    },
    resource: {
      type: String,
      required: [true, 'Resource is required'],
      trim: true,
      // e.g., 'documents', 'users', 'chatSessions'
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Structured context such as resource IDs, IP address, or before/after values.
    },
    expiresAt: {
      type: Date,
      default: null,
      // Optional retention boundary. A TTL index removes logs only when set.
    },
    // Compatibility fields retained from the pre-alignment model. New code
    // should write resource/details instead.
    module: {
      type: String,
      trim: true,
      // e.g., 'document', 'auth', 'user'
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'warning'],
      default: 'success',
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Stores arbitrary data like IP address, user agent, before/after states
    },
  },
  {
    // Audit logs are immutable; map createdAt to timestamp and disable updatedAt
    timestamps: { createdAt: 'timestamp', updatedAt: false },
  }
);

// Canonical resource-oriented audit queries.
auditLogSchema.index({ companyId: 1, resource: 1, timestamp: -1 });
// Legacy module-oriented queries remain supported during the transition.
auditLogSchema.index({ companyId: 1, module: 1, timestamp: -1 });
// Compound indexes for other time-series queries
auditLogSchema.index({ companyId: 1, timestamp: -1 });
auditLogSchema.index({ companyId: 1, userId: 1, timestamp: -1 });
auditLogSchema.index({ companyId: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
