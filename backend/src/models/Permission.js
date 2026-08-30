const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    // Canonical machine-readable permission identifier. Every permission uses
    // the `<resource>:<action>` convention, for example `documents:upload`.
    code: {
      type: String,
      required: [true, 'Permission code is required'],
      trim: true,
      lowercase: true,
      // e.g., "documents:read", "users:create"
    },
    displayName: {
      type: String,
      required: [true, 'Permission display name is required'],
      trim: true,
      maxlength: [120, 'Permission display name cannot exceed 120 characters'],
    },
    // Compatibility field for records created before Phase 4.2. New code must
    // use `code`; this value is kept synchronized for safe legacy migration.
    name: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Permission description is required'],
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    module: {
      type: String,
      required: [true, 'Module name is required'],
      trim: true,
      lowercase: true,
      // e.g., "document", "user", "company"
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      lowercase: true,
      // e.g., "read", "upload", "create", "manage"
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

permissionSchema.pre('validate', function syncLegacyName(next) {
  if (!this.code && this.name) this.code = this.name;
  if (!this.name && this.code) this.name = this.code;
  if (typeof next === 'function') {
    next();
  }
});

permissionSchema.index({ code: 1 }, { unique: true });
// A resource/action combination must map to exactly one permission code.
permissionSchema.index({ module: 1, action: 1 }, { unique: true });

module.exports = mongoose.model('Permission', permissionSchema);
