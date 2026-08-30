const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
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
      index: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role ID is required'],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      // Nullable if the invited user is not strictly assigned to a department
      default: null,
    },
    invitationTokenHash: {
      type: String,
      required: [true, 'Invitation token hash is required'],
      // We don't store the raw token, only the hash for security
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter User ID is required'],
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Compound index to quickly look up pending invitations for a specific email within a company
invitationSchema.index({ companyId: 1, email: 1, status: 1 });
// Fetch all invitations by status for a company
invitationSchema.index({ companyId: 1, status: 1 });
// TTL cleanup for expired invitations.
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Invitation', invitationSchema);
