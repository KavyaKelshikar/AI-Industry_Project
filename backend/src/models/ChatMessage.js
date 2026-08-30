const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Cited document ID is required'],
    },
    snippet: {
      type: String,
      // The exact text chunk used by the AI
    },
    relevanceScore: {
      type: Number,
    },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: [true, 'Session ID is required'],
      index: true,
    },
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
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: [true, 'Message role is required'],
    },
    sources: [sourceSchema], // Populated for assistant responses.
  },
  {
    // Use standard timestamps but map createdAt to timestamp to match the spec
    timestamps: { createdAt: 'timestamp', updatedAt: false },
  }
);

// Legacy field aliases keep callers using the earlier scaffold vocabulary from
// breaking while the persisted contract uses role/content/sources.
chatMessageSchema.virtual('message')
  .get(function getMessage() { return this.content; })
  .set(function setMessage(value) { this.content = value; });

chatMessageSchema.virtual('sender')
  .get(function getSender() { return this.role === 'assistant' ? 'ai' : this.role; })
  .set(function setSender(value) { this.role = value === 'ai' ? 'assistant' : value; });

chatMessageSchema.virtual('citedDocuments')
  .get(function getCitedDocuments() { return this.sources; })
  .set(function setCitedDocuments(value) { this.sources = value; });

chatMessageSchema.set('toJSON', { virtuals: true });
chatMessageSchema.set('toObject', { virtuals: true });

// Compound index to fetch messages chronologically within a session
chatMessageSchema.index({ sessionId: 1, timestamp: 1 });
// Index for tenant-wide analytics/audits of chat messages
chatMessageSchema.index({ companyId: 1, timestamp: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
