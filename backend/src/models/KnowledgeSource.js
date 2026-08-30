const mongoose = require('mongoose');

/**
 * KnowledgeSource schema — Module 9.
 *
 * Represents an approved, company-scoped knowledge source that the AI platform
 * is allowed to ingest.  Every source belongs to exactly one company and is
 * managed through explicit RBAC-controlled operations.
 */
const knowledgeSourceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Source name is required'],
      trim: true,
      minlength: [2, 'Source name must be at least 2 characters'],
      maxlength: [200, 'Source name must not exceed 200 characters'],
    },
    type: {
      type: String,
      required: [true, 'Source type is required'],
      enum: [
        'uploaded_file',
        'local_folder',
        'google_drive',
        'onedrive',
        'sharepoint',
        'dropbox',
        's3',
        'azure_blob',
        'smb',
        'custom',
      ],
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'syncing', 'error'],
      default: 'active',
      index: true,
    },
    /**
     * Adapter-specific configuration.  For local_folder this will include
     * the validated folder path.  For future cloud connectors it may hold
     * non-secret configuration (secret references only — never plaintext
     * credentials).
     */
    configuration: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    /**
     * Server-generated approved absolute path.  Only populated for
     * `local_folder` sources after the server has validated, resolved, and
     * approved the path.  Never trust a client-supplied value here.
     */
    approvedPath: {
      type: String,
      trim: true,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must not exceed 1000 characters'],
      default: '',
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    lastSyncStatus: {
      type: String,
      enum: ['idle', 'syncing', 'completed', 'failed'],
      default: 'idle',
    },
    lastSyncError: {
      type: String,
      trim: true,
      default: null,
    },
    documentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    supportedFileTypes: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user ID is required'],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
knowledgeSourceSchema.index({ companyId: 1, name: 1 }, { unique: true });
knowledgeSourceSchema.index({ companyId: 1, type: 1 });
knowledgeSourceSchema.index({ companyId: 1, status: 1 });
knowledgeSourceSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('KnowledgeSource', knowledgeSourceSchema);
