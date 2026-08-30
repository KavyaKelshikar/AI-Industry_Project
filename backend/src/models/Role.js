const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      // If null, it can represent a system-wide global role (e.g., Super Admin)
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      maxlength: [100, 'Role name cannot exceed 100 characters'],
      // E.g., 'Super Admin', 'Company Admin', 'Employee', or custom strings
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    permissionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Ensure role names are unique per company (and system-wide for null companyId)
roleSchema.index({ companyId: 1, name: 1 }, { unique: true });
// Optimize fetching active roles for a company
roleSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model('Role', roleSchema);
