const mongoose = require('mongoose');

const documentVersionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Document ID is required'],
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    version: {
      type: Number,
      required: [true, 'Version number is required'],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader ID is required'],
    },
    changes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Changes description cannot exceed 1000 characters'],
    },
    storagePath: {
      type: String,
      required: [true, 'Storage path is required'],
      trim: true,
    },
  },
  {
    // Versions are generally immutable, so we only strictly need createdAt.
    // However, keeping standard timestamps is fine.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Keep versions tenant-addressable and unique within their parent document.
documentVersionSchema.index({ companyId: 1, documentId: 1, version: 1 }, { unique: true });
documentVersionSchema.index({ companyId: 1, documentId: 1, createdAt: -1 });

module.exports = mongoose.model('DocumentVersion', documentVersionSchema);
