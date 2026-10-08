const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    departmentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader ID is required'],
      index: true,
    },
    filename: {
      type: String,
      required: [true, 'Internal filename is required'],
      trim: true,
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      trim: true,
      lowercase: true,
      // e.g., 'pdf', 'docx', 'csv', 'txt'
    },
    fileSize: {
      type: Number, // In bytes
      required: [true, 'File size is required'],
    },
    storagePath: {
      type: String,
      required: [true, 'Storage path is required'],
      trim: true,
    },
    sourceType: {
      type: String,
      enum: [
        'application_upload',
        'local_folder',
        'cloud_connector',
        'future_knowledge_source',
      ],
      default: 'application_upload',
      index: true,
    },
    sourceId: {
      type: String,
      trim: true,
      // Used to track the ID of the file in the external system (e.g., Google Drive ID)
    },
    /**
     * Module 9: Reference to the KnowledgeSource that imported this document.
     * Null for documents uploaded directly through the application.
     */
    knowledgeSourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeSource',
      default: null,
      index: true,
    },
    /**
     * Module 9: Hash of the source file content for deduplication during sync.
     * Used to detect unchanged files and avoid unnecessary reprocessing.
     */
    sourceFileHash: {
      type: String,
      trim: true,
      default: null,
    },
    /**
     * Module 9: Relative path of the file within the knowledge source.
     */
    sourceRelativePath: {
      type: String,
      trim: true,
      default: null,
    },
    classification: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'internal',
      // e.g., 'public', 'internal', 'confidential'
    },
    category: {
      type: String,
      trim: true,
      // e.g., 'SOP', 'Policy', 'Manual'
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    summary: {
      type: String,
      trim: true,
    },
    // AI output is held separately from the approved metadata above. An
    // administrator can review these suggestions before promoting values into
    // category, departmentIds, classification, tags, and summary.
    aiSuggestions: {
      category: {
        type: String,
        trim: true,
      },
      departmentIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Department',
        },
      ],
      classification: {
        type: String,
        trim: true,
        lowercase: true,
      },
      tags: [
        {
          type: String,
          trim: true,
          lowercase: true,
        },
      ],
      summary: {
        type: String,
        trim: true,
      },
      generatedAt: {
        type: Date,
      },
    },
    version: {
      type: Number,
      default: 1,
    },
    /**
     * Administrative approval status (Modules 4-8)
     */
    status: {
      type: String,
      enum: [
        'pending', // Just uploaded
        'processing', // AI is extracting/analyzing
        'pending_review', // AI suggestions ready, waiting for Admin
        'approved', // Admin approved
        'rejected', // Admin rejected
        'error', // Processing failed
      ],
      default: 'pending',
    },
    /**
     * Module 10: AI Vector Indexing & Ingestion Lifecycle
     */
    indexingStatus: {
      type: String,
      enum: ['pending', 'processing', 'indexed', 'error'],
      default: 'pending',
      index: true,
    },
    chunksCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    vectorsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastProcessedAt: {
      type: Date,
      default: null,
    },
    processingError: {
      type: String,
      trim: true,
      default: null,
    },
    embeddingModel: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Explicit single-field indexes
documentSchema.index({ companyId: 1 });
documentSchema.index({ departmentIds: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ indexingStatus: 1 });
documentSchema.index({ classification: 1 });
documentSchema.index({ sourceType: 1 });
documentSchema.index({ createdAt: -1 });

// Compound indexes for optimal tenant-level document filtering
documentSchema.index({ companyId: 1, indexingStatus: 1 });
documentSchema.index({ companyId: 1, knowledgeSourceId: 1, indexingStatus: 1 });
documentSchema.index({ companyId: 1, status: 1 });
documentSchema.index({ companyId: 1, departmentIds: 1 });
documentSchema.index({ companyId: 1, classification: 1 });
documentSchema.index({ companyId: 1, category: 1 });
documentSchema.index({ companyId: 1, sourceType: 1 });
documentSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('Document', documentSchema);
