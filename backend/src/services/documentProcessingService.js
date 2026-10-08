const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const DocumentRepository = require('../repositories/DocumentRepository');
const KnowledgeSourceRepository = require('../repositories/KnowledgeSourceRepository');
const aiServiceClient = require('./aiServiceClient');
const AppError = require('../utils/AppError');
const errorCodes = require('../utils/errorCodes');
const logger = require('../utils/logger');
const {
  isWithinApprovedBoundary,
  sanitizeSyncError,
} = require('../utils/knowledgeSourcePathSecurity');

class DocumentProcessingService {
  /**
   * List documents with tenant isolation, search, filtering, and pagination.
   */
  async listDocuments(scope = {}, queryOptions = {}) {
    const result = await DocumentRepository.findByCompany(scope, queryOptions);
    const sanitizedItems = result.items.map((doc) => this._sanitizeDocument(doc));
    return {
      items: sanitizedItems,
      pagination: result.pagination,
    };
  }

  /**
   * Get a single document by ID within tenant scope.
   */
  async getDocumentById(id, scope = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'Invalid document ID format', true, errorCodes.VALIDATION_ERROR);
    }

    const doc = await DocumentRepository.findByIdScoped(id, scope);
    if (!doc) {
      throw new AppError(404, 'Document not found', true, errorCodes.DOCUMENT_NOT_FOUND || 'DOCUMENT_NOT_FOUND');
    }

    return this._sanitizeDocument(doc);
  }

  /**
   * Get aggregate processing metrics for the authenticated tenant.
   */
  async getDocumentStats(scope = {}) {
    const [total, pending, processing, indexed, error] = await Promise.all([
      DocumentRepository.countByCompany(scope),
      DocumentRepository.countByCompany(scope, { indexingStatus: 'pending' }),
      DocumentRepository.countByCompany(scope, { indexingStatus: 'processing' }),
      DocumentRepository.countByCompany(scope, { indexingStatus: 'indexed' }),
      DocumentRepository.countByCompany(scope, { indexingStatus: 'error' }),
    ]);

    const DocumentModel = require('../models/Document');
    const metricAgg = await DocumentModel.aggregate([
      { $match: scope.companyId ? { companyId: new mongoose.Types.ObjectId(scope.companyId) } : {} },
      {
        $group: {
          _id: null,
          totalChunks: { $sum: '$chunksCount' },
          totalVectors: { $sum: '$vectorsCount' },
        },
      },
    ]);

    return {
      total,
      pending,
      processing,
      indexed,
      error,
      totalChunks: metricAgg.length > 0 ? metricAgg[0].totalChunks : 0,
      totalVectors: metricAgg.length > 0 ? metricAgg[0].totalVectors : 0,
    };
  }

  /**
   * Process a single document through the AI vector ingestion pipeline.
   *
   * Flow:
   *  1. Tenant lookup of Document + KnowledgeSource
   *  2. Strict server-side path resolution and boundary check
   *  3. Status -> 'processing'
   *  4. AI Ingestion API dispatch
   *  5. Status -> 'indexed' (or 'error' with sanitized message)
   */
  async processDocument(id, scope = {}, user = null) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'Invalid document ID format', true, errorCodes.VALIDATION_ERROR);
    }

    const doc = await DocumentRepository.findByIdScoped(id, scope);
    if (!doc) {
      throw new AppError(404, 'Document not found', true, errorCodes.DOCUMENT_NOT_FOUND || 'DOCUMENT_NOT_FOUND');
    }

    // 1. Resolve and validate secure file path
    let validatedFilePath;

    if (doc.knowledgeSourceId) {
      const ksId = doc.knowledgeSourceId._id ? doc.knowledgeSourceId._id.toString() : doc.knowledgeSourceId.toString();
      const ks = await KnowledgeSourceRepository.findByIdScoped(ksId, scope);
      if (!ks || !ks.approvedPath) {
        throw new AppError(400, 'Associated knowledge source is missing approved path', true, errorCodes.INVALID_SOURCE_PATH);
      }

      const relativePath = doc.sourceRelativePath || doc.originalFilename;
      const resolved = path.resolve(ks.approvedPath, relativePath);

      if (!isWithinApprovedBoundary(resolved, ks.approvedPath)) {
        throw new AppError(403, 'Document path escapes approved knowledge source boundary', true, errorCodes.UNSAFE_DIRECTORY);
      }

      if (!fs.existsSync(resolved)) {
        throw new AppError(400, 'Document file no longer exists at approved path', true, errorCodes.INVALID_SOURCE_PATH);
      }

      validatedFilePath = resolved;
    } else if (doc.storagePath) {
      // Application upload path verification
      const resolved = path.resolve(doc.storagePath);
      if (!fs.existsSync(resolved)) {
        throw new AppError(400, 'Uploaded document file not found on server', true, errorCodes.INVALID_SOURCE_PATH);
      }
      validatedFilePath = resolved;
    } else {
      throw new AppError(400, 'Document has no valid storage location', true, errorCodes.INVALID_SOURCE_PATH);
    }

    // 2. Mark document as processing
    await DocumentRepository.updateIndexingStatus(id, {
      indexingStatus: 'processing',
      processingError: null,
    }, scope);

    // 3. Dispatch to Python AI Service
    const companyIdStr = doc.companyId ? doc.companyId.toString() : scope.companyId.toString();
    const docIdStr = doc._id.toString();

    try {
      const ingestionPayload = {
        file_path: validatedFilePath,
        document_id: docIdStr,
        company_id: companyIdStr,
        department_id: doc.departmentIds && doc.departmentIds.length > 0 ? doc.departmentIds[0].toString() : null,
        classification: doc.classification || 'internal',
        category: doc.category || null,
        source: doc.originalFilename,
      };

      const result = await aiServiceClient.ingestDocument(ingestionPayload);

      // 4. Update Document with success telemetry
      const updatedDoc = await DocumentRepository.updateIndexingStatus(id, {
        indexingStatus: 'indexed',
        chunksCount: result.chunks_count || 0,
        vectorsCount: result.vectors_stored || 0,
        embeddingModel: result.embedding_model || 'all-MiniLM-L6-v2',
        lastProcessedAt: new Date(),
        processingError: null,
      }, scope);

      logger.info(
        `Document ${id} successfully indexed (${result.chunks_count} chunks, ${result.vectors_stored} vectors)`
      );

      return this._sanitizeDocument(updatedDoc);
    } catch (processErr) {
      const sanitized = sanitizeSyncError(processErr.message || 'Ingestion failed');
      await DocumentRepository.updateIndexingStatus(id, {
        indexingStatus: 'error',
        processingError: sanitized,
        lastProcessedAt: new Date(),
      }, scope);

      logger.error(`Document ${id} processing failed: ${processErr.message}`);

      throw new AppError(
        processErr.statusCode || 500,
        `Document processing failed: ${sanitized}`,
        true,
        processErr.code || errorCodes.INTERNAL_ERROR
      );
    }
  }

  /**
   * Batch process all pending documents for a specific Knowledge Source.
   */
  async batchProcessPending(knowledgeSourceId, scope = {}, user = null) {
    if (!mongoose.Types.ObjectId.isValid(knowledgeSourceId)) {
      throw new AppError(400, 'Invalid knowledge source ID', true, errorCodes.VALIDATION_ERROR);
    }

    // Verify source ownership
    const source = await KnowledgeSourceRepository.findByIdScoped(knowledgeSourceId, scope);
    if (!source) {
      throw new AppError(404, 'Knowledge source not found', true, errorCodes.KNOWLEDGE_SOURCE_NOT_FOUND);
    }

    const pendingDocs = await DocumentRepository.findPendingBySource(knowledgeSourceId, scope);

    let processedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const doc of pendingDocs) {
      try {
        await this.processDocument(doc._id, scope, user);
        processedCount++;
      } catch (err) {
        failedCount++;
        errors.push({
          documentId: doc._id.toString(),
          filename: doc.originalFilename,
          error: sanitizeSyncError(err.message),
        });
      }
    }

    return {
      total: pendingDocs.length,
      processed: processedCount,
      failed: failedCount,
      errors,
    };
  }

  /**
   * Delete a document and purge its associated ChromaDB vectors.
   */
  async deleteDocument(id, scope = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'Invalid document ID format', true, errorCodes.VALIDATION_ERROR);
    }

    const doc = await DocumentRepository.findByIdScoped(id, scope);
    if (!doc) {
      throw new AppError(404, 'Document not found', true, errorCodes.DOCUMENT_NOT_FOUND || 'DOCUMENT_NOT_FOUND');
    }

    const companyIdStr = doc.companyId ? doc.companyId.toString() : scope.companyId.toString();

    // 1. Purge ChromaDB vectors
    await aiServiceClient.deleteDocumentVectors(companyIdStr, id.toString());

    // 2. Delete MongoDB Document record
    const deleted = await DocumentRepository.deleteDocument(id, scope);

    logger.info(`Document ${id} and vectors deleted [Company: ${companyIdStr}]`);
    return { id, deleted: true };
  }

  /**
   * Sanitize document for public API response.
   * Never expose raw absolute filesystem storagePath or internal secrets.
   */
  _sanitizeDocument(doc) {
    if (!doc) return null;

    return {
      id: doc._id ? doc._id.toString() : doc.id,
      companyId: doc.companyId ? (doc.companyId._id ? doc.companyId._id.toString() : doc.companyId.toString()) : null,
      filename: doc.filename,
      originalFilename: doc.originalFilename,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      sourceType: doc.sourceType,
      sourceRelativePath: doc.sourceRelativePath || null,
      knowledgeSourceId: doc.knowledgeSourceId
        ? {
            id: doc.knowledgeSourceId._id ? doc.knowledgeSourceId._id.toString() : doc.knowledgeSourceId.toString(),
            name: doc.knowledgeSourceId.name || '',
            type: doc.knowledgeSourceId.type || '',
          }
        : null,
      classification: doc.classification || null,
      category: doc.category || null,
      tags: doc.tags || [],
      summary: doc.summary || '',
      status: doc.status || 'pending',
      indexingStatus: doc.indexingStatus || 'pending',
      chunksCount: doc.chunksCount || 0,
      vectorsCount: doc.vectorsCount || 0,
      lastProcessedAt: doc.lastProcessedAt || null,
      processingError: doc.processingError || null,
      embeddingModel: doc.embeddingModel || null,
      hasStoragePath: !!(doc.storagePath || (doc.knowledgeSourceId && doc.knowledgeSourceId.approvedPath)),
      uploadedBy: doc.uploadedBy
        ? {
            id: doc.uploadedBy._id ? doc.uploadedBy._id.toString() : doc.uploadedBy.toString(),
            name: doc.uploadedBy.name || '',
            email: doc.uploadedBy.email || '',
          }
        : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

module.exports = new DocumentProcessingService();
