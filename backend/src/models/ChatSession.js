const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema(
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
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: 'New Chat',
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    messageCount: {
      type: Number,
      default: 0,
      min: [0, 'Message count cannot be negative'],
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Compound indexes for fetching and sorting a user's sessions efficiently
chatSessionSchema.index({ companyId: 1, userId: 1, status: 1 });
chatSessionSchema.index({ companyId: 1, userId: 1, updatedAt: -1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
