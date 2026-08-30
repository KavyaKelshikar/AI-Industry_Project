const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      // Nullable for system-wide super admins
      default: null,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      // Nullable since not every user might belong to a specific department
      default: null,
      index: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      // Exclude by default to prevent accidental leakage in queries
      select: false,
    },
    employeeId: {
      type: String,
      trim: true,
      // Note: This must be unique per company, enforced by compound index below
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
    profilePicture: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Ensure email uniqueness is correctly scoped to the company
// A user can be part of two companies with the same email
userSchema.index({ companyId: 1, email: 1 }, { unique: true });

// Ensure employeeId is unique within a specific company (only when employeeId is provided as a string)
userSchema.index(
  { companyId: 1, employeeId: 1 },
  { unique: true, partialFilterExpression: { employeeId: { $type: 'string' } } }
);

module.exports = mongoose.model('User', userSchema);
