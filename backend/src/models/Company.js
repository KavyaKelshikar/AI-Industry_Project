const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    // Canonical, URL-safe identifier for a tenant. It is intentionally
    // separate from companyCode, which remains a useful business identifier
    // for existing seed data and external references.
    slug: {
      type: String,
      required: [true, 'Company slug is required'],
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Company slug must contain lowercase letters, numbers, and hyphens only',
      ],
    },
    companyCode: {
      type: String,
      required: [true, 'Company code is required'],
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: [true, 'Company email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    address: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Tenant identifiers must be globally unique.
companySchema.index({ slug: 1 }, { unique: true });
companySchema.index({ companyCode: 1 }, { unique: true });
companySchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('Company', companySchema);
